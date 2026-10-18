'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DT,
  FluidSim,
  GEO,
  MAX_ANGLE,
  NX,
  NY,
  PRESETS,
  SHAPE_ORDER,
  ShapeKey,
  defaultConfig,
  fluidProps,
  screenSpeed,
} from '@/lib/sim/windTunnel';
import { PALETTES, ViewOptions, drawOverlays, fmtPa, renderField } from '@/lib/sim/windTunnelRender';
import { WindTunnelCopy } from '@/lib/sim/windTunnelCopy';

const WIND_MIN = 1;
const WIND_MAX = 120;
const windFromSlider = (t: number) => WIND_MIN * Math.pow(WIND_MAX / WIND_MIN, t);
const sliderFromWind = (w: number) => Math.log(w / WIND_MIN) / Math.log(WIND_MAX / WIND_MIN);

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  title,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
  title?: string;
}) {
  return (
    <label className="block" title={title}>
      <span className="flex items-baseline justify-between text-[0.8rem] text-muted">
        <span>{label}</span>
        <span className="font-mono text-ink">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-[rgb(var(--c-learn))]"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[0.85rem] text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[rgb(var(--c-learn))]"
      />
      {label}
    </label>
  );
}

function Segmented({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: number;
  onChange: (i: number) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={i === value}
          onClick={() => onChange(i)}
          className={`rounded-full border px-3 py-1 text-[0.8rem] transition-colors ${
            i === value
              ? 'border-transparent bg-ink text-paper'
              : 'border-line text-muted hover:border-ink hover:text-ink'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line py-4 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[0.9rem] font-semibold text-ink">
        {title}
        <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

export default function WindTunnel({ copy }: { copy: WindTunnelCopy }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);

  const cfg = useMemo(() => defaultConfig(), []);
  const simRef = useRef<FluidSim | null>(null);
  const viewRef = useRef<ViewOptions>({
    mode: 0,
    palette: 0,
    smokeAmt: 0.3,
    cpRange: 1,
    vortRange: 0.25,
    showVectors: false,
    showStream: false,
    showMarkers: true,
    showRuler: true,
    showContour: true,
    nStream: 36,
  });
  const pausedRef = useRef(false);
  const probeOn = useRef(true);
  const copyRef = useRef(copy);
  copyRef.current = copy;

  // ----- état de l'interface (les réglages sont aussi dans des refs pour la boucle de rendu)
  const [shape, setShapeState] = useState<ShapeKey>('cube');
  const [incidence, setIncidence] = useState(0);
  const [heightM, setHeightM] = useState(0);
  const [scale, setScale] = useState(1);
  const [thickness, setThickness] = useState(14);
  const [wind, setWind] = useState(cfg.windMs);
  const [fluid, setFluid] = useState<0 | 1>(0);
  const [tempC, setTempC] = useState(15);
  const [widthM, setWidthM] = useState(cfg.widthM);
  const [preset, setPreset] = useState('tunnel');
  const [view, setViewState] = useState<ViewOptions>(viewRef.current);
  const [probe, setProbe] = useState(true);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState({ cd: 0, cl: 0, q: 0, d: 0 });

  const setView = (patch: Partial<ViewOptions>) => {
    viewRef.current = { ...viewRef.current, ...patch };
    setViewState(viewRef.current);
  };

  const syncHeight = useCallback(() => {
    const s = simRef.current;
    if (!s) return;
    const dx = cfg.widthM / NX;
    setHeightM(s.cy * dx);
    setIncidence(s.incidenceDeg);
  }, [cfg]);

  // ----- création de la simulation + boucle
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    GEO.scale = 1;
    GEO.thickness = 0.14;
    const sim = new FluidSim(cfg);
    simRef.current = sim;
    setReady(true);
    syncHeight();

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      pausedRef.current = true;
      setPaused(true);
      for (let i = 0; i < 90; i++) sim.step();
    }

    const off = document.createElement('canvas');
    off.width = NX;
    off.height = NY;
    const octx = off.getContext('2d')!;
    const img = octx.createImageData(NX, NY);
    const overlayCache = { stream: [] as number[][][] };

    let W = 0;
    let H = 0;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(320, Math.round(rect.width * dpr));
      H = Math.round((W * NY) / NX);
      canvas.width = W;
      canvas.height = H;
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(wrap);

    let cd = 0;
    let cl = 0;
    let frame = 0;
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    let visible = true;
    const held = new Set<string>();
    const pointer = { x: -1, y: -1, inside: false, dragging: false, offset: 0 };

    const toCells = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((clientX - r.left) / r.width) * NX, y: (1 - (clientY - r.top) / r.height) * NY };
    };

    const draw = () => {
      renderField(sim, img, viewRef.current);
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(off, 0, 0, W, H);
      const ph = sim.phys();
      drawOverlays(
        ctx,
        W,
        H,
        sim,
        viewRef.current,
        ph,
        cfg.windMs,
        pausedRef.current,
        {
          legend: copyRef.current.legend,
          pressure: '',
          vorticity: '',
          speed: '',
          stagnation: copyRef.current.stagnation,
          suction: copyRef.current.suction,
          slowmo: copyRef.current.slowmo,
          screenSec: copyRef.current.screenSec,
          pause: copyRef.current.paused,
          shapes: copyRef.current.shapes,
        },
        frame,
        overlayCache,
      );
      if (pointer.inside && !pointer.dragging && probeOn.current) {
        const c = toCells(pointer.x, pointer.y);
        const px = ((pointer.x - canvas.getBoundingClientRect().left) / canvas.getBoundingClientRect().width) * W;
        const py = ((pointer.y - canvas.getBoundingClientRect().top) / canvas.getBoundingClientRect().height) * H;
        ctx.strokeStyle = 'rgba(242,242,247,0.8)';
        ctx.lineWidth = 1.3 * (W / 960);
        ctx.beginPath();
        ctx.arc(px, py, 6 * (W / 960), 0, Math.PI * 2);
        ctx.stroke();
        updateProbe(c.x, c.y, ph);
      } else if (probeRef.current) {
        probeRef.current.style.display = 'none';
      }
    };

    const updateProbe = (cx: number, cy: number, ph: ReturnType<FluidSim['phys']>) => {
      const el = probeRef.current;
      if (!el) return;
      if (cx < 0 || cx > NX || cy < 0 || cy > NY) {
        el.style.display = 'none';
        return;
      }
      const c = copyRef.current;
      const v = sim.sample(cx, cy);
      const xm = cx * ph.dx;
      const ym = cy * ph.dx;
      let html: string;
      if (v.solid > 0.5) {
        html = `<b>${c.probeObstacle}</b> (${c.shapes[sim.shape]})<br/>x ${xm.toFixed(2)} m · y ${ym.toFixed(2)} m`;
      } else {
        const ux = v.u * ph.vel;
        const vy = v.v * ph.vel;
        const spd = Math.hypot(ux, vy);
        const pPa = v.cp * ph.q;
        const dyn = 0.5 * ph.rho * spd * spd;
        const ptot = (pPa + dyn) / ph.q;
        const vort = (v.vort / Math.max(sim.wind, 1e-3)) * ph.vortScale;
        html =
          `x ${xm.toFixed(2)} m · y ${ym.toFixed(2)} m<hr/>` +
          `${c.probeSpeed} <b>${spd.toFixed(1)} m/s</b> (${(spd * 3.6).toFixed(0)} km/h)<br/>` +
          `u ${ux >= 0 ? '+' : ''}${ux.toFixed(1)} · v ${vy >= 0 ? '+' : ''}${vy.toFixed(1)} m/s · Mach ${(spd / ph.sound).toFixed(3)}<br/>` +
          `${c.probePressure} <b>${fmtPa(pPa)}</b> (Cp ${v.cp >= 0 ? '+' : ''}${v.cp.toFixed(2)})<br/>` +
          `${c.probeDynamic} ${fmtPa(dyn)}<br/>` +
          `${c.probeTotal} ${(ptot * 100).toFixed(0)} % ${c.probeTotalUnit}<br/>` +
          `${c.probeVort} ${vort >= 0 ? '+' : ''}${vort.toFixed(0)} /s` +
          (ptot < 0.9 ? `<br/><span style="color:#e6a35c">${c.probeWake}</span>` : '');
      }
      el.innerHTML = html;
      el.style.display = 'block';
      const r = canvas.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      const left = pointer.x - wr.left + 16;
      const flip = left + 250 > wr.width;
      el.style.left = `${flip ? pointer.x - wr.left - 16 : left}px`;
      el.style.top = `${Math.min(pointer.y - wr.top + 12, r.height - 130)}px`;
      el.style.transform = flip ? 'translateX(-100%)' : 'none';
    };

    const applyKeys = (dt: number) => {
      if (held.size === 0) return;
      let changed = false;
      if (held.has('ArrowRight') || held.has('d')) {
        sim.angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, sim.angle - ((35 * Math.PI) / 180) * dt));
        changed = true;
      }
      if (held.has('ArrowLeft') || held.has('q')) {
        sim.angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, sim.angle + ((35 * Math.PI) / 180) * dt));
        changed = true;
      }
      if (held.has('ArrowUp') || held.has('z')) {
        sim.cy += 30 * dt;
        changed = true;
      }
      if (held.has('ArrowDown') || held.has('s')) {
        sim.cy -= 30 * dt;
        changed = true;
      }
      if (changed) {
        sim.refreshObstacle();
        syncHeight();
      }
      let f = 0;
      if (held.has('+') || held.has('=') || held.has('e')) f += 1;
      if (held.has('-') || held.has('a')) f -= 1;
      if (f) {
        cfg.windMs = Math.max(WIND_MIN, Math.min(WIND_MAX, cfg.windMs * Math.exp(0.9 * f * dt)));
        setWind(cfg.windMs);
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = Math.min(now - last, 50);
      last = now;
      if (!visible || document.hidden) return;
      applyKeys(elapsed / 1000);
      const target = screenSpeed(cfg) * NX;
      if (Math.abs(target - sim.wind) > 1e-3) sim.setWind(target);
      acc += elapsed;
      let steps = 0;
      if (!pausedRef.current) {
        while (acc >= DT * 1000 && steps < 2) {
          sim.step(DT);
          acc -= DT * 1000;
          steps++;
        }
        if (acc > DT * 1000) acc = 0;
      } else acc = 0;
      sim.updateFields();
      const [c1, c2] = sim.forcesCoeffs();
      cd += (c1 - cd) * 0.12;
      cl += (c2 - cl) * 0.12;
      frame++;
      if (frame % 15 === 0) {
        const ph = sim.phys();
        setStats({ cd, cl, q: ph.q, d: ph.dx * (Math.max(...sim.outline().x) - Math.min(...sim.outline().x)) });
      }
      draw();
    };
    raf = requestAnimationFrame(tick);

    // ----- interactions
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.inside = true;
      if (pointer.dragging) {
        sim.cy = toCells(e.clientX, e.clientY).y + pointer.offset;
        sim.refreshObstacle();
        syncHeight();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      canvas.focus({ preventScroll: true });
      pointer.dragging = true;
      pointer.offset = sim.cy - toCells(e.clientX, e.clientY).y;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerUp = (e: PointerEvent) => {
      pointer.dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    const onPointerLeave = () => {
      pointer.inside = false;
    };

    // tactile : on ne bloque le défilement de la page que si le doigt commence sur l'obstacle
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const c = toCells(t.clientX, t.clientY);
      const v = sim.sample(c.x, c.y);
      const near = v.solid > 0.3 || Math.abs(c.y - sim.cy) < 28;
      if (near && Math.abs(c.x - NX / 2) < 70) {
        pointer.dragging = true;
        pointer.offset = sim.cy - c.y;
        e.preventDefault();
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pointer.dragging) return;
      e.preventDefault();
      const t = e.touches[0];
      sim.cy = toCells(t.clientX, t.clientY).y + pointer.offset;
      sim.refreshObstacle();
      syncHeight();
    };
    const onTouchEnd = () => {
      pointer.dragging = false;
    };

    const keyName = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const onKeyDown = (e: KeyboardEvent) => {
      const k = keyName(e);
      if (k === ' ') {
        e.preventDefault();
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        return;
      }
      if (k === 'p') {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        return;
      }
      if (k === 'r') {
        sim.reset();
        return;
      }
      if (k === 'v') {
        setView({ showVectors: !viewRef.current.showVectors });
        return;
      }
      if (k === 'l') {
        setView({ showStream: !viewRef.current.showStream });
        return;
      }
      if (['1', '2', '3', '4'].includes(k)) {
        setView({ mode: parseInt(k, 10) - 1 });
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'z', 's', 'q', 'd', 'a', 'e', '+', '=', '-'].includes(k)) {
        e.preventDefault();
        held.add(k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => held.delete(keyName(e));
    const onBlur = () => held.clear();

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('blur', onBlur);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = performance.now();
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('blur', onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- actions de l'interface
  const sim = () => simRef.current;

  const setShape = (k: ShapeKey) => {
    setShapeState(k);
    sim()?.setShape(k);
    syncHeight();
  };
  const onIncidence = (deg: number) => {
    const s = sim();
    if (!s) return;
    s.angle = -(deg * Math.PI) / 180;
    s.refreshObstacle();
    syncHeight();
  };
  const onHeight = (m: number) => {
    const s = sim();
    if (!s) return;
    s.cy = m / (cfg.widthM / NX);
    s.refreshObstacle();
    syncHeight();
  };
  const onScale = (v: number) => {
    setScale(v);
    GEO.scale = v;
    sim()?.refreshObstacle();
    syncHeight();
  };
  const onThickness = (v: number) => {
    setThickness(v);
    GEO.thickness = v / 100;
    sim()?.refreshObstacle();
  };
  const onWind = (t: number) => {
    cfg.windMs = windFromSlider(t);
    setWind(cfg.windMs);
  };
  const onPreset = (key: string) => {
    setPreset(key);
    const p = PRESETS[key];
    Object.assign(cfg, p);
    setWind(cfg.windMs);
    setWidthM(cfg.widthM);
    setFluid(cfg.fluid);
    syncHeight();
  };
  const onFluid = (f: 0 | 1) => {
    cfg.fluid = f;
    setFluid(f);
  };
  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const fp = fluidProps(cfg);
  const mach = wind / fp.sound;
  void tempC;
  const liftN = stats.cl * stats.q * stats.d;
  const dragN = stats.cd * stats.q * stats.d;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div>
        <div
          ref={wrapRef}
          className="relative overflow-hidden rounded-2xl border border-line bg-[#0b0c0e]"
          style={{ aspectRatio: `${NX} / ${NY}` }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="img"
            aria-label={copy.canvasLabel}
            className="block h-full w-full cursor-grab touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-learn))] active:cursor-grabbing"
          />
          <div
            ref={probeRef}
            className="pointer-events-none absolute z-10 hidden rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-[0.72rem] leading-relaxed text-white/90 backdrop-blur [&_hr]:my-1 [&_hr]:border-white/15"
            style={{ display: 'none' }}
          />
          {!ready && (
            <div className="absolute inset-0 grid place-items-center text-sm text-white/60">{copy.loading}</div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={togglePause}
            className="rounded-full bg-ink px-4 py-1.5 text-[0.85rem] font-medium text-paper transition-opacity hover:opacity-85"
          >
            {paused ? copy.play : copy.pause}
          </button>
          <button
            type="button"
            onClick={() => sim()?.reset()}
            className="rounded-full border border-line px-4 py-1.5 text-[0.85rem] text-ink transition-colors hover:border-ink"
          >
            {copy.reset}
          </button>
          <p className="text-[0.75rem] leading-snug text-muted">{copy.dragHint}</p>
        </div>
      </div>

      <aside className="rounded-2xl border border-line bg-paper px-5 py-1">
        <Section title={copy.flow}>
          <label className="block text-[0.8rem] text-muted">
            {copy.preset}
            <select
              value={preset}
              onChange={(e) => onPreset(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-[0.85rem] text-ink"
            >
              {Object.keys(PRESETS).map((k) => (
                <option key={k} value={k}>
                  {copy.presets[k as keyof typeof copy.presets]}
                </option>
              ))}
            </select>
          </label>
          <Slider
            label={copy.wind}
            value={sliderFromWind(wind)}
            min={0}
            max={1}
            step={0.001}
            onChange={onWind}
            display={`${wind.toFixed(0)} m/s · ${(wind * 3.6).toFixed(0)} km/h`}
          />
          <p className="-mt-2 font-mono text-[0.72rem] text-muted">Mach {mach.toFixed(2)}</p>
          <div>
            <span className="text-[0.8rem] text-muted">{copy.fluidLabel}</span>
            <div className="mt-1.5">
              <Segmented
                label={copy.fluidLabel}
                options={[copy.air, copy.water]}
                value={fluid}
                onChange={(i) => onFluid(i as 0 | 1)}
              />
            </div>
          </div>
          {fluid === 0 && (
            <Slider
              label={copy.temp}
              value={tempC}
              min={-40}
              max={50}
              step={1}
              onChange={(v) => {
                setTempC(v);
                cfg.tempC = v;
              }}
              display={`${tempC.toFixed(0)} °C`}
            />
          )}
          <p className="font-mono text-[0.7rem] text-muted">
            ρ {fp.rho.toPrecision(3)} kg/m³ · ν {fp.nu.toExponential(2)} m²/s · {widthM} m
          </p>
        </Section>

        <Section title={copy.obstacle}>
          <div role="radiogroup" aria-label={copy.obstacle} className="flex flex-wrap gap-1.5">
            {SHAPE_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={shape === k}
                onClick={() => setShape(k)}
                className={`rounded-full border px-3 py-1 text-[0.8rem] transition-colors ${
                  shape === k
                    ? 'border-transparent bg-ink text-paper'
                    : 'border-line text-muted hover:border-ink hover:text-ink'
                }`}
              >
                {copy.shapes[k]}
              </button>
            ))}
          </div>
          <Slider
            label={copy.incidence}
            title={copy.incidenceTip}
            value={incidence}
            min={-40}
            max={40}
            step={0.5}
            onChange={onIncidence}
            display={`${incidence >= 0 ? '+' : ''}${incidence.toFixed(1)}°`}
          />
          <Slider
            label={copy.height}
            value={heightM}
            min={0}
            max={(NY * cfg.widthM) / NX}
            step={0.01}
            onChange={onHeight}
            display={heightM.toFixed(2)}
          />
          <Slider label={copy.size} value={scale} min={0.5} max={1.4} step={0.05} onChange={onScale} display={`× ${scale.toFixed(2)}`} />
          {shape === 'wing' && (
            <Slider
              label={copy.thickness}
              value={thickness}
              min={6}
              max={24}
              step={1}
              onChange={onThickness}
              display={`${thickness.toFixed(0)}`}
            />
          )}
        </Section>

        <Section title={copy.display}>
          <Segmented label={copy.display} options={copy.modes} value={view.mode} onChange={(i) => setView({ mode: i })} />
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <Toggle label={copy.vectors} checked={view.showVectors} onChange={(v) => setView({ showVectors: v })} />
            <Toggle label={copy.stream} checked={view.showStream} onChange={(v) => setView({ showStream: v })} />
            <Toggle label={copy.markers} checked={view.showMarkers} onChange={(v) => setView({ showMarkers: v })} />
            <Toggle label={copy.ruler} checked={view.showRuler} onChange={(v) => setView({ showRuler: v })} />
            <Toggle
              label={copy.probe}
              checked={probe}
              onChange={(v) => {
                setProbe(v);
                probeOn.current = v;
              }}
            />
          </div>
          {view.mode !== 0 && (
            <Slider
              label={copy.smoke}
              value={view.smokeAmt}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setView({ smokeAmt: v })}
              display={`${Math.round(view.smokeAmt * 100)} %`}
            />
          )}
          <label className="block text-[0.8rem] text-muted">
            {copy.palette}
            <select
              value={view.palette}
              onChange={(e) => setView({ palette: parseInt(e.target.value, 10) })}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-[0.85rem] text-ink"
            >
              {PALETTES.map((p, i) => (
                <option key={p.name} value={i}>
                  {copy.paletteNames[i]}
                </option>
              ))}
            </select>
          </label>
        </Section>

        <Section title={copy.measures}>
          <dl className="grid grid-cols-2 gap-3 text-[0.8rem]">
            <div>
              <dt className="text-muted">Cl</dt>
              <dd className="font-mono text-lg text-ink">{stats.cl >= 0 ? '+' : ''}{stats.cl.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-muted">Cd</dt>
              <dd className="font-mono text-lg text-ink">{stats.cd.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-muted">{copy.lift}</dt>
              <dd className="font-mono text-ink">{liftN.toFixed(1)} N</dd>
            </div>
            <div>
              <dt className="text-muted">{copy.drag}</dt>
              <dd className="font-mono text-ink">{dragN.toFixed(1)} N</dd>
            </div>
          </dl>
          <p className="text-[0.7rem] text-muted">{copy.perMeter}</p>
        </Section>
      </aside>
    </div>
  );
}
