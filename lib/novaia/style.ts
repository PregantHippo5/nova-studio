/**
 * Style de réponse de NovaIA : six réglages indépendants (donc mixables), chacun avec quelques valeurs fixes.
 * Rien n'est jamais envoyé au modèle en texte libre : seules ces valeurs sont acceptées (côté site et côté Space).
 * Un réglage absent = « comme NovaIA répond par défaut ».
 */
export type StyleKey = 'ton' | 'longueur' | 'format' | 'emojis' | 'chaleur' | 'fermete';
export type Style = Partial<Record<StyleKey, string>>;

export const STYLE_OPTIONS: Record<StyleKey, string[]> = {
  ton: ['decontracte', 'serieux'],
  longueur: ['court', 'detaille'],
  format: ['synthese', 'pave', 'listes'],
  emojis: ['aucun', 'rares', 'oui'],
  chaleur: ['factuelle', 'humaine'],
  fermete: ['franche'],
};

export const STYLE_KEYS = Object.keys(STYLE_OPTIONS) as StyleKey[];

/** Préréglages : un clic remplit les réglages, que la personne peut ensuite mélanger à sa façon. */
export const PRESETS: { id: string; style: Style }[] = [
  { id: 'pote', style: { ton: 'decontracte', emojis: 'oui', chaleur: 'humaine', longueur: 'court' } },
  { id: 'prof', style: { ton: 'serieux', format: 'pave', longueur: 'detaille', emojis: 'aucun' } },
  { id: 'direct', style: { longueur: 'court', format: 'synthese', emojis: 'aucun', chaleur: 'factuelle', fermete: 'franche' } },
];

/** Ne garde que les réglages connus avec une valeur autorisée. */
export function cleanStyle(x: unknown): Style {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return {};
  const out: Style = {};
  for (const k of STYLE_KEYS) {
    const v = (x as Record<string, unknown>)[k];
    if (typeof v === 'string' && STYLE_OPTIONS[k].includes(v)) out[k] = v;
  }
  return out;
}

export function sameStyle(a: Style, b: Style): boolean {
  return STYLE_KEYS.every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

/** Réglages d'une comparaison : valeur autorisée, ou null = « retirer ce réglage ». */
export type Dims = Record<string, string | null>;

export function cleanDims(x: unknown): Dims {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return {};
  const out: Dims = {};
  for (const k of STYLE_KEYS) {
    const v = (x as Record<string, unknown>)[k];
    if (v === null) out[k] = null;
    else if (typeof v === 'string' && STYLE_OPTIONS[k].includes(v)) out[k] = v;
  }
  return out;
}

export function applyDims(style: Style, dims: Dims): Style {
  const out: Style = { ...style };
  for (const [k, v] of Object.entries(dims)) {
    if (v === null) delete out[k as StyleKey];
    else out[k as StyleKey] = v;
  }
  return out;
}

/** Ce que le site envoie au Space en plus de la question : style, petits faits, résumé, demande de comparaison. */
export interface Perso {
  style: Style;
  memoire: string[];
  resume: string;
  ab: number | null;
}

export function cleanPerso(x: unknown): Perso {
  const o = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
  const memoire = Array.isArray(o.memoire)
    ? o.memoire.filter((m): m is string => typeof m === 'string' && m.trim().length > 0).map((m) => m.trim().slice(0, 200)).slice(0, 10)
    : [];
  const resume = typeof o.resume === 'string' ? o.resume.trim().slice(0, 1200) : '';
  const ab = typeof o.ab === 'number' && Number.isInteger(o.ab) && o.ab >= 0 && o.ab <= 2 ? o.ab : null;
  return { style: cleanStyle(o.style), memoire, resume, ab };
}

export function persoIsEmpty(p: Perso): boolean {
  return Object.keys(p.style).length === 0 && p.memoire.length === 0 && !p.resume && p.ab === null;
}
