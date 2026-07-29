'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Container from '@/components/ui/Container';
import ThemeToggle from '@/components/layout/ThemeToggle';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';
import { createClient } from '@/lib/supabase/client';

export default function Navbar({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null | undefined>(undefined); // undefined = loading
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const links = [
    { href: `/${locale}/projects`, label: dict.nav.projects },
    { href: `/${locale}/journal`, label: dict.nav.journal },
    { href: `/${locale}/roadmap`, label: dict.nav.roadmap },
    { href: `/${locale}/support`, label: dict.nav.support },
    { href: `/${locale}/about`, label: dict.nav.about },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ease-smooth ${
        scrolled ? 'border-line bg-paper/80 backdrop-blur-md' : 'border-transparent bg-paper/0'
      }`}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-paper text-[0.7rem]">
            N
          </span>
          Nova Studio
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-[0.9rem] transition-colors duration-200 ${
                  active ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {link.label}
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute -bottom-[19px] left-0 right-0 h-px bg-ink"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {email === undefined ? null : email ? (
            <>
              <Link
                href={`/${locale}/account`}
                className="text-[0.9rem] text-muted transition-colors duration-200 hover:text-ink"
              >
                {locale === 'fr' ? 'Mon compte' : 'Account'}
              </Link>
              <button
                onClick={handleLogout}
                className="text-[0.9rem] text-muted transition-colors duration-200 hover:text-ink"
              >
                {locale === 'fr' ? 'Se déconnecter' : 'Log out'}
              </button>
            </>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="text-[0.9rem] text-muted transition-colors duration-200 hover:text-ink"
            >
              {locale === 'fr' ? 'Se connecter' : 'Log in'}
            </Link>
          )}
          <LanguageSwitcher locale={locale} />
          <ThemeToggle />
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line md:hidden"
        >
          <div className="flex flex-col gap-[3px]">
            <span
              className={`h-px w-4 bg-ink transition-transform ${open ? 'translate-y-[3.5px] rotate-45' : ''}`}
            />
            <span
              className={`h-px w-4 bg-ink transition-transform ${open ? '-translate-y-[3.5px] -rotate-45' : ''}`}
            />
          </div>
        </button>
      </Container>

      {open && (
        <motion.nav
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="border-t border-line bg-paper md:hidden"
        >
          <Container className="flex flex-col gap-1 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-2.5 text-[0.95rem] text-ink/90 hover:bg-mist"
              >
                {link.label}
              </Link>
            ))}
            {email ? (
              <>
                <Link
                  href={`/${locale}/account`}
                  className="rounded-md px-2 py-2.5 text-[0.95rem] text-ink/90 hover:bg-mist"
                >
                  {locale === 'fr' ? 'Mon compte' : 'Account'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md px-2 py-2.5 text-left text-[0.95rem] text-ink/90 hover:bg-mist"
                >
                  {locale === 'fr' ? 'Se déconnecter' : 'Log out'}
                </button>
              </>
            ) : (
              <Link
                href={`/${locale}/login`}
                className="rounded-md px-2 py-2.5 text-[0.95rem] text-ink/90 hover:bg-mist"
              >
                {locale === 'fr' ? 'Se connecter' : 'Log in'}
              </Link>
            )}
            <div className="mt-2 flex items-center gap-3 px-2 pt-2">
              <LanguageSwitcher locale={locale} />
              <ThemeToggle />
            </div>
          </Container>
        </motion.nav>
      )}
    </header>
  );
}
