'use client';

import { useEffect, useRef } from 'react';

/**
 * L'icône et le titre de l'onglet racontent ce que fait NovaIA, pour pouvoir changer de fenêtre :
 * - elle écrit : l'étoile a un point qui tourne autour d'elle (le titre passe à « NovaIA écrit… ») ;
 * - elle a répondu : pastille verte avec une coche (le titre passe à « Réponse prête »), jusqu'au retour sur l'onglet ;
 * - erreur : pastille orange avec un « ! ».
 * Les icônes sont des SVG générés ici ; l'icône d'origine du site est remise en quittant la page.
 */
const STAR = 'M50 0 C55 34, 66 45, 100 50 C66 55, 55 66, 50 100 C45 66, 34 55, 0 50 C34 45, 45 34, 50 0 Z';
const WRAP = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8FA8FF"/><stop offset="1" stop-color="#2641C9"/></linearGradient></defs>${inner}</svg>`;
const BASE = `<path d="${STAR}" fill="url(#g)"/>`;
const url = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const ORBIT: [number, number][] = [[84, 16], [88, 84], [16, 88], [12, 14]];
const FRAMES = ORBIT.map(([x, y]) => url(WRAP(`${BASE}<circle cx="${x}" cy="${y}" r="11" fill="#F2C94C"/>`)));
const IDLE = url(WRAP(BASE));
const DONE = url(
  WRAP(`${BASE}<circle cx="76" cy="76" r="24" fill="#26AA82" stroke="#fff" stroke-width="5"/><path d="M65 76l8 8 14-16" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`)
);
const FAIL = url(
  WRAP(`${BASE}<circle cx="76" cy="76" r="24" fill="#EB8232" stroke="#fff" stroke-width="5"/><path d="M76 64v14" stroke="#fff" stroke-width="7" stroke-linecap="round"/><circle cx="76" cy="88" r="4" fill="#fff"/>`)
);

type Mode = 'idle' | 'working' | 'done' | 'fail';

export interface TabLabels {
  working: string;
  done: string;
  fail: string;
}

export function useTabStatus(working: boolean, event: { n: number; error: boolean }, labels: TabLabels) {
  const mode = useRef<Mode>('idle');
  const own = useRef<HTMLLinkElement | null>(null);
  const saved = useRef<HTMLLinkElement[]>([]);
  const baseTitle = useRef('');
  const timer = useRef<number | null>(null);
  const flash = useRef<number | null>(null);
  const frame = useRef(0);
  const lab = useRef(labels);
  lab.current = labels;

  const setIcon = (href: string) => {
    if (!own.current) {
      saved.current = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
      saved.current.forEach((l) => l.remove());
      const l = document.createElement('link');
      l.rel = 'icon';
      l.type = 'image/svg+xml';
      document.head.appendChild(l);
      own.current = l;
    }
    own.current.href = href;
  };

  const stopTimers = () => {
    if (timer.current) window.clearInterval(timer.current);
    if (flash.current) window.clearTimeout(flash.current);
    timer.current = flash.current = null;
  };

  const toIdle = () => {
    stopTimers();
    mode.current = 'idle';
    if (own.current) setIcon(IDLE);
    document.title = baseTitle.current;
  };

  useEffect(() => {
    baseTitle.current = document.title;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (mode.current === 'done' || mode.current === 'fail')) {
        flash.current = window.setTimeout(toIdle, 1500); // on laisse voir la coche un instant
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      stopTimers();
      document.title = baseTitle.current;
      own.current?.remove();
      saved.current.forEach((l) => document.head.appendChild(l));
      own.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // elle écrit
  useEffect(() => {
    if (working) {
      stopTimers();
      mode.current = 'working';
      document.title = `✍ ${lab.current.working}`;
      frame.current = 0;
      setIcon(FRAMES[0]);
      timer.current = window.setInterval(() => {
        frame.current = (frame.current + 1) % FRAMES.length;
        setIcon(FRAMES[frame.current]);
      }, 450);
    } else if (mode.current === 'working') {
      toIdle(); // interrompu sans réponse (bouton stop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [working]);

  // elle a fini
  useEffect(() => {
    if (event.n === 0) return;
    stopTimers();
    mode.current = event.error ? 'fail' : 'done';
    setIcon(event.error ? FAIL : DONE);
    document.title = event.error ? `⚠ ${lab.current.fail}` : `✓ ${lab.current.done}`;
    if (document.visibilityState === 'visible') flash.current = window.setTimeout(toIdle, 2500);
    // sinon on garde la coche jusqu'au retour sur l'onglet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.n]);
}
