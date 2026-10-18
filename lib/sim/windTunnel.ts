/*
 * Soufflerie numérique de Nova Studio — port JavaScript de la simulation Python.
 *
 * Fluide incompressible (« Stable Fluids ») sur une grille décalée (MAC) :
 *   u sur les faces verticales, v sur les faces horizontales, pression et fumée au centre des cellules.
 * Chaque pas : confinement de vorticité → advection de la vitesse → projection (pression) → advection de la fumée.
 * La simulation tourne en « cellules » et « secondes simulées » ; `phys()` convertit en m, m/s, Pa.
 */

import { PressureSolver } from './pressureSolver';

export const NX = 240;
export const NY = 180;
export const DT = 1 / 60;
export const MIN_SCREEN = 0.1;
export const MAX_SCREEN = 1.0;
export const MAX_ANGLE = (40 * Math.PI) / 180;

export type ShapeKey = 'cube' | 'ellipse' | 'wing';
export const SHAPE_ORDER: ShapeKey[] = ['cube', 'ellipse', 'wing'];

export interface Config {
  widthM: number;
  windMs: number;
  slowmo: number;
  fluid: 0 | 1; // 0 = air, 1 = eau
  tempC: number;
  confinement: number;
  decay: number;
  band: number;
  gap: number;
  smokeOn: boolean;
}

export function defaultConfig(): Config {
  return {
    widthM: 2,
    windMs: 20,
    slowmo: 25,
    fluid: 0,
    tempC: 15,
    confinement: 6,
    decay: 0.998,
    band: 3,
    gap: 6,
    smokeOn: true,
  };
}

export const PRESETS: Record<string, Partial<Config>> = {
  tunnel: { widthM: 2, windMs: 30, slowmo: 37, fluid: 0 },
  model: { widthM: 0.5, windMs: 10, slowmo: 50, fluid: 0 },
  wing: { widthM: 10, windMs: 80, slowmo: 20, fluid: 0 },
  water: { widthM: 1, windMs: 2, slowmo: 5, fluid: 1 },
};

export function fluidProps(cfg: Config) {
  if (cfg.fluid === 0) {
    const T = cfg.tempC + 273.15;
    const rho = 101325 / (287.05 * T);
    const mu = (1.458e-6 * Math.pow(T, 1.5)) / (T + 110.4);
    return { rho, nu: mu / rho, sound: Math.sqrt(1.4 * 287.05 * T) };
  }
  return { rho: 998, nu: 1e-6, sound: 1480 };
}

export function screenSpeed(cfg: Config) {
  const raw = cfg.windMs / cfg.widthM / cfg.slowmo;
  return Math.min(MAX_SCREEN, Math.max(MIN_SCREEN, raw));
}

/* ------------------------------------------------------------------ formes */

export const GEO = { scale: 1, thickness: 0.14 };
const CUBE_HALF = 26;
const ELLIPSE_RX = 34;
const ELLIPSE_RY = 21;
const CHORD = 80;

const chord = () => CHORD * GEO.scale;
const wingLeadingX = () => NX / 2 - chord() / 2;

function nacaHalfThickness(xi: number, t: number) {
  const x = Math.min(1, Math.max(0, xi));
  return (
    5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4)
  );
}

function pivotOf(shape: ShapeKey, cy: number): [number, number] {
  if (shape === 'wing') return [wingLeadingX() + 0.25 * chord(), cy];
  return [NX / 2, cy];
}

function inShape(shape: ShapeKey, x: number, y: number, cy: number): boolean {
  const s = GEO.scale;
  if (shape === 'cube') {
    const h = CUBE_HALF * s;
    return Math.abs(x - NX / 2) <= h && Math.abs(y - cy) <= h;
  }
  if (shape === 'ellipse') {
    return ((x - NX / 2) / (ELLIPSE_RX * s)) ** 2 + ((y - cy) / (ELLIPSE_RY * s)) ** 2 <= 1;
  }
  const c = chord();
  const xi = (x - wingLeadingX()) / c;
  return xi >= 0 && xi <= 1 && Math.abs(y - cy) <= nacaHalfThickness(xi, GEO.thickness) * c;
}

export function refLengthCells(shape: ShapeKey) {
  const s = GEO.scale;
  if (shape === 'cube') return 2 * CUBE_HALF * s;
  if (shape === 'ellipse') return 2 * ELLIPSE_RX * s;
  return chord();
}

export function outlineCells(shape: ShapeKey, cy: number, angle: number, segments = 64) {
  const cx = NX / 2;
  const s = GEO.scale;
  const gx: number[] = [];
  const gy: number[] = [];
  if (shape === 'ellipse') {
    for (let k = 0; k < segments; k++) {
      const a = (k / segments) * Math.PI * 2;
      gx.push(cx + ELLIPSE_RX * s * Math.cos(a));
      gy.push(cy + ELLIPSE_RY * s * Math.sin(a));
    }
  } else if (shape === 'wing') {
    const n = segments / 2;
    const top: number[] = [];
    const hh: number[] = [];
    for (let k = 0; k < n; k++) {
      const xi = k / (n - 1);
      top.push(wingLeadingX() + xi * chord());
      hh.push(nacaHalfThickness(xi, GEO.thickness) * chord());
    }
    for (let k = 0; k < n; k++) {
      gx.push(top[k]);
      gy.push(cy + hh[k]);
    }
    for (let k = n - 1; k >= 0; k--) {
      gx.push(top[k]);
      gy.push(cy - hh[k]);
    }
  } else {
    const h = CUBE_HALF * s;
    gx.push(cx - h, cx + h, cx + h, cx - h);
    gy.push(cy - h, cy - h, cy + h, cy + h);
  }
  const [px, py] = pivotOf(shape, cy);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const ox: number[] = [];
  const oy: number[] = [];
  for (let k = 0; k < gx.length; k++) {
    const dx = gx[k] - px;
    const dy = gy[k] - py;
    ox.push(dx * ca - dy * sa + px);
    oy.push(dx * sa + dy * ca + py);
  }
  return { x: ox, y: oy };
}

/* ------------------------------------------------------------------ interpolation */

function bilerp(f: Float32Array, w: number, h: number, xIn: number, yIn: number): number {
  const x = xIn < 0 ? 0 : xIn > w - 1.001 ? w - 1.001 : xIn;
  const y = yIn < 0 ? 0 : yIn > h - 1.001 ? h - 1.001 : yIn;
  const x0 = x | 0;
  const y0 = y | 0;
  const sx = x - x0;
  const sy = y - y0;
  const i = y0 * w + x0;
  const top = f[i] + (f[i + 1] - f[i]) * sx;
  const bot = f[i + w] + (f[i + w + 1] - f[i + w]) * sx;
  return top + (bot - top) * sy;
}

/* ------------------------------------------------------------------ le fluide */

export class FluidSim {
  cfg: Config;
  u = new Float32Array(NY * (NX + 1));
  v = new Float32Array((NY + 1) * NX);
  p = new Float32Array(NY * NX);
  dye = new Float32Array(NY * NX);
  uc = new Float32Array(NY * NX);
  vc = new Float32Array(NY * NX);
  cp = new Float32Array(NY * NX);
  vort = new Float32Array(NY * NX);
  solidFrac = new Float32Array(NY * NX);

  wind: number;
  shape: ShapeKey = 'cube';
  cy = NY / 2;
  angle = 0;

  // poids d'ouverture
  wU = new Float32Array(NY * (NX + 1));
  wV = new Float32Array((NY + 1) * NX);
  openU = new Float32Array(NY * (NX + 1));
  openV = new Float32Array((NY + 1) * NX);
  wl = new Float32Array(NY * NX);
  wr = new Float32Array(NY * NX);
  wd = new Float32Array(NY * NX);
  wu = new Float32Array(NY * NX);
  diag = new Float32Array(NY * NX);
  fluidMask = new Float32Array(NY * NX);
  invDiag = new Float32Array(NY * NX);
  fxW = new Float32Array(NY * NX);
  fyW = new Float32Array(NY * NX);
  ring: number[] = [];
  dyeSource = new Float32Array(NY);

  // tampons de travail
  private tmpU = new Float32Array(NY * (NX + 1));
  private tmpV = new Float32Array((NY + 1) * NX);
  private tmpD = new Float32Array(NY * NX);
  private tmpD2 = new Float32Array(NY * NX);
  private cgR = new Float32Array(NY * NX);
  private cgZ = new Float32Array(NY * NX);
  private cgS = new Float32Array(NY * NX);
  private cgB = new Float32Array(NY * NX);

  constructor(cfg: Config) {
    this.cfg = cfg;
    this.wind = screenSpeed(cfg) * NX;
    this.makeDyeSource();
    this.rebuildObstacle(true);
  }

  get incidenceDeg() {
    return (-this.angle * 180) / Math.PI;
  }

  makeDyeSource() {
    const band = Math.round(this.cfg.band);
    const gap = Math.round(this.cfg.gap);
    this.dyeSource.fill(0);
    let y = Math.floor(((NY - band) % (band + gap)) / 2);
    while (y + band <= NY) {
      for (let k = 0; k < band; k++) this.dyeSource[y + k] = 1;
      y += band + gap;
    }
  }

  setWind(cellsPerS: number) {
    const ratio = cellsPerS / this.wind;
    this.wind = cellsPerS;
    for (let i = 0; i < this.u.length; i++) this.u[i] *= ratio;
    for (let i = 0; i < this.v.length; i++) this.v[i] *= ratio;
    for (let i = 0; i < this.p.length; i++) this.p[i] *= ratio;
    this.applyBoundaries();
  }

  reset() {
    this.dye.fill(0);
    this.rebuildObstacle(true);
  }

  setShape(shape: ShapeKey) {
    this.shape = shape;
    this.rebuildObstacle(false);
  }

  refreshObstacle() {
    this.rebuildObstacle(false);
  }

  private clampCy() {
    const { y } = outlineCells(this.shape, this.cy, this.angle);
    const half = (Math.max(...y) - Math.min(...y)) / 2 + 3;
    this.cy = Math.min(NY - half, Math.max(half, this.cy));
  }

  private computeSolidFraction() {
    const frac = this.solidFrac;
    frac.fill(0);
    const o = outlineCells(this.shape, this.cy, this.angle);
    const x0 = Math.max(0, Math.floor(Math.min(...o.x)) - 2);
    const x1 = Math.min(NX, Math.floor(Math.max(...o.x)) + 3);
    const y0 = Math.max(0, Math.floor(Math.min(...o.y)) - 2);
    const y1 = Math.min(NY, Math.floor(Math.max(...o.y)) + 3);
    const [px, py] = pivotOf(this.shape, this.cy);
    const ca = Math.cos(-this.angle);
    const sa = Math.sin(-this.angle);
    const SS = 4;
    for (let j = y0; j < y1; j++) {
      for (let i = x0; i < x1; i++) {
        let acc = 0;
        for (let a = 0; a < SS; a++) {
          for (let b = 0; b < SS; b++) {
            const dx = i + (b + 0.5) / SS - px;
            const dy = j + (a + 0.5) / SS - py;
            const lx = dx * ca - dy * sa + px;
            const ly = dx * sa + dy * ca + py;
            if (inShape(this.shape, lx, ly, this.cy)) acc++;
          }
        }
        frac[j * NX + i] = acc / (SS * SS);
      }
    }
  }

  private rebuildObstacle(resetFlow: boolean) {
    this.clampCy();
    this.computeSolidFraction();
    const f = this.solidFrac;
    const { wU, wV, openU, openV } = this;
    const W1 = NX + 1;

    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < W1; i++) {
        let w = 1;
        if (i > 0 && i < NX) w = 1 - Math.max(f[j * NX + i - 1], f[j * NX + i]);
        wU[j * W1 + i] = w < 0.05 ? 0 : w;
      }
    }
    const wVf = new Float32Array(this.wV.length);
    for (let j = 0; j < NY + 1; j++) {
      for (let i = 0; i < NX; i++) {
        let w = 1;
        if (j > 0 && j < NY) w = 1 - Math.max(f[(j - 1) * NX + i], f[j * NX + i]);
        w = w < 0.05 ? 0 : w;
        wV[j * NX + i] = w;
        wVf[j * NX + i] = w;
      }
    }
    for (let i = 0; i < NX; i++) {
      wVf[i] = 1;
      wVf[NY * NX + i] = 1;
      wV[i] = 0; // parois haut/bas : l'air glisse, ne traverse pas
      wV[NY * NX + i] = 0;
    }
    for (let k = 0; k < wU.length; k++) openU[k] = wU[k] > 0 ? 1 : 0;
    for (let k = 0; k < wV.length; k++) openV[k] = wV[k] > 0 ? 1 : 0;

    this.ring = [];
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        this.wl[k] = i === 0 ? 0 : wU[j * W1 + i];
        this.wr[k] = wU[j * W1 + i + 1];
        this.wd[k] = wV[j * NX + i];
        this.wu[k] = wV[(j + 1) * NX + i];
        const d = this.wl[k] + this.wr[k] + this.wd[k] + this.wu[k];
        this.diag[k] = d;
        this.fluidMask[k] = d > 0 ? 1 : 0;
        this.invDiag[k] = d > 0 ? 1 / Math.max(d, 1e-6) : 0;
        this.fxW[k] = wU[j * W1 + i] - wU[j * W1 + i + 1];
        this.fyW[k] = wVf[j * NX + i] - wVf[(j + 1) * NX + i];
        if (Math.abs(this.fxW[k]) + Math.abs(this.fyW[k]) > 0.05 && f[k] < 0.9) this.ring.push(k);
      }
    }

    if (resetFlow) {
      this.u.fill(this.wind);
      this.v.fill(0);
      this.p.fill(0);
    }
    this.solver.setup(this.wl, this.wr, this.wd, this.wu);
    this.applyBoundaries();
    this.project(resetFlow ? 200 : 40);
  }

  private applyBoundaries() {
    const W1 = NX + 1;
    for (let j = 0; j < NY; j++) this.u[j * W1] = this.wind;
    for (let k = 0; k < this.u.length; k++) this.u[k] *= this.openU[k];
    for (let k = 0; k < this.v.length; k++) this.v[k] *= this.openV[k];
  }

  /** Projection : trouve la pression qui rend le champ sans divergence (gradient conjugué préconditionné). */
  solver = new PressureSolver(NX, NY);
  project(maxIters = 25) {
    const { wU, wV, u, v, fluidMask } = this;
    const W1 = NX + 1;
    const b = this.cgB;
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        const div =
          (wU[j * W1 + i + 1] * u[j * W1 + i + 1] - wU[j * W1 + i] * u[j * W1 + i] +
            wV[(j + 1) * NX + i] * v[(j + 1) * NX + i] - wV[j * NX + i] * v[j * NX + i]) *
          fluidMask[k];
        b[k] = -div;
      }
    }
    const p = this.p;
    for (let k = 0; k < p.length; k++) p[k] *= fluidMask[k];
    this.solver.solve(b, p, maxIters, 5e-3);
    const { openU, openV } = this;
    for (let j = 0; j < NY; j++) {
      for (let i = 1; i < NX; i++) {
        u[j * W1 + i] -= (p[j * NX + i] - p[j * NX + i - 1]) * openU[j * W1 + i];
      }
      u[j * W1 + NX] += p[j * NX + NX - 1] * openU[j * W1 + NX];
    }
    for (let j = 1; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        v[j * NX + i] -= (p[j * NX + i] - p[(j - 1) * NX + i]) * openV[j * NX + i];
      }
    }
    this.applyBoundaries();
  }

  private centreVelocity() {
    const W1 = NX + 1;
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        this.uc[k] = 0.5 * (this.u[j * W1 + i] + this.u[j * W1 + i + 1]);
        this.vc[k] = 0.5 * (this.v[j * NX + i] + this.v[(j + 1) * NX + i]);
      }
    }
  }

  private vorticityField(out: Float32Array) {
    const { uc, vc } = this;
    out.fill(0);
    for (let j = 1; j < NY - 1; j++) {
      for (let i = 1; i < NX - 1; i++) {
        const k = j * NX + i;
        out[k] = 0.5 * (vc[k + 1] - vc[k - 1]) - 0.5 * (uc[k + NX] - uc[k - NX]);
      }
    }
  }

  private vorticityConfinement(dt: number) {
    const kc = this.cfg.confinement;
    if (kc <= 0) return;
    this.centreVelocity();
    const w = this.tmpD;
    this.vorticityField(w);
    const fx = this.tmpD2;
    const fy = this.cgS;
    fx.fill(0);
    fy.fill(0);
    for (let j = 1; j < NY - 1; j++) {
      for (let i = 1; i < NX - 1; i++) {
        const k = j * NX + i;
        const gx = 0.5 * (Math.abs(w[k + 1]) - Math.abs(w[k - 1]));
        const gy = 0.5 * (Math.abs(w[k + NX]) - Math.abs(w[k - NX]));
        const norm = Math.sqrt(gx * gx + gy * gy) + 1e-6;
        fx[k] = kc * (gy / norm) * w[k] * this.fluidMask[k];
        fy[k] = -kc * (gx / norm) * w[k] * this.fluidMask[k];
      }
    }
    const W1 = NX + 1;
    for (let j = 0; j < NY; j++) {
      for (let i = 1; i < NX; i++) {
        this.u[j * W1 + i] += 0.5 * (fx[j * NX + i - 1] + fx[j * NX + i]) * dt;
      }
    }
    for (let j = 1; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        this.v[j * NX + i] += 0.5 * (fy[(j - 1) * NX + i] + fy[j * NX + i]) * dt;
      }
    }
  }

  private advectVelocity(dt: number) {
    const { u, v, tmpU, tmpV } = this;
    const W1 = NX + 1;
    const H1 = NY + 1;
    // u : faces (i, j+0.5)
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < W1; i++) {
        const vu = bilerp(v, NX, H1, i - 0.5, j + 0.5);
        const uu = u[j * W1 + i];
        tmpU[j * W1 + i] = bilerp(u, W1, NY, i - dt * uu, j - dt * vu);
      }
    }
    // v : faces (i+0.5, j)
    for (let j = 0; j < H1; j++) {
      for (let i = 0; i < NX; i++) {
        const uv = bilerp(u, W1, NY, i + 0.5, j - 0.5);
        const vv = v[j * NX + i];
        tmpV[j * NX + i] = bilerp(v, NX, H1, i - dt * uv, j - dt * vv);
      }
    }
    u.set(tmpU);
    v.set(tmpV);
  }

  private advectDye(dt: number) {
    this.centreVelocity();
    const { uc, vc, dye, tmpD, tmpD2 } = this;
    const lo = this.cgR;
    const hi = this.cgZ;
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        const x = i - dt * uc[k];
        const y = j - dt * vc[k];
        tmpD[k] = bilerp(dye, NX, NY, x, y);
        const xc = Math.min(NX - 1.001, Math.max(0, x));
        const yc = Math.min(NY - 1.001, Math.max(0, y));
        const x0 = xc | 0;
        const y0 = yc | 0;
        const a = dye[y0 * NX + x0];
        const b = dye[y0 * NX + x0 + 1];
        const c = dye[(y0 + 1) * NX + x0];
        const d = dye[(y0 + 1) * NX + x0 + 1];
        lo[k] = Math.min(a, b, c, d);
        hi[k] = Math.max(a, b, c, d);
      }
    }
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        tmpD2[k] = bilerp(tmpD, NX, NY, i + dt * uc[k], j + dt * vc[k]);
      }
    }
    for (let k = 0; k < dye.length; k++) {
      const val = tmpD[k] + 0.5 * (dye[k] - tmpD2[k]);
      dye[k] = val < lo[k] ? lo[k] : val > hi[k] ? hi[k] : val;
    }
  }

  step(dt = DT) {
    this.applyBoundaries();
    this.vorticityConfinement(dt);
    this.advectVelocity(dt);
    this.applyBoundaries();
    this.project();
    const on = this.cfg.smokeOn;
    for (let j = 0; j < NY; j++) {
      const src = on ? this.dyeSource[j] : 0;
      for (let i = 0; i < 3; i++) {
        const k = j * NX + i;
        if (src > this.dye[k]) this.dye[k] = src;
      }
    }
    this.advectDye(dt);
    const decay = this.cfg.decay;
    for (let k = 0; k < this.dye.length; k++) {
      if (this.solidFrac[k] > 0.9) this.dye[k] = 0;
      else this.dye[k] *= decay;
    }
  }

  /** Prépare vitesse au centre, Cp et vorticité pour l'affichage et les mesures. */
  updateFields() {
    this.centreVelocity();
    let pRef = 0;
    for (let j = 0; j < NY; j++) for (let i = 2; i < 6; i++) pRef += this.p[j * NX + i];
    pRef /= NY * 4;
    const scale = 2 / (DT * this.wind * this.wind);
    for (let k = 0; k < this.cp.length; k++) this.cp[k] = scale * (this.p[k] - pRef) * this.fluidMask[k];
    this.vorticityField(this.vort);
    for (let k = 0; k < this.vort.length; k++) if (this.solidFrac[k] > 0.5) this.vort[k] = 0;
  }

  phys() {
    const c = this.cfg;
    const { rho, nu, sound } = fluidProps(c);
    const dx = c.widthM / NX;
    const dCells = refLengthCells(this.shape);
    const screen = this.wind / NX;
    return {
      dx,
      vel: c.windMs / this.wind,
      q: 0.5 * rho * c.windMs * c.windMs,
      rho,
      sound,
      screenSpeed: screen,
      ralenti: c.windMs / c.widthM / Math.max(screen, 1e-6),
      vortScale: (c.windMs * NX) / c.widthM,
      mach: c.windMs / sound,
      re: (c.windMs * dCells * dx) / nu,
    };
  }

  /** (Cd, Cl) : pression intégrée sur la surface, divisée par q × longueur de référence. */
  forcesCoeffs(): [number, number] {
    const d = refLengthCells(this.shape);
    let fx = 0;
    let fy = 0;
    for (let k = 0; k < this.cp.length; k++) {
      fx += this.cp[k] * this.fxW[k];
      fy += this.cp[k] * this.fyW[k];
    }
    return [fx / d, fy / d];
  }

  markers() {
    if (this.ring.length === 0) return null;
    let iMax = this.ring[0];
    let iMin = this.ring[0];
    for (const k of this.ring) {
      if (this.cp[k] > this.cp[iMax]) iMax = k;
      if (this.cp[k] < this.cp[iMin]) iMin = k;
    }
    const at = (k: number) => ({ x: (k % NX) + 0.5, y: Math.floor(k / NX) + 0.5, cp: this.cp[k] });
    return { stagnation: at(iMax), suction: at(iMin) };
  }

  outline() {
    return outlineCells(this.shape, this.cy, this.angle);
  }

  /** Valeurs au point (x, y) en cellules. */
  sample(x: number, y: number) {
    const xs = x - 0.5;
    const ys = y - 0.5;
    return {
      u: bilerp(this.uc, NX, NY, xs, ys),
      v: bilerp(this.vc, NX, NY, xs, ys),
      cp: bilerp(this.cp, NX, NY, xs, ys),
      vort: bilerp(this.vort, NX, NY, xs, ys),
      solid: bilerp(this.solidFrac, NX, NY, xs, ys),
    };
  }

  /** Lignes de courant depuis l'entrée : liste de polylignes [x, y, vitesse relative]. */
  streamlines(n: number, steps = 110, h = 2.6) {
    const lines: number[][][] = [];
    for (let s = 0; s < n; s++) {
      let x = 2;
      let y = 6 + ((NY - 12) * s) / Math.max(1, n - 1);
      const pts: number[][] = [[x, y, 1]];
      for (let k = 0; k < steps; k++) {
        const ux = bilerp(this.uc, NX, NY, x - 0.5, y - 0.5);
        const vy = bilerp(this.vc, NX, NY, x - 0.5, y - 0.5);
        const sp = Math.hypot(ux, vy);
        const st = h / Math.max(sp, 1e-6);
        x += ux * st;
        y += vy * st;
        if (x <= 0 || x >= NX - 1 || y <= 0 || y >= NY - 1) break;
        if (sp < 0.02 * this.wind) break;
        if (this.solidFrac[(y | 0) * NX + (x | 0)] >= 0.5) break;
        pts.push([x, y, sp / this.wind]);
      }
      if (pts.length > 1) lines.push(pts);
    }
    return lines;
  }
}
