import Link from 'next/link';
import { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  external?: boolean;
  className?: string;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[0.9rem] font-medium transition-all duration-300 ease-smooth focus-visible:outline-2 focus-visible:outline-offset-2';

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-paper hover:opacity-85 active:opacity-75',
  secondary:
    'border border-line text-ink hover:border-ink/40 hover:bg-mist',
  ghost: 'text-muted hover:text-ink',
};

export default function Button({
  href,
  children,
  variant = 'primary',
  external = false,
  className = '',
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${className}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
