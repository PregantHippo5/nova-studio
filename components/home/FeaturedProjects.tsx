import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import ProjectCard from '@/components/projects/ProjectCard';
import Button from '@/components/ui/Button';
import TiltCard from '@/components/fx/TiltCard';
import Reveal from '@/components/motion/Reveal';
import { Project } from '@/lib/types';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';

export default function FeaturedProjects({
  locale,
  dict,
  projects,
}: {
  locale: Locale;
  dict: Dictionary;
  projects: Project[];
}) {
  return (
    <section className="border-t border-line py-24">
      <Container>
        <Reveal className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            eyebrow={dict.featured.eyebrow}
            title={dict.featured.title}
            description={dict.featured.description}
          />
          <Button href={`/${locale}/projects`} variant="ghost">
            {dict.featured.viewAll}
          </Button>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((project, i) => (
            <TiltCard key={project.slug} className="h-full">
              <ProjectCard project={project} locale={locale} dict={dict} index={i} />
            </TiltCard>
          ))}
        </div>
      </Container>
    </section>
  );
}
