'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/admin/projects', label: 'Projets' },
  { href: '/admin/journal', label: 'Journal' },
  { href: '/admin/roadmap', label: 'Roadmap' },
  { href: '/admin/team', label: 'Équipe' },
];

export default function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-mist">
      <aside className="flex flex-col border-r border-line bg-paper p-4">
        <Link href="/admin/projects" className="mb-8 flex items-center gap-2 px-2 text-[0.9rem] font-semibold">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-ink text-[0.65rem] text-paper">
            N
          </span>
          Nova Studio
        </Link>

        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-2.5 py-2 text-[0.87rem] transition-colors ${
                  active ? 'bg-ink text-paper' : 'text-muted hover:bg-mist hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-line pt-4">
          <div className="mb-2 flex items-center gap-2 px-2 text-[0.8rem]">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent-soft text-[0.7rem] font-semibold text-accent">
              {email.charAt(0).toUpperCase()}
            </div>
            <div className="truncate text-muted">{email}</div>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg px-2.5 py-2 text-left text-[0.85rem] text-muted transition-colors hover:bg-mist hover:text-ink"
          >
            Se déconnecter
          </button>
          <Link
            href="/fr"
            className="mt-1 block rounded-lg px-2.5 py-2 text-[0.85rem] text-muted transition-colors hover:bg-mist hover:text-ink"
          >
            ← Retour au site
          </Link>
        </div>
      </aside>

      <main className="overflow-y-auto p-10">{children}</main>
    </div>
  );
}
