import { splitBlocks, splitInline } from '@/lib/novaia/format';
import CodeBlock from '@/components/novaia/CodeBlock';

/** Affiche une réponse de NovaIA : LaTeX converti en texte lisible, **gras**, `code` et blocs de code colorés avec bouton Copier. */
export default function FormattedReply({
  text,
  copyLabel = 'Copier',
  copiedLabel = 'Copié',
}: {
  text: string;
  copyLabel?: string;
  copiedLabel?: string;
}) {
  const blocks = splitBlocks(text);
  if (blocks.length === 0) return <>{text}</>;

  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === 'code' ? (
          <CodeBlock key={i} code={b.text} lang={b.lang} copyLabel={copyLabel} copiedLabel={copiedLabel} />
        ) : (
          <p key={i} className="whitespace-pre-wrap break-words">
            {splitInline(b.text).map((s, j) =>
              s.type === 'bold' ? (
                <strong key={j} className="font-semibold">
                  {s.text}
                </strong>
              ) : s.type === 'code' ? (
                <code key={j} className="rounded bg-mist px-1 py-0.5 font-mono text-[0.85em]">
                  {s.text}
                </code>
              ) : (
                <span key={j}>{s.text}</span>
              )
            )}
          </p>
        )
      )}
    </div>
  );
}
