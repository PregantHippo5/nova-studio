/*
 * Solveur de pression : gradient conjugué préconditionné par un multigrille (agrégation 2×2).
 * Beaucoup plus rapide que le gradient conjugué simple (quelques itérations au lieu de 100+),
 * ce qui permet de tenir 60 images/s dans le navigateur.
 *
 * Tous les tableaux sont « paddés » d'un cadre de zéros (stride = nx + 2) : plus de test de bord dans les boucles.
 */

interface Level {
  nx: number;
  ny: number;
  S: number;
  n: number;
  wl: Float32Array;
  wr: Float32Array;
  wd: Float32Array;
  wu: Float32Array;
  dg: Float32Array;
  inv: Float32Array;
  x: Float32Array;
  b: Float32Array;
  r: Float32Array;
  chol?: Float64Array;
  cells?: Int32Array;
}

function makeLevel(nx: number, ny: number): Level {
  const S = nx + 2;
  const n = (ny + 2) * S;
  const f = () => new Float32Array(n);
  return { nx, ny, S, n, wl: f(), wr: f(), wd: f(), wu: f(), dg: f(), inv: f(), x: f(), b: f(), r: f() };
}

function applyA(L: Level, x: Float32Array, out: Float32Array) {
  const { nx, ny, S, wl, wr, wd, wu, dg } = L;
  for (let j = 0; j < ny; j++) {
    let k = (j + 1) * S + 1;
    for (let i = 0; i < nx; i++, k++) {
      out[k] = dg[k] * x[k] - (wl[k] * x[k - 1] + wr[k] * x[k + 1] + wd[k] * x[k - S] + wu[k] * x[k + S]);
    }
  }
}

function residual(L: Level) {
  const { nx, ny, S, wl, wr, wd, wu, dg, x, b, r } = L;
  for (let j = 0; j < ny; j++) {
    let k = (j + 1) * S + 1;
    for (let i = 0; i < nx; i++, k++) {
      r[k] = b[k] - (dg[k] * x[k] - (wl[k] * x[k - 1] + wr[k] * x[k + 1] + wd[k] * x[k - S] + wu[k] * x[k + S]));
    }
  }
}

const OMEGA = 0.8;
const COARSE_GAIN = 1.6;

export class PressureSolver {
  private levels: Level[] = [];
  private nx: number;
  private ny: number;
  // vecteurs du CG (niveau fin, paddés)
  private cr: Float32Array;
  private cz: Float32Array;
  private cd: Float32Array;
  private cs: Float32Array;
  private px: Float32Array;
  iterations = 0;

  constructor(nx: number, ny: number) {
    this.nx = nx;
    this.ny = ny;
    const L = makeLevel(nx, ny);
    this.levels = [L];
    let cx = nx;
    let cy = ny;
    while (cx * cy > 200) {
      cx = Math.ceil(cx / 2);
      cy = Math.ceil(cy / 2);
      this.levels.push(makeLevel(cx, cy));
    }
    this.cr = new Float32Array(L.n);
    this.cz = new Float32Array(L.n);
    this.cd = new Float32Array(L.n);
    this.cs = new Float32Array(L.n);
    this.px = new Float32Array(L.n);
  }

  /** Reçoit les poids de liens (non paddés, nx*ny) et prépare toute la hiérarchie. */
  setup(wl: Float32Array, wr: Float32Array, wd: Float32Array, wu: Float32Array) {
    const L0 = this.levels[0];
    const { nx, ny, S } = L0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = (j + 1) * S + i + 1;
        const q = j * nx + i;
        L0.wl[k] = wl[q];
        L0.wr[k] = wr[q];
        L0.wd[k] = wd[q];
        L0.wu[k] = wu[q];
      }
    }
    this.finish(L0);
    for (let l = 1; l < this.levels.length; l++) {
      this.coarsen(this.levels[l - 1], this.levels[l]);
      this.finish(this.levels[l]);
    }
    this.factorCoarsest();
  }

  private finish(L: Level) {
    const { nx, ny, S } = L;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = (j + 1) * S + i + 1;
        const d = L.wl[k] + L.wr[k] + L.wd[k] + L.wu[k];
        L.dg[k] = d;
        L.inv[k] = d > 1e-9 ? 1 / d : 0;
      }
    }
  }

  /** Opérateur grossier de Galerkin : somme des liens qui traversent chaque interface d'agrégat. */
  private coarsen(F: Level, C: Level) {
    C.wl.fill(0);
    C.wr.fill(0);
    C.wd.fill(0);
    C.wu.fill(0);
    for (let j = 0; j < F.ny; j++) {
      for (let i = 0; i < F.nx; i++) {
        const k = (j + 1) * F.S + i + 1;
        const kc = ((j >> 1) + 1) * C.S + (i >> 1) + 1;
        if ((i & 1) === 0) C.wl[kc] += F.wl[k];
        if ((i & 1) === 1 || i === F.nx - 1) C.wr[kc] += F.wr[k];
        if ((j & 1) === 0) C.wd[kc] += F.wd[k];
        if ((j & 1) === 1 || j === F.ny - 1) C.wu[kc] += F.wu[k];
      }
    }
  }

  private factorCoarsest() {
    const C = this.levels[this.levels.length - 1];
    const idx: number[] = [];
    for (let j = 0; j < C.ny; j++) for (let i = 0; i < C.nx; i++) idx.push((j + 1) * C.S + i + 1);
    const m = idx.length;
    const pos = new Map<number, number>();
    idx.forEach((k, a) => pos.set(k, a));
    const A = new Float64Array(m * m);
    for (let a = 0; a < m; a++) {
      const k = idx[a];
      A[a * m + a] = C.dg[k] > 1e-9 ? C.dg[k] * (1 + 1e-6) + 1e-9 : 1;
      const links: [number, number][] = [
        [k - 1, C.wl[k]],
        [k + 1, C.wr[k]],
        [k - C.S, C.wd[k]],
        [k + C.S, C.wu[k]],
      ];
      for (const [nk, w] of links) {
        const b = pos.get(nk);
        if (b !== undefined && w > 0) A[a * m + b] -= w;
      }
    }
    // Cholesky (A = L L^T), stocké dans le triangle inférieur
    for (let j = 0; j < m; j++) {
      let s = A[j * m + j];
      for (let k = 0; k < j; k++) s -= A[j * m + k] * A[j * m + k];
      const d = Math.sqrt(Math.max(s, 1e-12));
      A[j * m + j] = d;
      for (let i = j + 1; i < m; i++) {
        let t = A[i * m + j];
        for (let k = 0; k < j; k++) t -= A[i * m + k] * A[j * m + k];
        A[i * m + j] = t / d;
      }
    }
    C.chol = A;
    C.cells = Int32Array.from(idx);
  }

  private solveCoarsest(C: Level) {
    const A = C.chol!;
    const cells = C.cells!;
    const m = cells.length;
    const y = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      let s = C.b[cells[i]];
      for (let k = 0; k < i; k++) s -= A[i * m + k] * y[k];
      y[i] = s / A[i * m + i];
    }
    for (let i = m - 1; i >= 0; i--) {
      let s = y[i];
      for (let k = i + 1; k < m; k++) s -= A[k * m + i] * y[k];
      y[i] = s / A[i * m + i];
    }
    for (let i = 0; i < m; i++) C.x[cells[i]] = y[i];
  }

  /** Un cycle en V : approximation de A⁻¹ b pour le niveau l (b et x stockés dans le niveau). */
  private vcycle(l: number) {
    const L = this.levels[l];
    if (l === this.levels.length - 1) {
      this.solveCoarsest(L);
      return;
    }
    const { nx, ny, S, inv, b, x, r } = L;
    // pré-lissage (Jacobi pondéré, départ à zéro)
    for (let j = 0; j < ny; j++) {
      let k = (j + 1) * S + 1;
      for (let i = 0; i < nx; i++, k++) x[k] = OMEGA * inv[k] * b[k];
    }
    residual(L);
    // restriction (somme sur chaque agrégat 2×2)
    const C = this.levels[l + 1];
    C.b.fill(0);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        C.b[((j >> 1) + 1) * C.S + (i >> 1) + 1] += r[(j + 1) * S + i + 1];
      }
    }
    this.vcycle(l + 1);
    // prolongation (constante par morceaux) et correction
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        x[(j + 1) * S + i + 1] += COARSE_GAIN * C.x[((j >> 1) + 1) * C.S + (i >> 1) + 1];
      }
    }
    // post-lissage
    residual(L);
    for (let j = 0; j < ny; j++) {
      let k = (j + 1) * S + 1;
      for (let i = 0; i < nx; i++, k++) x[k] += OMEGA * inv[k] * r[k];
    }
  }

  private precondition(rIn: Float32Array, zOut: Float32Array) {
    const L = this.levels[0];
    L.b.set(rIn);
    this.vcycle(0);
    zOut.set(L.x);
  }

  /**
   * Résout A p = b (b et p non paddés, longueur nx*ny). p sert de départ et reçoit le résultat.
   * Renvoie le nombre d'itérations.
   */
  solve(b: Float32Array, p: Float32Array, maxIters: number, tol: number) {
    const L = this.levels[0];
    const { nx, ny, S } = L;
    const { cr, cz, cd, cs, px } = this;
    cr.fill(0);
    px.fill(0);
    let bb = 1e-20;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = (j + 1) * S + i + 1;
        px[k] = p[j * nx + i];
        cr[k] = b[j * nx + i]; // provisoire : on soustrait A p juste après
        bb += b[j * nx + i] * b[j * nx + i];
      }
    }
    applyA(L, px, cs);
    for (let j = 0; j < ny; j++) {
      let k = (j + 1) * S + 1;
      for (let i = 0; i < nx; i++, k++) cr[k] -= cs[k];
    }
    this.precondition(cr, cz);
    cd.set(cz);
    let rz = 0;
    for (let k = 0; k < L.n; k++) rz += cr[k] * cz[k];
    let it = 0;
    for (; it < maxIters; it++) {
      let rr = 0;
      for (let k = 0; k < L.n; k++) rr += cr[k] * cr[k];
      if (rr < tol * tol * bb) break;
      applyA(L, cd, cs);
      let dsd = 0;
      for (let k = 0; k < L.n; k++) dsd += cd[k] * cs[k];
      if (dsd <= 1e-20) break;
      const alpha = rz / dsd;
      for (let k = 0; k < L.n; k++) {
        px[k] += alpha * cd[k];
        cr[k] -= alpha * cs[k];
      }
      this.precondition(cr, cz);
      let rzNew = 0;
      for (let k = 0; k < L.n; k++) rzNew += cr[k] * cz[k];
      const beta = rzNew / rz;
      for (let k = 0; k < L.n; k++) cd[k] = cz[k] + beta * cd[k];
      rz = rzNew;
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) p[j * nx + i] = px[(j + 1) * S + i + 1];
    }
    this.iterations = it;
    return it;
  }
}
