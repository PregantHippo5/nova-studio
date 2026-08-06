// app/api/app-link/create/route.js
//
// Appelée depuis /account (utilisateur déjà connecté sur le site web) quand il
// clique "Connecter SOCLE". Génère un code à usage unique, valable 5 min.

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { access_token } = body;
  if (!access_token) return Response.json({ error: 'access_token requis.' }, { status: 400 });

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(access_token);
  if (userErr || !userData.user) {
    return Response.json({ error: 'Session invalide.' }, { status: 401 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from('app_link_codes').insert({
    code, user_id: userData.user.id, email: userData.user.email, expires_at: expiresAt,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ code, expiresAt });
}
