// app/api/novaia/favicon/route.ts
//
// Icône d'un site cité par NovaIA (pastille de source). C'est NOTRE serveur qui va la chercher, une seule fois par domaine
// (le résultat est mis en cache une semaine) : le navigateur de la personne ne contacte jamais le site cité pour son icône.
// Pas de domaine libre : un nom de domaine « ordinaire » seulement (pas d'IP, pas de localhost, pas d'adresse interne),
// et le service d'icônes est fixe, donc on ne peut pas s'en servir pour atteindre autre chose.

import { safeHost } from '@/lib/novaia/sources';

export const runtime = 'nodejs';

const MAX_BYTES = 60_000;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('d') ?? '';
  const host = safeHost(raw);
  if (!host) return new Response(null, { status: 400 });
  try {
    const res = await fetch(`https://icons.duckduckgo.com/ip3/${host}.ico`, {
      signal: AbortSignal.timeout(3500),
      headers: { 'User-Agent': 'NovaIA/1.0 (https://nova-studio.dev)' },
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/^image\//i.test(type)) return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=86400' } });
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=86400' } });
    return new Response(buf, {
      headers: {
        'Content-Type': type.split(';')[0],
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src data:",
      },
    });
  } catch {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=3600' } });
  }
}
