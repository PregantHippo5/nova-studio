// app/api/app/latest-version/route.js
//
// Renvoie les infos de la dernière version publiée de SOCLE (table app_releases
// dans Supabase), sous forme d'un manifeste unique couvrant toutes les
// plateformes — c'est main.js (dans l'app desktop) qui choisit localement le
// bon sous-objet selon process.platform, pas cette route.
//
// Appelée directement depuis main.js (Node, dans l'app desktop), pas depuis
// un navigateur — pas besoin de gérer CORS ici, contrairement à
// exchange/route.js qui est appelée depuis le mini-serveur local de SOCLE.

import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('app_releases')
    .select(
      'version, notes, windows_download_url, windows_sha256, macos_download_url, macos_sha256, published_at'
    )
    .eq('project_slug', 'socle')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: 'no release found' }, { status: 404 });
  }

  const manifest = {
    version: data.version,
    notes: data.notes,
    windows: data.windows_download_url
      ? { download_url: data.windows_download_url, sha256: data.windows_sha256 }
      : null,
    macos: data.macos_download_url
      ? { download_url: data.macos_download_url, sha256: data.macos_sha256 }
      : null,
  };

  return Response.json(manifest, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}