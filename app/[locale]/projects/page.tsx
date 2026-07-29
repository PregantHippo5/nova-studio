import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import ProjectsGrid from '@/components/projects/ProjectsGrid';
import { getProjects } from '@/lib/supabase/queries';
import { isLocale, defaultLocale, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  return { title: dict.projectsPage.title, description: dict.projectsPage.description };
}

export default async function ProjectsPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const projects = await getProjects();

  return (
    <div className="py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow={dict.projectsPage.eyebrow}
          title={dict.projectsPage.title}
          description={dict.projectsPage.description}
        />
        <div className="mt-14">
          <ProjectsGrid locale={locale} dict={dict} projects={projects} />
        </div>
      </Container>
    </div>
  );
}
