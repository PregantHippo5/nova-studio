'use client';

import { useEffect, useState } from 'react';
import { stagger, useAnimate } from 'framer-motion';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
const wordmark = 'Nova Studio'.split('');

/**
 * Intro de la première visite : une étincelle, un filet de lumière, le nom du studio,
 * puis le rideau se lève. Jouée une seule fois par session (voir ThemeScript pour le repérage).
 */
export default function Preloader() {
  const [scope, animate] = useAnimate();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    if (root.classList.contains('nova-seen')) {
      setDone(true);
      window.dispatchEvent(new Event('nova:intro-done'));
      return;
    }

    let cancelled = false;
    root.style.overflow = 'hidden';

    (async () => {
      try {
        await animate('.pl-dot', { opacity: [0, 1], scale: [0, 1] }, { duration: 0.5, ease });
        await animate('.pl-line', { scaleX: [0, 1] }, { duration: 0.6, ease });
        await animate('.pl-char', { y: ['115%', '0%'] }, { duration: 0.65, delay: stagger(0.04), ease });
        await new Promise((resolve) => setTimeout(resolve, 280));
        window.dispatchEvent(new Event('nova:intro-done'));
        await animate(
          scope.current,
          { clipPath: ['inset(0% 0% 0% 0%)', 'inset(0% 0% 100% 0%)'] },
          { duration: 0.9, ease: [0.76, 0, 0.24, 1] as [number, number, number, number] },
        );
      } catch {
        // animation interrompue (navigation, démontage) : on termine proprement
      } finally {
        root.style.overflow = '';
        try {
          sessionStorage.setItem('nova-intro', '1');
        } catch {
          // stockage indisponible : l'intro rejouera, ce n'est pas grave
        }
        root.classList.add('nova-seen');
        if (!cancelled) setDone(true);
      }
    })();

    return () => {
      cancelled = true;
      root.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;

  return (
    <div
      ref={scope}
      aria-hidden="true"
      className="nova-preloader fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 bg-paper"
    >
      <span
        className="pl-dot block h-3 w-3 rounded-full bg-ink shadow-[0_0_60px_14px_rgb(var(--accent)/0.55)]"
        style={{ opacity: 0, transform: 'scale(0)' }}
      />
      <span className="pl-line block h-px w-56 bg-ink/50" style={{ transform: 'scaleX(0)' }} />
      <div className="font-display flex text-[clamp(2.25rem,7vw,4.5rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
        {wordmark.map((char, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.12em]">
            <span className="pl-char inline-block" style={{ transform: 'translateY(115%)' }}>
              {char === ' ' ? ' ' : char}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
