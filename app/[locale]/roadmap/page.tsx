import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import { getRoadmap } from '@/lib/supabase/queries';
import { RoadmapStage } from '@/lib/types';
import { isLocale, defaultLocale, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  return { title: dict.roadmapPage.title, description: dict.roadmapPage.description };
}

const stages: RoadmapStage[] = ['Done', 'In Progress', 'Planned', 'Future'];

const stageDot: Record<RoadmapStage, string> = {
  Done: 'bg-emerald-500',
  'In Progress': 'bg-accent',
  Planned: 'bg-amber-500',
  Future: 'bg-muted',
};

export default async function RoadmapPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const roadmap = await getRoadmap();

  return (
    <div className="py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow={dict.roadmapPage.eyebrow}
          title={dict.roadmapPage.title}
          description={dict.roadmapPage.description}
        />

        <div className="mt-14 grid gap-8 md:grid-cols-4">
          {stages.map((stage) => {
            const items = roadmap.filter((i) => i.stage === stage);
            return (
              <div key={stage}>
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <span className={`h-1.5 w-1.5 rounded-full ${stageDot[stage]}`} />
                  <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
                    {dict.roadmapPage.stages[stage]}
                  </h2>
                  <span className="ml-auto text-xs text-muted">{items.length}</span>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {items.map((item) => (
                    <div
                      key={item.id ?? item.project + item.title.en}
                      className="rounded-xl border border-line p-4 transition-colors hover:border-ink/25"
                    >
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.06em] text-muted">
                        {item.project}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{item.title[locale]}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
