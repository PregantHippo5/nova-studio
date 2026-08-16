// À placer dans le repo Nova Studio : api/app/latest-version.js
// (mêmes conventions que api/ai/chat.js et api/app-link/exchange.js déjà en place)
//
// GET https://nova-studio-five-lime.vercel.app/api/app/latest-version
// → { version, label, download_url, sha256, notes, published_at }
//
// Utilise la SERVICE ROLE KEY (jamais l'anon key) : cette clé reste strictement
// côté serveur, comme la clé Mistral. Le client (SOCLE desktop) n'a besoin
// d'aucune clé pour appeler ce endpoint — les infos qu'il renvoie ne sont pas
// sensibles (version, URL publique du zip, empreinte).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data, error } = await supabase
    .from('app_releases')
    .select('version, label, download_url, sha256, notes, published_at')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('latest-version: erreur Supabase', error.message);
    return res.status(500).json({ error: 'internal error' });
  }
  if (!data) {
    return res.status(404).json({ error: 'no release found' });
  }

  // Cache court côté CDN Vercel : évite de re-frapper Supabase à chaque lancement
  // de SOCLE par chaque utilisateur, sans retarder significativement la diffusion
  // d'une nouvelle version (60s).
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json(data);
}
