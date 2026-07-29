'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RoadmapItem, RoadmapStage } from '@/lib/types';

const stages: RoadmapStage[] = ['Done', 'In Progress', 'Planned', 'Future'];

export default function RoadmapManager({ items }: { items: RoadmapItem[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState('');
  const [titleFr, setTitleFr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [stage, setStage] = useState<RoadmapStage>('Planned');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !titleFr || !titleEn) return;
    setSaving(true);
    await supabase.from('roadmap_items').insert({
      project,
      title_fr: titleFr,
      title_en: titleEn,
      stage,
    });
    setSaving(false);
    setProject('');
    setTitleFr('');
    setTitleEn('');
    router.refresh();
  };

  const handleDelete = async (item: RoadmapItem) => {
    if (!item.id) return;
    await supabase.from('roadmap_items').delete().eq('id', item.id);
    router.refresh();
  };

  return (
    <div>
      <form
        onSubmit={handleAdd}
        className="mb-8 grid grid-cols-[1fr_1.4fr_1.4fr_1fr_auto] gap-2 rounded-2xl border border-line bg-paper p-4"
      >
        <input
          placeholder="Projet"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className="rounded-lg border border-line px-2.5 py-2 text-sm"
        />
        <input
          placeholder="Titre — FR"
          value={titleFr}
          onChange={(e) => setTitleFr(e.target.value)}
          className="rounded-lg border border-line px-2.5 py-2 text-sm"
        />
        <input
          placeholder="Title — EN"
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          className="rounded-lg border border-line px-2.5 py-2 text-sm"
        />
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as RoadmapStage)}
          className="rounded-lg border border-line px-2.5 py-2 text-sm"
        >
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-ink px-4 text-sm font-medium text-paper hover:opacity-85 disabled:opacity-50"
        >
          + Ajouter
        </button>
      </form>

      <div className="grid gap-6 md:grid-cols-4">
        {stages.map((s) => (
          <div key={s}>
            <h3 className="mb-3 font-mono text-xs uppercase tracking-wide text-muted">{s}</h3>
            <div className="flex flex-col gap-2">
              {items
                .filter((i) => i.stage === s)
                .map((item) => (
                  <div
                    key={item.id ?? item.project + item.title.fr}
                    className="rounded-xl border border-line bg-paper p-3"
                  >
                    <p className="font-mono text-[0.65rem] uppercase text-muted">{item.project}</p>
                    <p className="mt-1 text-sm">{item.title.fr}</p>
                    <button
                      onClick={() => handleDelete(item)}
                      className="mt-2 text-xs text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
