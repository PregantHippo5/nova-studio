// app/api/app/latest-version/route.js
//
// Renvoie les infos de la dernière version publiée de SOCLE (table app_releases
// dans Supabase). Appelée directement depuis main.js (Node, dans l'app desktop),
// pas depuis un navigateur — pas besoin de gérer CORS ici, contrairement à
// exchange/route.js qui est appelée depuis le mini-serveur local de SOCLE.

import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('app_releases')
    .select('version, label, download_url, sha256, notes, published_at')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: 'no release found' }, { status: 404 });
  }

  return Response.json(data, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
