import Link from 'next/link';
import { Project } from '@/lib/types';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ProjectCard({
  project,
  locale,
  dict,
}: {
  project: Project;
  locale: Locale;
  dict: Dictionary;
  /** Ancien paramètre d'animation en cascade, conservé pour ne pas casser les appels existants. */
  index?: number;
}) {
  return (
    <Link
      href={`/${locale}/projects/${project.slug}`}
      className="ns-card ns-card-link group flex h-full flex-col overflow-hidden"
    >
      <div className="p-2">
        <div
          className="flex h-44 items-center justify-center rounded-2xl text-lg font-extrabold tracking-tight text-ink/70"
          style={{
            background: `linear-gradient(135deg, ${project.cover.gradient[0]}, ${project.cover.gradient[1]})`,
          }}
        >
          {project.cover.label}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.8rem] font-semibold text-muted">
            {dict.projectsPage.categories[project.category]}
          </span>
          <StatusBadge status={project.status} dict={dict} />
        </div>
        <h3 className="text-lg font-extrabold tracking-tight text-ink">{project.name}</h3>
        <p className="text-sm leading-relaxed text-muted">{project.tagline[locale]}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-ink">
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
