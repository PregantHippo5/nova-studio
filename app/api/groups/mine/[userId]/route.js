import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

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

  return Response.json(groups.map((g) => ({ id: g.id, name: g.name, inviteCode: g.invite_code })));
}
