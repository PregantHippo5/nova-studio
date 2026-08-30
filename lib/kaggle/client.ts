const KAGGLE_API_BASE = 'https://api.kaggle.com/v1';

export const NOVAIA_KERNEL_OWNER = 'evansaccard';
const NOVAIA_KERNEL_TITLE = 'NovaIA Remote Training';

const CONFIG_MARKER_START = '# ##### NOVAIA_TRAINING_CONFIG_START #####';
const CONFIG_MARKER_END = '# ##### NOVAIA_TRAINING_CONFIG_END #####';

export interface KaggleCredentials {
  apiToken: string;
}

export interface TrainingConfig {
  dataset: string;
  epochs: number;
  batch_size: number;
  gradient_accumulation: number;
  learning_rate: number;
  checkpoint_interval: number;
  resume: boolean;
  resume_checkpoint: string | null;
  lora_repo: string;
  lora_path: string;
  // Nécessaire car un kernel poussé via l'API n'a pas le login HF
  // fait par une cellule notebook séparée (comme sur vos runs manuels).
  // Réutilise le même mécanisme huggingface_hub.login() que vous
  // utilisiez déjà, appelé cette fois depuis train_novaia.py lui-même.
  // ⚠️ Ce token se retrouve dans le code source du kernel Kaggle
  // (privé, mais visible dans l'historique des versions).
  hf_token: string;
}

export interface PushKernelResult {
  ref: string;
  url: string;
  versionNumber: number | null;
  kernelId: number;
}

export type KaggleDerivedStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';

export interface KernelStatusResult {
  novaiaStatus: KaggleDerivedStatus;
  rawKaggleStatus: string;
  failureMessage: string | null;
}

async function callKaggle<TResponse>(
  credentials: KaggleCredentials,
  method: 'SaveKernel' | 'GetKernelSessionStatus',
  body: Record<string, unknown>
): Promise<TResponse> {
  const res = await fetch(`${KAGGLE_API_BASE}/kernels.KernelsApiService/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${credentials.apiToken}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const raw = await res.text();
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`Réponse Kaggle non-JSON (HTTP ${res.status}) : ${raw.slice(0, 300)}`);
  }

  if (!res.ok) {
    const message =
      typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? JSON.stringify((parsed as { error: unknown }).error)
        : `Erreur Kaggle HTTP ${res.status}`;
    throw new Error(message);
  }

  return parsed as TResponse;
}

export function injectTrainingConfig(scriptSource: string, config: TrainingConfig): string {
  const configJson = JSON.stringify(config, null, 2);

  const configBlock = [
    CONFIG_MARKER_START,
    'NOVAIA_TRAINING_CONFIG = r"""',
    configJson,
    '"""',
    CONFIG_MARKER_END,
    '',
  ].join('\n');

  return `${configBlock}\n${scriptSource}`;
}

export async function pushTrainingKernel(
  credentials: KaggleCredentials,
  scriptSource: string,
  config: TrainingConfig,
  existingKernelId: number | null
): Promise<PushKernelResult> {
  const text = injectTrainingConfig(scriptSource, config);

  const body: Record<string, unknown> = {
    newTitle: NOVAIA_KERNEL_TITLE,
    text,
    language: 'python',
    kernelType: 'script',
    isPrivate: true,
    enableGpu: true,
    enableTpu: false,
    enableInternet: true,
    machineShape: 'NvidiaTeslaT4',
    // Dataset attaché explicitement — sans ça, /kaggle/input est vide
    // et resolve_dataset_path() du script échoue (vérifié en conditions
    // réelles : FileNotFoundError sans ce champ, dataset bien monté avec).
    datasetDataSources: ['evansaccard/new-good'],
    competitionDataSources: [],
    kernelDataSources: [],
    modelDataSources: [],
    categoryIds: [],
  };

  if (existingKernelId !== null) {
    body.id = existingKernelId;
  }

  const response = await callKaggle<{
    ref: string;
    url: string;
    versionNumber?: number;
    error?: string;
    kernelId: number;
  }>(credentials, 'SaveKernel', body);

  if (response.error) {
    throw new Error(`Kaggle a refusé le push : ${response.error}`);
  }

  return {
    ref: response.ref,
    url: response.url,
    versionNumber: response.versionNumber ?? null,
    kernelId: response.kernelId,
  };
}

function mapKaggleStatus(status: string): KaggleDerivedStatus {
  switch (status) {
    case 'QUEUED':
    case 'NEW_SCRIPT':
      return 'queued';
    case 'RUNNING':
      return 'running';
    case 'COMPLETE':
      return 'complete';
    case 'ERROR':
      return 'failed';
    case 'CANCEL_REQUESTED':
    case 'CANCEL_ACKNOWLEDGED':
      return 'cancelled';
    default:
      return 'running';
  }
}

export async function getTrainingKernelStatus(
  credentials: KaggleCredentials,
  kernelOwner: string,
  kernelSlug: string
): Promise<KernelStatusResult> {
  const response = await callKaggle<{ status: string; failureMessage?: string }>(
    credentials,
    'GetKernelSessionStatus',
    {
      userName: kernelOwner,
      kernelSlug: kernelSlug,
    }
  );

  return {
    novaiaStatus: mapKaggleStatus(response.status),
    rawKaggleStatus: response.status,
    failureMessage: response.failureMessage ?? null,
  };
}