'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NovaiaMark from '@/components/novaia/NovaiaMark';
import { useTabStatus } from '@/components/novaia/useTabStatus';
import type { Locale } from '@/lib/i18n/config';
import type { NovaiaCopy } from '@/lib/novaia/copy';
import FormattedReply from '@/components/novaia/FormattedReply';
import CopyButton from '@/components/novaia/CopyButton';
import { prepareImage, type PreparedImage } from '@/lib/novaia/image';
import type { ReplyState } from '@/lib/novaia/provider';
import NovaiaPrefs from '@/components/novaia/NovaiaPrefs';
import { prefsCopy } from '@/lib/novaia/prefsCopy';
import { applyDims, cleanDims, cleanStyle, type Style } from '@/lib/novaia/style';
import { detectFact } from '@/lib/novaia/facts';
import { fetchRemote, mergeConversations, pushConversation, pushDeletion, purgeOldDeletions, deleteAllRemote } from '@/lib/novaia/sync';
import { putDoc, loadConvDocs, deleteConvDocs, clearAllDocs } from '@/lib/novaia/files';
import { isPdf, openPdf, type OpenedPdf } from '@/lib/novaia/pdf';
import { createClient } from '@/lib/supabase/client';
import { cleanTool, closeFences, toolOf, type ToolName } from '@/lib/novaia/sources';
import ToolChip from '@/components/novaia/ToolChip';
import SourceChip from '@/components/novaia/SourceChip';
import { dictationSupported, ttsSupported, startDictation, speak, stopSpeaking } from '@/lib/novaia/voice';
import { startListener, unlockAudio, playServerTts, stopServerTts, type Listener } from '@/lib/novaia/voiceClient';
import {
  MAX_CONVERSATIONS,
  MAX_MESSAGES,
  MAX_TITLE,
  cleanSources,
  clearStored,
  dateGroup,
  loadConversations,
  newConversation,
  nextMessageId,
  saveConversations,
  titleFrom,
  type Conversation,
  type DateGroup,
  type Source,
  type StoredMessage,
} from '@/lib/novaia/store';

const MAX_LEN = 600; // même limite que le Space de NovaIA (au-delà, le message serait refusé)
const HISTORY_SENT = 12;
const MAX_SENT_CONTENT = 1000; // limite de la route : un message plus long ferait refuser toute la requête

/** Mascotte : placeholder dans NovaiaMark.tsx, à remplacer quand l'asset définitif existe. */
function Orb({ size }: { size: number }) {
  return (
    <span className="ns-float inline-block shrink-0" style={{ width: size, height: size }}>
      <NovaiaMark size={size} />
    </span>
  );
}

const QUEUE_MAX = 3;
const nvText = (locale: Locale) =>
  locale === 'en'
    ? { queued: 'Queued', cancel: 'Cancel', queueHint: 'Will be sent when NovaIA finishes', style: 'Style', voice: 'Voice mode', hello: 'What are we working on?' }
    : { queued: 'En file', cancel: 'Annuler', queueHint: 'Part dès que NovaIA a fini', style: 'Style', voice: 'Mode vocal', hello: 'On travaille sur quoi ?' };

const Icon = {
  menu: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  pencil: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
    </svg>
  ),
  send: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  stop: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
  clip: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11.5l-8.2 8.2a5 5 0 01-7-7l8.6-8.6a3.4 3.4 0 014.8 4.8l-8.6 8.6a1.8 1.8 0 01-2.5-2.5l7.9-7.9" />
    </svg>
  ),
  wave: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
    </svg>
  ),
  mic: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" />
    </svg>
  ),
  image: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  ),
};

interface AttachedDoc {
  thumb: string;
  dataUrl: string;
  label: string;
  fresh: boolean; // nouvelle pièce jointe (et pas une image déjà active reprise pour une question suivante)
}

export default function NovaiaChat({ locale, copy }: { locale: Locale; copy: NovaiaCopy }) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState('');
  const [voiceOk, setVoiceOk] = useState({ mic: false, tts: false });
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const stopDictRef = useRef<(() => void) | null>(null);
  const [voiceServer, setVoiceServer] = useState(false);
  const [hands, setHands] = useState<'off' | 'listening' | 'thinking' | 'speaking'>('off');
  const handsRef = useRef<'off' | 'listening' | 'thinking' | 'speaking'>('off');
  const listenerRef = useRef<Listener | null>(null);
  const awaitReplyRef = useRef<'no' | 'sent' | 'running'>('no');
  const sendRef = useRef<(t: string) => void>(() => undefined);
  const activeIdRef = useRef<string | null>(null);
  const setHandsBoth = (v: 'off' | 'listening' | 'thinking' | 'speaking') => {
    handsRef.current = v;
    setHands(v);
  };
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [liveText, setLiveText] = useState(''); // texte de la réponse en cours d'écriture (affiché au fil de l'eau)
  const [steps, setSteps] = useState<ReplyState[]>([]); // ce que NovaIA fait en ce moment (recherche, calcul, réflexion, rédaction)
  const [drawer, setDrawer] = useState(false);
  const [queue, setQueue] = useState<string[]>([]); // messages écrits pendant qu'une réponse arrive : partent à la suite
  const nt = nvText(locale);
  const [tabEvent, setTabEvent] = useState({ n: 0, error: false }); // une réponse vient d'arriver (icône de l'onglet)
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

  // --- compte, style de réponse et consentement (les préférences ne sont gardées sur le compte qu'avec l'accord de la personne)
  const pc = prefsCopy(locale);
  const [userId, setUserId] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>({});
  const [consent, setConsent] = useState<boolean | null>(null);
  const [syncOn, setSyncOn] = useState(false);
  const pushedRef = useRef<Map<string, number>>(new Map());
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefsError, setPrefsError] = useState(false);
  const styleRef = useRef<Style>({});
  styleRef.current = style;
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null; // pas de connexion possible : NovaIA marche quand même, sans compte
    }
  }, []);

  const [pdf, setPdf] = useState<{ doc: OpenedPdf; page: number; busy: boolean } | null>(null);
  const [facts, setFacts] = useState<{ id: number; content: string }[]>([]);
  const factsRef = useRef(facts);
  factsRef.current = facts;
  const [factSuggestion, setFactSuggestion] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const compressingRef = useRef(false);
  const compressFailRef = useRef(-1);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  // petits faits retenus (seulement si la personne a accepté la mémoire)
  useEffect(() => {
    if (!supabase || !userId || consent !== true) {
      setFacts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('novaia_memories').select('id, content').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
        if (!cancelled && Array.isArray(data)) setFacts(data.filter((r: { id: unknown; content: unknown }) => typeof r.id === 'number' && typeof r.content === 'string'));
      } catch {
        /* sans mémoire, NovaIA marche quand même */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, consent]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid: string | undefined = data?.user?.id;
        if (!uid || cancelled) return;
        setUserId(uid);
        let { data: row, error: rowError } = await supabase.from('novaia_profiles').select('memory_consent, style, sync_conversations').eq('user_id', uid).maybeSingle();
        if (rowError) {
          // la colonne de synchronisation n'existe pas encore (SQL 002 pas lancé) : on relit sans elle
          const again = await supabase.from('novaia_profiles').select('memory_consent, style').eq('user_id', uid).maybeSingle();
          row = again.data as typeof row;
        }
        if (cancelled) return;
        if (row) {
          setConsent(row.memory_consent === true);
          setSyncOn(row.sync_conversations === true);
          if (row.memory_consent === true) setStyle(cleanStyle(row.style));
        }
      } catch {
        /* hors ligne ou tables absentes : on continue sans compte */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const saveProfile = useCallback(
    async (nextStyle: Style, nextConsent: boolean) => {
      if (!supabase || !userId) return;
      const { error } = await supabase.from('novaia_profiles').upsert(
        { user_id: userId, memory_consent: nextConsent, style: nextConsent ? nextStyle : {}, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      setPrefsError(!!error);
    },
    [supabase, userId]
  );

  const changeStyle = (s: Style) => {
    const clean = cleanStyle(s);
    setStyle(clean);
    if (userId && consent === true) void saveProfile(clean, true);
  };

  const changeConsent = (v: boolean) => {
    const was = consent;
    setConsent(v);
    if (userId) void saveProfile(styleRef.current, v);
    if (!v) {
      setFactSuggestion(null);
      if (was === true && supabase && userId) {
        setFacts([]);
        void supabase.from('novaia_memories').delete().eq('user_id', userId); // refuser = ne rien garder
      }
    }
  };

  const changeSync = async (v: boolean) => {
    if (!supabase || !userId) return;
    if (!v) {
      if (!window.confirm(pc.syncDisableConfirm)) return;
      setSyncOn(false);
      pushedRef.current = new Map();
      await supabase.from('novaia_profiles').upsert({ user_id: userId, sync_conversations: false, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      await deleteAllRemote(supabase, userId);
      return;
    }
    const { error } = await supabase.from('novaia_profiles').upsert({ user_id: userId, sync_conversations: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) {
      setPrefsError(true);
      return;
    }
    setPrefsError(false);
    setSyncOn(true); // l'effet ci-dessous fait la première fusion
  };

  const saveFact = async () => {
    const text = factSuggestion;
    setFactSuggestion(null);
    if (!text || !supabase || !userId || consent !== true) return;
    const { data, error } = await supabase.from('novaia_memories').insert({ user_id: userId, content: text.slice(0, 300), kind: 'fait' }).select('id, content').single();
    if (error || !data) {
      setPrefsError(true);
      return;
    }
    setFacts((prev) => [data, ...prev]);
    setNotice(pc.abNoted);
  };

  const deleteFact = async (id: number) => {
    if (!supabase || !userId) return;
    setFacts((prev) => prev.filter((f) => f.id !== id));
    await supabase.from('novaia_memories').delete().eq('id', id).eq('user_id', userId);
  };

  const forgetAll = async () => {
    if (!supabase || !userId || !window.confirm(pc.forgetConfirm)) return;
    const a = await supabase.from('novaia_memories').delete().eq('user_id', userId);
    const b = await supabase.from('novaia_profiles').upsert({ user_id: userId, memory_consent: false, style: {}, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setPrefsError(!!(a.error || b.error));
    setStyle({});
    setConsent(false);
    setFacts([]);
    setFactSuggestion(null);
  };
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [attachment, setAttachment] = useState<PreparedImage | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  // image active par conversation : en mémoire seulement (jamais enregistrée), perdue au rechargement de la page
  const [imageByConv, setImageByConv] = useState<Record<string, PreparedImage>>({});
  const fileRef = useRef<HTMLInputElement | null>(null); // image
  const docRef = useRef<HTMLInputElement | null>(null); // PDF
  const camRef = useRef<HTMLInputElement | null>(null); // appareil photo
  const [menuOpen, setMenuOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [viewer, setViewer] = useState<AttachedDoc | null>(null);
  // pièces jointes par conversation puis par message : en mémoire seulement
  const [docsByConv, setDocsByConv] = useState<Record<string, Record<number, AttachedDoc>>>({});

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  // page plein écran : on fige le défilement du site derrière
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const convsRef = useRef<Conversation[]>([]);

  convsRef.current = convs;
  const loadingIdRef = useRef<string | null>(null);
  loadingIdRef.current = loadingId;

  // --- synchronisation (facultative) : fusion au démarrage, au retour sur la page, puis envoi des changements
  const syncPull = useCallback(async () => {
    if (!supabase || !userId) return;
    const remote = await fetchRemote(supabase, userId);
    if (!remote || !mounted.current) return;
    const { list, push, changed } = mergeConversations(convsRef.current, remote, loadingIdRef.current);
    for (const r of remote) if (!r.deleted) pushedRef.current.set(r.id, Math.max(pushedRef.current.get(r.id) ?? 0, r.updated_at));
    if (changed) setConvs(list);
    for (const c of push) if (await pushConversation(supabase, userId, c)) pushedRef.current.set(c.id, c.updatedAt);
  }, [supabase, userId]);

  useEffect(() => {
    if (!ready || !syncOn || !supabase || !userId) return;
    void syncPull();
    if (supabase && userId) void purgeOldDeletions(supabase, userId);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncPull();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [ready, syncOn, supabase, userId, syncPull]);

  useEffect(() => {
    if (!ready || !syncOn || !supabase || !userId) return;
    const t = setTimeout(() => {
      for (const c of convs) {
        if (c.id === loadingId || c.messages.length === 0) continue;
        if ((pushedRef.current.get(c.id) ?? 0) >= c.updatedAt) continue;
        pushedRef.current.set(c.id, c.updatedAt);
        void pushConversation(supabase, userId, c).then((ok) => {
          if (!ok) pushedRef.current.delete(c.id);
        });
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [convs, loadingId, ready, syncOn, supabase, userId]);

  // ----- cycle de vie : chargement / sauvegarde de l'historique (navigateur uniquement)

  useEffect(() => {
    mounted.current = true;
    setVoiceOk({ mic: dictationSupported(), tts: ttsSupported() });
    fetch('/api/novaia/voice/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: unknown } | null) => {
        if (mounted.current && d && d.enabled === true) setVoiceServer(true);
      })
      .catch(() => undefined);
    setConvs(loadConversations());
    setReady(true);
    const flush = () => saveConversations(convsRef.current);
    window.addEventListener('pagehide', flush);
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
      stopDictRef.current?.();
      stopSpeaking();
      stopServerTts();
      listenerRef.current?.stop();
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => saveConversations(convs), 300);
    return () => clearTimeout(t);
  }, [convs, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setDrawer(false);
      setRenamingId(null);
      setMenuOpen(false);
      setDocsOpen(false);
      setViewer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // pièces jointes gardées sur l'appareil : on les recharge à l'ouverture d'une conversation
  useEffect(() => {
    if (!activeId) return;
    const id = activeId;
    let cancelled = false;
    void loadConvDocs(id).then((stored) => {
      if (cancelled) return;
      const ids = Object.keys(stored).map(Number);
      if (ids.length === 0) return;
      setDocsByConv((prev) => ({ ...prev, [id]: { ...stored, ...(prev[id] ?? {}) } }));
      // la dernière image redevient « active » : on peut continuer d'en parler après un rechargement
      const last = stored[Math.max(...ids)];
      setImageByConv((prev) => (prev[id] ? prev : { ...prev, [id]: { dataUrl: last.dataUrl, thumb: last.thumb } }));
    });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const ordered = useMemo(() => [...convs].sort((a, b) => b.updatedAt - a.updatedAt), [convs]);
  const active = useMemo(() => convs.find((c) => c.id === activeId) ?? null, [convs, activeId]);
  const messages: StoredMessage[] = active?.messages ?? [];
  const stepLabel = (s: ReplyState) =>
    s === 'recherche' ? copy.statusSearch : s === 'calcul' ? copy.statusCalc : s === 'reflexion' ? copy.statusThink : copy.statusWrite;
  const loading = loadingId !== null;
  const loadingHere = loadingId !== null && loadingId === activeId;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, loadingHere, activeId, liveText.length > 0]);

  // Le champ grandit avec le texte, jusqu'à 160 px.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // ----- comparaisons côte à côte : 3 au maximum par personne, jamais deux réponses de suite
  const readAb = (): { done: number; lastAt: number } => {
    try {
      const v = JSON.parse(window.localStorage.getItem('novaia:ab:v1') ?? '{}') as { done?: unknown; lastAt?: unknown };
      return { done: typeof v.done === 'number' ? v.done : 0, lastAt: typeof v.lastAt === 'number' ? v.lastAt : 0 };
    } catch {
      return { done: 0, lastAt: 0 };
    }
  };
  const writeAb = (v: { done: number; lastAt: number }) => {
    try {
      window.localStorage.setItem('novaia:ab:v1', JSON.stringify(v));
    } catch {
      /* stockage bloqué : tant pis, la comparaison pourra revenir */
    }
  };

  const resolveAb = (convId: string, msgId: number, pick: 'a' | 'b' | null) => {
    const conv = convsRef.current.find((c) => c.id === convId);
    const m = conv?.messages.find((x) => x.id === msgId);
    if (!conv || !m?.ab) return;
    const content = pick === 'b' ? m.ab.textB : m.content;
    const dims = pick === 'a' ? m.ab.dimsA : pick === 'b' ? m.ab.dimsB : null;
    setConvs((prev) =>
      prev.map((c) =>
        c.id !== convId
          ? c
          : { ...c, messages: c.messages.map((x) => (x.id === msgId ? { id: x.id, role: x.role, content, ...(x.sources ? { sources: x.sources } : {}) } : x)) }
      )
    );
    if (dims) {
      changeStyle(applyDims(styleRef.current, cleanDims(dims)));
      setNotice(pc.abNoted);
    }
  };

  // ----- échange avec le serveur

  const ask = useCallback(
    async (convId: string, history: StoredMessage[], image?: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoadingId(convId);
      setSteps([]);
      setLiveText('');

      const push = (reply: string, error = false, sources: Source[] = [], ab?: StoredMessage['ab'], tool?: ToolName) => {
        if (!mounted.current) return;
        setLiveText('');
        setTabEvent((e) => ({ n: e.n + 1, error }));
        setConvs((prev) =>
          prev.map((c) =>
            c.id !== convId
              ? c
              : {
                  ...c,
                  updatedAt: Date.now(),
                  messages: [
                    ...c.messages,
                    { id: nextMessageId(c), role: 'assistant' as const, content: reply, error, ...(sources.length ? { sources } : {}), ...(tool ? { tool } : {}), ...(ab ? { ab } : {}) },
                  ].slice(-MAX_MESSAGES),
                }
          )
        );
      };

      // le début d'une longue discussion est remplacé par son résumé (voir plus bas) : on n'envoie que la suite
      const conv = convsRef.current.find((c) => c.id === convId);
      const upTo = conv?.summaryUpTo;
      const abInfo = readAb();
      const assistantCount = history.filter((m) => m.role === 'assistant').length;
      const abIndex =
        !image && abInfo.done < 3 && assistantCount >= 3 && assistantCount - abInfo.lastAt >= 3 && Object.keys(styleRef.current).length < 5
          ? abInfo.done
          : null;

      const payload = history
        .filter((m) => !m.error && (upTo === undefined || m.id > upTo))
        .slice(-HISTORY_SENT)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_SENT_CONTENT) }));

      try {
        // Avec une image : route « vision » (question = dernier message) ; sinon : chat avec mémoire de conversation.
        const res = image
          ? await fetch('/api/novaia/vision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ locale, question: history[history.length - 1]?.content ?? '', image, history: payload.slice(-7, -1) }),
              signal: controller.signal,
            })
          : await fetch('/api/novaia/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                locale,
                messages: payload,
                stream: true,
                style: styleRef.current,
                memoire: factsRef.current.slice(0, 10).map((f) => f.content),
                resume: conv?.summary ?? '',
                ab: abIndex,
              }),
              signal: controller.signal,
            });

        if (res.ok && res.body && (res.headers.get('content-type') ?? '').includes('ndjson')) {
          // mode « en direct » : une ligne JSON par événement (état, puis résultat)
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let done = false;
          let answered = false;

          const handle = (line: string) => {
            if (!line.trim()) return;
            let ev: { t?: unknown; v?: unknown; reply?: unknown; sources?: unknown; mode?: unknown; ab?: unknown; tool?: unknown };
            try {
              ev = JSON.parse(line);
            } catch {
              return;
            }
            if (ev.t === 'etat' && typeof ev.v === 'string') {
              const v = ev.v as ReplyState;
              if (mounted.current) setSteps((prev) => (prev.includes(v) ? prev : [...prev, v]));
            } else if (ev.t === 'txt' && typeof ev.v === 'string') {
              if (mounted.current) setLiveText(ev.v.slice(0, 6000));
            } else if (ev.t === 'fin' && typeof ev.reply === 'string') {
              answered = true;
              const alt = ev.ab as { textB?: unknown; dimsA?: unknown; dimsB?: unknown } | undefined;
              const ab =
                alt && typeof alt.textB === 'string' && alt.textB.trim()
                  ? { textB: alt.textB.trim(), dimsA: cleanDims(alt.dimsA), dimsB: cleanDims(alt.dimsB) }
                  : undefined;
              if (ab) writeAb({ done: abInfo.done + 1, lastAt: assistantCount + 1 });
              push(ev.reply, false, cleanSources(ev.sources), ab, cleanTool(ev.tool));
            } else if (ev.t === 'err') {
              answered = true;
              push(copy.error, true);
            }
          };

          while (!done) {
            const chunk = await reader.read();
            done = chunk.done;
            buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
            let nl: number;
            while ((nl = buffer.indexOf('\n')) >= 0) {
              handle(buffer.slice(0, nl));
              buffer = buffer.slice(nl + 1);
            }
          }
          handle(buffer);
          if (!answered && !controller.signal.aborted) push(copy.error, true);
        } else {
          const data: { reply?: unknown; error?: unknown; limite?: unknown } = await res.json().catch(() => ({}));

          if (!res.ok || typeof data.reply !== 'string') {
            const dur = data.limite === 'day' || data.limite === 'global';
            push(res.status === 429 ? (dur && typeof data.error === 'string' ? data.error : copy.rateLimited) : res.status === 413 ? copy.imageTooBig : copy.error, true);
          } else {
            push(data.reply);
          }
        }
      } catch {
        if (!controller.signal.aborted) push(copy.error, true);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        if (mounted.current) {
          setLiveText('');
          setLoadingId((cur) => (cur === convId ? null : cur));
        }
      }
    },
    [locale, copy.error, copy.rateLimited, copy.imageTooBig]
  );

  // ----- compression : quand une discussion devient longue, son début est résumé en quelques phrases (la page garde tout)
  useEffect(() => {
    if (loadingId !== null || !active || compressingRef.current) return;
    const open = active.messages.filter((m) => !m.error && (active.summaryUpTo === undefined || m.id > active.summaryUpTo));
    if (open.length < 14 || open.length < compressFailRef.current + 4) return;
    const part = open.slice(0, -6);
    const convId = active.id;
    const last = part[part.length - 1].id;
    compressingRef.current = true;
    fetch('/api/novaia/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: part.slice(-30).map((m) => ({ role: m.role, content: m.content.slice(0, 1000) })), previous: active.summary ?? '' }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { summary?: unknown } | null) => {
        if (d && typeof d.summary === 'string' && d.summary.trim()) {
          setConvs((prev) => prev.map((c) => (c.id === convId ? { ...c, summary: (d.summary as string).trim(), summaryUpTo: last } : c)));
        } else {
          compressFailRef.current = open.length;
        }
      })
      .catch(() => {
        compressFailRef.current = open.length;
      })
      .finally(() => {
        compressingRef.current = false;
      });
  }, [active, loadingId]);

  const send = useCallback(
    (text: string) => {
      const known = activeId ? imageByConv[activeId] : undefined;
      const image = (attachment ?? known)?.dataUrl; // nouvelle image, sinon celle déjà active dans la conversation
      const content = text.trim().slice(0, MAX_LEN) || (attachment ? copy.imageDefaultQuestion : '');
      if (!content) return;
      if (loading) {
        if (attachment) return; // une pièce jointe ne se met pas en file
        setQueue((q) => (q.length < QUEUE_MAX ? [...q, content] : q));
        setInput('');
        return;
      }
      stopDictRef.current?.();
      stopSpeaking();
      stopServerTts();
      setSpeakingId(null);

      let convId = activeId;
      let history: StoredMessage[];
      let msgId = 1;

      if (!convId || !convs.some((c) => c.id === convId)) {
        const c = newConversation(titleFrom(content));
        const userMessage: StoredMessage = { id: 1, role: 'user', content, ...(image ? { image: true } : {}) };
        msgId = 1;
        c.messages = [userMessage];
        convId = c.id;
        history = c.messages;
        setConvs((prev) => [c, ...prev].slice(0, MAX_CONVERSATIONS));
        setActiveId(c.id);
      } else {
        const cur = convs.find((c) => c.id === convId) as Conversation;
        const userMessage: StoredMessage = { id: nextMessageId(cur), role: 'user', content, ...(image ? { image: true } : {}) };
        msgId = userMessage.id;
        history = [...cur.messages, userMessage];
        const id = convId;
        setConvs((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, updatedAt: Date.now(), messages: [...c.messages, userMessage].slice(-MAX_MESSAGES) } : c
          )
        );
      }

      setInput('');
      setFactSuggestion(consent === true && userId ? detectFact(content, factsRef.current.map((f) => f.content)) : null);
      if (attachment) {
        const id = convId;
        setImageByConv((prev) => ({ ...prev, [id]: attachment }));
      }
      const eff = attachment ?? known;
      if (eff) {
        const id = convId;
        const label = attachment && pdf ? `${pdf.doc.name} · ${pc.pdfPage} ${pdf.page}` : attachment ? copy.imageAttached : '';
        const entry: AttachedDoc = { thumb: eff.thumb, dataUrl: eff.dataUrl, label, fresh: !!attachment };
        setDocsByConv((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [msgId]: entry } }));
        void putDoc(id, msgId, entry);
      }
      setAttachment(null);
      closePdf();
      setAttachError(null);
      void ask(convId, history, image);
    },
    [activeId, convs, loading, ask, attachment, imageByConv, copy.imageDefaultQuestion, copy.imageAttached, consent, userId, pdf, pc.pdfPage]
  );
  sendRef.current = send;
  activeIdRef.current = activeId;

  // dès que la réponse est terminée, le premier message en file part
  useEffect(() => {
    if (loadingId !== null || queue.length === 0 || !ready) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    sendRef.current(next);
  }, [loadingId, queue, ready]);

  // ----- voix : lecture (voix du serveur si activée, sinon celle du navigateur) et mode mains libres

  const speakAny = (text: string, onEnd: () => void) => {
    const lg = locale === 'en' ? 'en' : 'fr';
    const browser = () => (ttsSupported() ? speak(text, lg, onEnd) : onEnd());
    if (!voiceServer) return browser();
    void playServerTts(text, lg, onEnd).then((ok) => {
      if (!ok) browser();
    });
  };

  const isOff = () => handsRef.current === 'off';

  const backToListening = () => {
    if (isOff()) return;
    awaitReplyRef.current = 'no';
    listenerRef.current?.resume();
    setHandsBoth('listening');
  };

  const stopHands = () => {
    listenerRef.current?.stop();
    listenerRef.current = null;
    awaitReplyRef.current = 'no';
    stopSpeaking();
    stopServerTts();
    setHandsBoth('off');
  };

  const onUtterance = async (wav: string) => {
    if (handsRef.current !== 'listening') return;
    listenerRef.current?.pause();
    setHandsBoth('thinking');
    let text = '';
    try {
      const r = await fetch('/api/novaia/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': locale === 'en' ? 'en' : 'fr' },
        body: JSON.stringify({ audio: wav, locale: locale === 'en' ? 'en' : 'fr' }),
      });
      const d = (await r.json().catch(() => null)) as { text?: unknown; error?: unknown } | null;
      if (d && typeof d.text === 'string') text = d.text.trim();
      else if (d && typeof d.error === 'string' && r.status === 429) setAttachError(d.error);
    } catch {
      /* réseau : on retombe sur « rien entendu » */
    }
    if (isOff()) return;
    if (!text) {
      setAttachError(pc.handsNoSpeech);
      return backToListening();
    }
    awaitReplyRef.current = 'sent';
    sendRef.current(text);
    window.setTimeout(() => {
      if (awaitReplyRef.current === 'sent') backToListening(); // l'envoi n'a pas démarré (déjà en cours, texte vide…)
    }, 3000);
  };

  const toggleHands = () => {
    if (handsRef.current !== 'off') return stopHands();
    unlockAudio();
    stopSpeaking();
    stopServerTts();
    stopDictRef.current?.();
    startListener({ onUtterance: (w) => void onUtterance(w) })
      .then((l) => {
        if (!mounted.current) return l.stop();
        listenerRef.current = l;
        setHandsBoth('listening');
      })
      .catch(() => setAttachError(pc.micDenied));
  };

  // quand la réponse est terminée : on la lit, puis on se remet à écouter
  useEffect(() => {
    if (handsRef.current === 'off') return;
    if (loadingId !== null && awaitReplyRef.current === 'sent') awaitReplyRef.current = 'running';
    if (loadingId === null && awaitReplyRef.current === 'running') {
      awaitReplyRef.current = 'no';
      const conv = convsRef.current.find((c) => c.id === activeIdRef.current);
      const last = conv?.messages[conv.messages.length - 1];
      if (!last || last.role !== 'assistant' || last.error) return backToListening();
      setHandsBoth('speaking');
      speakAny(last.content, backToListening);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingId]);

  const closePdf = () => {
    setPdf((cur) => {
      cur?.doc.destroy();
      return null;
    });
  };

  const goPdfPage = async (doc: OpenedPdf, page: number) => {
    setAttachError(null);
    setPdf({ doc, page, busy: true });
    try {
      setAttachment(await prepareImage(await doc.renderPage(page)));
      setPdf({ doc, page, busy: false });
    } catch {
      setPdf({ doc, page, busy: false });
      setAttachError(pc.pdfError);
    }
  };

  const attachFile = async (file: File | undefined) => {
    if (!file) return;
    setAttachError(null);
    if (isPdf(file)) {
      closePdf();
      try {
        const doc = await openPdf(file);
        await goPdfPage(doc, 1);
      } catch (e) {
        setAttachment(null);
        setAttachError(e instanceof Error && e.message === 'size' ? copy.imageTooBig : pc.pdfError);
      }
      return;
    }
    closePdf();
    try {
      setAttachment(await prepareImage(file));
    } catch (e) {
      setAttachment(null);
      setAttachError(e instanceof Error && e.message === 'size' ? copy.imageTooBig : copy.imageError);
    }
  };

  const stop = () => {
    setQueue([]);
    abortRef.current?.abort();
    setLoadingId(null);
    textareaRef.current?.focus();
  };

  const regenerate = () => {
    if (loading || !active) return;
    const lastUser = [...active.messages].map((m) => m.role).lastIndexOf('user');
    if (lastUser < 0) return;
    const kept = active.messages.slice(0, lastUser + 1);
    const id = active.id;
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, updatedAt: Date.now(), messages: kept } : c)));
    void ask(id, kept);
  };

  // ----- gestion des conversations

  const newChat = () => {
    if (loading) return;
    setQueue([]);
    setActiveId(null);
    setInput('');
    setAttachment(null);
    setAttachError(null);
    setDrawer(false);
    setRenamingId(null);
    textareaRef.current?.focus();
  };

  const openConv = (id: string) => {
    if (renamingId) return;
    setActiveId(id);
    setAttachment(null);
    setAttachError(null);
    setDrawer(false);
  };

  const startRename = (c: Conversation) => {
    setRenamingId(c.id);
    setRenameValue(c.title);
  };

  const commitRename = () => {
    const id = renamingId;
    const title = renameValue.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE);
    setRenamingId(null);
    if (!id || !title) return;
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, title, renamed: true } : c)));
  };

  const removeConv = (c: Conversation) => {
    if (loadingId === c.id) return;
    if (!window.confirm(copy.removeConfirm)) return;
    setConvs((prev) => prev.filter((x) => x.id !== c.id));
    void deleteConvDocs(c.id);
    if (syncOn && supabase && userId) void pushDeletion(supabase, userId, c.id);
    setDocsByConv((prev) => {
      const rest = { ...prev };
      delete rest[c.id];
      return rest;
    });
    if (activeId === c.id) setActiveId(null);
  };

  const clearAll = () => {
    if (loading || convs.length === 0) return;
    if (!window.confirm(copy.clearAllConfirm)) return;
    setConvs([]);
    setActiveId(null);
    setDocsByConv({});
    setImageByConv({});
    void clearAllDocs();
    if (syncOn && supabase && userId) for (const c of convs) void pushDeletion(supabase, userId, c.id);
    clearStored();
  };

  // ----- affichage

  const groups = useMemo(() => {
    const labels: Record<DateGroup, string> = {
      today: copy.groupToday,
      yesterday: copy.groupYesterday,
      week: copy.groupWeek,
      older: copy.groupOlder,
    };
    const order: DateGroup[] = ['today', 'yesterday', 'week', 'older'];
    const now = Date.now();
    return order
      .map((g) => ({ key: g, label: labels[g], items: ordered.filter((c) => dateGroup(c.updatedAt, now) === g) }))
      .filter((g) => g.items.length > 0);
  }, [ordered, copy.groupToday, copy.groupYesterday, copy.groupWeek, copy.groupOlder]);

  const empty = messages.length === 0;
  const activeImage = attachment ?? (activeId ? imageByConv[activeId] : undefined);
  const imageLost = !activeImage && messages.some((m) => m.image);
  const canSend = input.trim().length > 0 ? !attachment || !loading : attachment !== null && !loading;
  const lastMessage = messages[messages.length - 1];
  // une réponse à une image ne se régénère pas : l'image n'est pas conservée
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const canRegenerate = !loading && lastMessage?.role === 'assistant' && !lastUserMessage?.image;
  const headerTitle = active ? active.title : copy.untitled;

  useTabStatus(loadingId !== null, tabEvent, locale === 'en' ? { working: 'NovaIA is writing…', done: 'Reply ready', fail: 'NovaIA hit a snag' } : { working: 'NovaIA écrit…', done: 'Réponse prête', fail: 'NovaIA a eu un souci' });

  const ui = (
    <div className="nv-bg fixed inset-0 z-[100] flex h-[100dvh] w-screen overflow-hidden text-ink">
      <span className="nv-blob -left-24 top-1/3 h-72 w-72 bg-[rgb(255_190_150/0.45)] dark:bg-[rgb(120_80_200/0.25)]" aria-hidden="true" />
      <span className="nv-blob -right-16 bottom-10 h-80 w-80 bg-[rgb(150_175_255/0.45)] dark:bg-[rgb(60_90_251/0.25)]" style={{ animationDelay: '-4s' }} aria-hidden="true" />
      {/* Voile derrière le tiroir (mobile) */}
      {drawer && (
        <button
          type="button"
          aria-label={copy.closeMenu}
          onClick={() => setDrawer(false)}
          className="absolute inset-0 z-20 bg-ink/40 md:hidden"
        />
      )}

      {/* Barre latérale : conversations */}
      <aside
        className={`nv-glass absolute inset-y-0 left-0 z-30 flex w-80 max-w-[88%] flex-col transition-transform duration-200 md:static md:m-3 md:mr-0 md:w-72 md:max-w-none md:translate-x-0 md:rounded-[26px] ${
          drawer ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label={copy.sidebarTitle}
      >
        <div className="flex items-center justify-between px-4 pt-3 sm:hidden">
          <a href={`/${locale}`} className="text-[0.78rem] text-muted hover:text-ink">
            ← {copy.backToSite}
          </a>
        </div>
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            onClick={newChat}
            disabled={loading}
            className="flex flex-1 items-center gap-2 rounded-full bg-accent px-4 py-3 text-[0.95rem] font-semibold text-white shadow-[0_10px_22px_-10px_rgb(var(--accent)/0.7)] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 md:py-2.5 md:text-[0.88rem]"
          >
            {Icon.plus}
            <span className="truncate">{copy.newChat}</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label={copy.sidebarTitle}>
          {ready && ordered.length === 0 && (
            <p className="px-2 py-4 text-center text-[0.8rem] leading-relaxed text-muted">{copy.noConversations}</p>
          )}

          {groups.map((g) => (
            <div key={g.key} className="mb-4">
              <p className="px-2.5 pb-1 text-[0.74rem] font-semibold text-muted">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((c) => {
                  const isActive = c.id === activeId;
                  return (
                    <li key={c.id} className="group relative">
                      {renamingId === c.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          maxLength={MAX_TITLE}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          aria-label={copy.rename}
                          className="w-full rounded-lg border border-accent bg-paper px-2.5 py-2 text-[0.85rem] text-ink outline-none"
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openConv(c.id)}
                            onDoubleClick={() => startRename(c)}
                            aria-current={isActive ? 'true' : undefined}
                            className={`block w-full truncate rounded-lg px-3 py-3 pr-20 text-left text-[0.95rem] md:px-2.5 md:py-2 md:pr-14 md:text-[0.85rem] transition-colors ${
                              isActive ? 'bg-accent-soft font-semibold text-ink' : 'text-ink/75 hover:bg-ink/5'
                            }`}
                          >
                            {c.title}
                          </button>
                          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-100 md:opacity-0 md:focus-within:opacity-100 md:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => startRename(c)}
                              aria-label={copy.rename}
                              title={copy.rename}
                              className="rounded-md p-2.5 text-muted transition-colors hover:bg-paper hover:text-ink md:p-1.5"
                            >
                              {Icon.pencil}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeConv(c)}
                              disabled={loadingId === c.id}
                              aria-label={copy.remove}
                              title={copy.remove}
                              className="rounded-md p-2.5 text-muted transition-colors hover:bg-paper hover:text-ink disabled:opacity-30 md:p-1.5"
                            >
                              {Icon.trash}
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-line/70 px-4 py-3 text-[0.7rem] text-muted">
          <span className="leading-snug">{copy.savedLocally}</span>
          {convs.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              disabled={loading}
              className="shrink-0 underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-40"
            >
              {copy.clearAll}
            </button>
          )}
        </div>
      </aside>

      {/* Zone de conversation */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 px-2 py-2 md:px-5 md:py-3">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label={copy.openMenu}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/80 transition-colors hover:bg-mist md:hidden"
          >
            {Icon.menu}
          </button>
          <a
            href={`/${locale}`}
            className="nv-glass hidden shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium text-ink/80 transition-colors hover:text-ink sm:flex"
          >
            <span aria-hidden>←</span>
            {copy.backToSite}
          </a>
          <span className="hidden sm:block"><Orb size={34} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1.02rem] font-extrabold leading-tight tracking-tight text-ink md:text-[1rem] md:leading-none">
              {active ? headerTitle : copy.assistantName}
            </p>
            <p className="mt-1 hidden truncate text-[0.74rem] leading-snug text-muted sm:block">
              {active ? copy.assistantName : copy.previewBadge}
            </p>
          </div>
          {active && (
            <button
              type="button"
              onClick={() => setDocsOpen(true)}
              aria-label={pc.docsButton}
              title={pc.docsButton}
              className="nv-glass flex h-11 min-w-[2.75rem] shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-[0.8rem] font-medium text-ink/80 transition-colors hover:text-ink md:h-auto md:min-w-0 md:py-1.5"
            >
              {Icon.clip}
              <span className="hidden sm:inline">{pc.docsButton}</span>
              {Object.values(docsByConv[active.id] ?? {}).filter((d) => d.fresh).length > 0 && (
                <span className="text-[0.72rem] font-bold text-accent">{Object.values(docsByConv[active.id] ?? {}).filter((d) => d.fresh).length}</span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setPrefsOpen(true)}
            className="nv-glass h-11 shrink-0 rounded-full px-4 text-[0.8rem] font-semibold text-ink/80 transition-colors hover:text-ink md:h-auto md:py-1.5"
          >
            {nt.style}
            {Object.keys(style).length > 0 && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" aria-hidden />}
          </button>
          {!userId && (
            <a
              href={`/${locale}/login?next=/${locale}/novaia`}
              className="hidden shrink-0 rounded-full bg-ink px-4 py-1.5 text-[0.8rem] font-semibold text-paper transition-opacity hover:opacity-85 sm:block"
            >
              {pc.signIn}
            </a>
          )}
          <button
            type="button"
            onClick={newChat}
            disabled={loading || empty}
            className="nv-glass hidden shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium text-ink/80 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:flex md:hidden"
          >
            {Icon.plus}
            {copy.newChat}
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
          role="log"
          aria-live="polite"
          aria-label={copy.assistantName}
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col space-y-4">
            {empty && (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
                <span className="scale-75 sm:scale-100"><Orb size={104} /></span>
                <div>
                  <h3 className="font-display text-[1.7rem] font-extrabold leading-tight tracking-tight text-ink balance sm:text-4xl">{copy.greeting}</h3>
                  <p className="mx-auto mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted sm:mt-3">{copy.emptyText}</p>
                </div>
                <div className="grid w-full max-w-2xl gap-2.5 sm:grid-cols-3">
                  {copy.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      disabled={loading}
                      className="nv-glass rounded-[20px] px-4 py-4 text-left text-[0.95rem] font-medium leading-snug text-ink/90 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_40px_-18px_rgb(60_90_251/0.35)] active:scale-[0.98] disabled:opacity-50 md:text-[0.88rem]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, idx) => {
              const isLast = idx === messages.length - 1;
              return (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {active?.summaryUpTo !== undefined && idx > 0 && messages[idx - 1].id === active.summaryUpTo && (
                    <div className="mb-4 flex w-full items-center gap-3 text-[0.72rem] text-muted">
                      <span className="h-px flex-1 bg-line" />
                      {pc.compressed}
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  )}
                  {m.role === 'assistant' && m.ab ? (
                    <div className="w-full">
                      <p className="mb-2 text-[0.8rem] text-muted">{pc.abTitle}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(['a', 'b'] as const).map((w) => (
                          <div key={w} className="nv-glass flex flex-col rounded-[20px] p-4">
                            <p className="mb-2 text-[0.78rem] font-semibold text-accent">{w === 'a' ? pc.abA : pc.abB}</p>
                            <div className="flex-1 text-[0.95rem] leading-[1.65] text-ink">
                              <FormattedReply text={w === 'a' ? m.content : m.ab!.textB} copyLabel={copy.copy} copiedLabel={copy.copied} />
                            </div>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => activeId && resolveAb(activeId, m.id, w)}
                              className="mt-3 self-start rounded-full bg-accent px-4 py-1.5 text-[0.8rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              {pc.abPick}
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          writeAb({ done: 3, lastAt: 0 });
                          if (activeId) resolveAb(activeId, m.id, null);
                        }}
                        className="mt-2 text-[0.75rem] text-muted underline-offset-2 hover:text-ink hover:underline"
                      >
                        {pc.abStop}
                      </button>
                    </div>
                  ) : (
                  <div
                    className={`break-words text-[0.98rem] leading-[1.7] ${
                      m.role === 'user'
                        ? 'max-w-[88%] whitespace-pre-wrap rounded-[22px] rounded-br-md bg-accent px-4 py-2.5 text-white shadow-[0_12px_24px_-14px_rgb(var(--accent)/0.8)]'
                        : m.error
                        ? 'nv-glass max-w-full rounded-[20px] px-4 py-3 italic text-muted'
                        : 'nv-glass w-full max-w-full rounded-[22px] rounded-tl-md px-5 py-4 text-ink'
                    }`}
                  >
                    {m.image && (() => {
                      const d = activeId ? docsByConv[activeId]?.[m.id] : undefined;
                      return d ? (
                        <button
                          type="button"
                          onClick={() => setViewer(d)}
                          aria-label={pc.docsButton}
                          title={d.label || pc.docsButton}
                          className="mb-1.5 block overflow-hidden rounded-xl border border-paper/20"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={d.dataUrl} alt="" className="max-h-56 w-auto max-w-full object-contain" />
                        </button>
                      ) : (
                        <span className="mb-1 flex items-center gap-1 text-[0.72rem] opacity-70">
                          {Icon.image}
                          {copy.imageAttached}
                        </span>
                      );
                    })()}
                    {m.role === 'assistant' && !m.error ? (
                      <>
                        {(() => {
                          const tl = toolOf(m.tool, m.content);
                          return tl ? <ToolChip tool={tl} locale={locale} /> : null;
                        })()}
                        <FormattedReply text={m.content} copyLabel={copy.copy} copiedLabel={copy.copied} />
                      </>
                    ) : (
                      m.content
                    )}
                  </div>
                  )}

                  {m.role === 'assistant' && !m.ab && m.sources && m.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1 text-[0.72rem] text-muted">
                      <span className="mr-0.5">{copy.sources}</span>
                      {m.sources.map((src) => (
                        <SourceChip key={src.url} source={src} />
                      ))}
                    </div>
                  )}

                  {m.role === 'assistant' && !m.ab && (
                    <div className="mt-1 flex items-center gap-3 px-1 text-[0.72rem] text-muted">
                      {!m.error && <CopyButton text={m.content} label={copy.copy} copiedLabel={copy.copied} />}
                      {!m.error && (voiceOk.tts || voiceServer) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (speakingId === m.id) {
                              stopSpeaking();
                              stopServerTts();
                              setSpeakingId(null);
                              return;
                            }
                            setSpeakingId(m.id);
                            unlockAudio();
                            speakAny(m.content, () => {
                              if (mounted.current) setSpeakingId((cur) => (cur === m.id ? null : cur));
                            });
                          }}
                          className="transition-colors hover:text-ink"
                        >
                          {speakingId === m.id ? pc.listenStop : pc.listen}
                        </button>
                      )}
                      {isLast && canRegenerate && (
                        <button type="button" onClick={regenerate} className="transition-colors hover:text-ink">
                          {copy.regenerate}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {loadingHere && (
              <div className="flex items-start justify-start gap-3">
                <Orb size={34} />
                <div
                  className="nv-glass min-w-[11rem] rounded-[20px] rounded-tl-md px-4 py-3 text-[0.85rem] text-muted"
                  role="status"
                  aria-live="polite"
                  aria-label={copy.thinking}
                >
                  {liveText.trim() && (
                    <div className="mb-2 text-[0.98rem] leading-[1.7] text-ink">
                      <FormattedReply text={closeFences(liveText)} copyLabel={copy.copy} copiedLabel={copy.copied} />
                    </div>
                  )}
                  {steps.length > 1 && !liveText.trim() && (
                    <ul className="mb-1.5 space-y-0.5">
                      {steps.slice(0, -1).map((st) => (
                        <li key={st} className="flex items-center gap-1.5 opacity-70">
                          <span aria-hidden>✓</span>
                          {stepLabel(st)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="ns-typing-dot h-1.5 w-1.5 rounded-full bg-accent"
                          style={{ animationDelay: `${i * 180}ms` }}
                        />
                      ))}
                    </span>
                    <span>{(steps.length ? stepLabel(steps[steps.length - 1]) : copy.thinking).replace(/[….]+$/, '')}…</span>
                  </div>
                </div>
              </div>
            )}

            {queue.map((q, i) => (
              <div key={`${i}-${q}`} className="flex flex-col items-end gap-1">
                <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-md border border-dashed border-accent/50 bg-accent/10 px-4 py-2.5 text-[0.98rem] leading-[1.7] text-ink/80">
                  {q}
                </div>
                <div className="flex items-center gap-2 px-1 text-[0.72rem] text-muted">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                    <span className="ns-live inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                    {nt.queued}
                  </span>
                  <span className="hidden sm:inline">{nt.queueHint}</span>
                  <button type="button" onClick={() => setQueue((cur) => cur.filter((_, k) => k !== i))} className="underline-offset-2 hover:text-ink hover:underline">
                    {nt.cancel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-5 md:pb-4 md:pt-2"
        >
          {hands !== 'off' && (
            <div role="status" className="nv-glass mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 rounded-[20px] px-4 py-2.5 text-[0.9rem] text-ink">
              <span className="flex items-center gap-3">
                <span aria-hidden className={`nv-bars flex h-5 items-center gap-[3px] text-accent ${hands === 'thinking' ? 'opacity-50' : ''}`}>
                  <span /><span /><span /><span /><span />
                </span>
                {hands === 'listening' ? pc.handsListening : hands === 'thinking' ? pc.handsThinking : pc.handsSpeaking}
              </span>
              <button type="button" onClick={stopHands} className="rounded-full bg-ink px-3.5 py-1 text-[0.8rem] font-semibold text-paper transition-opacity hover:opacity-85">
                {pc.handsStop}
              </button>
            </div>
          )}
          <div className="mx-auto w-full max-w-3xl">
            {notice && (
              <p className="mb-2 px-1 text-[0.78rem] text-muted" role="status">
                ✓ {notice}
              </p>
            )}
            {factSuggestion && consent === true && (
              <div className="nv-glass mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[20px] px-4 py-2.5 text-[0.82rem] text-ink/85">
                <span className="min-w-0 flex-1">
                  {pc.factAsk} <span className="font-medium text-ink">« {factSuggestion} »</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => void saveFact()} className="rounded-full bg-accent px-3.5 py-1 text-[0.78rem] font-semibold text-white hover:opacity-90">
                    {pc.factYes}
                  </button>
                  <button type="button" onClick={() => setFactSuggestion(null)} className="rounded-full border border-line px-3.5 py-1 text-[0.78rem] text-ink hover:border-ink/40">
                    {pc.factNo}
                  </button>
                </span>
              </div>
            )}
            {userId && consent === null && !prefsOpen && (
              <div className="nv-glass mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[20px] px-4 py-2.5 text-[0.82rem] text-ink/85">
                <span className="min-w-0 flex-1">{pc.consentQuestion}</span>
                <span className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => changeConsent(true)} className="rounded-full bg-accent px-3.5 py-1 text-[0.78rem] font-semibold text-white hover:opacity-90">
                    {pc.consentYes}
                  </button>
                  <button type="button" onClick={() => changeConsent(false)} className="rounded-full border border-line px-3.5 py-1 text-[0.78rem] text-ink hover:border-ink/40">
                    {pc.consentNo}
                  </button>
                </span>
              </div>
            )}
            {(activeImage || attachError || imageLost) && (
              <div className="mb-2 flex items-center gap-2 px-1 text-[0.75rem] text-muted">
                {activeImage && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeImage.thumb} alt="" className="h-12 w-12 rounded-lg border border-line object-cover" />
                    {attachment && pdf ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={pc.pdfPrev}
                          title={pc.pdfPrev}
                          disabled={pdf.busy || pdf.page <= 1}
                          onClick={() => void goPdfPage(pdf.doc, pdf.page - 1)}
                          className="h-6 w-6 rounded-full border border-line transition-colors hover:bg-mist hover:text-ink disabled:opacity-30"
                        >
                          ‹
                        </button>
                        <span className="whitespace-nowrap">
                          {pc.pdfPage} {pdf.page} {pc.pdfOf} {pdf.doc.pages}
                          {pdf.busy ? '…' : ''}
                        </span>
                        <button
                          type="button"
                          aria-label={pc.pdfNext}
                          title={pc.pdfNext}
                          disabled={pdf.busy || pdf.page >= pdf.doc.pages}
                          onClick={() => void goPdfPage(pdf.doc, pdf.page + 1)}
                          className="h-6 w-6 rounded-full border border-line transition-colors hover:bg-mist hover:text-ink disabled:opacity-30"
                        >
                          ›
                        </button>
                        <span className="hidden max-w-[10rem] truncate sm:inline" title={pdf.doc.name}>
                          · {pdf.doc.name}
                        </span>
                      </span>
                    ) : (
                      <span>{attachment ? copy.imageAttached : copy.imageActive}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAttachment(null);
                        closePdf();
                        if (activeId) {
                          const id = activeId;
                          setImageByConv((prev) => {
                            const rest = { ...prev };
                            delete rest[id];
                            return rest;
                          });
                        }
                      }}
                      className="rounded-full border border-line px-2 py-0.5 transition-colors hover:bg-mist hover:text-ink"
                    >
                      {copy.removeImage}
                    </button>
                  </>
                )}
                {attachError && <span role="alert">{attachError}</span>}
                {!activeImage && !attachError && imageLost && <span>{copy.imageLost}</span>}
              </div>
            )}
            <div className="nv-glass flex items-end gap-1 rounded-[28px] py-1.5 pl-1.5 pr-1.5 transition-shadow focus-within:shadow-[0_0_0_2px_rgb(var(--accent)/0.45),0_18px_40px_-20px_rgb(60_90_251/0.4)] md:gap-2 md:px-2.5 md:py-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void attachFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <input
                ref={docRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  void attachFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <input
                ref={camRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  void attachFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  disabled={loading}
                  aria-label={copy.attach}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  title={`${copy.attach} — ${copy.attachHint}`}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 md:h-10 md:w-10"
                >
                  <span className={`inline-block transition-transform duration-200 ${menuOpen ? 'rotate-45' : ''}`}>{Icon.plus}</span>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
                    <div role="menu" className="nv-glass ns-pop absolute bottom-14 left-0 z-40 w-60 overflow-hidden rounded-[22px] py-1.5 !bg-paper/90">
                      {[
                        { label: pc.menuImage, ref: fileRef },
                        { label: pc.menuDoc, ref: docRef },
                        { label: pc.menuCamera, ref: camRef },
                      ].map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            o.ref.current?.click();
                          }}
                          className="block w-full px-4 py-3 text-left text-[0.95rem] font-medium text-ink transition-colors hover:bg-accent-soft md:py-2.5 md:text-[0.9rem]"
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {voiceOk.mic && (
                <button
                  type="button"
                  disabled={loading}
                  aria-label={listening ? pc.micStop : pc.micStart}
                  aria-pressed={listening}
                  title={listening ? pc.micStop : pc.micStart}
                  onClick={() => {
                    if (listening) {
                      stopDictRef.current?.();
                      return;
                    }
                    const base = input.trim();
                    const stop = startDictation(
                      locale === 'en' ? 'en' : 'fr',
                      (t) => setInput((base ? base + ' ' : '') + t.slice(0, MAX_LEN)),
                      (err) => {
                        stopDictRef.current = null;
                        if (mounted.current) {
                          setListening(false);
                          if (err === 'not-allowed' || err === 'service-not-allowed') setAttachError(pc.micDenied);
                        }
                      }
                    );
                    if (stop) {
                      stopDictRef.current = stop;
                      setListening(true);
                    }
                  }}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-30 md:h-9 md:w-9 ${
                    listening ? 'animate-pulse bg-accent text-white' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                  }`}
                >
                  {Icon.mic}
                </button>
              )}
              <label htmlFor="novaia-input" className="sr-only">
                {copy.inputLabel}
              </label>
              <textarea
                id="novaia-input"
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_LEN))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                onPaste={(e) => {
                  const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'));
                  if (f) {
                    e.preventDefault();
                    void attachFile(f);
                  }
                }}
                rows={1}
                placeholder={activeImage ? copy.imagePlaceholder : copy.placeholder}
                className="max-h-40 flex-1 resize-none bg-transparent py-2.5 text-base text-ink outline-none focus-visible:!outline-none placeholder:text-muted md:py-2 md:text-[0.95rem]"
              />
              {loading && !input.trim() ? (
                <button
                  type="button"
                  onClick={stop}
                  aria-label={copy.stop}
                  title={copy.stop}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-transform hover:scale-105 active:scale-95 md:h-10 md:w-10"
                >
                  {Icon.stop}
                </button>
              ) : voiceServer && !input.trim() && !attachment ? (
                <button
                  type="button"
                  onClick={toggleHands}
                  aria-label={hands !== 'off' ? pc.handsStop : pc.handsStart}
                  aria-pressed={hands !== 'off'}
                  title={hands !== 'off' ? pc.handsStop : pc.handsStart}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 md:h-10 md:w-10 ${
                    hands !== 'off' ? 'bg-ink text-paper' : 'bg-accent-soft text-accent'
                  }`}
                >
                  {Icon.wave}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label={copy.send}
                  title={copy.send}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_18px_-8px_rgb(var(--accent)/0.8)] transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100 md:h-10 md:w-10"
                >
                  {Icon.send}
                </button>
              )}
            </div>

            <div className="mt-1 hidden items-center justify-between gap-3 px-1 text-[0.7rem] text-muted sm:flex md:mt-2">
              <span>{copy.footnote}</span>
              {input.length > MAX_LEN * 0.8 && (
                <span className="shrink-0 tabular-nums">
                  {input.length}/{MAX_LEN}
                </span>
              )}
            </div>
          </div>
        </form>
      </section>
      {docsOpen && active && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={() => setDocsOpen(false)}>
          <div
            role="dialog"
            aria-label={pc.docsTitle}
            onClick={(e) => e.stopPropagation()}
            className="nv-glass max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] !bg-paper/90 p-5 sm:rounded-[28px]"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[1rem] font-semibold text-ink">{pc.docsTitle}</h2>
              <button type="button" onClick={() => setDocsOpen(false)} className="rounded-full border border-line px-3 py-1 text-[0.78rem] text-muted hover:text-ink">
                {pc.close}
              </button>
            </div>
            {(() => {
              const list = Object.values(docsByConv[active.id] ?? {}).filter((d) => d.fresh);
              return list.length === 0 ? (
                <p className="text-[0.85rem] text-muted">{pc.docsEmpty}</p>
              ) : (
                <ul className="grid grid-cols-3 gap-3">
                  {list.map((d, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => setViewer(d)} className="block w-full text-left" title={d.label}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={d.thumb} alt="" className="aspect-square w-full rounded-xl border border-line object-cover" />
                        <span className="mt-1 block truncate text-[0.7rem] text-muted">{d.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()}
            <p className="mt-4 text-[0.72rem] text-muted">{pc.docsNote}</p>
          </div>
        </div>
      )}
      {viewer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-4" onClick={() => setViewer(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewer.dataUrl} alt="" className="max-h-full max-w-full rounded-xl bg-white object-contain" />
          <button type="button" onClick={() => setViewer(null)} aria-label={pc.close} className="absolute right-4 top-4 rounded-full bg-paper px-3 py-1 text-[0.8rem] text-ink">
            {pc.close}
          </button>
        </div>
      )}
      {prefsOpen && (
        <NovaiaPrefs
          c={pc}
          locale={locale}
          style={style}
          onStyle={changeStyle}
          loggedIn={!!userId}
          consent={consent}
          onConsent={changeConsent}
          onForget={forgetAll}
          syncOn={syncOn}
          onSync={(v) => void changeSync(v)}
          facts={facts}
          onDeleteFact={(id) => void deleteFact(id)}
          onClose={() => setPrefsOpen(false)}
          error={prefsError}
        />
      )}
    </div>
  );

  // le chat est sorti de la page (portail) pour passer au-dessus du menu et du pied de page du site
  return portalReady ? createPortal(ui, document.body) : null;
}
