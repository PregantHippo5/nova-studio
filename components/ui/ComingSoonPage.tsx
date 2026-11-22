import Link from 'next/link';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import NovaStar from '@/components/brand/NovaStar';
import { CONTACT_EMAIL } from '@/lib/site';
import { Dictionary } from '@/lib/i18n/dictionaries';

interface Item {
  tag: string;
  title: string;
  text: string;
  href?: string;
}

interface ComingSoonPageProps {
  dict: Dictionary;
  eyebrow: string;
  title: string;
  description: string;
  items: Item[];
  kind: 'learn' | 'games';
  empty: { title: string; text: string };
}

/** Page « vitrine » partagée par Apprendre et Jeux tant qu'il n'y a pas de contenu publié. */
export default function ComingSoonPage({ dict, title, description, items, kind, empty }: ComingSoonPageProps) {
  const color = kind === 'learn' ? 'var(--c-learn)' : 'var(--c-games)';

  return (
    <div className="py-16 md:py-24">
      <Container>
        <SectionHeading title={title} description={description} />

        {items.length === 0 && (
          <div className="ns-card mt-12 grid items-center gap-8 p-8 md:grid-cols-[auto_1fr] md:gap-12 md:p-12">
            <div className="ns-float flex justify-center md:justify-start">
              <NovaStar size={110} face mood="think" />
            </div>
            <div>
              <h2 className="text-display-3 font-extrabold tracking-tight text-ink balance">{empty.title}</h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted">{empty.text}</p>
            </div>
          </div>
        )}

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {items.map((item) => {
            const card = (
              <div className="ns-card ns-card-link flex h-full flex-col gap-4 p-7">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-[0.8rem] font-bold"
                    style={{ background: `rgb(${color} / 0.14)`, color: `rgb(${color})` }}
                  >
                    {item.tag}
                  </span>
                  {!item.href && (
                    <span className="text-[0.8rem] font-semibold text-muted">{dict.common.comingSoon}</span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold tracking-tight text-ink">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.text}</p>
              </div>
            );
            if (!item.href) return <div key={item.title}>{card}</div>;
            return item.href.startsWith('/games/') ? (
              <a key={item.title} href={item.href} target="_blank" rel="noopener" className="group block h-full">
                {card}
              </a>
            ) : (
              <Link key={item.title} href={item.href} className="group block h-full">
                {card}
              </Link>
            );
          })}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-5 rounded-[22px] bg-accent-soft p-8 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-ink">{dict.ideaBox.title}</h3>
            <p className="mt-1 text-sm text-muted">{dict.ideaBox.text}</p>
          </div>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-[0.92rem] font-semibold text-paper transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_22px_-10px_rgb(var(--ink)/0.55)] active:translate-y-0 active:scale-[0.97]"
          >
            {dict.ideaBox.button}
          </a>
        </div>
      </Container>
    </div>
  );
}
