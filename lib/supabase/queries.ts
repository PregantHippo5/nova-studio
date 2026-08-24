import { createClient } from '@/lib/supabase/server';
import {
  Project,
  ProjectVersionEntry,
  JournalEntry,
  RoadmapItem,
  Localized,
} from '@/lib/types';

function localizedOrUndefined(fr: string[], en: string[]): Localized<string[]> | undefined {
  return fr.length > 0 || en.length > 0 ? { fr, en } : undefined;
}

function mapProjectRow(row: any, versionRows: any[] = []): Project {
  const history: ProjectVersionEntry[] | undefined =
    versionRows.length > 0
      ? versionRows.map((v) => ({
          version: v.version,
          date: v.date,
          added: localizedOrUndefined(v.added_fr ?? [], v.added_en ?? []),
          improved: localizedOrUndefined(v.improved_fr ?? [], v.improved_en ?? []),
          fixed: localizedOrUndefined(v.fixed_fr ?? [], v.fixed_en ?? []),
          removed: localizedOrUndefined(v.removed_fr ?? [], v.removed_en ?? []),
          knownIssues: localizedOrUndefined(v.known_issues_fr ?? [], v.known_issues_en ?? []),
        }))
      : undefined;

  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    status: row.status,
    tagline: { fr: row.tagline_fr, en: row.tagline_en },
    description: { fr: row.description_fr, en: row.description_en },
    currentVersion: row.current_version ?? undefined,
    cover: {
      gradient: [row.cover_gradient_start, row.cover_gradient_end],
      label: row.cover_label,
    },
    features: localizedOrUndefined(row.features_fr ?? [], row.features_en ?? []),
    links: row.links ?? [],
    history,
  };
}

function mapJournalRow(row: any): JournalEntry {
  return {
    slug: row.slug,
    date: row.date,
    title: { fr: row.title_fr, en: row.title_en },
    project: row.project,
    category: { fr: row.category_fr, en: row.category_en },
    readingTime: { fr: row.reading_time_fr, en: row.reading_time_en },
    excerpt: { fr: row.excerpt_fr, en: row.excerpt_en },
    content: { fr: row.content_fr ?? [], en: row.content_en ?? [] },
  };
}

function mapRoadmapRow(row: any): RoadmapItem {
  return {
    id: row.id,
    project: row.project,
    title: { fr: row.title_fr, en: row.title_en },
    stage: row.stage,
  };
}

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return data.map((row) => mapProjectRow(row));
}

export async function getProject(slug: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !project) return null;

  const { data: versions } = await supabase
    .from('project_versions')
    .select('*')
    .eq('project_id', project.id)
    .order('date', { ascending: false });

  return mapProjectRow(project, versions ?? []);
}

// --- Releases desktop (auto-update + téléchargement public unifiés) ---
//
// Une seule source de vérité, utilisée à la fois par /api/app/latest-version
// (auto-update interne à SOCLE) et par la page publique du projet (boutons
// de téléchargement) — voir la décision d'unification des deux flux.
export interface LatestRelease {
  version: string;
  notes: string | null;
  windowsDownloadUrl: string | null;
  macosDownloadUrl: string | null;
}

export async function getLatestRelease(projectSlug: string): Promise<LatestRelease | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_releases')
    .select('version, notes, windows_download_url, macos_download_url')
    .eq('project_slug', projectSlug)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    version: data.version,
    notes: data.notes,
    windowsDownloadUrl: data.windows_download_url,
    macosDownloadUrl: data.macos_download_url,
  };
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .order('date', { ascending: false });

  if (error || !data) return [];
  return data.map(mapJournalRow);
}

export async function getJournalEntry(slug: string): Promise<JournalEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return mapJournalRow(data);
}

export async function getRoadmap(): Promise<RoadmapItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return data.map(mapRoadmapRow);
}