import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import { getJournalEntry } from '@/lib/supabase/queries';
import { isLocale, defaultLocale, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const entry = await getJournalEntry(params.slug);
  if (!entry) return {};
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  return { title: entry.title[locale], description: entry.excerpt[locale] };
}

export default async function JournalEntryPage({ params }: { params: { locale: string; slug: string } }) {
  const entry = await getJournalEntry(params.slug);
  if (!entry) notFound();
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <article className="py-20 md:py-28">
      <Container className="max-w-3xl">
        <Link
          href={`/${locale}/journal`}
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          {dict.journalEntryPage.back}
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.06em] text-muted">
            {entry.project}
          </span>
          <span className="text-xs text-muted">{entry.category[locale]}</span>
          <span className="text-xs text-muted">·</span>
          <span className="text-xs text-muted">{entry.readingTime[locale]}</span>
        </div>

        <h1 className="mt-4 text-display-2 font-semibold text-ink balance">{entry.title[locale]}</h1>
        <p className="mt-3 font-mono text-sm text-muted">
          {new Date(entry.date).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        <div className="mt-10 flex flex-col gap-5">
          {entry.content[locale].map((paragraph, i) => (
            <p key={i} className="text-[1.05rem] leading-relaxed text-ink/85">
              {paragraph}
            </p>
          ))}
        </div>
      </Container>
    </article>
  );
}
