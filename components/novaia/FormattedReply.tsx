import { splitBlocks, splitInline } from '@/lib/novaia/format';

/** Affiche une réponse de NovaIA : LaTeX converti en texte lisible, **gras**, `code` et blocs de code. */
export default function FormattedReply({ text }: { text: string }) {
  const blocks = splitBlocks(text);
  if (blocks.length === 0) return <>{text}</>;

  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === 'code' ? (
          <pre
            key={i}
            className="overflow-x-auto whitespace-pre rounded-lg border border-line bg-mist px-3 py-2 font-mono text-[0.82rem] leading-relaxed text-ink"
          >
            <code>{b.text}</code>
          </pre>
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
