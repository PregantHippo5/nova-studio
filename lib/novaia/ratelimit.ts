// lib/novaia/ratelimit.ts
//
// Limite d'usage DURABLE (par minute, par jour, et globale) via Supabase (fonction novaia_hit, voir supabase/003_limites.sql).
// - Aucune adresse IP stockee : seulement une empreinte SHA-256 (IP + usage + sel), effacee apres 2 jours.
// - Si Supabase est injoignable ou si le SQL 003 n'a pas ete lance : on retombe sur la limite en memoire des routes
//   (jamais de panne du chat a cause de la limite).
import { createHash } from 'crypto';

export type Usage = 'chat' | 'vision' | 'summarize' | 'stt' | 'tts';
export type Verdict = 'ok' | 'minute' | 'day' | 'global';

const LIMITES: Record<Usage, { min: number; day: number; global: number }> = {
  chat: { min: 15, day: 250, global: 4000 },
  vision: { min: 4, day: 40, global: 500 },
  summarize: { min: 4, day: 80, global: 1500 },
  stt: { min: 10, day: 200, global: 3000 },
  tts: { min: 25, day: 600, global: 8000 },
};

// Première barrière, en mémoire (approximative sur Vercel) : active même sans Supabase.
const memoire = new Map<string, number[]>();
function tropVite(cle: string, max: number, now: number): boolean {
  const recents = (memoire.get(cle) ?? []).filter((t) => now - t < 60_000);
  if (recents.length >= max) {
    memoire.set(cle, recents);
    return true;
  }
  recents.push(now);
  memoire.set(cle, recents);
  if (memoire.size > 2000) for (const [k, v] of memoire) if (v.every((t) => now - t >= 60_000)) memoire.delete(k);
  return false;
}

function empreinte(request: Request, usage: Usage): string {
  const fwd = request.headers.get('x-forwarded-for');
  const ip = (fwd ? fwd.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown';
  const sel = process.env.NOVAIA_RATE_SALT ?? 'nova-studio';
  return createHash('sha256').update(`${ip}|${usage}|${sel}`).digest('hex').slice(0, 32);
}

export async function limite(request: Request, usage: Usage): Promise<Verdict> {
  const l = LIMITES[usage];
  const now = Date.now();
  if (usage === 'stt' || usage === 'tts') {
    if (tropVite(empreinte(request, usage), l.min, now)) return 'minute';
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 'ok';
  try {
    const mod = (await import('@/lib/supabaseAdmin')) as unknown as {
      supabaseAdmin: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
    };
    const { data, error } = await mod.supabaseAdmin.rpc('novaia_hit', {
      p_key: empreinte(request, usage),
      p_min: Math.floor(now / 60_000),
      p_day: Math.floor(now / 86_400_000),
      p_max_min: l.min,
      p_max_day: l.day,
      p_max_global: l.global,
      p_usage: usage,
    });
    if (error || typeof data !== 'string') return 'ok';
    return data === 'minute' || data === 'day' || data === 'global' ? data : 'ok';
  } catch {
    return 'ok';
  }
}

export function messageLimite(v: Verdict, locale: 'fr' | 'en' = 'fr'): string {
  const fr = {
    ok: '',
    minute: 'Trop de requêtes. Réessaie dans un instant.',
    day: 'Tu as atteint la limite quotidienne de NovaIA. Reviens demain.',
    global: 'NovaIA a atteint sa limite gratuite du jour (le GPU est partagé). Reviens demain.',
  };
  const en = {
    ok: '',
    minute: 'Too many requests. Try again in a moment.',
    day: "You've reached NovaIA's daily limit. Come back tomorrow.",
    global: "NovaIA has reached today's free limit (the GPU is shared). Come back tomorrow.",
  };
  return (locale === 'en' ? en : fr)[v];
}
