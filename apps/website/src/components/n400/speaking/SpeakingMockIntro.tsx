'use client';

// Thi thử Speaking intro (speaking spec §5.1). The page shows it only when voice
// is available here, so the learner can pick "Cách trả lời" before starting. The
// card follows the Civics mock intro hero; the picker is the Civics mock's (same
// label, toggle and labels).

import { ArrowRight, ClipboardCheck, Play } from 'lucide-react';
import { Card } from '@/components/n400/ui';
import { AnswerModeToggle, type PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import { useN400Lang } from '@/lib/n400/i18n/provider';

export function SpeakingMockIntro({
  mode,
  onModeChange,
  onStart,
}: {
  mode: PracticeAnswerMode;
  onModeChange: (m: PracticeAnswerMode) => void;
  onStart: () => void;
}) {
  const { dict } = useN400Lang();
  const test = dict.mockTest.tests.speaking;
  return (
    <div className="mx-auto w-full max-w-2xl animate-in fade-in duration-300">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-50/80 via-white to-white"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-teal-700">
            <ClipboardCheck size={13} />
            Mock Exam
          </div>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-gray-800 sm:text-4xl">{test.title}</h2>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">{test.desc}</p>
          <p className="mt-2 text-sm font-medium text-gray-600">
            {test.questions} · {test.duration} · {test.passRule}
          </p>

          <div className="mt-7">
            <p className="mb-2 text-sm font-semibold text-gray-700">{dict.oral.mockModeLabel}</p>
            <AnswerModeToggle
              mode={mode}
              onChange={onModeChange}
              labels={{ choice: dict.oral.modeChoice, voice: dict.oral.mockModeVoice }}
            />
          </div>

          <button
            type="button"
            onClick={onStart}
            className="group mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-teal-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-600/30 active:translate-y-0 active:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:py-5 sm:text-lg"
          >
            <Play size={18} className="shrink-0 fill-current" />
            {dict.mockTest.intro.startButtonFirst}
            <ArrowRight
              size={18}
              className="shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </button>
        </div>
      </Card>
    </div>
  );
}
