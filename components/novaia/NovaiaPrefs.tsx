'use client';

import { PRESETS, STYLE_KEYS, STYLE_OPTIONS, sameStyle, type Style, type StyleKey } from '@/lib/novaia/style';
import type { PrefsCopy } from '@/lib/novaia/prefsCopy';

interface Props {
  c: PrefsCopy;
  locale: string;
  style: Style;
  onStyle: (s: Style) => void;
  loggedIn: boolean;
  consent: boolean | null;
  onConsent: (v: boolean) => void;
  onForget: () => void;
  facts: { id: number; content: string }[];
  onDeleteFact: (id: number) => void;
  onClose: () => void;
  error: boolean;
}

/** Panneau de style : six réglages mixables, préréglages, consentement et « tout oublier ». */
export default function NovaiaPrefs({ c, locale, style, onStyle, loggedIn, consent, onConsent, onForget, facts, onDeleteFact, onClose, error }: Props) {
  const toggle = (k: StyleKey, v: string) => {
    const next: Style = { ...style };
    if (next[k] === v) delete next[k];
    else next[k] = v;
    onStyle(next);
  };

  return (
    <div className="absolute inset-0 z-[110] flex justify-end bg-ink/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={c.title}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-line bg-paper p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink">{c.title}</h2>
          <button type="button" onClick={onClose} className="rounded-full border border-line px-3 py-1 text-[0.78rem] text-muted hover:border-ink/40 hover:text-ink">
            {c.close}
          </button>
        </div>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-muted">{c.intro}</p>

        <p className="mt-5 text-[0.7rem] font-medium uppercase tracking-[0.08em] text-muted">{c.presets}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active = sameStyle(style, p.style);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onStyle({ ...p.style })}
                aria-pressed={active}
                className={`rounded-full border px-3.5 py-1.5 text-[0.82rem] transition-colors ${
                  active ? 'border-ink bg-ink text-paper' : 'border-line bg-mist text-ink/85 hover:border-ink/40'
                }`}
              >
                {c.presetNames[p.id]}
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-4">
          {STYLE_KEYS.map((k) => (
            <div key={k}>
              <p className="text-[0.8rem] font-medium text-ink">{c.settings[k]}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {STYLE_OPTIONS[k].map((v) => {
                  const active = style[k] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggle(k, v)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1 text-[0.8rem] transition-colors ${
                        active ? 'border-accent bg-accent-soft text-ink' : 'border-line text-muted hover:border-ink/40 hover:text-ink'
                      }`}
                    >
                      {c.values[k][v]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[0.72rem] text-muted">{c.hintToggle}</p>
        <button type="button" onClick={() => onStyle({})} className="mt-2 self-start text-[0.78rem] text-muted underline-offset-2 hover:text-ink hover:underline">
          {c.reset}
        </button>

        <div className="mt-6 rounded-2xl border border-line bg-mist p-4 text-[0.82rem] leading-relaxed text-ink/85">
          {!loggedIn ? (
            <>
              <p>{c.signInToSave}</p>
              <a
                href={`/${locale}/login?next=/${locale}/novaia`}
                className="mt-3 inline-block rounded-full bg-ink px-4 py-1.5 text-[0.8rem] font-medium text-paper hover:opacity-85"
              >
                {c.signIn}
              </a>
            </>
          ) : consent === null ? (
            <>
              <p>{c.consentQuestion}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => onConsent(true)} className="rounded-full bg-ink px-4 py-1.5 text-[0.8rem] font-medium text-paper hover:opacity-85">
                  {c.consentYes}
                </button>
                <button type="button" onClick={() => onConsent(false)} className="rounded-full border border-line px-4 py-1.5 text-[0.8rem] text-ink hover:border-ink/40">
                  {c.consentNo}
                </button>
              </div>
            </>
          ) : (
            <>
              <p>{consent ? c.consentOn : c.consentOff}</p>
              <button
                type="button"
                onClick={() => onConsent(!consent)}
                className="mt-2 text-[0.78rem] text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                {consent ? c.consentNo : c.consentAsk}
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                <a href={`/${locale}/account`} className="text-[0.78rem] text-muted underline-offset-2 hover:text-ink hover:underline">
                  {c.account}
                </a>
                <button type="button" onClick={onForget} className="text-[0.78rem] text-red-700 underline-offset-2 hover:underline">
                  {c.forget}
                </button>
              </div>
            </>
          )}
          {error && <p className="mt-2 text-[0.75rem] text-red-700">{c.saveError}</p>}
        </div>

        {loggedIn && consent === true && (
          <div className="mt-5">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-muted">{c.memoryTitle}</p>
            {facts.length === 0 ? (
              <p className="mt-2 text-[0.8rem] leading-relaxed text-muted">{c.memoryEmpty}</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {facts.map((f) => (
                  <li key={f.id} className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2 text-[0.82rem] text-ink/85">
                    <span className="min-w-0 break-words">{f.content}</span>
                    <button type="button" onClick={() => onDeleteFact(f.id)} className="shrink-0 text-[0.75rem] text-muted underline-offset-2 hover:text-red-700 hover:underline">
                      {c.memoryDelete}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
