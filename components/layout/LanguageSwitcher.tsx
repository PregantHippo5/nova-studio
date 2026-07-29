'use client';

import { usePathname, useRouter } from 'next/navigation';
import { locales, Locale } from '@/lib/i18n/config';

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    const segments = pathname.split('/');
    segments[1] = next;
    router.push(segments.join('/') || `/${next}`);
  };

  return (
    <div className="flex items-center rounded-full border border-line p-0.5 font-mono text-[0.7rem] uppercase tracking-wide">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-current={l === locale}
          className={`rounded-full px-2 py-1 transition-colors duration-200 ${
            l === locale ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
