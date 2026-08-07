import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
  try {
    const { userId } = await params;

    if (!userId) {
      return Response.json(
        { error: 'userId manquant' },
        { status: 400 }
      );
    }

    const { data: memberships, error: mErr } = await supabaseAdmin
      .from('group_members')
      .select('group_id, user_id, user_name')
      .eq('user_id', userId);

    if (mErr) {
      return Response.json(
        { error: 'Erreur group_members', details: mErr.message },
        { status: 500 }
      );
    }

    if (!memberships || memberships.length === 0) {
      return Response.json([]);
    }

    const groupIds = memberships.map((m) => m.group_id);

    const { data: groups, error: gErr } = await supabaseAdmin
      .from('groups')
      .select('id, name, invite_code')
      .in('id', groupIds);

    if (gErr) {
      return Response.json(
        { error: 'Erreur groups', details: gErr.message },
        { status: 500 }
      );
    }

    return Response.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        inviteCode: g.invite_code,
        members: memberships
          .filter((m) => m.group_id === g.id)
          .map((m) => ({
            userId: m.user_id,
            userName: m.user_name,
          })),
      }))
    );
  } catch (err) {
    return Response.json(
      {
        error: 'Erreur serveur',
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}