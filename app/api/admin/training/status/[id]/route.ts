import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getTrainingKernelStatus, NOVAIA_KERNEL_OWNER } from '@/lib/kaggle/client';

export const dynamic = 'force-dynamic';

// Un job qui vient d'être lancé : Kaggle peut encore répondre avec le statut
// de la version précédente du kernel. On ignore donc les états terminaux
// pendant les 90 premières secondes.
const TERMINAL_GRACE_MS = 90_000;

const JOB_COLUMNS =
  'id, status, dataset, epochs, batch_size, gradient_accumulation, learning_rate, checkpoint_interval, resume, resume_checkpoint, lora_repo, lora_path, current_step, current_loss, kaggle_kernel_ref, kaggle_run_url, error_message, train_runtime_seconds, created_at, started_at, finished_at';

interface JobRow {
  id: string;
  status: string;
  kaggle_kernel_ref: string | null;
  started_at: string | null;
  [key: string]: unknown;
}

function parseRef(ref: string | null): { owner: string; slug: string } | null {
  if (!ref) return null;
  const parts = ref.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[parts.length - 2], slug: parts[parts.length - 1] };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, isAdmin } = await requireAdmin();

  if (!user || !isAdmin) {
    return Response.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  const { data: job, error } = await supabaseAdmin
    .from('training_jobs')
    .select(JOB_COLUMNS)
    .eq('id', params.id)
    .maybeSingle<JobRow>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!job) {
    return Response.json({ error: 'Job introuvable.' }, { status: 404 });
  }

  // Seuls les jobs réellement partis chez Kaggle sont interrogés.
  if (job.status !== 'starting' && job.status !== 'running') {
    return Response.json({ job, polled: false });
  }

  const apiToken = process.env.KAGGLE_API_TOKEN;

  if (!apiToken) {
    return Response.json(
      { error: 'KAGGLE_API_TOKEN manquant côté serveur.', job, polled: false },
      { status: 500 }
    );
  }

  const ref = parseRef(job.kaggle_kernel_ref);
  const owner = ref?.owner ?? NOVAIA_KERNEL_OWNER;
  const slug = ref?.slug ?? 'novaia-remote-training';

  let kaggle;

  try {
    kaggle = await getTrainingKernelStatus({ apiToken }, owner, slug);
  } catch (e) {
    // Échec réseau/API : on ne casse pas le job, on renvoie l'état connu.
    return Response.json({
      job,
      polled: false,
      warning: `Statut Kaggle indisponible : ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  const sinceStartMs = job.started_at ? Date.now() - new Date(job.started_at).getTime() : Infinity;
  const isTerminal =
    kaggle.novaiaStatus === 'complete' ||
    kaggle.novaiaStatus === 'failed' ||
    kaggle.novaiaStatus === 'cancelled';

  if (isTerminal && sinceStartMs < TERMINAL_GRACE_MS) {
    return Response.json({
      job,
      polled: true,
      kaggleStatus: kaggle.rawKaggleStatus,
      note: "État terminal ignoré : le job vient d'être lancé (version précédente probable).",
    });
  }

  let patch: Record<string, unknown> | null = null;

  switch (kaggle.novaiaStatus) {
    case 'queued':
      patch = null; // reste 'starting'
      break;
    case 'running':
      if (job.status !== 'running') patch = { status: 'running' };
      break;
    case 'complete':
      patch = {
        status: 'complete',
        finished_at: new Date().toISOString(),
        error_message: null,
      };
      break;
    case 'failed':
      patch = {
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: kaggle.failureMessage || 'Le run Kaggle a échoué (voir les logs Kaggle).',
      };
      break;
    case 'cancelled':
      patch = {
        status: 'cancelled',
        finished_at: new Date().toISOString(),
        error_message: 'Run annulé côté Kaggle.',
      };
      break;
  }

  if (!patch) {
    return Response.json({ job, polled: true, kaggleStatus: kaggle.rawKaggleStatus });
  }

  // Mise à jour conditionnelle : on ne touche pas un job déjà clos entre-temps
  // (par exemple annulé côté Nova Studio pendant cet appel).
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('training_jobs')
    .update(patch)
    .eq('id', job.id)
    .in('status', ['starting', 'running'])
    .select(JOB_COLUMNS)
    .maybeSingle<JobRow>();

  if (updateError) {
    return Response.json({ error: updateError.message, job }, { status: 500 });
  }

  return Response.json({
    job: updated ?? job,
    polled: true,
    kaggleStatus: kaggle.rawKaggleStatus,
  });
}
