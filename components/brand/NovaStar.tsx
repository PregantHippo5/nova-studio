'use client';

import { useEffect, useId, useRef } from 'react';

/**
 * La mascotte de Nova Studio : une étoile à quatre branches, avec ou sans visage.
 * - `face` ajoute les yeux ; `track` les fait suivre le curseur (souris uniquement).
 * - `mood` change l'expression : 'happy' (par défaut), 'think' (regarde en bas), 'lost' (yeux en croix).
 * Une seule définition, utilisée partout : logo, accueil, chargement, page introuvable, états vides.
 */
const STAR = 'M50 0 C55 34, 66 45, 100 50 C66 55, 55 66, 50 100 C45 66, 34 55, 0 50 C34 45, 45 34, 50 0 Z';

type Mood = 'happy' | 'think' | 'lost';

interface NovaStarProps {
  size?: number;
  face?: boolean;
  track?: boolean;
  mood?: Mood;
  className?: string;
  title?: string;
}

export default function NovaStar({
  size = 24,
  face = false,
  track = false,
  mood = 'happy',
  className,
  title,
}: NovaStarProps) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!face || !track) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || calm) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      const svg = svgRef.current;
      const eyes = eyesRef.current;
      if (!svg || !eyes) return;
      const r = svg.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 280);
      // Les yeux se décalent de 3 unités au maximum, dans la direction du curseur.
      eyes.style.transform = `translate(${((dx / d) * 3 * k).toFixed(2)}px, ${((dy / d) * 3 * k).toFixed(2)}px)`;
    };
    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [face, track]);

  const eyeY = mood === 'think' ? 50 : 46;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'rgb(143 168 255)' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--accent-deep))' }} />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${uid}-g)`} />
      {face && (
        <>
          {/* Reflet découpé dans la forme de l'étoile (il ne déborde jamais). */}
          <clipPath id={`${uid}-c`}>
            <path d={STAR} />
          </clipPath>
          <ellipse cx="40" cy="36" rx="13" ry="8" fill="#fff" opacity="0.16" clipPath={`url(#${uid}-c)`} />
          <g ref={eyesRef} style={{ transition: 'transform 0.12s ease-out' }}>
            {mood === 'lost' ? (
              <g stroke="#fff" strokeWidth="3.2" strokeLinecap="round">
                <path d="M37.5 41.5l9 9M46.5 41.5l-9 9" />
                <path d="M53.5 41.5l9 9M62.5 41.5l-9 9" />
              </g>
            ) : (
              <>
                <ellipse className="ns-eye" cx="42" cy={eyeY} rx="4.3" ry="7.6" fill="#fff" />
                <ellipse className="ns-eye" cx="58" cy={eyeY} rx="4.3" ry="7.6" fill="#fff" />
              </>
            )}
          </g>
        </>
      )}
    </svg>
  );
}
