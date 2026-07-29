import type { Metadata } from 'next';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import { getJournalEntries } from '@/lib/supabase/queries';
import { isLocale, defaultLocale, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  return { title: dict.journalPage.title, description: dict.journalPage.description };
}

export default async function JournalPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const journalEntries = await getJournalEntries();

  return (
    <div className="py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow={dict.journalPage.eyebrow}
          title={dict.journalPage.title}
          description={dict.journalPage.description}
        />

        <div className="mt-14 flex flex-col divide-y divide-line border-t border-line">
          {journalEntries.length === 0 && (
            <p className="py-10 text-sm text-muted">
              {locale === 'fr'
                ? 'Rien à lire pour l’instant — les premières notes arrivent bientôt.'
                : 'Nothing here yet — the first notes are coming soon.'}
            </p>
          )}
          {journalEntries.map((entry) => (
            <Link
              key={entry.slug}
              href={`/${locale}/journal/${entry.slug}`}
              className="group grid gap-2 py-8 transition-colors sm:grid-cols-[140px_1fr]"
            >
              <p className="font-mono text-xs text-muted">
                {new Date(entry.date).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.06em] text-muted">
                    {entry.project}
                  </span>
                  <span className="text-xs text-muted">{entry.category[locale]}</span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-xs text-muted">{entry.readingTime[locale]}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-ink transition-colors group-hover:text-accent">
                  {entry.title[locale]}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                  {entry.excerpt[locale]}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
