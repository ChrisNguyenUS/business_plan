'use client';

// Levels 1+2 of the conversation model (spec §3.2–3.3). One small card, never
// a modal: option pills, a quiet Skip, a one-line thanks. The dashboard
// variant adds the 🎯 eyebrow and a dismiss (re-snooze) control instead of an
// inline Skip. interview_date renders a date input.

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import {
  answerProfilePrompt,
  markPromptShown,
  skipProfilePrompt,
  type ActivePrompt,
} from '@/lib/n400/growth/prompt-actions';

const THANKS_MS = 2500;

// `surface` rides on the prompt itself (set by the evaluator), so there is one
// source of truth for it — the card cannot disagree with what got logged.
export function GrowthPromptCard({
  prompt: initial,
  onDone,
}: {
  prompt: ActivePrompt;
  onDone: () => void;
}) {
  const { dict, lang } = useN400Lang();
  const [prompt, setPrompt] = useState(initial);
  const surface = prompt.surface;
  const [phase, setPhase] = useState<'asking' | 'thanks'>('asking');
  const [dateValue, setDateValue] = useState('');
  const [busy, setBusy] = useState(false);
  const shownFor = useRef<string | null>(null);

  // One impression per question shown, even across re-renders. This is the
  // top of the funnel (prompt_shown → prompt_answered / prompt_skipped, all
  // tagged with variant + surface).
  useEffect(() => {
    if (shownFor.current === prompt.questionKey) return;
    shownFor.current = prompt.questionKey;
    void markPromptShown(prompt.questionKey, prompt.variant, prompt.surface);
  }, [prompt.questionKey, prompt.variant, prompt.surface]);

  const text = lang === 'en' ? prompt.textEn : prompt.textVi;

  const submit = async (answer: string) => {
    if (busy) return;
    setBusy(true);
    const res = await answerProfilePrompt(prompt.questionKey, prompt.variant, answer, prompt.surface);
    setBusy(false);
    if (!res.ok) {
      onDone();
      return;
    }
    setPhase('thanks');
    setTimeout(() => {
      if (res.next) {
        // Spec §3.1: interview_date follows interview_notice=yes immediately.
        setPrompt(res.next);
        setDateValue('');
        setPhase('asking');
      } else {
        onDone();
      }
    }, THANKS_MS);
  };

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    await skipProfilePrompt(prompt.questionKey, prompt.variant, prompt.surface);
    setBusy(false);
    onDone();
  };

  if (phase === 'thanks') {
    return (
      <div className="rounded-[24px] border border-teal-100 bg-teal-50/60 px-5 py-4 text-sm font-medium text-teal-700 animate-in fade-in duration-300">
        {dict.growth.thanks}
      </div>
    );
  }

  return (
    <div className="relative rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      {surface === 'dashboard' ? (
        <button
          type="button"
          onClick={skip}
          aria-label={dict.growth.dismiss}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50"
        >
          <X size={16} />
        </button>
      ) : null}

      <div className="text-xs font-bold uppercase tracking-wide text-teal-600">
        {surface === 'dashboard' ? `🎯 ${dict.growth.personalizeTitle}` : dict.growth.oneQuickQuestion}
      </div>
      <div className="mt-1.5 font-bold text-gray-800">{text}</div>

      {prompt.isDate ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 focus:border-teal-400 focus:outline-none"
          />
          <button
            type="button"
            disabled={!dateValue || busy}
            onClick={() => submit(dateValue)}
            className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {dict.growth.saveDate}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {prompt.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={busy}
              onClick={() => submit(opt.value)}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-40"
            >
              {lang === 'en' ? opt.label_en : opt.label_vi}
            </button>
          ))}
        </div>
      )}

      {surface === 'results' ? (
        <button
          type="button"
          disabled={busy}
          onClick={skip}
          className="mt-3 text-xs font-medium text-gray-400 hover:text-gray-600"
        >
          {dict.growth.skip}
        </button>
      ) : null}
    </div>
  );
}
