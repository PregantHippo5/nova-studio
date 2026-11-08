// lib/training/datasets.ts
//
// Liste des datasets d'entraînement autorisés. Source unique de vérité :
// utilisée par la route /api/admin/training/create (validation côté serveur)
// et par la page NovaIA Training (liste déroulante). Aucun secret ici.
//
// Pour ajouter un dataset : 1) ajouter le fichier .jsonl au dataset Kaggle
// 'new-good', 2) l'ajouter ici, 3) l'ajouter à la contrainte SQL
// training_jobs_dataset_allowed.

export const TRAINING_DATASETS = [
  {
    id: 'novaia_qa_5000_v3.jsonl',
    label: 'novaia_qa_5000_v3 — personnalité NovaIA (4 597 exemples)',
  },
  {
    id: 'novaia_mix_v1.jsonl',
    label: 'novaia_mix_v1 — personnalité + Wikipedia (12 597 exemples)',
  },
  {
    id: 'novaia_v2_qwen3.jsonl',
    label: 'NovaIA v2 — Qwen3-8B : mémoire de conversation + raisonnement (script v2)',
  },
] as const;

// Entraînement v2 : autre modèle (Qwen3-8B), autre script (kaggle-scripts/train_novaia_v2.py).
// Il lit ses fichiers (perso_train.jsonl, questions_v3.jsonl, logique_distille.jsonl) dans le dataset Kaggle 'new-good',
// et dépose l'adaptateur dans {lora_repo}/v2-qwen3/ : il ne touche jamais à nova-lora/ ni aux checkpoints de l'ancien run.
export const V2_DATASET_ID = 'novaia_v2_qwen3.jsonl';

export type TrainingDatasetId = (typeof TRAINING_DATASETS)[number]['id'];

export const DEFAULT_DATASET: TrainingDatasetId = 'novaia_qa_5000_v3.jsonl';

export function isAllowedDataset(value: unknown): value is TrainingDatasetId {
  return typeof value === 'string' && TRAINING_DATASETS.some((d) => d.id === value);
}
