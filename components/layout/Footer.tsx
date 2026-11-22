import Link from 'next/link';
import Container from '@/components/ui/Container';
import ThemeToggle from '@/components/layout/ThemeToggle';
import NovaStar from '@/components/brand/NovaStar';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';
import { CONTACT_EMAIL, SOCIALS } from '@/lib/site';

export default function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const columns = [
    {
      title: dict.footer.studio,
      links: [
        { label: dict.nav.projects, href: `/${locale}/projects` },
        { label: dict.nav.learn, href: `/${locale}/learn` },
        { label: dict.nav.games, href: `/${locale}/games` },
        { label: dict.nav.journal, href: `/${locale}/journal` },
        { label: dict.nav.about, href: `/${locale}/about` },
      ],
    },
    {
      title: dict.footer.elsewhere,
      links: [
        ...SOCIALS.map((social) => ({ label: social.name, href: social.href })),
        { label: dict.footer.contact, href: `mailto:${CONTACT_EMAIL}` },
      ],
    },
  ];

  const linkClass =
    'relative inline-block text-sm text-muted transition-colors duration-200 hover:text-ink after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-ink after:transition-[width] after:duration-300 after:content-[""] hover:after:w-full';

  return (
    <footer className="relative z-10 border-t border-line">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href={`/${locale}`} className="flex items-center gap-2.5 text-[1.02rem] font-extrabold tracking-tight">
            <NovaStar size={26} className="ns-logo-star" />
            Nova Studio
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{dict.footer.tagline}</p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-bold text-ink">{col.title}</p>
            <ul className="mt-4 flex flex-col gap-3">
              {col.links.map((link) => {
                const external = link.href.startsWith('http');
                const mail = link.href.startsWith('mailto:');
                return (
                  <li key={link.label}>
                    {external || mail ? (
                      <a
                        href={link.href}
                        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className={linkClass}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </Container>

      <Container className="flex flex-col gap-4 border-t border-line py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {dict.footer.copyright}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href={`/${locale}/privacy`} className="transition-colors hover:text-ink">
            {dict.footer.privacy}
          </Link>
          <span>{dict.footer.builtWith}</span>
          <ThemeToggle />
        </div>
      </Container>
    </footer>
  );
}
