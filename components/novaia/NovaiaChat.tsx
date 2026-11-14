'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Locale } from '@/lib/i18n/config';
import type { NovaiaCopy } from '@/lib/novaia/copy';
import FormattedReply from '@/components/novaia/FormattedReply';
import CopyButton from '@/components/novaia/CopyButton';
import { prepareImage, type PreparedImage } from '@/lib/novaia/image';
import type { ReplyState } from '@/lib/novaia/provider';
import NovaiaPrefs from '@/components/novaia/NovaiaPrefs';
import { prefsCopy } from '@/lib/novaia/prefsCopy';
import { cleanStyle, type Style } from '@/lib/novaia/style';
import { createClient } from '@/lib/supabase/client';
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

/** Petit noyau qui respire : rappel discret du « core » du prototype, dans la DA du site. */
function Orb({ size }: { size: number }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <motion.span
        className="absolute inset-0 rounded-full bg-accent/25 blur-md"
        animate={reduce ? undefined : { scale: [0.9, 1.2, 0.9], opacity: [0.45, 0.9, 0.45] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute inset-[16%] border border-accent/40 bg-accent-soft"
        style={{ borderRadius: '50%' }}
        animate={
          reduce
            ? undefined
            : {
                borderRadius: [
                  '50% 50% 50% 50% / 50% 50% 50% 50%',
                  '58% 42% 46% 54% / 43% 57% 48% 52%',
                  '41% 59% 57% 43% / 49% 51% 59% 41%',
                  '50% 50% 50% 50% / 50% 50% 50% 50%',
                ],
              }
        }
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

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
  image: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  ),
};

export default function NovaiaChat({ locale, copy }: { locale: Locale; copy: NovaiaCopy }) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [steps, setSteps] = useState<ReplyState[]>([]); // ce que NovaIA fait en ce moment (recherche, calcul, réflexion, rédaction)
  const [drawer, setDrawer] = useState(false);

  // --- compte, style de réponse et consentement (les préférences ne sont gardées sur le compte qu'avec l'accord de la personne)
  const pc = prefsCopy(locale);
  const [userId, setUserId] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>({});
  const [consent, setConsent] = useState<boolean | null>(null);
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

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid: string | undefined = data?.user?.id;
        if (!uid || cancelled) return;
        setUserId(uid);
        const { data: row } = await supabase.from('novaia_profiles').select('memory_consent, style').eq('user_id', uid).maybeSingle();
        if (cancelled) return;
        if (row) {
          setConsent(row.memory_consent === true);
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
    setConsent(v);
    if (userId) void saveProfile(styleRef.current, v);
  };

  const forgetAll = async () => {
    if (!supabase || !userId || !window.confirm(pc.forgetConfirm)) return;
    const a = await supabase.from('novaia_memories').delete().eq('user_id', userId);
    const b = await supabase.from('novaia_profiles').upsert({ user_id: userId, memory_consent: false, style: {}, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setPrefsError(!!(a.error || b.error));
    setStyle({});
    setConsent(false);
  };
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [attachment, setAttachment] = useState<PreparedImage | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  // image active par conversation : en mémoire seulement (jamais enregistrée), perdue au rechargement de la page
  const [imageByConv, setImageByConv] = useState<Record<string, PreparedImage>>({});
  const fileRef = useRef<HTMLInputElement | null>(null);

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

  // ----- cycle de vie : chargement / sauvegarde de l'historique (navigateur uniquement)

  useEffect(() => {
    mounted.current = true;
    setConvs(loadConversations());
    setReady(true);
    const flush = () => saveConversations(convsRef.current);
    window.addEventListener('pagehide', flush);
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
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
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  }, [messages.length, loadingHere, activeId]);

  // Le champ grandit avec le texte, jusqu'à 160 px.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // ----- échange avec le serveur

  const ask = useCallback(
    async (convId: string, history: StoredMessage[], image?: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoadingId(convId);
      setSteps([]);

      const push = (reply: string, error = false, sources: Source[] = []) => {
        if (!mounted.current) return;
        setConvs((prev) =>
          prev.map((c) =>
            c.id !== convId
              ? c
              : {
                  ...c,
                  updatedAt: Date.now(),
                  messages: [
                    ...c.messages,
                    { id: nextMessageId(c), role: 'assistant' as const, content: reply, error, ...(sources.length ? { sources } : {}) },
                  ].slice(-MAX_MESSAGES),
                }
          )
        );
      };

      const payload = history
        .filter((m) => !m.error)
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
              body: JSON.stringify({ locale, messages: payload, stream: true, style: styleRef.current }),
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
            let ev: { t?: unknown; v?: unknown; reply?: unknown; sources?: unknown; mode?: unknown };
            try {
              ev = JSON.parse(line);
            } catch {
              return;
            }
            if (ev.t === 'etat' && typeof ev.v === 'string') {
              const v = ev.v as ReplyState;
              if (mounted.current) setSteps((prev) => (prev.includes(v) ? prev : [...prev, v]));
            } else if (ev.t === 'fin' && typeof ev.reply === 'string') {
              answered = true;
              push(ev.reply, false, cleanSources(ev.sources));
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
          const data: { reply?: unknown } = await res.json().catch(() => ({}));

          if (!res.ok || typeof data.reply !== 'string') {
            push(res.status === 429 ? copy.rateLimited : res.status === 413 ? copy.imageTooBig : copy.error, true);
          } else {
            push(data.reply);
          }
        }
      } catch {
        if (!controller.signal.aborted) push(copy.error, true);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        if (mounted.current) setLoadingId((cur) => (cur === convId ? null : cur));
      }
    },
    [locale, copy.error, copy.rateLimited, copy.imageTooBig]
  );

  const send = useCallback(
    (text: string) => {
      const known = activeId ? imageByConv[activeId] : undefined;
      const image = (attachment ?? known)?.dataUrl; // nouvelle image, sinon celle déjà active dans la conversation
      const content = text.trim().slice(0, MAX_LEN) || (attachment ? copy.imageDefaultQuestion : '');
      if (!content || loading) return;

      let convId = activeId;
      let history: StoredMessage[];

      if (!convId || !convs.some((c) => c.id === convId)) {
        const c = newConversation(titleFrom(content));
        const userMessage: StoredMessage = { id: 1, role: 'user', content, ...(image ? { image: true } : {}) };
        c.messages = [userMessage];
        convId = c.id;
        history = c.messages;
        setConvs((prev) => [c, ...prev].slice(0, MAX_CONVERSATIONS));
        setActiveId(c.id);
      } else {
        const cur = convs.find((c) => c.id === convId) as Conversation;
        const userMessage: StoredMessage = { id: nextMessageId(cur), role: 'user', content, ...(image ? { image: true } : {}) };
        history = [...cur.messages, userMessage];
        const id = convId;
        setConvs((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, updatedAt: Date.now(), messages: [...c.messages, userMessage].slice(-MAX_MESSAGES) } : c
          )
        );
      }

      setInput('');
      if (attachment) {
        const id = convId;
        setImageByConv((prev) => ({ ...prev, [id]: attachment }));
      }
      setAttachment(null);
      setAttachError(null);
      void ask(convId, history, image);
    },
    [activeId, convs, loading, ask, attachment, imageByConv, copy.imageDefaultQuestion]
  );

  const attachFile = async (file: File | undefined) => {
    if (!file) return;
    setAttachError(null);
    try {
      setAttachment(await prepareImage(file));
    } catch (e) {
      setAttachment(null);
      setAttachError(e instanceof Error && e.message === 'size' ? copy.imageTooBig : copy.imageError);
    }
  };

  const stop = () => {
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
    if (activeId === c.id) setActiveId(null);
  };

  const clearAll = () => {
    if (loading || convs.length === 0) return;
    if (!window.confirm(copy.clearAllConfirm)) return;
    setConvs([]);
    setActiveId(null);
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
  const canSend = (input.trim().length > 0 || attachment !== null) && !loading;
  const lastMessage = messages[messages.length - 1];
  // une réponse à une image ne se régénère pas : l'image n'est pas conservée
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const canRegenerate = !loading && lastMessage?.role === 'assistant' && !lastUserMessage?.image;
  const headerTitle = active ? active.title : copy.untitled;

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen overflow-hidden bg-paper text-ink">
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
        className={`absolute inset-y-0 left-0 z-30 flex w-72 max-w-[85%] flex-col border-r border-line bg-mist transition-transform duration-200 md:static md:w-72 md:max-w-none md:translate-x-0 ${
          drawer ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label={copy.sidebarTitle}
      >
        <div className="flex items-center justify-between px-4 pt-3 sm:hidden">
          <a href={`/${locale}`} className="text-[0.78rem] text-muted hover:text-ink">
            ← {copy.backToSite}
          </a>
        </div>
        <div className="flex items-center gap-2 border-b border-line p-3">
          <button
            type="button"
            onClick={newChat}
            disabled={loading}
            className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-mist px-3 py-2 text-[0.85rem] font-medium text-ink transition-colors hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-50"
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
              <p className="px-2 pb-1 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted">{g.label}</p>
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
                          className="w-full rounded-lg border border-ink/40 bg-paper px-2.5 py-2 text-[0.85rem] text-ink outline-none"
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openConv(c.id)}
                            onDoubleClick={() => startRename(c)}
                            aria-current={isActive ? 'true' : undefined}
                            className={`block w-full truncate rounded-lg px-2.5 py-2 pr-14 text-left text-[0.85rem] transition-colors ${
                              isActive ? 'bg-mist font-medium text-ink' : 'text-ink/75 hover:bg-mist/70'
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
                              className="rounded-md p-1.5 text-muted transition-colors hover:bg-paper hover:text-ink"
                            >
                              {Icon.pencil}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeConv(c)}
                              disabled={loadingId === c.id}
                              aria-label={copy.remove}
                              title={copy.remove}
                              className="rounded-md p-1.5 text-muted transition-colors hover:bg-paper hover:text-ink disabled:opacity-30"
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

        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-[0.7rem] text-muted">
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
        <div className="flex items-center gap-3 border-b border-line bg-paper/60 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label={copy.openMenu}
            className="shrink-0 rounded-lg p-1.5 text-ink/80 transition-colors hover:bg-mist md:hidden"
          >
            {Icon.menu}
          </button>
          <a
            href={`/${locale}`}
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.78rem] text-muted transition-colors hover:border-ink/40 hover:text-ink sm:flex"
          >
            <span aria-hidden>←</span>
            {copy.backToSite}
          </a>
          <Orb size={30} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.95rem] font-semibold leading-none text-ink">
              {active ? headerTitle : copy.assistantName}
            </p>
            <p className="mt-1 truncate font-mono text-[0.62rem] uppercase leading-snug tracking-[0.08em] text-muted">
              {active ? copy.assistantName : copy.previewBadge}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPrefsOpen(true)}
            className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[0.78rem] text-muted transition-colors hover:border-ink/40 hover:text-ink"
          >
            {pc.open}
            {Object.keys(style).length > 0 && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" aria-hidden />}
          </button>
          {!userId && (
            <a
              href={`/${locale}/login?next=/${locale}/novaia`}
              className="hidden shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-[0.78rem] font-medium text-paper hover:opacity-85 sm:block"
            >
              {pc.signIn}
            </a>
          )}
          <button
            type="button"
            onClick={newChat}
            disabled={loading || empty}
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.78rem] text-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:flex md:hidden"
          >
            {Icon.plus}
            {copy.newChat}
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
          role="log"
          aria-live="polite"
          aria-label={copy.assistantName}
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col space-y-4">
            {empty && (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
                <Orb size={88} />
                <div>
                  <h3 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{copy.greeting}</h3>
                  <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">{copy.emptyText}</p>
                </div>
                <div className="grid w-full max-w-2xl gap-2.5 sm:grid-cols-3">
                  {copy.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      disabled={loading}
                      className="rounded-2xl border border-line bg-mist px-4 py-3.5 text-left text-[0.85rem] leading-snug text-ink/85 transition-colors hover:border-ink/40 hover:bg-paper disabled:opacity-50"
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
                  <div
                    className={`break-words text-[0.98rem] leading-[1.7] ${
                      m.role === 'user'
                        ? 'max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-ink px-4 py-2.5 text-paper'
                        : m.error
                        ? 'max-w-full italic text-muted'
                        : 'w-full max-w-full text-ink'
                    }`}
                  >
                    {m.image && (
                      <span className="mb-1 flex items-center gap-1 text-[0.72rem] opacity-70">
                        {Icon.image}
                        {copy.imageAttached}
                      </span>
                    )}
                    {m.role === 'assistant' && !m.error ? (
                      <FormattedReply text={m.content} copyLabel={copy.copy} copiedLabel={copy.copied} />
                    ) : (
                      m.content
                    )}
                  </div>

                  {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1 text-[0.72rem] text-muted">
                      <span className="mr-0.5">{copy.sources}</span>
                      {m.sources.map((s) => (
                        <a
                          key={s.url}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="max-w-[14rem] truncate rounded-full border border-line px-2.5 py-0.5 transition-colors hover:border-ink hover:text-ink"
                          title={s.title}
                        >
                          {s.title}
                        </a>
                      ))}
                    </div>
                  )}

                  {m.role === 'assistant' && (
                    <div className="mt-1 flex items-center gap-3 px-1 text-[0.72rem] text-muted">
                      {!m.error && <CopyButton text={m.content} label={copy.copy} copiedLabel={copy.copied} />}
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
              <div className="flex justify-start">
                <div
                  className="min-w-[11rem] py-1 text-[0.85rem] text-muted"
                  role="status"
                  aria-live="polite"
                  aria-label={copy.thinking}
                >
                  {steps.length > 1 && (
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
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
                          style={{ animationDelay: `${i * 180}ms` }}
                        />
                      ))}
                    </span>
                    <span>{steps.length ? stepLabel(steps[steps.length - 1]) : copy.thinking}…</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-line bg-paper/60 p-3 backdrop-blur"
        >
          <div className="mx-auto w-full max-w-3xl">
            {userId && consent === null && !prefsOpen && (
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-mist px-4 py-2.5 text-[0.82rem] text-ink/85">
                <span className="min-w-0 flex-1">{pc.consentQuestion}</span>
                <span className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => changeConsent(true)} className="rounded-full bg-ink px-3.5 py-1 text-[0.78rem] font-medium text-paper hover:opacity-85">
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
                    <span>{attachment ? copy.imageAttached : copy.imageActive}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachment(null);
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
            <div className="flex items-end gap-2 rounded-3xl border border-line bg-mist px-4 py-2.5 shadow-sm transition-colors focus-within:border-ink/40 focus-within:bg-paper">
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
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                aria-label={copy.attach}
                title={`${copy.attach} — ${copy.attachHint}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-mist hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              >
                {Icon.clip}
              </button>
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
                className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[0.92rem] text-ink outline-none placeholder:text-muted"
              />
              {loading ? (
                <button
                  type="button"
                  onClick={stop}
                  aria-label={copy.stop}
                  title={copy.stop}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-mist"
                >
                  {Icon.stop}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label={copy.send}
                  title={copy.send}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {Icon.send}
                </button>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[0.7rem] text-muted">
              <span>{copy.footnote}</span>
              {input.length > MAX_LEN * 0.8 && (
                <span className="shrink-0 font-mono">
                  {input.length}/{MAX_LEN}
                </span>
              )}
            </div>
          </div>
        </form>
      </section>
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
          onClose={() => setPrefsOpen(false)}
          error={prefsError}
        />
      )}
    </div>
  );
}
