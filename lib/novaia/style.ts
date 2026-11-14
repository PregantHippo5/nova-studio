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
