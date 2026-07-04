'use client';

/*
 * PRACTICE PAGE — LAYOUT ARCHITECTURE
 *
 * This page uses an immersive layout (see practice/layout.tsx):
 * - The page NEVER scrolls.
 * - The Study Body is the ONLY scrollable area.
 * - English and Vietnamese content ALWAYS stay together.
 * - Bottom study controls ALWAYS remain visible and anchored.
 * - Every question begins from a predictable clean state.
 */

import Image from 'next/image';
import { Bookmark, CheckCircle, XCircle, ArrowRight, Lightbulb, Target, Award, Rocket, RotateCw, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { ProgressBar } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { MilestoneBanner } from '@/components/n400/MilestoneBanner';
import { BadgeUnlockToast } from '@/components/n400/BadgeUnlockToast';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackStreakMilestone, trackPracticeComplete } from '@/lib/n400/analytics';
import { N400_QUESTIONS } from '@/lib/n400/questions-data';
import {
  buildOptions,
  correctAnswersFor,
  selectPracticeQuestionIds,
  isPersonalizedAnswerUnavailable,
  PRACTICE_PRESETS,
  type PracticePreset,
  type QuizOption,
} from '@/lib/n400/quiz-engine';
import { questionAudioUrl, answerAudioUrlFor } from '@/lib/n400/quiz-engine';
import { PracticeSessionPicker } from '@/components/n400/PracticeSessionPicker';
import { PracticeSessionSummary } from '@/components/n400/PracticeSessionSummary';
import { PersonalizedAnswerNotice } from '@/components/n400/PersonalizedAnswerNotice';

const PRESET_STORAGE_KEY = 'n400.practice.preset';

function readStoredPreset(): PracticePreset | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(PRESET_STORAGE_KEY);
  return PRACTICE_PRESETS.find((p) => p.id === raw) ?? null;
}

/* ─── Interaction State Machine ─── */
type StudyPhase = 'idle' | 'revealed';

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

  const [preset, setPreset] = useState<PracticePreset | null>(() => readStoredPreset());
  const [completed, setCompleted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<QuizOption['id'] | null>(null);
  const [phase, setPhase] = useState<StudyPhase>('idle');
  const [prevIndex, setPrevIndex] = useState(0);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [revealExiting, setRevealExiting] = useState(false);
  const badges = useN400Badges();
  const studyBodyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Full UI reset when navigating between questions (React-recommended pattern).
  if (index !== prevIndex) {
    setPrevIndex(index);
    setSelected(null);
    setPhase('idle');
    setShowAllAnswers(false);
    setRevealExiting(false);
    setMilestone(null);
    setUnlockedBadges([]);
  }

  // After render: reset scroll position and focus
  useEffect(() => {
    studyBodyRef.current?.scrollTo({ top: 0 });
    cardRef.current?.focus({ preventScroll: true });
  }, [index]);

  // Reveal button fade-out animation
  const showRevealBtn = phase !== 'revealed' || revealExiting;
  useEffect(() => {
    if (phase === 'revealed') {
      setRevealExiting(true);
      const timer = setTimeout(() => setRevealExiting(false), 300);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const stateCode = state.settings.stateCode;
  const districtNumber = state.address.districtNumber;
  const order = useMemo(
    () => selectPracticeQuestionIds(seed, preset?.count ?? null),
    [seed, preset]
  );

  const question = useMemo(() => {
    const id = order[index];
    return N400_QUESTIONS.find((q) => q.id === id)!;
  }, [order, index]);

  const options = useMemo(
    () => buildOptions(question, stateCode, `practice-${seed}-${index}`, districtNumber),
    [question, stateCode, seed, index, districtNumber]
  );

  const allCorrect = correctAnswersFor(question, stateCode, districtNumber);
  const allAnswers = allCorrect.length > 0
    ? allCorrect
    : question.answersEn.map((en, i) => ({ en, vi: question.answersVi[i] ?? en }));

  const isBookmarked = state.bookmarks.includes(question.id);

  const onPick = (id: QuizOption['id']) => {
    if (phase === 'revealed') return;
    setSelected(id);
    setPhase('revealed');
    const opt = options.find((o) => o.id === id);
    const wasCorrect = !!opt?.isCorrect;
    if (wasCorrect) setCorrectCount((c) => c + 1);
    void recordAnswer(question.id, wasCorrect, 'practice').then((result) => {
      if (result.milestone) {
        setMilestone(result.milestone);
        trackStreakMilestone(result.milestone);
      }
      if (result.unlockedBadges.length > 0) setUnlockedBadges(result.unlockedBadges);
    });
  };

  const onNext = () => {
    // Guarantees trackPracticeComplete fires at most once per session even if
    // this handler is ever reachable after completion (double-click, hotkeys).
    if (completed) return;
    if (index + 1 >= order.length) {
      trackPracticeComplete(correctCount, order.length);
      setCompleted(true);
      return;
    }
    setIndex((i) => i + 1);
  };

  const onReveal = () => {
    if (phase !== 'idle') return;
    // Auto-select the correct answer when using Reveal
    const correct = options.find((o) => o.isCorrect);
    if (correct) {
      setSelected(correct.id);
    }
    setPhase('revealed');
    void recordAnswer(question.id, false, 'practice').then((result) => {
      if (result.milestone) {
        setMilestone(result.milestone);
        trackStreakMilestone(result.milestone);
      }
      if (result.unlockedBadges.length > 0) setUnlockedBadges(result.unlockedBadges);
    });
  };

  const onRestart = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('n400.practice.seed');
      window.location.reload();
    }
  };

  const onSelectPreset = (p: PracticePreset) => {
    window.sessionStorage.setItem(PRESET_STORAGE_KEY, p.id);
    setPreset(p);
    setIndex(0);
    setCorrectCount(0);
    setCompleted(false);
  };

  const onChangeMode = () => {
    window.sessionStorage.removeItem(PRESET_STORAGE_KEY);
    window.sessionStorage.removeItem('n400.practice.seed');
    window.location.reload();
  };

  if (!hydrated) {
    return <div className="animate-in fade-in duration-300 text-sm text-gray-500">Đang tải…</div>;
  }

  if (preset === null) {
    return (
      <div className="flex flex-col h-full overflow-hidden max-w-[1100px] mx-auto w-full">
        <PracticeSessionPicker
          presets={PRACTICE_PRESETS}
          totalCount={N400_QUESTIONS.length}
          onSelect={onSelectPreset}
        />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col h-full overflow-hidden max-w-[1100px] mx-auto w-full">
        <PracticeSessionSummary
          correct={correctCount}
          total={order.length}
          onRetry={onRestart}
          onChangeMode={onChangeMode}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {unlockedBadges.length > 0 ? (
        <BadgeUnlockToast
          slugs={unlockedBadges}
          catalog={Object.fromEntries(badges.catalog.map((b) => [b.slug, b]))}
          trigger="session_complete"
        />
      ) : null}

      {milestone !== null ? <MilestoneBanner days={milestone} /> : null}

      {/* Progress — shrink-0, compact on mobile */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <span className="font-bold text-gray-700" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>
          Câu hỏi {index + 1} / {order.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onChangeMode}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <SlidersHorizontal size={14} /> Đổi chế độ
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <RotateCw size={14} /> Trộn lại
          </button>
        </div>
      </div>
      <ProgressBar progress={((index + 1) / order.length) * 100} heightClass="h-[clamp(4px,0.5vw,10px)] shrink-0" />

      {/* Main area — flex-1, grid on desktop */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Question Card — flex-1, immersive */}
        <div
          ref={cardRef}
          tabIndex={-1}
          className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 outline-none focus:ring-0 overflow-hidden"
        >
          {/* Study Body — the only scrollable region */}
          <div
            ref={studyBodyRef}
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vw,2rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {/* Decorative header — hidden on mobile */}
            <div className="hidden sm:flex items-start gap-3 sm:gap-4 mb-4">
              <div className="relative h-20 w-20 shrink-0 sm:h-28 sm:w-28">
                <Image
                  src="/images/n400/illu-studying.png"
                  alt=""
                  fill
                  className="object-contain"
                  sizes="112px"
                  priority
                />
              </div>
              <div className="relative mt-3 rounded-2xl rounded-bl-none border border-gray-200 bg-gray-50 px-4 py-3 sm:mt-6 sm:px-5">
                <div className="text-sm text-gray-600 leading-tight">Cùng chinh phục</div>
                <div className="text-lg font-extrabold text-gray-900 leading-tight">N400!</div>
              </div>
            </div>

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
                  <div className="text-gray-500 mt-0.5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {question.questionVi}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <AudioButton src={questionAudioUrl(question.id)} label="Nghe câu hỏi" size="sm" />
                  <button
                    type="button"
                    onClick={() => toggleBookmark(question.id)}
                    aria-label="Đánh dấu"
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                      isBookmarked
                        ? 'bg-amber-50 text-amber-500'
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </div>

            {isPersonalizedAnswerUnavailable(question, districtNumber) ? (
              <div className="mb-[clamp(0.5rem,1vw,1rem)]">
                <PersonalizedAnswerNotice from="practice" />
              </div>
            ) : null}

            {/* Answer Options + Inline Feedback */}
            <div className="space-y-[clamp(0.375rem,1vw,0.75rem)]">
              {options.map((opt) => {
                const isPicked = selected === opt.id;
                let style = 'border-gray-200 hover:border-teal-300 bg-white';
                let mark = (
                  <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />
                );

                if (phase === 'revealed') {
                  if (opt.isCorrect) {
                    style = 'border-teal-600 bg-teal-50';
                    mark = <CheckCircle size={22} className="text-teal-600 shrink-0" />;
                  } else if (isPicked) {
                    style = 'border-red-400 bg-red-50';
                    mark = <XCircle size={22} className="text-red-500 shrink-0" />;
                  } else {
                    style = 'border-gray-200 bg-white opacity-70';
                  }
                }

                return (
                  <div key={opt.id}>
                    <button
                      type="button"
                      disabled={phase === 'revealed'}
                      onClick={() => onPick(opt.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-all duration-200 motion-reduce:duration-0 sm:gap-4 min-h-[72px] p-[clamp(0.625rem,1.5vw,1rem)] ${style}`}
                    >
                      <div className="w-6 shrink-0 font-bold text-gray-800" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>{opt.id}</div>
                      <div className="flex-1 text-gray-800 font-medium">
                        <div style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>{opt.en}</div>
                        {opt.vi !== opt.en ? (
                          <div className="text-gray-500 mt-0.5" style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)' }}>{opt.vi}</div>
                        ) : null}
                      </div>
                      {mark}
                    </button>

                    {/* Inline feedback — directly below the selected answer */}
                    {phase === 'revealed' && isPicked && (
                      <div
                        className={`mt-2 rounded-2xl p-[clamp(0.75rem,1.5vw,1.25rem)] border-l-4 animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none ${
                          opt.isCorrect
                            ? 'bg-teal-50 border-teal-500'
                            : 'bg-orange-50 border-orange-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="text-amber-500 shrink-0" size={16} />
                          <span className="font-bold text-gray-800" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                            {opt.isCorrect ? 'Chính xác! / Correct!' : 'Chưa đúng / Not quite'}
                          </span>
                          <AudioButton
                            src={answerAudioUrlFor(question, stateCode, districtNumber)}
                            label="Nghe đáp án"
                            size="sm"
                            className="ml-auto"
                          />
                        </div>
                        <div className="text-gray-700 mb-1" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                          <span className="font-semibold">Đáp án USCIS chấp nhận:</span>
                        </div>
                        <ul className="text-gray-700 space-y-0.5 list-disc pl-5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                          {allAnswers.slice(0, 2).map((a, i) => (
                            <li key={i}>
                              <span className="font-medium">{a.en}</span>
                              {a.vi !== a.en ? <span className="text-gray-500"> — {a.vi}</span> : null}
                            </li>
                          ))}
                        </ul>

                        {/* Progressive disclosure for 3+ answers */}
                        {allAnswers.length > 2 && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setShowAllAnswers(!showAllAnswers); }}
                              className="mt-2 text-teal-600 font-semibold flex items-center gap-1 transition-colors hover:text-teal-700"
                              style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.875rem)' }}
                            >
                              {showAllAnswers ? (
                                <><ChevronUp size={14} /> Thu gọn</>
                              ) : (
                                <><ChevronDown size={14} /> Xem tất cả {allAnswers.length} đáp án</>
                              )}
                            </button>
                            {showAllAnswers && (
                              <ul className="text-gray-700 space-y-0.5 list-disc pl-5 mt-1 animate-in fade-in duration-200 motion-reduce:animate-none" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                                {allAnswers.slice(2).map((a, i) => (
                                  <li key={i + 2}>
                                    <span className="font-medium">{a.en}</span>
                                    {a.vi !== a.en ? <span className="text-gray-500"> — {a.vi}</span> : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pinned Actions — always visible, never scroll */}
          <div
            className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vw,2rem)] pt-3"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            <div className={`grid gap-3 transition-all duration-300 motion-reduce:duration-0 ${
              showRevealBtn ? 'grid-cols-[1fr_2fr]' : 'grid-cols-1'
            }`}>
              {showRevealBtn && (
                <button
                  type="button"
                  onClick={onReveal}
                  disabled={phase === 'revealed'}
                  className={`flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 motion-reduce:duration-0 ${
                    revealExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                  }`}
                  style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                >
                  <Lightbulb size={16} />
                  <span className="leading-tight">Xem đáp án</span>
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                disabled={phase !== 'revealed'}
                className={`flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold shadow-md transition-all duration-300 motion-reduce:duration-0 ${
                  phase === 'revealed'
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                }`}
                style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
              >
                <span>Tiếp theo / Next</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar — decorative, never reduces study readability */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:max-w-[300px] xl:max-w-[400px] shrink-0 self-start">
          <div className="relative h-60 w-full overflow-hidden rounded-3xl">
            <Image
              src="/images/n400/illu-statue-city.png"
              alt="Statue of Liberty with American flag and city skyline"
              fill
              className="object-contain object-bottom"
              sizes="400px"
              priority
            />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 leading-snug">
              Mỗi câu trả lời đúng
              <br />
              là một bước gần hơn đến ước mơ!
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Giữ vững phong độ và chinh phục N400 nhé! 💪
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <TipCard
              icon={<Target size={20} />}
              tone="teal"
              title="Tập trung mỗi ngày"
              desc="Tiến bộ hơn 1% hôm nay tốt hơn ngày mai."
            />
            <TipCard
              icon={<Award size={20} />}
              tone="orange"
              title="Thử thách bản thân"
              desc="Càng luyện tập nhiều, kết quả càng bứt phá."
            />
            <TipCard
              icon={<Rocket size={20} />}
              tone="purple"
              title="Chinh phục mục tiêu"
              desc="N400 không còn xa khi bạn không bỏ cuộc."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TipCard({
  icon,
  tone,
  title,
  desc,
}: {
  icon: React.ReactNode;
  tone: 'teal' | 'orange' | 'purple';
  title: string;
  desc: string;
}) {
  const styles = {
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-500',
    purple: 'bg-purple-50 text-purple-600',
  } as const;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${styles[tone]}`}>
        {icon}
      </div>
      <div className="font-bold text-sm text-gray-800 mb-1 leading-tight">{title}</div>
      <div className="text-[11px] text-gray-500 leading-snug">{desc}</div>
    </div>
  );
}
