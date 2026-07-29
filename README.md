# Nova Studio

Site officiel de Nova Studio — Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000

Pour un build de production :

```bash
npm run build
npm run start
```

## Internationalisation (FR / EN)

Le site est bilingue via le routing Next.js (`/fr/...` et `/en/...`).

```
middleware.ts                    Redirige "/" vers "/fr" ou "/en" selon la langue du
                                  navigateur (ou le cookie NEXT_LOCALE si déjà choisi)
lib/i18n/
  config.ts                      Langues supportées (fr, en), langue par défaut (fr)
  dictionaries/fr.ts              Tous les textes de l'interface, en français
  dictionaries/en.ts              Idem, en anglais (même structure, typée contre fr)
  dictionaries.ts                 getDictionary(locale) → charge le bon dictionnaire
app/[locale]/...                 Toutes les pages vivent sous ce segment dynamique
```

Chaque page est un composant serveur qui lit `params.locale`, charge le dictionnaire
correspondant via `getDictionary(locale)`, et passe les textes traduits aux composants.
Le contenu des projets et du journal (`lib/data/*.ts`) utilise un type `Localized<T>`
(`{ fr: T; en: T }`) pour stocker les deux langues côte à côte.

**Changer de langue** : le sélecteur FR/EN dans la navbar (`LanguageSwitcher.tsx`)
change l'URL courante et mémorise le choix dans un cookie pendant un an.

**Ajouter une langue** : ajouter le code dans `locales` (`lib/i18n/config.ts`), créer
un nouveau fichier dictionnaire, l'enregistrer dans `dictionaries.ts`, puis ajouter la
traduction correspondante dans chaque entrée de `lib/data/projects.ts` et `journal.ts`.

## Architecture

```
app/
  [locale]/
    layout.tsx              Layout racine : polices, navbar, footer, texture de grain
    page.tsx                Page d'accueil (hero, projets à la une, philosophie, CTA support)
    projects/
      page.tsx               Liste de tous les projets, filtrable par catégorie
      [slug]/page.tsx         Page produit dynamique (description, features, liens, changelog)
    journal/
      page.tsx               Liste du journal de développement
      [slug]/page.tsx         Article de journal individuel
    roadmap/page.tsx          Roadmap en 4 colonnes (Done / In Progress / Planned / Future)
    support/page.tsx          Page de soutien (Buy Me a Coffee, PayPal, Stripe)
    about/page.tsx             Page à propos / philosophie
    not-found.tsx              404 personnalisée
  globals.css                Design tokens (couleurs clair/sombre), styles de base
middleware.ts                Détection de langue et redirection /fr /en

components/
  layout/                   Navbar, Footer, ThemeToggle (dark mode)
  ui/                       Button, Container, SectionHeading, StatusBadge — primitives réutilisées partout
  home/                     Hero, FeaturedProjects — sections propres à l'accueil
  projects/                 ProjectCard, ProjectsGrid — affichage des projets

lib/
  types.ts                  Types partagés (Project, JournalEntry, RoadmapItem, ...)
  data/
    projects.ts              **Toutes les données des projets vivent ici**
    journal.ts                Entrées du journal + éléments de la roadmap
```

## Système de design

- **Couleurs** : fond quasi blanc (`paper`), encre (`ink`), gris neutre (`muted`), un unique accent
  indigo (`accent`) utilisé avec parcimonie — jamais de glow, jamais de néon.
- **Typographie** : Inter pour le texte, IBM Plex Mono pour les métadonnées (dates, versions,
  labels de statut) — un clin d'œil à l'esthétique changelog/GitHub Releases.
- **Mode sombre** : géré via une classe `.dark` sur `<html>`, togglée par `ThemeToggle`
  et persistée dans `localStorage`.
- **Mouvement** : Framer Motion pour les animations d'entrée (fade + translate discret),
  les micro-interactions au survol des cartes, et l'indicateur de lien actif dans la navbar.
  `prefers-reduced-motion` est respecté globalement (voir `globals.css`).

## Ajouter un nouveau projet

Toute la logique d'affichage (page d'accueil, page /projects, page produit, cartes) est
générique. Pour ajouter un projet, il suffit d'ajouter un objet dans
`lib/data/projects.ts` :

```ts
{
  slug: 'mon-projet',
  name: 'Mon Projet',
  category: 'Software', // 'Software' | 'Games' | 'Music' | 'Videos'
  status: 'In development',
  tagline: 'Une phrase courte et claire.',
  description: 'Description complète.',
  cover: { gradient: ['#EDEBFF', '#F6F5FF'], label: 'Mon Projet' },
  links: [{ label: 'GitHub', href: '#', kind: 'secondary' }],
}
```

La page `/projects/mon-projet` est générée automatiquement, ainsi que sa carte sur
l'accueil et sur `/projects`. Aucune modification de composant n'est nécessaire.

## Ajouter une entrée de journal ou un élément de roadmap

Même logique dans `lib/data/journal.ts`, avec les tableaux `journalEntries` et `roadmap`.

## Remplacer les images

Les couvertures de projets utilisent actuellement des dégradés CSS en guise de placeholder
premium neutre. Pour utiliser de vraies images, remplacer le bloc `cover` par un composant
`next/image` dans `components/projects/ProjectCard.tsx` et `app/projects/[slug]/page.tsx`.

## Notes

- Le build a été vérifié (`npm run build`) — 16 routes statiques générées sans erreur.
- Les liens externes (Steam, Spotify, GitHub, PayPal, etc.) dans `lib/data/*.ts` sont des
  placeholders (`#`) à remplacer par les vraies URLs.
