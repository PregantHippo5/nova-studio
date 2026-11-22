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

  const index = Math.max(0, locales.indexOf(locale));

  return (
    <div
      role="group"
      aria-label="Language"
      className="relative inline-grid h-9 items-center rounded-full border border-line bg-mist p-0.5 text-[0.8rem] font-bold"
      style={{ gridTemplateColumns: `repeat(${locales.length}, minmax(0, 1fr))` }}
    >
      {/* La pastille glisse d'une langue à l'autre. */}
      <span
        aria-hidden="true"
        className="absolute bottom-0.5 left-0.5 top-0.5 rounded-full bg-ink transition-transform duration-300 ease-smooth"
        style={{
          width: `calc((100% - 4px) / ${locales.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          className={`relative z-10 rounded-full px-3 py-1.5 uppercase leading-none transition-colors duration-300 ${
            l === locale ? 'text-paper' : 'text-muted hover:text-ink'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
