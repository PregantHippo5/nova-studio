// lib/supabaseAdmin.js
//
// Client Supabase côté serveur UNIQUEMENT — utilise la clé service_role qui
// bypass RLS. Ne JAMAIS importer ce fichier depuis un composant client
// ('use client') ni l'exposer au navigateur.
//
// Variables d'environnement Vercel nécessaires :
//   NEXT_PUBLIC_SUPABASE_URL      (déjà utilisée côté client, publique)
//   SUPABASE_SERVICE_ROLE_KEY     (secrète, jamais préfixée NEXT_PUBLIC_)

import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
