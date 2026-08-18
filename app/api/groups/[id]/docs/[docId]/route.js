import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin';
import { getVerifiedUserId } from '../../../../../../lib/verifyUser';

export async function DELETE(request, { params }) {
  const userId = await getVerifiedUserId(request);
  if (!userId) return Response.json({ error: 'Non authentifié.' }, { status: 401 });

  const { id, docId } = params;

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