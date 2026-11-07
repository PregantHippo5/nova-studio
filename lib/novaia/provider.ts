// lib/novaia/provider.ts
//
// Seul fichier à modifier pour brancher le vrai modèle : generateReply() renvoie la réponse de NovaIA.
// - Si NOVAIA_SPACE_URL est définie (Vercel > Settings > Environment Variables), la question part vers le
//   Space Hugging Face de NovaIA (ZeroGPU), toujours depuis le serveur Next.js.
//   NOVAIA_HF_TOKEN (facultatif mais conseillé) : jeton Hugging Face qui donne le quota GPU du compte.
// - Sinon (développement local sans variables), on garde le répertoire de démonstration ci-dessous.
// Server-only : ne jamais importer depuis un composant client. Ces variables ne doivent JAMAIS être
// préfixées NEXT_PUBLIC_.

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

// --------------------------------------------------------------------------- vrai modèle (Space Hugging Face)

const SPACE_URL = (process.env.NOVAIA_SPACE_URL ?? '').replace(/\/+$/, '');
const HF_TOKEN = process.env.NOVAIA_HF_TOKEN ?? '';
const MODEL_MAX_CHARS = 600; // même limite que le Space
const TIMEOUT_MS = 55_000; // le premier message après une pause réveille le GPU : ça peut dépasser

type Problem = 'sleeping' | 'busy' | 'quota' | 'down';

const PROBLEMS: Record<Problem, Record<Lang, string>> = {
  sleeping: {
    fr: 'NovaIA se réveille (premier message après une pause). Réessaie dans 30 secondes.',
    en: 'NovaIA is waking up (first message after a break). Try again in 30 seconds.',
  },
  busy: {
    fr: "NovaIA est occupée avec d'autres questions. Réessaie dans un instant.",
    en: 'NovaIA is busy with other questions. Try again in a moment.',
  },
  quota: {
    fr: "NovaIA a utilisé tout son temps de calcul gratuit pour aujourd'hui. Réessaie plus tard ou demain.",
    en: "NovaIA has used all of today's free compute time. Try again later or tomorrow.",
  },
  down: {
    fr: 'NovaIA est indisponible pour le moment. Réessaie un peu plus tard.',
    en: 'NovaIA is unavailable right now. Please try again later.',
  },
};

/** Le Space (Gradio) répond en flux : on garde le dernier événement « complete » ou « error ». */
function parseSse(text: string): { event: 'complete' | 'error'; data: string } | null {
  let event = '';
  let last: { event: 'complete' | 'error'; data: string } | null = null;

  for (const line of text.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:') && (event === 'complete' || event === 'error')) {
      last = { event, data: line.slice(5).trim() };
    }
  }

  return last;
}

async function askSpace(text: string, locale: Lang): Promise<ReplyResult> {
  const problem = (p: Problem): ReplyResult => ({ reply: PROBLEMS[p][locale], mode: 'demo' });
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const auth: Record<string, string> = HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};

  try {
    // 1) on dépose la question : [message, historique interne (null), réflexion forcée (false)]
    const start = await fetch(`${SPACE_URL}/gradio_api/call/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      // Le Space répond à une question à la fois (pas d'historique) : on envoie le dernier message.
      body: JSON.stringify({ data: [text.slice(0, MODEL_MAX_CHARS), null, false] }),
      signal,
      cache: 'no-store',
    });
    if (start.status === 429) return problem('quota');
    if (!start.ok) return problem(start.status >= 500 ? 'sleeping' : 'down');

    const started = (await start.json().catch(() => null)) as { event_id?: unknown } | null;
    if (!started || typeof started.event_id !== 'string') return problem('sleeping'); // page d'attente du Space

    // 2) on attend la réponse
    const stream = await fetch(`${SPACE_URL}/gradio_api/call/chat/${encodeURIComponent(started.event_id)}`, {
      headers: auth,
      signal,
      cache: 'no-store',
    });
    if (!stream.ok) return problem('down');

    const result = parseSse(await stream.text());
    if (!result) return problem('down');
    if (result.event === 'error') return problem(/quota/i.test(result.data) ? 'quota' : 'down');

    const parsed = JSON.parse(result.data) as unknown;
    const reply = Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0].trim() : '';
    return reply ? { reply, mode: 'live' } : problem('down');
  } catch (err) {
    // Délai dépassé : le GPU est très probablement en train de démarrer.
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return problem(timedOut ? 'sleeping' : 'down');
  }
}

// --------------------------------------------------------------------------- démonstration (repli local)

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
    fr: 'Avec plaisir. C\'est d\'autant plus facile que je ne fatigue pas.',
    en: "My pleasure. It's easy, since I don't get tired.",
  },
  {
    test: /\b(ca va|comment vas[- ]?tu|how are you)\b/,
    fr: "Très bien, merci. Ma principale occupation du moment est d'attendre la fin de mon entraînement.",
    en: 'Very well, thank you. My main occupation at the moment is waiting for my training to finish.',
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

  if (SPACE_URL && last?.content.trim()) {
    return askSpace(last.content.trim(), locale);
  }

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
