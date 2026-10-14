'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import Magnetic from '@/components/fx/Magnetic';
import HeroScene from '@/components/home/HeroScene';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';

const WORDS = ['Nova', 'Studio'];
const EASE = [0.16, 1, 0.3, 1] as const;

/** Vrai quand l'intro (préchargeur) est terminée ou déjà vue, avec un filet de sécurité de 5 s. */
function useIntroDone() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (document.documentElement.classList.contains('nova-seen')) {
      setDone(true);
      return;
    }
    const finish = () => setDone(true);
    window.addEventListener('nova:intro-done', finish, { once: true });
    const timer = window.setTimeout(finish, 5000);
    return () => {
      window.removeEventListener('nova:intro-done', finish);
      window.clearTimeout(timer);
    };
  }, []);
  return done;
}

export default function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const ref = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const ready = useIntroDone();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const titleY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 140]);
  const titleScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 0.92]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.8], reduce ? [1, 1] : [1, 0]);
  const sceneY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 90]);

  // Les lettres proches du curseur se soulèvent et s'illuminent (via une variable CSS, sans recalcul de mise en page).
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const title = titleRef.current;
    if (!fine || reduce || !title) return;
    const letters = Array.from(title.querySelectorAll<HTMLElement>('[data-letter]'));
    let frame = 0;
    let px = -9999;
    let py = -9999;

    const paint = () => {
      frame = 0;
      for (const el of letters) {
        const r = el.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const p = Math.max(0, 1 - d / 260);
        el.style.setProperty('--p', (p * p).toFixed(3));
      }
    };
    const onMove = (event: PointerEvent) => {
      px = event.clientX;
      py = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      px = -9999;
      py = -9999;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduce]);

  let index = 0;

  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-center overflow-hidden pb-24 pt-28">
      <motion.div aria-hidden="true" style={{ y: sceneY }} className="absolute inset-0">
        <div className="hero-grid absolute inset-0 opacity-60" />
        <HeroScene />
      </motion.div>

      <Container className="relative">
        <motion.div style={{ y: titleY, scale: titleScale, opacity: titleOpacity }} className="origin-left">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.7, ease: EASE }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-paper/60 px-3 py-1 font-mono text-[0.7rem] text-muted backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {dict.hero.badge}
          </motion.p>

          <h1
            ref={titleRef}
            aria-label="Nova Studio"
            className="font-display font-extrabold leading-[0.86] tracking-[-0.04em] text-ink"
            style={{ fontSize: 'clamp(4.5rem, 12.5vw, 13rem)' }}
          >
            {WORDS.map((word, w) => (
              <span key={word} aria-hidden="true" className="block">
                {word.split('').map((char) => {
                  const i = index++;
                  return (
                    <span key={i} data-letter className="hero-letter inline-block">
                      <motion.span
                        className="inline-block"
                        initial={{ opacity: 0, y: '0.35em', filter: 'blur(14px)' }}
                        animate={ready ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
                        transition={{ duration: 0.9, delay: 0.06 * i + w * 0.08, ease: EASE }}
                      >
                        {char}
                      </motion.span>
                    </span>
                  );
                })}
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.8, delay: 0.7, ease: EASE }}
            className="mt-8 max-w-xl text-[1.15rem] font-medium leading-snug text-ink balance"
          >
            {dict.hero.title}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.8, delay: 0.85, ease: EASE }}
            className="mt-3 max-w-xl leading-relaxed text-muted"
          >
            {dict.hero.lead}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.8, delay: 1, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-5"
          >
            <Magnetic>
              <Button href={`/${locale}/projects`} variant="primary">
                {dict.hero.explore}
              </Button>
            </Magnetic>
            <Magnetic>
              <Button href={`/${locale}/learn`} variant="secondary">
                {dict.hero.learn}
              </Button>
            </Magnetic>
          </motion.div>
        </motion.div>
      </Container>

      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ delay: 1.6, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[0.65rem] text-muted md:flex"
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
