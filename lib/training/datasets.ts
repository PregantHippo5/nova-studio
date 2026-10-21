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
] as const;

export type TrainingDatasetId = (typeof TRAINING_DATASETS)[number]['id'];

export const DEFAULT_DATASET: TrainingDatasetId = 'novaia_qa_5000_v3.jsonl';

export function isAllowedDataset(value: unknown): value is TrainingDatasetId {
  return typeof value === 'string' && TRAINING_DATASETS.some((d) => d.id === value);
}
