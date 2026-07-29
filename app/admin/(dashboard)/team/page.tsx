import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminTeamPage() {
  const supabase = await createClient();
  const { data: admins } = await supabase.from('admins').select('email, created_at').order('created_at');

  return (
    <div className="max-w-xl">
      <div className="mb-7">
        <h1 className="text-xl font-semibold">Équipe</h1>
        <p className="mt-1 text-sm text-muted">Les comptes ayant accès à cet espace admin.</p>
      </div>

      <div className="mb-8 flex flex-col divide-y divide-line rounded-2xl border border-line bg-paper">
        {(admins ?? []).map((a) => (
          <div key={a.email} className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {a.email.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm">{a.email}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">
        <p className="mb-2 font-medium text-ink">Ajouter un second admin (pour l'instant, manuel)</p>
        <p className="mb-3 leading-relaxed">
          La personne doit d'abord créer un compte sur{' '}
          <code className="rounded bg-mist px-1 py-0.5 font-mono text-xs">/admin/login</code> (email, Google ou
          Discord). Ensuite, dans Supabase → SQL Editor, lance :
        </p>
        <pre className="overflow-x-auto rounded-lg bg-mist p-3 font-mono text-xs">
{`insert into public.admins (id, email)
select id, email from auth.users
where email = 'son-email@example.com';`}
        </pre>
        <p className="mt-3 leading-relaxed">
          Un bouton "Inviter par email" directement ici est possible plus tard — il demande une clé Supabase
          supplémentaire à garder secrète côté serveur.
        </p>
      </div>
    </div>
  );
}
