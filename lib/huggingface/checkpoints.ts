const HF_API_BASE = 'https://huggingface.co/api';
const NOVAIA_LORA_REPO = 'novastudio123/novaia-checkpoints';

export interface HfCheckpoint {
  name: string;
  step: number;
}

interface HfTreeEntry {
  type: 'file' | 'directory';
  path: string;
}

export async function listNovaiaCheckpoints(): Promise<HfCheckpoint[]> {
  const token = process.env.HF_TOKEN;

  if (!token) {
    throw new Error("HF_TOKEN manquant côté serveur (variable d'environnement Vercel).");
  }

  const res = await fetch(`${HF_API_BASE}/models/${NOVAIA_LORA_REPO}/tree/main`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Impossible de lister le repo Hugging Face (HTTP ${res.status}).`);
  }

  const entries: HfTreeEntry[] = await res.json();

  return entries
    .filter((entry) => entry.type === 'directory' && /^checkpoint-\d+$/.test(entry.path))
    .map((entry) => ({
      name: entry.path,
      step: parseInt(entry.path.split('-')[1], 10),
    }))
    .sort((a, b) => b.step - a.step);
}