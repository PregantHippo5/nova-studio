// lib/novaia/provider.ts
//
// Seul fichier à modifier le jour où le vrai modèle est branché :
// generateReply() renvoie la réponse de NovaIA. Pour l'instant, c'est un
// répertoire de démonstration (aucun modèle, aucun appel externe).
// Server-only : ne jamais importer depuis un composant client.

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ReplyMode = 'demo' | 'live';

export interface ReplyResult {
  reply: string;
  mode: ReplyMode;
}

type Lang = 'fr' | 'en';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Rule {
  test: RegExp;
  fr: string;
  en: string;
}

const RULES: Rule[] = [
  {
    test: /\b(qui es[- ]?tu|tu es qui|ton nom|comment t'appelles|who are you|your name|introduce yourself)\b/,
    fr: "Je suis NovaIA, l'assistant de Nova Studio. Ou plutôt son aperçu : le vrai modèle est encore à l'entraînement, je réponds donc avec un répertoire limité.",
    en: "I'm NovaIA, Nova Studio's assistant. Or rather its preview: the real model is still in training, so I'm answering from a limited repertoire.",
  },
  {
    test: /\b(que sais[- ]?tu|que peux[- ]?tu|tu sais faire|a quoi sers|what can you|what do you do|help me|aide)\b/,
    fr: "À terme : expliquer simplement, répondre avec clarté et, quand il le faut, avec un peu d'empathie. Pour l'instant, je démontre surtout que l'interface fonctionne.",
    en: "Eventually: explaining things simply, answering clearly and, when needed, with a bit of empathy. For now, I mostly demonstrate that the interface works.",
  },
  {
    test: /\b(ozone)\b/,
    fr: "L'ozone est un gaz de l'atmosphère qui protège la Terre d'une partie des rayons ultraviolets du Soleil. Cette réponse est un exemple de démonstration, pas une sortie du modèle.",
    en: "Ozone is an atmospheric gas that shields the Earth from part of the Sun's ultraviolet rays. This answer is a demo example, not model output.",
  },
  {
    test: /\b(merci|thanks|thank you)\b/,
    fr: "Avec plaisir. C'est d'autant plus facile que je ne fatigue pas.",
    en: "My pleasure. It's easy, since I don't get tired.",
  },
  {
    test: /\b(ca va|comment vas[- ]?tu|how are you)\b/,
    fr: "Très bien, merci. Ma principale occupation du moment est d'attendre la fin de mon entraînement.",
    en: "Very well, thank you. My main occupation at the moment is waiting for my training to finish.",
  },
  {
    test: /\b(bonjour|salut|bonsoir|coucou|hello|hi|hey|good (morning|evening))\b/,
    fr: "Bonjour. Je suis l'aperçu de NovaIA : le vrai modèle est encore en entraînement. Posez-moi une question, je ferai de mon mieux avec ce que j'ai.",
    en: "Hello. I'm the NovaIA preview: the real model is still in training. Ask me something, I'll do my best with what I have.",
  },
];

const FALLBACKS: Record<Lang, string[]> = {
  fr: [
    "Bonne question. Malheureusement, je ne suis qu'un aperçu : le vrai modèle est encore en entraînement et cette réponse est une démonstration.",
    "Je note la question. Le modèle n'est pas encore branché ; revenez quand l'entraînement sera terminé.",
    "Pour l'instant je ne fais que simuler une conversation. Le vrai NovaIA saura y répondre, un peu plus tard.",
  ],
  en: [
    "Good question. Unfortunately I'm only a preview: the real model is still in training and this answer is a demonstration.",
    "Noted. The model isn't connected yet; come back once training is finished.",
    "For now I'm only simulating a conversation. The real NovaIA will be able to answer that, a little later.",
  ],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateReply(messages: ChatMessage[], locale: Lang): Promise<ReplyResult> {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const text = normalize(last?.content ?? '');

  // Petit délai pour ressembler à une vraie réponse (et tester l'indicateur de chargement).
  await sleep(350 + Math.floor(Math.random() * 450));

  for (const rule of RULES) {
    if (rule.test.test(text)) {
      return { reply: rule[locale], mode: 'demo' };
    }
  }

  const pool = FALLBACKS[locale];
  return { reply: pool[text.length % pool.length], mode: 'demo' };
}
