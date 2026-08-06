import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export async function POST(request, { params }) {
  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const { userId } = body;
  if (!userId) return Response.json({ error: 'userId requis.' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('group_members')
    .delete()
    .eq('group_id', id)
    .eq('user_id', userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
