// lib/novaia/chart.ts
//
// Un bloc ```nova-chart``` contient un JSON de NOMBRES calculés par le serveur du Space (jamais de HTML). On le revalide ici :
// tout ce qui n'est pas un nombre fini est ignoré, les textes sont tronqués, le nombre de points est plafonné. React échappe le reste.

export type ChartSeries = { label: string; expr: string; points: [number, number][] };
export type ChartData = { title: string; xlabel: string; ylabel: string; series: ChartSeries[] };

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');

export function parseChart(raw: string): ChartData | null {
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!j || typeof j !== 'object') return null;
  const o = j as Record<string, unknown>;
  if (!Array.isArray(o.series)) return null;
  const series: ChartSeries[] = [];
  for (const s of o.series.slice(0, 4)) {
    if (!s || typeof s !== 'object') continue;
    const so = s as Record<string, unknown>;
    if (!Array.isArray(so.points)) continue;
    const pts: [number, number][] = [];
    for (const p of so.points.slice(0, 400)) {
      if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number' && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
        pts.push([p[0], p[1]]);
      }
    }
    if (pts.length >= 2) series.push({ label: str(so.label, 60), expr: str(so.expr, 200), points: pts });
  }
  if (series.length === 0) return null;
  return { title: str(o.title, 100), xlabel: str(o.xlabel, 40), ylabel: str(o.ylabel, 40), series };
}

/** Graduations « rondes » entre min et max (environ n). */
export function niceTicks(min: number, max: number, n = 5): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

export function fmtTick(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) return v.toExponential(1).replace('e+', 'e').replace(/\.0e/, 'e');
  return String(Number(v.toPrecision(4)));
}
