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
  syncOn: boolean;
  onSync: (v: boolean) => void;
  facts: { id: number; content: string }[];
  onDeleteFact: (id: number) => void;
  onClose: () => void;
  error: boolean;
}

/** Panneau de style : six réglages mixables, préréglages, consentement et « tout oublier ». */
export default function NovaiaPrefs({ c, locale, style, onStyle, loggedIn, consent, onConsent, onForget, syncOn, onSync, facts, onDeleteFact, onClose, error }: Props) {
  const toggle = (k: StyleKey, v: string) => {
    const next: Style = { ...style };
    if (next[k] === v) delete next[k];
    else next[k] = v;
    onStyle(next);
  };

  return (
    <div className="absolute inset-0 z-[110] flex justify-end bg-ink/30 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={c.title}
        onClick={(e) => e.stopPropagation()}
        className="nv-glass ns-rise m-0 flex h-full w-full max-w-sm flex-col overflow-y-auto !bg-paper/90 p-6 sm:m-3 sm:h-[calc(100%-1.5rem)] sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">{c.title}</h2>
          <button type="button" onClick={onClose} className="rounded-full bg-ink/5 px-3.5 py-1 text-[0.8rem] font-medium text-ink/80 transition-colors hover:bg-ink/10 hover:text-ink">
            {c.close}
          </button>
        </div>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-muted">{c.intro}</p>

        <p className="mt-5 text-[0.78rem] font-semibold text-muted">{c.presets}</p>
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
                  active ? 'border-accent bg-accent text-white shadow-[0_8px_18px_-8px_rgb(var(--accent)/0.8)]' : 'border-line bg-mist/70 text-ink/85 hover:border-accent/50'
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
                        active ? 'border-accent bg-accent-soft font-semibold text-accent-deep dark:text-accent' : 'border-line text-muted hover:border-accent/50 hover:text-ink'
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

        <div className="mt-6 rounded-[20px] bg-mist/70 p-4 text-[0.82rem] leading-relaxed text-ink/85">
          {!loggedIn ? (
            <>
              <p>{c.signInToSave}</p>
              <a
                href={`/${locale}/login?next=/${locale}/novaia`}
                className="mt-3 inline-block rounded-full bg-accent px-4 py-1.5 text-[0.8rem] font-semibold text-white hover:opacity-90"
              >
                {c.signIn}
              </a>
            </>
          ) : consent === null ? (
            <>
              <p>{c.consentQuestion}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => onConsent(true)} className="rounded-full bg-accent px-4 py-1.5 text-[0.8rem] font-semibold text-white hover:opacity-90">
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

        {loggedIn && (
          <div className="mt-5 rounded-[20px] border border-line/70 p-4 text-[0.82rem] leading-relaxed text-ink/85">
            <p className="text-[0.78rem] font-semibold text-muted">{c.syncTitle}</p>
            <p className="mt-2">{syncOn ? c.syncOn : c.syncOff}</p>
            <button
              type="button"
              onClick={() => onSync(!syncOn)}
              className={
                syncOn
                  ? 'mt-2 text-[0.78rem] text-muted underline-offset-2 hover:text-red-700 hover:underline'
                  : 'mt-3 rounded-full bg-accent px-4 py-1.5 text-[0.8rem] font-semibold text-white hover:opacity-90'
              }
            >
              {syncOn ? c.syncDisable : c.syncEnable}
            </button>
          </div>
        )}

        {loggedIn && consent === true && (
          <div className="mt-5">
            <p className="text-[0.78rem] font-semibold text-muted">{c.memoryTitle}</p>
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
