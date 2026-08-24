// app/admin/(dashboard)/releases/page.tsx
'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';
import { createClient } from '@/lib/supabase/client';

type PlatformKey = 'windows' | 'macos';

interface PlatformState {
  fileName: string | null;
  downloadUrl: string | null;
  sha256: string | null;
  uploading: boolean;
  progress: number;
}

const emptyPlatformState: PlatformState = {
  fileName: null,
  downloadUrl: null,
  sha256: null,
  uploading: false,
  progress: 0,
};

const ACCEPT: Record<PlatformKey, string> = {
  windows: '.exe',
  macos: '.zip,.dmg',
};

// Calcule le SHA-256 d'un fichier directement dans le navigateur, sans
// dépendance externe — nécessaire car le fichier n'est jamais envoyé à un
// serveur qu'on contrôle (upload direct vers Vercel Blob).
async function sha256OfFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function ReleasesAdminPage() {
  const supabase = createClient();

  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [projectSlug] = useState('socle'); // seul projet desktop existant pour l'instant
  const [platforms, setPlatforms] = useState<Record<PlatformKey, PlatformState>>({
    windows: { ...emptyPlatformState },
    macos: { ...emptyPlatformState },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updatePlatform = (key: PlatformKey, patch: Partial<PlatformState>) => {
    setPlatforms((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleFileSelect = async (key: PlatformKey, file: File) => {
    setError(null);
    updatePlatform(key, {
      uploading: true,
      progress: 0,
      fileName: file.name,
      downloadUrl: null,
      sha256: null,
    });

    try {
      // Calcul du hash AVANT l'upload : si ça échoue (fichier corrompu en
      // lecture, mémoire insuffisante sur un très gros fichier...), on ne
      // lance pas un upload pour rien.
      const hash = await sha256OfFile(file);

      const pathname = `releases/${projectSlug}/${version || 'draft'}/${file.name}`;

      const blob = await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/release-upload',
        onUploadProgress: ({ percentage }) => {
          updatePlatform(key, { progress: percentage });
        },
      });

      updatePlatform(key, {
        uploading: false,
        progress: 100,
        downloadUrl: blob.url,
        sha256: hash,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur pendant l'upload.");
      updatePlatform(key, { uploading: false, progress: 0 });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!version.trim()) {
      setError('Le numéro de version est requis.');
      return;
    }
    if (!platforms.windows.downloadUrl && !platforms.macos.downloadUrl) {
      setError('Ajoute au moins un fichier (Windows ou macOS).');
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from('app_releases').insert({
      project_slug: projectSlug,
      version: version.trim(),
      notes: notes.trim() || null,
      windows_download_url: platforms.windows.downloadUrl,
      windows_sha256: platforms.windows.sha256,
      macos_download_url: platforms.macos.downloadUrl,
      macos_sha256: platforms.macos.sha256,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess(true);
    setVersion('');
    setNotes('');
    setPlatforms({ windows: { ...emptyPlatformState }, macos: { ...emptyPlatformState } });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-ink">Nouvelle release — SOCLE</h1>

      <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border border-line bg-paper p-6">
        <div>
          <label className="mb-1.5 block text-[0.8rem] font-medium">Version</label>
          <input
            required
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.3"
            className="w-full rounded-lg border border-line px-3 py-2 font-mono text-sm focus:outline-2 focus:outline-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[0.8rem] font-medium">Notes de version (optionnel)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
          />
        </div>

        {(['windows', 'macos'] as PlatformKey[]).map((key) => {
          const state = platforms[key];
          return (
            <div key={key} className="rounded-lg border border-line p-4">
              <label className="mb-1.5 block text-[0.8rem] font-medium">
                {key === 'windows' ? 'Fichier Windows (.exe)' : 'Fichier macOS (.zip pour la mise à jour auto)'}
              </label>
              <input
                type="file"
                accept={ACCEPT[key]}
                disabled={state.uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(key, file);
                }}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              />

              {state.uploading && (
                <p className="mt-2 text-xs text-muted">
                  Upload en cours... {state.progress}%
                </p>
              )}

              {state.downloadUrl && !state.uploading && (
                <div className="mt-2 text-xs text-muted">
                  <p>✓ {state.fileName}</p>
                  <p className="break-all font-mono">SHA-256 : {state.sha256}</p>
                </div>
              )}
            </div>
          );
        })}

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-green-600">Release publiée.</p>}

        <button
          type="submit"
          disabled={saving || platforms.windows.uploading || platforms.macos.uploading}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {saving ? 'Publication...' : 'Publier la release'}
        </button>
      </form>
    </div>
  );
}
