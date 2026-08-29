-- À exécuter une fois dans : Supabase Dashboard → SQL Editor → New query → Run
-- Ajoute le support vidéo de cover + screenshots (carrousel) sur les projets existants.

alter table public.projects
  add column if not exists cover_video_url text,
  add column if not exists cover_poster_url text,
  add column if not exists screenshots jsonb not null default '[]';

comment on column public.projects.cover_video_url is
  'URL de la vidéo (mp4/webm) jouée en boucle dans le hero, à la place du dégradé, quand renseignée.';
comment on column public.projects.cover_poster_url is
  'Image affichée pendant le chargement de la vidéo / si la vidéo échoue.';
comment on column public.projects.screenshots is
  'Tableau [{"url": "...", "alt": "..."}] affiché sous le hero dans un carrousel auto-défilant avec points cliquables.';

-- Exemple pour remplir le projet "socle" une fois les fichiers uploadés dans
-- Supabase Storage (ou servis depuis /public) :
--
-- update public.projects set
--   cover_video_url = '/videos/socle-ba-web.mp4',
--   cover_poster_url = '/images/projects/socle/today.webp',
--   screenshots = '[
--     {"url": "/images/projects/socle/today.webp", "alt": "Vue Aujourd’hui"},
--     {"url": "/images/projects/socle/workspace.webp", "alt": "Espace de travail — Tes fiches"},
--     {"url": "/images/projects/socle/progress.webp", "alt": "Suivi de progression"},
--     {"url": "/images/projects/socle/planning.webp", "alt": "Planning automatique"}
--   ]'::jsonb
-- where slug = 'socle';
