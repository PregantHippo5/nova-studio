import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, isAdmin } = await requireAdmin();

  if (!user || !isAdmin) {
    return Response.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('training_jobs')
    .select(
      'id, status, dataset, epochs, batch_size, gradient_accumulation, learning_rate, checkpoint_interval, resume, resume_checkpoint, lora_repo, lora_path, current_step, current_loss, kaggle_run_url, error_message, train_runtime_seconds, created_at, started_at, finished_at'
    )
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const jobs = data ?? [];
  const active =
    jobs.find((j) => j.status === 'queued' || j.status === 'starting' || j.status === 'running') ??
    null;

  return Response.json({ jobs, activeJobId: active ? active.id : null });
}
