import Link from 'next/link';
import { getJournalEntries } from '@/lib/supabase/queries';

export const dynamic = 'force-dynamic';

export default async function AdminJournalPage() {
  const entries = await getJournalEntries();

  return (
    <div>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Journal</h1>
          <p className="mt-1 text-sm text-muted">Publications du journal de développement.</p>
        </div>
        <Link
          href="/admin/journal/new"
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-85"
        >
          + Nouvelle entrée
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[0.68rem] uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Titre</th>
              <th className="px-5 py-3">Projet</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted">
                  Aucune entrée pour l'instant.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.slug} className="border-b border-line last:border-0">
                <td className="px-5 py-3.5"><b>{entry.title.fr}</b></td>
                <td className="px-5 py-3.5">{entry.project}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{entry.date}</td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/admin/journal/${entry.slug}/edit`} className="text-xs font-medium hover:underline">
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
