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
}

const fr: NovaiaCopy = {
  metaTitle: 'NovaIA',
  metaDescription:
    "NovaIA, l'assistant de Nova Studio : clair, précis, poli et légèrement pince-sans-rire. Aperçu en cours d'entraînement.",
  eyebrow: 'Le côté IA',
  title: 'NovaIA',
  description:
    "Un assistant polyvalent entraîné par Nova Studio. Clair, précis, poli et légèrement pince-sans-rire.",
  previewBadge: 'Aperçu · le modèle est encore en entraînement, les réponses sont des démonstrations',
  assistantName: 'NovaIA',
  emptyTitle: 'Pose une question.',
  emptyText: "Pour l'instant, NovaIA répond avec un petit répertoire de démonstration. Le vrai modèle arrive.",
  suggestions: ['Bonjour, qui es-tu ?', "Que sais-tu faire ?", "Explique-moi l'ozone simplement."],
  placeholder: 'Écris un message…',
  inputLabel: 'Message pour NovaIA',
  send: 'Envoyer',
  newChat: 'Nouvelle conversation',
  thinking: 'NovaIA réfléchit…',
  error: 'Une erreur est survenue. Réessaie dans un instant.',
  rateLimited: 'Trop de messages d’affilée. Patiente quelques secondes.',
  footnote: 'NovaIA peut se tromper. Ne partage pas d’informations personnelles.',
  you: 'Toi',
};

const en: NovaiaCopy = {
  metaTitle: 'NovaIA',
  metaDescription:
    "NovaIA, Nova Studio's assistant: clear, precise, polite and slightly deadpan. Preview, still in training.",
  eyebrow: 'The AI side',
  title: 'NovaIA',
  description:
    'A general-purpose assistant trained by Nova Studio. Clear, precise, polite and slightly deadpan.',
  previewBadge: 'Preview · the model is still in training, replies are demonstrations',
  assistantName: 'NovaIA',
  emptyTitle: 'Ask a question.',
  emptyText: 'For now, NovaIA answers from a small demo repertoire. The real model is on its way.',
  suggestions: ['Hello, who are you?', 'What can you do?', 'Explain ozone simply.'],
  placeholder: 'Write a message…',
  inputLabel: 'Message for NovaIA',
  send: 'Send',
  newChat: 'New conversation',
  thinking: 'NovaIA is thinking…',
  error: 'Something went wrong. Please try again in a moment.',
  rateLimited: 'Too many messages in a row. Please wait a few seconds.',
  footnote: 'NovaIA can be wrong. Do not share personal information.',
  you: 'You',
};

export function novaiaCopy(locale: Locale): NovaiaCopy {
  return locale === 'en' ? en : fr;
}
