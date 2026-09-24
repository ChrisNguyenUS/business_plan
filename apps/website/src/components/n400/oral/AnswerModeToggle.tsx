'use client';

import { ListChecks, Mic } from 'lucide-react';

export type PracticeAnswerMode = 'choice' | 'voice';

export function AnswerModeToggle({
  mode,
  onChange,
  labels,
  disabled = false,
}: {
  mode: PracticeAnswerMode;
  onChange: (mode: PracticeAnswerMode) => void;
  labels: Record<PracticeAnswerMode, string>;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-full bg-gray-100 p-1">
      {(['choice', 'voice'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          disabled={disabled}
          onClick={() => onChange(m)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
            mode === m ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {m === 'voice' ? <Mic size={14} /> : <ListChecks size={14} />}
          {labels[m]}
        </button>
      ))}
    </div>
  );
}
