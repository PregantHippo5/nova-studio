import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const CANCEL_MESSAGE =
  'Training annulé côté Nova Studio. Le run Kaggle peut continuer en arrière-plan.';

// V1 : annulation logique uniquement. Aucun appel à Kaggle
// (pas d'endpoint d'annulation fiable vérifié, pas de DeleteKernel).
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { user, isAdmin } = await requireAdmin();

  if (!user || !isAdmin) {
    return Response.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from('training_jobs')
    .update({
      status: 'cancelled',
      finished_at: new Date().toISOString(),
      error_message: CANCEL_MESSAGE,
    })
    .eq('id', params.id)
    .in('status', ['queued', 'starting', 'running'])
    .select('id, status, finished_at, error_message, kaggle_run_url')
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!updated) {
    return Response.json(
      { error: "Job introuvable ou déjà terminé : rien à annuler." },
      { status: 409 }
    );
  }

  return Response.json({ job: updated, message: CANCEL_MESSAGE });
}
