'use client';

import Image from 'next/image';
import { Bookmark, CheckCircle, XCircle, ArrowRight, Lightbulb, Target, Award, Rocket, RotateCw, Flame } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { MilestoneBanner } from '@/components/n400/MilestoneBanner';
import { BadgeUnlockToast } from '@/components/n400/BadgeUnlockToast';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackStreakMilestone } from '@/lib/n400/analytics';
import { N400_QUESTIONS } from '@/lib/n400/questions-data';
import {
  buildOptions,
  correctAnswersFor,
  shuffle,
  type QuizOption,
} from '@/lib/n400/quiz-engine';
import { questionAudioUrl, answerAudioUrlFor } from '@/lib/n400/quiz-engine';

const TOTAL = N400_QUESTIONS.length;

export default function PracticePage() {
  const {
    state,
    hydrated,
    recordAnswer,
    toggleBookmark,
  } = useN400UserState();

  const [seed] = useState(() => {
    if (typeof window === 'undefined') return 'init';
    const existing = window.sessionStorage.getItem('n400.practice.seed');
    if (existing) return existing;
    const next = String(Date.now());
    window.sessionStorage.setItem('n400.practice.seed', next);
    return next;
  });

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<QuizOption['id'] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [prevIndex, setPrevIndex] = useState(0);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const badges = useN400Badges();

  // Reset selected/revealed when navigating between questions (React-recommended pattern).
  if (index !== prevIndex) {
    setPrevIndex(index);
    setSelected(null);
    setRevealed(false);
    setMilestone(null);
    setUnlockedBadges([]);
  }

  const stateCode = state.settings.stateCode;
  const districtNumber = state.address.districtNumber;
  const order = useMemo(() => {
    // Skip Q29 (your U.S. Representative) when the user hasn't resolved
    // their congressional district yet — without it we can't build a correct
    // answer or 4 options.
    const ids = N400_QUESTIONS
      .filter((q) => q.id !== 29 || districtNumber !== null)
      .map((q) => q.id);
    return shuffle(ids, `practice-${seed}`);
  }, [seed, districtNumber]);

  const question = useMemo(() => {
    const id = order[index];
    return N400_QUESTIONS.find((q) => q.id === id)!;
  }, [order, index]);

  const options = useMemo(
    () => buildOptions(question, stateCode, `practice-${seed}-${index}`, districtNumber),
    [question, stateCode, seed, index, districtNumber]
  );

  const correctOption = options.find((o) => o.isCorrect);
  const allCorrect = correctAnswersFor(question, stateCode, districtNumber);

  const isBookmarked = state.bookmarks.includes(question.id);

  const onPick = (id: QuizOption['id']) => {
    if (revealed) return;
    setSelected(id);
    setRevealed(true);
    const opt = options.find((o) => o.id === id);
    const wasCorrect = !!opt?.isCorrect;
    void recordAnswer(question.id, wasCorrect, 'practice').then((result) => {
      if (result.milestone) {
        setMilestone(result.milestone);
        trackStreakMilestone(result.milestone);
      }
      if (result.unlockedBadges.length > 0) setUnlockedBadges(result.unlockedBadges);
    });
  };

  const onNext = () => {
    setIndex((i) => (i + 1) % order.length);
  };

  const onRestart = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('n400.practice.seed');
      window.location.reload();
    }
  };

  if (!hydrated) {
    return <div className="animate-in fade-in duration-300 text-sm text-gray-500">Đang tải…</div>;
  }

  return (
    <div className="flex flex-col lg:h-[calc(100vh-130px)] animate-in fade-in duration-300">
      {unlockedBadges.length > 0 ? (
        <BadgeUnlockToast
          slugs={unlockedBadges}
          catalog={Object.fromEntries(badges.catalog.map((b) => [b.slug, b]))}
          trigger="session_complete"
        />
      ) : null}

      {milestone !== null ? <MilestoneBanner days={milestone} /> : null}

      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm font-bold text-slate-700 mb-2">
            <span>Câu hỏi {index + 1} / {TOTAL}</span>
          </div>
          <ProgressBar progress={((index + 1) / TOTAL) * 100} heightClass="h-2" />
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
        >
          <RotateCw size={14} /> Trộn lại
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 flex-1 min-h-0 items-start lg:items-stretch">
        <Card className="flex flex-col p-5 sm:p-8 h-full overflow-hidden">
          <div className="mb-4 flex items-start justify-between shrink-0">
            <div className="flex-1 pr-4">
              <div className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-2 bg-teal-50 inline-block px-3 py-1 rounded-full">Câu hỏi / Question #{question.id}</div>
              <div className="text-lg sm:text-2xl font-bold leading-snug text-slate-800">
                {question.questionEn}
              </div>
              <div className="text-sm sm:text-base text-slate-500 mt-1 font-medium">{question.questionVi}</div>
            </div>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <AudioButton src={questionAudioUrl(question.id)} label="Nghe câu hỏi" size="sm" />
              <button
                type="button"
                onClick={() => toggleBookmark(question.id)}
                aria-label="Đánh dấu"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isBookmarked
                    ? 'bg-amber-100 text-amber-500 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto min-h-0 pr-2 pb-4">
            {options.map((opt) => {
              const isPicked = selected === opt.id;
              let style = 'border-slate-200 hover:border-teal-300 bg-white';
              let mark = (
                <span className="w-5 h-5 rounded-full border-2 border-slate-200" />
              );

              if (revealed) {
                if (opt.isCorrect) {
                  style = 'border-teal-600 bg-teal-50';
                  mark = <CheckCircle size={20} className="text-teal-600" />;
                } else if (isPicked) {
                  style = 'border-red-400 bg-red-50';
                  mark = <XCircle size={20} className="text-red-500" />;
                } else {
                  style = 'border-slate-200 bg-white opacity-60';
                }
              } else if (isPicked) {
                style = 'border-teal-600 bg-white shadow-sm';
                mark = <CheckCircle size={20} className="text-teal-600" />;
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={revealed}
                  onClick={() => onPick(opt.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all ${style}`}
                >
                  <div className="w-6 shrink-0 font-bold text-slate-800 text-center">{opt.id}</div>
                  <div className="flex-1 text-slate-800 font-medium leading-tight">
                    <div className="text-[15px]">{opt.en}</div>
                    {opt.vi !== opt.en ? (
                      <div className="text-[13px] text-slate-500 mt-0.5">{opt.vi}</div>
                    ) : null}
                  </div>
                  {mark}
                </button>
              );
            })}

            {revealed ? (
              <div
                className={`mt-4 rounded-2xl p-4 border-l-4 shrink-0 ${
                  correctOption?.id === selected
                    ? 'bg-teal-50 border-teal-500'
                    : 'bg-orange-50 border-orange-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Lightbulb className="text-amber-500" size={18} />
                  <div className="font-bold text-slate-800">
                    {correctOption?.id === selected
                      ? 'Chính xác! / Correct!'
                      : 'Chưa đúng / Not quite'}
                  </div>
                  <AudioButton
                    src={answerAudioUrlFor(question, stateCode, districtNumber)}
                    label="Nghe đáp án"
                    size="sm"
                    className="ml-auto"
                  />
                </div>
                <div className="text-sm text-slate-700 mb-1">
                  <span className="font-semibold">Đáp án USCIS chấp nhận:</span>
                </div>
                <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                  {(allCorrect.length > 0 ? allCorrect : question.answersEn.map((en, i) => ({ en, vi: question.answersVi[i] ?? en }))).map((a, i) => (
                    <li key={i}>
                      <span className="font-medium">{a.en}</span>
                      {a.vi !== a.en ? <span className="text-slate-500"> — {a.vi}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="mt-auto grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_2fr] sm:gap-4 shrink-0 bg-white z-10">
            <button
              type="button"
              onClick={() => setRevealed(true)}
              disabled={revealed}
              className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Lightbulb size={16} />
              <span className="leading-tight text-left text-sm">
                Xem đáp án
              </span>
            </button>
            <button
              type="button"
              onClick={onNext}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white shadow-md hover:bg-teal-700 text-sm"
            >
              <span>Tiếp theo / Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </Card>

        <div className="hidden lg:flex flex-col gap-4 h-full overflow-hidden">
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
              <div className="text-sm font-bold text-slate-500 mb-1">Chuỗi ngày</div>
              <div className="text-2xl font-black text-orange-500 flex items-center gap-1">
                <Flame size={20} fill="currentColor" />
                {state.streak.current}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
              <div className="text-sm font-bold text-slate-500 mb-1">Độ chính xác</div>
              <div className="text-2xl font-black text-teal-600 flex items-center gap-1">
                <Target size={20} />
                {state.attempts.length > 0 ? Math.round((state.attempts.filter(a => a.wasCorrect).length / state.attempts.length) * 100) : 0}%
              </div>
            </div>
          </div>

          <div className="relative flex-1 min-h-0 overflow-hidden rounded-3xl bg-gradient-to-b from-slate-50/50 to-slate-100/50">
            <Image
              src="/images/n400/illu-statue-city.png"
              alt="Statue of Liberty"
              fill
              className="object-contain object-bottom"
              sizes="500px"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
