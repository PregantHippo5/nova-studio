/**
 * Détecte, dans un message de la personne, une phrase sur elle-même qui mérite peut-être d'être retenue
 * (« je suis en PTSI », « j'habite à Lyon », « mon sport, c'est le foot US »). Aucun modèle, aucun serveur : un simple filtre.
 * Rien n'est enregistré sans que la personne confirme, avec sa propre phrase. Les sujets sensibles ne sont jamais proposés.
 */
const START = /^(je suis|j['’]ai|j['’]habite|je vis|je m['’]appelle|je fais|je joue|je pratique|j['’]étudie|je travaille|je prépare|j['’]adore|j['’]aime|je préfère|mon |ma |mes |ma passion|mon but)/i;
const SENSITIVE = /(santé|malad|dépress|anxi|cancer|handicap|mot de passe|mdp|password|carte (bancaire|bleue)|iban|rib\b|adresse|téléphone|numéro|suicid|drogue|religi|politi|vote|orientation|salaire|dettes?|argent|@|https?:|\d{6,})/i;
const PASSING = /(fatigu|faim|soif|content|triste|énervé|stress|pas bien|mal à|en retard|ici|maintenant|ce soir|aujourd|demain|là\b|ennui)/i;

export function detectFact(text: string, known: string[] = []): string | null {
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!])\s+|\n/);
  for (const raw of sentences) {
    const s = raw.trim().replace(/[.!\s]+$/, '');
    if (s.length < 8 || s.length > 160 || s.includes('?')) continue;
    if (!START.test(s) || SENSITIVE.test(s) || PASSING.test(s)) continue;
    const key = s.toLowerCase();
    if (known.some((k) => k.toLowerCase() === key)) continue;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return null;
}
