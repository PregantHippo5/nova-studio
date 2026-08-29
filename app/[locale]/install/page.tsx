// app/[locale]/install/page.tsx
//
// Guide d'installation détaillé pour Socle (macOS + Windows), avec les
// boutons de téléchargement branchés sur la dernière release publiée —
// même source de vérité que la page projet (voir getLatestRelease).

import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import { isLocale, defaultLocale, locales, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getLatestRelease } from '@/lib/supabase/queries';

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

function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="flex flex-col gap-5">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-medium text-paper">
            {i + 1}
          </span>
          <div>
            <p className="font-medium text-ink">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function InstallPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const release = await getLatestRelease('socle');

  return (
    <Container className="py-20">
      <div className="max-w-2xl">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted">
          {dict.installPage.subtitle}
        </p>
        <h1 className="mt-2 text-display-2 font-semibold text-ink balance">{dict.installPage.title}</h1>
        <p className="mt-4 text-[1.05rem] leading-relaxed text-muted">{dict.installPage.intro}</p>
      </div>

      {/* Téléchargements — même source que la page projet */}
      <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-line p-6">
        {release ? (
          <>
            <div>
              <p className="text-xs uppercase tracking-[0.06em] text-muted">
                {dict.installPage.currentVersion}
              </p>
              <p className="mt-1 font-mono text-sm text-ink">{release.version}</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2.5">
              {release.windowsDownloadUrl && (
                <a
                  href={release.windowsDownloadUrl}
                  download
                  className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-85"
                >
                  {dict.projectDetail.downloadWindows}
                </a>
              )}
              {release.macosDownloadUrl && (
                <a
                  href={release.macosDownloadUrl}
                  download
                  className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink transition-all duration-300 ease-smooth hover:border-ink/40 hover:bg-mist"
                >
                  {dict.projectDetail.downloadMac}
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">{dict.installPage.noRelease}</p>
        )}
      </div>

      <div className="mt-16 grid gap-16 lg:grid-cols-2">
        {/* macOS */}
        <div id="macos">
          <h2 className="text-display-3 font-semibold text-ink">{dict.installPage.macosTitle}</h2>
          <div className="mt-6">
            <StepList steps={dict.installPage.macosSteps} />
          </div>

          <div className="mt-8 rounded-2xl border border-line bg-mist p-5">
            <p className="text-sm font-medium text-ink">{dict.installPage.macosTroubleTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{dict.installPage.macosTroubleBody}</p>
            <code className="mt-3 block overflow-x-auto rounded-lg bg-ink px-3.5 py-2.5 font-mono text-[0.8rem] text-paper">
              {dict.installPage.macosTroubleCommand}
            </code>
            <p className="mt-3 text-sm leading-relaxed text-muted">{dict.installPage.macosTroubleFooter}</p>
          </div>
        </div>

        {/* Windows */}
        <div id="windows">
          <h2 className="text-display-3 font-semibold text-ink">{dict.installPage.windowsTitle}</h2>
          <div className="mt-6">
            <StepList steps={dict.installPage.windowsSteps} />
          </div>
        </div>
      </div>

      <div className="mt-16 border-t border-line pt-8">
        <p className="font-medium text-ink">{dict.installPage.stillStuck}</p>
        <p className="mt-1 text-sm text-muted">{dict.installPage.stillStuckBody}</p>
      </div>
    </Container>
  );
}
