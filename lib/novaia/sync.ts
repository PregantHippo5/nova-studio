// lib/novaia/sync.ts
//
// Synchronisation FACULTATIVE des discussions entre appareils, via le Supabase du site (même compte).
// Seulement si la personne l'a activée. La version la plus récente de chaque discussion gagne ; une suppression est propagée.
// Les images ne sont jamais envoyées (elles restent sur l'appareil). Fonctions pures + accès Supabase, pas de React ici.

import { cleanConversation, MAX_CONVERSATIONS, type Conversation } from '@/lib/novaia/store';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Sb = any;

export interface RemoteRow {
  id: string;
  data: unknown;
  updated_at: number;
  deleted: boolean;
}

const MAX_JSON = 280_000;
const TOMBSTONE_TTL = 30 * 86_400_000; // une suppression est oubliée après 30 jours

export async function fetchRemote(sb: Sb, userId: string): Promise<RemoteRow[] | null> {
  const { data, error } = await sb.from('novaia_conversations').select('id, data, updated_at, deleted').eq('user_id', userId).limit(400);
  if (error || !Array.isArray(data)) return null;
  return data as RemoteRow[];
}

/** Fusionne local + distant. `push` = ce qui est plus récent en local (à envoyer). `skip` : discussion en cours d'écriture, laissée telle quelle. */
export function mergeConversations(local: Conversation[], remote: RemoteRow[], skip?: string | null) {
  const byId = new Map(local.map((c) => [c.id, c]));
  const out = new Map(byId);
  const push: Conversation[] = [];
  const seen = new Set<string>();
  let changed = false;

  for (const r of remote) {
    seen.add(r.id);
    if (r.id === skip) continue;
    const mine = byId.get(r.id);
    if (r.deleted) {
      if (mine && r.updated_at >= mine.updatedAt) {
        out.delete(r.id);
        changed = true;
      } else if (mine) push.push(mine); // modifiée après la suppression : elle ressuscite
      continue;
    }
    const theirs = cleanConversation({ ...(r.data as object), id: r.id });
    if (!theirs) continue;
    if (!mine) {
      out.set(r.id, theirs);
      changed = true;
    } else if (r.updated_at > mine.updatedAt) {
      out.set(r.id, theirs);
      changed = true;
    } else if (r.updated_at < mine.updatedAt) {
      push.push(mine);
    }
  }
  for (const c of local) if (!seen.has(c.id)) push.push(c);

  const list = [...out.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
  return { list, push, changed };
}

function fit(c: Conversation): Conversation {
  let cur = c;
  while (JSON.stringify(cur).length > MAX_JSON && cur.messages.length > 2) cur = { ...cur, messages: cur.messages.slice(2) };
  return cur;
}

export async function pushConversation(sb: Sb, userId: string, c: Conversation): Promise<boolean> {
  const clean = fit({ ...c, messages: c.messages.map(({ ab: _ab, ...m }) => m) });
  const { error } = await sb
    .from('novaia_conversations')
    .upsert({ user_id: userId, id: c.id, data: clean, updated_at: c.updatedAt, deleted: false }, { onConflict: 'user_id,id' });
  return !error;
}

export async function pushDeletion(sb: Sb, userId: string, id: string): Promise<boolean> {
  const { error } = await sb
    .from('novaia_conversations')
    .upsert({ user_id: userId, id, data: {}, updated_at: Date.now(), deleted: true }, { onConflict: 'user_id,id' });
  return !error;
}

export async function purgeOldDeletions(sb: Sb, userId: string): Promise<void> {
  try {
    await sb.from('novaia_conversations').delete().eq('user_id', userId).eq('deleted', true).lt('updated_at', Date.now() - TOMBSTONE_TTL);
  } catch {
    /* sans importance */
  }
}

/** Désactivation : on supprime tout ce qui est stocké sur le compte (les discussions restent sur cet appareil). */
export async function deleteAllRemote(sb: Sb, userId: string): Promise<boolean> {
  const { error } = await sb.from('novaia_conversations').delete().eq('user_id', userId);
  return !error;
}
