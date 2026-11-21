import { niceTicks, fmtTick, type ChartData } from '@/lib/novaia/chart';

const STROKES = ['stroke-accent', 'stroke-ink', 'stroke-sky-600', 'stroke-amber-600'];
const BG = ['bg-accent', 'bg-ink', 'bg-sky-600', 'bg-amber-600'];

const W = 400;
const H = 260;
const M = { l: 46, r: 12, t: 12, b: 40 };

/** Graphique en SVG pur, dessiné par React à partir de nombres validés (aucun HTML injecté). */
export default function Chart({ data }: { data: ChartData }) {
  let xmin = Infinity;
  let xmax = -Infinity;
  let ymin = Infinity;
  let ymax = -Infinity;
  for (const s of data.series)
    for (const [x, y] of s.points) {
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
  if (ymax === ymin) {
    ymax += 1;
    ymin -= 1;
  }
  const pad = (ymax - ymin) * 0.06;
  ymin -= pad;
  ymax += pad;
  const sx = (x: number) => M.l + ((x - xmin) / (xmax - xmin || 1)) * (W - M.l - M.r);
  const sy = (y: number) => H - M.b - ((y - ymin) / (ymax - ymin)) * (H - M.t - M.b);
  const xt = niceTicks(xmin, xmax, 5);
  const yt = niceTicks(ymin, ymax, 5);

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-paper">
      {data.title && <figcaption className="border-b border-line px-3 py-1.5 text-[0.8rem] font-medium text-ink">{data.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={data.title || 'Graphique'} className="block h-auto w-full">
        {yt.map((v) => (
          <g key={`y${v}`}>
            <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} className="stroke-line" strokeWidth="1" />
            <text x={M.l - 6} y={sy(v) + 4} textAnchor="end" className="fill-muted" fontSize="11">
              {fmtTick(v)}
            </text>
          </g>
        ))}
        {xt.map((v) => (
          <g key={`x${v}`}>
            <line x1={sx(v)} x2={sx(v)} y1={M.t} y2={H - M.b} className="stroke-line" strokeWidth="1" />
            <text x={sx(v)} y={H - M.b + 15} textAnchor="middle" className="fill-muted" fontSize="11">
              {fmtTick(v)}
            </text>
          </g>
        ))}
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="none" className="stroke-muted" strokeWidth="1" />
        {data.series.map((s, i) => (
          <polyline
            key={i}
            fill="none"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            className={STROKES[i % STROKES.length]}
            points={s.points.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')}
          />
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" className="fill-ink" fontSize="12">
          {data.xlabel}
        </text>
        <text transform={`translate(12 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" className="fill-ink" fontSize="12">
          {data.ylabel}
        </text>
      </svg>
      {data.series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-[0.78rem] text-muted">
          {data.series.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className={`inline-block h-0.5 w-4 ${BG[i % BG.length]}`} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
