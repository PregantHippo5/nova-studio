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

  return Response.json({
    supabaseUrlUtilisee: process.env.NEXT_PUBLIC_SUPABASE_URL,
    resultatRequete: data,
    erreurEventuelle: error ? error.message : null,
  });
}
