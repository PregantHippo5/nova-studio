import { splitBlocks, splitInline, splitText, type Inline } from '@/lib/novaia/format';
import CodeBlock from '@/components/novaia/CodeBlock';

function InlineText({ text }: { text: string }) {
  return (
    <>
      {splitInline(text).map((s: Inline, j: number) =>
        s.type === 'bold' ? (
          <strong key={j} className="font-semibold">
            {s.text}
          </strong>
        ) : s.type === 'italic' ? (
          <em key={j}>{s.text}</em>
        ) : s.type === 'code' ? (
          <code key={j} className="rounded bg-mist px-1 py-0.5 font-mono text-[0.85em]">
            {s.text}
          </code>
        ) : s.type === 'link' ? (
          <a key={j} href={s.href} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2 hover:opacity-80">
            {s.text}
          </a>
        ) : (
          <span key={j}>{s.text}</span>
        )
      )}
    </>
  );
}

/** Affiche une réponse de NovaIA : LaTeX converti en texte lisible, paragraphes, listes, **gras**, *italique*, `code`, liens et blocs de code colorés avec bouton Copier. */
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
    <div className="space-y-2.5">
      {blocks.map((b, i) =>
        b.type === 'code' ? (
          <CodeBlock key={i} code={b.text} lang={b.lang} copyLabel={copyLabel} copiedLabel={copiedLabel} />
        ) : (
          <div key={i} className="space-y-2.5">
            {splitText(b.text).map((p, k) =>
              p.type === 'ul' ? (
                <ul key={k} className="list-disc space-y-1 pl-5 marker:text-muted">
                  {p.items.map((it, n) => (
                    <li key={n} className="break-words pl-0.5">
                      <InlineText text={it} />
                    </li>
                  ))}
                </ul>
              ) : p.type === 'ol' ? (
                <ol key={k} start={p.start} className="list-decimal space-y-1 pl-5 marker:text-muted">
                  {p.items.map((it, n) => (
                    <li key={n} className="break-words pl-0.5">
                      <InlineText text={it} />
                    </li>
                  ))}
                </ol>
              ) : (
                <p key={k} className="whitespace-pre-wrap break-words leading-relaxed">
                  <InlineText text={p.text} />
                </p>
              )
            )}
          </div>
        )
      )}
    </div>
  );
}
