const fr = {
  common: {
    comingSoon: 'Bientôt disponible',
  },
  meta: {
    title: 'Nova Studio — Projets, simulations et jeux',
    description:
      'Nova Studio crée des logiciels sérieux, des simulations interactives pour comprendre et des jeux. Tout est gratuit, documenté et développé en public.',
  },
  nav: {
    projects: 'Projets',
    learn: 'Apprendre',
    games: 'Jeux',
    journal: 'Journal',
    roadmap: 'Roadmap',
    support: 'Soutenir',
    account: 'Mon compte',
    login: 'Se connecter',
    menu: 'Menu',
    about: 'À propos',
  },
  status: {
    Live: 'En ligne',
    'In development': 'En développement',
    Paused: 'En pause',
    Archived: 'Archivé',
  },
  hero: {
    title: 'Des outils qui tiennent dans la durée.',
    lead: 'Logiciels sérieux, simulations pour comprendre, quelques jeux pour souffler. Gratuit, documenté, construit en public.',
    explore: 'Découvrir les projets',
    novaia: 'Essayer NovaIA',
  },
  manifesto: {
    text: 'Un socle de projets sérieux, une part pour comprendre en manipulant, une part de jeux pour souffler.',
  },
  pillars: [
    {
      key: 'projects',
      title: 'Des projets sérieux',
      text: 'Des logiciels pensés comme de vrais produits : suivis, versionnés, documentés. SOCLE est le premier.',
      cta: 'Voir les projets',
    },
    {
      key: 'learn',
      title: 'Comprendre en manipulant',
      text: 'Des simulations interactives : on change un paramètre, on observe ce qui bouge.',
      cta: 'Explorer',
    },
    {
      key: 'games',
      title: 'Des jeux pour souffler',
      text: "Des petits jeux sans prise de tête. Pas de pub, pas d'achat intégré.",
      cta: 'Jouer',
    },
  ],
  featured: {
    title: 'Projets à la une',
    description: 'Ce qu’on construit en ce moment. Chaque projet est gratuit et continue d’évoluer.',
    viewAll: 'Tous les projets',
    viewProject: 'Voir le projet',
  },
  novaiaTeaser: {
    title: 'NovaIA répond clairement, et dit quand il ne sait pas.',
    text: 'Une question de culture, un calcul, une idée à discuter. NovaIA préfère avouer un doute plutôt que d’inventer une réponse.',
    button: 'Essayer NovaIA',
    greeting: 'Salut. Qu’est-ce qu’on cherche ?',
    question: 'Un cycliste roule à 24 km/h pendant 2 h 30. Quelle distance parcourt-il ?',
    answerLead: 'Distance = vitesse × durée',
    answerResult: '24 × 2,5 = 60 km',
    placeholder: 'Pose ta question…',
  },
  journalTeaser: {
    eyebrow: 'Dernière entrée du journal',
    readMore: 'Lire le journal',
  },
  ctaSupport: {
    title: "Rien n'est à vendre ici.",
    text: 'Chaque projet de Nova Studio est gratuit. Le soutenir reste toujours facultatif.',
    button: 'Soutenir Nova Studio',
  },
  footer: {
    tagline: 'Logiciels sérieux, simulations pour comprendre, jeux pour souffler. Gratuit et construit en public.',
    studio: 'Studio',
    elsewhere: 'Ailleurs',
    contact: 'Contact',
    privacy: 'Confidentialité',
    copyright: 'Nova Studio. Tous droits réservés.',
    builtWith: 'Construit avec Next.js, en public.',
  },
  projectsPage: {
    eyebrow: 'Tous les travaux',
    title: 'Projets',
    description:
      "Tout ce que Nova Studio a publié ou est en train de construire, au même endroit. Chaque projet est gratuit.",
    categories: { all: 'Tout', Software: 'Logiciels', Games: 'Jeux', Music: 'Musique', Videos: 'Vidéos' },
  },
  projectDetail: {
    allProjects: 'Tous les projets',
    features: 'Fonctionnalités',
    versionHistory: 'Historique des versions',
    currentVersion: 'Version actuelle',
	downloadWindows: 'Télécharger pour Windows',
	downloadMac: 'Télécharger pour macOS',
	downloadAndroid: 'Android', 
	downloadIos: 'iOS',
    added: 'Ajouté',
    improved: 'Amélioré',
    fixed: 'Corrigé',
    removed: 'Retiré',
    knownIssues: 'Problèmes connus',
	windowsHint: "Lance le fichier téléchargé et suis l'installateur.",
	macosHint: "Extrais le fichier .zip, puis glisse Socle.app dans ton dossier Applications. Au premier lancement, si macOS bloque l'ouverture : va dans Réglages Système → Confidentialité et sécurité, puis clique sur « Ouvrir quand même » à côté de la mention concernant Socle (nécessaire une seule fois, macOS avertit car l'app n'est pas encore signée par un compte développeur Apple).", 
	installGuideLink: "Guide d'installation détaillé",
	
  },
  journalPage: {
    eyebrow: 'Écrit au fil de l’eau',
    title: 'Journal de développement',
    description:
      'Notes sur les décisions, les impasses et les sorties, pour chaque projet de Nova Studio.',
  },
  journalEntryPage: {
    back: 'Journal',
  },
  roadmapPage: {
    eyebrow: 'Où en sont les choses',
    title: 'Roadmap',
    description:
      "Un aperçu vivant de ce vers quoi chaque projet avance. Mis à jour au fil du travail, pas selon un calendrier.",
    stages: { Done: 'Terminé', 'In Progress': 'En cours', Planned: 'Prévu', Future: 'À venir' },
  },
  supportPage: {
    eyebrow: 'Sans pression',
    title: 'Soutenir Nova Studio',
    description:
      "Rien sur ce site n'est à vendre. Chaque projet reste gratuit, et ça ne changera pas. Si un projet vous a été utile et que vous souhaitez soutenir le temps qui y est consacré, voici comment.",
    open: 'Ouvrir',
    comingSoon: 'Bientôt disponible',
    altText:
      "Si vous préférez soutenir le studio sans rien dépenser, partager un projet à quelqu'un susceptible de l'utiliser, signaler un bug ou laisser un retour aide tout autant.",
    options: [
      { name: 'Buy Me a Coffee', description: 'Un moyen ponctuel de dire merci, sans créer de compte.' },
      { name: 'PayPal', description: 'Envoyez n’importe quel montant, en une fois ou de façon récurrente.' },
      { name: 'Stripe', description: 'Soutien mensuel récurrent, annulable à tout moment.' },
    ],
  },
  aboutPage: {
    eyebrow: 'Pourquoi ce studio existe',
    title: 'À propos de Nova Studio',
    paragraphs: [
      "Nova Studio est né d'une frustration simple : la plupart des projets personnels restent inachevés, ou sortent sans le soin qu'ils mériteraient. Ce studio existe pour faire l'inverse — traiter chaque projet avec la même exigence qu'un vrai produit.",
      "Il n'y a pas de feuille de route dictée par un business plan, pas d'investisseurs à satisfaire, pas de publicité. Cette liberté est le point de départ. Elle signifie que chaque décision — du rayon d'un bouton au choix du prochain projet à sortir — se prend pour une seule raison : parce que ça rend la chose meilleure.",
      'Le studio tient sur trois piliers : un socle de projets sérieux, une part pédagogique avec des simulations pour comprendre en manipulant, et une part de jeux pour le plaisir. Tout part du même processus : remarquer quelque chose qui mérite d’être fait, y consacrer le temps nécessaire, et le partager simplement.',
    ],
    values: [
      { title: "D'abord utile", text: "Chaque projet part d'un problème réel et précis à résoudre — pas d'une tendance à suivre." },
      { title: 'Élégant par défaut', text: "Le bon design n'est pas ajouté à la fin. Il guide les décisions dès la première." },
      { title: 'Accessible à tous', text: "Rien de ce que fait Nova Studio n'est payant. Qualité et prix ne sont pas le même axe." },
    ],
  },
  learnPage: {
    eyebrow: 'Le côté pédagogique',
    title: 'Apprendre',
    description: "Des simulations interactives pour comprendre en manipulant.",
    items: [] as { tag: string; title: string; text: string }[],
    empty: {
      title: 'Les premières simulations arrivent.',
      text: "Rien n'est encore en ligne ici. En attendant, regarde comment un rayon se plie en traversant deux milieux.",
    },
  },
  gamesPage: {
    eyebrow: 'Le côté fun',
    title: 'Jeux',
    description: "De petits jeux pour décompresser.",
    items: [
      {
        tag: 'Tycoon',
        title: 'Nova Tycoon',
        text: "Construis ton empire, monte dans le pass de saison et débloque des tenues à la roue. Solo ou en multi.",
        href: '/games/nova-tycoon/index.html',
      },
    ] as { tag: string; title: string; text: string; href?: string }[],
    empty: {
      title: 'Le premier jeu arrive.',
      text: "Rien n'est encore jouable. En attendant, la balle continue de rebondir.",
    },
  },
  ideaBox: {
    title: 'Une idée de sujet ?',
    text: 'Écris-nous ce que tu aimerais voir ici.',
    button: 'Nous écrire',
  },
  notFound: {
    code: '404',
    title: "Cette page n'existe pas.",
    text: "La page que vous cherchez a peut-être été déplacée, ou n'a jamais existé. Voici le chemin du retour.",
    button: "Retour à l'accueil",
  },
  loginPage: {
    title: 'Se connecter',
    subtitle: 'Un seul compte Nova Studio pour le site et les futures applis (comme SOCLE).',
    continueWith: 'Continuer avec',
    orEmail: 'ou par email',
    emailLabel: 'Email',
    passwordLabel: 'Mot de passe',
    signIn: 'Se connecter',
    signUp: 'Créer un compte',
    noAccount: 'Pas encore de compte ? Créer un compte',
    haveAccount: 'Déjà un compte ? Se connecter',
    signupSuccess: 'Compte créé. Vérifie tes emails si une confirmation est demandée, puis connecte-toi.',
  },
  accountPage: {
    title: 'Ton compte',
    connectedAs: 'Connecté en tant que',
    logout: 'Se déconnecter',
    backHome: "Retour à l'accueil",
  },
  installPage: {
    title: "Guide d'installation",
    subtitle: 'Socle — application de bureau',
    intro:
      "Socle n'est pas encore signée par un compte développeur Apple ou un certificat Windows (ça coûte cher pour un petit studio) — du coup ton système affiche un avertissement au premier lancement. C'est normal, pas un signe que l'app est dangereuse. Voici comment passer cette étape, sur chaque système.",
    currentVersion: 'Version actuelle',
    noRelease: "Aucune version publiée pour l'instant.",
    macosTitle: 'macOS',
    macosSteps: [
      {
        title: 'Télécharge le fichier',
        body: "Clique sur « Télécharger pour macOS » ci-dessus. Le fichier .zip arrive dans ton dossier Téléchargements.",
      },
      {
        title: 'Extrais l’application',
        body: "Double-clique sur le .zip téléchargé (certains navigateurs l'extraient automatiquement). Tu obtiens Socle.app.",
      },
      {
        title: 'Déplace-la dans Applications',
        body: 'Glisse Socle.app dans ton dossier Applications, comme pour n’importe quelle app macOS.',
      },
      {
        title: 'Premier lancement : autorise l’ouverture',
        body: "Si macOS bloque l'ouverture, va dans Réglages Système → Confidentialité et sécurité, puis clique sur « Ouvrir quand même » à côté de la mention concernant Socle. Cette étape n'est nécessaire qu'une seule fois.",
      },
    ],
    macosTroubleTitle: '« Socle.app est endommagée et ne peut pas être ouverte »',
    macosTroubleBody:
      "Ce message (différent de l'avertissement normal) apparaît parfois sur les Mac Apple Silicon (M1/M2/M3) à cause de l'attribut de quarantaine posé automatiquement par le navigateur. Corrige-le en ouvrant l'app Terminal (Applications → Utilitaires → Terminal) et en collant la ligne suivante, puis Entrée :",
    macosTroubleCommand: 'xattr -cr /Applications/Socle.app',
    macosTroubleFooter: 'Relance ensuite Socle.app normalement (clic droit → Ouvrir).',
    windowsTitle: 'Windows',
    windowsSteps: [
      {
        title: 'Télécharge le fichier',
        body: 'Clique sur « Télécharger pour Windows » ci-dessus pour récupérer le .exe.',
      },
      {
        title: 'Lance l’installateur',
        body: "Double-clique sur le fichier téléchargé. Windows SmartScreen affiche souvent « Windows a protégé votre ordinateur » — c'est la même raison que sur macOS (pas de certificat de signature payant).",
      },
      {
        title: 'Autorise l’exécution',
        body: 'Clique sur « Informations complémentaires », puis sur « Exécuter quand même ».',
      },
      {
        title: 'Suis l’installateur',
        body: 'Laisse-toi guider jusqu’au bout — Socle se lance automatiquement à la fin.',
      },
    ],
    stillStuck: 'Toujours bloqué ?',
    stillStuckBody: 'Écris-nous, on répond vite.',
  },
};

export default fr;
