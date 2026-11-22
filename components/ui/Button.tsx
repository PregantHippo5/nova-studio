import Link from 'next/link';
import { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  external?: boolean;
  /** Ajoute une flèche qui glisse d'un cran au survol. */
  arrow?: boolean;
  className?: string;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[0.92rem] font-semibold transition-all duration-200 ease-smooth hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]';

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-paper hover:shadow-[0_12px_22px_-10px_rgb(var(--ink)/0.55)]',
  secondary:
    'border border-line bg-mist text-ink hover:border-ink/30 hover:shadow-[0_12px_22px_-14px_rgb(var(--ink)/0.3)]',
  ghost: 'px-3 text-muted hover:translate-y-0 hover:text-ink',
};

function Arrow() {
  return (
    <span className="ns-arrow" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}

export default function Button({
  href,
  children,
  variant = 'primary',
  external = false,
  arrow = false,
  className = '',
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${className}`;
  const content = (
    <>
      {children}
      {arrow && <Arrow />}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
