"""
NOVA STUDIO - Soufflerie numerique (tunnel a fumee)
===================================================
Dependances : pip install moderngl moderngl-window numpy pillow scipy imgui-bundle

Un fluide incompressible (Stable Fluids sur grille decalee) remplit tout l'ecran.
On y injecte de la fumee, on pose un obstacle, et tout le reste (deviation,
acceleration sur les cotes, depression derriere, tourbillons) sort du calcul.

Unites reelles : la simulation tourne en "cellules" et "secondes simulees". Un
changement d'echelle (voir PhysScale) convertit en metres, m/s, Pascals, Newtons.
Ca marche parce que les equations d'un fluide parfait ne dependent pas de la
vitesse : seul le MOTIF compte, l'echelle est un simple facteur multiplicatif.

Controles (aussi dans le panneau) :
  Z/S hauteur | Q/D incidence (D = nez en haut) | A/E vent -/+ | ESPACE forme
  P pause | R reinitialiser | 1-4 modes | V vecteurs | L lignes de courant
  TAB masquer le panneau | C capture | souris : glisser = deplacer, molette = incidence
"""
import os
import time
from datetime import datetime
from types import SimpleNamespace

import moderngl
import moderngl_window as mglw
import numpy as np
from PIL import Image

try:
    from imgui_bundle import imgui
except ImportError:
    raise SystemExit("Il manque imgui-bundle :  pip install imgui-bundle")

try:
    import scipy.sparse as sp
    import scipy.sparse.linalg as spla
    HAVE_SCIPY = True
except ImportError:
    HAVE_SCIPY = False

# =============================================================================
# Constantes
# =============================================================================
NX, NY = 240, 180
DT = 1.0 / 60.0                       # pas de temps simule (s simulees)
MIN_SCREEN, MAX_SCREEN = 0.1, 1.0     # vitesse d'ecoulement a l'ecran (ecrans/s)
CG_ITERS = 30
PANEL_W = 372

BG = (0.045, 0.048, 0.055)
OBSTACLE_COLOR = (0.88, 0.88, 0.90)
OBSTACLE_FILL = (0.115, 0.120, 0.135)
ACCENT = (0.88, 0.80, 0.64)

# palettes de fumee : (nom, couleur air lent, couleur air rapide)
PALETTES = [
    ("Nova (bleu / or)", (0.42, 0.47, 0.56), (0.88, 0.80, 0.64)),
    ("Argent", (0.52, 0.55, 0.62), (0.97, 0.97, 0.98)),
    ("Glacier", (0.27, 0.45, 0.60), (0.80, 0.92, 0.96)),
    ("Ambre", (0.48, 0.38, 0.32), (0.96, 0.78, 0.50)),
]
SPEED_MIN, SPEED_MAX = 0.7, 1.7       # vitesse locale / vent -> couleur de la fumee

# cartes de couleur (sans neon : tons mats)
PRESS_COOL, PRESS_MID, PRESS_WARM = (0.17, 0.43, 0.66), (0.075, 0.080, 0.095), (0.90, 0.50, 0.30)
VORT_COOL, VORT_MID, VORT_WARM = (0.30, 0.58, 0.78), (0.075, 0.080, 0.095), (0.90, 0.64, 0.36)
SPEED_STOPS = [(0.045, 0.060, 0.110), (0.20, 0.38, 0.55), (0.80, 0.72, 0.55), (0.98, 0.95, 0.88)]
SPEED_RAMP_MAX = 2.2                  # vitesse relative qui donne la couleur la plus claire

MODE_NAMES = ["Fumee", "Pression", "Vorticite", "Vitesse"]


def diverging(t, cool, mid, warm):
    """Carte divergente : t<0 -> cool, t=0 -> mid, t>0 -> warm (identique au shader)."""
    t = float(np.clip(t, -1, 1))
    a = abs(t) ** 0.75
    tgt = warm if t > 0 else cool
    return tuple(mid[i] + (tgt[i] - mid[i]) * a for i in range(3))


def speed_ramp(t):
    t = float(np.clip(t, 0, 1))
    xs = [0.0, 0.33, 0.66, 1.0]
    return tuple(float(np.interp(t, xs, [s[i] for s in SPEED_STOPS])) for i in range(3))


# =============================================================================
# Reglages (tout ce que le panneau modifie)
# =============================================================================
class Config:
    def __init__(self):
        # echelle physique
        self.width_m = 2.0            # largeur du tunnel visible (m)
        self.wind_ms = 20.0           # vitesse du vent (m/s)
        self.slowmo = 25.0            # ralenti : secondes d'ecran pour 1 s reelle
        self.fluid = 0                # 0 = air, 1 = eau
        self.temp_c = 15.0
        self.update_fluid()
        # simulation
        self.confinement = 6.0
        self.decay = 0.998
        self.band, self.gap = 3, 6
        self.smoke_on = True
        # affichage
        self.mode = 0
        self.smoke_amt = 0.3          # fumee par-dessus les cartes
        self.palette = 0
        self.show_vectors = False
        self.vec_spacing = 14
        self.vec_gain = 1.0
        self.show_stream = False
        self.n_stream = 36
        self.show_probe = True
        self.show_markers = True
        self.show_ruler = True
        self.show_contour = True
        self.cp_range = 1.0
        self.vort_range = 0.25
        self.show_panel = True

    def update_fluid(self):
        """Proprietes du fluide. Air : gaz parfait (rho = P / (R T)), viscosite de
        Sutherland, vitesse du son sqrt(gamma R T)."""
        if self.fluid == 0:
            T = self.temp_c + 273.15
            self.rho = 101325.0 / (287.05 * T)
            mu = 1.458e-6 * T ** 1.5 / (T + 110.4)
            self.nu = mu / self.rho
            self.sound = float(np.sqrt(1.4 * 287.05 * T))
        else:
            self.rho, self.nu, self.sound = 998.0, 1.0e-6, 1480.0

    def screen_speed(self):
        """Ecrans parcourus par seconde par le vent (limite pour rester lisible)."""
        raw = self.wind_ms / self.width_m / self.slowmo
        return float(np.clip(raw, MIN_SCREEN, MAX_SCREEN))


PRESETS = {
    "Soufflerie 2 m": dict(width_m=2.0, wind_ms=30.0, slowmo=37.0, fluid=0),
    "Maquette 0,5 m": dict(width_m=0.5, wind_ms=10.0, slowmo=50.0, fluid=0),
    "Aile d'avion 10 m": dict(width_m=10.0, wind_ms=80.0, slowmo=20.0, fluid=0),
    "Bassin d'eau 1 m": dict(width_m=1.0, wind_ms=2.0, slowmo=5.0, fluid=1),
}

# =============================================================================
# Formes (cellules, y vers le haut). GEO = reglages modifiables a la volee.
# =============================================================================
GEO = {'scale': 1.0, 'thickness': 0.14}
CUBE_HALF = 26
ELLIPSE_RX, ELLIPSE_RY = 34, 21
CHORD = 80
MAX_ANGLE = np.radians(40)

SHAPE_ORDER = ['cube', 'ellipse', 'wing']
SHAPE_LABELS = {'cube': 'Carre', 'ellipse': 'Ellipse', 'wing': 'Aile (NACA)'}


def chord():
    return CHORD * GEO['scale']


def wing_leading_x():
    return NX / 2 - chord() / 2


def naca00xx_half_thickness(xi, t):
    """Demi-epaisseur (en corde) d'un profil NACA00xx : 5 t (0.2969 sqrt(x) - 0.1260 x - ...)."""
    xi = np.clip(xi, 0, 1)
    return 5 * t * (0.2969 * np.sqrt(xi) - 0.1260 * xi - 0.3516 * xi ** 2
                     + 0.2843 * xi ** 3 - 0.1015 * xi ** 4)


def rotate_points(xx, yy, px, py, angle):
    dx, dy = xx - px, yy - py
    ca, sa = np.cos(angle), np.sin(angle)
    return dx * ca - dy * sa + px, dx * sa + dy * ca + py


def pivot_of(shape, cy):
    if shape == 'wing':
        return wing_leading_x() + 0.25 * chord(), cy        # quart de corde
    return NX / 2, cy


def cube_shape(xx, yy, cy):
    h = CUBE_HALF * GEO['scale']
    return (np.abs(xx - NX / 2) <= h) & (np.abs(yy - cy) <= h)


def ellipse_shape(xx, yy, cy):
    s = GEO['scale']
    return ((xx - NX / 2) / (ELLIPSE_RX * s)) ** 2 + ((yy - cy) / (ELLIPSE_RY * s)) ** 2 <= 1.0


def wing_shape(xx, yy, cy):
    c = chord()
    xi = (xx - wing_leading_x()) / c
    return (xi >= 0) & (xi <= 1) & (np.abs(yy - cy) <= naca00xx_half_thickness(xi, GEO['thickness']) * c)


SHAPES = {'cube': cube_shape, 'ellipse': ellipse_shape, 'wing': wing_shape}


def ref_length_cells(shape):
    """Longueur de reference pour Cl, Cd, Re : cote du carre, grand axe de l'ellipse, corde de l'aile."""
    s = GEO['scale']
    return {'cube': 2 * CUBE_HALF * s, 'ellipse': 2 * ELLIPSE_RX * s, 'wing': chord()}[shape]


def outline_cells(shape, cy, angle, segments=64):
    cx, s = NX / 2, GEO['scale']
    if shape == 'ellipse':
        a = np.linspace(0, 2 * np.pi, segments, endpoint=False)
        gx, gy = cx + ELLIPSE_RX * s * np.cos(a), cy + ELLIPSE_RY * s * np.sin(a)
    elif shape == 'wing':
        xi = np.linspace(0, 1, segments // 2)
        h = naca00xx_half_thickness(xi, GEO['thickness']) * chord()
        top_x = wing_leading_x() + xi * chord()
        gx = np.concatenate([top_x, top_x[::-1]])
        gy = np.concatenate([cy + h, cy - h[::-1]])
    else:
        h = CUBE_HALF * s
        gx = np.array([cx - h, cx + h, cx + h, cx - h])
        gy = np.array([cy - h, cy - h, cy + h, cy + h])
    px, py = pivot_of(shape, cy)
    return rotate_points(gx, gy, px, py, angle)


def solid_fraction_of(shape, cy, angle, supersample=4):
    """Fraction de chaque cellule occupee par l'obstacle (anti-crenelage par sur-echantillonnage)."""
    frac = np.zeros((NY, NX), dtype='f4')
    ox_, oy_ = outline_cells(shape, cy, angle)
    x0, x1 = max(0, int(ox_.min()) - 2), min(NX, int(ox_.max()) + 3)
    y0, y1 = max(0, int(oy_.min()) - 2), min(NY, int(oy_.max()) + 3)
    if x1 <= x0 or y1 <= y0:
        return frac
    yy, xx = np.mgrid[y0:y1, x0:x1].astype('f4')
    px, py = pivot_of(shape, cy)
    fn = SHAPES[shape]
    acc = np.zeros(xx.shape, dtype='f4')
    offs = (np.arange(supersample) + 0.5) / supersample
    for oy in offs:
        for ox in offs:
            lx, ly = rotate_points(xx + ox, yy + oy, px, py, -angle)
            acc += fn(lx, ly, cy)
    frac[y0:y1, x0:x1] = acc / (supersample * supersample)
    return frac


# =============================================================================
# Outils numeriques
# =============================================================================
def bilerp(f, x, y, bounds=False):
    """Interpolation bilineaire de f (tableau 2D) aux indices flottants (x = colonne, y = ligne)."""
    h, w = f.shape
    x = np.clip(x, 0.0, w - 1.001)
    y = np.clip(y, 0.0, h - 1.001)
    x0 = x.astype(np.int32)
    y0 = y.astype(np.int32)
    sx = x - x0.astype(np.float32)
    sy = y - y0.astype(np.float32)
    ff = f.ravel()
    i00 = y0 * w + x0
    f00, f10, f01, f11 = ff[i00], ff[i00 + 1], ff[i00 + w], ff[i00 + w + 1]
    top = f00 + (f10 - f00) * sx
    bot = f01 + (f11 - f01) * sx
    out = top + (bot - top) * sy
    if bounds:
        lo = np.minimum(np.minimum(f00, f10), np.minimum(f01, f11))
        hi = np.maximum(np.maximum(f00, f10), np.maximum(f01, f11))
        return out, lo, hi
    return out


def bilerp2(f, x, y):
    """Comme bilerp, pour un champ (H, W, 2) (vitesse u,v) : renvoie (n, 2)."""
    h, w, _ = f.shape
    x = np.clip(x, 0.0, w - 1.001)
    y = np.clip(y, 0.0, h - 1.001)
    x0 = x.astype(np.int32)
    y0 = y.astype(np.int32)
    sx = (x - x0)[:, None]
    sy = (y - y0)[:, None]
    ff = f.reshape(-1, 2)
    i00 = y0 * w + x0
    top = ff[i00] + (ff[i00 + 1] - ff[i00]) * sx
    bot = ff[i00 + w] + (ff[i00 + w + 1] - ff[i00 + w]) * sx
    return top + (bot - top) * sy


_XU, _YU = np.meshgrid(np.arange(NX + 1, dtype='f4'), np.arange(NY, dtype='f4') + 0.5)
_XV, _YV = np.meshgrid(np.arange(NX, dtype='f4') + 0.5, np.arange(NY + 1, dtype='f4'))
_XC, _YC = np.meshgrid(np.arange(NX, dtype='f4') + 0.5, np.arange(NY, dtype='f4') + 0.5)


# =============================================================================
# Le fluide
# =============================================================================
class FluidSim:
    """Grille decalee (MAC) : u sur les faces verticales, v sur les horizontales,
    pression et fumee au centre des cellules."""

    def __init__(self, cfg):
        self.cfg = cfg
        self.u = np.zeros((NY, NX + 1), dtype='f4')
        self.v = np.zeros((NY + 1, NX), dtype='f4')
        self.p = np.zeros((NY, NX), dtype='f4')
        self.dye = np.zeros((NY, NX), dtype='f4')
        self._pp = np.zeros((NY + 2, NX + 2), dtype='f4')

        self.wind = cfg.screen_speed() * NX          # cellules / s
        self.shape = 'cube'
        self.obstacle_cy = NY / 2.0
        self.obstacle_angle = 0.0                    # rad, trigo (incidence = -angle)

        # champs d'affichage
        self.t0 = np.zeros((NY, NX, 4), dtype='f4')  # fumee, vitesse rel., solide, Cp
        self.t1 = np.zeros((NY, NX, 4), dtype='f4')  # u rel., v rel., vorticite rel.
        self._uv = np.zeros((NY, NX, 2), dtype='f4')
        self.cp = np.zeros((NY, NX), dtype='f4')
        self.vort = np.zeros((NY, NX), dtype='f4')

        self._lu = None
        self._lu_ready_at = 0.0
        self.make_dye_source()
        self._rebuild_obstacle(reset_flow=True)

    # ---------------------------------------------------------------- reglages
    @property
    def incidence_deg(self):
        return -float(np.degrees(self.obstacle_angle))

    def make_dye_source(self):
        """Filets de fumee fins et reguliers a l'entree, comme les tubes d'un tunnel."""
        band, gap = int(self.cfg.band), int(self.cfg.gap)
        pattern = np.zeros(NY, dtype='f4')
        y = ((NY - band) % (band + gap)) // 2
        while y + band <= NY:
            pattern[y:y + band] = 1.0
            y += band + gap
        self.dye_source = pattern

    def set_wind(self, cells_per_s):
        """Change le vent : l'ecoulement existant est remis a l'echelle (un fluide
        parfait a vitesse double garde le meme motif), sans attendre la propagation."""
        new = float(cells_per_s)
        ratio = new / self.wind
        self.wind = new
        self.u *= ratio
        self.v *= ratio
        self.p *= ratio
        self._apply_boundaries()

    def reset(self):
        self.dye[:] = 0
        self._rebuild_obstacle(reset_flow=True)

    # ---------------------------------------------------------------- obstacle
    def _clamp_cy(self):
        _, oy = outline_cells(self.shape, self.obstacle_cy, self.obstacle_angle)
        half = (oy.max() - oy.min()) / 2 + 3
        self.obstacle_cy = float(np.clip(self.obstacle_cy, half, NY - half))

    def _rebuild_obstacle(self, reset_flow=False):
        self._clamp_cy()
        self.solid_frac = solid_fraction_of(self.shape, self.obstacle_cy, self.obstacle_angle)
        frac = self.solid_frac

        wU = np.ones((NY, NX + 1), dtype='f4')
        wU[:, 1:-1] = 1.0 - np.maximum(frac[:, :-1], frac[:, 1:])
        wV = np.ones((NY + 1, NX), dtype='f4')
        wV[1:-1, :] = 1.0 - np.maximum(frac[:-1, :], frac[1:, :])
        wU[wU < 0.05] = 0.0
        wV[wV < 0.05] = 0.0
        # poids utilises pour la FORCE : les parois du tunnel ne comptent pas
        wVf = wV.copy()
        wVf[0, :] = 1.0
        wVf[-1, :] = 1.0
        wV[0, :] = 0.0                 # parois haut/bas : l'air glisse, ne traverse pas
        wV[-1, :] = 0.0
        self.wU, self.wV = wU, wV
        self.openU = (wU > 0).astype('f4')
        self.openV = (wV > 0).astype('f4')

        # pression : entree = vitesse imposee, sortie = p nulle
        self.wl = wU[:, :-1].copy()
        self.wl[:, 0] = 0.0
        self.wr = wU[:, 1:].copy()
        self.wd = wV[:-1, :].copy()
        self.wu = wV[1:, :].copy()
        self.diag = self.wl + self.wr + self.wd + self.wu
        self.fluid = (self.diag > 0).astype('f4')
        self.inv_diag = np.where(self.diag > 0, 1.0 / np.maximum(self.diag, 1e-6), 0.0).astype('f4')

        # Force de la pression sur le solide : F = somme p * (ouverture amont - ouverture aval).
        # Sur chaque cellule, une face fermee a droite pousse le solide vers +x.
        self.fx_w = (wU[:, :-1] - wU[:, 1:]).astype('f4')
        self.fy_w = (wVf[:-1, :] - wVf[1:, :]).astype('f4')
        ring = ((np.abs(self.fx_w) + np.abs(self.fy_w)) > 0.05) & (frac < 0.9)
        self.ring_idx = np.flatnonzero(ring)

        self._lu = None
        if reset_flow:
            self.u[:] = self.wind
            self.v[:] = 0.0
            self.p[:] = 0.0
            self._build_direct_solver()
        else:
            self._lu_ready_at = time.perf_counter() + 0.25
        self._apply_boundaries()
        self.project(iters=150 if reset_flow else CG_ITERS)

    def set_shape(self, shape):
        self.shape = shape
        self._rebuild_obstacle()

    def refresh_obstacle(self):
        self._rebuild_obstacle()

    # ---------------------------------------------------------------- limites
    def _apply_boundaries(self):
        self.u[:, 0] = self.wind
        self.u *= self.openU
        self.v *= self.openV

    # ---------------------------------------------------------------- pression
    def _neg_laplacian(self, p):
        pp = self._pp
        pp[1:-1, 1:-1] = p
        ap = (self.wl * pp[1:-1, :-2] + self.wr * pp[1:-1, 2:]
              + self.wd * pp[:-2, 1:-1] + self.wu * pp[2:, 1:-1] - self.diag * p)
        return -ap * self.fluid

    def _build_direct_solver(self):
        """Factorisation exacte de la matrice de pression (tant que l'obstacle ne bouge pas)."""
        self._lu = None
        if not HAVE_SCIPY:
            return
        fl = self.fluid > 0
        n = int(fl.sum())
        idx = -np.ones((NY, NX), dtype=np.int64)
        idx[fl] = np.arange(n)
        J, I = np.nonzero(fl)
        rows, cols = [np.arange(n)], [np.arange(n)]
        vals = [self.diag[fl].astype(np.float64)]
        for w, dy, dx in ((self.wl, 0, -1), (self.wr, 0, 1), (self.wd, -1, 0), (self.wu, 1, 0)):
            nj, ni = J + dy, I + dx
            inside = (nj >= 0) & (nj < NY) & (ni >= 0) & (ni < NX)
            nb = np.where(inside, idx[np.clip(nj, 0, NY - 1), np.clip(ni, 0, NX - 1)], -1)
            wv = w[J, I].astype(np.float64)
            ok = inside & (nb >= 0) & (wv > 0)
            rows.append(np.arange(n)[ok])
            cols.append(nb[ok])
            vals.append(-wv[ok])
        mat = sp.csc_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(n, n))
        try:
            self._lu = spla.splu(mat, permc_spec='MMD_AT_PLUS_A')
            self._lu_mask = fl
        except Exception:
            self._lu = None

    def project(self, iters=CG_ITERS):
        """Projection : on cherche la pression qui rend le champ sans divergence. Au bord
        d'un obstacle le flux est nul : la pression s'ajuste pour forcer l'air a le contourner."""
        if self._lu is None and HAVE_SCIPY and time.perf_counter() >= self._lu_ready_at:
            self._build_direct_solver()
            self._lu_ready_at = float('inf')

        wU, wV = self.wU, self.wV
        div = (wU[:, 1:] * self.u[:, 1:] - wU[:, :-1] * self.u[:, :-1]
               + wV[1:, :] * self.v[1:, :] - wV[:-1, :] * self.v[:-1, :]) * self.fluid
        b = -div
        if self._lu is not None:
            p = np.zeros((NY, NX), dtype='f4')
            p[self._lu_mask] = self._lu.solve(b[self._lu_mask].astype(np.float64))
        else:
            p = self.p * self.fluid
            r = b - self._neg_laplacian(p)
            z = r * self.inv_diag
            d = z.copy()
            rz = float((r * z).sum())
            bb = float((b * b).sum()) + 1e-12
            for _ in range(iters):
                sd = self._neg_laplacian(d)
                dsd = float((d * sd).sum())
                if dsd <= 1e-20:
                    break
                alpha = rz / dsd
                p += alpha * d
                r -= alpha * sd
                if float((r * r).sum()) < 1e-8 * bb:
                    break
                z = r * self.inv_diag
                rz_new = float((r * z).sum())
                d = z + (rz_new / rz) * d
                rz = rz_new
        self.p = p
        self.u[:, 1:-1] -= (p[:, 1:] - p[:, :-1]) * self.openU[:, 1:-1]
        self.u[:, -1] += p[:, -1] * self.openU[:, -1]
        self.v[1:-1, :] -= (p[1:, :] - p[:-1, :]) * self.openV[1:-1, :]
        self._apply_boundaries()

    # ---------------------------------------------------------------- pas de temps
    def _centre_velocity(self):
        uc = 0.5 * (self.u[:, :-1] + self.u[:, 1:])
        vc = 0.5 * (self.v[:-1, :] + self.v[1:, :])
        return uc, vc

    @staticmethod
    def _vorticity(uc, vc):
        """Vorticite = rotationnel de la vitesse : dv/dx - du/dy (positif = sens trigo)."""
        w = np.zeros((NY, NX), dtype='f4')
        w[1:-1, 1:-1] = 0.5 * (vc[1:-1, 2:] - vc[1:-1, :-2]) - 0.5 * (uc[2:, 1:-1] - uc[:-2, 1:-1])
        return w

    def _vorticity_confinement(self, dt):
        """Compense l'amortissement numerique des petits tourbillons (ne cree rien : amplifie
        seulement la rotation deja presente)."""
        k = self.cfg.confinement
        if k <= 0:
            return
        uc, vc = self._centre_velocity()
        w = self._vorticity(uc, vc)
        aw = np.abs(w)
        gx = np.zeros_like(w)
        gy = np.zeros_like(w)
        gx[1:-1, 1:-1] = 0.5 * (aw[1:-1, 2:] - aw[1:-1, :-2])
        gy[1:-1, 1:-1] = 0.5 * (aw[2:, 1:-1] - aw[:-2, 1:-1])
        norm = np.sqrt(gx * gx + gy * gy) + 1e-6
        fx = k * (gy / norm) * w * self.fluid
        fy = -k * (gx / norm) * w * self.fluid
        self.u[:, 1:-1] += 0.5 * (fx[:, :-1] + fx[:, 1:]) * dt
        self.v[1:-1, :] += 0.5 * (fy[:-1, :] + fy[1:, :]) * dt

    def _advect_velocity(self, dt):
        u, v = self.u, self.v
        vu = bilerp(v, _XU - 0.5, _YU)
        new_u = bilerp(u, _XU - dt * u, _YU - dt * vu - 0.5)
        uv = bilerp(u, _XV, _YV - 0.5)
        new_v = bilerp(v, _XV - dt * uv - 0.5, _YV - dt * v)
        self.u, self.v = new_u.astype('f4'), new_v.astype('f4')

    def _advect_dye(self, dt):
        uc, vc = self._centre_velocity()
        q = self.dye
        fwd, lo, hi = bilerp(q, _XC - dt * uc - 0.5, _YC - dt * vc - 0.5, bounds=True)
        back = bilerp(fwd, _XC + dt * uc - 0.5, _YC + dt * vc - 0.5)
        self.dye = np.clip(fwd + 0.5 * (q - back), lo, hi).astype('f4')

    def step(self, dt=DT):
        self._apply_boundaries()
        self._vorticity_confinement(dt)
        self._advect_velocity(dt)
        self._apply_boundaries()
        self.project()
        src = self.dye_source if self.cfg.smoke_on else 0.0 * self.dye_source
        self.dye[:, :3] = np.maximum(self.dye[:, :3], src[:, None])
        self._advect_dye(dt)
        self.dye[self.solid_frac > 0.9] = 0.0
        self.dye *= self.cfg.decay

    # ---------------------------------------------------------------- grandeurs derivees
    def update_fields(self):
        """Prepare tout ce que l'affichage et les mesures utilisent."""
        uc, vc = self._centre_velocity()
        inv = 1.0 / max(self.wind, 1e-3)
        self._uv[..., 0] = uc
        self._uv[..., 1] = vc
        # Cp = (p - p_amont) / (1/2 rho U^2). La pression de reference est la pression statique
        # AMONT (colonnes pres de l'entree) : la sortie est dans le sillage, pas dans l'air libre.
        p_ref = float(self.p[:, 2:6].mean())
        self.cp = ((2.0 / (DT * self.wind ** 2)) * (self.p - p_ref)) * self.fluid
        w = self._vorticity(uc, vc)
        w[self.solid_frac > 0.5] = 0.0
        self.vort = w
        t0, t1 = self.t0, self.t1
        t0[..., 0] = self.dye
        np.sqrt(uc * uc + vc * vc, out=t0[..., 1])
        t0[..., 1] *= inv
        t0[..., 2] = self.solid_frac
        t0[..., 3] = self.cp
        t1[..., 0] = uc * inv
        t1[..., 1] = vc * inv
        t1[..., 2] = w * inv

    def phys(self):
        """Echelles de conversion cellules -> unites reelles."""
        c = self.cfg
        dx = c.width_m / NX                          # m par cellule
        vel = c.wind_ms / self.wind                  # (m/s) par (cellule/s)
        q = 0.5 * c.rho * c.wind_ms ** 2             # pression dynamique du vent (Pa)
        d_cells = ref_length_cells(self.shape)
        return SimpleNamespace(
            dx=dx, vel=vel, q=q, d_cells=d_cells, d_m=d_cells * dx,
            screen_speed=self.wind / NX,
            ralenti=c.wind_ms / c.width_m / max(self.wind / NX, 1e-6),
            vort=c.wind_ms * NX / c.width_m,         # (1/s) pour une vorticite relative de 1
            mach=c.wind_ms / c.sound,
            re=c.wind_ms * d_cells * dx / c.nu,
        )

    def forces_coeffs(self):
        """(Cd, Cl) : pression integree sur la surface, divisee par q * longueur de reference."""
        d = ref_length_cells(self.shape)
        cd = float((self.cp * self.fx_w).sum()) / d
        cl = float((self.cp * self.fy_w).sum()) / d
        return cd, cl

    def markers(self):
        """Point d'arret (Cp max) et depression max (Cp min) sur le contour."""
        if self.ring_idx.size == 0:
            return None
        vals = self.cp.ravel()[self.ring_idx]
        i_max, i_min = int(vals.argmax()), int(vals.argmin())
        out = []
        for i, name in ((i_max, "Point d'arret"), (i_min, "Depression max")):
            j, k = divmod(int(self.ring_idx[i]), NX)
            out.append((k + 0.5, j + 0.5, float(vals[i]), name))
        return out

    def sample(self, x, y):
        """Valeurs au point (x, y) en cellules."""
        xs, ys = np.array([x - 0.5], 'f4'), np.array([y - 0.5], 'f4')
        uv = bilerp2(self._uv, xs, ys)[0]
        return SimpleNamespace(
            u=float(uv[0]), v=float(uv[1]),
            cp=float(bilerp(self.cp, xs, ys)[0]),
            vort=float(bilerp(self.vort, xs, ys)[0]),
            solid=float(bilerp(self.solid_frac, xs, ys)[0]),
            dye=float(bilerp(self.dye, xs, ys)[0]))

    # ---------------------------------------------------------------- overlays
    def outline_ndc(self):
        gx, gy = outline_cells(self.shape, self.obstacle_cy, self.obstacle_angle)
        return np.stack([(gx / NX) * 2.0 - 1.0, (gy / NY) * 2.0 - 1.0], axis=1).astype('f4')

    def streamline_vertices(self, n, palette, steps=100, h=2.6):
        """Lignes de courant : on suit le champ de vitesse depuis l'entree (pas de longueur constante)."""
        x = np.full(n, 2.0, dtype='f4')
        y = np.linspace(6, NY - 6, n).astype('f4')
        P = np.empty((steps + 1, n, 2), 'f4')
        S = np.empty((steps + 1, n), 'f4')
        A = np.zeros((steps + 1, n), bool)
        alive = np.ones(n, bool)
        P[0, :, 0], P[0, :, 1], A[0] = x, y, True
        S[0] = 1.0
        for k in range(1, steps + 1):
            vel = bilerp2(self._uv, x - 0.5, y - 0.5)
            s = np.hypot(vel[:, 0], vel[:, 1])
            step = h / np.maximum(s, 1e-6)
            x = x + vel[:, 0] * step
            y = y + vel[:, 1] * step
            inside = (x > 0) & (x < NX - 1) & (y > 0) & (y < NY - 1)
            xi = np.clip(x, 0, NX - 1).astype(np.int32)
            yi = np.clip(y, 0, NY - 1).astype(np.int32)
            alive = alive & inside & (s > 0.02 * self.wind) & (self.solid_frac[yi, xi] < 0.5)
            P[k, :, 0], P[k, :, 1], S[k], A[k] = x, y, s / self.wind, alive
        ok = A[1:] & A[:-1]
        if not ok.any():
            return np.zeros((0, 6), 'f4')
        a, b = P[:-1][ok], P[1:][ok]
        sp_ = S[1:][ok]
        col = _palette_colors(sp_, palette, 0.55)
        verts = np.empty((a.shape[0] * 2, 6), 'f4')
        verts[0::2, :2], verts[1::2, :2] = a, b
        verts[0::2, 2:], verts[1::2, 2:] = col, col
        verts[:, 0] = verts[:, 0] / NX * 2 - 1
        verts[:, 1] = verts[:, 1] / NY * 2 - 1
        return verts

    def vector_vertices(self, spacing, gain, palette):
        """Fleches de vitesse sur une grille reguliere (longueur ~ vitesse locale)."""
        h = int(spacing)
        off = h // 2
        uc = self._uv[off::h, off::h, 0]
        vc = self._uv[off::h, off::h, 1]
        sol = self.solid_frac[off::h, off::h]
        ix = np.arange(off, NX, h)[:uc.shape[1]]
        iy = np.arange(off, NY, h)[:uc.shape[0]]
        X, Y = np.meshgrid(ix + 0.5, iy + 0.5)
        mag = np.hypot(uc, vc) / self.wind
        keep = (sol < 0.3) & (mag > 0.03)
        if not keep.any():
            return np.zeros((0, 6), 'f4')
        X, Y, uc, vc, mag = X[keep], Y[keep], uc[keep], vc[keep], mag[keep]
        dx_, dy_ = uc / (mag * self.wind), vc / (mag * self.wind)
        L = mag * h * 0.95 * gain
        p0x, p0y = X - dx_ * L / 2, Y - dy_ * L / 2
        p1x, p1y = X + dx_ * L / 2, Y + dy_ * L / 2
        hl = np.minimum(0.4 * L, 0.5 * h)
        bx, by = p1x - dx_ * hl, p1y - dy_ * hl
        w1x, w1y = bx - dy_ * hl * 0.5, by + dx_ * hl * 0.5
        w2x, w2y = bx + dy_ * hl * 0.5, by - dx_ * hl * 0.5
        col = _palette_colors(mag, palette, 0.7)
        m = X.size
        verts = np.empty((m * 6, 6), 'f4')
        for k, (ax, ay, bx_, by_) in enumerate(((p0x, p0y, p1x, p1y), (p1x, p1y, w1x, w1y), (p1x, p1y, w2x, w2y))):
            verts[2 * k::6, 0], verts[2 * k::6, 1] = ax, ay
            verts[2 * k + 1::6, 0], verts[2 * k + 1::6, 1] = bx_, by_
            verts[2 * k::6, 2:], verts[2 * k + 1::6, 2:] = col, col
        verts[:, 0] = verts[:, 0] / NX * 2 - 1
        verts[:, 1] = verts[:, 1] / NY * 2 - 1
        return verts


def _palette_colors(speed_rel, palette, alpha):
    """Couleur (lent -> rapide) des fleches / lignes, un peu eclaircie pour bien ressortir."""
    _, slow, fast = PALETTES[palette]
    t = np.clip((speed_rel - SPEED_MIN) / (SPEED_MAX - SPEED_MIN), 0, 1)[:, None]
    col = np.array(slow, 'f4') + (np.array(fast, 'f4') - np.array(slow, 'f4')) * t
    col = np.clip(col * 1.12 + 0.06, 0, 1)
    return np.hstack([col, np.full((col.shape[0], 1), alpha, 'f4')]).astype('f4')


# =============================================================================
# Shaders
# =============================================================================
FIELD_VERTEX = """
#version 330
in vec2 in_pos;
in vec2 in_uv;
out vec2 v_uv;
void main() { gl_Position = vec4(in_pos, 0.0, 1.0); v_uv = in_uv; }
"""

FIELD_FRAGMENT = """
#version 330
uniform sampler2D tex0;      // r = fumee, g = vitesse / vent, b = solide, a = Cp
uniform sampler2D tex1;      // r = u / vent, g = v / vent, b = vorticite / vent
uniform int mode;            // 0 fumee, 1 pression, 2 vorticite, 3 vitesse
uniform vec3 bg_color;
uniform vec3 slow_color;
uniform vec3 fast_color;
uniform vec3 fill_color;
uniform vec2 speed_range;
uniform float smoke_amt;
uniform float cp_range;
uniform float vort_range;
uniform vec3 pcool; uniform vec3 pmid; uniform vec3 pwarm;
uniform vec3 vcool; uniform vec3 vmid; uniform vec3 vwarm;
uniform vec3 s0; uniform vec3 s1; uniform vec3 s2; uniform vec3 s3;
uniform float speed_ramp_max;
in vec2 v_uv;
out vec4 f_color;

vec3 diverging(float t, vec3 cool, vec3 mid, vec3 warm) {
    t = clamp(t, -1.0, 1.0);
    float a = pow(abs(t), 0.75);
    return mix(mid, t > 0.0 ? warm : cool, a);
}
vec3 ramp(float t) {
    t = clamp(t, 0.0, 1.0);
    if (t < 0.33) return mix(s0, s1, t / 0.33);
    if (t < 0.66) return mix(s1, s2, (t - 0.33) / 0.33);
    return mix(s2, s3, (t - 0.66) / 0.34);
}
void main() {
    vec4 a = texture(tex0, v_uv);
    vec4 b = texture(tex1, v_uv);
    float dye = clamp(a.r, 0.0, 1.0);
    float t = clamp((a.g - speed_range.x) / (speed_range.y - speed_range.x), 0.0, 1.0);
    vec3 smoke = mix(slow_color, fast_color, t);
    vec3 col;
    if (mode == 0) {
        col = mix(bg_color, smoke, dye);
    } else {
        vec3 base;
        if (mode == 1)      base = diverging(a.a / cp_range, pcool, pmid, pwarm);
        else if (mode == 2) base = diverging(b.b / vort_range, vcool, vmid, vwarm);
        else                base = ramp(a.g / speed_ramp_max);
        col = mix(base, smoke * 1.1, dye * smoke_amt * 0.6);
    }
    float solid = clamp(a.b, 0.0, 1.0);
    col = mix(col, fill_color, solid);
    float rim = smoothstep(0.30, 0.5, a.b) * (1.0 - smoothstep(0.5, 0.85, a.b));
    col += rim * 0.07;
    vec2 q = v_uv - 0.5;
    col *= 1.0 - 0.45 * dot(q, q);
    f_color = vec4(col, 1.0);
}
"""

LINE_VERTEX = """
#version 330
in vec2 in_pos;
in vec4 in_col;
out vec4 v_col;
void main() { gl_Position = vec4(in_pos, 0.0, 1.0); v_col = in_col; }
"""
LINE_FRAGMENT = """
#version 330
in vec4 v_col;
out vec4 f_color;
void main() { f_color = v_col; }
"""


# =============================================================================
# Rendu ImGui (compatible imgui-bundle >= 1.92 : textures gerees par le backend)
# =============================================================================
class ImguiGL:
    VERT = """
    #version 330
    uniform mat4 ProjMtx;
    in vec2 Position; in vec2 UV; in vec4 Color;
    out vec2 Frag_UV; out vec4 Frag_Color;
    void main() { Frag_UV = UV; Frag_Color = Color; gl_Position = ProjMtx * vec4(Position.xy, 0, 1); }
    """
    FRAG = """
    #version 330
    uniform sampler2D Texture;
    in vec2 Frag_UV; in vec4 Frag_Color;
    out vec4 Out_Color;
    void main() { Out_Color = Frag_Color * texture(Texture, Frag_UV.st); }
    """

    def __init__(self, ctx):
        self.ctx = ctx
        io = imgui.get_io()
        io.backend_flags |= imgui.BackendFlags_.renderer_has_textures
        self.prog = ctx.program(vertex_shader=self.VERT, fragment_shader=self.FRAG)
        self.prog['Texture'].value = 0
        self.vbo = ctx.buffer(reserve=imgui.VERTEX_SIZE * 65536)
        self.ibo = ctx.buffer(reserve=imgui.INDEX_SIZE * 65536 * 2)
        self.vao = ctx.vertex_array(self.prog, [(self.vbo, '2f 2f 4f1', 'Position', 'UV', 'Color')],
                                    index_buffer=self.ibo, index_element_size=imgui.INDEX_SIZE)
        self.textures = {}

    def _sync_textures(self, draw_data):
        for tex in draw_data.textures:
            st = tex.status
            if st == imgui.ImTextureStatus.want_create or st == imgui.ImTextureStatus.want_updates:
                w, h = tex.width, tex.height
                pix = tex.get_pixels_array()
                if st == imgui.ImTextureStatus.want_create:
                    t = self.ctx.texture((w, h), 4, pix.tobytes())
                    t.filter = (moderngl.LINEAR, moderngl.LINEAR)
                    self.textures[t.glo] = t
                    tex.set_tex_id(t.glo)
                else:
                    self.textures[tex.get_tex_id()].write(pix.tobytes())
                tex.set_status(imgui.ImTextureStatus.ok)
            elif st == imgui.ImTextureStatus.want_destroy:
                t = self.textures.pop(tex.get_tex_id(), None)
                if t is not None:
                    t.release()
                tex.set_tex_id(0)
                tex.set_status(imgui.ImTextureStatus.destroyed)

    def render(self, draw_data, fb_w, fb_h, scale):
        self._sync_textures(draw_data)
        dw, dh = fb_w / scale, fb_h / scale
        if dw <= 0 or dh <= 0:
            return
        self.prog['ProjMtx'].value = (2.0 / dw, 0, 0, 0, 0, -2.0 / dh, 0, 0, 0, 0, -1, 0, -1, 1, 0, 1)
        self.ctx.viewport = (0, 0, fb_w, fb_h)
        self.ctx.enable_only(moderngl.BLEND)
        self.ctx.blend_equation = moderngl.FUNC_ADD
        self.ctx.blend_func = moderngl.SRC_ALPHA, moderngl.ONE_MINUS_SRC_ALPHA
        for lst in draw_data.cmd_lists:
            nv, ni = lst.vtx_buffer.size(), lst.idx_buffer.size()
            vb = (ctypes_byte * (nv * imgui.VERTEX_SIZE)).from_address(lst.vtx_buffer.data_address())
            ib = (ctypes_byte * (ni * imgui.INDEX_SIZE)).from_address(lst.idx_buffer.data_address())
            self.vbo.orphan(nv * imgui.VERTEX_SIZE)
            self.ibo.orphan(ni * imgui.INDEX_SIZE)
            self.vbo.write(vb)
            self.ibo.write(ib)
            for cmd in lst.cmd_buffer:
                tex = self.textures.get(cmd.get_tex_id())
                if tex is None:
                    continue
                tex.use(0)
                x0, y0, x1, y1 = cmd.clip_rect
                self.ctx.scissor = (int(x0 * scale), int(fb_h - y1 * scale),
                                    max(int((x1 - x0) * scale), 0), max(int((y1 - y0) * scale), 0))
                self.vao.render(moderngl.TRIANGLES, vertices=cmd.elem_count, first=cmd.idx_offset)
        self.ctx.scissor = None


import ctypes
ctypes_byte = ctypes.c_byte


def apply_theme():
    """Theme Nova Studio : fonds sombres, aucun neon, un seul accent chaud."""
    st = imgui.get_style()
    st.window_rounding = 0.0
    st.frame_rounding = 6.0
    st.grab_rounding = 6.0
    st.popup_rounding = 8.0
    st.scrollbar_rounding = 8.0
    st.window_border_size = 0.0
    st.frame_border_size = 0.0
    st.grab_min_size = 12.0
    st.window_padding = imgui.ImVec2(14, 12)
    st.frame_padding = imgui.ImVec2(8, 5)
    st.item_spacing = imgui.ImVec2(8, 7)
    c = imgui.Col_
    for col, v in [
        (c.window_bg, (0.058, 0.062, 0.072, 0.97)), (c.popup_bg, (0.07, 0.075, 0.09, 0.97)),
        (c.text, (0.86, 0.87, 0.90, 1)), (c.text_disabled, (0.45, 0.47, 0.52, 1)),
        (c.frame_bg, (0.105, 0.110, 0.130, 1)), (c.frame_bg_hovered, (0.15, 0.155, 0.18, 1)),
        (c.frame_bg_active, (0.18, 0.19, 0.22, 1)),
        (c.slider_grab, (*ACCENT, 0.9)), (c.slider_grab_active, (0.95, 0.88, 0.72, 1)),
        (c.check_mark, (*ACCENT, 1)),
        (c.button, (0.13, 0.14, 0.165, 1)), (c.button_hovered, (0.19, 0.20, 0.235, 1)),
        (c.button_active, (0.24, 0.25, 0.29, 1)),
        (c.header, (0.12, 0.13, 0.155, 1)), (c.header_hovered, (0.17, 0.18, 0.21, 1)),
        (c.header_active, (0.20, 0.21, 0.25, 1)),
        (c.separator, (0.18, 0.19, 0.22, 1)), (c.border, (0.2, 0.21, 0.24, 1)),
        (c.plot_lines, (0.55, 0.62, 0.74, 1)), (c.plot_lines_hovered, (*ACCENT, 1)),
        (c.scrollbar_bg, (0, 0, 0, 0)), (c.scrollbar_grab, (0.2, 0.21, 0.24, 1)),
    ]:
        st.set_color_(col, imgui.ImVec4(*v))


def col32(rgb, a=1.0):
    return imgui.IM_COL32(int(rgb[0] * 255), int(rgb[1] * 255), int(rgb[2] * 255), int(a * 255))


def fmt_pa(x):
    return f"{x / 1000:.2f} kPa" if abs(x) >= 1000 else f"{x:.0f} Pa"


def nice_step(raw):
    """Pas 'rond' (1, 2, 5 x 10^n) proche de raw."""
    e = 10 ** np.floor(np.log10(raw))
    for m in (1, 2, 5, 10):
        if m * e >= raw:
            return m * e
    return 10 * e


FONT_CANDIDATES = [
    "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]

MODE_HELP = [
    "Fumee : un traceur colore injecte a gauche. Il suit l'air sans le perturber. Plus l'air va vite, plus la teinte est chaude.",
    "Pression : rouge = surpression (l'air est freine, devant la forme), bleu = depression (l'air accelere ou decolle). C'est la difference de pression entre dessus et dessous qui cree la portance.",
    "Vorticite : rotation locale de l'air. Chaud = sens trigo, froid = sens horaire. Les tourbillons du sillage naissent dans les couches de cisaillement qui se decollent du bord.",
    "Vitesse : norme de la vitesse locale. Sur les cotes d'un obstacle l'air accelere (conservation du debit), derriere il stagne (sillage).",
]


# =============================================================================
# Application
# =============================================================================
class MyApp(mglw.WindowConfig):
    gl_version = (3, 3)
    window_size = (1320, 780)
    title = "Nova Studio - Soufflerie"
    aspect_ratio = None
    resizable = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.cfg = Config()
        self.sim = FluidSim(self.cfg)
        self.held = set()
        self.paused = False
        self.step_once = False
        self.frame = 0
        self.probe_pos = None          # (x, y) souris en fenetre
        self.dragging = False
        self.drag_off = 0.0
        self.capture_request = False
        self.toast = ("", 0.0)
        self.hist_cl = np.zeros(240, 'f4')
        self.hist_cd = np.zeros(240, 'f4')
        self.cl_s = self.cd_s = 0.0
        self.sim_ms = 0.0
        self.fps = 60.0
        self.stream_verts = np.zeros((0, 6), 'f4')
        self.vec_verts = np.zeros((0, 6), 'f4')
        self.sim_rect = (0, 0, 1, 1)
        if not HAVE_SCIPY:
            print("(scipy absent : pression approchee. 'pip install scipy' pour un rendu plus propre)")

        # ---- champ de fluide
        self.field_prog = self.ctx.program(vertex_shader=FIELD_VERTEX, fragment_shader=FIELD_FRAGMENT)
        self.tex0 = self.ctx.texture((NX, NY), 4, dtype='f4')
        self.tex1 = self.ctx.texture((NX, NY), 4, dtype='f4')
        for t in (self.tex0, self.tex1):
            t.filter = (moderngl.LINEAR, moderngl.LINEAR)
            t.repeat_x = t.repeat_y = False
        self.field_prog['tex0'] = 0
        self.field_prog['tex1'] = 1
        fp = self.field_prog
        fp['bg_color'] = BG
        fp['fill_color'] = OBSTACLE_FILL
        fp['speed_range'] = (SPEED_MIN, SPEED_MAX)
        fp['pcool'], fp['pmid'], fp['pwarm'] = PRESS_COOL, PRESS_MID, PRESS_WARM
        fp['vcool'], fp['vmid'], fp['vwarm'] = VORT_COOL, VORT_MID, VORT_WARM
        fp['s0'], fp['s1'], fp['s2'], fp['s3'] = SPEED_STOPS
        fp['speed_ramp_max'] = SPEED_RAMP_MAX
        quad = np.array([[-1, -1, 0, 0], [1, -1, 1, 0], [-1, 1, 0, 1], [1, 1, 1, 1]], dtype='f4')
        self.field_vao = self.ctx.vertex_array(
            self.field_prog, [(self.ctx.buffer(quad.tobytes()), '2f 2f', 'in_pos', 'in_uv')])

        # ---- lignes (contour, fleches, lignes de courant)
        self.line_prog = self.ctx.program(vertex_shader=LINE_VERTEX, fragment_shader=LINE_FRAGMENT)
        self.line_buf = self.ctx.buffer(reserve=24 * 120000)
        self.line_vao = self.ctx.vertex_array(self.line_prog, [(self.line_buf, '2f 4f', 'in_pos', 'in_col')])
        self.outline_buf = self.ctx.buffer(reserve=64 * 6 * 4)
        self.outline_vao = self.ctx.vertex_array(self.line_prog, [(self.outline_buf, '2f 4f', 'in_pos', 'in_col')])

        # ---- ImGui
        imgui.create_context()
        self.io = imgui.get_io()
        try:
            self.io.ini_filename = None
        except Exception:
            pass
        self.font = None
        for path in FONT_CANDIDATES:
            if not os.path.exists(path):
                continue
            try:
                self.font = self.io.fonts.add_font_from_file_ttf(path, 16.0)
                break
            except Exception:
                self.font = None
        apply_theme()
        self.gui = ImguiGL(self.ctx)
        self.io.display_size = imgui.ImVec2(*self.wnd.size)

        self.ctx.enable(moderngl.BLEND)
        self.ctx.blend_func = moderngl.SRC_ALPHA, moderngl.ONE_MINUS_SRC_ALPHA
        self._sync_wind()
        self.sim.update_fields()

    # ------------------------------------------------------------------ geometrie ecran
    def _compute_sim_rect(self):
        W, H = self.wnd.size
        avail_w = W - (PANEL_W if self.cfg.show_panel else 0)
        w = min(avail_w, H * NX / NY)
        h = w * NY / NX
        x = (avail_w - w) / 2
        y = (H - h) / 2
        self.sim_rect = (x, y, w, h)

    def _cell_to_win(self, cx, cy):
        x, y, w, h = self.sim_rect
        return x + cx / NX * w, y + (1 - cy / NY) * h

    def _win_to_cell(self, wx, wy):
        x, y, w, h = self.sim_rect
        return (wx - x) / w * NX, (1 - (wy - y) / h) * NY

    def _in_sim(self, wx, wy):
        x, y, w, h = self.sim_rect
        return x <= wx <= x + w and y <= wy <= y + h

    # ------------------------------------------------------------------ entrees
    def on_resize(self, width, height):
        self.io.display_size = imgui.ImVec2(*self.wnd.size)

    def on_mouse_position_event(self, x, y, dx, dy):
        self.io.add_mouse_pos_event(x, y)
        self.probe_pos = (x, y)

    def on_mouse_drag_event(self, x, y, dx, dy):
        self.io.add_mouse_pos_event(x, y)
        self.probe_pos = (x, y)
        if self.dragging:
            _, cy = self._win_to_cell(x, y)
            self.sim.obstacle_cy = cy + self.drag_off
            self.sim.refresh_obstacle()

    def on_mouse_press_event(self, x, y, button):
        self.io.add_mouse_pos_event(x, y)
        self.io.add_mouse_button_event(0 if button == 1 else (1 if button == 2 else 2), True)
        if button == 1 and not self.io.want_capture_mouse and self._in_sim(x, y):
            _, cy = self._win_to_cell(x, y)
            self.drag_off = self.sim.obstacle_cy - cy
            self.dragging = True

    def on_mouse_release_event(self, x, y, button):
        self.io.add_mouse_pos_event(x, y)
        self.io.add_mouse_button_event(0 if button == 1 else (1 if button == 2 else 2), False)
        if button == 1:
            self.dragging = False

    def on_mouse_scroll_event(self, x_offset, y_offset):
        self.io.add_mouse_wheel_event(x_offset, y_offset)
        if not self.io.want_capture_mouse and self.probe_pos and self._in_sim(*self.probe_pos):
            s = self.sim
            s.obstacle_angle = float(np.clip(s.obstacle_angle - np.radians(2.0) * y_offset, -MAX_ANGLE, MAX_ANGLE))
            s.refresh_obstacle()

    def on_unicode_char_entered(self, char):
        self.io.add_input_character(ord(char))

    def on_key_event(self, key, action, modifiers):
        keys = self.wnd.keys
        imgui_keys = {keys.BACKSPACE: imgui.Key.backspace, keys.DELETE: imgui.Key.delete,
                      keys.ENTER: imgui.Key.enter, keys.ESCAPE: imgui.Key.escape,
                      keys.LEFT: imgui.Key.left_arrow, keys.RIGHT: imgui.Key.right_arrow,
                      keys.HOME: imgui.Key.home, keys.END: imgui.Key.end}
        if key in imgui_keys:
            self.io.add_key_event(imgui_keys[key], action == keys.ACTION_PRESS)
        if action == keys.ACTION_RELEASE:
            self.held.discard(key)
            return
        if action != keys.ACTION_PRESS or self.io.want_text_input:
            return
        self.held.add(key)
        cfg, s = self.cfg, self.sim
        if key == keys.SPACE:
            self._set_shape((SHAPE_ORDER.index(s.shape) + 1) % 3)
        elif key == keys.P:
            self.paused = not self.paused
        elif key == keys.R:
            s.reset()
        elif key == keys.V:
            cfg.show_vectors = not cfg.show_vectors
        elif key == keys.L:
            cfg.show_stream = not cfg.show_stream
        elif key == keys.TAB:
            cfg.show_panel = not cfg.show_panel
        elif key == keys.C:
            self.capture_request = True
        elif key in (keys.NUMBER_1, keys.NUMBER_2, keys.NUMBER_3, keys.NUMBER_4):
            cfg.mode = [keys.NUMBER_1, keys.NUMBER_2, keys.NUMBER_3, keys.NUMBER_4].index(key)

    def _set_shape(self, i):
        self.sim.set_shape(SHAPE_ORDER[i])

    def _apply_held_keys(self, dt):
        """Les touches maintenues agissent en continu."""
        if self.io.want_text_input:
            return
        k, s, cfg = self.wnd.keys, self.sim, self.cfg
        moved = False
        if k.UP in self.held or k.Z in self.held:
            s.obstacle_cy += 50 * dt
            moved = True
        if k.DOWN in self.held or k.S in self.held:
            s.obstacle_cy -= 50 * dt
            moved = True
        if k.RIGHT in self.held or k.D in self.held:           # incidence + = nez en haut = sens horaire
            s.obstacle_angle = float(np.clip(s.obstacle_angle - np.radians(35) * dt, -MAX_ANGLE, MAX_ANGLE))
            moved = True
        if k.LEFT in self.held or k.Q in self.held:
            s.obstacle_angle = float(np.clip(s.obstacle_angle + np.radians(35) * dt, -MAX_ANGLE, MAX_ANGLE))
            moved = True
        if moved:
            s.refresh_obstacle()
        f = 0.0
        if k.E in self.held or k.EQUAL in self.held:
            f += 1
        if k.A in self.held or k.MINUS in self.held:
            f -= 1
        if f:
            cfg.wind_ms = float(np.clip(cfg.wind_ms * np.exp(0.9 * f * dt), 1.0, 120.0))

    def _sync_wind(self):
        target = self.cfg.screen_speed() * NX
        if abs(target - self.sim.wind) > 1e-3:
            self.sim.set_wind(target)

    # ------------------------------------------------------------------ rendu
    def on_render(self, time_, frame_time):
        t_start = time.perf_counter()
        dt_frame = max(frame_time, 1e-4) if frame_time else DT
        self.fps += (1.0 / dt_frame - self.fps) * 0.05
        cfg, s = self.cfg, self.sim
        self._apply_held_keys(DT)
        self._sync_wind()

        if not self.paused or self.step_once:
            s.step(DT)
            self.step_once = False
        s.update_fields()
        self.sim_ms += ((time.perf_counter() - t_start) * 1000 - self.sim_ms) * 0.1

        # forces (lissees)
        cd, cl = s.forces_coeffs()
        self.cd_s += (cd - self.cd_s) * 0.12
        self.cl_s += (cl - self.cl_s) * 0.12
        self.hist_cl[:-1] = self.hist_cl[1:]
        self.hist_cl[-1] = self.cl_s
        self.hist_cd[:-1] = self.hist_cd[1:]
        self.hist_cd[-1] = self.cd_s

        self._compute_sim_rect()
        sx, sy, sw, sh = self.sim_rect
        W, H = self.wnd.size
        ratio = self.wnd.buffer_size[0] / max(W, 1)
        fbw, fbh = self.wnd.buffer_size

        self.wnd.use()
        self.ctx.viewport = (0, 0, fbw, fbh)
        self.ctx.clear(*BG)
        self.ctx.viewport = (int(sx * ratio), int((H - sy - sh) * ratio), int(sw * ratio), int(sh * ratio))

        self.tex0.write(s.t0.tobytes())
        self.tex1.write(s.t1.tobytes())
        self.tex0.use(0)
        self.tex1.use(1)
        fp = self.field_prog
        _, slow, fast = PALETTES[cfg.palette]
        fp['mode'] = cfg.mode
        fp['slow_color'] = slow
        fp['fast_color'] = fast
        fp['smoke_amt'] = cfg.smoke_amt
        fp['cp_range'] = cfg.cp_range
        fp['vort_range'] = cfg.vort_range
        self.ctx.disable(moderngl.BLEND)
        self.field_vao.render(mode=moderngl.TRIANGLE_STRIP)
        self.ctx.enable(moderngl.BLEND)
        self.ctx.blend_func = moderngl.SRC_ALPHA, moderngl.ONE_MINUS_SRC_ALPHA

        self.frame += 1
        if cfg.show_stream and self.frame % 5 == 0:
            self.stream_verts = s.streamline_vertices(int(cfg.n_stream), cfg.palette)
        if cfg.show_vectors and self.frame % 2 == 0:
            self.vec_verts = s.vector_vertices(cfg.vec_spacing, cfg.vec_gain, cfg.palette)
        if cfg.show_stream and len(self.stream_verts):
            self.line_buf.orphan()
            self.line_buf.write(self.stream_verts.tobytes())
            self.ctx.line_width = 1.5
            self.line_vao.render(mode=moderngl.LINES, vertices=len(self.stream_verts))
        if cfg.show_vectors and len(self.vec_verts):
            self.line_buf.orphan()
            self.line_buf.write(self.vec_verts.tobytes())
            self.ctx.line_width = 1.4
            self.line_vao.render(mode=moderngl.LINES, vertices=len(self.vec_verts))
        if cfg.show_contour:
            o = s.outline_ndc()
            verts = np.hstack([o, np.tile(np.array([*OBSTACLE_COLOR, 0.9], 'f4'), (len(o), 1))]).astype('f4')
            self.outline_buf.write(verts.tobytes())
            self.ctx.line_width = 1.5
            self.outline_vao.render(mode=moderngl.LINE_LOOP, vertices=len(o))

        # ---- interface
        self.io.display_size = imgui.ImVec2(W, H)
        self.io.display_framebuffer_scale = imgui.ImVec2(ratio, ratio)
        self.io.delta_time = dt_frame
        imgui.new_frame()
        ph = s.phys()
        self._draw_hud(ph)
        if cfg.show_panel:
            self._draw_panel(ph)
        self._draw_probe(ph)
        imgui.render()
        self.gui.render(imgui.get_draw_data(), fbw, fbh, ratio)

        if self.capture_request:
            self.capture_request = False
            self._capture(ratio)

    # ------------------------------------------------------------------ HUD (par-dessus la simulation)
    def _big_text(self, dl, pos, size, color, text):
        if self.font is not None:
            dl.add_text(self.font, size, imgui.ImVec2(*pos), color, text)
        else:
            dl.add_text(imgui.ImVec2(*pos), color, text)

    def _draw_hud(self, ph):
        cfg, s = self.cfg, self.sim
        dl = imgui.get_background_draw_list()
        x, y, w, h = self.sim_rect
        white, dim = col32((0.93, 0.93, 0.95)), col32((0.70, 0.72, 0.78))
        dl.add_rect_filled(imgui.ImVec2(x + 10, y + 8), imgui.ImVec2(x + 372, y + (130 if self.paused else 110)),
                           col32(BG, 0.62), 12.0)
        self._big_text(dl, (x + 20, y + 14), 44, white, f"{cfg.wind_ms:.0f} m/s")
        self._big_text(dl, (x + 22, y + 62), 17, dim,
                       f"{cfg.wind_ms * 3.6:.0f} km/h   -   Mach {ph.mach:.2f}   -   Re {ph.re:.1e}")
        self._big_text(dl, (x + 22, y + 84), 15, col32((0.58, 0.60, 0.66)),
                       f"Ralenti x{ph.ralenti:.0f}  ({ph.screen_speed:.2f} ecran/s)   "
                       f"{SHAPE_LABELS[s.shape]}  {int(round(s.incidence_deg)):+d} deg")
        if self.paused:
            self._big_text(dl, (x + 22, y + 106), 15, col32(ACCENT), "PAUSE  (P)")

        if cfg.show_ruler:
            step = nice_step(cfg.width_m / max(w / 110.0, 1))
            px_per_m = w / cfg.width_m
            rc = col32((0.7, 0.72, 0.78), 0.5)
            m = 0.0
            while m * px_per_m <= w:
                xx = x + m * px_per_m
                dl.add_line(imgui.ImVec2(xx, y + h), imgui.ImVec2(xx, y + h - 7), rc, 1.0)
                lab = f"{m:g} m"
                self._big_text(dl, (xx + 3, y + h - 22), 13, rc, lab)
                m += step
            m = step
            while m * px_per_m <= h:
                yy = y + h - m * px_per_m
                dl.add_line(imgui.ImVec2(x, yy), imgui.ImVec2(x + 7, yy), rc, 1.0)
                self._big_text(dl, (x + 10, yy - 7), 13, rc, f"{m:g} m")
                m += step

        if cfg.show_markers and s.ring_idx.size:
            mk = s.markers()
            for cx, cy, cp, name in mk or []:
                if (name == "Point d'arret" and cp < 0.3) or (name != "Point d'arret" and cp > -0.3):
                    continue
                wx, wy = self._cell_to_win(cx, cy)
                warm = name == "Point d'arret"
                c = col32(PRESS_WARM if warm else (0.45, 0.70, 0.90))
                dl.add_circle(imgui.ImVec2(wx, wy), 5.0, c, 20, 2.0)
                side = -1 if warm else 1
                self._big_text(dl, (wx - 150 if warm else wx + 12, wy - 8 + side * 0), 14, c,
                               f"{name}  Cp {cp:+.2f}  ({fmt_pa(cp * ph.q)})")

        self._draw_legend(dl, ph)

    def _draw_legend(self, dl, ph):
        cfg = self.cfg
        x, y, w, h = self.sim_rect
        bw, bh = 190, 10
        bx, by = x + w - bw - 24, y + h - 54
        n = 48
        dl.add_rect_filled(imgui.ImVec2(bx - 12, by - 28), imgui.ImVec2(bx + bw + 12, by + bh + 24),
                           col32(BG, 0.62), 10.0)
        if cfg.mode == 0:
            lo, hi = SPEED_MIN * cfg.wind_ms, SPEED_MAX * cfg.wind_ms
            colf = lambda t: tuple(PALETTES[cfg.palette][1][i] + (PALETTES[cfg.palette][2][i] - PALETTES[cfg.palette][1][i]) * t for i in range(3))
            lab = ("Vitesse de l'air", f"{lo:.0f} m/s", f"{hi:.0f} m/s")
        elif cfg.mode == 1:
            r = cfg.cp_range * ph.q
            colf = lambda t: diverging(t * 2 - 1, PRESS_COOL, PRESS_MID, PRESS_WARM)
            lab = ("Pression (relative au vent libre)", fmt_pa(-r), fmt_pa(r))
        elif cfg.mode == 2:
            r = cfg.vort_range * NX * cfg.wind_ms / cfg.width_m
            colf = lambda t: diverging(t * 2 - 1, VORT_COOL, VORT_MID, VORT_WARM)
            lab = ("Vorticite (horaire / trigo)", f"{-r:.0f} /s", f"{r:.0f} /s")
        else:
            colf = lambda t: speed_ramp(t)
            lab = ("Vitesse", "0 m/s", f"{SPEED_RAMP_MAX * cfg.wind_ms:.0f} m/s")
        for i in range(n):
            t = i / (n - 1)
            dl.add_rect_filled(imgui.ImVec2(bx + i * bw / n, by), imgui.ImVec2(bx + (i + 1) * bw / n + 1, by + bh),
                               col32(colf(t)))
        dim = col32((0.74, 0.76, 0.82))
        self._big_text(dl, (bx, by - 22), 14, dim, lab[0])
        self._big_text(dl, (bx, by + bh + 3), 13, dim, lab[1])
        tw = imgui.calc_text_size(lab[2]).x
        self._big_text(dl, (bx + bw - tw, by + bh + 3), 13, dim, lab[2])

    # ------------------------------------------------------------------ sonde souris
    def _draw_probe(self, ph):
        cfg, s = self.cfg, self.sim
        if not cfg.show_probe or self.probe_pos is None or self.dragging:
            return
        if self.io.want_capture_mouse or not self._in_sim(*self.probe_pos):
            return
        cx, cy = self._win_to_cell(*self.probe_pos)
        v = s.sample(cx, cy)
        dl = imgui.get_foreground_draw_list()
        c = col32((0.95, 0.95, 0.97), 0.8)
        px, py = self.probe_pos
        dl.add_circle(imgui.ImVec2(px, py), 6.0, c, 20, 1.3)
        x_m, y_m = cx * ph.dx, cy * ph.dx
        if v.solid > 0.5:
            imgui.begin_tooltip()
            imgui.text(f"Obstacle ({SHAPE_LABELS[s.shape]})  x {x_m:.2f} m   y {y_m:.2f} m")
            imgui.end_tooltip()
            return
        ux, vy = v.u * ph.vel, v.v * ph.vel
        spd = float(np.hypot(ux, vy))
        p_pa = v.cp * ph.q
        dyn = 0.5 * cfg.rho * spd ** 2
        ptot = (p_pa + dyn) / ph.q
        imgui.begin_tooltip()
        imgui.text(f"x {x_m:.2f} m    y {y_m:.2f} m")
        imgui.separator()
        imgui.text(f"Vitesse  {spd:.1f} m/s   ({spd * 3.6:.0f} km/h)")
        imgui.text(f"  u = {ux:+.1f}   v = {vy:+.1f} m/s     Mach {spd / cfg.sound:.3f}")
        imgui.text(f"Pression  {fmt_pa(p_pa)}   (Cp {v.cp:+.2f})")
        imgui.text(f"Pression dynamique  {fmt_pa(dyn)}")
        imgui.text(f"Pression totale  {ptot * 100:.0f} % du vent libre")
        imgui.text(f"Vorticite  {v.vort / max(self.sim.wind, 1e-3) * ph.vort:+.0f} /s")
        if ptot < 0.9:
            imgui.text_colored(imgui.ImVec4(0.9, 0.64, 0.36, 1), "< 100 % : air du sillage, energie perdue")
        imgui.end_tooltip()

    # ------------------------------------------------------------------ panneau
    def _slider(self, label, obj, attr, lo, hi, fmt="%.2f", log=False, tip=None, width=210):
        imgui.set_next_item_width(width)
        flags = imgui.SliderFlags_.logarithmic if log else 0
        ch, val = imgui.slider_float(label, float(getattr(obj, attr)), lo, hi, fmt, flags)
        if ch:
            setattr(obj, attr, val)
        if tip and imgui.is_item_hovered():
            imgui.set_tooltip(tip)
        return ch

    def _check(self, label, obj, attr, tip=None):
        ch, val = imgui.checkbox(label, bool(getattr(obj, attr)))
        if ch:
            setattr(obj, attr, val)
        if tip and imgui.is_item_hovered():
            imgui.set_tooltip(tip)
        return ch

    def _toast(self, text):
        self.toast = (text, time.perf_counter() + 2.5)

    def _draw_panel(self, ph):
        cfg, s = self.cfg, self.sim
        W, H = self.wnd.size
        imgui.set_next_window_pos(imgui.ImVec2(W - PANEL_W, 0))
        imgui.set_next_window_size(imgui.ImVec2(PANEL_W, H))
        flags = (imgui.WindowFlags_.no_move | imgui.WindowFlags_.no_resize | imgui.WindowFlags_.no_collapse
                 | imgui.WindowFlags_.no_title_bar | imgui.WindowFlags_.no_saved_settings)
        imgui.begin("panneau", None, flags)
        imgui.text_colored(imgui.ImVec4(*ACCENT, 1), "NOVA STUDIO")
        imgui.same_line()
        imgui.text_disabled("  Soufflerie numerique")
        imgui.text_disabled(f"{self.fps:.0f} fps   calcul {self.sim_ms:.1f} ms   TAB = masquer")
        imgui.spacing()

        # ---------------- Mesures
        if imgui.collapsing_header("Mesures", imgui.TreeNodeFlags_.default_open):
            F = lambda c: c * ph.q * ph.d_m          # force par metre d'envergure (N/m)
            fl, fd = F(self.cl_s), F(self.cd_s)
            imgui.text(f"Portance   {fl:+9.1f} N/m     Cl {self.cl_s:+.2f}")
            imgui.text(f"Trainee    {fd:+9.1f} N/m     Cd {self.cd_s:+.2f}")
            fin = self.cl_s / self.cd_s if abs(self.cd_s) > 0.02 else 0.0
            imgui.text(f"Finesse Cl/Cd  {fin:+.1f}")
            imgui.text(f"Pression dynamique q  {fmt_pa(ph.q)}")
            imgui.text(f"Reynolds {ph.re:.2e}    Mach {ph.mach:.3f}")
            imgui.text_disabled(f"Taille de reference : {ph.d_m * 100:.0f} cm")
            if ph.mach > 0.3:
                imgui.text_colored(imgui.ImVec4(0.9, 0.55, 0.35, 1),
                                   "Mach > 0.3 : l'air devient compressible,\nla simulation n'est plus fiable.")
            for label, hist, col in (("Cl", self.hist_cl, "portance"), ("Cd", self.hist_cd, "trainee")):
                lo, hi = min(float(hist.min()), -0.3), max(float(hist.max()), 0.3)
                imgui.plot_lines("##" + label, hist, 0, f"{label} ({col})", lo, hi, imgui.ImVec2(PANEL_W - 40, 44))
            if imgui.is_item_hovered():
                imgui.set_tooltip("Calcul par integration de la PRESSION sur la surface (la friction\n"
                                  "n'est pas modelisee) : valeurs qualitatives, bons ordres de grandeur.")
            if ph.re < 1e3:
                regime = "ecoulement lent, tres visqueux"
            elif ph.re < 3e5:
                regime = "sillage turbulent, couche limite laminaire"
            else:
                regime = "couche limite turbulente (reel)"
            imgui.text_disabled(f"Regime reel (indicatif) : {regime}")
            imgui.text_disabled("Note : la simulation ne depend pas de Re\n(viscosite numerique).")

        # ---------------- Ecoulement
        if imgui.collapsing_header("Ecoulement", imgui.TreeNodeFlags_.default_open):
            imgui.text_disabled("Scenarios")
            names = list(PRESETS)
            for i, name in enumerate(names):
                if i % 2:
                    imgui.same_line()
                if imgui.button(name, imgui.ImVec2((PANEL_W - 50) / 2, 0)):
                    for k, v in PRESETS[name].items():
                        setattr(cfg, k, v)
                    cfg.update_fluid()
            self._slider("Vent (m/s)", cfg, 'wind_ms', 1.0, 120.0, "%.1f", True,
                         "Vitesse de l'air loin de l'obstacle. Touches A / E.")
            imgui.text_disabled(f"      = {cfg.wind_ms * 3.6:.0f} km/h   (Mach {cfg.wind_ms / cfg.sound:.2f})")
            self._slider("Largeur (m)", cfg, 'width_m', 0.2, 30.0, "%.2f", True,
                         "Largeur reelle du tunnel visible : fixe l'echelle de toutes les mesures.")
            self._slider("Ralenti", cfg, 'slowmo', 1.0, 300.0, "x %.0f", True,
                         "Le vrai vent traverserait l'ecran en un instant : on ralentit le temps.\n"
                         "Ca ne change pas la physique, seulement la vitesse d'affichage.")
            ch, f = imgui.combo("Fluide", cfg.fluid, ["Air", "Eau"])
            if ch:
                cfg.fluid = f
                cfg.update_fluid()
            if cfg.fluid == 0:
                if self._slider("Temperature (C)", cfg, 'temp_c', -40.0, 50.0, "%.0f"):
                    cfg.update_fluid()
            imgui.text_disabled(f"rho {cfg.rho:.3g} kg/m3   nu {cfg.nu:.2e} m2/s   son {cfg.sound:.0f} m/s")

        # ---------------- Obstacle
        if imgui.collapsing_header("Obstacle", imgui.TreeNodeFlags_.default_open):
            for i, key in enumerate(SHAPE_ORDER):
                if i:
                    imgui.same_line()
                if imgui.radio_button(SHAPE_LABELS[key], s.shape == key):
                    self._set_shape(i)
            inc = s.incidence_deg
            imgui.set_next_item_width(210)
            ch, inc = imgui.slider_float("Incidence (deg)", inc, -40.0, 40.0, "%+.1f")
            if ch:
                s.obstacle_angle = -float(np.radians(inc))
                s.refresh_obstacle()
            if imgui.is_item_hovered():
                imgui.set_tooltip("Angle d'attaque : positif = nez en haut (comme une aile qui cabre).\nTouches Q / D ou molette.")
            hm = s.obstacle_cy * ph.dx
            imgui.set_next_item_width(210)
            ch, hm = imgui.slider_float("Hauteur (m)", hm, 0.0, NY * ph.dx, "%.2f")
            if ch:
                s.obstacle_cy = hm / ph.dx
                s.refresh_obstacle()
            old = GEO['scale']
            sc = [old]
            imgui.set_next_item_width(210)
            ch, sc0 = imgui.slider_float("Taille", old, 0.5, 1.4, "x %.2f")
            if ch:
                GEO['scale'] = sc0
                s.refresh_obstacle()
            if s.shape == 'wing':
                imgui.set_next_item_width(210)
                ch, th = imgui.slider_float("Epaisseur aile (%)", GEO['thickness'] * 100, 6.0, 24.0, "%.0f")
                if ch:
                    GEO['thickness'] = th / 100
                    s.refresh_obstacle()
            imgui.text_disabled("Souris : glisser = deplacer, molette = incidence")

        # ---------------- Affichage
        if imgui.collapsing_header("Affichage", imgui.TreeNodeFlags_.default_open):
            for i, name in enumerate(MODE_NAMES):
                if i % 2:
                    imgui.same_line()
                if imgui.radio_button(f"{name} ({i + 1})", cfg.mode == i):
                    cfg.mode = i
            if cfg.mode == 1:
                self._slider("Echelle Cp", cfg, 'cp_range', 0.3, 4.0, "+/- %.1f")
            if cfg.mode == 2:
                self._slider("Echelle vorticite", cfg, 'vort_range', 0.05, 1.0, "%.2f")
            if cfg.mode != 0:
                self._slider("Fumee par-dessus", cfg, 'smoke_amt', 0.0, 1.0, "%.2f")
            ch, pal = imgui.combo("Palette fumee", cfg.palette, [p[0] for p in PALETTES])
            if ch:
                cfg.palette = pal
            self._check("Vecteurs vitesse (V)", cfg, 'show_vectors')
            if cfg.show_vectors:
                ch, v = imgui.slider_int("Espacement", cfg.vec_spacing, 5, 24)
                cfg.vec_spacing = v
                self._slider("Longueur", cfg, 'vec_gain', 0.3, 2.5, "x %.2f")
            self._check("Lignes de courant (L)", cfg, 'show_stream',
                        "Trajectoires de l'air a un instant donne : serrees = air rapide.")
            if cfg.show_stream:
                ch, v = imgui.slider_int("Nombre de lignes", cfg.n_stream, 8, 80)
                cfg.n_stream = v
            self._check("Sonde souris", cfg, 'show_probe', "Survole la simulation : toutes les valeurs au point.")
            self._check("Points d'arret / depression", cfg, 'show_markers')
            self._check("Regle en metres", cfg, 'show_ruler')
            self._check("Contour de l'obstacle", cfg, 'show_contour')

        # ---------------- Simulation
        if imgui.collapsing_header("Simulation"):
            if imgui.button("Pause (P)" if not self.paused else "Reprendre (P)", imgui.ImVec2(110, 0)):
                self.paused = not self.paused
            imgui.same_line()
            if imgui.button("Pas a pas", imgui.ImVec2(80, 0)):
                self.paused = True
                self.step_once = True
            imgui.same_line()
            if imgui.button("Reset (R)", imgui.ImVec2(80, 0)):
                s.reset()
            self._slider("Tourbillons (conf.)", cfg, 'confinement', 0.0, 15.0, "%.1f", False,
                         "Compense l'amortissement numerique des petits tourbillons.")
            self._slider("Persistance fumee", cfg, 'decay', 0.97, 1.0, "%.4f")
            self._check("Injecter de la fumee", cfg, 'smoke_on')
            ch1, b = imgui.slider_int("Epaisseur filets", cfg.band, 1, 8)
            ch2, g = imgui.slider_int("Espacement filets", cfg.gap, 2, 20)
            if ch1 or ch2:
                cfg.band, cfg.gap = b, g
                s.make_dye_source()
            if imgui.button("Capture d'ecran (C)", imgui.ImVec2(PANEL_W - 40, 0)):
                self.capture_request = True
            imgui.text_disabled("Pression : " + ("solveur exact" if s._lu is not None else
                                                   ("approche (scipy absent)" if not HAVE_SCIPY else "approche (en mouvement)")))

        # ---------------- Comprendre
        if imgui.collapsing_header("Comprendre ce que tu vois"):
            imgui.text_wrapped(MODE_HELP[cfg.mode])
            imgui.spacing()
            imgui.text_wrapped("Cp = (p - p_vent) / (1/2 rho U^2) : pression sans unite. Cp = 1 au point d'arret "
                               "(l'air s'arrete), Cp < 0 la ou l'air accelere.")
            imgui.spacing()
            imgui.text_wrapped("Bernoulli : le long d'une ligne de courant, p + 1/2 rho v^2 est constant tant qu'il n'y a "
                               "pas de perte. La sonde affiche 'pression totale' : sous 100 % = air du sillage.")
            imgui.spacing()
            imgui.text_wrapped("Portance : pour une aile a incidence positive, l'air du dessus accelere, sa pression "
                               "baisse (bleu) et l'aile est aspiree vers le haut. Au-dela de ~15 deg l'ecoulement "
                               "decolle : c'est le decrochage, Cl chute et la trainee explose.")
            imgui.spacing()
            imgui.text_wrapped("Carre : l'air decolle aux aretes vives, large sillage, grosse trainee. Ellipse / aile : "
                               "l'air reste colle plus longtemps, sillage etroit.")
        # message de capture
        if self.toast[1] > time.perf_counter():
            imgui.spacing()
            imgui.text_colored(imgui.ImVec4(*ACCENT, 1), self.toast[0])
        imgui.end()

    # ------------------------------------------------------------------ capture
    def _capture(self, ratio):
        x, y, w, h = self.sim_rect
        fbw, fbh = self.wnd.buffer_size
        vp = (int(x * ratio), int((self.wnd.size[1] - y - h) * ratio), int(w * ratio), int(h * ratio))
        data = self.wnd.fbo.read(components=3, viewport=vp)
        img = Image.frombytes('RGB', (vp[2], vp[3]), data).transpose(Image.FLIP_TOP_BOTTOM)
        name = datetime.now().strftime("nova_capture_%Y%m%d_%H%M%S.png")
        img.save(name)
        self._toast(f"Capture : {name}")


if __name__ == "__main__":
    print("Lancement...  (Z/S hauteur, Q/D incidence, A/E vent, ESPACE forme, TAB panneau)")
    mglw.run_window_config(MyApp)