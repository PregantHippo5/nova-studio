'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unauthorized = searchParams.get('unauthorized');

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push('/admin/projects');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "Compte créé. Vérifie tes emails si une confirmation est demandée, puis reconnecte-toi. N'oublie pas : il faut aussi être ajouté à la table admins pour accéder à l'admin (voir supabase/add-first-admin.sql)."
        );
      }
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'discord') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin/projects`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-8">
        <div className="mb-6 flex items-center gap-2 text-[0.95rem] font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-[0.7rem] text-paper">
            N
          </span>
          Nova Studio Admin
        </div>

        {unauthorized && (
          <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Ce compte n'a pas encore accès à l'admin. Ajoute-le à la table{' '}
            <code className="font-mono">admins</code> dans Supabase.
          </p>
        )}

        <div className="mb-5 flex gap-2">
          <button
            onClick={() => handleOAuth('google')}
            className="flex-1 rounded-lg border border-line py-2 text-sm text-ink transition-colors hover:bg-mist"
          >
            Google
          </button>
          <button
            onClick={() => handleOAuth('discord')}
            className="flex-1 rounded-lg border border-line py-2 text-sm text-ink transition-colors hover:bg-mist"
          >
            Discord
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-line" />
          ou par email
          <div className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleSubmit}>
          <label className="mb-1.5 block text-[0.8rem] font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
          />
          <label className="mb-1.5 block text-[0.8rem] font-medium">Mot de passe</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
          />

          {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
          {message && <p className="mb-3 text-xs text-emerald-700">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-4 w-full text-center text-xs text-muted hover:text-ink"
        >
          {mode === 'login' ? "Pas encore de compte ? Créer un compte" : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  );
}
