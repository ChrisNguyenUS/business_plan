'use client';

// Phase 4: data layer swapped to server actions, UI preserved from v1.
// - startMockAttempt builds the slide manifest server-side; the slides we
//   render here have NO isCorrect flag, so a tampered client cannot mark
//   itself right.
// - User picks are batched in component state. On submit we send all 20
//   to finalizeMockAttempt; the server replays them through the answer
//   key and stamps score/passed.
// - The returned manifest lets the result screen show "correct answer was X"
//   without an extra round-trip.
// - In-progress state survives a tab close via localStorage keyed by
//   attemptId. (Resume UI is wired below; the user can tap "Tiếp tục thi
//   thử" on the intro card if a saved attempt is found.)

import Image from 'next/image';
import {
  ClipboardCheck,
  ArrowRight,
  CheckCircle,
  XCircle,
  Trophy,
  Volume2,
  Flame,
  FileText,
  EyeOff,
  Headphones,
  ShieldCheck,
  BarChart3,
  Calendar,
  Target,
  Clock,
  RotateCcw,
  Sparkles,
  Bookmark,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { MilestoneBanner } from '@/components/n400/MilestoneBanner';
import { BadgeUnlockToast } from '@/components/n400/BadgeUnlockToast';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackMockTestStart, trackStreakMilestone } from '@/lib/n400/analytics';
import {
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

type Stage = 'intro' | 'taking' | 'result';

interface PickState {
  questionId: number;
  pickedId: QuizOption['id'] | null;
}

interface PersistedAttempt {
  attemptId: string;
  startedAt: string;
  // Refreshed on every autosave so the resume card can show "last activity".
  // Optional for backward-compat with attempts persisted before this field existed.
  savedAt?: string;
  slides: PublicSlide[];
  picks: PickState[];
  index: number;
}

const STORAGE_KEY = 'n400.mock.inflight';

function loadPersisted(): PersistedAttempt | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAttempt;
    if (!parsed.attemptId || !Array.isArray(parsed.slides)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: PersistedAttempt | null) {
  if (typeof window === 'undefined') return;
  if (state) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

// "10 phút trước" style relative time for the resume card.
function formatRelativeVi(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const min = Math.floor((Date.now() - then) / 60000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  return `${Math.floor(hr / 24)} ngày trước`;
}

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
}

export default function MockTestPage() {
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
    };
  }, [state.mockResults]);

  const [stage, setStage] = useState<Stage>('intro');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [slides, setSlides] = useState<PublicSlide[]>([]);
  const [picks, setPicks] = useState<PickState[]>([]);
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<string>('');
  const [result, setResult] = useState<FinalizeMockAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumable, setResumable] = useState<PersistedAttempt | null>(null);
  const startedRef = useRef(false);

  // Surface a persisted in-flight attempt on mount.
  useEffect(() => {
    setResumable(loadPersisted());
  }, []);

  // Persist on every state change while taking the test.
  useEffect(() => {
    if (stage !== 'taking' || !attemptId) return;
    persist({ attemptId, startedAt, savedAt: new Date().toISOString(), slides, picks, index });
  }, [stage, attemptId, startedAt, slides, picks, index]);

  const startNew = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    setSubmitting(true);
    try {
      trackMockTestStart();
      const r = await startMockAttempt();
      setAttemptId(r.attemptId);
      setStartedAt(r.startedAt);
      setSlides(r.slides);
      setPicks(r.slides.map((s) => ({ questionId: s.questionId, pickedId: null })));
      setIndex(0);
      setResult(null);
      setStage('taking');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Không thể bắt đầu thi thử. / Could not start attempt.',
      );
      startedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const resume = () => {
    if (!resumable) return;
    setAttemptId(resumable.attemptId);
    setStartedAt(resumable.startedAt);
    setSlides(resumable.slides);
    setPicks(resumable.picks);
    setIndex(resumable.index);
    setResult(null);
    setStage('taking');
  };

  const discardResumable = () => {
    persist(null);
    setResumable(null);
  };

  const finish = async (finalPicks: PickState[]) => {
    if (!attemptId) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await finalizeMockAttempt(
        attemptId,
        finalPicks
          .filter((p): p is PickState & { pickedId: QuizOption['id'] } => p.pickedId !== null)
          .map((p) => ({ questionId: p.questionId, selectedOption: p.pickedId })),
      );
      setResult(r);
      setStage('result');
      if (r.milestone) trackStreakMilestone(r.milestone);
      persist(null); // attempt finalized server-side; nothing left to resume
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Không thể nộp bài. / Could not submit. Please retry.',
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
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  if (stage === 'intro') {
    return (
      <Intro
        onStart={startNew}
        starting={submitting}
        error={error}
        resumable={resumable}
        onResume={resume}
        onDiscard={discardResumable}
        stats={mockStats}
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
  const answeredCount = picks.filter((p) => p.pickedId !== null).length;
  const isLast = index === slides.length - 1;

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* Progress — shrink-0, compact on mobile */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <span className="font-bold text-gray-700" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>
          Câu {index + 1} / {MOCK_TEST_QUESTION_COUNT}
        </span>
        <span className="text-gray-500" style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.875rem)' }}>
          Đã trả lời: {answeredCount} / {MOCK_TEST_QUESTION_COUNT}
        </span>
      </div>
      <ProgressBar progress={((index + 1) / MOCK_TEST_QUESTION_COUNT) * 100} heightClass="h-[clamp(4px,0.5vw,10px)] shrink-0" />

      {/* Main area — flex-1, grid on desktop */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Question Card — flex-1, immersive */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          {/* Card Body — the only scrollable region */}
          <div
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vw,2rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {/* Question header — compact on mobile */}
            <div className="mb-[clamp(0.5rem,1vw,1rem)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-500" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)' }}>
                    Câu hỏi / Question #{question.id}
                  </div>
                  <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                    {question.questionEn}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <AudioButton src={questionAudioUrl(question.id)} label="Nghe câu hỏi" size="sm" />
                </div>
              </div>
            </div>

            {/* Answer Options */}
            <div className="space-y-[clamp(0.375rem,1vw,0.75rem)]">
              {slide.options.map((opt) => {
                const isPicked = pick.pickedId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onPick(opt.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-all duration-200 motion-reduce:duration-0 sm:gap-4 min-h-[72px] p-[clamp(0.625rem,1.5vw,1rem)] ${
                      isPicked
                        ? 'border-teal-600 bg-teal-50 shadow-sm'
                        : 'border-gray-200 hover:border-teal-300 bg-white'
                    }`}
                  >
                    <div className="w-6 shrink-0 font-bold text-gray-800" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>{opt.id}</div>
                    <div className="flex-1 text-gray-800 font-medium">
                      <div style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>{opt.en}</div>
                    </div>
                    {isPicked ? (
                      <CheckCircle size={22} className="text-teal-600 shrink-0" />
                    ) : (
                      <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {error ? (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          {/* Pinned Actions — always visible, never scroll */}
          <div
            className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vw,2rem)] pt-3"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="hidden text-gray-500 sm:block lg:hidden" style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)' }}>
                ⚠️ Đáp án sẽ chỉ hiển thị khi bạn hoàn thành tất cả {MOCK_TEST_QUESTION_COUNT} câu.
              </div>
              <button
                type="button"
                onClick={onNext}
                disabled={pick.pickedId === null || submitting}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 font-semibold text-white shadow-md hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40 max-sm:w-full"
                style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
              >
                {submitting && isLast
                  ? 'Đang chấm bài...'
                  : isLast
                    ? 'Nộp bài'
                    : 'Tiếp theo'}{' '}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar — decorative, mirrors Luyện tập */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:max-w-[300px] xl:max-w-[400px] shrink-0 self-start">
          <div className="relative h-60 w-full overflow-hidden rounded-3xl">
            <Image
              src="/images/n400/illu-flag-holding-transparent.png"
              alt=""
              fill
              className="object-contain"
              sizes="400px"
              priority
            />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 leading-snug">
              Bình tĩnh và tự tin
              <br />
              như đang thi thật!
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Đạt ≥ {MOCK_TEST_PASS_THRESHOLD}/{MOCK_TEST_QUESTION_COUNT} câu để vượt qua. Bạn làm được! 💪
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-gray-700">
            ⚠️ Đáp án sẽ chỉ hiển thị sau khi bạn hoàn thành tất cả {MOCK_TEST_QUESTION_COUNT} câu — giống như kỳ thi thật.
          </div>
        </div>
      </div>
    </div>
  );
}

function Intro({
  onStart,
  starting,
  error,
  resumable,
  onResume,
  onDiscard,
  stats,
}: {
  onStart: () => void;
  starting: boolean;
  error: string | null;
  resumable: PersistedAttempt | null;
  onResume: () => void;
  onDiscard: () => void;
  stats: MockStats | null;
}) {
  const answered = resumable ? resumable.picks.filter((p) => p.pickedId !== null).length : 0;
  const total = resumable && resumable.slides.length ? resumable.slides.length : MOCK_TEST_QUESTION_COUNT;
  const pct = total ? Math.round((answered / total) * 100) : 0;
  // Section 3: only surface the resume card once there's real progress.
  const hasResume = !!resumable && answered > 0;
  const lastActivity = resumable ? formatRelativeVi(resumable.savedAt ?? resumable.startedAt) : '';
  const isFirstTime = !stats && !hasResume;

  // "Làm lại từ đầu" — abandon the in-flight attempt and roll a fresh one.
  const onRestart = () => {
    onDiscard();
    onStart();
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8 animate-in fade-in duration-300">
      {/* LEFT — primary card */}
      <Card className="p-5 sm:p-7">
        {/* Header — compact */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <ClipboardCheck size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-gray-800 sm:text-2xl">Thi thử N400</h3>
            <p className="text-sm text-gray-500">
              Mô phỏng bài thi USCIS với {MOCK_TEST_QUESTION_COUNT} câu hỏi ngẫu nhiên.
            </p>
          </div>
        </div>

        {/* Exam rules — scannable feature cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FeatureCard
            icon={<FileText size={18} />}
            iconBg="bg-teal-50"
            iconColor="text-teal-600"
            title={`${MOCK_TEST_QUESTION_COUNT} câu hỏi`}
            subtitle="Ngẫu nhiên"
          />
          <FeatureCard
            icon={<EyeOff size={18} />}
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            title="Không hiển thị"
            subtitle="đáp án giữa chừng"
          />
          <FeatureCard
            icon={<Trophy size={18} />}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            title={`≥ ${MOCK_TEST_PASS_THRESHOLD}/${MOCK_TEST_QUESTION_COUNT}`}
            subtitle="để vượt qua"
          />
          <FeatureCard
            icon={<Headphones size={18} />}
            iconBg="bg-yellow-50"
            iconColor="text-yellow-600"
            title="Audio MP3"
            subtitle="cho từng câu hỏi"
          />
        </div>

        {/* Resume card / empty state / primary CTA */}
        {hasResume ? (
          <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-base font-bold text-gray-800">Tiếp tục bài thi của bạn</h4>
                {lastActivity ? (
                  <p className="mt-0.5 text-xs text-gray-500">Lần làm gần nhất: {lastActivity}</p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-sm font-bold text-teal-700 shadow-sm">
                {pct}%
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar progress={pct} heightClass="h-2.5" />
              <div className="mt-1.5 text-xs font-medium text-gray-600">
                {answered} / {total} câu
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onResume}
                disabled={starting}
                className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-all duration-200 hover:bg-teal-700 hover:shadow-lg disabled:opacity-60"
              >
                Tiếp tục bài thi
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
              </button>
              <button
                type="button"
                onClick={onRestart}
                disabled={starting}
                className="flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-700 transition-colors duration-200 hover:bg-teal-50 disabled:opacity-60"
              >
                <RotateCcw size={15} /> Làm lại từ đầu
              </button>
            </div>
          </div>
        ) : (
          <>
            {isFirstTime ? (
              <div className="mt-6">
                <h4 className="text-lg font-bold text-gray-800">Sẵn sàng cho bài thi thử đầu tiên?</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Trải nghiệm kỳ thi quốc tịch thật với {MOCK_TEST_QUESTION_COUNT} câu hỏi ngẫu nhiên —
                  không xem đáp án cho tới khi bạn hoàn thành.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onStart}
              disabled={starting}
              aria-busy={starting}
              className="group mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-teal-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-600/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {starting
                ? 'Đang chuẩn bị câu hỏi...'
                : isFirstTime
                  ? 'Bắt đầu thi thử'
                  : 'Bắt đầu thi thử mới'}
              <ArrowRight
                size={18}
                className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </button>
          </>
        )}

        {error ? (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Trust indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck size={15} className="shrink-0 text-teal-600" />
          Dựa trên 128 câu hỏi chính thức từ USCIS
        </div>
      </Card>

      {/* RIGHT — illustration, motivation, stats */}
      <div className="flex flex-col gap-5">
        <div className="relative mx-auto h-56 w-full max-w-xs lg:h-64 lg:max-w-none">
          <Image
            src="/images/n400/illu-statue-city.png"
            alt=""
            fill
            className="object-contain"
            sizes="400px"
            priority
          />
        </div>

        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-800">Thi thử như thi thật</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            Chuẩn bị tốt hơn – Tự tin hơn
            <br />
            Chinh phục giấc mơ Mỹ!
          </p>
        </div>

        {stats ? <StatsPanel stats={stats} /> : null}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-4">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="text-sm font-bold leading-tight text-gray-800">{title}</div>
      <div className="mt-0.5 text-xs leading-tight text-gray-500">{subtitle}</div>
    </div>
  );
}

function StatsPanel({ stats }: { stats: MockStats }) {
  const rows: { icon: React.ReactNode; label: string; value: string; suffix?: string; valueClass?: string }[] = [
    { icon: <Trophy size={16} className="text-yellow-500" />, label: 'Điểm cao nhất', value: `${stats.best}`, suffix: `/ ${stats.total}` },
    { icon: <BarChart3 size={16} className="text-blue-500" />, label: 'Điểm trung bình', value: stats.avg.toFixed(1), suffix: `/ ${stats.total}` },
    { icon: <Calendar size={16} className="text-teal-500" />, label: 'Số lần thi', value: `${stats.attempts}` },
    { icon: <Target size={16} className="text-rose-500" />, label: 'Tỷ lệ vượt qua', value: `${stats.passRate}%`, valueClass: 'text-teal-600' },
    ...(stats.avgMs != null
      ? [{ icon: <Clock size={16} className="text-purple-500" />, label: 'Thời gian trung bình', value: formatDuration(stats.avgMs) }]
      : []),
  ];

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              {r.icon}
              <span>{r.label}</span>
            </div>
            <div className={`text-sm font-bold ${r.valueClass ?? 'text-gray-800'}`}>
              {r.value}
              {r.suffix ? <span className="text-xs font-medium text-gray-400"> {r.suffix}</span> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2.5 text-xs font-medium text-teal-700">
        <Sparkles size={15} className="shrink-0 text-teal-500" />
        Càng luyện tập, bạn càng gần với kết quả tốt hơn!
      </div>
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
  const passed = isPass(result.score);
  const correctById = new Map(result.manifest.map((m) => [m.qid, m.correct] as const));
  const badges = useN400Badges();
  const catalogMap = Object.fromEntries(badges.catalog.map((b) => [b.slug, b]));
  const { state, toggleBookmark } = useN400UserState();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {result.unlockedBadges.length > 0 ? (
        <BadgeUnlockToast slugs={result.unlockedBadges} catalog={catalogMap} trigger="session_complete" />
      ) : null}

      {result.milestone !== null ? <MilestoneBanner days={result.milestone} /> : null}

      <Card className={`p-5 text-center sm:p-8 ${passed ? 'bg-teal-50 border-teal-200' : 'bg-orange-50 border-orange-200'}`}>
        <div className="mb-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Trophy className={passed ? 'text-teal-600' : 'text-orange-500'} size={40} />
          <h3 className="text-2xl font-extrabold text-gray-800 sm:text-3xl">
            {passed ? 'Chúc mừng! Bạn đã vượt qua!' : 'Cố lên! Lần sau bạn sẽ làm tốt hơn.'}
          </h3>
        </div>
        <div className="text-5xl font-extrabold text-gray-900 mb-2">
          {result.score}
          <span className="text-2xl text-gray-500">/{result.total}</span>
        </div>
        <p className="text-sm text-gray-600">
          Cần đạt ≥ {MOCK_TEST_PASS_THRESHOLD} câu đúng để vượt qua. Bạn đạt{' '}
          {Math.round((result.score / result.total) * 100)}% độ chính xác.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-gray-700 bg-white/70 rounded-full px-3 py-1.5 border border-orange-200">
          <Flame size={16} className="text-orange-500" />
          <span className="font-semibold">{result.currentStreak} ngày</span>
          <span className="text-xs text-gray-500">
            · Cao nhất: {result.longestStreak} ngày
          </span>
        </div>
        <div className="flex justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={onRetake}
            className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 shadow-md"
          >
            Thi lại
          </button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h4 className="font-bold text-gray-800 mb-4">Chi tiết các câu trả lời</h4>
        <div className="space-y-3">
          {slides.map((slide, i) => {
            const q: N400Question | undefined = N400_QUESTIONS_BY_ID.get(slide.questionId);
            if (!q) return null;
            const correctId = correctById.get(slide.questionId);
            const correct = slide.options.find((o) => o.id === correctId);
            const picked = slide.options.find((o) => o.id === picks[i]?.pickedId);
            const ok = picked?.id === correctId;
            return (
              <div
                key={q.id}
                className={`p-4 rounded-xl border ${ok ? 'border-teal-200 bg-teal-50/40' : 'border-orange-200 bg-orange-50/40'}`}
              >
                <div className="flex items-start gap-3">
                  {ok ? (
                    <CheckCircle className="text-teal-600 shrink-0 mt-0.5" size={20} />
                  ) : (
                    <XCircle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                  )}
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">
                      Câu {i + 1} / Question #{q.id}
                    </div>
                    <div className="font-semibold text-gray-800 mt-1">{q.questionEn}</div>
                    <div className="text-sm mt-2">
                      <span className="text-gray-500">Bạn chọn: </span>
                      <span className={ok ? 'text-teal-700 font-medium' : 'text-orange-600 font-medium'}>
                        {picked ? picked.en : '— (bỏ qua)'}
                      </span>
                    </div>
                    {!ok ? (
                      <div className="text-sm">
                        <span className="text-gray-500">Đáp án đúng: </span>
                        <span className="text-teal-700 font-medium">{correct?.en ?? '—'}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <AudioButton src={questionAudioUrl(q.id)} size="sm" label="Nghe câu hỏi" />
                    <button
                      type="button"
                      onClick={() => toggleBookmark(q.id)}
                      className={`p-1.5 rounded-lg transition-colors duration-200 ${
                        state.bookmarks.includes(q.id)
                          ? 'text-teal-600 bg-teal-50 hover:bg-teal-100'
                          : 'text-gray-300 hover:text-teal-500 hover:bg-gray-100'
                      }`}
                      aria-label={state.bookmarks.includes(q.id) ? 'Bỏ đánh dấu' : 'Đánh dấu để học sau'}
                      title={state.bookmarks.includes(q.id) ? 'Bỏ đánh dấu' : 'Đánh dấu để học sau'}
                    >
                      <Bookmark
                        size={16}
                        fill={state.bookmarks.includes(q.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
