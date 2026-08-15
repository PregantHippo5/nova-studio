'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ConnectSocleButton({ locale }: { locale: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleClick() {
    setStatus('loading');
    setError('');
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('no-session');

      // Appel relatif (même origine que la page) — évite tout souci CORS ici,
      // contrairement à l'appel /exchange qui lui vient de l'app desktop.
      const res = await fetch('/api/app-link/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session.access_token }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'server-error');
      }
      const { code } = await res.json();

      // Déclenche l'ouverture de l'app desktop via le protocole enregistré.
      // Si Socle n'a jamais été lancé une première fois, le protocole n'est
      // pas encore enregistré côté Windows et rien ne se passera visuellement —
      // d'où le message d'erreur ci-dessous si l'utilisateur revient sur la page.
      window.location.href = `novastudio://link?code=${code}`;
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(
        locale === 'fr'
          ? "Connexion à Socle impossible. Vérifie que Socle est bien installé et lancé au moins une fois, puis réessaie."
          : 'Could not connect to Socle. Make sure Socle is installed and has been launched at least once, then try again.'
      );
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="rounded-full border border-accent-soft bg-accent-soft py-2.5 text-center text-sm font-medium text-accent transition-opacity duration-200 hover:opacity-85 disabled:opacity-60"
      >
        {status === 'loading'
          ? locale === 'fr'
            ? 'Connexion…'
            : 'Connecting…'
          : locale === 'fr'
            ? 'Connecter Socle'
            : 'Connect Socle'}
      </button>
      {status === 'error' && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
