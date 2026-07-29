export type ProjectCategory = 'Software' | 'Games' | 'Music' | 'Videos';

export type ProjectStatus = 'Live' | 'In development' | 'Paused' | 'Archived';

export interface Localized<T> {
  fr: T;
  en: T;
}

export interface ProjectLink {
  label: string;
  href: string;
  kind: 'primary' | 'secondary';
  download?: boolean;
  available?: boolean;
}

export interface ProjectVersionEntry {
  version: string;
  date: string;
  added?: Localized<string[]>;
  improved?: Localized<string[]>;
  fixed?: Localized<string[]>;
  removed?: Localized<string[]>;
  knownIssues?: Localized<string[]>;
}

export interface Project {
  slug: string;
  name: string;
  category: ProjectCategory;
  status: ProjectStatus;
  tagline: Localized<string>;
  description: Localized<string>;
  currentVersion?: string;
  cover: { gradient: [string, string]; label: string };
  features?: Localized<string[]>;
  links: ProjectLink[];
  history?: ProjectVersionEntry[];
}

export interface JournalEntry {
  slug: string;
  date: string;
  title: Localized<string>;
  project: string;
  category: Localized<string>;
  readingTime: Localized<string>;
  excerpt: Localized<string>;
  content: Localized<string[]>;
}

export type RoadmapStage = 'Done' | 'In Progress' | 'Planned' | 'Future';

export interface RoadmapItem {
  id?: string;
  project: string;
  title: Localized<string>;
  stage: RoadmapStage;
}
