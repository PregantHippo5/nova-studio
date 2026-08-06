import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin';

export async function DELETE(request, { params }) {
  const { id, docId } = params;
  const body = await request.json().catch(() => ({}));
  const { userId } = body;
  if (!userId) return Response.json({ error: 'userId requis.' }, { status: 400 });

  // Seul l'auteur de la fiche peut la retirer.
  const { error } = await supabaseAdmin
    .from('group_docs')
    .delete()
    .eq('group_id', id)
    .eq('id', docId)
    .eq('user_id', userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
