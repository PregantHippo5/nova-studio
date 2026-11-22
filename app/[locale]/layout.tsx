import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SetHtmlLang from '@/components/layout/SetHtmlLang';
import ThemeScript from '@/components/fx/ThemeScript';
import ThemeSync from '@/components/fx/ThemeSync';
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
      {/* La classe « site » délimite les pages publiques (l'admin en est exclu). */}
      <div className="site relative flex flex-1 flex-col overflow-x-clip">
        <div className="ns-ambient" aria-hidden="true" />
        <a
          href="#contenu"
          className="sr-only z-[100] rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {locale === 'en' ? 'Skip to content' : 'Aller au contenu'}
        </a>
        <Navbar locale={locale} dict={dict} />
        <main id="contenu" className="relative z-10 flex-1">
          {children}
        </main>
        <Footer locale={locale} dict={dict} />
      </div>
    </>
  );
}
