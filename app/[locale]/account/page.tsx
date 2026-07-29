import { redirect } from 'next/navigation';
import Container from '@/components/ui/Container';
import LogoutButton from '@/components/auth/LogoutButton';
import { createClient } from '@/lib/supabase/server';
import { isLocale, defaultLocale, Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dict = getDictionary(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-[70vh] items-center py-16">
      <Container className="mx-auto max-w-sm">
        <div className="rounded-2xl border border-line p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
            {(user.email ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-ink">{dict.accountPage.title}</h1>
            {admin && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wide text-accent">
                Admin
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {dict.accountPage.connectedAs} <span className="text-ink">{user.email}</span>
          </p>

          <div className="mt-6 flex flex-col gap-2">
            {admin && (
              <a
                href="/admin/projects"
                className="rounded-full border border-accent-soft bg-accent-soft py-2.5 text-center text-sm font-medium text-accent transition-opacity duration-200 hover:opacity-85"
              >
                {locale === 'fr' ? "Aller à l'espace admin" : 'Go to admin'}
              </a>
            )}
            <LogoutButton locale={locale} label={dict.accountPage.logout} />
            <a
              href={`/${locale}`}
              className="rounded-full border border-line py-2.5 text-center text-sm text-ink transition-colors duration-200 hover:bg-mist"
            >
              {dict.accountPage.backHome}
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
}
