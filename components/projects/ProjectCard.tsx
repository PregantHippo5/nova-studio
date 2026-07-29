'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Project } from '@/lib/types';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ProjectCard({
  project,
  locale,
  dict,
  index = 0,
}: {
  project: Project;
  locale: Locale;
  dict: Dictionary;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/${locale}/projects/${project.slug}`}
        className="group block overflow-hidden rounded-2xl border border-line bg-paper transition-all duration-300 ease-smooth hover:-translate-y-1 hover:border-ink/25"
      >
        <div
          className="flex h-44 items-center justify-center text-lg font-semibold tracking-tight text-ink/70"
          style={{
            background: `linear-gradient(135deg, ${project.cover.gradient[0]}, ${project.cover.gradient[1]})`,
          }}
        >
          {project.cover.label}
        </div>
        <div className="flex flex-col gap-3 p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted">
              {dict.projectsPage.categories[project.category]}
            </span>
            <StatusBadge status={project.status} dict={dict} />
          </div>
          <h3 className="text-lg font-semibold text-ink">{project.name}</h3>
          <p className="text-sm leading-relaxed text-muted">{project.tagline[locale]}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-transform duration-300 group-hover:translate-x-0.5">
            {dict.featured.viewProject}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
