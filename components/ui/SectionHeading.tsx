interface SectionHeadingProps {
  /** Conservé pour compatibilité avec les pages existantes : le nouveau design n'affiche plus de sur-titre. */
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}

export default function SectionHeading({ title, description, align = 'left' }: SectionHeadingProps) {
  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      <h2 className="text-display-2 font-extrabold tracking-tight text-ink balance">{title}</h2>
      {description && (
        <p className="mt-4 text-[1.05rem] leading-relaxed text-muted">{description}</p>
      )}
    </div>
  );
}
