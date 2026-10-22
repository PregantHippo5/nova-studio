import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import Reveal from '@/components/motion/Reveal';
import NovaiaChat from '@/components/novaia/NovaiaChat';
import { isLocale, defaultLocale, locales, Locale } from '@/lib/i18n/config';
import { novaiaCopy } from '@/lib/novaia/copy';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const copy = novaiaCopy(locale);
  return { title: copy.metaTitle, description: copy.metaDescription };
}

export default function NovaiaPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const copy = novaiaCopy(locale);

  return (
    <div className="relative overflow-hidden py-20 md:py-28">
      <div
        className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-accent-soft blur-3xl"
        aria-hidden="true"
      />

      <Container className="relative">
        <Reveal>
          <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
        </Reveal>

        <Reveal className="mt-12" delay={0.1}>
          <NovaiaChat locale={locale} copy={copy} />
        </Reveal>
      </Container>
    </div>
  );
}
