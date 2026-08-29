'use client';

import { ReactNode } from 'react';

interface ProjectCoverMediaProps {
  gradient: [string, string];
  videoUrl?: string;
  posterUrl?: string;
  children: ReactNode;
}

/**
 * Hero of a project page. When the project has a cover video, it plays
 * muted / looped / inline behind the header content, in place of the flat
 * gradient. The gradient always renders underneath (instant paint while the
 * video loads, and the fallback when there's no video at all).
 */
export default function ProjectCoverMedia({
  gradient,
  videoUrl,
  posterUrl,
  children,
}: ProjectCoverMediaProps) {
  return (
    <div
      className="relative flex h-64 items-end overflow-hidden md:h-80"
      style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      {videoUrl && (
        <>
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={videoUrl}
            poster={posterUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
          {/* Voile pour garder le texte du header (lien retour, titre)
              lisible par-dessus la vidéo, quel que soit son contenu. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/0" />
        </>
      )}
      <div className={`relative z-10 w-full ${videoUrl ? 'text-white' : ''}`}>{children}</div>
    </div>
  );
}
