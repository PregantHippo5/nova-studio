import { getRoadmap } from '@/lib/supabase/queries';
import RoadmapManager from '@/components/admin/RoadmapManager';

export const dynamic = 'force-dynamic';

export default async function AdminRoadmapPage() {
  const items = await getRoadmap();

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-semibold">Roadmap</h1>
        <p className="mt-1 text-sm text-muted">Ajoute ou retire un objectif pour chaque projet.</p>
      </div>
      <RoadmapManager items={items} />
    </div>
  );
}
