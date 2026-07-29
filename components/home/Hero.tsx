'use client';

import { motion } from 'framer-motion';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export default function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="relative overflow-hidden pb-20 pt-24 md:pb-28 md:pt-36">
      <Container>
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl">
          <motion.p
            variants={item}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-muted"
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
            <Button href={`/${locale}/support`} variant="secondary">
              {dict.hero.support}
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
