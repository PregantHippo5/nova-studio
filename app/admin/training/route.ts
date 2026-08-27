// app/api/admin/training/launch/route.ts
//
// Déclenche réellement un training Kaggle pour un job existant
// (status: queued). Lit kaggle-scripts/train_novaia.py depuis le repo
// (option A validée), injecte la config, pousse vers Kaggle, et
// persiste le kernelId retourné dans kaggle_kernel_registry pour que
// les prochains push ciblent le MÊME kernel (sinon 409 ALREADY_EXISTS,
// cf. tests manuels).

import { promises as fs } from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  pushTrainingKernel,
  NOVAIA_KERNEL_OWNER,
  type TrainingConfig,
} from '@/lib/kaggle/client';

interface LaunchBody {
  jobId: string;
}

interface TrainingJobRow {
  id: string;
  status: string;
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
}

function parseKernelSlugFromRef(ref: string): string {
  const segments = ref.split('/').filter(Boolean);
  return segments[segments.length - 1];
}

export async function POST(request: Request) {
  const { user, isAdmin } = await requireAdmin();

  if (!user || !isAdmin) {
    return Response.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  let body: LaunchBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  if (!body.jobId) {
    return Response.json({ error: "'jobId' est requis." }, { status: 400 });
  }

  const apiToken = process.env.KAGGLE_API_TOKEN;

  if (!apiToken) {
    return Response.json(
      { error: "KAGGLE_API_TOKEN manquant côté serveur (variable d'environnement Vercel)." },
      { status: 500 }
    );
  }

  const { data: job, error: jobError } = await supabaseAdmin
    .from('training_jobs')
    .select(
      'id, status, dataset, epochs, batch_size, gradient_accumulation, learning_rate, checkpoint_interval, resume, resume_checkpoint, lora_repo, lora_path'
    )
    .eq('id', body.jobId)
    .maybeSingle<TrainingJobRow>();

  if (jobError) {
    return Response.json({ error: jobError.message }, { status: 500 });
  }

  if (!job) {
    return Response.json({ error: 'Job introuvable.' }, { status: 404 });
  }

  if (job.status !== 'queued') {
    return Response.json(
      { error: `Le job est en statut '${job.status}', seul un job 'queued' peut être lancé.` },
      { status: 409 }
    );
  }

  const { data: registry } = await supabaseAdmin
    .from('kaggle_kernel_registry')
    .select('kernel_id')
    .eq('id', 1)
    .maybeSingle<{ kernel_id: number | null }>();

  const existingKernelId = registry?.kernel_id ?? null;

  let scriptSource: string;

  try {
    const scriptPath = path.join(process.cwd(), 'kaggle-scripts', 'train_novaia.py');
    scriptSource = await fs.readFile(scriptPath, 'utf-8');
  } catch (e) {
    return Response.json(
      {
        error:
          "Impossible de lire kaggle-scripts/train_novaia.py. Vérifie qu'il est bien présent dans le repo déployé.",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  const config: TrainingConfig = {
    dataset: job.dataset,
    epochs: job.epochs,
    batch_size: job.batch_size,
    gradient_accumulation: job.gradient_accumulation,
    learning_rate: job.learning_rate,
    checkpoint_interval: job.checkpoint_interval,
    resume: job.resume,
    resume_checkpoint: job.resume_checkpoint,
    lora_repo: job.lora_repo,
    lora_path: job.lora_path,
  };

  let pushResult;

  try {
    pushResult = await pushTrainingKernel(
      { apiToken },
      scriptSource,
      config,
      existingKernelId
    );
  } catch (e) {
    return Response.json(
      { error: 'Échec du push Kaggle.', detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  const kernelSlug = parseKernelSlugFromRef(pushResult.ref);

  const { error: registryError } = await supabaseAdmin
    .from('kaggle_kernel_registry')
    .upsert(
      {
        id: 1,
        kernel_id: pushResult.kernelId,
        kernel_owner: NOVAIA_KERNEL_OWNER,
        kernel_slug: kernelSlug,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (registryError) {
    return Response.json(
      {
        warning:
          'Push Kaggle réussi mais échec de sauvegarde du kernelId. Le prochain lancement pourrait créer un kernel séparé.',
        detail: registryError.message,
        kaggle: pushResult,
      },
      { status: 207 }
    );
  }

  const { data: updatedJob, error: updateError } = await supabaseAdmin
    .from('training_jobs')
    .update({
      status: 'starting',
      kaggle_kernel_ref: `${NOVAIA_KERNEL_OWNER}/${kernelSlug}`,
      kaggle_run_url: pushResult.url,
      started_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .select('id, status, kaggle_kernel_ref, kaggle_run_url, started_at')
    .single();

  if (updateError) {
    return Response.json(
      {
        warning: 'Push Kaggle réussi mais échec de mise à jour du job en base.',
        detail: updateError.message,
        kaggle: pushResult,
      },
      { status: 207 }
    );
  }

  return Response.json({ job: updatedJob, kaggle: pushResult });
}