import Link from 'next/link';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import ProjectCard from '@/components/projects/ProjectCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Project } from '@/lib/types';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';

/** Un seul projet : carte large. Plusieurs : grille de cartes. */
function WideCard({ project, locale, dict }: { project: Project; locale: Locale; dict: Dictionary }) {
  return (
    <Link
      href={`/${locale}/projects/${project.slug}`}
      className="ns-card ns-card-link group grid gap-2 overflow-hidden p-2 md:grid-cols-[1.1fr_1fr]"
    >
      <div
        className="flex min-h-[220px] items-center justify-center rounded-2xl text-2xl font-extrabold tracking-tight text-ink/70"
        style={{
          background: `linear-gradient(135deg, ${project.cover.gradient[0]}, ${project.cover.gradient[1]})`,
        }}
      >
        {project.cover.label}
      </div>
      <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.8rem] font-semibold text-muted">
            {dict.projectsPage.categories[project.category]}
          </span>
          <StatusBadge status={project.status} dict={dict} />
        </div>
        <h3 className="text-display-3 font-extrabold tracking-tight text-ink">{project.name}</h3>
        <p className="max-w-md leading-relaxed text-muted">{project.tagline[locale]}</p>
        <span className="inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-ink">
          {dict.featured.viewProject}
          <span className="ns-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </span>
      </div>
    </Link>
  );
}

export default function FeaturedProjects({
  locale,
  dict,
  projects,
}: {
  locale: Locale;
  dict: Dictionary;
  projects: Project[];
}) {
  const shown = projects.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <section className="py-16 md:py-20">
      <Container>
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-xl">
            <h2 className="text-display-3 font-extrabold tracking-tight text-ink balance">{dict.featured.title}</h2>
            <p className="mt-3 leading-relaxed text-muted">{dict.featured.description}</p>
          </div>
          <Button href={`/${locale}/projects`} variant="secondary" arrow>
            {dict.featured.viewAll}
          </Button>
        </div>

        {shown.length === 1 ? (
          <div className="mt-10">
            <WideCard project={shown[0]} locale={locale} dict={dict} />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((project) => (
              <ProjectCard key={project.slug} project={project} locale={locale} dict={dict} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
