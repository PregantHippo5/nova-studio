import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

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
      .select('group_id')
      .eq('user_id', userId);

    if (mErr) {
      console.error('Erreur group_members:', mErr);
      return Response.json(
        { error: mErr.message },
        { status: 500 }
      );
    }

    const groupIds = memberships.map((m) => m.group_id);

    if (groupIds.length === 0) {
      return Response.json([]);
    }

    const { data: groups, error: gErr } = await supabaseAdmin
      .from('groups')
      .select('id, name, invite_code')
      .in('id', groupIds);

    if (gErr) {
      console.error('Erreur groups:', gErr);
      return Response.json(
        { error: gErr.message },
        { status: 500 }
      );
    }

    const { data: allMembers, error: memErr } = await supabaseAdmin
      .from('group_members')
      .select('group_id, user_id, user_name')
      .in('group_id', groupIds);

    if (memErr) {
      console.error('Erreur group_members membres:', memErr);
      return Response.json(
        { error: memErr.message },
        { status: 500 }
      );
    }

    return Response.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        inviteCode: g.invite_code,
        members: allMembers
          .filter((m) => m.group_id === g.id)
          .map((m) => ({
            userId: m.user_id,
            userName: m.user_name,
          })),
      }))
    );
  } catch (err) {
    console.error('Erreur GET /api/groups/mine/[userId]:', err);

    return Response.json(
      { error: err?.message || 'Erreur serveur inconnue' },
      { status: 500 }
    );
  }
}