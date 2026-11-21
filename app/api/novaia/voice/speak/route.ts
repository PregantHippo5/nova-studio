// app/api/novaia/voice/speak/route.ts
// POST { locale, text } : text ≤ 700 caractères. Réponse : { audio } (data URL WAV).
import { synthesizeSpeech, voiceEnabled } from '@/lib/novaia/voiceSpace';
import { limite, messageLimite } from '@/lib/novaia/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BODY_BYTES = 8_000;

export async function POST(request: Request) {
  if (!voiceEnabled) return Response.json({ error: 'Voix non activée.' }, { status: 503 });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return Response.json({ error: 'Texte trop long.' }, { status: 413 });
  }
  const en = request.headers.get('accept-language')?.toLowerCase().startsWith('en');
  const verdict = await limite(request, 'tts');
  if (verdict !== 'ok') {
    return Response.json({ error: messageLimite(verdict, en ? 'en' : 'fr'), limite: verdict }, { status: 429 });
  }

  let body: { locale?: unknown; text?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return Response.json({ error: 'JSON invalide.' }, { status: 400 });
  }
  const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, 700) : '';
  if (!text) return Response.json({ error: 'Texte vide.' }, { status: 400 });
  const audio = await synthesizeSpeech(text, body.locale === 'en' ? 'en' : 'fr');
  if (!audio) return Response.json({ error: 'Voix indisponible.' }, { status: 502 });
  return Response.json({ audio });
}
