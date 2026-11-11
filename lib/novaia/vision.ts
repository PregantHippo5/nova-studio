// lib/novaia/vision.ts
//
// Lecture d'images par NovaIA : l'image part (depuis le serveur Next.js uniquement) vers le Space « novaia-vision ».
//   NOVAIA_VISION_URL : adresse du Space (ex. https://novastudio123-novaia-vision.hf.space). Sans elle : message « pas encore activé ».
//   NOVAIA_HF_TOKEN   : le même jeton que pour le chat (quota GPU du compte).
// Server-only : ne jamais importer depuis un composant client ; ne jamais préfixer ces variables NEXT_PUBLIC_.

import { PROBLEMS, QUOTA_HINT, parseSse, type Lang, type Problem, type ReplyResult } from '@/lib/novaia/provider';

const VISION_URL = (process.env.NOVAIA_VISION_URL ?? '').replace(/\/+$/, '');
const HF_TOKEN = process.env.NOVAIA_HF_TOKEN ?? '';
const TIMEOUT_MS = 58_000; // le premier appel après une pause réveille le GPU et charge le modèle
export const VISION_QUESTION_MAX = 600;

const NOT_READY: Record<Lang, string> = {
  fr: "La lecture d'images n'est pas encore activée sur ce site.",
  en: 'Image reading is not enabled on this site yet.',
};

export async function readImage(imageDataUrl: string, question: string, locale: Lang): Promise<ReplyResult> {
  if (!VISION_URL) return { reply: NOT_READY[locale], mode: 'demo' };

  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const auth: Record<string, string> = HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};
  const fail = (p: Problem, detail: string): ReplyResult => {
    console.error(`[novaia-vision] ${p} : ${detail}`);
    return { reply: PROBLEMS[p][locale], mode: 'demo' };
  };
  const snippet = async (res: Response) => (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);

  try {
    const start = await fetch(`${VISION_URL}/gradio_api/call/read_image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ data: [imageDataUrl, question.slice(0, VISION_QUESTION_MAX)] }),
      signal,
      cache: 'no-store',
    });
    if (start.status === 429) return fail('quota', `dépôt refusé (429) ${await snippet(start)}`);
    if (!start.ok) return fail(start.status >= 500 ? 'sleeping' : 'down', `dépôt refusé (${start.status}) ${await snippet(start)}`);

    const started = (await start.json().catch(() => null)) as { event_id?: unknown } | null;
    if (!started || typeof started.event_id !== 'string') return fail('sleeping', 'réponse sans event_id');

    const stream = await fetch(`${VISION_URL}/gradio_api/call/read_image/${encodeURIComponent(started.event_id)}`, {
      headers: auth,
      signal,
      cache: 'no-store',
    });
    if (!stream.ok) return fail('down', `lecture refusée (${stream.status}) ${await snippet(stream)}`);

    const raw = await stream.text();
    const result = parseSse(raw);
    if (!result) return fail('down', `flux sans résultat : ${raw.replace(/\s+/g, ' ').slice(0, 200)}`);
    if (result.event === 'error') {
      return fail(QUOTA_HINT.test(result.data) ? 'quota' : 'down', `erreur du Space : ${result.data.slice(0, 200)}`);
    }

    const parsed = JSON.parse(result.data) as unknown;
    const reply = Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0].trim() : '';
    return reply ? { reply, mode: 'live' } : fail('down', `réponse vide : ${result.data.slice(0, 200)}`);
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return fail(timedOut ? 'sleeping' : 'down', `${err instanceof Error ? err.name + ' ' + err.message : String(err)}`);
  }
}
