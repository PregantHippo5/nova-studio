// app/api/novaia/voice/transcribe/route.ts
// POST { locale, audio } : audio = data URL WAV/WebM/MP4 (≤ ~1,5 Mo, ~ 20 s). Réponse : { text }.
import { transcribeAudio, voiceEnabled } from '@/lib/novaia/voiceSpace';
import { limite, messageLimite } from '@/lib/novaia/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BODY_BYTES = 2_000_000;
const DATA_URL = /^data:audio\/[a-zA-Z0-9.+-]+(?:;[^,;]+)*;base64,[A-Za-z0-9+/=]+$/;

export async function POST(request: Request) {
  if (!voiceEnabled) return Response.json({ error: 'Voix non activée.' }, { status: 503 });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return Response.json({ error: 'Audio trop long.' }, { status: 413 });
  }
  const en = request.headers.get('accept-language')?.toLowerCase().startsWith('en');
  const verdict = await limite(request, 'stt');
  if (verdict !== 'ok') {
    return Response.json({ error: messageLimite(verdict, en ? 'en' : 'fr'), limite: verdict }, { status: 429 });
  }

  let body: { locale?: unknown; audio?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return Response.json({ error: 'Audio trop long.' }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'JSON invalide.' }, { status: 400 });
  }
  if (typeof body.audio !== 'string' || !DATA_URL.test(body.audio)) {
    return Response.json({ error: 'Audio invalide.' }, { status: 400 });
  }
  const text = await transcribeAudio(body.audio, body.locale === 'en' ? 'en' : 'fr');
  if (text === null) return Response.json({ error: 'Voix indisponible.' }, { status: 502 });
  return Response.json({ text });
}
