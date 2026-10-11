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
  return { title: dict.learnPage.title, description: dict.learnPage.description };
}

export default function LearnPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <ComingSoonPage
      dict={dict}
      eyebrow={dict.learnPage.eyebrow}
      title={dict.learnPage.title}
      description={dict.learnPage.description}
      items={dict.learnPage.items}
    />
  );
}
