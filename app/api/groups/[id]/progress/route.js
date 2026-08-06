import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export async function GET(request, { params }) {
  const { id } = params;
  const { data, error } = await supabaseAdmin
    .from('group_progress')
    .select('user_id, user_name, stats')
    .eq('group_id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const result = {};
  for (const row of data) {
    result[row.user_id] = { userName: row.user_name, ...row.stats };
  }
  return Response.json(result);
}

export async function POST(request, { params }) {
  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const { userId, userName, stats } = body;
  if (!userId) return Response.json({ error: 'userId requis.' }, { status: 400 });

  const { error } = await supabaseAdmin.from('group_progress').upsert({
    group_id: id, user_id: userId, user_name: userName || 'Anonyme',
    stats: stats || {}, updated_at: new Date().toISOString(),
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
