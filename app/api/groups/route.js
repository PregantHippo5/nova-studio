import { supabaseAdmin } from '../../../lib/supabaseAdmin';

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans caractères ambigus (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { userId, userName, name } = body;
  if (!userId || !name) {
    return Response.json({ error: 'userId et name sont requis.' }, { status: 400 });
  }

  let inviteCode, group, insertErr;
  // Boucle courte en cas de collision (très rare avec 6 caractères sur 31^6 combinaisons).
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

  const { error: memberErr } = await supabaseAdmin
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, user_name: userName || 'Anonyme' });
  if (memberErr) return Response.json({ error: memberErr.message }, { status: 500 });

  return Response.json({ id: group.id, name: group.name, inviteCode: group.invite_code });
}
