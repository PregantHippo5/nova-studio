import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export async function GET(request, { params }) {
  const { id } = params;
  const { data, error } = await supabaseAdmin
    .from('group_docs')
    .select('id, user_id, user_name, title, content, ts')
    .eq('group_id', id)
    .order('ts', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(
    data.map((d) => ({ id: d.id, userId: d.user_id, userName: d.user_name, title: d.title, content: d.content, ts: d.ts }))
  );
}

export async function POST(request, { params }) {
  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const { userId, userName, title, content } = body;
  if (!userId || !title) return Response.json({ error: 'userId et title sont requis.' }, { status: 400 });

  const ts = Date.now();
  const { error } = await supabaseAdmin.from('group_docs').insert({
    group_id: id, user_id: userId, user_name: userName || 'Anonyme', title, content: content || '', ts,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, ts });
}
