'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import NovaStar from '@/components/brand/NovaStar';

interface NovaiaPeekProps {
  href: string;
  greeting: string;
  question: string;
  answerLead: string;
  answerResult: string;
  placeholder: string;
}

/**
 * Aperçu vivant de NovaIA sur l'accueil : quand la carte entre dans l'écran, la question arrive,
 * NovaIA « écrit », puis la réponse apparaît. Une seule fois, et sans mouvement si l'appareil le demande.
 */
export default function NovaiaPeek({
  href,
  greeting,
  question,
  answerLead,
  answerResult,
  placeholder,
}: NovaiaPeekProps) {
  const ref = useRef<HTMLDivElement>(null);
  // 0 = salutation seule, 1 = question, 2 = NovaIA écrit, 3 = réponse
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setStep(3);
      return;
    }

    const timers: number[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        timers.push(window.setTimeout(() => setStep(1), 500));
        timers.push(window.setTimeout(() => setStep(2), 1700));
        timers.push(window.setTimeout(() => setStep(3), 3000));
      },
      { threshold: 0.55 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div ref={ref} className="ns-card p-5 md:p-6">
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <NovaStar size={32} face mood={step === 2 ? 'think' : 'happy'} />
        <span className="font-extrabold tracking-tight text-ink">NovaIA</span>
      </div>

      <div className="flex min-h-[250px] flex-col gap-3 py-5" aria-live="polite">
        <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-paper px-4 py-3 text-[0.95rem] text-ink">
          {greeting}
        </p>

        {step >= 1 && (
          <p className="ns-pop ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-[0.95rem] text-paper">
            {question}
          </p>
        )}

        {step === 2 && (
          <p className="ns-pop flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-md bg-paper px-4 py-4" aria-label="…">
            <span className="ns-typing-dot" />
            <span className="ns-typing-dot" style={{ animationDelay: '0.15s' }} />
            <span className="ns-typing-dot" style={{ animationDelay: '0.3s' }} />
          </p>
        )}

        {step >= 3 && (
          <div className="ns-pop max-w-[85%] rounded-2xl rounded-bl-md bg-paper px-4 py-3 text-[0.95rem] text-ink">
            <p className="text-muted">{answerLead}</p>
            <p className="mt-1 text-lg font-extrabold tracking-tight text-accent">{answerResult}</p>
          </div>
        )}
      </div>

      <Link
        href={href}
        className="group flex items-center justify-between rounded-full border border-line bg-paper py-2 pl-5 pr-2 text-[0.9rem] text-muted transition-colors duration-200 hover:border-ink/30"
      >
        <span>{placeholder}</span>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition-transform duration-200 group-hover:scale-105"
          aria-hidden="true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>
    </div>
  );
}
