import Link from 'next/link';
import { getProjects } from '@/lib/supabase/queries';

export const dynamic = 'force-dynamic';

export default async function AdminProjectsPage() {
  const projects = await getProjects();

  return (
    <div>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projets</h1>
          <p className="mt-1 text-sm text-muted">Ajoute, modifie ou retire un projet du site.</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-85"
        >
          + Nouveau projet
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[0.68rem] uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Projet</th>
              <th className="px-5 py-3">Catégorie</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3">Version</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  Aucun projet pour l'instant.
                </td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.slug} className="border-b border-line last:border-0">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-8 w-8 rounded-lg"
                      style={{
                        background: `linear-gradient(135deg, ${p.cover.gradient[0]}, ${p.cover.gradient[1]})`,
                      }}
                    />
                    <b>{p.name}</b>
                  </div>
                </td>
                <td className="px-5 py-3.5">{p.category}</td>
                <td className="px-5 py-3.5">{p.status}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{p.currentVersion ?? '—'}</td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/admin/projects/${p.slug}/edit`} className="text-xs font-medium hover:underline">
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
