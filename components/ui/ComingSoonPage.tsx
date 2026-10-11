import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import Reveal from '@/components/motion/Reveal';
import Parallax from '@/components/motion/Parallax';
import { CONTACT_EMAIL } from '@/lib/site';
import { Dictionary } from '@/lib/i18n/dictionaries';

interface Item {
  tag: string;
  title: string;
  text: string;
}

interface ComingSoonPageProps {
  dict: Dictionary;
  eyebrow: string;
  title: string;
  description: string;
  items: Item[];
}

/** Page « vitrine » partagée par Apprendre et Jeux tant qu'il n'y a pas de contenu publié. */
export default function ComingSoonPage({ dict, eyebrow, title, description, items }: ComingSoonPageProps) {
  return (
    <div className="relative overflow-hidden py-20 md:py-28">
      <Parallax distance={110} className="pointer-events-none absolute -right-24 top-16">
        <div className="h-80 w-80 rounded-full bg-accent-soft blur-3xl" />
      </Parallax>

      <Container className="relative">
        <Reveal>
          <SectionHeading eyebrow={eyebrow} title={title} description={description} />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-paper/70 p-7 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted">
                    {item.tag}
                  </span>
                  <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                    {dict.common.comingSoon}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-16">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-accent-soft p-8 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold text-ink">{dict.ideaBox.title}</h3>
              <p className="mt-1 text-sm text-muted">{dict.ideaBox.text}</p>
            </div>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-[0.9rem] font-medium text-paper transition-opacity hover:opacity-85"
            >
              {dict.ideaBox.button}
            </a>
          </div>
        </Reveal>
      </Container>
    </div>
  );
}
