import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

// Empêche Vercel de mettre cette route en cache — sinon une réponse vide
// (ex: le tout premier appel, avant que des groupes existent) resterait
// servie indéfiniment même après ajout de données.
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { userId } = params;

  const { data: memberships, error: mErr } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  const groupIds = memberships.map((m) => m.group_id);
  if (groupIds.length === 0) return Response.json([]);

  const { data: groups, error: gErr } = await supabaseAdmin
    .from('groups')
    .select('id, name, invite_code')
    .in('id', groupIds);
  if (gErr) return Response.json({ error: gErr.message }, { status: 500 });

  // Le client attend un tableau "members" par groupe (au moins pour son .length) —
  // on récupère tous les membres de tous ces groupes en une seule requête.
  const { data: allMembers, error: memErr } = await supabaseAdmin
    .from('group_members')
    .select('group_id, user_id, user_name')
    .in('group_id', groupIds);
  if (memErr) return Response.json({ error: memErr.message }, { status: 500 });

  return Response.json(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      inviteCode: g.invite_code,
      members: allMembers
        .filter((m) => m.group_id === g.id)
        .map((m) => ({ userId: m.user_id, userName: m.user_name })),
    }))
  );
}
