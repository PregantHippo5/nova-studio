import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import { isLocale, defaultLocale, locales, Locale } from '@/lib/i18n/config';
import { CONTACT_EMAIL } from '@/lib/site';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Section = { title: string; items: string[] };

const CONTENT: Record<Locale, { meta: string; title: string; intro: string; updated: string; sections: Section[]; contact: string }> = {
  fr: {
    meta: 'Confidentialité',
    title: 'Confidentialité',
    intro:
      "Ce que NovaIA et le site gardent de toi, où ça va, et comment tout effacer. Rien n'est vendu, aucune publicité, et on essaie de garder le minimum.",
    updated: 'Dernière mise à jour : novembre 2026.',
    sections: [
      {
        title: 'Tes discussions',
        items: [
          'Par défaut, tes conversations restent sur ton appareil (stockage du navigateur). Nous ne les voyons pas.',
          "Les images et PDF que tu joins sont gardés sur ton appareil uniquement (base du navigateur). Pour un PDF, ce sont des images des pages qui sont envoyées pour analyse, pas le fichier lui-même.",
          "Option « synchroniser mes discussions » (compte requis, désactivée par défaut) : le texte de tes conversations est copié sur notre base Supabase pour les retrouver sur tes autres appareils. Jamais les images. Si tu la désactives, les copies sont supprimées.",
          "« Tout effacer » dans NovaIA supprime tes conversations et pièces jointes de cet appareil (et la copie en ligne si la synchronisation est active).",
        ],
      },
      {
        title: 'Ce qui part vers les serveurs',
        items: [
          "Chaque message que tu envoies (et un peu d'historique si la mémoire de conversation est active) est envoyé à notre assistant, qui tourne sur un Space Hugging Face (GPU partagé). Hugging Face peut garder des journaux techniques selon sa propre politique.",
          "Pour une question de fait, des mots-clés de ta question sont envoyés à Wikipédia pour chercher des extraits (aucune information sur toi n'est jointe, le client se présente comme « NovaIA / Nova Studio »).",
          "Si la recherche web est activée sur ce site, et seulement quand Wikipédia ne suffit pas (actualité, prix, scores…), le texte de ta dernière question (200 caractères au plus) est envoyé au service de recherche Tavily. Jamais l'historique, ni ta mémoire, ni ton profil. Le nombre de recherches est plafonné par jour.",
          "Les petites icônes des sites cités sous les réponses sont récupérées par notre serveur (via DuckDuckGo) : ton navigateur ne contacte jamais le site cité pour son icône.",
          "Si tu utilises la dictée vocale (micro), c'est le navigateur qui transcrit ta voix : selon le navigateur, le son peut passer par le service de reconnaissance vocale de son éditeur (Chrome : Google). NovaIA ne reçoit que le texte. La lecture à voix haute reste sur ton appareil.",
          "Mode vocal (si activé sur ce site) : le micro n'est ouvert qu'après ton clic ; quand tu parles, ce passage audio est envoyé à notre Space Hugging Face de transcription (Whisper) puis effacé : NovaIA ne le conserve pas. Les réponses lues à voix haute sont générées par un second modèle de voix (Piper) hébergé au même endroit.",
          "Pour un calcul, un petit programme est écrit et exécuté dans une calculatrice isolée : il ne peut accéder ni à des fichiers ni au réseau.",
          "Une image envoyée à NovaIA est traitée par un second Space Hugging Face dédié à la vision.",
        ],
      },
      {
        title: 'Mémoire et style (facultatifs)',
        items: [
          "Le style de réponse et les petits faits que NovaIA retient (« j'ai un chat »…) ne sont enregistrés qu'avec ton accord, sur ton appareil, et sur ton compte si tu en as un. Tu peux les voir, les modifier et les supprimer dans le panneau Style.",
          "NovaIA ne retient pas les sujets sensibles (santé, religion, opinions politiques, identifiants, etc.).",
        ],
      },
      {
        title: 'Limites d’usage',
        items: [
          "Pour éviter les abus et protéger le quota gratuit du GPU, nous comptons les requêtes par minute et par jour. Nous ne stockons pas ton adresse IP : seulement une empreinte irréversible, effacée après 2 jours.",
        ],
      },
      {
        title: 'Compte',
        items: [
          "La connexion passe par Supabase (adresse e-mail et identifiant de compte). Elle sert à te reconnaître et, si tu l'actives, à synchroniser.",
          "Pour supprimer ton compte et ses données, écris-nous : nous le faisons à la main.",
        ],
      },
      {
        title: 'Ce que nous ne faisons pas',
        items: [
          'Pas de publicité, pas de revente de données, pas de pistage publicitaire.',
          "L'hébergeur du site (Vercel) garde des journaux techniques d'accès, comme tout hébergeur.",
        ],
      },
    ],
    contact: 'Une question ou une demande de suppression ? Écris à',
  },
  en: {
    meta: 'Privacy',
    title: 'Privacy',
    intro:
      'What NovaIA and the site keep about you, where it goes, and how to erase it. Nothing is sold, there are no ads, and we try to keep as little as possible.',
    updated: 'Last updated: November 2026.',
    sections: [
      {
        title: 'Your conversations',
        items: [
          'By default your conversations stay on your device (browser storage). We cannot see them.',
          'Images and PDFs you attach are kept on your device only (browser database). For a PDF, page images are sent for analysis, not the file itself.',
          '"Sync my conversations" (account required, off by default): the text of your conversations is copied to our Supabase database so you can find them on your other devices. Never the images. If you turn it off, the copies are deleted.',
          '"Clear all" in NovaIA deletes your conversations and attachments from this device (and the online copy if sync is on).',
        ],
      },
      {
        title: 'What is sent to servers',
        items: [
          'Each message you send (plus a little history if conversation memory is on) goes to our assistant, which runs on a Hugging Face Space (shared GPU). Hugging Face may keep technical logs under its own policy.',
          'For a factual question, keywords from your question are sent to Wikipedia to look up excerpts (nothing about you is attached; the client identifies itself as "NovaIA / Nova Studio").',
          "If web search is turned on for this site, and only when Wikipedia is not enough (news, prices, scores…), the text of your latest question (200 characters at most) is sent to the Tavily search service. Never your history, your memory or your profile. The number of searches is capped per day.",
          'The small icons of the sites cited under replies are fetched by our server (through DuckDuckGo): your browser never contacts the cited site for its icon.',
          'If you use voice dictation (microphone), your browser transcribes your voice: depending on the browser, audio may go through its vendor\'s speech recognition service (Chrome: Google). NovaIA only receives the text. Reading aloud stays on your device.',
          'Voice mode (if enabled on this site): the microphone only opens after you click; when you speak, that audio clip is sent to our Hugging Face transcription Space (Whisper) and then discarded: NovaIA does not keep it. Replies read aloud are generated by a second voice model (Piper) hosted in the same place.',
          'For a calculation, a small program is written and run in an isolated calculator: it cannot reach files or the network.',
          'An image sent to NovaIA is processed by a second Hugging Face Space dedicated to vision.',
        ],
      },
      {
        title: 'Memory and style (optional)',
        items: [
          'Your answer style and the small facts NovaIA remembers ("I have a cat"…) are only saved with your consent, on your device, and on your account if you have one. You can view, edit and delete them in the Style panel.',
          'NovaIA does not remember sensitive topics (health, religion, political opinions, identifiers, etc.).',
        ],
      },
      {
        title: 'Usage limits',
        items: [
          'To prevent abuse and protect the free GPU quota, we count requests per minute and per day. We do not store your IP address: only an irreversible fingerprint, erased after 2 days.',
        ],
      },
      {
        title: 'Account',
        items: [
          'Sign-in goes through Supabase (email address and account ID). It is used to recognise you and, if you turn it on, to sync.',
          'To delete your account and its data, write to us: we do it by hand.',
        ],
      },
      {
        title: 'What we do not do',
        items: [
          'No ads, no selling data, no advertising trackers.',
          'The site host (Vercel) keeps technical access logs, like any host.',
        ],
      },
    ],
    contact: 'A question or a deletion request? Write to',
  },
};

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  return { title: CONTENT[locale].meta };
}

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const c = CONTENT[locale];
  return (
    <div className="py-16 md:py-24">
      <Container>
        <div className="mx-auto max-w-2xl">
          <h1 className="text-display-2 font-extrabold tracking-tight text-ink balance">{c.title}</h1>
          <p className="mt-5 text-[1.05rem] leading-relaxed text-muted">{c.intro}</p>
          <p className="mt-2 text-[0.8rem] text-muted">{c.updated}</p>

          {c.sections.map((s) => (
            <section key={s.title} className="ns-card mt-5 p-6 md:p-7">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">{s.title}</h2>
              <ul className="mt-4 space-y-3">
                {s.items.map((it) => (
                  <li key={it} className="flex gap-3 text-[0.97rem] leading-relaxed text-ink/85">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="mt-12 text-[0.97rem] text-ink/85">
            {c.contact}{' '}
            <a className="font-semibold text-accent-deep underline underline-offset-2 dark:text-accent" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </Container>
    </div>
  );
}

