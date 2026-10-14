'use client';

import { useRef } from 'react';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
} from 'framer-motion';

const COLORS = ['--c-projects', '--c-learn', '--c-games'];

function Star({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="mx-6 h-[0.6em] w-[0.6em] shrink-0 md:mx-10" aria-hidden="true">
      <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" fill={`rgb(var(${color}))`} />
    </svg>
  );
}

/** Bandeau de mots qui défile : la vitesse du scroll l'accélère, et il s'inverse quand on remonte. */
export default function Marquee({ words }: { words: string[] }) {
  const reduce = useReducedMotion();
  const base = useMotionValue(0);
  const direction = useRef(1);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 50, stiffness: 400 });
  const boost = useTransform(smooth, [-1500, 0, 1500], [-4, 0, 4], { clamp: false });
  const skew = useTransform(smooth, [-1500, 0, 1500], [6, 0, -6], { clamp: true });
  const x = useTransform(base, (v) => `${wrap(-25, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const b = boost.get();
    if (b < -0.05) direction.current = -1;
    else if (b > 0.05) direction.current = 1;
    base.set(base.get() - direction.current * (1.1 + Math.abs(b)) * (delta / 1000) * 4);
  });

  const group = (g: number) =>
    words.map((word, i) => (
      <span key={`${g}-${i}`} className="flex shrink-0 items-center">
        <span className={i % 2 === 0 ? 'text-ink' : 'text-outline text-transparent'}>{word}</span>
        <Star color={COLORS[i % COLORS.length]} />
      </span>
    ));

  return (
    <div aria-hidden="true" className="select-none overflow-hidden border-y border-line py-6 md:py-9">
      <motion.div style={{ skewX: reduce ? 0 : skew }}>
        <motion.div
          style={{ x: reduce ? 0 : x }}
          className="flex w-max whitespace-nowrap font-display text-[clamp(2.75rem,8vw,7.5rem)] font-extrabold leading-none tracking-[-0.03em]"
        >
          {[0, 1, 2, 3].map(group)}
        </motion.div>
      </motion.div>
    </div>
  );
}
