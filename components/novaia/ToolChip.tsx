import type { ToolName } from '@/lib/novaia/sources';

// Petites icônes au trait fin, monochromes (même esprit que le reste de l'interface) : elles reprennent la couleur du texte.
const PATHS: Record<ToolName, React.ReactNode> = {
  calcul: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
    </>
  ),
  maths: <path d="M17.5 5h-11l6 7-6 7h11" />,
  trace: (
    <>
      <path d="M4 4v16h16" />
      <path d="M7 15c2.2-6.5 4.2-8 6-6s3 3 4.5-1" />
    </>
  ),
  date: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  unites: <path d="M4 9h13M13.5 5.5 17 9l-3.5 3.5M20 15H7M10.5 11.5 7 15l3.5 3.5" />,
};

const LABELS: Record<ToolName, { fr: string; en: string }> = {
  calcul: { fr: 'Calculatrice', en: 'Calculator' },
  maths: { fr: 'Calcul formel', en: 'Symbolic math' },
  trace: { fr: 'Courbe tracée', en: 'Plot' },
  date: { fr: 'Horloge', en: 'Clock' },
  unites: { fr: 'Conversion', en: 'Conversion' },
};

/** Pastille « outil utilisé » : icône au trait fin + nom de l'outil. */
export default function ToolChip({ tool, locale }: { tool: ToolName; locale: 'fr' | 'en' }) {
  const label = LABELS[tool][locale];
  return (
    <span
      className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-line/70 px-2.5 py-0.5 text-[0.7rem] font-medium text-muted"
      title={label}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {PATHS[tool]}
      </svg>
      {label}
    </span>
  );
}
