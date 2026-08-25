import { requireAdmin } from '@/lib/requireAdmin';
import { listNovaiaCheckpoints } from '@/lib/huggingface/checkpoints';

export async function GET() {
  const { user, isAdmin } = await requireAdmin();

  if (!user || !isAdmin) {
    return Response.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  try {
    const checkpoints = await listNovaiaCheckpoints();
    return Response.json({ checkpoints });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue.' },
      { status: 500 }
    );
  }
}