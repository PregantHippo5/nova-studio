// lib/novaia/format.ts
//
// Mise en forme des réponses de NovaIA, sans dépendance : le modèle écrit parfois en LaTeX ($24 \, \text{km/h}$)
// et en Markdown (**gras**, `code`, blocs ```). On convertit le LaTeX courant en texte lisible (×, ², √, a/b…)
// et on découpe le texte en blocs / morceaux que le composant sait afficher.
// Fonctions pures : pas de React ici.

const SYMBOLS: Record<string, string> = {
  times: '×', cdot: '·', div: '÷', pm: '±', approx: '≈', neq: '≠', ne: '≠', leq: '≤', le: '≤', geq: '≥', ge: '≥',
  to: '→', rightarrow: '→', Rightarrow: '⇒', infty: '∞', pi: 'π', Delta: 'Δ', alpha: 'α', beta: 'β', gamma: 'γ',
  delta: 'δ', theta: 'θ', lambda: 'λ', mu: 'μ', sigma: 'σ', omega: 'ω', rho: 'ρ', degree: '°', circ: '°',
  ldots: '…', dots: '…',
};
const SILENT = new Set(['left', 'right', 'displaystyle', 'limits']);
const SPACES = new Set(['quad', 'qquad']);
const SUPER: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺',
};

/** Contenu d'une formule LaTeX -> texte lisible. */
function mathToText(expr: string): string {
  let s = expr;

  s = s.replace(/\\(?:text|mathrm|textbf|mathbf|operatorname)\{([^{}]*)\}/g, '$1');

  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, a: string, b: string) => {
      const wrap = (x: string) => (/[\s+\-×·÷]/.test(x.trim()) ? `(${x.trim()})` : x.trim());
      return `${wrap(a)}/${wrap(b)}`;
    });
  }
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, (_m, x: string) => (/^\w+$/.test(x.trim()) ? `√${x.trim()}` : `√(${x.trim()})`));

  s = s.replace(/\\%/g, '%');
  s = s.replace(/\\[,;:!]/g, ' ');
  s = s.replace(/\\([a-zA-Z]+)/g, (m, name: string) => {
    if (name in SYMBOLS) return SYMBOLS[name];
    if (SILENT.has(name)) return '';
    if (SPACES.has(name)) return ' ';
    return m; // commande inconnue : on la laisse
  });

  s = s.replace(/\^\{?(-?\+?\d+)\}?/g, (_m, d: string) => [...d].map((c) => SUPER[c] ?? c).join(''));
  s = s.replace(/_\{([^{}]*)\}/g, '_$1');
  s = s.replace(/\{,\}/g, ',');
  s = s.replace(/[ \t]{2,}/g, ' ');

  return s.trim();
}

/** Remplace les formules ($…$, $$…$$, \(…\), \[…\]) par leur version lisible. */
export function cleanMath(text: string): string {
  const display = (_m: string, x: string) => `\n${mathToText(x)}\n`;
  const inline = (_m: string, x: string) => mathToText(x);

  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, display)
    .replace(/\\\[([\s\S]+?)\\\]/g, display)
    .replace(/\\\(([\s\S]+?)\\\)/g, inline)
    // $x$ : le $ ouvrant suit un début de mot (pas « 5$ ») et est suivi d'un caractère utile ; le fermant suit un
    // caractère (pas d'espace). Évite de manger les prix : « 5 $ ou 6 $, soit 11$ ».
    .replace(/(^|[^\w$])\$([^\s$,.;:!?)](?:[^$\n]*[^\s$])?)\$/g, (_m, pre: string, x: string) => pre + mathToText(x))
    .replace(/\n{3,}/g, '\n\n');
}

export type Block = { type: 'text'; text: string } | { type: 'code'; text: string; lang?: string };

/** Sépare le texte et les blocs de code (```…```). Un bloc non fermé va jusqu'à la fin. */
export function splitBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const parts = text.split('```');

  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      const t = cleanMath(part).replace(/^\n+|\n+$/g, '');
      if (t.trim()) blocks.push({ type: 'text', text: t });
    } else {
      // la première ligne d'un bloc est souvent le nom du langage (python, js…)
      const head = part.match(/^([a-zA-Z0-9+#_-]*)\n/);
      const code = part.replace(/^[a-zA-Z0-9+#_-]*\n/, '').replace(/\n+$/, '');
      const lang = head && head[1] ? head[1].toLowerCase() : undefined;
      if (code.trim()) blocks.push({ type: 'code', text: code, lang });
    }
  });

  return blocks;
}

export type Inline = { type: 'text' | 'bold' | 'code' | 'italic'; text: string } | { type: 'link'; text: string; href: string };

/** Découpe une ligne en texte / **gras** / `code`. Les titres Markdown (# Titre) deviennent du gras. */
export function splitInline(text: string): Inline[] {
  const src = text.replace(/^[ \t]*#{1,6}[ \t]+(.+)$/gm, '**$1**');
  const out: Inline[] = [];
  const re = /\*\*([^*\n]+?)\*\*|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(?<![*\w])\*([^*\s][^*\n]*?[^*\s]|[^*\s])\*(?![*\w])/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push({ type: 'text', text: src.slice(last, m.index) });
    out.push(
      m[1] !== undefined
        ? { type: 'bold', text: m[1] }
        : m[2] !== undefined
          ? { type: 'code', text: m[2] }
          : m[3] !== undefined
            ? { type: 'link', text: m[3], href: m[4] }
            : { type: 'italic', text: m[5] }
    );
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ type: 'text', text: src.slice(last) });

  return out;
}

export type TextPart =
  | { type: 'para'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[]; start: number };

/** Découpe un bloc de texte en paragraphes et listes (- … / 1. …). Une ligne vide sépare deux paragraphes. */
export function splitText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) parts.push({ type: 'para', text: para.join('\n') });
    para = [];
  };

  for (const line of text.split('\n')) {
    const ul = line.match(/^\s*[-*•]\s+(.+)$/);
    const ol = line.match(/^\s*(\d{1,2})[.)]\s+(.+)$/);
    const last = parts[parts.length - 1];
    if (ul) {
      flush();
      if (last && last.type === 'ul' && para.length === 0) last.items.push(ul[1]);
      else parts.push({ type: 'ul', items: [ul[1]] });
    } else if (ol) {
      flush();
      if (last && last.type === 'ol') last.items.push(ol[2]);
      else parts.push({ type: 'ol', items: [ol[2]], start: Number(ol[1]) });
    } else if (!line.trim()) {
      flush();
      // une ligne vide ferme la liste en cours : le point suivant en ouvre une nouvelle seulement s'il y a du texte entre les deux
    } else {
      para.push(line);
    }
  }
  flush();
  return parts;
}
