// lib/novaia/voiceSpace.ts
//
// Voix de NovaIA côté SERVEUR : le son part (depuis le serveur Next.js uniquement) vers le Space « novaia-voice » (CPU gratuit).
//   NOVAIA_VOICE=1 (Vercel) : la voix passe par le Space principal (NOVAIA_SPACE_URL), qui fait Whisper + Piper sur CPU.
//   NOVAIA_VOICE_URL : adresse d'un autre Space de voix (facultatif). Sans l'un des deux : voix du navigateur seulement.
//   NOVAIA_HF_TOKEN  : facultatif ici (le Space est public), envoyé s'il existe.
// Server-only : ne jamais importer depuis un composant client ; ne jamais préfixer ces variables NEXT_PUBLIC_.
import { parseSse } from '@/lib/novaia/provider';

// Voix : par défaut le Space principal de NovaIA (NOVAIA_VOICE=1 sur Vercel), ou un autre Space si NOVAIA_VOICE_URL est définie.
const VOICE_URL = (process.env.NOVAIA_VOICE_URL || (process.env.NOVAIA_VOICE === '1' ? process.env.NOVAIA_SPACE_URL : '') || '').replace(/\/+$/, '');
const HF_TOKEN = process.env.NOVAIA_HF_TOKEN ?? '';

export const voiceEnabled = VOICE_URL !== '';

async function callSpace(api: string, data: unknown[], timeoutMs: number): Promise<string | null> {
  const auth: Record<string, string> = HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const start = await fetch(`${VOICE_URL}/gradio_api/call/${api}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ data }),
      signal,
      cache: 'no-store',
    });
    if (!start.ok) {
      console.error(`[novaia-voice] ${api} dépôt refusé (${start.status})`);
      return null;
    }
    const started = (await start.json().catch(() => null)) as { event_id?: unknown } | null;
    if (!started || typeof started.event_id !== 'string') return null;
    const stream = await fetch(`${VOICE_URL}/gradio_api/call/${api}/${encodeURIComponent(started.event_id)}`, {
      headers: auth,
      signal,
      cache: 'no-store',
    });
    if (!stream.ok) return null;
    const result = parseSse(await stream.text());
    if (!result || result.event === 'error') {
      console.error(`[novaia-voice] ${api} erreur : ${result?.data?.slice(0, 200) ?? 'sans résultat'}`);
      return null;
    }
    const parsed = JSON.parse(result.data) as unknown;
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null;
  } catch (err) {
    console.error(`[novaia-voice] ${api} : ${err instanceof Error ? err.name + ' ' + err.message : String(err)}`);
    return null;
  }
}

/** Audio (data URL) → texte. null = Space indisponible ; '' = aucune voix détectée. */
export function transcribeAudio(audioDataUrl: string, locale: 'fr' | 'en'): Promise<string | null> {
  return callSpace('transcribe', [audioDataUrl, locale], 50_000);
}

/** Texte → audio WAV (data URL). null = Space indisponible. */
export function synthesizeSpeech(text: string, locale: 'fr' | 'en'): Promise<string | null> {
  return callSpace('speak', [text.slice(0, 700), locale], 40_000);
}
