-- À lancer APRÈS avoir créé ton compte (email/mot de passe, Google ou Discord)
-- une première fois sur le site, via la page /admin/login (bouton "Créer un compte").
--
-- Remplace l'email ci-dessous par celui avec lequel tu t'es inscrit, puis lance
-- cette requête dans Supabase → SQL Editor. Ça t'ajoute à la liste des admins
-- autorisés à écrire depuis /admin.

insert into public.admins (id, email)
select id, email from auth.users where email = 'ton-email@example.com'
on conflict (id) do nothing;

-- Pour ajouter un deuxième admin plus tard, une fois que cette personne a créé
-- son compte sur /admin/login, relance la même requête avec son email.
