// lib/novaia/highlight.ts
//
// Coloration syntaxique minimale, sans dépendance, pour les blocs de code des réponses de NovaIA.
// Pas un vrai analyseur : un seul passage par expressions régulières (commentaires, chaînes, nombres, mots-clés,
// appels de fonction). Suffisant pour Python / JavaScript / TypeScript / C / Java / Bash. Fonctions pures.

export type TokenKind = 'plain' | 'keyword' | 'string' | 'comment' | 'number' | 'func' | 'builtin';
export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS = new Set(
  (
    'def class return if elif else for while break continue pass import from as with try except finally raise ' +
    'lambda yield in is not and or global nonlocal assert del async await ' +
    'function const let var new this typeof instanceof switch case default throw catch export extends static ' +
    'public private protected void int float double char long bool boolean string struct enum interface type ' +
    'package fn mut impl use match loop do then fi done echo'
  ).split(' ')
);

const BUILTINS = new Set(
  (
    'print len range int str float list dict set tuple input open sum min max abs sorted enumerate zip map filter ' +
    'isinstance type True False None self console Math Array Object String Number JSON null undefined true false NaN'
  ).split(' ')
);

const HASH_LANGS = new Set(['python', 'py', 'bash', 'sh', 'shell', 'zsh', 'yaml', 'yml', 'ruby', 'rb', 'r', 'toml']);
const SLASH_LANGS = new Set([
  'js', 'javascript', 'ts', 'typescript', 'tsx', 'jsx', 'java', 'c', 'cpp', 'c++', 'cs', 'csharp', 'go', 'rust', 'rs',
  'php', 'swift', 'kotlin', 'json', 'css', 'scss',
]);

function commentStyle(code: string, lang?: string): 'hash' | 'slash' {
  const l = (lang ?? '').toLowerCase();
  if (HASH_LANGS.has(l)) return 'hash';
  if (SLASH_LANGS.has(l)) return 'slash';
  return /(^|\n)\s*(def |import |from \w+ import|print\()/.test(code) ? 'hash' : 'slash';
}

export function highlight(code: string, lang?: string): Token[] {
  const comment = commentStyle(code, lang) === 'hash' ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$)';
  const re = new RegExp(
    [
      `(${comment})`, //                                                    1 commentaire
      '("""[\\s\\S]*?(?:"""|$)|\'\'\'[\\s\\S]*?(?:\'\'\'|$)|"(?:\\\\.|[^"\\\\\\n])*"?|\'(?:\\\\.|[^\'\\\\\\n])*\'?|`(?:\\\\.|[^`\\\\])*`?)', // 2 chaîne
      '(\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)', //                       3 nombre
      '([A-Za-z_][A-Za-z0-9_]*)', //                                        4 identifiant
    ].join('|'),
    'g'
  );

  const out: Token[] = [];
  const push = (text: string, kind: TokenKind) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };

  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    push(code.slice(last, m.index), 'plain');
    if (m[1] !== undefined) push(m[1], 'comment');
    else if (m[2] !== undefined) push(m[2], 'string');
    else if (m[3] !== undefined) push(m[3], 'number');
    else {
      const word = m[4];
      const next = code.slice(m.index + word.length).match(/^\s*\(/);
      if (KEYWORDS.has(word)) push(word, 'keyword');
      else if (BUILTINS.has(word)) push(word, 'builtin');
      else if (next) push(word, 'func');
      else push(word, 'plain');
    }
    last = m.index + m[0].length;
  }
  push(code.slice(last), 'plain');
  return out;
}
