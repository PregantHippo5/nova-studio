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
  emptyText: "NovaIA répond à une question à la fois, sans garder la conversation en mémoire. Les calculs demandent un peu plus de temps.",
  suggestions: ['Qui es-tu ?', "Quelle est la capitale de l'Australie ?", 'Un cycliste roule à 24 km/h pendant 2 h 30. Quelle distance parcourt-il ?'],
  placeholder: 'Écris un message…',
  inputLabel: 'Message pour NovaIA',
  send: 'Envoyer',
  newChat: 'Nouvelle conversation',
  thinking: 'NovaIA réfléchit…',
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
  emptyText: 'NovaIA answers one question at a time, without keeping the conversation in memory. Calculations take a little longer. Replies are in French.',
  suggestions: ['Who are you?', 'What is the capital of Australia?', 'A cyclist rides at 24 km/h for 2 h 30. How far does he go?'],
  placeholder: 'Write a message…',
  inputLabel: 'Message for NovaIA',
  send: 'Send',
  newChat: 'New conversation',
  thinking: 'NovaIA is thinking…',
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
};

export function novaiaCopy(locale: Locale): NovaiaCopy {
  return locale === 'en' ? en : fr;
}
