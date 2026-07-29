import { notFound } from 'next/navigation';
import { getJournalEntry } from '@/lib/supabase/queries';
import JournalForm from '@/components/admin/JournalForm';

export const dynamic = 'force-dynamic';

export default async function EditJournalPage({ params }: { params: { slug: string } }) {
  const entry = await getJournalEntry(params.slug);
  if (!entry) notFound();

  return (
    <div>
      <h1 className="mb-7 text-xl font-semibold">Modifier « {entry.title.fr} »</h1>
      <JournalForm entry={entry} />
    </div>
  );
}
