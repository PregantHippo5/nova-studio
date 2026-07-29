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
  return { title: dict.supportPage.title, description: dict.supportPage.description };
}

// Set to true once a real link/account is ready for each option.
const readiness: Record<string, boolean> = {
  'Buy Me a Coffee': true,
  PayPal: false,
  Stripe: false,
};

const links: Record<string, string> = {
  'Buy Me a Coffee': 'https://buymeacoffee.com/saccevx',
  PayPal: '#',
  Stripe: '#',
};

export default function SupportPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <div className="py-20 md:py-28">
      <Container className="max-w-3xl">
        <SectionHeading
          eyebrow={dict.supportPage.eyebrow}
          title={dict.supportPage.title}
          description={dict.supportPage.description}
        />

        <div className="mt-14 flex flex-col divide-y divide-line border-t border-line">
          {dict.supportPage.options.map((option) => {
            const ready = readiness[option.name] ?? false;
            return (
              <div
                key={option.name}
                className={`flex items-center justify-between gap-6 py-6 ${!ready ? 'opacity-45' : ''}`}
              >
                <div>
                  <h3 className="text-[1.05rem] font-semibold text-ink">{option.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{option.description}</p>
                </div>
                {ready ? (
                  <a
                    href={links[option.name] ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink transition-all duration-300 ease-smooth hover:border-ink/40 hover:bg-mist"
                  >
                    {dict.supportPage.open}
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-[0.06em] text-muted"
                  >
                    {dict.supportPage.comingSoon}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-14 text-sm leading-relaxed text-muted">{dict.supportPage.altText}</p>
      </Container>
    </div>
  );
}
