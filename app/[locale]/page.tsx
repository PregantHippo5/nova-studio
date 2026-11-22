import Link from 'next/link';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import NovaStar from '@/components/brand/NovaStar';
import Hero from '@/components/home/Hero';
import PillarsGrid from '@/components/home/PillarsGrid';
import FeaturedProjects from '@/components/home/FeaturedProjects';
import NovaiaTeaser from '@/components/home/NovaiaTeaser';
import { getProjects, getJournalEntries } from '@/lib/supabase/queries';
import { isLocale, defaultLocale, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export default async function Home({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const [projects, journalEntries] = await Promise.all([getProjects(), getJournalEntries()]);
  const latest = journalEntries[0];

  return (
    <>
      <Hero locale={locale} dict={dict} />
      <PillarsGrid locale={locale} dict={dict} />
      <FeaturedProjects locale={locale} dict={dict} projects={projects} />
      <NovaiaTeaser locale={locale} dict={dict} />

      {latest && (
        <section className="py-10 md:py-14">
          <Container>
            <Link
              href={`/${locale}/journal/${latest.slug}`}
              className="ns-card ns-card-link group flex flex-col gap-4 p-7 md:flex-row md:items-center md:justify-between md:p-9"
            >
              <div className="max-w-2xl">
                <p className="text-sm font-bold text-accent">{dict.journalTeaser.eyebrow}</p>
                <h2 className="mt-2 text-display-3 font-extrabold tracking-tight text-ink balance">
                  {latest.title[locale]}
                </h2>
                <p className="mt-3 leading-relaxed text-muted">{latest.excerpt[locale]}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink">
                {dict.journalTeaser.readMore}
                <span className="ns-arrow" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </span>
            </Link>
          </Container>
        </section>
      )}

      <section className="py-16 md:py-24">
        <Container>
          <div className="flex flex-col items-center gap-5 rounded-[28px] bg-accent-soft px-6 py-16 text-center md:py-20">
            <div className="ns-float">
              <NovaStar size={52} face />
            </div>
            <h2 className="max-w-xl text-display-3 font-extrabold tracking-tight text-ink balance">
              {dict.ctaSupport.title}
            </h2>
            <p className="max-w-md leading-relaxed text-muted">{dict.ctaSupport.text}</p>
            <Button href={`/${locale}/support`} className="mt-2">
              {dict.ctaSupport.button}
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
