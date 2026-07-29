import { notFound } from 'next/navigation';
import { getProject } from '@/lib/supabase/queries';
import ProjectForm from '@/components/admin/ProjectForm';

export const dynamic = 'force-dynamic';

export default async function EditProjectPage({ params }: { params: { slug: string } }) {
  const project = await getProject(params.slug);
  if (!project) notFound();

  return (
    <div>
      <h1 className="mb-7 text-xl font-semibold">Modifier {project.name}</h1>
      <ProjectForm project={project} />
    </div>
  );
}
