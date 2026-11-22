import { splitBlocks, splitInline, splitText, type Inline } from '@/lib/novaia/format';
import CodeBlock from '@/components/novaia/CodeBlock';
import Chart from '@/components/novaia/Chart';
import { parseChart } from '@/lib/novaia/chart';

/** Une ligne courte qui ressemble à un calcul (« 24 × 2,5 = 60 km ») : affichée comme une formule, centrée. */
function isFormula(t: string): boolean {
  const s = t.trim();
  if (s.length < 5 || s.length > 80 || s.includes('\n')) return false;
  if (!/[=≈≠≤≥]/.test(s) || !/[\d√π∑∫]/.test(s)) return false;
  if (/[.!?]$/.test(s) && s.split(' ').length > 8) return false;
  return s.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]{4,}$/.test(w)).length <= 2;
}

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
          <code key={j} className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[0.85em] text-accent-deep dark:text-accent">
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
      {blocks.map((b, i) => {
        const chart = b.type === 'code' && b.lang === 'nova-chart' ? parseChart(b.text) : null;
        if (chart) return <Chart key={i} data={chart} />;
        return b.type === 'code' ? (
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
              ) : isFormula(p.text) ? (
                <p key={k} className="nv-formula rounded-2xl bg-accent-soft px-4 py-3 text-center text-[1.05rem] font-semibold tracking-tight text-ink">
                  <InlineText text={p.text} />
                </p>
              ) : (
                <p key={k} className="whitespace-pre-wrap break-words leading-relaxed">
                  <InlineText text={p.text} />
                </p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
