'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import NovaStar from '@/components/brand/NovaStar';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';
import { createClient } from '@/lib/supabase/client';

export default function Navbar({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const pathname = usePathname();
  const supabase = createClient();

  // Quatre entrées seulement. Journal, À propos et le reste vivent dans le pied de page.
  const links = [
    { href: `/${locale}/projects`, label: dict.nav.projects },
    { href: `/${locale}/learn`, label: dict.nav.learn },
    { href: `/${locale}/novaia`, label: 'NovaIA' },
    { href: `/${locale}/games`, label: dict.nav.games },
  ];

  const activeHref = links.find((l) => pathname === l.href || pathname?.startsWith(l.href + '/'))?.href ?? null;
  const pillTarget = hovered ?? activeHref;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
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

  const accountHref = email ? `/${locale}/account` : `/${locale}/login`;
  const accountLabel = email ? dict.nav.account : dict.nav.login;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ease-smooth ${
        scrolled || open ? 'border-line bg-paper/85 backdrop-blur-md' : 'border-transparent bg-paper/0'
      }`}
    >
      <Container className="flex h-[72px] items-center justify-between gap-6">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 text-[1.02rem] font-extrabold tracking-tight"
        >
          <NovaStar size={26} className="ns-logo-star" />
          Nova Studio
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-1 lg:flex"
          onMouseLeave={() => setHovered(null)}
        >
          {links.map((link) => {
            const active = link.href === activeHref;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => setHovered(link.href)}
                onFocus={() => setHovered(link.href)}
                onBlur={() => setHovered(null)}
                className={`relative rounded-full px-4 py-2 text-[0.92rem] font-semibold transition-colors duration-200 ${
                  link.href === pillTarget || active ? 'text-ink' : 'text-muted'
                }`}
              >
                {link.href === pillTarget && (
                  <motion.span
                    layoutId="nav-pill"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-accent-soft"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher locale={locale} />
          <Link
            href={accountHref}
            aria-label={accountLabel}
            title={accountLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-mist text-muted transition-all duration-200 hover:-translate-y-0.5 hover:text-ink"
          >
            {email ? (
              <span className="text-[0.85rem] font-extrabold uppercase text-accent">{email[0]}</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" />
              </svg>
            )}
          </Link>
          <Button href={`/${locale}/support`} className="px-5 py-2.5">
            {dict.nav.support}
          </Button>
        </div>

        <button
          type="button"
          aria-label={dict.nav.menu}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-mist lg:hidden"
        >
          <span className="flex flex-col gap-[5px]">
            <span className={`h-[2px] w-4 rounded bg-ink transition-transform duration-300 ease-smooth ${open ? 'translate-y-[3.5px] rotate-45' : ''}`} />
            <span className={`h-[2px] w-4 rounded bg-ink transition-transform duration-300 ease-smooth ${open ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
          </span>
        </button>
      </Container>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            key="mobile-menu"
            aria-label="Menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-line bg-paper lg:hidden"
          >
            <Container className="flex flex-col gap-1 py-5">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl px-4 py-3.5 text-[1.1rem] font-bold text-ink transition-colors hover:bg-accent-soft"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={accountHref}
                className="rounded-2xl px-4 py-3.5 text-[1.1rem] font-bold text-ink transition-colors hover:bg-accent-soft"
              >
                {accountLabel}
              </Link>
              <div className="mt-3 flex items-center justify-between gap-4 px-1">
                <LanguageSwitcher locale={locale} />
                <Button href={`/${locale}/support`}>{dict.nav.support}</Button>
              </div>
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
