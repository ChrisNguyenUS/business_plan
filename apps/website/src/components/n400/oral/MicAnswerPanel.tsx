'use client';

// Mic (or in-app typed) answer surface for Civics practice. Spec §4.2–4.3, D12.
// Renders inside the existing practice card in place of the option grid.

import { useState } from 'react';
import { Loader2, Mic, RotateCcw, Square } from 'lucide-react';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import { HARD_STOP_MS } from '@/lib/n400/oral/speech-controller';
import type { SpeechApi } from '@/lib/n400/oral/use-speech-recognition';

const HINT_KEY = 'n400.oral.hintSeen';

function hintSeen(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return true;
  }
}

function ProgressRing() {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="4" strokeDasharray={c}>
        <animate attributeName="stroke-dashoffset" from="0" to={String(c)} dur={`${HARD_STOP_MS / 1000}s`} fill="freeze" />
      </circle>
    </svg>
  );
}

const secondaryBtn =
  'flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50';
const primaryBtn =
  'flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700 disabled:opacity-40';

export interface MicAnswerPanelProps {
  input: 'mic' | 'typed';
  mic: SpeechApi;
  /** True once the answer is graded: no more speaking or typing (spec §4.2). */
  locked: boolean;
  /** The taught answer to offer when the grade is `near`; null otherwise. */
  nearAnswer: string | null;
  onSubmit: (text: string) => void;
  onNearAnswer: (yes: boolean) => void;
  /** 'mock': echo "App nghe được", confirm instead of grade, retry limited by the caller (spec §4.2, §6). */
  variant?: 'practice' | 'mock';
  canRetry?: boolean;
  onRetry?: () => void;
  /** Overrides the typed-mode notice (e.g. "mic lost mid-test"). */
  notice?: string;
  /** When set, the error box offers switching to typed input. */
  onUseTyped?: () => void;
  /** A status line under the answer, e.g. the Yes/No re-ask (speaking spec §4). */
  prompt?: string;
}

export function MicAnswerPanel({
  input,
  mic,
  locked,
  nearAnswer,
  onSubmit,
  onNearAnswer,
  variant = 'practice',
  canRetry = true,
  onRetry,
  notice,
  onUseTyped,
  prompt,
}: MicAnswerPanelProps) {
  const { dict } = useN400Lang();
  const t = dict.oral;
  const mock = variant === 'mock';
  const submitLabel = mock ? (input === 'typed' ? t.confirm : t.yes) : t.grade;
  const [showHint, setShowHint] = useState(() => !hintSeen());
  const [typed, setTyped] = useState('');

  const dismissHint = () => {
    setShowHint(false);
    try {
      window.localStorage.setItem(HINT_KEY, '1');
    } catch {
      // Private mode — the hint just shows again next time.
    }
  };

  const hint = showHint ? (
    <div
      className="flex w-full items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-3 text-gray-700"
      style={{ fontSize: 'clamp(0.8125rem, 1.4vw, 0.9375rem)' }}
    >
      <span className="flex-1">
        {t.hint}
        {mic.persistent && input === 'mic' ? <span className="mt-1 block">{t.hintPersistent}</span> : null}
      </span>
      <button type="button" onClick={dismissHint} className="shrink-0 font-semibold text-teal-700">
        {t.hintDismiss}
      </button>
    </div>
  ) : null;

  const nearRow =
    nearAnswer !== null ? (
      <div className="w-full rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
        <p className="mb-2 font-semibold text-gray-800">{tFormat(t.didYouMean, { answer: nearAnswer })}</p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onNearAnswer(false)} className={secondaryBtn}>
            {t.no}
          </button>
          <button type="button" onClick={() => onNearAnswer(true)} className={primaryBtn}>
            {t.yes}
          </button>
        </div>
      </div>
    ) : null;

  const promptRow = prompt ? (
    <div className="w-full rounded-2xl border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-gray-700" role="status">
      {prompt}
    </div>
  ) : null;

  if (input === 'typed') {
    const value = typed.trim();
    return (
      <div className="flex flex-col gap-3">
        {hint}
        <p className="text-gray-600" style={{ fontSize: 'clamp(0.8125rem, 1.4vw, 0.9375rem)' }}>
          {notice ?? t.inAppNotice}
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (value && !locked) onSubmit(value);
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={locked}
            placeholder={t.typedPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="done"
            className="min-w-0 flex-1 rounded-xl border-2 border-gray-200 px-3 py-3 text-gray-800 outline-none focus:border-teal-400 disabled:bg-gray-50"
            style={{ fontSize: '16px' }}
          />
          {!locked ? (
            <button type="submit" disabled={!value} className={`${primaryBtn} px-5`}>
              {submitLabel}
            </button>
          ) : null}
        </form>
        {promptRow}
        {nearRow}
      </div>
    );
  }

  const busy = mic.state === 'requesting_permission' || mic.state === 'listening' || mic.state === 'processing';
  const errorText =
    mic.error === null
      ? null
      : mic.error === 'no-speech'
        ? t.errNoSpeech
        : mic.error === 'not-allowed'
          ? t.errNotAllowed
          : mic.error === 'stalled'
            ? t.errStalled
            : t.errGeneric;
  const canSpeak = !locked && mic.state !== 'transcript';

  return (
    <div className="flex flex-col items-center gap-3">
      {hint}
      {canSpeak ? (
        <>
          <button
            type="button"
            onClick={busy ? mic.stop : mic.start}
            aria-label={busy ? t.stop : t.tapToSpeak}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-md transition-colors ${
              busy ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {busy && mic.startedAt !== null ? <ProgressRing key={mic.startedAt} /> : null}
            {mic.state === 'processing' ? (
              <Loader2 className="animate-spin" size={28} />
            ) : busy ? (
              <Square size={24} fill="currentColor" />
            ) : (
              <Mic size={30} />
            )}
          </button>
          <p className="text-sm text-gray-500">
            {mic.state === 'processing' ? t.processing : busy ? t.listening : t.tapToSpeak}
          </p>
        </>
      ) : null}

      {mic.transcript ? (
        <div className="w-full">
          {mock && mic.state === 'transcript' ? (
            <p className="mb-1 text-sm font-semibold text-gray-600">{t.appHeard}</p>
          ) : null}
          <div
            className="w-full rounded-2xl border-2 border-gray-200 bg-white p-3 font-medium text-gray-800"
            aria-live="polite"
          >
            {mic.transcript}
          </div>
        </div>
      ) : null}

      {promptRow}

      {errorText ? (
        <div className="w-full rounded-2xl border-l-4 border-orange-500 bg-orange-50 p-3 text-sm text-gray-700" role="status">
          {errorText}
          {onUseTyped ? (
            <button type="button" onClick={onUseTyped} className="mt-2 block font-semibold text-teal-700">
              {t.useTyped}
            </button>
          ) : null}
        </div>
      ) : null}

      {!locked && mic.state === 'transcript' ? (
        <div className={`grid w-full gap-3 ${canRetry ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {canRetry ? (
            <button
              type="button"
              onClick={() => {
                onRetry?.();
                mic.reset();
                mic.start();
              }}
              className={secondaryBtn}
            >
              <RotateCcw size={16} />
              {t.retry}
            </button>
          ) : null}
          <button type="button" onClick={() => onSubmit(mic.transcript)} className={primaryBtn}>
            {submitLabel}
          </button>
        </div>
      ) : null}

      {nearRow}
    </div>
  );
}
