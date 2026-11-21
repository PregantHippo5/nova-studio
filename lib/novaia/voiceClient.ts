// lib/novaia/voiceClient.ts
//
// Mode vocal mains libres (navigateur) :
//  - détection de voix (VAD) : on mesure l'énergie du micro ; quand tu parles, on enregistre, quand tu te tais ~1 s, on envoie ;
//  - l'enregistrement est fait en PCM 16 kHz mono puis écrit en WAV : aucun problème de codec, Whisper le lit partout ;
//  - lecture de la réponse par la voix du serveur (Piper), avec repli sur la voix du navigateur.
// Rien n'est envoyé tant que tu ne parles pas, et rien n'est enregistré avant le clic sur « Mode vocal ».
import { chunks, plainForSpeech } from '@/lib/novaia/voice';

const RATE = 16000;
const SILENCE_MS = 1100;
const MIN_SPEECH_MS = 350;
const MAX_SECONDS = 20;
const PRE_ROLL = 0.4 * RATE;

export type Listener = { stop: () => void; pause: () => void; resume: () => void };

function downsample(input: Float32Array, ratio: number): Float32Array {
  if (ratio <= 1.001) return new Float32Array(input);
  const n = Math.floor(input.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * ratio);
    const b = Math.min(input.length, Math.floor((i + 1) * ratio));
    let s = 0;
    for (let j = a; j < b; j++) s += input[j];
    out[i] = s / Math.max(1, b - a);
  }
  return out;
}

export function wavDataUrl(chunksIn: Float32Array[], total: number): string {
  const pcm = new Int16Array(total);
  let o = 0;
  for (const c of chunksIn)
    for (let i = 0; i < c.length; i++) {
      const v = Math.max(-1, Math.min(1, c[i]));
      pcm[o++] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const dv = new DataView(buf);
  const w = (off: number, s: string) => [...s].forEach((ch, i) => dv.setUint8(off + i, ch.charCodeAt(0)));
  w(0, 'RIFF');
  dv.setUint32(4, 36 + pcm.length * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, RATE, true);
  dv.setUint32(28, RATE * 2, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  w(36, 'data');
  dv.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return 'data:audio/wav;base64,' + btoa(bin);
}

export async function startListener(opts: {
  onSpeechStart?: () => void;
  onUtterance: (wav: string) => void;
}): Promise<Listener> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(2048, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  src.connect(proc);
  proc.connect(mute);
  mute.connect(ctx.destination);
  const ratio = ctx.sampleRate / RATE;

  let paused = false;
  let speaking = false;
  let voicedRun = 0;
  let noise = 0.008;
  let pre: Float32Array[] = [];
  let preN = 0;
  let utter: Float32Array[] = [];
  let utterN = 0;
  let startedAt = 0;
  let lastVoice = 0;

  const reset = () => {
    speaking = false;
    voicedRun = 0;
    pre = [];
    preN = 0;
    utter = [];
    utterN = 0;
  };

  proc.onaudioprocess = (e) => {
    if (paused) return;
    const ds = downsample(e.inputBuffer.getChannelData(0), ratio);
    let sum = 0;
    for (let i = 0; i < ds.length; i++) sum += ds[i] * ds[i];
    const rms = Math.sqrt(sum / Math.max(1, ds.length));
    const now = performance.now();
    const voiced = rms > Math.max(0.02, noise * 3.5);

    if (!speaking) {
      pre.push(ds);
      preN += ds.length;
      while (preN > PRE_ROLL && pre.length > 1) preN -= (pre.shift() as Float32Array).length;
      if (voiced) voicedRun++;
      else {
        voicedRun = 0;
        noise = noise * 0.97 + rms * 0.03; // bruit de fond estimé quand personne ne parle
      }
      if (voicedRun >= 3) {
        speaking = true;
        utter = [...pre];
        utterN = preN;
        startedAt = now;
        lastVoice = now;
        opts.onSpeechStart?.();
      }
      return;
    }

    utter.push(ds);
    utterN += ds.length;
    if (voiced) lastVoice = now;
    if (now - lastVoice > SILENCE_MS || utterN > RATE * MAX_SECONDS) {
      const spokenMs = lastVoice - startedAt;
      const wav = spokenMs >= MIN_SPEECH_MS ? wavDataUrl(utter, utterN) : null;
      reset();
      if (wav) opts.onUtterance(wav);
    }
  };

  return {
    pause: () => {
      paused = true;
      reset();
    },
    resume: () => {
      reset();
      paused = false;
    },
    stop: () => {
      paused = true;
      proc.onaudioprocess = null;
      try {
        proc.disconnect();
        src.disconnect();
        mute.disconnect();
      } catch {
        /* déjà déconnecté */
      }
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close().catch(() => undefined);
    },
  };
}

// ----------------------------------------------------------------------------------------------- lecture (voix du serveur)

let audioEl: HTMLAudioElement | null = null;
let ttsToken = 0;
const SILENCE_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

/** À appeler dans un clic : débloque la lecture audio (iOS / Chrome n'autorisent le son qu'après un geste). */
export function unlockAudio(): void {
  if (!audioEl) audioEl = new Audio();
  audioEl.src = SILENCE_WAV;
  void audioEl.play().catch(() => undefined);
}

export function stopServerTts(): void {
  ttsToken++;
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute('src');
  }
}

async function fetchChunk(text: string, lang: 'fr' | 'en'): Promise<string | null> {
  try {
    const r = await fetch('/api/novaia/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
      body: JSON.stringify({ text, locale: lang }),
    });
    if (!r.ok) return null;
    const d = (await r.json().catch(() => null)) as { audio?: unknown } | null;
    return d && typeof d.audio === 'string' && d.audio.startsWith('data:audio/') ? d.audio : null;
  } catch {
    return null;
  }
}

/** Lit la réponse avec la voix du serveur. Retourne false si impossible dès le début (l'appelant se replie sur la voix du navigateur). */
export async function playServerTts(markdown: string, lang: 'fr' | 'en', onEnd: () => void): Promise<boolean> {
  const parts = chunks(plainForSpeech(markdown)).flatMap((c) => (c.length > 380 ? (c.match(/.{1,380}(\s|$)/g) ?? [c]) : [c])).slice(0, 12);
  if (parts.length === 0) {
    onEnd();
    return true;
  }
  stopServerTts();
  const mine = ttsToken;
  if (!audioEl) audioEl = new Audio();
  const el = audioEl;
  const pending: Promise<string | null>[] = [];
  const get = (i: number) => (pending[i] ??= fetchChunk(parts[i], lang));
  const first = await get(0);
  if (mine !== ttsToken) return true; // interrompu pendant l'attente
  if (!first) return false;
  const playUrl = (url: string) =>
    new Promise<boolean>((resolve) => {
      el.onended = () => resolve(true);
      el.onerror = () => resolve(false);
      el.src = url;
      el.play().catch(() => resolve(false));
    });
  void (async () => {
    for (let i = 0; i < parts.length; i++) {
      if (mine !== ttsToken) return;
      const url = i === 0 ? first : await get(i);
      if (mine !== ttsToken) return;
      if (!url) break;
      if (i + 1 < parts.length) void get(i + 1); // on prépare la suite pendant qu'on parle
      const ok = await playUrl(url);
      if (!ok) break;
    }
    if (mine === ttsToken) onEnd();
  })();
  return true;
}
