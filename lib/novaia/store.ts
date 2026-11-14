// lib/novaia/store.ts
//
// Conversations de NovaIA enregistrées dans le NAVIGATEUR (localStorage) : rien ne part vers un serveur.
// Toutes les lectures / écritures sont protégées (navigation privée, stockage plein ou bloqué) : en cas d'échec,
// la page marche quand même, simplement sans historique. Fonctions pures + accès stockage, pas de React ici.

export interface StoredMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
  /** message envoyé avec une image (l'image elle-même n'est jamais enregistrée) */
  image?: boolean;
  /** pages consultées pour répondre (recherche Wikipédia) */
  sources?: Source[];
  /** comparaison en attente de choix (jamais enregistrée : après rechargement, seule la version A reste) */
  ab?: { textB: string; dimsA: Record<string, string | null>; dimsB: Record<string, string | null> };
}

export interface Source {
  title: string;
  url: string;
}

/** Une source n'est affichée que si c'est un lien https vers Wikipédia (la valeur vient du Space : on ne lui fait pas confiance). */
export function cleanSources(x: unknown): Source[] {
  if (!Array.isArray(x)) return [];
  const out: Source[] = [];
  for (const s of x.slice(0, 3)) {
    if (typeof s !== 'object' || s === null) continue;
    const { title, url } = s as Record<string, unknown>;
    if (typeof title !== 'string' || typeof url !== 'string') continue;
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' || !(u.hostname === 'wikipedia.org' || u.hostname.endsWith('.wikipedia.org'))) continue;
      out.push({ title: title.slice(0, 120), url: u.toString() });
    } catch {
      /* lien invalide : ignoré */
    }
  }
  return out;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: StoredMessage[];
  renamed?: boolean;
  /** résumé du début de la discussion (compression) et id du dernier message qu'il couvre */
  summary?: string;
  summaryUpTo?: number;
}

const KEY = 'novaia:conversations:v1';
export const MAX_CONVERSATIONS = 50;
export const MAX_MESSAGES = 60;
const MAX_STORED_CONTENT = 4000;
export const MAX_TITLE = 60;

export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* repli ci-dessous */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nextMessageId(c: Conversation): number {
  return c.messages.reduce((m, x) => Math.max(m, x.id), 0) + 1;
}

export function newConversation(title: string): Conversation {
  const now = Date.now();
  return { id: newId(), title, createdAt: now, updatedAt: now, messages: [] };
}

/** Titre automatique : début du premier message, sur une ligne. */
export function titleFrom(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 40 ? `${t.slice(0, 40).trimEnd()}…` : t || '…';
}

function sanitizeMessage(x: unknown): StoredMessage | null {
  if (typeof x !== 'object' || x === null) return null;
  const { id, role, content, error, image, sources } = x as Record<string, unknown>;
  if (typeof id !== 'number' || (role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
  if (!content.trim()) return null;
  return {
    id,
    role,
    content: content.slice(0, MAX_STORED_CONTENT),
    ...(error === true ? { error: true } : {}),
    ...(image === true ? { image: true } : {}),
    ...(cleanSources(sources).length ? { sources: cleanSources(sources) } : {}),
  };
}

function sanitizeConversation(x: unknown): Conversation | null {
  if (typeof x !== 'object' || x === null) return null;
  const { id, title, createdAt, updatedAt, messages, renamed, summary, summaryUpTo } = x as Record<string, unknown>;
  if (typeof id !== 'string' || typeof title !== 'string' || !Array.isArray(messages)) return null;
  const msgs = messages.map(sanitizeMessage).filter((m): m is StoredMessage => m !== null).slice(-MAX_MESSAGES);
  const created = typeof createdAt === 'number' ? createdAt : Date.now();
  return {
    id,
    title: title.slice(0, MAX_TITLE) || '…',
    createdAt: created,
    updatedAt: typeof updatedAt === 'number' ? updatedAt : created,
    messages: msgs,
    ...(renamed === true ? { renamed: true } : {}),
    ...(typeof summary === 'string' && summary.trim() && typeof summaryUpTo === 'number'
      ? { summary: summary.trim().slice(0, 1200), summaryUpTo }
      : {}),
  };
}

export function loadConversations(): Conversation[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map(sanitizeConversation)
      .filter((c): c is Conversation => c !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CONVERSATIONS);
  } catch {
    return [];
  }
}

/** Écrit la liste ; si le stockage est plein, abandonne les plus anciennes conversations jusqu'à ce que ça passe. */
export function saveConversations(list: Conversation[]): void {
  let data = [...list].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
  for (let i = 0; i < 6; i++) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
      return;
    } catch {
      if (data.length <= 1) return;
      data = data.slice(0, Math.ceil(data.length * 0.7));
    }
  }
}

export function clearStored(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* rien à faire */
  }
}

export type DateGroup = 'today' | 'yesterday' | 'week' | 'older';

export function dateGroup(ts: number, now: number = Date.now()): DateGroup {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  if (ts >= startOfToday.getTime()) return 'today';
  if (ts >= startOfToday.getTime() - day) return 'yesterday';
  if (ts >= startOfToday.getTime() - 7 * day) return 'week';
  return 'older';
}
