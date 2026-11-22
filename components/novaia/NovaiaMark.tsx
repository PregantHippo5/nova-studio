/**
 * Mascotte de NovaIA — PLACEHOLDER.
 * Une arche bleue glossy en attendant l'asset définitif : pour la remplacer,
 * il suffit de changer le contenu de ce composant (ou d'y mettre un <img>).
 * Elle est utilisée dans l'en-tête, l'écran d'accueil et la bulle « en train d'écrire ».
 */
import { useId } from 'react';

export default function NovaiaMark({ size = 48, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'rgb(150 175 255)' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--accent-deep))' }} />
        </linearGradient>
        <linearGradient id={`${uid}-h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* ombre au sol */}
      <ellipse cx="50" cy="90" rx="26" ry="4" fill="rgb(23 23 29)" opacity="0.12" />
      {/* arche */}
      <path d="M14 84 V50 a36 36 0 0 1 72 0 V84 h-22 V50 a14 14 0 0 0 -28 0 V84 Z" fill={`url(#${uid}-a)`} />
      {/* reflet */}
      <path d="M20 52 a30 30 0 0 1 40 -27" fill="none" stroke={`url(#${uid}-h)`} strokeWidth="5" strokeLinecap="round" />
      <circle cx="78" cy="22" r="3" style={{ fill: 'rgb(var(--sun))' }} />
    </svg>
  );
}
