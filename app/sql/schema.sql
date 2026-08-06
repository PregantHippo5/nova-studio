-- ============================================================================
-- Socle — schéma Supabase complet (points 3, 5, 7 de la roadmap)
-- À lancer dans Supabase → SQL Editor. Peut être relancé sans risque grâce
-- aux "if not exists" (idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5) Synchronisation des données utilisateur (remplace le "tout en localStorage")
-- ----------------------------------------------------------------------------
create table if not exists user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_states enable row level security;

-- Chacun ne peut lire/écrire QUE sa propre ligne (auth.uid() = son propre id,
-- automatiquement vérifié par Supabase via le token de session envoyé par supabase-js).
drop policy if exists "user can read own state" on user_states;
create policy "user can read own state" on user_states
  for select using (auth.uid() = user_id);

drop policy if exists "user can upsert own state" on user_states;
create policy "user can upsert own state" on user_states
  for insert with check (auth.uid() = user_id);

drop policy if exists "user can update own state" on user_states;
create policy "user can update own state" on user_states
  for update using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 3) Groupes (chat + fiches partagées + progression entre potes)
-- Accédées uniquement via les routes Next.js /api/groups/* (clé service_role,
-- jamais depuis le navigateur) — donc RLS activée SANS policy : bloque tout
-- accès direct via la clé anon, seule la clé service_role (qui bypass RLS) passe.
-- ----------------------------------------------------------------------------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
alter table groups enable row level security;

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id text not null,       -- identifiant local généré côté app (pas un vrai compte)
  user_name text not null default 'Anonyme',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table group_members enable row level security;

create table if not exists group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id text not null,
  user_name text not null default 'Anonyme',
  text text not null,
  attachment jsonb,
  ts bigint not null  -- epoch ms, généré par le serveur à l'insertion
);
alter table group_messages enable row level security;
create index if not exists idx_group_messages_group_ts on group_messages(group_id, ts);

create table if not exists group_docs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id text not null,
  user_name text not null default 'Anonyme',
  title text not null,
  content text not null,
  ts bigint not null
);
alter table group_docs enable row level security;
create index if not exists idx_group_docs_group_ts on group_docs(group_id, ts);

create table if not exists group_progress (
  group_id uuid not null references groups(id) on delete cascade,
  user_id text not null,
  user_name text not null default 'Anonyme',
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table group_progress enable row level security;


-- ----------------------------------------------------------------------------
-- 7) Suivi d'usage IA (en tokens, sur le mois en cours) — pour le rate-limit
-- et pour l'affichage "X / Y tokens utilisés" dans les paramètres de l'appli.
-- Même logique : RLS activée sans policy générale, seule la route serveur
-- (service_role) y écrit ; une policy dédiée permet la LECTURE de sa propre ligne
-- pour que l'app puisse afficher l'usage sans passer par une route API dédiée.
-- ----------------------------------------------------------------------------
create table if not exists ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,             -- format 'YYYY-MM'
  tokens_used bigint not null default 0,
  request_count int not null default 0,
  primary key (user_id, month)
);
alter table ai_usage enable row level security;

drop policy if exists "user can read own ai usage" on ai_usage;
create policy "user can read own ai usage" on ai_usage
  for select using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- Lien d'appareil (connexion automatique de l'exe via novastudio://)
-- Un code à usage unique, valable 5 minutes, créé depuis /account (utilisateur
-- déjà connecté sur le site), échangé par l'app desktop contre une vraie session.
-- ----------------------------------------------------------------------------
create table if not exists app_link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used boolean not null default false
);
alter table app_link_codes enable row level security;
-- Pas de policy : uniquement accessible via la clé service_role côté serveur.

