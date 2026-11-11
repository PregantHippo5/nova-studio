// app/api/novaia/vision/route.ts
//
// Route publique « NovaIA lit une image ». Corps : { locale, question?, image } où image est une data URL JPEG/PNG/WebP
// déjà réduite par le navigateur (≈ 1600 px max). Le modèle est derrière lib/novaia/vision.ts.
//
// Protections (route publique, GPU limité) :
//  - taille du corps limitée, type d'image vérifié, question limitée ;
//  - limite de débit par IP, EN MÉMOIRE (approximative sur Vercel : chaque instance a sa mémoire), plus stricte
//    que pour le texte puisqu'une image consomme bien plus de temps GPU.

import { readImage, VISION_QUESTION_MAX } from '@/lib/novaia/vision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BODY_BYTES = 1_800_000; // l'image réduite fait en général 200 à 700 Ko
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 4;
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
  if (hits.size > 2000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) {
    return Response.json({ error: 'Image trop volumineuse.' }, { status: 413 });
  }

  if (isRateLimited(clientKey(request), Date.now())) {
    return Response.json({ error: 'Trop de requêtes. Réessayez dans un instant.' }, { status: 429 });
  }

  let body: { locale?: unknown; question?: unknown; image?: unknown };

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return Response.json({ error: 'Image trop volumineuse.' }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  if (typeof body.image !== 'string' || !DATA_URL.test(body.image)) {
    return Response.json({ error: 'Image invalide.' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.replace(/\s+/g, ' ').trim().slice(0, VISION_QUESTION_MAX) : '';
  const locale = body.locale === 'en' ? 'en' : 'fr';

  try {
    const result = await readImage(body.image, question, locale);
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
