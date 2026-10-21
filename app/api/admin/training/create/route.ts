// app/api/admin/training/create/route.ts
//
// Crée un nouveau training_job (status: queued). Ne parle PAS à Kaggle
// ici — ça, c'est le rôle de /launch.
//
// Validation stricte : toute valeur hors bornes est refusée (400).
// Le dataset doit faire partie de la liste autorisée (lib/training/datasets.ts).
// La destination du LoRA (repo + dossier) est verrouillée côté serveur :
// ce que le navigateur envoie pour ces champs est ignoré.

import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { listNovaiaCheckpoints } from '@/lib/huggingface/checkpoints';
import { DEFAULT_DATASET, isAllowedDataset } from '@/lib/training/datasets';

const LOCKED_LORA_REPO = 'novastudio123/novaia-checkpoints';
const LOCKED_LORA_PATH = 'nova-lora';

const LIMITS = {
  epochs: { min: 1, max: 10 },
  batch_size: { min: 1, max: 4 },
  gradient_accumulation: { min: 1, max: 64 },
  learning_rate: { min: 1e-6, max: 5e-4 },
  checkpoint_interval: { min: 50, max: 1000 },
};

interface CreateJobBody {
  dataset?: unknown;
  epochs?: unknown;
  batch_size?: unknown;
  gradient_accumulation?: unknown;
  learning_rate?: unknown;
  checkpoint_interval?: unknown;
  resume?: unknown;
  resume_checkpoint?: unknown;
}

function readInt(
  value: unknown,
  name: keyof typeof LIMITS,
  fallback: number | null
): { ok: true; value: number } | { ok: false; error: string } {
  const { min, max } = LIMITS[name];
  const v = value === undefined || value === null ? fallback : value;

  if (v === null) {
    return { ok: false, error: `'${name}' est requis.` };
  }

  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    return { ok: false, error: `'${name}' doit être un entier entre ${min} et ${max}.` };
  }

  return { ok: true, value: v };
}

export async function POST(request: Request) {
  const { user, isAdmin } = await requireAdmin();

  if (!user || !isAdmin) {
    return Response.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  let body: CreateJobBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const dataset = body.dataset === undefined || body.dataset === null ? DEFAULT_DATASET : body.dataset;
  if (!isAllowedDataset(dataset)) {
    return Response.json({ error: "'dataset' n'est pas dans la liste des datasets autorisés." }, { status: 400 });
  }

  const epochs = readInt(body.epochs, 'epochs', null);
  if (!epochs.ok) return Response.json({ error: epochs.error }, { status: 400 });

  const batchSize = readInt(body.batch_size, 'batch_size', 1);
  if (!batchSize.ok) return Response.json({ error: batchSize.error }, { status: 400 });

  const gradAcc = readInt(body.gradient_accumulation, 'gradient_accumulation', 8);
  if (!gradAcc.ok) return Response.json({ error: gradAcc.error }, { status: 400 });

  const ckptInterval = readInt(body.checkpoint_interval, 'checkpoint_interval', 250);
  if (!ckptInterval.ok) return Response.json({ error: ckptInterval.error }, { status: 400 });

  const lrRaw = body.learning_rate === undefined || body.learning_rate === null ? 0.0001 : body.learning_rate;
  if (
    typeof lrRaw !== 'number' ||
    !Number.isFinite(lrRaw) ||
    lrRaw < LIMITS.learning_rate.min ||
    lrRaw > LIMITS.learning_rate.max
  ) {
    return Response.json(
      {
        error: `'learning_rate' doit être un nombre entre ${LIMITS.learning_rate.min} et ${LIMITS.learning_rate.max}.`,
      },
      { status: 400 }
    );
  }

  const resume = body.resume === undefined || body.resume === null ? false : body.resume;
  if (typeof resume !== 'boolean') {
    return Response.json({ error: "'resume' doit être un booléen." }, { status: 400 });
  }

  let resumeCheckpoint: string | null = null;

  if (resume) {
    const raw = body.resume_checkpoint;

    if (typeof raw !== 'string' || !/^checkpoint-\d+$/.test(raw)) {
      return Response.json(
        { error: "'resume_checkpoint' est requis (ex. 'checkpoint-1725') quand 'resume' est actif." },
        { status: 400 }
      );
    }

    // Le checkpoint doit réellement exister sur Hugging Face.
    try {
      const existing = await listNovaiaCheckpoints();
      if (!existing.some((c) => c.name === raw)) {
        return Response.json(
          { error: `Le checkpoint '${raw}' est introuvable sur Hugging Face.` },
          { status: 400 }
        );
      }
    } catch (e) {
      return Response.json(
        {
          error: 'Impossible de vérifier le checkpoint sur Hugging Face.',
          detail: e instanceof Error ? e.message : String(e),
        },
        { status: 502 }
      );
    }

    resumeCheckpoint = raw;
  }

  const { data, error } = await supabaseAdmin
    .from('training_jobs')
    .insert({
      created_by: user.id,
      dataset,
      epochs: epochs.value,
      batch_size: batchSize.value,
      gradient_accumulation: gradAcc.value,
      learning_rate: lrRaw,
      checkpoint_interval: ckptInterval.value,
      resume,
      resume_checkpoint: resumeCheckpoint,
      lora_repo: LOCKED_LORA_REPO,
      lora_path: LOCKED_LORA_PATH,
    })
    .select('id, status')
    .single();

  if (error) {
    // Cas attendu : la contrainte unique training_jobs_one_active
    // (un job queued/starting/running existe déjà).
    if (error.code === '23505') {
      return Response.json(
        { error: "Un training est déjà en cours ou en attente. Attendez sa fin avant d'en créer un autre." },
        { status: 409 }
      );
    }

    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ job: data }, { status: 201 });
}
