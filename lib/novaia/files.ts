// lib/novaia/files.ts
//
// Pièces jointes gardées SUR L'APPAREIL (IndexedDB), comme les conversations : rien ne part vers un serveur ni vers le compte.
// Supprimées avec la conversation (ou avec « Tout effacer »). Plafond de 60 pièces : les plus anciennes partent d'abord.
// Tout est en try/catch : si le navigateur refuse (navigation privée…), les pièces jointes restent seulement en mémoire.

export interface StoredDoc {
  thumb: string;
  dataUrl: string;
  label: string;
  fresh: boolean;
}
interface Row extends StoredDoc {
  key: string; // `${convId}:${msgId}`
  convId: string;
  msgId: number;
  at: number;
}

const DB = 'novaia-files';
const STORE = 'docs';
const MAX_DOCS = 60;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no idb'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: 'key' });
      s.createIndex('convId', 'convId');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
const wrap = <T,>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

export async function putDoc(convId: string, msgId: number, doc: StoredDoc): Promise<void> {
  try {
    const db = await open();
    const tx = db.transaction(STORE, 'readwrite');
    const s = tx.objectStore(STORE);
    s.put({ ...doc, key: `${convId}:${msgId}`, convId, msgId, at: Date.now() } satisfies Row);
    const all = (await wrap(s.getAll())) as Row[];
    if (all.length > MAX_DOCS) {
      all.sort((a, b) => a.at - b.at).slice(0, all.length - MAX_DOCS).forEach((r) => s.delete(r.key));
    }
    await done(tx);
    db.close();
  } catch {
    /* tant pis : reste en mémoire */
  }
}

export async function loadConvDocs(convId: string): Promise<Record<number, StoredDoc>> {
  try {
    const db = await open();
    const rows = (await wrap(db.transaction(STORE).objectStore(STORE).index('convId').getAll(convId))) as Row[];
    db.close();
    const out: Record<number, StoredDoc> = {};
    for (const r of rows) out[r.msgId] = { thumb: r.thumb, dataUrl: r.dataUrl, label: r.label, fresh: r.fresh };
    return out;
  } catch {
    return {};
  }
}

export async function deleteConvDocs(convId: string): Promise<void> {
  try {
    const db = await open();
    const tx = db.transaction(STORE, 'readwrite');
    const s = tx.objectStore(STORE);
    const keys = (await wrap(s.index('convId').getAllKeys(convId))) as IDBValidKey[];
    keys.forEach((k) => s.delete(k));
    await done(tx);
    db.close();
  } catch {
    /* rien */
  }
}

export async function clearAllDocs(): Promise<void> {
  try {
    const db = await open();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    await done(tx);
    db.close();
  } catch {
    /* rien */
  }
}
