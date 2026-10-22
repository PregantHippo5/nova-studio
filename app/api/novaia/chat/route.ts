// app/api/novaia/chat/route.ts
//
// Route publique du chat NovaIA. Le modèle est derrière lib/novaia/provider.ts :
// aujourd'hui des réponses de démonstration, demain le vrai modèle, sans toucher à la page.
//
// Protections (la route est publique) :
//  - taille du corps, nombre et longueur des messages limités ;
//  - limite de débit par IP, EN MÉMOIRE : approximative sur Vercel (chaque instance a sa
//    propre mémoire). Suffisant pour la démo ; à remplacer par une vraie limite
//    (Supabase / Upstash) avant de brancher un modèle payant.

import { generateReply, type ChatMessage } from '@/lib/novaia/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 30_000;
const MAX_MESSAGES = 20;
const MAX_CONTENT = 1000;

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 15;
const hits = new Map<string, number[]>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? 'unknown';
  return ip || 'unknown';
}

function isRateLimited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  // évite que la table grossisse indéfiniment
  if (hits.size > 2000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  return false;
}

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null;

  const messages: ChatMessage[] = [];

  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const { role, content } = item as { role?: unknown; content?: unknown };

    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_CONTENT) return null;

    messages.push({ role, content: trimmed });
  }

  return messages[messages.length - 1].role === 'user' ? messages : null;
}

export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) {
    return Response.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
  }

  if (isRateLimited(clientKey(request), Date.now())) {
    return Response.json({ error: 'Trop de requêtes. Réessayez dans un instant.' }, { status: 429 });
  }

  let body: { locale?: unknown; messages?: unknown };

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return Response.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const messages = parseMessages(body.messages);
  if (!messages) {
    return Response.json({ error: 'Messages invalides.' }, { status: 400 });
  }

  const locale = body.locale === 'en' ? 'en' : 'fr';

  try {
    const result = await generateReply(messages, locale);
    return Response.json(result);
  } catch {
    // Pas de détail interne côté public.
    return Response.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
