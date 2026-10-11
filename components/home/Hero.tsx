'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export default function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // Chaque calque bouge à sa propre vitesse pendant le scroll : c'est ça qui crée la profondeur.
  const blobA = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 180]);
  const blobB = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -140]);
  const grid = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 70]);
  const text = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 90]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.75], reduce ? [1, 1] : [1, 0]);

  return (
    <section ref={ref} className="relative flex min-h-[88vh] items-center overflow-hidden py-24">
      <motion.div aria-hidden="true" style={{ y: grid }} className="hero-grid pointer-events-none absolute inset-0" />
      <motion.div
        aria-hidden="true"
        style={{ y: blobA, background: 'rgb(var(--accent) / 0.2)' }}
        className="pointer-events-none absolute -right-24 top-4 h-[26rem] w-[26rem] rounded-full blur-3xl"
      />
      <motion.div
        aria-hidden="true"
        style={{ y: blobB, background: 'rgb(var(--accent) / 0.12)' }}
        className="pointer-events-none absolute -left-32 bottom-0 h-[22rem] w-[22rem] rounded-full blur-3xl"
      />

      <Container className="relative">
        <motion.div style={{ y: text, opacity: textOpacity }}>
          <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl">
            <motion.p
              variants={item}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-paper/60 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-muted backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {dict.hero.badge}
            </motion.p>

            <motion.h1 variants={item} className="text-display-1 font-semibold text-ink balance">
              {dict.hero.title}
            </motion.h1>

            <motion.p variants={item} className="mt-6 max-w-xl text-[1.1rem] leading-relaxed text-muted">
              {dict.hero.lead}
            </motion.p>

            <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-4">
              <Button href={`/${locale}/projects`} variant="primary">
                {dict.hero.explore}
              </Button>
              <Button href={`/${locale}/learn`} variant="secondary">
                {dict.hero.learn}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </Container>

      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted md:flex"
      >
        {dict.hero.scroll}
        <motion.span
          animate={reduce ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="block h-6 w-px bg-muted"
        />
      </motion.div>
    </section>
  );
}
