// Route TEMPORAIRE de diagnostic — à supprimer une fois le bug des groupes résolu.
// Ne révèle rien de sensible (pas de clé secrète affichée).
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = '99ad38ed-5e75-4e6c-911f-27e384d27b9f';

  const { data: filtered, error: filteredErr } = await supabaseAdmin
    .from('group_members')
    .select('group_id, user_id')
    .eq('user_id', userId);

  // Sans filtre du tout — pour voir si le serveur voit la table ne serait-ce qu'un peu.
  const { data: unfiltered, error: unfilteredErr } = await supabaseAdmin
    .from('group_members')
    .select('group_id, user_id')
    .limit(10);

  const adminTest = await supabaseAdmin.auth.admin.listUsers();

  return Response.json({
    supabaseUrlUtilisee: process.env.NEXT_PUBLIC_SUPABASE_URL,
    resultatAvecFiltre: filtered,
    erreurAvecFiltre: filteredErr ? filteredErr.message : null,
    resultatSansFiltre: unfiltered,
    erreurSansFiltre: unfilteredErr ? unfilteredErr.message : null,
    cleEstVraimentServiceRole: !adminTest.error,
  });
}
