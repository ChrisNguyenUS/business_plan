'use client';

// MockTestResult — final result screen of the Full Interview. One calm centered
// card: stepper (all parts done) → verdict hero → overall score → one card per
// section (score + progress + how many more to pass) → personalized
// recommendation → Review Answers / Retry CTAs. No extra charts or statistics.

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, FileText, RotateCcw, Trophy } from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';
import { InterviewStepper, EncourageBanner } from './interview-chrome';
import {
  N400_QUESTIONS_BY_ID,
  N400_CATEGORY_LABELS,
  type N400CategoryKey,
} from '@/lib/n400/questions-data';
import {
  FULL_CIVICS_PASS,
  FULL_SPEAKING_PASS,
  FULL_WRITING_PASS,
} from '@/lib/n400/full-interview';
import type { CivicsAnswer } from './ReviewAnswers';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';

interface PartResult {
  correct: number;
  total: number;
  passed: boolean;
}

interface MockTestResultProps {
  civics: PartResult | null;
  speaking: PartResult | null;
  writing: PartResult | null;
  overall: boolean;
  totalScore: number;
  totalQuestions: number;
  civicsAnswers: CivicsAnswer[];
  onRetake: () => void;
  onReviewAnswers: () => void;
  basePath: string; // e.g. /n400ready
}

type SectionKey = 'civics' | 'speaking' | 'writing';

interface Recommendation {
  title: string;
  desc: string;
  cta: { label: string; href?: string; onClick?: () => void };
}

function findWeakestCategory(civicsAnswers: CivicsAnswer[]): N400CategoryKey | null {
  const catWrong: Partial<Record<N400CategoryKey, number>> = {};
  for (const a of civicsAnswers) {
    if (a.wasCorrect) continue;
    const q = N400_QUESTIONS_BY_ID.get(a.questionId);
    if (!q) continue;
    catWrong[q.category] = (catWrong[q.category] ?? 0) + 1;
  }
  let maxCat: N400CategoryKey | null = null;
  let maxCount = 0;
  for (const [cat, count] of Object.entries(catWrong) as [N400CategoryKey, number][]) {
    if (count > maxCount) {
      maxCat = cat;
      maxCount = count;
    }
  }
  return maxCat;
}

export default function MockTestResult({
  civics,
  speaking,
  writing,
  overall,
  totalScore,
  totalQuestions,
  civicsAnswers,
  onRetake,
  onReviewAnswers,
  basePath,
}: MockTestResultProps) {
  const { dict } = useN400Lang();
  const civicsWrongCount = civicsAnswers.filter((a) => !a.wasCorrect).length;

  const sections: {
    key: SectionKey;
    icon: string;
    label: string;
    result: PartResult | null;
    passMin: number;
  }[] = [
    { key: 'civics', icon: '🏛', label: 'Civics', result: civics, passMin: FULL_CIVICS_PASS },
    { key: 'speaking', icon: '💬', label: 'Speaking', result: speaking, passMin: FULL_SPEAKING_PASS },
    { key: 'writing', icon: '✍️', label: 'Writing', result: writing, passMin: FULL_WRITING_PASS },
  ];

  // Personalized recommendation — always points at the weakest section
  // (largest relative shortfall against its pass mark) among the failed parts.
  const recommendation = useMemo<Recommendation | null>(() => {
    const failed = sections
      .filter((s) => s.result && !s.result.passed)
      .map((s) => ({
        ...s,
        shortfall: (s.passMin - (s.result?.correct ?? 0)) / s.passMin,
      }))
      .sort((a, b) => b.shortfall - a.shortfall);
    const weakest = failed[0];
    if (!weakest) return null;

    if (weakest.key === 'civics') {
      const weakCategory = findWeakestCategory(civicsAnswers);
      const weakLabel = weakCategory ? N400_CATEGORY_LABELS[weakCategory]?.vi : null;
      return {
        title: tFormat(dict.mockTest.summary.recommendCivicsTitle, { count: civicsWrongCount }),
        desc: weakLabel
          ? tFormat(dict.mockTest.summary.recommendCivicsDescWithCategory, { category: weakLabel })
          : dict.mockTest.summary.recommendCivicsDesc,
        cta: { label: dict.mockTest.summary.recommendCivicsCta, onClick: onReviewAnswers },
      };
    }
    if (weakest.key === 'speaking') {
      return {
        title: dict.mockTest.summary.recommendSpeaking,
        desc: dict.mockTest.summary.recommendSpeakingDesc,
        cta: { label: dict.mockTest.summary.recommendSpeaking, href: `${basePath}/speaking` },
      };
    }
    return {
      title: dict.mockTest.summary.recommendWriting,
      desc: dict.mockTest.summary.recommendWritingDesc,
      cta: { label: dict.mockTest.summary.recommendWriting, href: `${basePath}/writing` },
    };
    // `sections` is rebuilt every render from props — depend on the underlying values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [civics, speaking, writing, civicsAnswers, civicsWrongCount, basePath, onReviewAnswers, dict]);

  const lowAccuracy = totalQuestions > 0 && totalScore / totalQuestions < 0.5;

  return (
    <div className="flex min-h-full animate-in fade-in duration-300">
      <div className="m-auto w-full max-w-[760px] rounded-[24px] border border-slate-100 bg-white p-6 text-center shadow-sm sm:p-8">
        <InterviewStepper completed={3} />

        {/* Verdict hero */}
        <div
          className="mx-auto mt-7 flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 text-teal-600"
          aria-hidden
        >
          <Trophy size={34} />
        </div>
        <h1 className="mt-4 text-[1.75rem] font-extrabold leading-tight text-gray-900">
          {dict.mockTest.summary.title}
        </h1>
        <div className="mt-2">
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${
              overall ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-600'
            }`}
          >
            {overall ? dict.mockTest.summary.passedLabel : dict.mockTest.summary.failedLabel}
          </span>
        </div>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">
          {overall ? dict.mockTest.summary.passSubtitle : dict.mockTest.summary.failSubtitle}
        </p>

        {/* Overall score */}
        <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/50 p-5">
          <div className="text-sm font-bold text-gray-700">{dict.mockTest.summary.scoreTitle}</div>
          <div className="mt-1 text-5xl font-extrabold text-teal-600">
            {totalScore}
            <span className="text-2xl font-bold text-gray-400">/{totalQuestions}</span>
          </div>
          <p className="mt-1.5 text-sm text-gray-600">
            {tFormat(dict.mockTest.summary.scoreSummary, { score: totalScore, total: totalQuestions })}
          </p>
        </div>

        {/* One card per section — score, progress, how many more to pass */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {sections.map(({ key, icon, label, result, passMin }) => {
            const correct = result?.correct ?? 0;
            const total = result?.total ?? 0;
            const passed = !!result?.passed;
            const remaining = Math.max(0, passMin - correct);
            return (
              <div key={key} className="rounded-2xl border border-slate-100 p-4 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden>
                      {icon}
                    </span>
                    <span className="text-sm font-bold text-gray-800">{label}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      passed ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {passed ? dict.mockTest.summary.passedLabel : dict.mockTest.summary.failedLabel}
                  </span>
                </div>
                <div className="mt-2.5 text-2xl font-extrabold text-gray-900">
                  {correct}
                  <span className="text-base font-bold text-gray-400">/{total}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar
                    progress={total > 0 ? (correct / total) * 100 : 0}
                    colorClass={passed ? 'bg-teal-500' : 'bg-orange-400'}
                    heightClass="h-1.5"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {passed
                    ? dict.mockTest.summary.sectionPassed
                    : tFormat(dict.mockTest.summary.sectionRemaining, { remaining })}
                </p>
              </div>
            );
          })}
        </div>

        {/* Personalized recommendation — the weakest part decides the next step */}
        {recommendation ? (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-left">
            <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm"
                aria-hidden
              >
                💡
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-800">{recommendation.title}</div>
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-gray-600">
                  {recommendation.desc}
                  {lowAccuracy ? dict.mockTest.summary.lowAccuracyNote : ''}
                </p>
              </div>
              {recommendation.cta.href ? (
                <Link
                  href={recommendation.cta.href}
                  className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-200"
                >
                  {recommendation.cta.label}
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={recommendation.cta.onClick}
                  className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-200"
                >
                  {recommendation.cta.label}
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* Encouragement */}
        <div className="mt-4">
          <EncourageBanner
            title={overall ? dict.mockTest.summary.encouragePassTitle : dict.mockTest.summary.encourageFailTitle}
          >
            {overall
              ? dict.mockTest.summary.encouragePassBody
              : dict.mockTest.summary.encourageFailBody}
          </EncourageBanner>
        </div>

        {/* CTAs — review (secondary) + retry (primary) */}
        <div className="mx-auto mt-6 flex max-w-lg flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onReviewAnswers}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-teal-600 bg-white px-6 py-3.5 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-50"
          >
            <FileText size={16} />
            {dict.mockTest.summary.reviewAnswersButton}
          </button>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
          >
            <RotateCcw size={16} />
            {dict.mockTest.summary.retakeFullButton}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-gray-500">
          <Clock size={14} className="shrink-0" />
          {dict.mockTest.summary.estimatedTime}
        </div>

        <Link
          href={`${basePath}/mock-test`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
        >
          <BookOpen size={14} />
          {dict.mockTest.summary.chooseAnotherTest}
        </Link>
      </div>
    </div>
  );
}
