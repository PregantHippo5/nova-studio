import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SetHtmlLang from '@/components/layout/SetHtmlLang';
import ThemeScript from '@/components/fx/ThemeScript';
import ThemeSync from '@/components/fx/ThemeSync';
import Preloader from '@/components/fx/Preloader';
import CustomCursor from '@/components/fx/CustomCursor';
import { display } from '@/lib/fonts';
import ScrollProgress from '@/components/motion/ScrollProgress';
import { locales, isLocale, defaultLocale, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL('https://novastudio.dev'),
    title: {
      default: dict.meta.title,
      template: `%s — Nova Studio`,
    },
    description: dict.meta.description,
    openGraph: {
      title: 'Nova Studio',
      description: dict.meta.description,
      type: 'website',
    },
  };
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <>
      <ThemeScript />
      <SetHtmlLang locale={locale} />
      <ThemeSync />
      <ScrollProgress />
      <Preloader />
      <CustomCursor />
      <div className={`${display.variable} flex flex-1 flex-col`}>
        <Navbar locale={locale} dict={dict} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} dict={dict} />
      </div>
    </>
  );
}
