'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_DATASET, TRAINING_DATASETS, type TrainingDatasetId } from '@/lib/training/datasets';

/* =========================================================
   Types
========================================================= */

type JobStatus = 'queued' | 'starting' | 'running' | 'complete' | 'failed' | 'cancelled';

interface TrainingJob {
  id: string;
  status: JobStatus;
  dataset: string;
  epochs: number;
  batch_size: number;
  gradient_accumulation: number;
  learning_rate: number;
  checkpoint_interval: number;
  resume: boolean;
  resume_checkpoint: string | null;
  lora_repo: string;
  lora_path: string;
  kaggle_run_url: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface HfCheckpoint {
  name: string;
  step: number;
}

interface LogLine {
  id: number;
  type: 'SYSTEM' | 'NOVA';
  text: string;
}

const ACTIVE: JobStatus[] = ['queued', 'starting', 'running'];
const POLL_MS = 15000;
const CANCEL_WARNING =
  'Training annulé côté Nova Studio. Le run Kaggle peut continuer en arrière-plan.';

const STATE_LABEL: Record<JobStatus | 'idle', string> = {
  idle: 'DORMANT',
  queued: 'PRÉPARATION',
  starting: 'ÉVEIL',
  running: 'APPRENTISSAGE',
  complete: 'EN LIGNE',
  failed: 'ERREUR',
  cancelled: 'ANNULÉ',
};

const COMMAND_LINE: Record<JobStatus | 'idle', string> = {
  idle: 'Noyau neuronal en veille.',
  queued: 'Configuration enregistrée, envoi vers le nœud distant.',
  starting: 'Le nœud Kaggle démarre et installe son environnement.',
  running: 'Le noyau apprend sur le nœud distant.',
  complete: 'Entraînement terminé, LoRA publié sur Hugging Face.',
  failed: "L'entraînement a échoué. Consultez la console.",
  cancelled: 'Entraînement annulé côté Nova Studio.',
};

/* =========================================================
   Utilitaires
========================================================= */

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function jobDurationSeconds(job: TrainingJob, nowMs: number): number | null {
  if (!job.started_at) return null;
  const start = new Date(job.started_at).getTime();
  const end = job.finished_at ? new Date(job.finished_at).getTime() : nowMs;
  return (end - start) / 1000;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return { error: `Réponse inattendue du serveur (HTTP ${res.status}).` };
  }
}

/* =========================================================
   Réseau neuronal animé (canvas)
   Port fidèle du prototype. Il pousse uniquement pendant
   qu'un entraînement est actif (starting / running).
========================================================= */

interface Pt {
  x: number;
  y: number;
}
interface Branch {
  index: number;
  growth: number;
  speed: number;
  length: number;
  side: number;
  bend: number;
}
interface Neuron {
  cx: number;
  cy: number;
  angle: number;
  tangentAngle: number;
  points: Pt[];
  length: number;
  maxLength: number;
  growth: number;
  speed: number;
  thickness: number;
  phase: number;
  curvature: number;
  branches: Branch[];
  branchTimer: number;
}
interface Link {
  a: Neuron;
  b: Neuron;
  growth: number;
}
interface Pulse {
  a: Pt;
  b: Pt;
  progress: number;
}

const CORE_RADIUS = 78;

function coreSurface(angle: number): number {
  return (
    CORE_RADIUS +
    Math.sin(angle * 3.0) * 7 +
    Math.sin(angle * 5.0 + 1.7) * 4 +
    Math.sin(angle * 2.0 - 0.8) * 5
  );
}

function NeuralCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const c2d: CanvasRenderingContext2D = ctx;

    let width = 0;
    let height = 0;
    let raf = 0;
    let lastSpawn = 0;
    let lastConnectionUpdate = 0;

    const neurons: Neuron[] = [];
    let links: Link[] = [];
    const pulses: Pulse[] = [];

    function resize() {
      const el = canvasRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      el.width = width * ratio;
      el.height = height * ratio;
      c2d.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    function createNeuron(): Neuron {
      const cx = width / 2;
      const cy = height * 0.46;
      const angle = Math.random() * Math.PI * 2;

      return {
        cx,
        cy,
        angle,
        tangentAngle: angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
        points: [],
        length: 0,
        maxLength: 45 + Math.random() * 210,
        growth: 0,
        speed: 0.0035 + Math.random() * 0.0045,
        thickness: 0.55 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        curvature: (Math.random() - 0.5) * 0.045,
        branches: [],
        branchTimer: 70 + Math.random() * 100,
      };
    }

    function growNeuron(n: Neuron) {
      n.growth += n.speed;
      if (n.growth > 1) n.growth = 1;

      n.length = n.maxLength * (1 - Math.pow(1 - n.growth, 2.1));
      n.points = [];

      const segments = Math.max(4, Math.floor(n.length / 4));

      for (let i = 0; i <= segments; i++) {
        const d = i / segments;
        const distance = n.length * d;

        const radialProgress = Math.max(0, (distance - 38) / (n.maxLength * 0.55));
        const radial = Math.min(1, radialProgress);

        const radius = coreSurface(n.angle + n.curvature * distance) + radial * (12 + n.maxLength * 0.16);

        const localAngle =
          n.angle + (n.tangentAngle - n.angle) * Math.min(1, distance / 85) + n.curvature * distance;

        const x =
          n.cx +
          Math.cos(localAngle) * (radius + radial * distance * 0.16) +
          Math.sin(localAngle * 2 + n.phase) * (distance * 0.025);

        const y =
          n.cy +
          Math.sin(localAngle) * (radius + radial * distance * 0.16) +
          Math.cos(localAngle * 2 + n.phase) * (distance * 0.025);

        n.points.push({ x, y });
      }

      if (n.growth > 0.28 && n.branchTimer > 0) {
        n.branchTimer--;
      } else if (n.growth > 0.28 && n.branches.length < 3) {
        n.branches.push({
          index: Math.max(2, Math.floor(n.points.length * (0.45 + Math.random() * 0.35))),
          growth: 0,
          speed: 0.005 + Math.random() * 0.009,
          length: 18 + Math.random() * 48,
          side: Math.random() < 0.5 ? -1 : 1,
          bend: (Math.random() - 0.5) * 0.7,
        });
        n.branchTimer = 80 + Math.random() * 130;
      }

      for (const b of n.branches) {
        b.growth += b.speed;
        if (b.growth > 1) b.growth = 1;
      }
    }

    function drawNeuron(n: Neuron) {
      if (n.points.length < 2) return;

      const trace = () => {
        c2d.beginPath();
        n.points.forEach((p, i) => {
          if (i === 0) c2d.moveTo(p.x, p.y);
          else c2d.lineTo(p.x, p.y);
        });
      };

      trace();
      c2d.strokeStyle = 'rgba(100,183,190,.26)';
      c2d.lineWidth = n.thickness * 1.5;
      c2d.lineCap = 'round';
      c2d.lineJoin = 'round';
      c2d.stroke();

      trace();
      c2d.strokeStyle = 'rgba(179,225,228,.18)';
      c2d.lineWidth = n.thickness * 0.45;
      c2d.stroke();

      const root = n.points[0];
      c2d.beginPath();
      c2d.arc(root.x, root.y, 3.2, 0, Math.PI * 2);
      c2d.fillStyle = 'rgba(166,219,222,.13)';
      c2d.fill();

      for (const b of n.branches) {
        if (b.growth <= 0 || b.index >= n.points.length) continue;

        const start = n.points[b.index];
        const growth = 1 - Math.pow(1 - b.growth, 2);
        const prev = n.points[Math.max(0, b.index - 2)];
        const next = n.points[Math.min(n.points.length - 1, b.index + 2)];

        const baseAngle = Math.atan2(next.y - prev.y, next.x - prev.x);
        const angle = baseAngle + b.side * (0.75 + b.bend);
        const length = b.length * growth;

        const endX = start.x + Math.cos(angle) * length;
        const endY = start.y + Math.sin(angle) * length;
        const bendX = (start.x + endX) / 2 - Math.sin(angle) * length * 0.25;
        const bendY = (start.y + endY) / 2 + Math.cos(angle) * length * 0.25;

        c2d.beginPath();
        c2d.moveTo(start.x, start.y);
        c2d.quadraticCurveTo(bendX, bendY, endX, endY);
        c2d.strokeStyle = 'rgba(101,181,188,.23)';
        c2d.lineWidth = n.thickness * 0.65;
        c2d.lineCap = 'round';
        c2d.stroke();
      }
    }

    function updateLinks() {
      links = [];
      const candidates = neurons.filter((n) => n.growth > 0.62 && n.points.length > 4);

      for (let i = 0; i < candidates.length; i++) {
        const a = candidates[i];
        const aEnd = a.points[a.points.length - 1];

        for (let j = i + 1; j < candidates.length; j++) {
          const b = candidates[j];
          const bEnd = b.points[b.points.length - 1];
          const dx = aEnd.x - bEnd.x;
          const dy = aEnd.y - bEnd.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 48 && dist > 8) links.push({ a, b, growth: 0 });
        }
      }
    }

    function drawLinks() {
      for (const l of links) {
        l.growth += 0.006;
        if (l.growth > 1) l.growth = 1;

        const a = l.a.points[l.a.points.length - 1];
        const b = l.b.points[l.b.points.length - 1];
        const x = a.x + (b.x - a.x) * l.growth;
        const y = a.y + (b.y - a.y) * l.growth;

        c2d.beginPath();
        c2d.moveTo(a.x, a.y);
        c2d.lineTo(x, y);
        c2d.strokeStyle = 'rgba(123,198,204,.15)';
        c2d.lineWidth = 0.45;
        c2d.stroke();

        if (l.growth > 0.99 && Math.random() < 0.009) {
          pulses.push({ a, b, progress: 0 });
        }
      }
    }

    function updatePulses() {
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.progress += 0.011;

        if (p.progress >= 1) {
          pulses.splice(i, 1);
          continue;
        }

        const x = p.a.x + (p.b.x - p.a.x) * p.progress;
        const y = p.a.y + (p.b.y - p.a.y) * p.progress;

        c2d.beginPath();
        c2d.arc(x, y, 0.8, 0, Math.PI * 2);
        c2d.fillStyle = 'rgba(208,241,243,.45)';
        c2d.fill();
      }
    }

    function animate(time: number) {
      c2d.clearRect(0, 0, width, height);

      for (const n of neurons) {
        growNeuron(n);
        drawNeuron(n);
      }

      if (time - lastConnectionUpdate > 700) {
        updateLinks();
        lastConnectionUpdate = time;
      }

      drawLinks();
      updatePulses();

      if (activeRef.current && neurons.length < 125 && time - lastSpawn > 210) {
        neurons.push(createNeuron());
        lastSpawn = time;
      }

      raf = requestAnimationFrame(animate);
    }

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="nt-network" />;
}

/* =========================================================
   Console principale
========================================================= */

export default function TrainingConsole() {
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [checkpoints, setCheckpoints] = useState<HfCheckpoint[]>([]);
  const [checkpointsError, setCheckpointsError] = useState<string | null>(null);

  const [dataset, setDataset] = useState<TrainingDatasetId>(DEFAULT_DATASET);
  const [epochs, setEpochs] = useState('1');
  const [batchSize, setBatchSize] = useState('1');
  const [gradAcc, setGradAcc] = useState('8');
  const [learningRate, setLearningRate] = useState('0.0001');
  const [checkpointInterval, setCheckpointInterval] = useState('250');
  const [resume, setResume] = useState(false);
  const [resumeCheckpoint, setResumeCheckpoint] = useState('');

  const [busy, setBusy] = useState<null | 'launching' | 'cancelling'>(null);
  const [now, setNow] = useState(() => Date.now());
  const [logs, setLogs] = useState<LogLine[]>([]);
  const logId = useRef(0);
  const consoleRef = useRef<HTMLDivElement | null>(null);
  const lastStatusRef = useRef<Record<string, JobStatus>>({});

  const addLog = useCallback((type: 'SYSTEM' | 'NOVA', text: string) => {
    logId.current += 1;
    const id = logId.current;
    setLogs((prev) => [...prev.slice(-80), { id, type, text }]);
  }, []);

  const activeJob = useMemo(
    () => jobs.find((j) => j.id === activeJobId) ?? null,
    [jobs, activeJobId]
  );
  const lastJob = jobs[0] ?? null;
  const displayJob = activeJob ?? lastJob;
  const displayState: JobStatus | 'idle' = busy === 'launching' ? 'starting' : displayJob ? displayJob.status : 'idle';
  const isActive = Boolean(activeJob);
  const launching = busy === 'launching';
  const locked = isActive || busy !== null;

  /* ---------- Chargement liste + checkpoints ---------- */

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/training/list', { cache: 'no-store' });
      const data = await readJson(res);

      if (!res.ok) {
        addLog('SYSTEM', `Historique indisponible : ${String(data.error ?? res.status)}`);
        return;
      }

      const list = (data.jobs as TrainingJob[]) ?? [];
      setJobs(list);
      setActiveJobId((data.activeJobId as string | null) ?? null);
      setLoaded(true);
    } catch {
      addLog('SYSTEM', 'Historique indisponible (réseau).');
    }
  }, [addLog]);

  useEffect(() => {
    addLog('SYSTEM', 'Canal sécurisé établi.');
    addLog('NOVA', 'Noyau neuronal en veille.');
    void refreshList();

    (async () => {
      try {
        const res = await fetch('/api/admin/training/checkpoints', { cache: 'no-store' });
        const data = await readJson(res);

        if (!res.ok) {
          setCheckpointsError(String(data.error ?? `HTTP ${res.status}`));
          return;
        }

        const list = (data.checkpoints as HfCheckpoint[]) ?? [];
        setCheckpoints(list);
        if (list.length > 0) setResumeCheckpoint(list[0].name);
      } catch {
        setCheckpointsError('Réseau indisponible.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Journal des changements de statut ---------- */

  useEffect(() => {
    for (const job of jobs) {
      const previous = lastStatusRef.current[job.id];

      if (previous === undefined) {
        lastStatusRef.current[job.id] = job.status;
        continue;
      }

      if (previous !== job.status) {
        lastStatusRef.current[job.id] = job.status;
        const short = job.id.slice(0, 8);

        if (job.status === 'running') addLog('NOVA', `Job ${short} : l'apprentissage a commencé.`);
        if (job.status === 'complete') addLog('NOVA', `Job ${short} : entraînement terminé. LoRA publié (${job.lora_path}/).`);
        if (job.status === 'failed') addLog('SYSTEM', `Job ${short} : échec. ${job.error_message ?? ''}`.trim());
        if (job.status === 'cancelled') addLog('SYSTEM', `Job ${short} : annulé.`);
      }
    }
  }, [jobs, addLog]);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  /* ---------- Chronomètre + polling du statut Kaggle ---------- */

  useEffect(() => {
    if (!activeJobId) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeJobId]);

  useEffect(() => {
    if (!activeJobId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/training/status/${activeJobId}`, { cache: 'no-store' });
        const data = await readJson(res);

        if (cancelled) return;

        if (data.warning) addLog('SYSTEM', String(data.warning));

        if (res.ok && data.job) {
          const updated = data.job as TrainingJob;
          setJobs((prev) => prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)));

          if (!ACTIVE.includes(updated.status)) {
            setActiveJobId(null);
            void refreshList();
          }
        }
      } catch {
        /* le prochain tour réessaie */
      }
    };

    const first = setTimeout(poll, 4000);
    const t = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(t);
    };
  }, [activeJobId, addLog, refreshList]);

  /* ---------- Actions ---------- */

  const formError = useMemo(() => {
    const e = Number(epochs);
    const b = Number(batchSize);
    const g = Number(gradAcc);
    const lr = Number(learningRate);
    const c = Number(checkpointInterval);

    if (!Number.isInteger(e) || e < 1 || e > 10) return 'Epochs : entier entre 1 et 10.';
    if (!Number.isInteger(b) || b < 1 || b > 4) return 'Batch size : entier entre 1 et 4.';
    if (!Number.isInteger(g) || g < 1 || g > 64) return 'Gradient accumulation : entier entre 1 et 64.';
    if (!Number.isFinite(lr) || lr < 1e-6 || lr > 5e-4) return 'Learning rate : entre 0.000001 et 0.0005.';
    if (!Number.isInteger(c) || c < 50 || c > 1000) return 'Checkpoint interval : entier entre 50 et 1000.';
    if (resume && !resumeCheckpoint) return 'Choisissez un checkpoint de reprise.';
    return null;
  }, [epochs, batchSize, gradAcc, learningRate, checkpointInterval, resume, resumeCheckpoint]);

  const start = async () => {
    if (busy || isActive || formError) return;

    setBusy('launching');
    addLog('NOVA', 'Éveil du substrat neuronal...');

    try {
      const createRes = await fetch('/api/admin/training/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset,
          epochs: Number(epochs),
          batch_size: Number(batchSize),
          gradient_accumulation: Number(gradAcc),
          learning_rate: Number(learningRate),
          checkpoint_interval: Number(checkpointInterval),
          resume,
          resume_checkpoint: resume ? resumeCheckpoint : null,
        }),
      });
      const created = await readJson(createRes);

      if (!createRes.ok) {
        addLog('SYSTEM', `Création refusée : ${String(created.error ?? createRes.status)}`);
        setBusy(null);
        void refreshList();
        return;
      }

      const jobId = (created.job as { id: string }).id;
      addLog('SYSTEM', `Job ${jobId.slice(0, 8)} créé. Envoi vers Kaggle (peut prendre une minute)...`);

      const launchRes = await fetch('/api/admin/training/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const launched = await readJson(launchRes);

      if (!launchRes.ok) {
        addLog('SYSTEM', `Échec du lancement Kaggle : ${String(launched.error ?? launchRes.status)}`);
        // Le job est resté "queued" et bloquerait tout nouvel essai : on le libère.
        await fetch(`/api/admin/training/cancel/${jobId}`, { method: 'POST' });
        setBusy(null);
        void refreshList();
        return;
      }

      addLog('NOVA', 'Nœud distant en cours de démarrage.');
      if (launchRes.status === 207) {
        addLog('SYSTEM', 'Lancement accepté avec des avertissements (base de données). Vérifiez l’historique.');
      }

      setBusy(null);
      await refreshList();
    } catch (e) {
      addLog('SYSTEM', `Erreur réseau : ${e instanceof Error ? e.message : String(e)}`);
      setBusy(null);
      void refreshList();
    }
  };

  const cancel = async () => {
    if (!activeJob || busy) return;

    const ok = window.confirm(
      "Annuler ce training ?\n\nL'annulation est logique : elle libère Nova Studio, mais le run Kaggle peut continuer en arrière-plan."
    );
    if (!ok) return;

    setBusy('cancelling');

    try {
      const res = await fetch(`/api/admin/training/cancel/${activeJob.id}`, { method: 'POST' });
      const data = await readJson(res);

      if (!res.ok) {
        addLog('SYSTEM', `Annulation impossible : ${String(data.error ?? res.status)}`);
      } else {
        addLog('SYSTEM', CANCEL_WARNING);
      }
    } catch {
      addLog('SYSTEM', 'Annulation impossible (réseau).');
    }

    setBusy(null);
    await refreshList();
  };

  /* ---------- Valeurs affichées ---------- */

  const elapsed = displayJob ? jobDurationSeconds(displayJob, now) : null;
  const progressMode: 'idle' | 'indeterminate' | 'full' =
    isActive || launching ? 'indeterminate' : displayJob?.status === 'complete' ? 'full' : 'idle';

  const phaseLabel =
    displayState === 'idle'
      ? 'NOYAU EN VEILLE'
      : displayState === 'starting'
      ? 'DÉMARRAGE DU NŒUD'
      : displayState === 'running'
      ? 'ENTRAÎNEMENT EN COURS'
      : displayState === 'complete'
      ? 'ENTRAÎNEMENT TERMINÉ'
      : displayState === 'failed'
      ? 'ENTRAÎNEMENT ÉCHOUÉ'
      : displayState === 'cancelled'
      ? 'ENTRAÎNEMENT ANNULÉ'
      : 'PRÉPARATION';

  const targetOn = (n: number) => {
    if (displayState === 'starting' || displayState === 'queued') return n <= 1;
    if (displayState === 'running') return n <= 3;
    if (displayState === 'complete') return true;
    return false;
  };

  return (
    <div className="nt-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="nt-app">
        <header className="nt-header">
          <div className="nt-brand">
            <div className="nt-logo">N</div>
            <div>
              <div className="nt-brand-name">NOVAIA</div>
              <div className="nt-brand-sub">REMOTE TRAINING</div>
            </div>
          </div>

          <div className="nt-connection">
            <i className={isActive || launching ? 'on' : ''} />
            {isActive || launching ? 'REMOTE NODE ACTIVE' : 'REMOTE NODE IDLE'}
          </div>
        </header>

        <section className="nt-stage">
          <NeuralCanvas active={displayState === 'starting' || displayState === 'running'} />

          <div className="nt-core">
            <div className="nt-core-aura" />
            <div className="nt-core-body" />
          </div>

          <div className="nt-core-info">
            <strong>NOVA</strong>
            <span>{STATE_LABEL[displayState]}</span>
          </div>

          <div className={`nt-target one ${targetOn(1) ? 'active' : ''}`}>TRAINING PARAMETERS</div>
          <div className={`nt-target two ${targetOn(2) ? 'active' : ''}`}>REMOTE CORE</div>
          <div className={`nt-target three ${targetOn(3) ? 'active' : ''}`}>NEURAL ACTIVITY</div>
          <div className={`nt-target four ${targetOn(4) ? 'active' : ''}`}>NOVA CONSOLE</div>

          <div className="nt-command">
            <b>NOVA:</b> <span>{COMMAND_LINE[displayState]}</span>
          </div>
        </section>

        <section className="nt-panels">
          {/* ---------- PARAMÈTRES ---------- */}
          <div className="nt-panel">
            <div className="nt-panel-title">TRAINING PARAMETERS</div>

            <label>MODEL</label>
            <select disabled value="qwen">
              <option value="qwen">Qwen2.5-3B-Instruct · QLoRA 4-bit</option>
            </select>

            <label>DATASET</label>
            <select value={dataset} onChange={(e) => setDataset(e.target.value as TrainingDatasetId)} disabled={locked}>
              {TRAINING_DATASETS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>

            <div className="nt-row">
              <div>
                <label>EPOCHS</label>
                <input value={epochs} onChange={(e) => setEpochs(e.target.value)} inputMode="numeric" disabled={locked} />
              </div>
              <div>
                <label>BATCH SIZE</label>
                <input value={batchSize} onChange={(e) => setBatchSize(e.target.value)} inputMode="numeric" disabled={locked} />
              </div>
            </div>

            <div className="nt-row">
              <div>
                <label>GRADIENT ACCUMULATION</label>
                <input value={gradAcc} onChange={(e) => setGradAcc(e.target.value)} inputMode="numeric" disabled={locked} />
              </div>
              <div>
                <label>LEARNING RATE</label>
                <input value={learningRate} onChange={(e) => setLearningRate(e.target.value)} inputMode="decimal" disabled={locked} />
              </div>
            </div>

            <label>CHECKPOINT TOUS LES (STEPS)</label>
            <input
              value={checkpointInterval}
              onChange={(e) => setCheckpointInterval(e.target.value)}
              inputMode="numeric"
              disabled={locked}
            />

            <div className="nt-toggle-row">
              <label className="nt-toggle-label">REPRISE DEPUIS UN CHECKPOINT</label>
              <button
                type="button"
                className={`nt-switch ${resume ? 'on' : ''}`}
                onClick={() => setResume((v) => !v)}
                disabled={locked}
                aria-pressed={resume}
              >
                {resume ? 'ON' : 'OFF'}
              </button>
            </div>

            {resume && (
              <>
                <label>CHECKPOINT HUGGING FACE</label>
                <select
                  value={resumeCheckpoint}
                  onChange={(e) => setResumeCheckpoint(e.target.value)}
                  disabled={locked || checkpoints.length === 0}
                >
                  {checkpoints.length === 0 && <option value="">Aucun checkpoint disponible</option>}
                  {checkpoints.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {checkpointsError && <div className="nt-hint nt-warn">Liste indisponible : {checkpointsError}</div>}
              </>
            )}

            <div className="nt-row">
              <div>
                <label>LORA REPO</label>
                <input value="novastudio123/novaia-checkpoints" disabled readOnly />
              </div>
              <div>
                <label>LORA PATH</label>
                <input value="nova-lora" disabled readOnly />
              </div>
            </div>

            {formError && !isActive && <div className="nt-hint nt-warn">{formError}</div>}

            {!isActive ? (
              <button type="button" className="nt-primary" onClick={start} disabled={Boolean(formError) || busy !== null || !loaded}>
                {busy === 'launching' ? 'ENVOI VERS KAGGLE…' : 'BEGIN NOVA TRAINING'}
              </button>
            ) : (
              <button type="button" className="nt-danger" onClick={cancel} disabled={busy !== null || !activeJob}>
                {busy === 'cancelling' ? 'ANNULATION…' : 'CANCEL TRAINING'}
              </button>
            )}

            {isActive && (
              <div className="nt-hint">
                L’annulation est logique : elle libère Nova Studio, mais le run Kaggle peut continuer en arrière-plan.
              </div>
            )}
          </div>

          {/* ---------- NŒUD DISTANT ---------- */}
          <div className="nt-panel">
            <div className="nt-panel-title">REMOTE CORE</div>

            <div className="nt-status"><span>PROVIDER</span><strong>KAGGLE</strong></div>
            <div className="nt-status"><span>GPU</span><strong>NVIDIA TESLA T4</strong></div>
            <div className="nt-status"><span>MODEL</span><strong>QWEN2.5-3B-INSTRUCT</strong></div>
            <div className="nt-status"><span>METHOD</span><strong>QLORA 4-BIT</strong></div>
            <div className="nt-status"><span>ENGINE</span><strong>TRL · PEFT</strong></div>
            <div className="nt-status"><span>DESTINATION</span><strong>HUGGING FACE</strong></div>
            <div className="nt-status">
              <span>RUN KAGGLE</span>
              <strong>
                {displayJob?.kaggle_run_url ? (
                  <a href={displayJob.kaggle_run_url} target="_blank" rel="noreferrer">
                    OUVRIR ↗
                  </a>
                ) : (
                  '—'
                )}
              </strong>
            </div>
          </div>

          {/* ---------- ACTIVITÉ ---------- */}
          <div className="nt-panel nt-full">
            <div className="nt-panel-title">NEURAL ACTIVITY</div>

            <div className="nt-progress-head">
              <span>{phaseLabel}</span>
              <span>{elapsed !== null ? formatDuration(elapsed) : '—'}</span>
            </div>

            <div className="nt-progress">
              <div className={`nt-bar ${progressMode}`} />
            </div>

            <div className="nt-metrics">
              <div className="nt-metric">
                <span>STATUT</span>
                <strong>{displayJob ? displayJob.status.toUpperCase() : '—'}</strong>
              </div>
              <div className="nt-metric">
                <span>EPOCHS</span>
                <strong>{displayJob ? displayJob.epochs : '—'}</strong>
              </div>
              <div className="nt-metric">
                <span>CHECKPOINT / STEPS</span>
                <strong>{displayJob ? displayJob.checkpoint_interval : '—'}</strong>
              </div>
              <div className="nt-metric">
                <span>REPRISE</span>
                <strong>{displayJob ? (displayJob.resume ? displayJob.resume_checkpoint ?? 'ON' : 'NON') : '—'}</strong>
              </div>
            </div>

            <div className="nt-hint">
              Step et loss ne sont pas remontés en V1 (l’API Kaggle ne les expose pas) : consultez les logs du run Kaggle.
            </div>
          </div>

          {/* ---------- HISTORIQUE ---------- */}
          <div className="nt-panel nt-full">
            <div className="nt-panel-title">TRAINING HISTORY</div>

            {jobs.length === 0 ? (
              <div className="nt-empty">{loaded ? 'Aucun training pour le moment.' : 'Chargement…'}</div>
            ) : (
              <div className="nt-table-wrap">
                <table className="nt-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>STATUT</th>
                      <th>DATASET</th>
                      <th>EPOCHS</th>
                      <th>REPRISE</th>
                      <th>DURÉE</th>
                      <th>RUN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => {
                      const d = jobDurationSeconds(j, now);
                      return (
                        <tr key={j.id} title={j.error_message ?? undefined}>
                          <td>{formatDate(j.created_at)}</td>
                          <td>
                            <span className={`nt-pill ${j.status}`}>{j.status.toUpperCase()}</span>
                          </td>
                          <td>{j.dataset.replace('.jsonl', '')}</td>
                          <td>{j.epochs}</td>
                          <td>{j.resume ? j.resume_checkpoint ?? 'ON' : '—'}</td>
                          <td>{d !== null ? formatDuration(d) : '—'}</td>
                          <td>
                            {j.kaggle_run_url ? (
                              <a href={j.kaggle_run_url} target="_blank" rel="noreferrer">
                                Kaggle ↗
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ---------- CONSOLE ---------- */}
          <div className="nt-panel nt-full">
            <div className="nt-panel-title">NOVA CONSOLE</div>

            <div className="nt-console" ref={consoleRef}>
              {logs.map((l) => (
                <div key={l.id}>
                  <span className={l.type === 'NOVA' ? 'nova' : 'system'}>[{l.type}]</span> {l.text}
                </div>
              ))}
              {displayJob?.status === 'failed' && displayJob.error_message && (
                <div>
                  <span className="system">[ERREUR]</span> {displayJob.error_message}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   Styles (scopés sous .nt-root, esthétique du prototype)
========================================================= */

const CSS = `
.nt-root{
  margin:-2.5rem;
  min-height:100vh;
  background:#020506;
  color:#dce8e9;
  font-family:Inter,"Segoe UI",Arial,sans-serif;
  overflow-x:hidden;
}
.nt-root *{box-sizing:border-box;}
.nt-app{min-height:100vh;padding:24px 34px 36px;}

.nt-header{height:42px;display:flex;align-items:center;justify-content:space-between;}
.nt-brand{display:flex;align-items:center;gap:11px;}
.nt-logo{width:27px;height:27px;border:1px solid rgba(190,225,228,.16);border-radius:50%;display:grid;place-items:center;font-size:10px;letter-spacing:2px;color:#b9d8da;}
.nt-brand-name{font-size:12px;letter-spacing:5px;}
.nt-brand-sub{margin-top:3px;color:#4a575b;font-size:8px;letter-spacing:2px;}
.nt-connection{color:#5d6b6f;font-size:8px;letter-spacing:1.7px;}
.nt-connection i{display:inline-block;width:4px;height:4px;margin-right:7px;border-radius:50%;background:#3a4549;}
.nt-connection i.on{background:#86d3da;box-shadow:0 0 9px rgba(134,211,218,.6);}

.nt-stage{position:relative;height:590px;margin-top:3px;}
.nt-network{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}

.nt-core{position:absolute;left:50%;top:46%;width:185px;height:185px;transform:translate(-50%,-50%);z-index:3;pointer-events:none;}
.nt-core-aura{position:absolute;inset:-30px;border-radius:50%;background:radial-gradient(circle,rgba(112,199,206,.17),rgba(67,132,139,.045) 43%,transparent 73%);filter:blur(15px);animation:nt-aura 4.5s ease-in-out infinite;}
.nt-core-body{position:absolute;inset:0;border-radius:48% 52% 54% 46% / 55% 45% 55% 45%;background:radial-gradient(ellipse at 32% 27%,rgba(235,249,250,.67),rgba(143,211,216,.30) 19%,rgba(72,137,144,.15) 43%,rgba(20,45,49,.05) 65%,transparent 76%);filter:blur(1.7px);animation:nt-morph 3.7s ease-in-out infinite,nt-breathe 2.9s ease-in-out infinite;}
.nt-core-body::before{content:"";position:absolute;inset:18px;border-radius:56% 44% 49% 51% / 42% 58% 42% 58%;background:radial-gradient(ellipse at 45% 35%,rgba(247,253,253,.43),rgba(130,205,211,.19) 28%,rgba(37,85,91,.06) 58%,transparent 74%);filter:blur(5px);animation:nt-inner 2.8s ease-in-out infinite reverse;}
.nt-core-body::after{content:"";position:absolute;inset:35px;border-radius:43% 57% 51% 49% / 55% 45% 55% 45%;background:radial-gradient(circle at 40% 35%,rgba(237,252,253,.35),transparent 62%);filter:blur(7px);animation:nt-liquid 3.2s ease-in-out infinite;}

@keyframes nt-morph{
  0%,100%{border-radius:48% 52% 54% 46% / 55% 45% 55% 45%;transform:rotate(0deg) scale(1);}
  25%{border-radius:58% 42% 46% 54% / 43% 57% 48% 52%;transform:rotate(4deg) scale(1.05,.96);}
  52%{border-radius:41% 59% 57% 43% / 49% 51% 59% 41%;transform:rotate(-5deg) scale(.95,1.07);}
  76%{border-radius:55% 45% 42% 58% / 61% 39% 52% 48%;transform:rotate(3deg) scale(1.06,.94);}
}
@keyframes nt-breathe{0%,100%{opacity:.72;}50%{opacity:1;}}
@keyframes nt-inner{0%,100%{transform:translate(0,0) scale(1);}35%{transform:translate(10px,-7px) scale(.9,1.1);}70%{transform:translate(-9px,8px) scale(1.1,.9);}}
@keyframes nt-liquid{0%,100%{transform:translate(0,0) scale(1);}40%{transform:translate(17px,10px) scale(.75,1.2);}75%{transform:translate(-13px,-9px) scale(1.2,.75);}}
@keyframes nt-aura{0%,100%{transform:scale(.92);opacity:.45;}50%{transform:scale(1.13);opacity:.85;}}

.nt-core-info{position:absolute;top:calc(46% + 110px);left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;z-index:5;}
.nt-core-info strong{display:block;font-size:11px;font-weight:400;letter-spacing:6px;}
.nt-core-info span{display:block;margin-top:6px;color:#56646a;font-size:8px;letter-spacing:2px;}

.nt-target{position:absolute;color:#4a585c;font-size:8px;letter-spacing:1.5px;transition:color .8s ease;z-index:6;}
.nt-target::before{content:"";display:inline-block;width:3px;height:3px;margin-right:7px;border-radius:50%;background:currentColor;}
.nt-target.active{color:#82c9d0;}
.nt-target.one{left:7%;top:19%;}
.nt-target.two{right:7%;top:22%;}
.nt-target.three{left:9%;bottom:16%;}
.nt-target.four{right:9%;bottom:16%;}

.nt-command{position:absolute;left:50%;bottom:13px;transform:translateX(-50%);white-space:nowrap;color:#4f5d62;font:9px Consolas,monospace;}
.nt-command b{color:#80cbd2;font-weight:400;}

.nt-panels{max-width:1080px;margin:auto;display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.nt-panel{padding:18px;background:rgba(4,7,8,.84);border:1px solid rgba(255,255,255,.05);backdrop-filter:blur(12px);}
.nt-full{grid-column:1/-1;}
.nt-panel-title{margin-bottom:14px;color:#5a686c;font-size:8px;letter-spacing:2px;}

.nt-root label{display:block;margin-bottom:5px;color:#56646a;font-size:8px;letter-spacing:1px;}
.nt-root input,.nt-root select{width:100%;height:31px;margin-bottom:10px;padding:0 8px;outline:none;border:1px solid rgba(255,255,255,.05);background:#020405;color:#aebcbe;font-size:10px;font-family:inherit;border-radius:0;}
.nt-root input:focus,.nt-root select:focus{border-color:rgba(137,216,223,.3);}
.nt-root input:disabled,.nt-root select:disabled{opacity:.55;cursor:not-allowed;}
.nt-row{display:grid;grid-template-columns:1fr 1fr;gap:9px;}

.nt-toggle-row{display:flex;align-items:center;justify-content:space-between;margin:2px 0 10px;}
.nt-toggle-label{margin:0 !important;}
.nt-switch{width:54px;height:24px;margin:0;border:1px solid rgba(255,255,255,.08);background:#020405;color:#5a686c;font-size:8px;letter-spacing:2px;cursor:pointer;}
.nt-switch.on{border-color:rgba(137,216,223,.35);color:#8bd3da;background:rgba(137,216,223,.05);}
.nt-switch:disabled{opacity:.55;cursor:not-allowed;}

.nt-primary,.nt-danger{width:100%;height:37px;margin-top:2px;border:1px solid rgba(137,216,223,.25);background:rgba(137,216,223,.025);color:#8bd3da;font-size:9px;letter-spacing:2px;cursor:pointer;}
.nt-primary:hover:not(:disabled){background:rgba(137,216,223,.065);}
.nt-primary:disabled,.nt-danger:disabled{opacity:.5;cursor:not-allowed;}
.nt-danger{border-color:rgba(200,120,120,.3);background:rgba(200,120,120,.03);color:#d49a9a;}
.nt-danger:hover:not(:disabled){background:rgba(200,120,120,.07);}

.nt-hint{margin-top:9px;color:#56646a;font-size:9px;line-height:1.6;}
.nt-warn{color:#c9a46a;}

.nt-status{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.035);color:#56646a;font-size:9px;}
.nt-status strong{color:#a7b6b9;font-weight:400;text-align:right;}
.nt-root a{color:#8bd3da;text-decoration:none;}
.nt-root a:hover{text-decoration:underline;}

.nt-progress-head{display:flex;justify-content:space-between;margin-bottom:7px;color:#5f6d72;font-size:9px;}
.nt-progress{position:relative;height:2px;background:rgba(255,255,255,.05);overflow:hidden;}
.nt-bar{height:100%;background:#88d5dc;box-shadow:0 0 12px rgba(136,213,220,.4);}
.nt-bar.idle{width:0;}
.nt-bar.full{width:100%;}
.nt-bar.indeterminate{width:35%;animation:nt-slide 1.8s ease-in-out infinite;}
@keyframes nt-slide{0%{transform:translateX(-100%);}100%{transform:translateX(300%);}}

.nt-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin-top:15px;background:rgba(255,255,255,.04);}
.nt-metric{padding:10px;background:#020405;}
.nt-metric span{display:block;margin-bottom:5px;color:#4f5d62;font-size:8px;}
.nt-metric strong{color:#abbabd;font-size:12px;font-weight:400;word-break:break-all;}

.nt-empty{color:#56646a;font-size:10px;}
.nt-table-wrap{overflow-x:auto;}
.nt-table{width:100%;border-collapse:collapse;font-size:10px;color:#9aa9ac;}
.nt-table th{padding:6px 8px;text-align:left;color:#56646a;font-size:8px;letter-spacing:1.5px;font-weight:400;border-bottom:1px solid rgba(255,255,255,.05);}
.nt-table td{padding:8px;border-bottom:1px solid rgba(255,255,255,.03);white-space:nowrap;}
.nt-pill{display:inline-block;padding:2px 7px;border:1px solid rgba(255,255,255,.1);font-size:8px;letter-spacing:1.5px;color:#7d8b8f;}
.nt-pill.running,.nt-pill.starting,.nt-pill.queued{color:#8bd3da;border-color:rgba(137,216,223,.3);}
.nt-pill.complete{color:#9fd8b4;border-color:rgba(159,216,180,.3);}
.nt-pill.failed{color:#d49a9a;border-color:rgba(212,154,154,.3);}
.nt-pill.cancelled{color:#a8a08a;border-color:rgba(168,160,138,.3);}

.nt-console{height:150px;overflow:auto;padding:10px;background:#010304;color:#5f6d72;font:9px/1.9 Consolas,monospace;}
.nt-console .nova{color:#83cfd6;}
.nt-console .system{color:#7a888c;}

@media(max-width:800px){
  .nt-root{margin:-1rem;}
  .nt-app{padding:20px 14px 30px;}
  .nt-stage{height:510px;}
  .nt-target{display:none;}
  .nt-panels{grid-template-columns:1fr;}
  .nt-full{grid-column:auto;}
  .nt-command{white-space:normal;text-align:center;width:90%;}
}
@media(max-width:500px){
  .nt-metrics{grid-template-columns:1fr 1fr;}
  .nt-connection{display:none;}
}
`;
