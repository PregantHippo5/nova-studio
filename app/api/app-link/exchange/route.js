// app/api/app-link/exchange/route.js
//
// Appelée par l'app desktop (novastudio://link?code=XXXX) avec le code reçu.
// Si valide, génère un lien magique côté serveur et renvoie le token_hash —
// l'app desktop l'échange ensuite contre une vraie session via
// supabase.auth.verifyOtp({ email, token_hash, type: 'magiclink' }).
//
// Appelée en cross-origin depuis http://127.0.0.1:<port> (le mini-serveur
// Electron de SOCLE) : il faut donc gérer le preflight OPTIONS et les
// en-têtes CORS, sinon Chromium bloque la requête avant qu'elle n'arrive ici.
// Pas de cookies/credentials en jeu (l'auth repose sur la possession du code,
// pas sur une session navigateur), donc Access-Control-Allow-Origin: * est
// sans risque ici.

import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { code } = body;
  if (!code) {
    return Response.json({ error: 'code requis.' }, { status: 400, headers: CORS_HEADERS });
  }

  // Marquage atomique : cette UPDATE ne réussit (et ne renvoie une ligne) que
  // si le code existait ET n'était pas déjà utilisé, en une seule opération
  // au niveau de la base. Ça élimine la fenêtre de course entre "vérifier"
  // et "marquer utilisé" — deux requêtes concurrentes avec le même code ne
  // peuvent plus toutes les deux réussir.
  const { data: row, error } = await supabaseAdmin
    .from('app_link_codes')
    .update({ used: true })
    .eq('code', code)
    .eq('used', false)
    .select()
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
  if (!row) {
    // Soit le code n'a jamais existé, soit il a déjà été consommé — même
    // réponse dans les deux cas pour ne pas donner d'information à un
    // attaquant qui tenterait de deviner des codes.
    return Response.json({ error: 'Code invalide ou déjà utilisé.' }, { status: 410, headers: CORS_HEADERS });
  }
  if (new Date(row.expires_at) < new Date()) {
    return Response.json({ error: 'Code expiré.' }, { status: 410, headers: CORS_HEADERS });
  }

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: row.email,
  });
  if (linkErr) {
    return Response.json({ error: linkErr.message }, { status: 500, headers: CORS_HEADERS });
  }

  const tokenHash = linkData.properties && linkData.properties.hashed_token;
  if (!tokenHash) {
    return Response.json({ error: 'Génération du token impossible.' }, { status: 500, headers: CORS_HEADERS });
  }

  return Response.json({ email: row.email, token_hash: tokenHash }, { headers: CORS_HEADERS });
}
