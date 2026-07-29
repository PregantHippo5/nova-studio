interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: SectionHeadingProps) {
  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && (
        <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-accent">
          {eyebrow}
        </p>
      )}
      <h2 className="text-display-2 font-semibold text-ink balance">{title}</h2>
      {description && (
        <p className="mt-4 text-[1.05rem] leading-relaxed text-muted">{description}</p>
      )}
    </div>
  );
}
