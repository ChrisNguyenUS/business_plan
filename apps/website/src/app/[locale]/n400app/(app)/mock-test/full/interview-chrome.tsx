'use client';

// Shared chrome for the Full Interview flow — the 3-step progress stepper shown
// on both transition screens and the final result, plus the calm encouragement
// banner (lightbulb + statue). These read as a short pause in one continuous
// interview, not as standalone result screens.

import Image from 'next/image';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Lightbulb,
  PartyPopper,
  XCircle,
} from 'lucide-react';
import { FULL_CIVICS_PASS, FULL_SPEAKING_PASS } from '@/lib/n400/full-interview';

export const INTERVIEW_STEPS = [
  { part: 'Phần 1', label: 'Civics' },
  { part: 'Phần 2', label: 'Speaking' },
  { part: 'Phần 3', label: 'Writing' },
] as const;

/**
 * ●━━○━━○ progress stepper. `completed` = how many parts are finished (1–3);
 * the next step renders as "current" (teal ring) so the interview clearly
 * continues.
 */
export function InterviewStepper({ completed }: { completed: number }) {
  return (
    <div>
      <div className="text-center text-sm font-semibold text-gray-500">
        Tiến trình Full Interview
      </div>
      <div className="mx-auto mt-3 flex max-w-md items-start">
        {INTERVIEW_STEPS.map((step, i) => {
          const isDone = i < completed;
          const isCurrent = i === completed;
          return (
            <div key={step.label} className="flex flex-1 items-start last:flex-none">
              <div className="flex w-16 flex-col items-center">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isDone
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : isCurrent
                        ? 'border-teal-600 bg-white'
                        : 'border-gray-300 bg-white'
                  }`}
                  aria-hidden
                >
                  {isDone ? <Check size={14} strokeWidth={3} /> : null}
                </span>
                <span
                  className={`mt-2 text-xs font-bold ${
                    isDone || isCurrent ? 'text-teal-700' : 'text-gray-500'
                  }`}
                >
                  {step.part}
                </span>
                <span
                  className={`text-xs font-medium ${
                    isDone || isCurrent ? 'text-teal-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < INTERVIEW_STEPS.length - 1 ? (
                <div
                  className={`mt-[13px] h-0.5 flex-1 rounded-full ${
                    isDone ? 'bg-teal-500' : 'bg-gray-200'
                  }`}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Transition screen between parts — a short pause in the interview, not a
 * result screen: stepper on top, quiet score with a small status badge and an
 * actionable "cần thêm N câu" line, then a contextual "Tiếp tục phần …" CTA.
 */
export function InterludeScreen({
  next,
  donePart,
  onContinue,
}: {
  next: 'speaking' | 'writing';
  donePart: { correct: number; total: number; passed: boolean } | null;
  onContinue: () => void;
}) {
  const isSpeaking = next === 'speaking';
  const partNumber = isSpeaking ? 1 : 2;
  const doneLabel = isSpeaking ? 'Civics' : 'Speaking';
  const nextLabel = isSpeaking ? 'Speaking' : 'Writing';
  const passMin = isSpeaking ? FULL_CIVICS_PASS : FULL_SPEAKING_PASS;
  const estimate = isSpeaking ? '7–10 phút' : '5–8 phút';
  const remaining = Math.max(0, passMin - (donePart?.correct ?? 0));

  return (
    <div className="flex min-h-full animate-in fade-in duration-300">
      <div className="m-auto w-full max-w-[740px] rounded-[24px] border border-slate-100 bg-white p-6 text-center shadow-sm sm:p-8">
        <InterviewStepper completed={partNumber} />

        <div
          className="mx-auto mt-7 flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 text-teal-600"
          aria-hidden
        >
          <PartyPopper size={32} />
        </div>
        <h1 className="mt-4 text-[1.75rem] font-extrabold leading-tight text-gray-900">
          Hoàn thành Phần {partNumber}!
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">
          Bạn đã hoàn thành phần <span className="font-bold text-gray-800">{doneLabel}</span>.
          <br className="hidden sm:block" />{' '}
          {isSpeaking
            ? 'Làm tốt lắm! Hãy tiếp tục phần tiếp theo.'
            : 'Tiến bộ lắm! Cùng bước vào phần cuối nhé.'}
        </p>

        {donePart ? (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-100 p-5">
            <div className="text-sm font-bold text-gray-700">Điểm của bạn</div>
            <div className="mt-1.5 flex items-center justify-center gap-3">
              <div className="text-4xl font-extrabold text-gray-900">
                {donePart.correct}
                <span className="text-xl font-bold text-gray-400">/{donePart.total}</span>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  donePart.passed ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-600'
                }`}
              >
                {donePart.passed ? 'Đạt' : 'Chưa đạt'}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {donePart.passed
                ? `Bạn đã vượt qua phần ${doneLabel}.`
                : `Cần thêm ${remaining} câu đúng để đạt phần này.`}
            </p>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-center gap-10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="shrink-0 text-teal-600" />
                  <span className="text-sm text-gray-600">Đúng</span>
                  <span className="text-lg font-extrabold text-teal-600">{donePart.correct}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="shrink-0 text-red-400" />
                  <span className="text-sm text-gray-600">Sai</span>
                  <span className="text-lg font-extrabold text-red-500">
                    {donePart.total - donePart.correct}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mx-auto mt-4 max-w-md">
          <EncourageBanner title={isSpeaking ? 'Cố lên!' : 'Sắp xong rồi!'}>
            {isSpeaking
              ? 'Bạn vẫn có thể đậu Full Interview. Hãy làm thật tốt các phần tiếp theo!'
              : 'Bạn đang làm rất tốt! Còn một phần cuối — hoàn thành thật tốt phần Writing nhé!'}
          </EncourageBanner>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="group mx-auto mt-6 inline-flex w-full max-w-[300px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 text-base font-bold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
        >
          Tiếp tục phần {nextLabel}
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
        </button>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-gray-500">
          <Clock size={14} className="shrink-0" />
          Thời gian dự kiến: {estimate}
        </div>
      </div>
    </div>
  );
}

/** Teal encouragement strip: lightbulb, short title + message, statue art. */
export function EncourageBanner({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-teal-50/80 text-left">
      <div className="flex items-center gap-3 p-4 pr-24 sm:pr-32">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-teal-600 shadow-sm"
          aria-hidden
        >
          <Lightbulb size={18} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-800">{title}</div>
          <div className="mt-0.5 text-[0.8125rem] leading-relaxed text-gray-600">{children}</div>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-1 bottom-0 h-20 w-24 sm:w-28" aria-hidden>
        <Image
          src="/images/n400/illu-statue-city.png"
          alt=""
          fill
          className="object-contain object-bottom"
          sizes="112px"
        />
      </div>
    </div>
  );
}
