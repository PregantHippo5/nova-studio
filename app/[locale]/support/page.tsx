import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import NovaStar from '@/components/brand/NovaStar';
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
    <div className="py-16 md:py-24">
      <Container className="max-w-3xl">
        <div className="flex items-start gap-5">
          <span className="ns-float mt-1 hidden shrink-0 sm:block">
            <NovaStar size={72} face track />
          </span>
          <SectionHeading title={dict.supportPage.title} description={dict.supportPage.description} />
        </div>

        <div className="mt-12 flex flex-col gap-3">
          {dict.supportPage.options.map((option) => {
            const ready = readiness[option.name] ?? false;
            return (
              <div
                key={option.name}
                className={`ns-card flex items-center justify-between gap-6 p-6 ${!ready ? 'opacity-50' : ''}`}
              >
                <div>
                  <h3 className="text-[1.05rem] font-extrabold tracking-tight text-ink">{option.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{option.description}</p>
                </div>
                {ready ? (
                  <a
                    href={links[option.name] ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_-10px_rgb(var(--accent)/0.8)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                  >
                    {dict.supportPage.open}
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-ink/5 px-4 py-2.5 text-[0.8rem] font-semibold text-muted"
                  >
                    {dict.supportPage.comingSoon}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-sm leading-relaxed text-muted">{dict.supportPage.altText}</p>
      </Container>
    </div>
  );
}

