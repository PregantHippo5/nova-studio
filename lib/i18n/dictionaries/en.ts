import type fr from './fr';

const en: typeof fr = {
  common: {
    comingSoon: 'Coming soon',
  },
  meta: {
    title: 'Nova Studio — Projects, simulations and games',
    description:
      'Nova Studio is two students in French preparatory classes building serious projects, interactive simulations to learn from, and games — free, made carefully.',
  },
  nav: {
    projects: 'Projects',
    learn: 'Learn',
    games: 'Games',
    journal: 'Journal',
    roadmap: 'Roadmap',
    support: 'Support',
    about: 'About',
  },
  status: {
    Live: 'Live',
    'In development': 'In development',
    Paused: 'Paused',
    Archived: 'Archived',
  },
  hero: {
    badge: 'Made by two prépa students',
    title: 'Serious projects, simulations to understand, games to unwind.',
    lead: 'Nova Studio is two students in French preparatory classes (prépa) building real software, interactive simulations and a few games outside of class. Everything is free, and everything is built in the open.',
    explore: 'Explore projects',
    learn: 'See the simulations',
    scroll: 'Scroll',
  },
  marquee: ['Serious projects', 'Simulations', 'Games'],
  manifesto: {
    eyebrow: 'The idea',
    text: 'A base of serious projects, an educational side to understand by playing with things, and a side of games for fun. All of it built between prépa classes, free and in public.',
  },
  pillars: [
    {
      key: 'projects',
      eyebrow: 'The foundation',
      title: 'Serious projects',
      text: 'Software designed like real products: tracked, versioned, documented. It is the backbone of the studio, starting with SOCLE.',
      cta: 'See the projects',
    },
    {
      key: 'learn',
      eyebrow: 'The educational side',
      title: 'Understand by doing',
      text: 'Interactive simulations to watch a concept move instead of just reading about it: change a parameter, see what happens.',
      cta: 'Explore Learn',
    },
    {
      key: 'games',
      eyebrow: 'The fun side',
      title: 'Games to unwind',
      text: 'Small, no-fuss games made for a break between study sessions. No ads, no in-app purchases.',
      cta: 'See the games',
    },
  ],
  follow: {
    eyebrow: 'Follow the studio',
    title: 'We also show our work on video.',
    text: 'Behind the scenes, progress and news: find us on our channels.',
  },
  featured: {
    eyebrow: 'Selected work',
    title: 'Featured projects',
    description:
      "A handful of things we're currently building or maintaining. Every project ships free, and every project keeps shipping.",
    viewAll: 'View all projects →',
    viewProject: 'View project',
  },
  principles: [
    {
      title: 'Built to last',
      text: 'We would rather ship one thing well and maintain it for years than chase ten trends.',
    },
    {
      title: 'Free, by design',
      text: 'Every project is free to use. If you want to support the work, that is always optional.',
    },
    {
      title: 'Made in the open',
      text: 'Progress, decisions and setbacks are documented in the development journal as they happen.',
    },
  ],
  journalTeaser: {
    eyebrow: 'From the journal',
    readMore: 'Read the journal →',
  },
  ctaSupport: {
    title: 'Nothing here is for sale.',
    text: "Every project Nova Studio makes is free. If one of them is useful to you, supporting the studio helps keep it that way.",
    button: 'Support Nova Studio',
  },
  footer: {
    tagline:
      'Two prépa students building serious projects, simulations to learn from, and games — made carefully, shared freely.',
    studio: 'Studio',
    elsewhere: 'Elsewhere',
    contact: 'Contact',
    copyright: 'Nova Studio. All rights reserved.',
    builtWith: 'Built with Next.js, in the open.',
  },
  projectsPage: {
    eyebrow: 'All work',
    title: 'Projects',
    description:
      'Everything Nova Studio has shipped or is currently building, in one place. Every project is free.',
    categories: { all: 'All', Software: 'Software', Games: 'Games', Music: 'Music', Videos: 'Videos' },
  },
  projectDetail: {
    allProjects: 'All projects',
    features: 'Features',
    versionHistory: 'Version history',
    currentVersion: 'Current version',
	downloadWindows: 'Download for Windows',
	downloadMac: 'Download for macOS',
	downloadAndroid: 'Android',
	downloadIos: 'iOS', 
    added: 'Added',
    improved: 'Improved',
    fixed: 'Fixed',
    removed: 'Removed',
    knownIssues: 'Known issues',
	windowsHint: 'Run the downloaded file and follow the installer.',
	macosHint: "Unzip the file, then drag Socle.app into your Applications folder. On first launch, if macOS blocks it: go to System Settings → Privacy & Security, then click \"Open Anyway\" next to the mention about Socle (only needed once, macOS warns because the app isn't signed with an Apple developer account yet).",
	installGuideLink: 'Detailed install guide',
  },
  journalPage: {
    eyebrow: 'Written as it happens',
    title: 'Development journal',
    description: 'Notes on decisions, dead ends and releases across every Nova Studio project.',
  },
  journalEntryPage: {
    back: 'Journal',
  },
  roadmapPage: {
    eyebrow: 'Where things stand',
    title: 'Roadmap',
    description:
      "A living overview of what each project is working toward. Updated as work progresses, not on a schedule.",
    stages: { Done: 'Done', 'In Progress': 'In Progress', Planned: 'Planned', Future: 'Future' },
  },
  supportPage: {
    eyebrow: 'No pressure',
    title: 'Support Nova Studio',
    description:
      "Nothing on this site is for sale. Every project is free to use, and that isn't changing. If a project has been useful to you and you'd like to support the time behind it, here's how.",
    open: 'Open',
    comingSoon: 'Coming soon',
    altText:
      "If you'd rather support the studio without spending anything, sharing a project with someone who might use it, filing a bug report, or leaving feedback all help just as much.",
    options: [
      { name: 'Buy Me a Coffee', description: 'A one-time way to say thanks, no account required.' },
      { name: 'PayPal', description: 'Send any amount directly, one time or recurring.' },
      { name: 'Stripe', description: 'Recurring monthly support, cancel any time.' },
    ],
  },
  aboutPage: {
    eyebrow: 'Why this exists',
    title: 'About Nova Studio',
    paragraphs: [
      'Nova Studio started between prépa classes, from a simple frustration: most personal projects either stay unfinished or ship without the care they deserve. We are two students, and this studio exists to do the opposite — to treat our side projects with the same discipline as a real product.',
      "There is no roadmap dictated by a business plan, no investors to answer to, and no ads to run. That freedom is the point. It means every decision — from a button's border radius to which project ships next — gets made for the same reason: because it makes the thing better.",
      'The studio rests on three pillars: a base of serious projects, an educational side with simulations to understand by doing, and a side of games for fun. It all comes from the same process: notice something worth making, spend the time it deserves, and share it plainly.',
    ],
    values: [
      { title: 'Useful first', text: 'Every project starts from a real, specific problem worth solving — not a trend worth chasing.' },
      { title: 'Elegant by default', text: "Good design is not an afterthought applied at the end. It shapes the decisions from the first one." },
      { title: 'Accessible to everyone', text: 'Nothing Nova Studio makes sits behind a paywall. Quality and price are not the same axis.' },
    ],
  },
  learnPage: {
    eyebrow: 'The educational side',
    title: 'Learn',
    description: "Interactive simulations to understand by doing.",
    items: [] as { tag: string; title: string; text: string }[],
    empty: {
      title: 'The first simulations are coming.',
      text: "Nothing is online here yet. Meanwhile, watch how a ray bends as it crosses two media.",
    },
  },
  gamesPage: {
    eyebrow: 'The fun side',
    title: 'Games',
    description: "Small games to unwind.",
    items: [
      {
        tag: 'Tycoon',
        title: 'Nova Tycoon',
        text: 'Build your empire, climb the season pass and unlock outfits from the wheel. Solo or multiplayer.',
        href: '/games/nova-tycoon/index.html',
      },
    ] as { tag: string; title: string; text: string; href?: string }[],
    empty: {
      title: 'The first game is coming.',
      text: "Nothing is playable yet. Meanwhile, the ball keeps bouncing.",
    },
  },
  ideaBox: {
    title: 'Got a topic in mind?',
    text: 'Write to us and tell us what you would like to see here.',
    button: 'Write to us',
  },
  notFound: {
    code: '404',
    title: "This page doesn't exist.",
    text: "The page you're looking for may have moved, or never existed. Here's the way back.",
    button: 'Back to home',
  },
  loginPage: {
    title: 'Log in',
    subtitle: 'One Nova Studio account for the site and future apps (like SOCLE).',
    continueWith: 'Continue with',
    orEmail: 'or by email',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    signIn: 'Log in',
    signUp: 'Create an account',
    noAccount: "Don't have an account? Create one",
    haveAccount: 'Already have an account? Log in',
    signupSuccess: 'Account created. Check your email if a confirmation is required, then log in.',
  },
  accountPage: {
    title: 'Your account',
    connectedAs: 'Logged in as',
    logout: 'Log out',
    backHome: 'Back to home',
  },
  installPage: {
    title: 'Install guide',
    subtitle: 'Socle — desktop app',
    intro:
      "Socle isn't signed with an Apple developer account or a Windows certificate yet (those cost money for a small studio) — so your system shows a warning on first launch. That's expected, not a sign the app is unsafe. Here's how to get past it, on each platform.",
    currentVersion: 'Current version',
    noRelease: 'No release published yet.',
    macosTitle: 'macOS',
    macosSteps: [
      {
        title: 'Download the file',
        body: 'Click "Download for macOS" above. The .zip lands in your Downloads folder.',
      },
      {
        title: 'Extract the app',
        body: 'Double-click the downloaded .zip (some browsers extract it automatically). You get Socle.app.',
      },
      {
        title: 'Move it to Applications',
        body: 'Drag Socle.app into your Applications folder, like any other macOS app.',
      },
      {
        title: 'First launch: allow it to open',
        body: 'If macOS blocks it, go to System Settings → Privacy & Security, then click "Open Anyway" next to the mention about Socle. This is only needed once.',
      },
    ],
    macosTroubleTitle: '"Socle.app is damaged and can\'t be opened"',
    macosTroubleBody:
      "This message (different from the normal warning) sometimes shows up on Apple Silicon Macs (M1/M2/M3) because of a quarantine flag the browser adds automatically. Fix it by opening the Terminal app (Applications → Utilities → Terminal), pasting the line below, then pressing Enter:",
    macosTroubleCommand: 'xattr -cr /Applications/Socle.app',
    macosTroubleFooter: 'Then launch Socle.app normally (right-click → Open).',
    windowsTitle: 'Windows',
    windowsSteps: [
      {
        title: 'Download the file',
        body: 'Click "Download for Windows" above to get the .exe.',
      },
      {
        title: 'Run the installer',
        body: 'Double-click the downloaded file. Windows SmartScreen often shows "Windows protected your PC" — same reason as on macOS (no paid signing certificate).',
      },
      {
        title: 'Allow it to run',
        body: 'Click "More info", then "Run anyway".',
      },
      {
        title: 'Follow the installer',
        body: 'Follow the steps to the end — Socle launches automatically once it\'s done.',
      },
    ],
    stillStuck: 'Still stuck?',
    stillStuckBody: 'Reach out — we reply fast.',
  },
};

export default en;
