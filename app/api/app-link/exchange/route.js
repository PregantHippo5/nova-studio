// app/api/app-link/exchange/route.js
//
// Appelée par l'app desktop (novastudio://link?code=XXXX) avec le code reçu.
// Si valide, génère un lien magique côté serveur et renvoie le token_hash —
// l'app desktop l'échange ensuite contre une vraie session via
// supabase.auth.verifyOtp({ email, token_hash, type: 'magiclink' }).

import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { code } = body;
  if (!code) return Response.json({ error: 'code requis.' }, { status: 400 });

  const { data: row, error } = await supabaseAdmin
    .from('app_link_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!row) return Response.json({ error: 'Code invalide.' }, { status: 404 });
  if (row.used) return Response.json({ error: 'Code déjà utilisé.' }, { status: 410 });
  if (new Date(row.expires_at) < new Date()) return Response.json({ error: 'Code expiré.' }, { status: 410 });

  // Usage unique : on marque tout de suite comme utilisé.
  await supabaseAdmin.from('app_link_codes').update({ used: true }).eq('code', code);

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: row.email,
  });
  if (linkErr) return Response.json({ error: linkErr.message }, { status: 500 });

  const tokenHash = linkData.properties && linkData.properties.hashed_token;
  if (!tokenHash) return Response.json({ error: 'Génération du token impossible.' }, { status: 500 });

  return Response.json({ email: row.email, token_hash: tokenHash });
}
