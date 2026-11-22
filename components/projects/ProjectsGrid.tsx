'use client';

import { useState } from 'react';
import { Project, ProjectCategory } from '@/lib/types';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';
import ProjectCard from '@/components/projects/ProjectCard';
import NovaStar from '@/components/brand/NovaStar';

const categories: (ProjectCategory | 'All')[] = ['All', 'Software', 'Games', 'Music', 'Videos'];

export default function ProjectsGrid({
  locale,
  dict,
  projects,
}: {
  locale: Locale;
  dict: Dictionary;
  projects: Project[];
}) {
  const [active, setActive] = useState<(typeof categories)[number]>('All');

  const filtered = active === 'All' ? projects : projects.filter((p) => p.category === active);

  // On n'affiche que les filtres qui contiennent vraiment des projets (plus de « Musique » vide).
  const used = new Set(projects.map((p) => p.category));
  const visibleCategories = categories.filter((cat) => cat === 'All' || used.has(cat));

  return (
    <div>
      {visibleCategories.length > 2 && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {visibleCategories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={active === cat}
              onClick={() => setActive(cat)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.96] ${
                active === cat
                  ? 'bg-accent text-white shadow-[0_10px_20px_-10px_rgb(var(--accent)/0.8)]'
                  : 'bg-mist text-muted shadow-[0_0_0_1px_rgb(var(--line)/0.8)] hover:text-ink'
              }`}
            >
              {cat === 'All' ? dict.projectsPage.categories.all : dict.projectsPage.categories[cat]}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project, i) => (
          <ProjectCard key={project.slug} project={project} locale={locale} dict={dict} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="ns-card mt-8 flex items-center gap-5 p-8">
          <span className="ns-float">
            <NovaStar size={64} face mood="think" />
          </span>
          <p className="text-muted">{dict.common.comingSoon}</p>
        </div>
      )}
    </div>
  );
}
