import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Used in Server Components (read-only cookies) and in Route Handlers / Server
// Actions (where cookies can also be written, e.g. on login/logout).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore as long as the middleware also refreshes the session.
          }
        },
      },
    }
  );
}
