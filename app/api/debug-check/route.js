// Route TEMPORAIRE de diagnostic — à supprimer une fois le bug des groupes résolu.
// Ne révèle rien de sensible (pas de clé secrète affichée).
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = '99ad38ed-5e75-4e6c-911f-27e384d27b9f';
  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  // Seule une VRAIE clé service_role peut appeler cette API admin — si ça échoue,
  // la clé configurée n'est pas la bonne (probablement la clé anon collée par erreur).
  const adminTest = await supabaseAdmin.auth.admin.listUsers();

  return Response.json({
    supabaseUrlUtilisee: process.env.NEXT_PUBLIC_SUPABASE_URL,
    resultatRequete: data,
    erreurEventuelle: error ? error.message : null,
    cleEstVraimentServiceRole: !adminTest.error,
    erreurTestAdmin: adminTest.error ? adminTest.error.message : null,
  });
}
