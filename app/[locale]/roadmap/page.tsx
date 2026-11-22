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
  Done: 'bg-[rgb(var(--ok))]',
  'In Progress': 'bg-accent',
  Planned: 'bg-[rgb(var(--sun))]',
  Future: 'bg-muted',
};

export default async function RoadmapPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);
  const roadmap = await getRoadmap();

  return (
    <div className="py-16 md:py-24">
      <Container>
        <SectionHeading title={dict.roadmapPage.title} description={dict.roadmapPage.description} />

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage) => {
            const items = roadmap.filter((i) => i.stage === stage);
            return (
              <div key={stage}>
                <div className="flex items-center gap-2.5 pb-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${stageDot[stage]}`} />
                  <h2 className="text-[0.95rem] font-extrabold tracking-tight text-ink">
                    {dict.roadmapPage.stages[stage]}
                  </h2>
                  <span className="ml-auto rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-muted">{items.length}</span>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {items.map((item) => (
                    <div
                      key={item.id ?? item.project + item.title.en}
                      className="ns-card ns-card-link p-4 !rounded-[18px]"
                    >
                      <p className="text-[0.75rem] font-semibold text-accent-deep dark:text-accent">
                        {item.project}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink/90">{item.title[locale]}</p>
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

