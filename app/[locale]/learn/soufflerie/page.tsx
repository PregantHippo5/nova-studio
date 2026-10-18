import type { Metadata } from 'next';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import WindTunnel from '@/components/learn/WindTunnel';
import { isLocale, defaultLocale, locales, Locale } from '@/lib/i18n/config';
import { windTunnelCopy } from '@/lib/sim/windTunnelCopy';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const copy = windTunnelCopy(locale);
  return { title: copy.title, description: copy.intro };
}

export default function WindTunnelPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const copy = windTunnelCopy(locale);

  return (
    <div className="py-14 md:py-20">
      <Container>
        <Link
          href={`/${locale}/learn`}
          className="font-mono text-[0.75rem] text-muted transition-colors hover:text-ink"
        >
          ← {copy.back}
        </Link>
        <p className="mt-6 font-mono text-[0.75rem] tracking-[0.04em] text-[rgb(var(--c-learn))]">{copy.eyebrow}</p>
        <h1 className="mt-2 font-display text-display-1 font-bold text-ink balance">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-muted">{copy.intro}</p>

        <div className="mt-10">
          <WindTunnel copy={copy} />
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <section>
            <h2 className="font-display text-display-3 font-bold text-ink">{copy.understand}</h2>
            <div className="mt-5 space-y-4 text-[0.95rem] leading-relaxed text-muted">
              {copy.help.map((t) => (
                <p key={t}>{t}</p>
              ))}
              {copy.paragraphs.map((t) => (
                <p key={t}>{t}</p>
              ))}
              <p className="text-[0.85rem]">{copy.note}</p>
            </div>
          </section>

          <section className="h-fit rounded-2xl border border-line bg-mist p-7">
            <h2 className="font-display text-xl font-bold text-ink">{copy.downloadTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{copy.downloadText}</p>
            <a
              href="/nova_soufflerie.py"
              download="nova_soufflerie.py"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-[0.9rem] font-medium text-paper transition-opacity hover:opacity-85"
            >
              {copy.download}
            </a>
          </section>
        </div>
      </Container>
    </div>
  );
}
