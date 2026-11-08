import { highlight, type TokenKind } from '@/lib/novaia/highlight';
import CopyButton from '@/components/novaia/CopyButton';

const COLORS: Record<TokenKind, string> = {
  plain: '',
  keyword: 'text-accent font-medium',
  string: 'text-emerald-700 dark:text-emerald-400',
  comment: 'text-muted italic',
  number: 'text-amber-700 dark:text-amber-400',
  func: 'text-sky-700 dark:text-sky-400',
  builtin: 'text-violet-700 dark:text-violet-400',
};

/** Bloc de code : langage, bouton Copier, coloration légère. Le texte est affiché par React (échappé, jamais en HTML brut). */
export default function CodeBlock({
  code,
  lang,
  copyLabel,
  copiedLabel,
}: {
  code: string;
  lang?: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const tokens = highlight(code, lang);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-mist">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-wide text-muted">
        <span>{lang || 'code'}</span>
        <CopyButton text={code} label={copyLabel} copiedLabel={copiedLabel} className="normal-case tracking-normal" />
      </div>
      <pre className="overflow-x-auto whitespace-pre px-3 py-2.5 font-mono text-[0.82rem] leading-relaxed text-ink">
        <code>
          {tokens.map((t, i) =>
            t.kind === 'plain' ? <span key={i}>{t.text}</span> : (
              <span key={i} className={COLORS[t.kind]}>
                {t.text}
              </span>
            )
          )}
        </code>
      </pre>
    </div>
  );
}
