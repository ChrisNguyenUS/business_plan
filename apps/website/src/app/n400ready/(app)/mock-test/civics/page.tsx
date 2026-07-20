'use client';

// Phase 4: data layer swapped to server actions, UI preserved from v1.
// - Slides are built CLIENT-side from a seed (same deterministic shuffle as
//   the full interview) so the first question renders instantly. The seed is
//   sent to startMockAttempt in the background, which replays the same
//   builders and stores the answer key as the attempt's slide_manifest.
// - User picks are batched in component state. On submit we send all 20
//   to finalizeMockAttempt; the server replays them through the answer
//   key and stamps score/passed.
// - The returned manifest lets the result screen show "correct answer was X"
//   without an extra round-trip.
// - No resume: like the real exam, an attempt must be finished in one
//   sitting. Closing the tab abandons it and the next visit starts fresh.

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ClipboardCheck,
  ArrowRight,
  Trophy,
  FileText,
  EyeOff,
  Headphones,
  ShieldCheck,
  BarChart3,
  Calendar,
  Target,
  Clock,
  Sparkles,
  Play,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { MockResultScreen, type MockResultRow } from '@/components/n400/MockResultScreen';
import { MockExamProgress, MockExamPanel, MockExamRulesCard } from '@/components/n400/mock-test-chrome';
import { MilestoneBanner } from '@/components/n400/MilestoneBanner';
import { BadgeUnlockToast } from '@/components/n400/BadgeUnlockToast';
import { GrowthSlot } from '@/components/n400/GrowthSlot';
import { useN400UserState, type MockResult } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackMockTestStart, trackStreakMilestone } from '@/lib/n400/analytics';
import {
  buildOptions,
  selectMockTestQuestions,
  questionAudioUrl,
  isPass,
  MOCK_TEST_QUESTION_COUNT,
  MOCK_TEST_PASS_THRESHOLD,
  type QuizOption,
} from '@/lib/n400/quiz-engine';
import { N400_QUESTIONS_BY_ID, type N400Question } from '@/lib/n400/questions-data';
import {
  startMockAttempt,
  finalizeMockAttempt,
} from './actions';
import type { PublicSlide, FinalizeMockAttemptResult } from './types';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';

type Stage = 'intro' | 'taking' | 'result';

interface PickState {
  questionId: number;
  pickedId: QuizOption['id'] | null;
}

// Legacy key from the removed resume feature — cleared on mount so old
// in-flight attempts don't linger in localStorage forever.
const LEGACY_STORAGE_KEY = 'n400.mock.inflight';

// mm:ss for the average-time stat.
function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface MockStats {
  best: number;
  avg: number;
  attempts: number;
  passRate: number;
  avgMs: number | null;
  total: number;
  latest: number;
}

function LoadingFallback() {
  const { dict } = useN400Lang();
  return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
}

export default function MockTestPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MockTestPageInner />
    </Suspense>
  );
}

function MockTestPageInner() {
  const { dict } = useN400Lang();
  const { state, hydrated } = useN400UserState();

  // Aggregate the user's finished mock attempts for the motivational stats
  // panel. `null` when they've never completed one (drives the empty state).
  const mockStats = useMemo<MockStats | null>(() => {
    const results = state.mockResults;
    if (results.length === 0) return null;
    const durations = results
      .map((r) => new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime())
      .filter((d) => Number.isFinite(d) && d > 0);
    return {
      best: Math.max(...results.map((r) => r.score)),
      avg: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      attempts: results.length,
      passRate: Math.round((results.filter((r) => r.passed).length / results.length) * 100),
      avgMs: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      total: results[0]?.total ?? MOCK_TEST_QUESTION_COUNT,
      latest: results[results.length - 1]?.score ?? 0,
    };
  }, [state.mockResults]);

  const [stage, setStage] = useState<Stage>('intro');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [slides, setSlides] = useState<PublicSlide[]>([]);
  const [picks, setPicks] = useState<PickState[]>([]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<FinalizeMockAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  // Background registration of the attempt row: startNew fires the server
  // action without awaiting it so the first question renders instantly.
  // finish() falls back to these when the attemptId hasn't landed yet.
  const attemptIdPromise = useRef<Promise<string> | null>(null);
  const pendingStart = useRef<Parameters<typeof startMockAttempt>[0] | null>(null);
  const searchParams = useSearchParams();
  const autoStart = searchParams.get('start') === '1';

  // Clear leftovers from the removed resume feature.
  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}
  }, []);

  // Auto-start when arriving from the picker card (?start=1).
  useEffect(() => {
    if (!hydrated || !autoStart) return;
    startNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, autoStart]);

  const startNew = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    trackMockTestStart();

    // Build the slides client-side from a seed — the same deterministic
    // shuffle the full interview uses — so the test starts with zero
    // network wait. The server replays the seed to store the answer key.
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const stateCode = state.settings.stateCode;
    const districtNumber = state.address.districtNumber;
    // Skip Q29 (your U.S. Representative) when district is unresolved —
    // mirrors the same filter inside startMockAttempt.
    const questions = selectMockTestQuestions(seed).filter(
      (q) => q.id !== 29 || districtNumber !== null,
    );
    const built: PublicSlide[] = questions.map((q) => ({
      questionId: q.id,
      options: buildOptions(q, stateCode, `mock-${seed}-${q.id}`, districtNumber).map((o) => ({
        id: o.id,
        en: o.en,
        vi: o.vi,
      })),
    }));

    setAttemptId(null);
    setSlides(built);
    setPicks(built.map((s) => ({ questionId: s.questionId, pickedId: null })));
    setIndex(0);
    setResult(null);
    setStage('taking');

    // Register the attempt row in the background; finish() awaits it.
    const args = { seed, stateCode, districtNumber };
    pendingStart.current = args;
    const p = startMockAttempt(args).then((r) => {
      setAttemptId(r.attemptId);
      return r.attemptId;
    });
    p.catch(() => {}); // surfaced at submit time; avoid an unhandled rejection
    attemptIdPromise.current = p;
  };

  const finish = async (finalPicks: PickState[]) => {
    setSubmitting(true);
    setError(null);
    try {
      // The attempt row registers in the background while the user answers;
      // resolve it here, retrying once if that background call failed.
      let id = attemptId;
      if (!id && attemptIdPromise.current) {
        id = await attemptIdPromise.current.catch(() => null);
      }
      if (!id && pendingStart.current) {
        id = (await startMockAttempt(pendingStart.current)).attemptId;
        setAttemptId(id);
      }
      if (!id) throw new Error(dict.mockTest.intro.submitError);
      const r = await finalizeMockAttempt(
        id,
        finalPicks
          .filter((p): p is PickState & { pickedId: QuizOption['id'] } => p.pickedId !== null)
          .map((p) => ({ questionId: p.questionId, selectedOption: p.pickedId })),
      );
      setResult(r);
      setStage('result');
      startedRef.current = false; // allow "Thi lại" to roll a fresh attempt
      if (r.milestone) trackStreakMilestone(r.milestone);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : dict.mockTest.intro.submitError,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onPick = (id: QuizOption['id']) => {
    setPicks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], pickedId: id };
      return next;
    });
  };

  const onNext = () => {
    if (index < slides.length - 1) {
      setIndex((i) => i + 1);
    } else {
      // Read latest picks via the setter callback (avoids a stale closure).
      setPicks((prev) => {
        void finish(prev);
        return prev;
      });
    }
  };

  if (!hydrated) {
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  // When auto-starting from the picker card, show a loading state
  // instead of flashing the full intro screen.
  if (autoStart && stage === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 animate-in fade-in duration-300">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
        <p className="text-sm font-medium text-gray-600">{dict.mockTest.intro.preparingQuestions}</p>
      </div>
    );
  }

  if (stage === 'intro') {
    return (
      <Intro
        onStart={startNew}
        starting={submitting}
        error={error}
        stats={mockStats}
        results={state.mockResults}
      />
    );
  }

  if (stage === 'result' && result) {
    return <Result result={result} slides={slides} picks={picks} onRetake={startNew} />;
  }

  const slide = slides[index];
  const pick = picks[index];
  if (!slide || !pick) return null;
  const question = N400_QUESTIONS_BY_ID.get(slide.questionId);
  if (!question) return null;
  const isLast = index === slides.length - 1;

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* Progress — calm exam card: counter · bar · questions remaining */}
      <MockExamProgress index={index} total={MOCK_TEST_QUESTION_COUNT} />

      {/* Main area — flex-1, grid on desktop */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Question Card — flex-1, immersive */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          {/* Card Body — the only scrollable region */}
          <div
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vw,2rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {/* Question header — question is the hero, English + Vietnamese */}
            <div className="mb-[clamp(0.5rem,1vw,1rem)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Question position intentionally omitted — the progress row
                      above already tracks it. */}
                  <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1.125rem, 2.6vw, 1.5rem)' }}>
                    {question.questionEn}
                  </div>
                  {/* English only while taking the exam — the Vietnamese gloss
                      surfaces on the result screen after the test is submitted. */}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <AudioButton src={questionAudioUrl(question.id)} label={dict.flashcards.listenQuestion} size="sm" />
                </div>
              </div>
            </div>

            {/* Answer Options — calm stacked column, chip + EN/VI, radio on the right */}
            <div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
              {slide.options.map((opt) => {
                const isPicked = pick.pickedId === opt.id;
                // Selected-but-ungraded: teal highlight with a filled radio — no
                // ✓/✗ so nothing hints at correctness before the test is over.
                const style = isPicked
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 hover:border-teal-300 bg-white';
                const mark = isPicked ? (
                  <span className="w-6 h-6 rounded-full border-[7px] border-teal-600 bg-white shrink-0" />
                ) : (
                  <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />
                );
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onPick(opt.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(56px,7vh,72px)] p-[clamp(0.5rem,1.2vh,0.875rem)] outline-none focus-visible:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-100 ${style}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 font-bold text-gray-700" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                      {opt.id}
                    </div>
                    <div className="flex-1 text-gray-800 font-medium">
                      <div style={{ fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)' }}>{opt.en}</div>
                    </div>
                    {mark}
                  </button>
                );
              })}
            </div>

            {/* Mobile Exam Rules (desktop shows it in the right rail) */}
            <div className="mt-[clamp(0.75rem,2vh,1.25rem)] lg:hidden">
              <MockExamRulesCard />
            </div>

            {error ? (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          {/* Pinned Action — one primary Next, disabled until an answer is picked */}
          <div
            className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            <button
              type="button"
              onClick={onNext}
              disabled={pick.pickedId === null || submitting}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold shadow-md transition-all ${
                pick.pickedId === null || submitting
                  ? 'cursor-not-allowed bg-teal-600/20 text-teal-700/50 shadow-none'
                  : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
              }`}
              style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
            >
              <span>{submitting && isLast ? dict.mockTest.grading : isLast ? dict.mockTest.submitButton : 'Next'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Right rail — exam illustration + Exam Rules */}
        <MockExamPanel mode="civics" />
      </div>
    </div>
  );
}

function Intro({
  onStart,
  starting,
  error,
  stats,
  results,
}: {
  onStart: () => void;
  starting: boolean;
  error: string | null;
  stats: MockStats | null;
  results: MockResult[];
}) {
  const { dict } = useN400Lang();
  const isFirstTime = !stats;

  // Last 5 attempts, newest first. Each carries its score delta vs the
  // chronologically previous attempt so the tiles can show a trend arrow.
  const recentAttempts = useMemo(() => {
    const start = Math.max(0, results.length - 5);
    return results
      .slice(start)
      .map((r, i) => {
        const prev = results[start + i - 1];
        return { ...r, delta: prev ? r.score - prev.score : null };
      })
      .reverse();
  }, [results]);
  const latestDelta = recentAttempts[0]?.delta ?? null;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8 animate-in fade-in duration-300">
      {/* LEFT — hero + recent history */}
      <div className="flex min-w-0 flex-col gap-6">
        {/* Hero — the visual anchor of the page */}
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-50/80 via-white to-white"
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 pt-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-teal-700">
                  <ClipboardCheck size={13} />
                  Mock Exam
                </div>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight text-gray-800 sm:text-4xl">
                  {dict.mockTest.intro.title}
                </h2>
                <p className="mt-2.5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
                  {dict.mockTest.intro.subtitle}
                </p>
              </div>
              <div className="relative -my-2 hidden h-44 w-52 shrink-0 animate-float-subtle motion-reduce:animate-none sm:block lg:h-52 lg:w-64">
                <Image
                  src="/images/n400/illu-statue-city.png"
                  alt=""
                  fill
                  className="object-contain"
                  sizes="256px"
                  priority
                />
              </div>
            </div>

            {/* Exam facts — questions & passing score lead, the rest support */}
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <ExamFact
                primary
                icon={<FileText size={18} />}
                iconBg="bg-teal-50"
                iconColor="text-teal-600"
                value={`${MOCK_TEST_QUESTION_COUNT}`}
                label={dict.mockTest.hub.features.randomQuestions}
              />
              <ExamFact
                primary
                icon={<Target size={18} />}
                iconBg="bg-rose-50"
                iconColor="text-rose-500"
                value={`${MOCK_TEST_PASS_THRESHOLD}/${MOCK_TEST_QUESTION_COUNT}`}
                label={dict.mockTest.intro.passScoreLabel}
              />
              <ExamFact
                icon={<Clock size={18} />}
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
                value={dict.mockTest.intro.estimatedTimeValue}
                label={dict.mockTest.intro.estimatedTimeLabel}
              />
              <ExamFact
                icon={<EyeOff size={18} />}
                iconBg="bg-orange-50"
                iconColor="text-orange-500"
                value={dict.mockTest.intro.noAnswerMidwayValue}
                label={dict.mockTest.intro.noAnswerMidwayLabel}
              />
              <ExamFact
                icon={<Headphones size={18} />}
                iconBg="bg-yellow-50"
                iconColor="text-yellow-600"
                value="Audio MP3"
                label={dict.mockTest.intro.perQuestionLabel}
              />
            </div>

            {/* Empty state / primary CTA */}
            {isFirstTime ? (
              <div className="mt-7">
                <h4 className="text-lg font-bold text-gray-800">{dict.mockTest.intro.firstTimeTitle}</h4>
                <p className="mt-1 text-sm text-gray-500">
                  {tFormat(dict.mockTest.intro.firstTimeSubtitle, { count: MOCK_TEST_QUESTION_COUNT })}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onStart}
              disabled={starting}
              aria-busy={starting}
              className="group mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-teal-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-600/30 active:translate-y-0 active:shadow-md disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:py-5 sm:text-lg"
            >
              <Play size={18} className="shrink-0 fill-current" />
              {starting
                ? dict.mockTest.intro.startingButton
                : isFirstTime
                  ? dict.mockTest.intro.startButtonFirst
                  : dict.mockTest.intro.startButtonAgain}
              <ArrowRight
                size={18}
                className="shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </button>

            {error ? (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {/* Trust indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <ShieldCheck size={15} className="shrink-0 text-teal-600" />
              {dict.mockTest.intro.trustIndicator}
            </div>
          </div>
        </Card>

        {recentAttempts.length > 0 ? (
          <RecentHistory
            attempts={recentAttempts}
            latestDelta={latestDelta}
            viewAllHref={`/n400ready/statistic`}
          />
        ) : null}
      </div>

      {/* RIGHT — unified exam overview */}
      <ExamOverview stats={stats} />
    </div>
  );
}

function ExamFact({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  primary = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-4 ${
        primary ? 'border-teal-100 shadow-sm' : 'border-slate-100 hover:border-slate-200'
      }`}
    >
      <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className={`leading-tight text-gray-800 ${primary ? 'text-lg font-extrabold' : 'text-sm font-bold'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-xs leading-tight text-gray-500">{label}</div>
    </div>
  );
}

function RecentHistory({
  attempts,
  latestDelta,
  viewAllHref,
}: {
  attempts: (MockResult & { delta: number | null })[];
  latestDelta: number | null;
  viewAllHref: string;
}) {
  const { dict } = useN400Lang();
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
            <BarChart3 size={18} />
          </div>
          <h3 className="text-base font-bold text-gray-800">{dict.mockTest.recentHistory.title}</h3>
        </div>
        <Link
          href={viewAllHref}
          className="shrink-0 text-sm font-semibold text-teal-600 transition-colors duration-200 hover:text-teal-700"
        >
          {dict.study.hub.viewAllCta}
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {attempts.map((a, i) => {
          const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
          const durMs = new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime();
          return (
            <div
              key={a.id}
              className="relative rounded-2xl border border-slate-100 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {i === 0 ? (
                <span className="absolute -top-2 right-3 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {dict.mockTest.recentHistory.latestTag}
                </span>
              ) : null}
              <div className="flex items-baseline justify-between gap-1">
                <div className="text-lg font-extrabold text-gray-800">
                  {a.score}
                  <span className="text-xs font-medium text-gray-400"> / {a.total}</span>
                </div>
                {a.delta != null && a.delta !== 0 ? (
                  a.delta > 0 ? (
                    <TrendingUp size={14} className="shrink-0 text-teal-500" />
                  ) : (
                    <TrendingDown size={14} className="shrink-0 text-orange-400" />
                  )
                ) : null}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-gray-600">{pct}%</div>
              <div className="mt-1.5 text-[11px] text-gray-400">
                {new Date(a.completedAt).toLocaleDateString('vi-VN')}
                {Number.isFinite(durMs) && durMs > 0 ? ` · ${formatDuration(durMs)}` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {latestDelta != null && latestDelta > 0 ? (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <Trophy size={16} className="shrink-0 text-teal-600" />
          <span>
            {dict.mockTest.recentHistory.progressPrefix}
            <span className="font-bold">{tFormat(dict.mockTest.recentHistory.progressBold, { delta: latestDelta })}</span>
            {dict.mockTest.recentHistory.progressSuffix}
          </span>
        </div>
      ) : null}
    </Card>
  );
}

function ExamOverview({ stats }: { stats: MockStats | null }) {
  const { dict } = useN400Lang();
  return (
    <Card className="p-5 sm:p-6">
      <div className="relative mx-auto mt-1 h-40 w-40 lg:h-48 lg:w-48">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full border border-teal-100/70 bg-gradient-to-b from-teal-50 to-white"
        />
        <Image
          src="/images/n400/illu-flag-holding-transparent.png"
          alt=""
          fill
          className="object-contain p-4"
          sizes="192px"
          priority
        />
      </div>

      <div className="mt-4 text-center">
        <h3 className="text-lg font-bold text-gray-800">{dict.mockTest.overview.title}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {stats
            ? dict.mockTest.overview.subtitleWithStats
            : dict.mockTest.overview.subtitleEmpty}
        </p>
      </div>

      {stats ? (
        <>
          <div className="mt-5 flex flex-col gap-3">
            <StatTile
              icon={<Trophy size={18} />}
              iconBg="bg-yellow-50"
              iconColor="text-yellow-500"
              label={dict.mockTest.overview.bestScore}
              value={`${stats.best}`}
              suffix={`/ ${stats.total}`}
              tag={stats.latest === stats.best ? dict.mockTest.recentHistory.latestTag : undefined}
            />
            <StatTile
              icon={<BarChart3 size={18} />}
              iconBg="bg-purple-50"
              iconColor="text-purple-500"
              label={dict.mockTest.overview.avgScore}
              value={stats.avg.toFixed(1)}
              suffix={`/ ${stats.total}`}
            />
            <StatTile
              icon={<Target size={18} />}
              iconBg="bg-teal-50"
              iconColor="text-teal-600"
              label={dict.mockTest.overview.passRate}
              value={`${stats.passRate}%`}
              valueClass="text-teal-600"
            />
            <StatTile
              icon={<Calendar size={18} />}
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
              label={dict.mockTest.overview.attemptCount}
              value={`${stats.attempts}`}
            />
            {stats.avgMs != null ? (
              <StatTile
                icon={<Clock size={18} />}
                iconBg="bg-rose-50"
                iconColor="text-rose-500"
                label={dict.mockTest.overview.avgTime}
                value={formatDuration(stats.avgMs)}
              />
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-teal-50 px-4 py-3">
            <Sparkles size={16} className="shrink-0 text-teal-500" />
            <div>
              <div className="text-sm font-semibold text-teal-800">{dict.mockTest.overview.improvingTitle}</div>
              <div className="text-xs text-teal-700">{dict.mockTest.overview.improvingSubtitle}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center text-sm text-gray-500">
          {dict.mockTest.overview.emptyState}
        </div>
      )}
    </Card>
  );
}

function StatTile({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  suffix,
  tag,
  valueClass,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  suffix?: string;
  tag?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 transition-all duration-200 hover:border-slate-200 hover:shadow-sm motion-reduce:transition-none">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className={`text-xl font-extrabold leading-tight ${valueClass ?? 'text-gray-800'}`}>
          {value}
          {suffix ? <span className="text-sm font-semibold text-gray-400"> {suffix}</span> : null}
        </div>
      </div>
      {tag ? (
        <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
          {tag}
        </span>
      ) : null}
    </div>
  );
}

function Result({
  result,
  slides,
  picks,
  onRetake,
}: {
  result: FinalizeMockAttemptResult;
  slides: PublicSlide[];
  picks: PickState[];
  onRetake: () => void;
}) {
  const { dict } = useN400Lang();
  const correctById = new Map(result.manifest.map((m) => [m.qid, m.correct] as const));
  const badges = useN400Badges();
  const catalogMap = Object.fromEntries(badges.catalog.map((b) => [b.slug, b]));

  const rows: MockResultRow[] = slides.flatMap((slide, i) => {
    const q: N400Question | undefined = N400_QUESTIONS_BY_ID.get(slide.questionId);
    if (!q) return [];
    const correctId = correctById.get(slide.questionId);
    const picked = slide.options.find((o) => o.id === picks[i]?.pickedId);
    const correct = slide.options.find((o) => o.id === correctId);
    return [
      {
        key: String(q.id),
        badge: tFormat(dict.mockTest.civicsMock.badge, { index: i + 1, id: q.id }),
        prompt: q.questionEn,
        promptVi: q.questionVi,
        userAnswer: picked?.en ?? null,
        correctAnswer: correct?.en ?? '—',
        correctAnswerVi: correct?.vi,
        ok: picks[i]?.pickedId === correctId,
        audioSrc: questionAudioUrl(q.id),
        bookmarkId: q.id,
      },
    ];
  });

  return (
    <div className="space-y-6">
      {result.unlockedBadges.length > 0 ? (
        <BadgeUnlockToast slugs={result.unlockedBadges} catalog={catalogMap} trigger="session_complete" />
      ) : null}

      {result.milestone !== null ? <MilestoneBanner days={result.milestone} /> : null}

      <MockResultScreen
        passed={isPass(result.score)}
        score={result.score}
        total={result.total}
        requirement={tFormat(dict.practice.passThreshold, { need: MOCK_TEST_PASS_THRESHOLD })}
        streak={{ current: result.currentStreak, longest: result.longestStreak }}
        onRetake={onRetake}
        rows={rows}
        reviewHref={`/n400ready/practice?start=review`}
        hubHref={`/n400ready/mock-test`}
      />

      <GrowthSlot surface="results" />
    </div>
  );
}
