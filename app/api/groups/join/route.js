import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { userId, userName, inviteCode } = body;
  if (!userId || !inviteCode) {
    return Response.json({ error: 'userId et inviteCode sont requis.' }, { status: 400 });
  }

  const { data: group, error: gErr } = await supabaseAdmin
    .from('groups')
    .select('id, name, invite_code')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .maybeSingle();
  if (gErr) return Response.json({ error: gErr.message }, { status: 500 });
  if (!group) return Response.json({ error: "Code d'invitation invalide." }, { status: 404 });

  const { error: memberErr } = await supabaseAdmin
    .from('group_members')
    .upsert({ group_id: group.id, user_id: userId, user_name: userName || 'Anonyme' });
  if (memberErr) return Response.json({ error: memberErr.message }, { status: 500 });

  return Response.json({ id: group.id, name: group.name, inviteCode: group.invite_code });
}
