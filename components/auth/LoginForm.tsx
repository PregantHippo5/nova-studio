'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@/components/ui/Container';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        router.push(`/${locale}/account`);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage(dict.loginPage.signupSuccess);
      }
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'discord') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/account`,
      },
    });
  };

  return (
    <div className="flex min-h-[70vh] items-center py-16">
      <Container className="mx-auto max-w-sm">
        <h1 className="text-display-3 font-semibold text-ink">{dict.loginPage.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{dict.loginPage.subtitle}</p>

        <div className="mt-8 flex gap-2">
          <button
            onClick={() => handleOAuth('google')}
            className="flex-1 rounded-full border border-line py-2.5 text-sm text-ink transition-colors duration-200 hover:bg-mist"
          >
            Google
          </button>
          <button
            onClick={() => handleOAuth('discord')}
            className="flex-1 rounded-full border border-line py-2.5 text-sm text-ink transition-colors duration-200 hover:bg-mist"
          >
            Discord
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-line" />
          {dict.loginPage.orEmail}
          <div className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleSubmit}>
          <label className="mb-1.5 block text-[0.8rem] font-medium text-ink">
            {dict.loginPage.emailLabel}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:outline-2 focus:outline-accent"
          />
          <label className="mb-1.5 block text-[0.8rem] font-medium text-ink">
            {dict.loginPage.passwordLabel}
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:outline-2 focus:outline-accent"
          />

          {error && <p className="mb-4 text-xs text-red-600">{error}</p>}
          {message && <p className="mb-4 text-xs text-emerald-700">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-ink py-2.5 text-sm font-medium text-paper transition-opacity duration-200 hover:opacity-85 disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? dict.loginPage.signIn : dict.loginPage.signUp}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-5 w-full text-center text-xs text-muted hover:text-ink"
        >
          {mode === 'login' ? dict.loginPage.noAccount : dict.loginPage.haveAccount}
        </button>
      </Container>
    </div>
  );
}
