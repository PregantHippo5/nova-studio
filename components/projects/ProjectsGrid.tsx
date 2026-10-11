'use client';

import { useState } from 'react';
import { Project, ProjectCategory } from '@/lib/types';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';
import ProjectCard from '@/components/projects/ProjectCard';

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
      <div className="flex flex-wrap gap-2">
        {visibleCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors duration-200 ${
              active === cat
                ? 'border-ink bg-ink text-paper'
                : 'border-line text-muted hover:border-ink/30 hover:text-ink'
            }`}
          >
            {cat === 'All' ? dict.projectsPage.categories.all : dict.projectsPage.categories[cat]}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project, i) => (
          <ProjectCard key={project.slug} project={project} locale={locale} dict={dict} index={i} />
        ))}
      </div>
    </div>
  );
}
