import { Syne } from 'next/font/google';

// Police d'affichage (titres géants, intro, bandeau). Large et un peu étrange : elle porte la personnalité du studio.
// Le corps du site garde Inter, chargé dans app/layout.tsx.
export const display = Syne({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});
