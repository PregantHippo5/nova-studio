// app/api/app/latest-version/route.js
// VERSION DE DEBUG TEMPORAIRE — à remettre comme avant une fois le problème résolu.

import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('app_releases')
    .select('version, label, download_url, sha256, notes, published_at')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // NEXT_PUBLIC_SUPABASE_URL n'est pas secrète (déjà visible côté navigateur
  // partout ailleurs sur le site) — on peut l'afficher sans risque pour déboguer.
  const debugInfo = { debug_supabase_url_used_by_server: process.env.NEXT_PUBLIC_SUPABASE_URL || null };

  if (error) {
    return Response.json({ error: error.message, ...debugInfo }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: 'no release found', ...debugInfo }, { status: 404 });
  }

  return Response.json({ ...data, ...debugInfo });
}
