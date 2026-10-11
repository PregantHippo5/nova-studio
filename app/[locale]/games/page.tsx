import type { Metadata } from 'next';
import ComingSoonPage from '@/components/ui/ComingSoonPage';
import { isLocale, defaultLocale, locales, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  return { title: dict.gamesPage.title, description: dict.gamesPage.description };
}

export default function GamesPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <ComingSoonPage
      dict={dict}
      eyebrow={dict.gamesPage.eyebrow}
      title={dict.gamesPage.title}
      description={dict.gamesPage.description}
      items={dict.gamesPage.items}
    />
  );
}
