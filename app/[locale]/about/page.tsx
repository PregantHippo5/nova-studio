import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import NovaStar from '@/components/brand/NovaStar';
import { isLocale, defaultLocale, locales, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  return { title: dict.aboutPage.title, description: dict.aboutPage.eyebrow };
}

const tints = ['--c-projects', '--c-learn', '--c-games'];

export default function AboutPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <div className="py-16 md:py-24">
      <Container className="max-w-3xl">
        <div className="flex items-center gap-5">
          <span className="ns-float shrink-0">
            <NovaStar size={64} face track />
          </span>
          <h1 className="text-display-2 font-extrabold tracking-tight text-ink balance">{dict.aboutPage.title}</h1>
        </div>

        <div className="mt-10 flex flex-col gap-5 text-[1.08rem] leading-[1.75] text-ink/85">
          {dict.aboutPage.paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? 'text-[1.25rem] font-medium leading-relaxed text-ink' : ''}>
              {p}
            </p>
          ))}
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {dict.aboutPage.values.map((v, i) => (
            <div key={v.title} className="ns-card p-6">
              <span
                className="mb-4 block h-2.5 w-10 rounded-full"
                style={{ background: `rgb(var(${tints[i % 3]}))` }}
                aria-hidden="true"
              />
              <h3 className="text-[1.02rem] font-extrabold tracking-tight text-ink">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{v.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
