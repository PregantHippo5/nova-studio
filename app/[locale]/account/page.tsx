import { redirect } from 'next/navigation';
import Container from '@/components/ui/Container';
import NovaStar from '@/components/brand/NovaStar';
import LogoutButton from '@/components/auth/LogoutButton';
import ConnectSocleButton from '@/components/account/ConnectSocleButton';
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
      <Container className="mx-auto max-w-md">
        <div className="ns-card p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-xl font-extrabold text-accent-deep dark:text-accent">
              {(user.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <span className="ns-float">
              <NovaStar size={44} face track />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-ink">{dict.accountPage.title}</h1>
            {admin && (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.75rem] font-bold text-accent-deep dark:text-accent">
                Admin
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {dict.accountPage.connectedAs} <span className="text-ink">{user.email}</span>
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <ConnectSocleButton locale={locale} />
            {admin && (
              <a
                href="/admin/projects"
                className="rounded-full bg-accent-soft py-2.5 text-center text-sm font-semibold text-accent-deep transition-all duration-200 hover:-translate-y-0.5 dark:text-accent"
              >
                {locale === 'fr' ? "Aller à l'espace admin" : 'Go to admin'}
              </a>
            )}
            <LogoutButton locale={locale} label={dict.accountPage.logout} />
            <a
              href={`/${locale}`}
              className="rounded-full border border-line py-2.5 text-center text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50"
            >
              {dict.accountPage.backHome}
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
}

