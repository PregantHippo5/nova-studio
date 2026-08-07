import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

// Empêche Vercel de mettre cette route en cache — sinon une réponse vide
// (ex: le tout premier appel, avant que des groupes existent) resterait
// servie indéfiniment même après ajout de données.
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const since = Number(searchParams.get('since') || 0);

  const { data, error } = await supabaseAdmin
    .from('group_messages')
    .select('id, user_id, user_name, text, attachment, ts')
    .eq('group_id', id)
    .gt('ts', since)
    .order('ts', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(
    data.map((m) => ({ id: m.id, userId: m.user_id, userName: m.user_name, text: m.text, attachment: m.attachment, ts: m.ts }))
  );
}

export async function POST(request, { params }) {
  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const { userId, userName, text, attachment } = body;
  if (!userId || !text) return Response.json({ error: 'userId et text sont requis.' }, { status: 400 });

  const ts = Date.now();
  const { error } = await supabaseAdmin.from('group_messages').insert({
    group_id: id, user_id: userId, user_name: userName || 'Anonyme', text, attachment: attachment || null, ts,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, ts });
}
