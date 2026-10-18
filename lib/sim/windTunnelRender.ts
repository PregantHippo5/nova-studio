import { FluidSim, NX, NY } from './windTunnel';

export type RGB = [number, number, number];
export const BG: RGB = [0.045, 0.048, 0.055];
const OBSTACLE_COLOR: RGB = [0.88, 0.88, 0.9];
const OBSTACLE_FILL: RGB = [0.115, 0.12, 0.135];
export const ACCENT: RGB = [0.88, 0.8, 0.64];

export const PALETTES: { name: string; slow: RGB; fast: RGB }[] = [
  { name: 'Nova (bleu / or)', slow: [0.42, 0.47, 0.56], fast: [0.88, 0.8, 0.64] },
  { name: 'Argent', slow: [0.52, 0.55, 0.62], fast: [0.97, 0.97, 0.98] },
  { name: 'Glacier', slow: [0.27, 0.45, 0.6], fast: [0.8, 0.92, 0.96] },
  { name: 'Ambre', slow: [0.48, 0.38, 0.32], fast: [0.96, 0.78, 0.5] },
];
export const SPEED_MIN = 0.7;
export const SPEED_MAX = 1.7;

const PRESS: [RGB, RGB, RGB] = [[0.17, 0.43, 0.66], [0.075, 0.08, 0.095], [0.9, 0.5, 0.3]];
const VORT: [RGB, RGB, RGB] = [[0.3, 0.58, 0.78], [0.075, 0.08, 0.095], [0.9, 0.64, 0.36]];
const SPEED_STOPS: RGB[] = [[0.045, 0.06, 0.11], [0.2, 0.38, 0.55], [0.8, 0.72, 0.55], [0.98, 0.95, 0.88]];
export const SPEED_RAMP_MAX = 2.2;

export interface ViewOptions {
  mode: number; // 0 fumée, 1 pression, 2 vorticité, 3 vitesse
  palette: number;
  smokeAmt: number;
  cpRange: number;
  vortRange: number;
  showVectors: boolean;
  showStream: boolean;
  showMarkers: boolean;
  showRuler: boolean;
  showContour: boolean;
  nStream: number;
}

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function diverging(t: number, c: [RGB, RGB, RGB]): RGB {
  const tt = Math.max(-1, Math.min(1, t));
  const a = Math.pow(Math.abs(tt), 0.75);
  const tgt = tt > 0 ? c[2] : c[0];
  return [mix(c[1][0], tgt[0], a), mix(c[1][1], tgt[1], a), mix(c[1][2], tgt[2], a)];
}

export function speedRamp(t: number): RGB {
  const x = clamp01(t);
  const [s0, s1, s2, s3] = SPEED_STOPS;
  const f = (a: RGB, b: RGB, u: number): RGB => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
  if (x < 0.33) return f(s0, s1, x / 0.33);
  if (x < 0.66) return f(s1, s2, (x - 0.33) / 0.33);
  return f(s2, s3, (x - 0.66) / 0.34);
}

export const PRESS_MAP = PRESS;
export const VORT_MAP = VORT;

/** Remplit l'image NX×NY (le champ est « y vers le haut », l'image « y vers le bas »). */
export function renderField(sim: FluidSim, img: ImageData, view: ViewOptions) {
  const data = img.data;
  const { slow, fast } = PALETTES[view.palette];
  const inv = 1 / Math.max(sim.wind, 1e-3);
  const { dye, uc, vc, cp, vort, solidFrac } = sim;
  for (let j = 0; j < NY; j++) {
    const row = NY - 1 - j;
    const qy = (j + 0.5) / NY - 0.5;
    for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      const d = clamp01(dye[k]);
      const spd = Math.sqrt(uc[k] * uc[k] + vc[k] * vc[k]) * inv;
      const t = clamp01((spd - SPEED_MIN) / (SPEED_MAX - SPEED_MIN));
      const sr = mix(slow[0], fast[0], t);
      const sg = mix(slow[1], fast[1], t);
      const sb = mix(slow[2], fast[2], t);
      let r: number;
      let g: number;
      let b: number;
      if (view.mode === 0) {
        r = mix(BG[0], sr, d);
        g = mix(BG[1], sg, d);
        b = mix(BG[2], sb, d);
      } else {
        let base: RGB;
        if (view.mode === 1) base = diverging(cp[k] / view.cpRange, PRESS);
        else if (view.mode === 2) base = diverging((vort[k] * inv) / view.vortRange, VORT);
        else base = speedRamp(spd / SPEED_RAMP_MAX);
        const m = d * view.smokeAmt * 0.6;
        r = mix(base[0], sr * 1.1, m);
        g = mix(base[1], sg * 1.1, m);
        b = mix(base[2], sb * 1.1, m);
      }
      const solid = clamp01(solidFrac[k]);
      r = mix(r, OBSTACLE_FILL[0], solid);
      g = mix(g, OBSTACLE_FILL[1], solid);
      b = mix(b, OBSTACLE_FILL[2], solid);
      const rim = smooth(0.3, 0.5, solid) * (1 - smooth(0.5, 0.85, solid));
      r += rim * 0.07;
      g += rim * 0.07;
      b += rim * 0.07;
      const qx = (i + 0.5) / NX - 0.5;
      const vig = 1 - 0.45 * (qx * qx + qy * qy);
      const o = (row * NX + i) * 4;
      data[o] = clamp01(r * vig) * 255;
      data[o + 1] = clamp01(g * vig) * 255;
      data[o + 2] = clamp01(b * vig) * 255;
      data[o + 3] = 255;
    }
  }
}

const css = (c: RGB, a = 1) =>
  `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;

function paletteColor(speedRel: number, palette: number, alpha: number) {
  const { slow, fast } = PALETTES[palette];
  const t = clamp01((speedRel - SPEED_MIN) / (SPEED_MAX - SPEED_MIN));
  const c = [0, 1, 2].map((i) => clamp01(mix(slow[i], fast[i], t) * 1.12 + 0.06)) as RGB;
  return css(c, alpha);
}

export const fmtPa = (x: number) => (Math.abs(x) >= 1000 ? `${(x / 1000).toFixed(2)} kPa` : `${x.toFixed(0)} Pa`);

function niceStep(raw: number) {
  const e = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * e >= raw) return m * e;
  return 10 * e;
}

/** Couleur d'un point de la légende (t de 0 à 1) pour le mode courant. */
export function legendColor(mode: number, palette: number, t: number): RGB {
  if (mode === 0) {
    const { slow, fast } = PALETTES[palette];
    return [mix(slow[0], fast[0], t), mix(slow[1], fast[1], t), mix(slow[2], fast[2], t)];
  }
  if (mode === 1) return diverging(t * 2 - 1, PRESS);
  if (mode === 2) return diverging(t * 2 - 1, VORT);
  return speedRamp(t);
}

export interface Labels {
  legend: [string, string, string, string]; // titres par mode
  pressure: string;
  vorticity: string;
  speed: string;
  stagnation: string;
  suction: string;
  slowmo: string;
  screenSec: string;
  pause: string;
  shapes: Record<string, string>;
}

/** Tout ce qui se dessine par-dessus le champ : lignes, repères, contour, bulles d'info. */
export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  sim: FluidSim,
  view: ViewOptions,
  ph: ReturnType<FluidSim['phys']>,
  windMs: number,
  paused: boolean,
  labels: Labels,
  frame: number,
  cache: { stream: number[][][] },
) {
  const X = (x: number) => (x / NX) * W;
  const Y = (y: number) => H - (y / NY) * H;
  const u = W / 960; // échelle des textes
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (view.showStream) {
    if (frame % 5 === 0 || cache.stream.length === 0) cache.stream = sim.streamlines(view.nStream);
    ctx.lineWidth = 1.5 * u;
    for (const line of cache.stream) {
      for (let k = 1; k < line.length; k++) {
        ctx.strokeStyle = paletteColor(line[k][2], view.palette, 0.55);
        ctx.beginPath();
        ctx.moveTo(X(line[k - 1][0]), Y(line[k - 1][1]));
        ctx.lineTo(X(line[k][0]), Y(line[k][1]));
        ctx.stroke();
      }
    }
  }

  if (view.showVectors) {
    const h = 14;
    const off = h >> 1;
    ctx.lineWidth = 1.4 * u;
    for (let j = off; j < NY; j += h) {
      for (let i = off; i < NX; i += h) {
        const k = j * NX + i;
        if (sim.solidFrac[k] >= 0.3) continue;
        const mag = Math.hypot(sim.uc[k], sim.vc[k]) / sim.wind;
        if (mag <= 0.03) continue;
        const dx = sim.uc[k] / (mag * sim.wind);
        const dy = sim.vc[k] / (mag * sim.wind);
        const L = mag * h * 0.95;
        const cx = i + 0.5;
        const cy = j + 0.5;
        const p0x = cx - (dx * L) / 2;
        const p0y = cy - (dy * L) / 2;
        const p1x = cx + (dx * L) / 2;
        const p1y = cy + (dy * L) / 2;
        const hl = Math.min(0.4 * L, 0.5 * h);
        const bx = p1x - dx * hl;
        const by = p1y - dy * hl;
        ctx.strokeStyle = paletteColor(mag, view.palette, 0.7);
        ctx.beginPath();
        ctx.moveTo(X(p0x), Y(p0y));
        ctx.lineTo(X(p1x), Y(p1y));
        ctx.moveTo(X(p1x), Y(p1y));
        ctx.lineTo(X(bx - dy * hl * 0.5), Y(by + dx * hl * 0.5));
        ctx.moveTo(X(p1x), Y(p1y));
        ctx.lineTo(X(bx + dy * hl * 0.5), Y(by - dx * hl * 0.5));
        ctx.stroke();
      }
    }
  }

  if (view.showContour) {
    // contour de l'obstacle, calculé à partir de la fraction solide serait bruité : on redessine la géométrie exacte
    const pts = sim.outline();
    ctx.strokeStyle = css(OBSTACLE_COLOR, 0.9);
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    pts.x.forEach((x, i) => (i === 0 ? ctx.moveTo(X(x), Y(pts.y[i])) : ctx.lineTo(X(x), Y(pts.y[i]))));
    ctx.closePath();
    ctx.stroke();
  }

  if (view.showRuler) {
    const step = niceStep(sim.cfg.widthM / Math.max(W / (110 * u), 1));
    const pxPerM = W / sim.cfg.widthM;
    const rc = 'rgba(178,184,199,0.55)';
    ctx.strokeStyle = rc;
    ctx.fillStyle = rc;
    ctx.lineWidth = 1;
    ctx.font = `${13 * u}px ui-monospace, monospace`;
    ctx.textBaseline = 'alphabetic';
    for (let m = 0; m * pxPerM <= W; m += step) {
      const x = m * pxPerM;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x, H - 7 * u);
      ctx.stroke();
      ctx.fillText(`${+m.toPrecision(3)} m`, x + 3 * u, H - 10 * u);
    }
    for (let m = step; m * pxPerM <= H; m += step) {
      const y = H - m * pxPerM;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(7 * u, y);
      ctx.stroke();
      ctx.fillText(`${+m.toPrecision(3)} m`, 10 * u, y + 4 * u);
    }
  }

  if (view.showMarkers && sim.ring.length) {
    const mk = sim.markers();
    if (mk) {
      ctx.font = `${14 * u}px ui-sans-serif, system-ui, sans-serif`;
      if (mk.stagnation.cp >= 0.3) {
        const c = css([0.9, 0.5, 0.3]);
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 2 * u;
        ctx.beginPath();
        ctx.arc(X(mk.stagnation.x), Y(mk.stagnation.y), 5 * u, 0, Math.PI * 2);
        ctx.stroke();
        const text = `${labels.stagnation}  Cp ${mk.stagnation.cp >= 0 ? '+' : ''}${mk.stagnation.cp.toFixed(2)}  (${fmtPa(mk.stagnation.cp * ph.q)})`;
        ctx.textAlign = 'right';
        ctx.fillText(text, X(mk.stagnation.x) - 12 * u, Y(mk.stagnation.y) + 4 * u);
        ctx.textAlign = 'left';
      }
      if (mk.suction.cp <= -0.3) {
        const c = css([0.45, 0.7, 0.9]);
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 2 * u;
        ctx.beginPath();
        ctx.arc(X(mk.suction.x), Y(mk.suction.y), 5 * u, 0, Math.PI * 2);
        ctx.stroke();
        const text = `${labels.suction}  Cp ${mk.suction.cp.toFixed(2)}  (${fmtPa(mk.suction.cp * ph.q)})`;
        ctx.fillText(text, X(mk.suction.x) + 12 * u, Y(mk.suction.y) + 4 * u);
      }
    }
  }

  // ---- bandeau d'information en haut à gauche
  const pad = 10 * u;
  const boxW = 362 * u;
  const boxH = (paused ? 120 : 100) * u;
  roundRect(ctx, pad, pad * 0.8, boxW, boxH, 12 * u);
  ctx.fillStyle = css(BG, 0.62);
  ctx.fill();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgb(237,237,242)';
  ctx.font = `600 ${40 * u}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(`${windMs.toFixed(0)} m/s`, pad + 12 * u, pad + 38 * u);
  ctx.fillStyle = 'rgb(178,184,199)';
  ctx.font = `${15 * u}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(
    `${(windMs * 3.6).toFixed(0)} km/h  ·  Mach ${ph.mach.toFixed(2)}  ·  Re ${ph.re.toExponential(1)}`,
    pad + 12 * u,
    pad + 62 * u,
  );
  ctx.fillStyle = 'rgb(148,153,168)';
  ctx.font = `${13 * u}px ui-sans-serif, system-ui, sans-serif`;
  const inc = Math.round(sim.incidenceDeg);
  ctx.fillText(
    `${labels.slowmo} ×${ph.ralenti.toFixed(0)} (${ph.screenSpeed.toFixed(2)} ${labels.screenSec})  ${labels.shapes[sim.shape]} ${inc >= 0 ? '+' : ''}${inc}°`,
    pad + 12 * u,
    pad + 82 * u,
  );
  if (paused) {
    ctx.fillStyle = css(ACCENT);
    ctx.fillText(labels.pause, pad + 12 * u, pad + 102 * u);
  }

  // ---- légende en bas à droite
  const bw = 190 * u;
  const bh = 10 * u;
  const bx = W - bw - 24 * u;
  const by = H - 54 * u - (view.showRuler ? 0 : 0);
  roundRect(ctx, bx - 12 * u, by - 28 * u, bw + 24 * u, bh + 52 * u, 10 * u);
  ctx.fillStyle = css(BG, 0.62);
  ctx.fill();
  const n = 48;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = css(legendColor(view.mode, view.palette, i / (n - 1)));
    ctx.fillRect(bx + (i * bw) / n, by, bw / n + 1, bh);
  }
  const cfgW = sim.cfg.widthM;
  let lo: string;
  let hi: string;
  if (view.mode === 0) {
    lo = `${(SPEED_MIN * windMs).toFixed(0)} m/s`;
    hi = `${(SPEED_MAX * windMs).toFixed(0)} m/s`;
  } else if (view.mode === 1) {
    lo = fmtPa(-view.cpRange * ph.q);
    hi = fmtPa(view.cpRange * ph.q);
  } else if (view.mode === 2) {
    const r = (view.vortRange * NX * windMs) / cfgW;
    lo = `${(-r).toFixed(0)} /s`;
    hi = `${r.toFixed(0)} /s`;
  } else {
    lo = '0 m/s';
    hi = `${(SPEED_RAMP_MAX * windMs).toFixed(0)} m/s`;
  }
  ctx.fillStyle = 'rgb(189,194,209)';
  ctx.font = `${13 * u}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(labels.legend[view.mode], bx, by - 10 * u);
  ctx.fillText(lo, bx, by + bh + 16 * u);
  ctx.textAlign = 'right';
  ctx.fillText(hi, bx + bw, by + bh + 16 * u);
  ctx.textAlign = 'left';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
