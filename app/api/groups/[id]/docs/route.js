import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { getVerifiedUserId } from '../../../../../lib/verifyUser';

// Empêche Vercel de mettre cette route en cache — sinon une réponse vide
// (ex: le tout premier appel, avant que des groupes existent) resterait
// servie indéfiniment même après ajout de données.
export const dynamic = 'force-dynamic';

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
  const userId = await getVerifiedUserId(request);
  if (!userId) return Response.json({ error: 'Non authentifié.' }, { status: 401 });

  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const { userName, title, content } = body;
  if (!title) return Response.json({ error: 'title est requis.' }, { status: 400 });

  const ts = Date.now();
  const { error } = await supabaseAdmin.from('group_docs').insert({
    group_id: id, user_id: userId, user_name: userName || 'Anonyme', title, content: content || '', ts,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, ts });
}