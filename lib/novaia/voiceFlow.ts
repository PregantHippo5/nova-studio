// lib/novaia/voiceFlow.ts
//
// Mode vocal continu : petites règles SANS réseau ni modèle (fonctions pures, testables) :
//  - filtrer les phrases que Whisper « invente » quand il n'y a que du bruit ;
//  - repérer une phrase coupée en plein milieu (pause pour réfléchir) pour attendre la suite au lieu de répondre à un fragment ;
//  - phrases d'attente variées pour masquer la latence (jamais deux fois la même d'affilée).

export type Lang = 'fr' | 'en';

// Textes que Whisper produit sur du silence ou du bruit (sous-titres de vidéos vues à l'entraînement).
const HALLU = [
  /amara\.org/i,
  /sous[- ]?titr/i,
  /merci (?:d'avoir|de) (?:regard|visionn|votre attention)/i,
  /abonnez[- ]vous/i,
  /thanks? (?:you )?for (?:watching|listening)/i,
  /subtitles? (?:by|made)/i,
  /(?:please )?(?:like and )?subscribe/i,
  /transcribed by/i,
  /^\s*(?:\.{2,}|…|-+)\s*$/,
];

/** Vrai si le texte ressemble à une hallucination de Whisper (ou à du bruit transcrit en rien). */
export function isHallucination(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (HALLU.some((r) => r.test(t))) return true;
  const letters = t.replace(/[^\p{L}\p{N}]/gu, '');
  if (letters.length < 2) return true;
  // même mot répété en boucle (« oui oui oui oui oui »)
  const words = t.toLowerCase().split(/\s+/);
  if (words.length >= 5 && new Set(words).size <= 2) return true;
  return false;
}

// Mots qui ne terminent pas une phrase : si la transcription finit par l'un d'eux, la personne n'a pas fini.
const OPEN_FR = new Set(
  'et ou mais donc or ni car que qui quoi dont où le la les l un une des de du d au aux en à a dans sur sous par pour avec sans chez vers comme si quand lorsque puisque parce alors ensuite aussi je j tu il elle on nous vous ils elles ce cet cette ces mon ma mes ton ta tes son sa ses notre votre leur est sont suis es êtes ai as avons avez ont va vais vont peux peut veux veut'.split(' ')
);
const OPEN_EN = new Set(
  'and or but so because that which who whom whose where when while if then also the a an of to in on at by for with without from as is are am was were be been i you he she it we they my your his her its our their this these those can could would should will shall do does did has have had not'.split(' ')
);

/** Vrai si la phrase semble coupée (finit sur un mot de liaison ou une virgule, ou un seul mot très court). */
export function isFragment(text: string, lang: Lang): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[.!?…]$/.test(t)) return false; // Whisper met un point final quand la phrase est finie
  if (/[,;:]$/.test(t)) return true;
  const words = t.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const last = words[words.length - 1].replace(/^.*'/, '');
  return (lang === 'en' ? OPEN_EN : OPEN_FR).has(last) || (words.length === 1 && words[0].length <= 3);
}

export type FillerKind = 'generic' | 'recherche' | 'calcul' | 'reflexion' | 'encore';

const FILLERS: Record<Lang, Record<FillerKind, string[]>> = {
  fr: {
    generic: ['Hmm, laisse-moi réfléchir.', 'Une seconde, je regarde.', 'Je réfléchis à ça.'],
    recherche: ['Je vais chercher ça, une seconde.', 'Je consulte mes sources.'],
    calcul: ['Je lance le calcul.', 'Je calcule ça, quelques secondes.'],
    reflexion: ['Attends, je réfléchis à ça.', 'Ça demande un peu de réflexion.'],
    encore: ['Ça arrive, encore quelques secondes.', "Je suis encore dessus, j'arrive."],
  },
  en: {
    generic: ['Hmm, let me think.', 'One second, let me look.', "I'm thinking about it."],
    recherche: ['Let me look that up, one second.', "I'm checking my sources."],
    calcul: ["I'm running the calculation.", "Let me work that out, a few seconds."],
    reflexion: ['Hold on, let me think about it.', 'That needs a bit of thought.'],
    encore: ['Coming up, a few more seconds.', "Still on it, I'm almost there."],
  },
};

/** Phrase pour une étape donnée ; `n` choisit parmi les variantes (tourne), pour ne pas répéter. */
export function fillerText(kind: FillerKind, lang: Lang, n = 0): string {
  const list = FILLERS[lang][kind];
  return list[((n % list.length) + list.length) % list.length];
}

/** Toutes les phrases d'un genre (pour les préparer à l'avance). */
export function fillerList(kind: FillerKind, lang: Lang): string[] {
  return FILLERS[lang][kind];
}

/** Étape de la réponse (recherche / calcul / reflexion / redaction) -> genre de phrase d'attente. */
export function kindForState(state: string | undefined): FillerKind {
  return state === 'recherche' || state === 'calcul' || state === 'reflexion' ? state : 'generic';
}
