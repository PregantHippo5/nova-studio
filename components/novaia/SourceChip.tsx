'use client';

import { useState } from 'react';
import { safeHost, type Source } from '@/lib/novaia/sources';

/** Lien vers une source, avec l'icône du site (récupérée par NOTRE serveur : le navigateur ne contacte jamais le site cité pour l'icône). */
export default function SourceChip({ source }: { source: Source }) {
  const [broken, setBroken] = useState(false);
  let host: string | null = null;
  try {
    host = safeHost(new URL(source.url).hostname);
  } catch {
    host = null;
  }
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="nv-glass inline-flex max-w-[15rem] items-center gap-1.5 truncate rounded-full py-0.5 pl-1.5 pr-3 transition-colors hover:text-accent"
      title={host ? `${source.title} — ${host}` : source.title}
    >
      {host && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/novaia/favicon?d=${encodeURIComponent(host)}`}
          alt=""
          width={14}
          height={14}
          loading="lazy"
          decoding="async"
          className="h-3.5 w-3.5 shrink-0 rounded-[3px]"
          onError={() => setBroken(true)}
        />
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0" aria-hidden>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c2.6 2.8 2.6 14.2 0 17M12 3.5c-2.6 2.8-2.6 14.2 0 17" />
        </svg>
      )}
      <span className="truncate">{source.title}</span>
    </a>
  );
}
