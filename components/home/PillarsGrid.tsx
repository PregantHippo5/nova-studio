import Link from 'next/link';
import Container from '@/components/ui/Container';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';

const icons: Record<string, JSX.Element> = {
  projects: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  ),
  learn: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2.2" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-30 12 12)" />
    </svg>
  ),
  games: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9h12a3 3 0 0 1 3 3.2l-.5 4A2.5 2.5 0 0 1 16 17.7L14.6 16H9.4L8 17.7a2.5 2.5 0 0 1-4.5-1.5l-.5-4A3 3 0 0 1 6 9Z" />
      <path d="M8.5 11.5v3M7 13h3" />
    </svg>
  ),
};

const hrefs: Record<string, string> = { projects: 'projects', learn: 'learn', games: 'games' };

export default function PillarsGrid({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="py-16 md:py-20">
      <Container>
        <h2 className="max-w-2xl text-display-3 font-extrabold tracking-tight text-ink balance">
          {dict.manifesto.text}
        </h2>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {dict.pillars.map((pillar) => (
            <Link
              key={pillar.key}
              href={`/${locale}/${hrefs[pillar.key]}`}
              className="ns-card ns-card-link group flex flex-col p-7"
            >
              <span
                className="ns-tile flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                style={{ background: `rgb(var(--c-${pillar.key}))` }}
              >
                {icons[pillar.key]}
              </span>
              <h3 className="mt-7 text-[1.15rem] font-extrabold tracking-tight text-ink">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{pillar.text}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                {pillar.cta}
                <span className="ns-arrow" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
