// app/api/ai/chat/route.js
//
// Proxy vers Mistral : (1) exige un utilisateur Socle authentifié (JWT Supabase),
// (2) applique un budget de tokens mensuel par utilisateur, (3) enregistre la
// consommation réelle (tokens_used) pour affichage dans les paramètres de l'app.

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

const MONTHLY_TOKEN_BUDGET = 300000; // ajuste selon ton budget Mistral réel

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(request) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'MISTRAL_API_KEY manquante côté serveur.' }, { status: 500 });
  }

  // --- 1) Identifier l'utilisateur via son token de session Supabase ---
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return Response.json({ error: 'Non authentifié.' }, { status: 401 });

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
  if (userErr || !userData.user) {
    return Response.json({ error: 'Session invalide ou expirée.' }, { status: 401 });
  }
  const userId = userData.user.id;
  const month = currentMonthKey();

  // --- 2) Vérifier le budget de tokens du mois AVANT l'appel ---
  const { data: usageRow } = await supabaseAdmin
    .from('ai_usage')
    .select('tokens_used, request_count')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();

  const usedSoFar = usageRow ? usageRow.tokens_used : 0;
  if (usedSoFar >= MONTHLY_TOKEN_BUDGET) {
    return Response.json(
      { error: `Quota IA du mois atteint (${MONTHLY_TOKEN_BUDGET.toLocaleString('fr-FR')} tokens). Réessaie le mois prochain.` },
      { status: 429 }
    );
  }

  // --- 3) Appel Mistral, clé côté serveur uniquement ---
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ error: 'JSON invalide.' }, { status: 400 });
  }
  const { model, messages, temperature } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: '"messages" manquant ou vide.' }, { status: 400 });
  }
  const approxSize = JSON.stringify(messages).length;
  if (approxSize > 60000) {
    return Response.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
  }

  let upstream;
  try {
    upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'mistral-small-latest',
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.3,
      }),
    });
  } catch (e) {
    return Response.json({ error: 'Échec de connexion à Mistral.' }, { status: 502 });
  }

  const rawText = await upstream.text();

  // --- 4) Enregistrer la vraie consommation (tokens réellement utilisés par Mistral) ---
  if (upstream.ok) {
    try {
      const parsed = JSON.parse(rawText);
      const totalTokens = (parsed.usage && parsed.usage.total_tokens) || 0;
      await supabaseAdmin.from('ai_usage').upsert({
        user_id: userId,
        month,
        tokens_used: usedSoFar + totalTokens,
        request_count: (usageRow ? usageRow.request_count : 0) + 1,
      });
    } catch (e) {
      console.warn('Comptage de tokens échoué :', e);
    }
  }

  return new Response(rawText, { status: upstream.status, headers: { 'Content-Type': 'application/json' } });
}
