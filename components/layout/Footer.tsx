import Link from 'next/link';
import Container from '@/components/ui/Container';
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

  return (
    <footer className="border-t border-line">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Link href={`/${locale}`} className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-paper text-[0.7rem]">
              N
            </span>
            Nova Studio
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{dict.footer.tagline}</p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-muted">
              {col.title}
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {col.links.map((link) => {
                const external = link.href.startsWith('http');
                const className = 'text-sm text-ink/80 transition-colors hover:text-ink';
                return (
                  <li key={link.label}>
                    {external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                        {link.label}
                      </a>
                    ) : link.href.startsWith('mailto:') ? (
                      <a href={link.href} className={className}>
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={className}>
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

      <Container className="flex flex-col gap-2 border-t border-line py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {dict.footer.copyright}</p>
        <p>{dict.footer.builtWith}</p>
      </Container>
    </footer>
  );
}
