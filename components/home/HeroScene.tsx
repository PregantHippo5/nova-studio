'use client';

import { useEffect, useRef } from 'react';

/*
 * Scène du hero, dessinée à la main sur un <canvas> 2D (aucune dépendance) :
 *   - un champ d'étoiles qui fuient la souris ;
 *   - un cristal 3D (bipyramide hexagonale) qui tourne ;
 *   - un rayon de lumière blanche qui entre dans le cristal (son angle suit la souris)
 *     et en ressort divisé en trois couleurs : celles des trois piliers du studio.
 */

type RGB = [number, number, number];
type Vec = [number, number, number];

interface Palette {
  dark: boolean;
  ink: RGB;
  accent: RGB;
  colors: [RGB, RGB, RGB];
}

interface Star {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  twinkle: number;
  tint: number;
}

function readVar(name: string, fallback: RGB): RGB {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/\s+/).map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) return [parts[0], parts[1], parts[2]];
  return fallback;
}

function readPalette(): Palette {
  return {
    dark: document.documentElement.classList.contains('dark'),
    ink: readVar('--ink', [11, 11, 13]),
    accent: readVar('--accent', [130, 126, 255]),
    colors: [
      readVar('--c-projects', [130, 126, 255]),
      readVar('--c-learn', [56, 215, 245]),
      readVar('--c-games', [255, 110, 180]),
    ],
  };
}

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Cristal : deux pointes et une ceinture hexagonale.
const SIDES = 6;
const TOP: Vec = [0, -1.45, 0];
const BOTTOM: Vec = [0, 1.45, 0];
const GIRDLE: Vec[] = Array.from({ length: SIDES }, (_, k) => {
  const a = (k / SIDES) * Math.PI * 2;
  return [Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95] as Vec;
});
const LIGHT: Vec = [-0.4, -0.6, -0.7];

function rotate(v: Vec, ry: number, rx: number): Vec {
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const x1 = v[0] * cy + v[2] * sy;
  const z1 = -v[0] * sy + v[2] * cy;
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  return [x1, v[1] * cx - z1 * sx, v[1] * sx + z1 * cx];
}

function makeStar(w: number, h: number): Star {
  const z = 0.2 + Math.random() * 0.8;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    z,
    dx: (Math.random() - 0.5) * 0.06,
    dy: -(0.06 + Math.random() * 0.22) * z,
    vx: 0,
    vy: 0,
    twinkle: Math.random() * Math.PI * 2,
    tint: Math.random() < 0.16 ? Math.floor(Math.random() * 3) : -1,
  };
}

export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;

    let w = 1;
    let h = 1;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let radius = 100;
    let portrait = false;
    let palette = readPalette();
    let stars: Star[] = [];
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let angle = 0.6;
    let boost = 0;
    let lastScrollY = window.scrollY;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, px: -9999, py: -9999 };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, fine ? 2 : 1.5);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      portrait = h > w * 1.05;
      cx = w * (portrait ? 0.7 : 0.72);
      cy = h * (portrait ? 0.21 : 0.47);
      radius = portrait ? Math.min(w * 0.17, 90) : Math.min(h * 0.24, w * 0.15, 230);

      const count = reduce ? 90 : fine ? (lowPower ? 110 : 200) : 64;
      stars = Array.from({ length: count }, () => makeStar(w, h));
      if (reduce) draw(performance.now());
    };

    const draw = (now: number) => {
      const { dark, ink, accent, colors } = palette;
      ctx.clearRect(0, 0, w, h);

      // ---------- étoiles ----------
      ctx.globalCompositeOperation = 'source-over';
      for (const s of stars) {
        const sx = s.x + (0.5 - mouse.x) * 32 * s.z;
        const sy = s.y + (0.5 - mouse.y) * 22 * s.z;
        const alpha = (0.2 + 0.6 * s.z) * (0.78 + 0.22 * Math.sin(now / 700 + s.twinkle));
        const base: RGB = s.tint >= 0 ? colors[s.tint] : dark ? [255, 255, 255] : ink;
        ctx.fillStyle = rgba(base, dark ? alpha : alpha * 0.7);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.6 + 1.5 * s.z, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---------- halo derrière le cristal ----------
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 3.4);
      halo.addColorStop(0, rgba(accent, dark ? 0.3 : 0.14));
      halo.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(cx - radius * 3.4, cy - radius * 3.4, radius * 6.8, radius * 6.8);

      // ---------- cristal (projection perspective) ----------
      const ry = angle + (mouse.x - 0.5) * 1.0;
      const rx = -0.32 + (mouse.y - 0.5) * 0.5;
      const F = 4;
      const rotated: Vec[] = [TOP, BOTTOM, ...GIRDLE].map((v) => rotate(v, ry, rx));
      const projected = rotated.map((r) => {
        const s = F / (F + r[2]);
        return [cx + r[0] * radius * s, cy + r[1] * radius * s] as [number, number];
      });
      const T = 0;
      const B = 1;
      const g = (k: number) => 2 + (((k % SIDES) + SIDES) % SIDES);

      let minX = Infinity;
      let maxX = -Infinity;
      for (const p of projected) {
        minX = Math.min(minX, p[0]);
        maxX = Math.max(maxX, p[0]);
      }
      const entry: [number, number] = [lerp(minX, cx, 0.22), cy];
      const exit: [number, number] = [lerp(maxX, cx, 0.22), cy];

      // ---------- rayon entrant ----------
      const beamColor: RGB = dark ? [255, 255, 255] : ink;
      const originY = cy + (mouse.y - 0.5) * h * 0.8;
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      const glowGradient = ctx.createLinearGradient(-20, originY, entry[0], entry[1]);
      glowGradient.addColorStop(0, rgba(beamColor, 0));
      glowGradient.addColorStop(1, rgba(beamColor, dark ? 0.16 : 0.1));
      const coreGradient = ctx.createLinearGradient(-20, originY, entry[0], entry[1]);
      coreGradient.addColorStop(0, rgba(beamColor, 0));
      coreGradient.addColorStop(0.55, rgba(beamColor, dark ? 0.5 : 0.4));
      coreGradient.addColorStop(1, rgba(beamColor, dark ? 0.95 : 0.8));
      ctx.lineCap = 'round';
      ctx.strokeStyle = glowGradient;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-20, originY);
      ctx.lineTo(entry[0], entry[1]);
      ctx.stroke();
      ctx.strokeStyle = coreGradient;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-20, originY);
      ctx.lineTo(entry[0], entry[1]);
      ctx.stroke();

      // ---------- faces du cristal, de l'arrière vers l'avant ----------
      type Face = { ids: [number, number, number]; z: number; shade: number; color: RGB };
      const faces: Face[] = [];
      for (let k = 0; k < SIDES; k++) {
        const top: [number, number, number] = [T, g(k), g(k + 1)];
        const bottom: [number, number, number] = [B, g(k + 1), g(k)];
        for (const [ids, colorIndex] of [
          [top, k % 3],
          [bottom, (k + 1) % 3],
        ] as [[number, number, number], number][]) {
          const [a, b, c] = ids.map((i) => rotated[i]);
          const ux = b[0] - a[0];
          const uy = b[1] - a[1];
          const uz = b[2] - a[2];
          const vx = c[0] - a[0];
          const vy = c[1] - a[1];
          const vz = c[2] - a[2];
          let nx = uy * vz - uz * vy;
          let ny = uz * vx - ux * vz;
          let nz = ux * vy - uy * vx;
          const len = Math.hypot(nx, ny, nz) || 1;
          nx /= len;
          ny /= len;
          nz /= len;
          const shade = Math.abs(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
          faces.push({ ids, z: (a[2] + b[2] + c[2]) / 3, shade, color: colors[colorIndex] });
        }
      }
      faces.sort((p, q) => q.z - p.z);
      for (const face of faces) {
        const [a, b, c] = face.ids.map((i) => projected[i]);
        ctx.fillStyle = rgba(face.color, (0.05 + 0.2 * face.shade) * (dark ? 1 : 0.75));
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.closePath();
        ctx.fill();
      }

      // ---------- rayons sortants : le rayon blanc divisé en trois couleurs ----------
      const beamAngle = Math.atan2(cy - originY, entry[0] + 20);
      const base = beamAngle * 0.35 + 0.05 * Math.sin(angle * 2);
      const spread = 0.07 + 0.07 * (0.5 + 0.5 * Math.sin(angle * 1.5 + 1));
      const far = Math.hypot(w, h);
      const rayColors: RGB[] = [colors[2], colors[1], colors[0]];
      rayColors.forEach((color, i) => {
        const a = base + (i - 1) * spread;
        const ex = exit[0] + Math.cos(a) * far;
        const ey = exit[1] + Math.sin(a) * far;
        const gradient = ctx.createLinearGradient(exit[0], exit[1], ex, ey);
        gradient.addColorStop(0, rgba(color, dark ? 0.9 : 0.8));
        gradient.addColorStop(0.55, rgba(color, dark ? 0.35 : 0.3));
        gradient.addColorStop(1, rgba(color, 0));
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 12;
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.moveTo(exit[0], exit[1]);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(exit[0], exit[1]);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      });

      // ---------- arêtes et sommets ----------
      const edge = (i: number, j: number) => {
        const z = (rotated[i][2] + rotated[j][2]) / 2;
        const near = clamp(1 - (z + 1.5) / 3, 0, 1);
        ctx.strokeStyle = dark ? `rgba(255,255,255,${0.2 + 0.5 * near})` : rgba(ink, 0.25 + 0.45 * near);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(projected[i][0], projected[i][1]);
        ctx.lineTo(projected[j][0], projected[j][1]);
        ctx.stroke();
      };
      for (let k = 0; k < SIDES; k++) {
        edge(g(k), g(k + 1));
        edge(T, g(k));
        edge(B, g(k));
      }
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.9)' : rgba(ink, 0.85);
      for (const i of [T, B, ...Array.from({ length: SIDES }, (_, k) => g(k))]) {
        ctx.beginPath();
        ctx.arc(projected[i][0], projected[i][1], 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // éclat à la sortie du cristal
      const flare = ctx.createRadialGradient(exit[0], exit[1], 0, exit[0], exit[1], radius * 0.5);
      flare.addColorStop(0, rgba(beamColor, dark ? 0.55 : 0.3));
      flare.addColorStop(1, rgba(beamColor, 0));
      ctx.fillStyle = flare;
      ctx.fillRect(exit[0] - radius * 0.5, exit[1] - radius * 0.5, radius, radius);

      ctx.globalCompositeOperation = 'source-over';
    };

    const step = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const k = dt / 16.7;

      if (!fine) {
        // pas de souris : le rayon se balade tout seul
        mouse.tx = 0.5 + 0.18 * Math.sin(now / 2400);
        mouse.ty = 0.5 + 0.14 * Math.cos(now / 3100);
      }
      mouse.x += (mouse.tx - mouse.x) * 0.06 * k;
      mouse.y += (mouse.ty - mouse.y) * 0.06 * k;

      const scrollY = window.scrollY;
      boost = (boost + Math.abs(scrollY - lastScrollY) * 0.012) * 0.94;
      lastScrollY = scrollY;
      angle += (0.32 + Math.min(boost, 3)) * (dt / 1000);

      for (const s of stars) {
        const ddx = s.x - mouse.px;
        const ddy = s.y - mouse.py;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < 150 * 150) {
          const d = Math.sqrt(d2) || 1;
          const force = (1 - d / 150) * 1.1 * (0.4 + s.z);
          s.vx += (ddx / d) * force;
          s.vy += (ddy / d) * force;
        }
        s.x += (s.dx + s.vx) * k;
        s.y += (s.dy + s.vy) * k;
        s.vx *= 0.93;
        s.vy *= 0.93;
        if (s.y < -10) {
          s.y = h + 10;
          s.x = Math.random() * w;
        }
        if (s.y > h + 10) s.y = -10;
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
      }

      draw(now);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      step(now);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = clamp((event.clientX - rect.left) / w, 0, 1);
      mouse.ty = clamp((event.clientY - rect.top) / h, 0, 1);
      mouse.px = event.clientX - rect.left;
      mouse.py = event.clientY - rect.top;
    };
    const onPointerLeave = () => {
      mouse.px = -9999;
      mouse.py = -9999;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersection.observe(canvas);
    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
      if (reduce) draw(performance.now());
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    if (!reduce) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerleave', onPointerLeave);
      raf = requestAnimationFrame(loop);
    }

    resize();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      themeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
