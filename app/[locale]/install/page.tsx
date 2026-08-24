// app/[locale]/install/page.tsx
//
// Guide d'installation SOCLE — placeholder pour l'instant. Le lien "Guide
// d'installation" sur la page projet pointe ici pour ne jamais renvoyer une
// 404, en attendant un vrai contenu détaillé (captures d'écran, étapes
// pas-à-pas...).

import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import { isLocale, defaultLocale, locales, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  return { title: dict.installPage.title };
}

export default function InstallPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <Container className="py-20">
      <h1 className="text-display-2 font-semibold text-ink balance">{dict.installPage.title}</h1>
      <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-muted">
        {dict.installPage.comingSoon}
      </p>
    </Container>
  );
}
