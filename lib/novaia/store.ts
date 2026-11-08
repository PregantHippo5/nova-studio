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
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: StoredMessage[];
  renamed?: boolean;
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
  const { id, role, content, error } = x as Record<string, unknown>;
  if (typeof id !== 'number' || (role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
  if (!content.trim()) return null;
  return { id, role, content: content.slice(0, MAX_STORED_CONTENT), ...(error === true ? { error: true } : {}) };
}

function sanitizeConversation(x: unknown): Conversation | null {
  if (typeof x !== 'object' || x === null) return null;
  const { id, title, createdAt, updatedAt, messages, renamed } = x as Record<string, unknown>;
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
