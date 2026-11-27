// lib/novaia/sources.ts
//
// Sources citées par NovaIA et outil derrière une réponse. Fonctions pures, sans React ni stockage.
// Les valeurs viennent du Space (et, pour le web, de pages tierces) : on ne leur fait pas confiance.

export interface Source {
  title: string;
  url: string;
}

export type ToolName = 'calcul' | 'maths' | 'trace' | 'date' | 'unites';
export const TOOLS: readonly ToolName[] = ['calcul', 'maths', 'trace', 'date', 'unites'];

/** Domaine affichable : au moins un point, lettres/chiffres/tirets, pas d'adresse IP ni de « localhost ». */
export function safeHost(host: string): string | null {
  const h = host.toLowerCase().replace(/^www\./, '');
  if (h.length < 4 || h.length > 80 || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h)) return null;
  if (/^\d+(\.\d+){3}$/.test(h) || h.endsWith('.local') || h.endsWith('.internal')) return null;
  return h;
}

/** Une source n'est gardée que si c'est un lien https vers un vrai domaine, sans identifiants (Wikipédia ou résultat web). */
export function cleanSources(x: unknown): Source[] {
  if (!Array.isArray(x)) return [];
  const out: Source[] = [];
  for (const s of x.slice(0, 3)) {
    if (typeof s !== 'object' || s === null) continue;
    const { title, url } = s as Record<string, unknown>;
    if (typeof title !== 'string' || typeof url !== 'string' || url.length > 600) continue;
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' || u.username || u.password || !safeHost(u.hostname)) continue;
      out.push({ title: title.slice(0, 120), url: u.toString() });
    } catch {
      /* lien invalide : ignoré */
    }
  }
  return out;
}

export function cleanTool(x: unknown): ToolName | undefined {
  return typeof x === 'string' && (TOOLS as readonly string[]).includes(x) ? (x as ToolName) : undefined;
}

/** Outil à afficher : celui annoncé par le Space, sinon déduit des mentions que NovaIA ajoute elle-même (anciennes discussions). */
export function toolOf(tool: ToolName | undefined, content: string): ToolName | undefined {
  if (tool) return tool;
  if (content.includes('```nova-chart')) return 'trace';
  if (/\((?:calcul formel|symbolic computation)\)/.test(content)) return 'maths';
  if (/R[ée]sultat v[ée]rifi[ée]|Result checked|calculs sur trois|calculations out of three|Voici le calcul effectu[ée]|Here is the calculation/.test(content)) return 'calcul';
  return undefined;
}

/** Texte en cours d'écriture : ferme un bloc de code resté ouvert pour que l'affichage ne casse pas. */
export function closeFences(text: string): string {
  return (text.match(/```/g)?.length ?? 0) % 2 === 1 ? text + '\n```' : text;
}
