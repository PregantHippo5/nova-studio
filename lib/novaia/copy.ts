// lib/novaia/copy.ts
//
// Textes de la page NovaIA (FR / EN), au même format que lib/sim/windTunnelCopy.ts :
// ils vivent à côté de la fonctionnalité et ne touchent pas aux dictionnaires du site.

import type { Locale } from '@/lib/i18n/config';

export interface NovaiaCopy {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  description: string;
  previewBadge: string;
  assistantName: string;
  emptyTitle: string;
  emptyText: string;
  suggestions: string[];
  placeholder: string;
  inputLabel: string;
  send: string;
  newChat: string;
  thinking: string;
  statusSearch: string;
  statusCalc: string;
  statusThink: string;
  statusWrite: string;
  sources: string;
  error: string;
  rateLimited: string;
  footnote: string;
  you: string;
  // page « façon ChatGPT » : historique, actions
  sidebarTitle: string;
  untitled: string;
  noConversations: string;
  groupToday: string;
  groupYesterday: string;
  groupWeek: string;
  groupOlder: string;
  rename: string;
  remove: string;
  removeConfirm: string;
  clearAll: string;
  clearAllConfirm: string;
  savedLocally: string;
  copy: string;
  copied: string;
  regenerate: string;
  stop: string;
  openMenu: string;
  closeMenu: string;
  // images
  attach: string;
  attachHint: string;
  removeImage: string;
  imageAttached: string;
  imageActive: string;
  imageLost: string;
  imageDefaultQuestion: string;
  imageError: string;
  imageTooBig: string;
  imagePlaceholder: string;
}

const fr: NovaiaCopy = {
  metaTitle: 'NovaIA',
  metaDescription:
    "NovaIA, l'assistant de Nova Studio : clair, précis, et qui préfère avouer qu'il ne sait pas plutôt qu'inventer.",
  eyebrow: 'Le côté IA',
  title: 'NovaIA',
  description:
    "Un assistant polyvalent entraîné par Nova Studio. Clair, précis, et qui préfère avouer qu'il ne sait pas plutôt qu'inventer.",
  previewBadge: 'Version publique · peut se tromper',
  assistantName: 'NovaIA',
  emptyTitle: 'Pose une question.',
  emptyText: 'Une question de culture, un calcul, une idée à discuter. Les calculs demandent un peu plus de temps.',
  suggestions: ['Qui es-tu ?', "Quelle est la capitale de l'Australie ?", 'Un cycliste roule à 24 km/h pendant 2 h 30. Quelle distance parcourt-il ?'],
  placeholder: 'Écris un message…',
  inputLabel: 'Message pour NovaIA',
  send: 'Envoyer',
  newChat: 'Nouvelle conversation',
  thinking: 'NovaIA réfléchit…',
  statusSearch: 'Recherche sur Wikipédia',
  statusCalc: 'Calcul en cours',
  statusThink: 'Réflexion',
  statusWrite: 'Rédaction de la réponse',
  sources: 'Sources',
  error: 'Une erreur est survenue. Réessaie dans un instant.',
  rateLimited: 'Trop de messages d’affilée. Patiente quelques secondes.',
  footnote: 'NovaIA peut se tromper : vérifie les informations importantes. Ne partage pas d’informations personnelles.',
  you: 'Toi',
  sidebarTitle: 'Conversations',
  untitled: 'Nouvelle conversation',
  noConversations: 'Tes conversations apparaîtront ici.',
  groupToday: "Aujourd'hui",
  groupYesterday: 'Hier',
  groupWeek: '7 derniers jours',
  groupOlder: 'Plus ancien',
  rename: 'Renommer',
  remove: 'Supprimer',
  removeConfirm: 'Supprimer cette conversation ?',
  clearAll: 'Tout effacer',
  clearAllConfirm: 'Effacer toutes les conversations de cet appareil ?',
  savedLocally: 'Enregistré sur cet appareil uniquement.',
  copy: 'Copier',
  copied: 'Copié',
  regenerate: 'Régénérer',
  stop: 'Arrêter',
  openMenu: 'Ouvrir les conversations',
  closeMenu: 'Fermer les conversations',
  attach: 'Joindre une image',
  attachHint: 'Photo d’un cours, d’un schéma, d’une écriture… L’image n’est pas enregistrée.',
  removeImage: 'Retirer l’image',
  imageAttached: 'Image jointe',
  imageActive: 'Image active dans cette conversation',
  imageLost: 'L’image n’est plus disponible (elle n’est jamais enregistrée). Joins-la à nouveau pour continuer d’en parler.',
  imageDefaultQuestion: 'Décris cette image et recopie le texte qu’elle contient.',
  imageError: 'Cette image ne peut pas être lue. Essaie une photo JPEG ou PNG.',
  imageTooBig: 'Image trop lourde. Essaie une photo plus légère.',
  imagePlaceholder: 'Pose une question sur l’image (facultatif)…',
};

const en: NovaiaCopy = {
  metaTitle: 'NovaIA',
  metaDescription:
    "NovaIA, Nova Studio's assistant: clear, precise, and would rather admit it doesn't know than make things up.",
  eyebrow: 'The AI side',
  title: 'NovaIA',
  description:
    "A general-purpose assistant trained by Nova Studio. Clear, precise, and would rather admit it doesn't know than make things up.",
  previewBadge: 'Public version · can be wrong',
  assistantName: 'NovaIA',
  emptyTitle: 'Ask a question.',
  emptyText: 'A general-knowledge question, a calculation, an idea to talk through. Calculations take a little longer. Replies are in French.',
  suggestions: ['Who are you?', 'What is the capital of Australia?', 'A cyclist rides at 24 km/h for 2 h 30. How far does he go?'],
  placeholder: 'Write a message…',
  inputLabel: 'Message for NovaIA',
  send: 'Send',
  newChat: 'New conversation',
  thinking: 'NovaIA is thinking…',
  statusSearch: 'Searching Wikipedia',
  statusCalc: 'Calculating',
  statusThink: 'Thinking it through',
  statusWrite: 'Writing the answer',
  sources: 'Sources',
  error: 'Something went wrong. Please try again in a moment.',
  rateLimited: 'Too many messages in a row. Please wait a few seconds.',
  footnote: 'NovaIA can be wrong: double-check important information. Do not share personal information.',
  you: 'You',
  sidebarTitle: 'Conversations',
  untitled: 'New conversation',
  noConversations: 'Your conversations will show up here.',
  groupToday: 'Today',
  groupYesterday: 'Yesterday',
  groupWeek: 'Last 7 days',
  groupOlder: 'Older',
  rename: 'Rename',
  remove: 'Delete',
  removeConfirm: 'Delete this conversation?',
  clearAll: 'Clear all',
  clearAllConfirm: 'Clear all conversations on this device?',
  savedLocally: 'Saved on this device only.',
  copy: 'Copy',
  copied: 'Copied',
  regenerate: 'Regenerate',
  stop: 'Stop',
  openMenu: 'Open conversations',
  closeMenu: 'Close conversations',
  attach: 'Attach an image',
  attachHint: 'A photo of a lesson, a diagram, handwriting… The image is not saved.',
  removeImage: 'Remove image',
  imageAttached: 'Attached image',
  imageActive: 'Image active in this conversation',
  imageLost: 'The image is no longer available (it is never saved). Attach it again to keep talking about it.',
  imageDefaultQuestion: 'Describe this image and copy the text it contains.',
  imageError: 'This image cannot be read. Try a JPEG or PNG photo.',
  imageTooBig: 'Image too large. Try a lighter photo.',
  imagePlaceholder: 'Ask a question about the image (optional)…',
};

export function novaiaCopy(locale: Locale): NovaiaCopy {
  return locale === 'en' ? en : fr;
}
