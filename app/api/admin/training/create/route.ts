// app/api/admin/training/create/route.ts
//
// Crée un nouveau training_job (status: queued). Ne parle PAS à Kaggle
// ici — ça, c'est le rôle de /launch.

import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface CreateJobBody {
  epochs: number;
  batch_size?: number;
  gradient_accumulation?: number;
  learning_rate?: number;
  checkpoint_interval?: number;
  resume?: boolean;
  resume_checkpoint?: string | null;
  lora_repo?: string;
  lora_path?: string;
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

  if (!body.epochs || body.epochs <= 0) {
    return Response.json({ error: "'epochs' est requis et doit être > 0." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('training_jobs')
    .insert({
      created_by: user.id,
      epochs: body.epochs,
      batch_size: body.batch_size ?? 1,
      gradient_accumulation: body.gradient_accumulation ?? 8,
      learning_rate: body.learning_rate ?? 0.0001,
      checkpoint_interval: body.checkpoint_interval ?? 250,
      resume: body.resume ?? false,
      resume_checkpoint: body.resume_checkpoint ?? null,
      lora_repo: body.lora_repo ?? 'novastudio123/novaia-checkpoints',
      lora_path: body.lora_path ?? 'nova-lora',
    })
    .select('id, status')
    .single();

  if (error) {
    if (error.code === '23505') {
      return Response.json(
        { error: 'Un training est déjà en cours ou en attente. Attendez sa fin avant d\'en créer un autre.' },
        { status: 409 }
      );
    }

    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ job: data }, { status: 201 });
}