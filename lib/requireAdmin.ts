import { createClient } from '@/lib/supabase/server';

export interface AdminCheckResult {
  user: { id: string; email: string | null } | null;
  isAdmin: boolean;
}

export async function requireAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isAdmin: false };
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user: { id: user.id, email: user.email ?? null },
    isAdmin: !!admin,
  };
}