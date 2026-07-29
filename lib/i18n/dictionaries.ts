import { Locale } from '@/lib/i18n/config';
import fr from '@/lib/i18n/dictionaries/fr';
import en from '@/lib/i18n/dictionaries/en';

export type Dictionary = typeof fr;

const dictionaries: Record<Locale, Dictionary> = { fr, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.fr;
}
