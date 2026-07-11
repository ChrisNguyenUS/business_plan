'use client';

// Multiple-choice quiz screen for the Speaking sections. Reproduces the civics
// practice page chrome exactly: progress + Đổi chế độ/Trộn lại, a 2-column
// layout with the question card (header, 2×2 A/B/C/D option grid, reveal
// feedback, pinned Xem đáp án / Tiếp theo) and the decorative right sidebar.
//
// examMode (mock tests / full interview): answers are never revealed during
// the run — picking just selects (re-pickable), there is no Xem đáp án and no
// feedback panel, and grading happens silently when the user hits Tiếp theo.
// Scores surface only after the whole section is finished, like the real exam.

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  SlidersHorizontal,
  RotateCw,
  CheckCircle,
  XCircle,
  Lightbulb,
  ArrowRight,
  Target,
  Award,
  Rocket,
} from 'lucide-react';
import { AudioButton } from '@/components/n400/AudioButton';
import { PracticeSessionSummary } from '@/components/n400/PracticeSessionSummary';

export interface MCOption {
  id: 'A' | 'B' | 'C' | 'D';
  en: string;
  vi: string;
  isCorrect: boolean;
}

export interface MCQuestion {
  itemId: string;
  badge: string; // "Câu hỏi / Question #n"
  headerEn: string;
  headerVi: string;
  questionAudioSrc: string | null;
  answerAudioSrc: string | null;
  options: MCOption[];
  /** Accepted-answer lines shown in the reveal feedback. */
  accepted: { en: string; vi: string }[];
}

export function SectionMCQuiz({
  questions,
  onAnswer,
  onExit,
  onRestart,
  title,
  skipSummary = false,
  examMode = false,
  onComplete,
}: {
  questions: MCQuestion[];
  onAnswer: (itemId: string, wasCorrect: boolean) => void;
  onExit: () => void;
  onRestart: () => void;
  title: string;
  /** When true, never render the end-of-session summary; fire onComplete instead. */
  skipSummary?: boolean;
  /** When true, defer grading to Tiếp theo and never reveal the answer mid-run. */
  examMode?: boolean;
  onComplete?: (result: { correct: number; wrong: number }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<MCOption['id'] | null>(null);
  const [phase, setPhase] = useState<'idle' | 'revealed'>('idle');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const done = index >= questions.length;
  const q = done ? null : questions[index];
  const pickedOption = useMemo(
    () => (q && selected ? q.options.find((o) => o.id === selected) ?? null : null),
    [q, selected],
  );

  useEffect(() => {
    if (done && skipSummary) {
      onComplete?.({ correct: correctCount, wrong: wrongCount });
    }
    // Only fire when a session actually finishes — counts are frozen then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, skipSummary]);

  if (done || !q) {
    if (skipSummary) return null;
    return (
      <div className="flex flex-col h-full overflow-hidden max-w-[1100px] mx-auto w-full">
        <PracticeSessionSummary
          correct={correctCount}
          total={questions.length}
          wrongCount={wrongCount}
          onReviewWrong={onRestart}
          onRetry={onRestart}
          onChangeMode={onExit}
        />
      </div>
    );
  }

  const reveal = (picked: MCOption['id'] | null, wasCorrect: boolean) => {
    setSelected(picked);
    setPhase('revealed');
    if (wasCorrect) setCorrectCount((c) => c + 1);
    else setWrongCount((c) => c + 1);
    onAnswer(q.itemId, wasCorrect);
  };

  const onPick = (id: MCOption['id']) => {
    if (phase === 'revealed') return;
    if (examMode) {
      // Exam: just select (re-pickable) — grading waits for Tiếp theo.
      setSelected(id);
      return;
    }
    const opt = q.options.find((o) => o.id === id);
    reveal(id, !!opt?.isCorrect);
  };

  const onReveal = () => {
    if (phase === 'revealed') return;
    reveal(null, false); // viewing the answer counts as incorrect, like civics
  };

  const onNext = () => {
    if (examMode) {
      if (!selected) return;
      // Grade silently — no reveal state, straight to the next question.
      const opt = q.options.find((o) => o.id === selected);
      const wasCorrect = !!opt?.isCorrect;
      if (wasCorrect) setCorrectCount((c) => c + 1);
      else setWrongCount((c) => c + 1);
      onAnswer(q.itemId, wasCorrect);
    }
    setSelected(null);
    setPhase('idle');
    setIndex((i) => i + 1);
  };

  const isLast = index === questions.length - 1;
  const nextEnabled = examMode ? selected !== null : phase === 'revealed';
  const showRevealBtn = !examMode && phase !== 'revealed';

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* Progress row */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <span className="font-bold text-gray-700" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>
          Câu hỏi {index + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
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
      <ProgressStrip value={((index + 1) / questions.length) * 100} />

      {/* Main area */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Question card */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vh,1.5rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {/* Header */}
            <div className="mb-[clamp(0.5rem,1vw,1rem)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-500" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)' }}>
                    {q.badge}
                  </div>
                  <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                    {q.headerEn}
                  </div>
                  <div className="text-gray-500 mt-0.5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {q.headerVi}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <AudioButton src={q.questionAudioSrc} label="Nghe câu hỏi" size="sm" />
                </div>
              </div>
            </div>

            {/* Options — 2-up on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(0.375rem,1vh,0.625rem)]">
              {q.options.map((opt) => {
                const isPicked = selected === opt.id;
                let style = 'border-gray-200 hover:border-teal-300 bg-white';
                let mark = <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />;

                if (examMode && isPicked) {
                  // Selected-but-ungraded: teal highlight with a filled radio —
                  // deliberately no ✓/✗ so nothing hints at correctness.
                  style = 'border-teal-600 bg-teal-50';
                  mark = <span className="w-6 h-6 rounded-full border-[7px] border-teal-600 bg-white shrink-0" />;
                }

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
                  <button
                    key={opt.id}
                    type="button"
                    disabled={phase === 'revealed'}
                    onClick={() => onPick(opt.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(52px,7vh,68px)] p-[clamp(0.5rem,1.2vh,0.875rem)] ${style}`}
                  >
                    <div className="w-6 shrink-0 font-bold text-gray-800" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                      {opt.id}
                    </div>
                    <div className="flex-1 text-gray-800 font-medium">
                      <div style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>{opt.en}</div>
                      {opt.vi && opt.vi !== opt.en ? (
                        <div className="text-gray-500 mt-0.5" style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)' }}>
                          {opt.vi}
                        </div>
                      ) : null}
                    </div>
                    {mark}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {phase === 'revealed' ? (
              <div
                className={`mt-[clamp(0.5rem,1vh,0.75rem)] rounded-2xl p-[clamp(0.625rem,1.5vh,1rem)] border-l-4 animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none ${
                  pickedOption?.isCorrect ? 'bg-teal-50 border-teal-500' : 'bg-orange-50 border-orange-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="text-amber-500 shrink-0" size={16} />
                  <span className="font-bold text-gray-800" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {pickedOption?.isCorrect ? 'Chính xác! / Correct!' : 'Chưa đúng / Not quite'}
                  </span>
                  {q.answerAudioSrc ? (
                    <AudioButton src={q.answerAudioSrc} label="Nghe đáp án" size="sm" className="ml-auto" />
                  ) : null}
                </div>
                <ul className="text-gray-700 space-y-0.5 list-disc pl-5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                  {q.accepted.map((a, i) => (
                    <li key={i}>
                      <span className="font-medium">{a.en}</span>
                      {a.vi && a.vi !== a.en ? <span className="text-gray-500"> — {a.vi}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Pinned actions */}
          <div
            className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            <div className={`grid gap-3 ${showRevealBtn ? 'grid-cols-[1fr_2fr]' : 'grid-cols-1'}`}>
              {showRevealBtn ? (
                <button
                  type="button"
                  onClick={onReveal}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                  style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                >
                  <Lightbulb size={16} />
                  <span className="leading-tight">Xem đáp án</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={onNext}
                disabled={!nextEnabled}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold shadow-md transition-all ${
                  nextEnabled
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                }`}
                style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
              >
                <span>{examMode && isLast ? 'Nộp bài' : 'Tiếp theo / Next'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Decorative sidebar */}
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
            <p className="text-sm text-gray-500 mt-2">Giữ vững phong độ và chinh phục N400 nhé! 💪</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <TipCard icon={<Target size={20} />} tone="teal" title="Tập trung mỗi ngày" desc="Tiến bộ hơn 1% hôm nay tốt hơn ngày mai." />
            <TipCard icon={<Award size={20} />} tone="orange" title="Thử thách bản thân" desc="Càng luyện tập nhiều, kết quả càng bứt phá." />
            <TipCard icon={<Rocket size={20} />} tone="purple" title="Chinh phục mục tiêu" desc="N400 không còn xa khi bạn không bỏ cuộc." />
          </div>
        </div>
      </div>

      <span className="sr-only">{title}</span>
    </div>
  );
}

function ProgressStrip({ value }: { value: number }) {
  return (
    <div className="w-full bg-slate-100 rounded-full overflow-hidden h-[clamp(4px,0.5vw,10px)] shrink-0">
      <div
        className="h-full bg-teal-600 rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${value}%` }}
      />
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
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${styles[tone]}`}>{icon}</div>
      <div className="font-bold text-sm text-gray-800 mb-1 leading-tight">{title}</div>
      <div className="text-[11px] text-gray-500 leading-snug">{desc}</div>
    </div>
  );
}
