import Link from 'next/link';
import Container from '@/components/ui/Container';
import Hero from '@/components/home/Hero';
import FeaturedProjects from '@/components/home/FeaturedProjects';
import Button from '@/components/ui/Button';
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
      <FeaturedProjects locale={locale} dict={dict} projects={projects} />

      <section className="border-t border-line py-24">
        <Container>
          <div className="grid gap-12 md:grid-cols-3">
            {dict.principles.map((p) => (
              <div key={p.title}>
                <h3 className="text-[1.05rem] font-semibold text-ink">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {latest && (
        <section className="border-t border-line py-24">
          <Container className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-accent">
                {dict.journalTeaser.eyebrow}
              </p>
              <Link href={`/${locale}/journal/${latest.slug}`} className="group block max-w-xl">
                <h2 className="text-display-3 font-semibold text-ink transition-colors group-hover:text-accent">
                  {latest.title[locale]}
                </h2>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{latest.excerpt[locale]}</p>
              </Link>
            </div>
            <Button href={`/${locale}/journal`} variant="ghost">
              {dict.journalTeaser.readMore}
            </Button>
          </Container>
        </section>
      )}

      <section className="border-t border-line py-24">
        <Container className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-display-2 font-semibold text-ink balance max-w-2xl">
            {dict.ctaSupport.title}
          </h2>
          <p className="max-w-md text-[1.05rem] leading-relaxed text-muted">{dict.ctaSupport.text}</p>
          <Button href={`/${locale}/support`} variant="primary" className="mt-2">
            {dict.ctaSupport.button}
          </Button>
        </Container>
      </section>
    </>
  );
}
