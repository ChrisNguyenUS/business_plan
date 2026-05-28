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
import { ClipboardCheck, ArrowRight, CheckCircle, XCircle, Trophy, Volume2, Flame } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { MilestoneBanner } from '@/components/n400/MilestoneBanner';
import { useN400UserState } from '@/lib/n400/user-state';
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

export default function MockTestPage() {
  const { hydrated } = useN400UserState();

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
    persist({ attemptId, startedAt, slides, picks, index });
  }, [stage, attemptId, startedAt, slides, picks, index]);

  const startNew = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    setSubmitting(true);
    try {
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            Câu {index + 1} / {MOCK_TEST_QUESTION_COUNT}
          </span>
          <span className="text-xs text-gray-500">
            Đã trả lời: {answeredCount} / {MOCK_TEST_QUESTION_COUNT}
          </span>
        </div>
        <ProgressBar progress={((index + 1) / MOCK_TEST_QUESTION_COUNT) * 100} heightClass="h-2" />
      </div>

      <Card className="p-8 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-1">Câu hỏi / Question #{question.id}</div>
            <div className="text-xl font-bold text-gray-800 leading-snug">
              {question.questionEn}
            </div>
            <div className="text-sm text-gray-500 mt-1">{question.questionVi}</div>
          </div>
          <AudioButton src={questionAudioUrl(question.id)} label="Nghe câu hỏi" />
        </div>

        <div className="space-y-3">
          {slide.options.map((opt) => {
            const isPicked = pick.pickedId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPick(opt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  isPicked
                    ? 'border-teal-600 bg-teal-50 shadow-sm'
                    : 'border-gray-200 hover:border-teal-300 bg-white'
                }`}
              >
                <div className="font-bold text-gray-800 w-6">{opt.id}</div>
                <div className="flex-1 text-gray-800 font-medium">
                  <div>{opt.en}</div>
                  {opt.vi !== opt.en ? (
                    <div className="text-xs text-gray-500 mt-0.5">{opt.vi}</div>
                  ) : null}
                </div>
                {isPicked ? (
                  <CheckCircle size={22} className="text-teal-600" />
                ) : (
                  <span className="w-6 h-6 rounded-full border-2 border-gray-200" />
                )}
              </button>
            );
          })}
        </div>

        {error ? (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            ⚠️ Đáp án sẽ chỉ hiển thị khi bạn hoàn thành tất cả 20 câu.
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={pick.pickedId === null || submitting}
            className="py-3 px-6 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 shadow-md flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting && isLast
              ? 'Đang chấm bài...'
              : isLast
                ? 'Nộp bài'
                : 'Tiếp theo'}{' '}
            <ArrowRight size={16} />
          </button>
        </div>
      </Card>
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
}: {
  onStart: () => void;
  starting: boolean;
  error: string | null;
  resumable: PersistedAttempt | null;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="grid grid-cols-[3fr_2fr] gap-8 items-start animate-in fade-in duration-300">
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <ClipboardCheck size={26} />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Thi thử N400</h3>
        </div>
        <p className="text-sm text-gray-600 mt-2 mb-6">
          Mô phỏng kỳ thi quốc tịch thật. Trả lời {MOCK_TEST_QUESTION_COUNT} câu hỏi ngẫu nhiên,
          đạt {MOCK_TEST_PASS_THRESHOLD} câu đúng để vượt qua.
        </p>

        <div className="space-y-3 text-sm text-gray-700 mb-8">
          <Bullet color="bg-teal-500">{MOCK_TEST_QUESTION_COUNT} câu ngẫu nhiên trên 128 câu chính thức.</Bullet>
          <Bullet color="bg-orange-500">Không hiển thị đáp án giữa chừng — như thi thật.</Bullet>
          <Bullet color="bg-purple-500">
            Đạt ≥ {MOCK_TEST_PASS_THRESHOLD}/{MOCK_TEST_QUESTION_COUNT} câu để vượt qua.
          </Bullet>
          <Bullet color="bg-yellow-500">Có audio MP3 phát âm chuẩn cho từng câu hỏi.</Bullet>
        </div>

        {resumable ? (
          <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-2">
            <div className="text-sm font-semibold text-teal-800">
              Bạn có một bài thi đang dang dở.
            </div>
            <div className="text-xs text-teal-700">
              Tiến độ: {resumable.picks.filter((p) => p.pickedId !== null).length} /{' '}
              {resumable.slides.length} câu.
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onResume}
                className="flex-1 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
              >
                Tiếp tục
              </button>
              <button
                type="button"
                onClick={onDiscard}
                className="px-4 py-2.5 rounded-lg bg-white border border-teal-200 text-teal-700 text-sm font-semibold hover:bg-teal-100"
              >
                Bỏ
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          aria-busy={starting}
          className="w-full py-4 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {starting ? 'Đang chuẩn bị câu hỏi...' : 'Bắt đầu thi thử'} <ArrowRight size={16} />
        </button>
      </Card>

      <div className="relative h-[420px] rounded-3xl overflow-hidden">
        <Image
          src="/images/n400/illu-flag-holding-transparent.png"
          alt=""
          fill
          className="object-contain"
          sizes="500px"
          priority
        />
      </div>
    </div>
  );
}

function Bullet({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 w-2 h-2 rounded-full ${color} shrink-0`} />
      <span>{children}</span>
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {result.milestone !== null ? <MilestoneBanner days={result.milestone} /> : null}

      <Card className={`p-8 text-center ${passed ? 'bg-teal-50 border-teal-200' : 'bg-orange-50 border-orange-200'}`}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className={passed ? 'text-teal-600' : 'text-orange-500'} size={40} />
          <h3 className="text-3xl font-extrabold text-gray-800">
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

      <Card className="p-6">
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
                    <div className="text-xs text-gray-500">{q.questionVi}</div>
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
                  <Volume2 className="text-gray-300" size={16} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
