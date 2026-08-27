-- Nova Studio — schéma Supabase
-- À exécuter une fois dans : Supabase Dashboard → SQL Editor → New query → Run

-- ========== TABLES ==========

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('Software','Games','Music','Videos')),
  status text not null check (status in ('Live','In development','Paused','Archived')),
  tagline_fr text not null default '',
  tagline_en text not null default '',
  description_fr text not null default '',
  description_en text not null default '',
  current_version text,
  cover_gradient_start text not null default '#EDEBFF',
  cover_gradient_end text not null default '#F6F5FF',
  cover_label text not null default '',
  features_fr text[] not null default '{}',
  features_en text[] not null default '{}',
  links jsonb not null default '[]', -- [{label, href, kind, download?, available?}]
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version text not null,
  date date not null default current_date,
  added_fr text[] default '{}', added_en text[] default '{}',
  improved_fr text[] default '{}', improved_en text[] default '{}',
  fixed_fr text[] default '{}', fixed_en text[] default '{}',
  removed_fr text[] default '{}', removed_en text[] default '{}',
  known_issues_fr text[] default '{}', known_issues_en text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  date date not null default current_date,
  title_fr text not null default '',
  title_en text not null default '',
  project text not null default '',
  category_fr text not null default '',
  category_en text not null default '',
  reading_time_fr text not null default '',
  reading_time_en text not null default '',
  excerpt_fr text not null default '',
  excerpt_en text not null default '',
  content_fr text[] not null default '{}',
  content_en text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  project text not null,
  title_fr text not null default '',
  title_en text not null default '',
  stage text not null check (stage in ('Done','In Progress','Planned','Future')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Liste blanche des admins autorisés à écrire depuis /admin.
-- Un email doit exister ici (en plus d'avoir un compte Supabase Auth) pour avoir accès à l'admin.
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- ========== HELPER ==========

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ========== RLS ==========

alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.journal_entries enable row level security;
alter table public.roadmap_items enable row level security;
alter table public.admins enable row level security;

-- Lecture publique (le site affiche ce contenu à tout le monde)
create policy "public read projects" on public.projects for select using (true);
create policy "public read project_versions" on public.project_versions for select using (true);
create policy "public read journal_entries" on public.journal_entries for select using (true);
create policy "public read roadmap_items" on public.roadmap_items for select using (true);

-- Écriture réservée aux admins connectés
create policy "admin write projects" on public.projects for all using (is_admin()) with check (is_admin());
create policy "admin write project_versions" on public.project_versions for all using (is_admin()) with check (is_admin());
create policy "admin write journal_entries" on public.journal_entries for all using (is_admin()) with check (is_admin());
create policy "admin write roadmap_items" on public.roadmap_items for all using (is_admin()) with check (is_admin());

-- Un admin peut voir la liste des admins (utile pour la page "Équipe")
create policy "admins can read admins" on public.admins for select using (is_admin());

-- ========== SEED : SOCLE ==========

insert into public.projects (
  slug, name, category, status,
  tagline_fr, tagline_en, description_fr, description_en,
  current_version, cover_gradient_start, cover_gradient_end, cover_label,
  features_fr, features_en, links, sort_order
) values (
  'socle', 'SOCLE', 'Software', 'In development',
  'Une appli de révision pensée pour la prépa : cours, quiz et IA au même endroit.',
  'A revision app built for prep-school students: notes, quizzes and AI in one place.',
  'SOCLE regroupe tout ce qu''il faut pour réviser efficacement : un espace de travail pour tes notes (avec rendu des formules mathématiques et lecture de PDF), ton emploi du temps, un suivi de progression, et des quiz et exercices générés automatiquement à partir de tes cours. Un assistant IA intégré connaît ton contexte pour t''aider sans jamais faire le travail à ta place. Toutes les données restent en local, exportables et importables à tout moment.',
  'SOCLE brings together everything you need to revise efficiently: a workspace for your notes (with math formula rendering and PDF reading), your class schedule, progress tracking, and quizzes and exercises generated automatically from your own notes. A built-in AI assistant knows your context to help without ever doing the work for you. All data stays local, exportable and importable at any time.',
  'v9.2.6', '#EDEBFF', '#F6F5FF', 'SOCLE',
  array[
    'Espace de travail avec rendu de formules mathématiques (KaTeX) et lecture de PDF',
    'Emploi du temps et suivi de progression intégrés',
    'Quiz et exercices générés automatiquement à partir de tes propres cours',
    'Assistant IA contextuel — explique et guide, ne fait jamais le travail à ta place',
    'Toutes les données restent en local, exportables et importables à tout moment',
    'Mode sombre'
  ],
  array[
    'Workspace with math formula rendering (KaTeX) and PDF reading',
    'Built-in schedule and progress tracking',
    'Auto-generated quizzes and exercises from your own notes',
    'Context-aware AI assistant — explains and guides, never does the work for you',
    'All data stays local, exportable and importable at any time',
    'Dark mode'
  ],
  '[{"label":"Download SOCLE","href":"#","kind":"primary","available":false}]'::jsonb,
  0
)
on conflict (slug) do nothing;

insert into public.roadmap_items (project, title_fr, title_en, stage, sort_order)
values ('SOCLE', 'Rendre SOCLE facile à télécharger pour la rentrée', 'Make SOCLE easy to download before term starts', 'In Progress', 0)
on conflict do nothing;

create table public.training_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) not null,

  status text not null default 'queued'
    check (status in ('queued','starting','running','complete','failed','cancelled')),

  dataset text not null default 'novaia_qa_5000_v3.jsonl'
    check (dataset = 'novaia_qa_5000_v3.jsonl'),

  epochs integer not null check (epochs > 0),
  batch_size integer not null default 1 check (batch_size > 0),
  gradient_accumulation integer not null default 8 check (gradient_accumulation > 0),
  learning_rate numeric not null default 0.0001 check (learning_rate > 0),
  checkpoint_interval integer not null default 100 check (checkpoint_interval > 0),

  resume boolean not null default false,
  resume_checkpoint text,

  lora_repo text not null default 'novastudio123/novaia-checkpoints',
  lora_path text not null default 'nova-lora',

  current_step integer,
  current_loss numeric,
  kaggle_kernel_ref text,
  kaggle_run_url text,

  error_message text,
  train_runtime_seconds numeric,

  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

alter table public.training_jobs enable row level security;

create policy "admins can select training_jobs"
  on public.training_jobs for select
  using (public.is_admin());

create policy "admins can insert training_jobs"
  on public.training_jobs for insert
  with check (public.is_admin());

create policy "admins can update training_jobs"
  on public.training_jobs for update
  using (public.is_admin());

create policy "admins can delete training_jobs"
  on public.training_jobs for delete
  using (public.is_admin());

create unique index training_jobs_one_active
  on public.training_jobs ((true))
  where status in ('queued','starting','running');


create table public.training_job_logs (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.training_jobs(id) on delete cascade,
  log_line text not null,
  created_at timestamptz not null default now()
);

alter table public.training_job_logs enable row level security;

create policy "admins can select training_job_logs"
  on public.training_job_logs for select
  using (public.is_admin());

create policy "admins can insert training_job_logs"
  on public.training_job_logs for insert
  with check (public.is_admin());

create index training_job_logs_job_id_idx
  on public.training_job_logs (job_id, created_at);
  
  
  
  create table public.kaggle_kernel_registry (
  id integer primary key default 1 check (id = 1), -- une seule ligne, singleton
  kernel_id bigint,
  kernel_owner text not null default 'evansaccard',
  kernel_slug text,
  updated_at timestamptz not null default now()
);

alter table public.kaggle_kernel_registry enable row level security;

create policy "admins can select kaggle_kernel_registry"
  on public.kaggle_kernel_registry for select
  using (public.is_admin());

create policy "admins can insert kaggle_kernel_registry"
  on public.kaggle_kernel_registry for insert
  with check (public.is_admin());

create policy "admins can update kaggle_kernel_registry"
  on public.kaggle_kernel_registry for update
  using (public.is_admin());