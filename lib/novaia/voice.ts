// lib/novaia/voice.ts
//
// Voix de NovaIA, 100 % dans le navigateur (Web Speech API) : gratuit, aucun serveur, rien n'est envoyé par NOUS.
// Attention : selon le navigateur, la dictée peut passer par le service de reconnaissance vocale de l'éditeur
// (Chrome : Google). C'est dit dans la page de confidentialité.
//  - dictée : micro -> texte dans la zone de saisie ;
//  - lecture : texte de la réponse lu à voix haute (code et sources ignorés).

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function dictationSupported(): boolean {
  return recognitionCtor() !== null;
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

const LANG_TAG = { fr: 'fr-FR', en: 'en-US' } as const;

/** Lance la dictée. Retourne une fonction d'arrêt, ou null si le navigateur ne sait pas faire. */
export function startDictation(
  lang: 'fr' | 'en',
  onText: (transcript: string) => void,
  onEnd: (error?: string) => void
): (() => void) | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = LANG_TAG[lang];
  rec.continuous = false;
  rec.interimResults = true;
  let error: string | undefined;
  rec.onresult = (e) => {
    let t = '';
    for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
    onText(t.trim());
  };
  rec.onerror = (e) => {
    error = e.error;
  };
  rec.onend = () => onEnd(error && error !== 'no-speech' && error !== 'aborted' ? error : undefined);
  try {
    rec.start();
  } catch {
    return null;
  }
  return () => {
    try {
      rec.stop();
    } catch {
      /* déjà arrêtée */
    }
  };
}

/** Texte « parlable » : pas de code, pas de liens, pas de bloc de sources, pas de symboles markdown. */
export function plainForSpeech(md: string): string {
  return md
    .split(/\n\s*(?:Sources consultées|Sources consulted)/)[0]
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/[*_>#~|]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/[✓⚠️~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function chunks(text: string): string[] {
  // Chrome coupe les longues lectures : on envoie des phrases courtes les unes après les autres.
  const parts = text.match(/[^.!?;:\n]+[.!?;:]?\s*/g) ?? [text];
  const out: string[] = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > 180 && cur) {
      out.push(cur.trim());
      cur = p;
    } else cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.slice(0, 40);
}

let token = 0;

export function stopSpeaking(): void {
  token++;
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/** Lit le texte à voix haute. onEnd est appelé à la fin ou si la lecture est interrompue. */
export function speak(markdown: string, lang: 'fr' | 'en', onEnd: () => void): void {
  if (!ttsSupported()) {
    onEnd();
    return;
  }
  stopSpeaking();
  const mine = token;
  const list = chunks(plainForSpeech(markdown));
  if (list.length === 0) {
    onEnd();
    return;
  }
  const tag = LANG_TAG[lang];
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang === tag) ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang));
  let i = 0;
  const next = () => {
    if (mine !== token) return onEnd();
    if (i >= list.length) return onEnd();
    const u = new SpeechSynthesisUtterance(list[i++]);
    u.lang = tag;
    if (voice) u.voice = voice;
    u.rate = 1;
    u.onend = next;
    u.onerror = () => onEnd();
    window.speechSynthesis.speak(u);
  };
  next();
}
