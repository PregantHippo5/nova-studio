import type { Metadata } from 'next';
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
    <div className="relative overflow-hidden py-6 md:py-10">
      <div
        className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-accent-soft blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h1 className="sr-only">{copy.title}</h1>
        <NovaiaChat locale={locale} copy={copy} />
      </div>
    </div>
  );
}
