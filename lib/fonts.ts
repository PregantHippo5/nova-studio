import { Plus_Jakarta_Sans } from 'next/font/google';

// Police unique du site (titres et texte) : ronde, lisible, avec du caractère en gras.
// Branchée sur la variable --font-display, posée sur <html> dans app/layout.tsx.
export const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
