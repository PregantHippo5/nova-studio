'use client';

import { useEffect } from 'react';

/** Suit le réglage clair/sombre de l'appareil tant que la personne n'a pas choisi elle-même avec le bouton. */
export default function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem('nova-theme')) return;
      } catch {
        // stockage indisponible : on suit l'appareil
      }
      document.documentElement.classList.toggle('dark', event.matches);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return null;
}
