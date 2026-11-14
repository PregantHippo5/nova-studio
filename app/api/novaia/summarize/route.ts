// app/api/novaia/summarize/route.ts
//
// Compresse le début d'une longue discussion en quelques phrases (appelé de temps en temps par la page NovaIA).
// Mêmes protections que la route de chat : corps limité, messages bornés, limite de débit par IP (en mémoire).

import { summarizeChat, type ChatMessage } from '@/lib/novaia/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BODY_BYTES = 40_000;
const MAX_MESSAGES = 30;
const MAX_CONTENT = 1000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 4;
const hits = new Map<string, number[]>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown';
}

function limited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 2000) {
    for (const [k, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return Response.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
  }
  if (limited(clientKey(request), Date.now())) {
    return Response.json({ error: 'Trop de requêtes.' }, { status: 429 });
  }

  let body: { messages?: unknown; previous?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return Response.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return Response.json({ error: 'Messages invalides.' }, { status: 400 });
  }
  const messages: ChatMessage[] = [];
  for (const item of body.messages) {
    const { role, content } = (item ?? {}) as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) {
      return Response.json({ error: 'Messages invalides.' }, { status: 400 });
    }
    messages.push({ role, content: content.trim().slice(0, MAX_CONTENT) });
  }
  const previous = typeof body.previous === 'string' ? body.previous.slice(0, 1200) : '';

  const summary = await summarizeChat(messages, previous);
  return summary ? Response.json({ summary }) : Response.json({ summary: null }, { status: 200 });
}
