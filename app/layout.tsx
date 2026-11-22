import { Inter, IBM_Plex_Mono } from 'next/font/google';
import { display } from '@/lib/fonts';
import './globals.css';

// Inter reste chargée pour l'espace admin et comme police de secours ; le site public utilise la police d'affichage (lib/fonts.ts).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${mono.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">{children}</body>
    </html>
  );
}
