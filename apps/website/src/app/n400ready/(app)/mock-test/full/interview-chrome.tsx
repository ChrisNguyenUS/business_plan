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
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import type { N400Dict } from '@/lib/n400/i18n/vi';

/** Stepper's 3 parts, built from the dict so the labels follow the locale. */
function interviewSteps(t: N400Dict['mockTest']['interview']) {
  return [
    { part: t.part1, label: t.civics },
    { part: t.part2, label: t.speaking },
    { part: t.part3, label: t.writing },
  ] as const;
}

/**
 * ●━━○━━○ progress stepper. `completed` = how many parts are finished (1–3);
 * the next step renders as "current" (teal ring) so the interview clearly
 * continues.
 */
export function InterviewStepper({ completed }: { completed: number }) {
  const { dict } = useN400Lang();
  const t = dict.mockTest.interview;
  const steps = interviewSteps(t);
  return (
    <div>
      <div className="text-center text-sm font-semibold text-gray-500">
        {t.stepperLabel}
      </div>
      <div className="mx-auto mt-3 flex max-w-md items-start">
        {steps.map((step, i) => {
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
              {i < steps.length - 1 ? (
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
  const { dict } = useN400Lang();
  const t = dict.mockTest.interview;
  const isSpeaking = next === 'speaking';
  const partNumber = isSpeaking ? 1 : 2;
  const doneLabel = isSpeaking ? t.civics : t.speaking;
  const nextLabel = isSpeaking ? t.speaking : t.writing;
  const passMin = isSpeaking ? FULL_CIVICS_PASS : FULL_SPEAKING_PASS;
  const estimate = isSpeaking ? t.speakingEstimate : t.writingEstimate;
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
          {tFormat(t.complete, { partNumber })}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">
          {t.completedPrefix} <span className="font-bold text-gray-800">{doneLabel}</span>.
          <br className="hidden sm:block" />{' '}
          {isSpeaking ? t.completedCivicsMsg : t.completedSpeakingMsg}
        </p>

        {donePart ? (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-100 p-5">
            <div className="text-sm font-bold text-gray-700">{t.yourScore}</div>
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
                {donePart.passed ? dict.mockTest.summary.passedLabel : dict.mockTest.summary.failedLabel}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {donePart.passed
                ? tFormat(t.partPassed, { doneLabel })
                : tFormat(t.needMore, { remaining })}
            </p>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-center gap-10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="shrink-0 text-teal-600" />
                  <span className="text-sm text-gray-600">{dict.mockTest.result.filterCorrect}</span>
                  <span className="text-lg font-extrabold text-teal-600">{donePart.correct}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="shrink-0 text-red-400" />
                  <span className="text-sm text-gray-600">{dict.mockTest.result.filterWrong}</span>
                  <span className="text-lg font-extrabold text-red-500">
                    {donePart.total - donePart.correct}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mx-auto mt-4 max-w-md">
          <EncourageBanner title={isSpeaking ? t.encourageSpeaking : t.encourageWriting}>
            {isSpeaking ? t.encourageSpeakingMsg : t.encourageWritingMsg}
          </EncourageBanner>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="group mx-auto mt-6 inline-flex w-full max-w-[300px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 text-base font-bold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
        >
          {tFormat(t.continuePart, { nextLabel })}
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
        </button>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-gray-500">
          <Clock size={14} className="shrink-0" />
          {tFormat(t.estimatedTime, { estimate })}
        </div>
      </div>
    </div>
  );
}

/** Teal encouragement strip: lightbulb, short title + message, statue art. */
export function EncourageBanner({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-teal-50/80 text-left">
      <div className="relative z-10 flex items-center gap-3 p-4 pr-24 sm:pr-32">
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
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-44 sm:w-56 [mask-image:linear-gradient(to_right,transparent,black_35%)]"
        aria-hidden
      >
        <Image
          src="/images/n400/Mock test thumbanil/notification-test-transition-screen.png"
          alt=""
          fill
          className="object-cover object-[center_22%]"
          sizes="224px"
        />
      </div>
    </div>
  );
}
