'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import PillarArt from '@/components/home/PillarArt';
import { Locale } from '@/lib/i18n/config';

interface Pillar {
  key: string;
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
}

const paths: Record<string, string> = {
  projects: 'projects',
  learn: 'learn',
  games: 'games',
};

/**
 * Section « collée » façon Apple : la section reste fixe à l'écran
 * et son contenu change pendant qu'on descend la page.
 */
export default function StickyShowcase({ pillars, locale }: { pillars: Pillar[]; locale: Locale }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const index = Math.min(pillars.length - 1, Math.max(0, Math.floor(value * pillars.length)));
    setActive((previous) => (previous === index ? previous : index));
  });

  const current = pillars[active];

  return (
    <section
      ref={ref}
      // +1 écran : la partie collée occupe elle-même 100vh, donc chaque pilier garde un écran de scroll complet.
      style={{ height: `${(pillars.length + 1) * 100}vh` }}
      className="relative border-t border-line"
    >
      <div className="sticky top-0 flex h-screen items-center pt-16">
        <Container className="grid w-full items-center gap-8 md:grid-cols-[1fr_1.1fr] md:gap-16">
          <div className="order-2 min-h-[17rem] md:order-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.key}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-accent">
                  {current.eyebrow}
                </p>
                <h2 className="text-display-2 font-semibold text-ink balance">{current.title}</h2>
                <p className="mt-4 max-w-md text-[1.05rem] leading-relaxed text-muted">{current.text}</p>
                <Button
                  href={`/${locale}/${paths[current.key] ?? 'projects'}`}
                  variant="secondary"
                  className="mt-8"
                >
                  {current.cta}
                </Button>
              </motion.div>
            </AnimatePresence>

            <div className="mt-10 flex items-center gap-3" aria-hidden="true">
              {pillars.map((pillar, i) => (
                <span
                  key={pillar.key}
                  className={`h-1 rounded-full transition-all duration-500 ease-smooth ${
                    i === active ? 'w-10 bg-accent' : 'w-4 bg-line'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="order-1 md:order-2" aria-hidden="true">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-line bg-accent-soft">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.key}
                  className="absolute inset-0 p-4 md:p-8"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.03 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PillarArt kind={current.key} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Container>
      </div>

      {/* Version lisible par les lecteurs d'écran : les trois piliers, sans dépendre du scroll. */}
      <ul className="sr-only">
        {pillars.map((pillar) => (
          <li key={pillar.key}>
            {pillar.title} — {pillar.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
