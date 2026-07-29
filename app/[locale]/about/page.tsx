import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
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

export default function AboutPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <div className="py-20 md:py-28">
      <Container className="max-w-3xl">
        <SectionHeading eyebrow={dict.aboutPage.eyebrow} title={dict.aboutPage.title} />

        <div className="mt-10 flex flex-col gap-5 text-[1.05rem] leading-relaxed text-ink/85">
          {dict.aboutPage.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-16 grid gap-10 sm:grid-cols-3">
          {dict.aboutPage.values.map((v) => (
            <div key={v.title}>
              <h3 className="text-[0.95rem] font-semibold text-ink">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{v.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
