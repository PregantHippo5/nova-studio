import type { Lang } from '@/lib/novaia/provider';
import type { StyleKey } from '@/lib/novaia/style';

export interface PrefsCopy {
  open: string;
  title: string;
  intro: string;
  presets: string;
  presetNames: Record<string, string>;
  settings: Record<StyleKey, string>;
  values: Record<StyleKey, Record<string, string>>;
  hintToggle: string;
  reset: string;
  close: string;
  consentQuestion: string;
  consentYes: string;
  consentNo: string;
  consentOn: string;
  consentOff: string;
  consentAsk: string;
  signInToSave: string;
  signIn: string;
  account: string;
  forget: string;
  forgetConfirm: string;
  saveError: string;
  factAsk: string;
  factYes: string;
  factNo: string;
  memoryTitle: string;
  memoryEmpty: string;
  memoryDelete: string;
  abTitle: string;
  abA: string;
  abB: string;
  abPick: string;
  abStop: string;
  abNoted: string;
  compressed: string;
}

const fr: PrefsCopy = {
  open: 'Style',
  title: 'Le style de NovaIA',
  intro: 'Mélange les réglages comme tu veux. Ça ne change jamais les faits ni les calculs.',
  presets: 'Préréglages',
  presetNames: { pote: 'Pote', prof: 'Prof', direct: 'Direct' },
  settings: { ton: 'Ton', longueur: 'Longueur', format: 'Format', emojis: 'Emojis', chaleur: 'Chaleur', fermete: 'Fermeté' },
  values: {
    ton: { decontracte: 'Décontracté', serieux: 'Sérieux' },
    longueur: { court: 'Court', detaille: 'Détaillé' },
    format: { synthese: 'Synthèse', pave: 'Pavé puis synthèse', listes: 'Listes' },
    emojis: { aucun: 'Aucun', rares: 'Rares', oui: 'Oui' },
    chaleur: { factuelle: 'Factuelle', humaine: 'Humaine' },
    fermete: { franche: 'Franche' },
  },
  hintToggle: 'Clique de nouveau sur un choix pour le retirer.',
  reset: 'Tout remettre par défaut',
  close: 'Fermer',
  consentQuestion: 'Souhaites-tu que NovaIA garde tes préférences de style sur ton compte ?',
  consentYes: 'Oui, les garder',
  consentNo: 'Non merci',
  consentOn: 'Tes préférences sont enregistrées sur ton compte.',
  consentOff: 'Tes préférences ne sont pas enregistrées : elles disparaissent quand tu quittes la page.',
  consentAsk: 'Enregistrer mes préférences',
  signInToSave: 'Connecte-toi pour que NovaIA retienne ton style.',
  signIn: 'Se connecter',
  account: 'Mon compte',
  forget: 'Tout oublier',
  forgetConfirm: 'Effacer tes préférences et ta mémoire NovaIA de ton compte ?',
  saveError: 'Enregistrement impossible pour le moment.',
  factAsk: 'Retenir pour la suite :',
  factYes: 'Retenir',
  factNo: 'Non',
  memoryTitle: 'Ce que NovaIA retient de toi',
  memoryEmpty: 'Rien pour l’instant. NovaIA te proposera de retenir une info quand tu parles de toi.',
  memoryDelete: 'Oublier',
  abTitle: 'Deux façons de répondre : laquelle te va le mieux ?',
  abA: 'Version A',
  abB: 'Version B',
  abPick: 'Je préfère celle-ci',
  abStop: 'Ne plus proposer',
  abNoted: 'Noté, je m’en souviendrai.',
  compressed: 'Début de la discussion résumé pour pouvoir continuer',
};

const en: PrefsCopy = {
  open: 'Style',
  title: 'NovaIA’s style',
  intro: 'Mix the settings however you like. They never change facts or calculations.',
  presets: 'Presets',
  presetNames: { pote: 'Buddy', prof: 'Teacher', direct: 'Direct' },
  settings: { ton: 'Tone', longueur: 'Length', format: 'Format', emojis: 'Emojis', chaleur: 'Warmth', fermete: 'Firmness' },
  values: {
    ton: { decontracte: 'Casual', serieux: 'Serious' },
    longueur: { court: 'Short', detaille: 'Detailed' },
    format: { synthese: 'Summary', pave: 'Long answer, then summary', listes: 'Lists' },
    emojis: { aucun: 'None', rares: 'Few', oui: 'Yes' },
    chaleur: { factuelle: 'Factual', humaine: 'Warm' },
    fermete: { franche: 'Frank' },
  },
  hintToggle: 'Click a choice again to remove it.',
  reset: 'Reset everything',
  close: 'Close',
  consentQuestion: 'Should NovaIA keep your style preferences on your account?',
  consentYes: 'Yes, keep them',
  consentNo: 'No thanks',
  consentOn: 'Your preferences are saved on your account.',
  consentOff: 'Your preferences are not saved: they disappear when you leave the page.',
  consentAsk: 'Save my preferences',
  signInToSave: 'Sign in so NovaIA remembers your style.',
  signIn: 'Sign in',
  account: 'My account',
  forget: 'Forget everything',
  forgetConfirm: 'Erase your preferences and NovaIA memory from your account?',
  saveError: 'Could not save right now.',
  factAsk: 'Remember for later:',
  factYes: 'Remember',
  factNo: 'No',
  memoryTitle: 'What NovaIA remembers about you',
  memoryEmpty: 'Nothing yet. NovaIA will offer to remember something when you talk about yourself.',
  memoryDelete: 'Forget',
  abTitle: 'Two ways to answer: which suits you better?',
  abA: 'Version A',
  abB: 'Version B',
  abPick: 'I prefer this one',
  abStop: 'Stop offering this',
  abNoted: 'Noted, I’ll remember that.',
  compressed: 'Start of the conversation summarized so we can keep going',
};

export function prefsCopy(locale: Lang | string): PrefsCopy {
  return locale === 'en' ? en : fr;
}
