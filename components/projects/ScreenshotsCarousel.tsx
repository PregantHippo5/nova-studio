'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ProjectScreenshot } from '@/lib/types';

const AUTOPLAY_MS = 4000;

export default function ScreenshotsCarousel({ screenshots }: { screenshots: ProjectScreenshot[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || screenshots.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % screenshots.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, screenshots.length]);

  if (screenshots.length === 0) return null;

  // Un clic sur un point choisit l'image et met l'auto-défilement en pause
  // un moment, pour laisser le temps de regarder sans se faire couper.
  const selectDot = (index: number) => {
    setActive(index);
    setPaused(true);
    setTimeout(() => setPaused(false), AUTOPLAY_MS * 2);
  };

  return (
    <div
      className="mt-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-mist">
        {screenshots.map((shot, i) => (
          <div
            key={shot.url + i}
            className={`absolute inset-0 transition-opacity duration-500 ease-smooth ${
              i === active ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            aria-hidden={i !== active}
          >
            <Image
              src={shot.url}
              alt={shot.alt ?? ''}
              fill
              sizes="(min-width: 1024px) 768px, 100vw"
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {screenshots.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {screenshots.map((shot, i) => (
            <button
              key={shot.url + i}
              type="button"
              onClick={() => selectDot(i)}
              aria-label={shot.alt ? `Afficher : ${shot.alt}` : `Afficher l'image ${i + 1}`}
              aria-current={i === active}
              className="group flex h-6 w-6 items-center justify-center"
            >
              <span
                className={`h-1.5 rounded-full transition-all duration-300 ease-smooth ${
                  i === active ? 'w-6 bg-ink' : 'w-1.5 bg-ink/25 group-hover:bg-ink/40'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
