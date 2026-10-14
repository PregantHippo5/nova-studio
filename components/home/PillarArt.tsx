'use client';

import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

/* Trois petites illustrations SVG, une par pilier du studio.
   Elles n'utilisent que les couleurs du thème, donc elles suivent le mode clair/sombre. */

/* ---------- Projets : des fenêtres d'application qui s'empilent ---------- */

function ProjectsArt() {
  const windows = [
    { x: 36, y: 168, w: 224, h: 112, delay: 0, accent: false },
    { x: 92, y: 104, w: 236, h: 124, delay: 0.12, accent: false },
    { x: 140, y: 36, w: 224, h: 136, delay: 0.24, accent: true },
  ];

  return (
    <svg viewBox="0 0 400 300" className="h-full w-full text-[rgb(var(--c-projects))]" fill="none" aria-hidden="true">
      {windows.map((win) => (
        <motion.g
          key={win.x}
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: win.delay, ease: [0.16, 1, 0.3, 1] }}
        >
          <rect x={win.x} y={win.y} width={win.w} height={win.h} rx="12" className="fill-paper stroke-line" strokeWidth="1.5" />
          <circle cx={win.x + 16} cy={win.y + 16} r="3.5" className="fill-line" />
          <circle cx={win.x + 28} cy={win.y + 16} r="3.5" className="fill-line" />
          <circle cx={win.x + 40} cy={win.y + 16} r="3.5" className="fill-line" />
          <rect
            x={win.x + 18}
            y={win.y + 38}
            width={win.w * 0.46}
            height="8"
            rx="4"
            className={win.accent ? 'fill-current' : 'fill-muted'}
            opacity={win.accent ? 1 : 0.45}
          />
          <rect x={win.x + 18} y={win.y + 58} width={win.w * 0.78} height="6" rx="3" className="fill-line" />
          <rect x={win.x + 18} y={win.y + 74} width={win.w * 0.64} height="6" rx="3" className="fill-line" />
          <rect x={win.x + 18} y={win.y + 90} width={win.w * 0.3} height="6" rx="3" className="fill-line" />
        </motion.g>
      ))}
    </svg>
  );
}

/* ---------- Apprendre : une vraie réfraction (loi de Snell-Descartes) en direct ---------- */

function LearnArt() {
  const reduce = useReducedMotion();
  const theta = useMotionValue(0.62); // angle d'incidence en radians
  const n1 = 1;
  const n2 = 1.5;
  const cx = 200;
  const cy = 150;
  const len = 124;

  useAnimationFrame((time) => {
    if (reduce) return;
    theta.set(0.38 + 0.42 * (0.5 + 0.5 * Math.sin(time / 1300)));
  });

  const refracted = (t: number) => Math.asin((n1 * Math.sin(t)) / n2);

  const ix = useTransform(theta, (t) => cx - Math.sin(t) * len);
  const iy = useTransform(theta, (t) => cy - Math.cos(t) * len);
  const rx = useTransform(theta, (t) => cx + Math.sin(refracted(t)) * len);
  const ry = useTransform(theta, (t) => cy + Math.cos(refracted(t)) * len);

  return (
    <svg viewBox="0 0 400 300" className="h-full w-full text-[rgb(var(--c-learn))]" fill="none" aria-hidden="true">
      <rect x="0" y={cy} width="400" height={300 - cy} className="fill-current" opacity="0.14" />
      <line x1="0" y1={cy} x2="400" y2={cy} className="stroke-ink" strokeOpacity="0.35" strokeWidth="1.5" />
      <line x1={cx} y1="28" x2={cx} y2="272" className="stroke-muted" strokeWidth="1.2" strokeDasharray="5 5" />
      <motion.line x1={ix} y1={iy} x2={cx} y2={cy} className="stroke-ink" strokeWidth="3.5" strokeLinecap="round" />
      <motion.line x1={cx} y1={cy} x2={rx} y2={ry} className="stroke-current" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" className="fill-paper stroke-current" strokeWidth="2.5" />
      <text x="22" y="40" className="fill-muted font-mono" fontSize="14">
        n₁
      </text>
      <text x="22" y="282" className="fill-muted font-mono" fontSize="14">
        n₂ &gt; n₁
      </text>
    </svg>
  );
}

/* ---------- Jeux : une partie de raquette qui tourne en boucle ---------- */

function GamesArt() {
  const loop = { duration: 4.4, ease: 'linear' as const, repeat: Infinity };
  const paddleY = [40, 200, 40, 200, 40];

  return (
    <svg viewBox="0 0 400 300" className="h-full w-full text-[rgb(var(--c-games))]" fill="none" aria-hidden="true">
      <rect x="14" y="14" width="372" height="272" rx="14" className="stroke-line" strokeWidth="1.5" />
      <line x1="200" y1="26" x2="200" y2="274" className="stroke-line" strokeWidth="2" strokeDasharray="6 8" />

      <motion.g animate={{ y: paddleY }} transition={loop}>
        <rect x="32" y="0" width="9" height="62" rx="4.5" className="fill-ink" />
      </motion.g>
      <motion.g animate={{ y: paddleY }} transition={{ ...loop, delay: 0.05 }}>
        <rect x="359" y="0" width="9" height="62" rx="4.5" className="fill-ink" />
      </motion.g>

      <motion.g animate={{ x: [0, 280, 0], y: [0, 160, 0, 160, 0] }} transition={loop}>
        <circle cx="60" cy="70" r="8" className="fill-current" />
      </motion.g>
    </svg>
  );
}

export default function PillarArt({ kind }: { kind: string }) {
  if (kind === 'learn') return <LearnArt />;
  if (kind === 'games') return <GamesArt />;
  return <ProjectsArt />;
}
