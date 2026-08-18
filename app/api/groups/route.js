import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getVerifiedUserId } from '../../../lib/verifyUser';

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(request) {
  const userId = await getVerifiedUserId(request);
  if (!userId) {
    return Response.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { userName, name } = body;
  if (!name) {
    return Response.json({ error: 'name est requis.' }, { status: 400 });
  }

  let inviteCode, group, insertErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    inviteCode = generateInviteCode();
    const res = await supabaseAdmin
      .from('groups')
      .insert({ name, invite_code: inviteCode })
      .select()
      .single();
    if (!res.error) { group = res.data; insertErr = null; break; }
    insertErr = res.error;
    if (!/duplicate|unique/i.test(res.error.message)) break;
  }
  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  const { data: member, error: memberErr } = await supabaseAdmin
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: userId,
      user_name: userName || 'Anonyme'
    })
    .select('group_id, user_id, user_name')
    .single();

  if (memberErr) {
    return Response.json({ error: memberErr.message }, { status: 500 });
  }

  return Response.json({
    id: group.id,
    name: group.name,
    inviteCode: group.invite_code,
    member
  });
}