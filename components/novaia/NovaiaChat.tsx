'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Locale } from '@/lib/i18n/config';
import type { NovaiaCopy } from '@/lib/novaia/copy';

interface UiMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

const MAX_LEN = 1000;
const HISTORY_SENT = 12;

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

export default function NovaiaChat({ locale, copy }: { locale: Locale; copy: NovaiaCopy }) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Le champ grandit avec le texte, jusqu'à 160 px.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim().slice(0, MAX_LEN);
      if (!content || loading) return;

      const userMessage: UiMessage = { id: nextId.current++, role: 'user', content };
      const history = [...messages.filter((m) => !m.error), userMessage].slice(-HISTORY_SENT);

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setLoading(true);

      const addAssistant = (reply: string, error = false) => {
        if (!mounted.current) return;
        setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', content: reply, error }]);
      };

      try {
        const res = await fetch('/api/novaia/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            messages: history.map(({ role, content: c }) => ({ role, content: c })),
          }),
        });

        const data: { reply?: unknown } = await res.json().catch(() => ({}));

        if (!res.ok || typeof data.reply !== 'string') {
          addAssistant(res.status === 429 ? copy.rateLimited : copy.error, true);
        } else {
          addAssistant(data.reply);
        }
      } catch {
        addAssistant(copy.error, true);
      } finally {
        if (mounted.current) setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [messages, loading, locale, copy.error, copy.rateLimited]
  );

  const reset = () => {
    if (loading) return;
    setMessages([]);
    setInput('');
    textareaRef.current?.focus();
  };

  const empty = messages.length === 0;
  const canSend = input.trim().length > 0 && !loading;

  return (
    <div className="mx-auto flex h-[34rem] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-mist md:h-[38rem]">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 border-b border-line bg-paper/60 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Orb size={30} />
          <div>
            <p className="text-[0.95rem] font-semibold leading-none text-ink">{copy.assistantName}</p>
            <p className="mt-1 font-mono text-[0.62rem] uppercase leading-snug tracking-[0.08em] text-muted">
              {copy.previewBadge}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={reset}
          disabled={loading || empty}
          className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[0.78rem] text-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copy.newChat}
        </button>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto px-5 py-6"
        role="log"
        aria-live="polite"
        aria-label={copy.assistantName}
      >
        {empty && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <Orb size={64} />
            <div>
              <h3 className="font-display text-xl font-bold text-ink">{copy.emptyTitle}</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{copy.emptyText}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {copy.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-[0.82rem] text-ink/80 transition-colors hover:border-ink/40 hover:bg-mist"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[0.92rem] leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-md bg-ink text-paper'
                  : m.error
                  ? 'rounded-bl-md border border-line bg-paper italic text-muted'
                  : 'rounded-bl-md border border-line bg-paper text-ink'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-line bg-paper px-4 py-3"
              role="status"
              aria-label={copy.thinking}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
                  style={{ animationDelay: `${i * 180}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Saisie */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-line bg-paper/60 p-3 backdrop-blur"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-paper px-3 py-2 focus-within:border-ink/40">
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
                void send(input);
              }
            }}
            rows={1}
            placeholder={copy.placeholder}
            className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[0.92rem] text-ink outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="shrink-0 rounded-full bg-ink px-4 py-2 text-[0.85rem] font-medium text-paper transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {copy.send}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between px-1 text-[0.7rem] text-muted">
          <span>{copy.footnote}</span>
          {input.length > MAX_LEN * 0.8 && (
            <span className="font-mono">
              {input.length}/{MAX_LEN}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
