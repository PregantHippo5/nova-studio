import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import StatusBadge from '@/components/ui/StatusBadge';
import ProjectCoverMedia from '@/components/projects/ProjectCoverMedia';
import ScreenshotsCarousel from '@/components/projects/ScreenshotsCarousel';
import { getProject, getLatestRelease } from '@/lib/supabase/queries';
import { isLocale, defaultLocale, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const project = await getProject(params.slug);
  if (!project) return {};
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  return { title: project.name, description: project.tagline[locale] };
}

export default async function ProjectPage({ params }: { params: { locale: string; slug: string } }) {
  const project = await getProject(params.slug);
  if (!project) notFound();
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);

  // Le bouton de téléchargement principal (desktop) est dérivé de
  // app_releases — même source que l'auto-updater dans main.js — pour
  // qu'il ne puisse jamais afficher une version différente de celle que
  // l'app propose déjà à ses utilisateurs existants. Les liens additionnels
  // (site externe, changelog, réseaux...) restent gérés à la main via
  // project.links, indépendamment de ce bouton.
  const release = await getLatestRelease(project.slug);

  return (
    <div className="pb-28">
      <ProjectCoverMedia
        gradient={project.cover.gradient}
        videoUrl={project.cover.videoUrl}
        posterUrl={project.cover.posterUrl}
      >
        <Container className="pb-10">
          <Link
            href={`/${locale}/projects`}
            className={`mb-6 inline-flex items-center gap-1.5 text-sm ${
              project.cover.videoUrl ? 'text-white/70 hover:text-white' : 'text-ink/60 hover:text-ink'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            {dict.projectDetail.allProjects}
          </Link>
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-[0.7rem] uppercase tracking-[0.08em] ${
                project.cover.videoUrl ? 'text-white/60' : 'text-ink/50'
              }`}
            >
              {dict.projectsPage.categories[project.category]}
            </span>
            <StatusBadge status={project.status} dict={dict} />
          </div>
          <h1 className="mt-3 text-display-2 font-semibold balance">{project.name}</h1>
        </Container>
      </ProjectCoverMedia>

      {project.screenshots && project.screenshots.length > 0 && (
        <Container className="pt-14">
          <ScreenshotsCarousel screenshots={project.screenshots} />
        </Container>
      )}

      <Container className="grid gap-16 pt-14 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="max-w-2xl text-[1.1rem] leading-relaxed text-muted">
            {project.description[locale]}
          </p>

          {project.features && (
            <div className="mt-12">
              <h2 className="text-[0.9rem] font-semibold uppercase tracking-[0.06em] text-ink">
                {dict.projectDetail.features}
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {project.features[locale].map((f) => (
                  <li key={f} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink/40" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {project.history && (
            <div className="mt-16">
              <h2 className="text-[0.9rem] font-semibold uppercase tracking-[0.06em] text-ink">
                {dict.projectDetail.versionHistory}
              </h2>
              <div className="mt-6 flex flex-col divide-y divide-line border-t border-line">
                {project.history.map((entry) => (
                  <div key={entry.version} className="grid gap-3 py-8 sm:grid-cols-[140px_1fr]">
                    <div>
                      <p className="font-mono text-sm font-medium text-ink">{entry.version}</p>
                      <p className="mt-1 font-mono text-xs text-muted">
                        {new Date(entry.date).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-4">
                      {(
                        [
                          [dict.projectDetail.added, entry.added],
                          [dict.projectDetail.improved, entry.improved],
                          [dict.projectDetail.fixed, entry.fixed],
                          [dict.projectDetail.removed, entry.removed],
                          [dict.projectDetail.knownIssues, entry.knownIssues],
                        ] as const
                      ).map(([label, items]) =>
                        items ? (
                          <div key={label}>
                            <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
                              {label}
                            </p>
                            <ul className="mt-2 flex flex-col gap-1.5">
                              {items[locale].map((item) => (
                                <li key={item} className="text-sm leading-relaxed text-ink/85">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-line p-6">
          {release && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.06em] text-muted">
                {dict.projectDetail.currentVersion}
              </p>
              <p className="mt-1 font-mono text-sm text-ink">{release.version}</p>
            </div>
          )}

          {release && (
            <div className="flex flex-col gap-2.5">
              {release.windowsDownloadUrl && (
                <>
                  <a
                    href={release.windowsDownloadUrl}
                    download
                    className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-85"
                  >
                    {dict.projectDetail.downloadWindows}
                  </a>
                  <p className="text-xs leading-relaxed text-muted">
                    {dict.projectDetail.windowsHint}
                  </p>
                </>
              )}
              {release.macosDownloadUrl && (
                <>
                  <a
                    href={release.macosDownloadUrl}
                    download
                    className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink transition-all duration-300 ease-smooth hover:border-ink/40 hover:bg-mist"
                  >
                    {dict.projectDetail.downloadMac}
                  </a>
                  <p className="text-xs leading-relaxed text-muted">
                    {dict.projectDetail.macosHint}
                  </p>
                </>
              )}
              {(release.windowsDownloadUrl || release.macosDownloadUrl) && (
                <Link
                  href={`/${locale}/install`}
                  className="text-xs font-medium text-ink underline underline-offset-2"
                >
                  {dict.projectDetail.installGuideLink}
                </Link>
              )}

              {/* Mobile — pas encore d'app native, cases grisées en attendant
                  la décision d'architecture (Capacitor / React Native / natif). */}
              <span
                aria-disabled="true"
                className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-[0.06em] text-muted"
              >
                {dict.projectDetail.downloadAndroid} · {dict.common.comingSoon}
              </span>
              <span
                aria-disabled="true"
                className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-[0.06em] text-muted"
              >
                {dict.projectDetail.downloadIos} · {dict.common.comingSoon}
              </span>
            </div>
          )}

          {/* Liens additionnels gérés à la main (site externe, changelog...),
              indépendants du bouton de téléchargement ci-dessus. */}
          {project.links.length > 0 && (
            <div className={`flex flex-col gap-2.5 ${release ? 'mt-2.5' : ''}`}>
              {project.links.map((link) =>
                link.available === false ? (
                  <span
                    key={link.label}
                    aria-disabled="true"
                    className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-[0.06em] text-muted"
                  >
                    {link.label} · {dict.common.comingSoon}
                  </span>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    target={!link.download && link.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    download={link.download ? true : undefined}
                    className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-smooth ${
                      link.kind === 'primary'
                        ? 'bg-ink text-paper hover:opacity-85'
                        : 'border border-line text-ink hover:border-ink/40 hover:bg-mist'
                    }`}
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>
          )}
        </aside>
      </Container>
    </div>
  );
}