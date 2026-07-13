'use client';

// Multiple-choice quiz screen for the Speaking sections. Uses the shared calm
// "Luyện tập" chrome (PracticeProgressRow + PracticeSupportPanel) exactly like
// the Civics practice page: quiet progress row, question card with a stacked
// A/B/C/D option list that becomes a 2×2 grid once answered, reveal feedback,
// and a bottom bar that only appears after answering.
//
// examMode (mock tests / full interview): answers are never revealed during
// the run — picking just selects (re-pickable), there is no feedback panel, the
// options stay a 2×2 grid, and the bottom bar is always visible so the learner
// can advance. Grading happens silently on Tiếp theo; scores surface only after
// the whole section is finished, like the real exam.

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { AudioButton } from '@/components/n400/AudioButton';
import { PracticeSessionSummary } from '@/components/n400/PracticeSessionSummary';
import { PracticeProgressRow, PracticeSupportPanel, LearningTipCard } from '@/components/n400/practice-chrome';

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

  const onPick = (id: MCOption['id']) => {
    if (phase === 'revealed') return;
    if (examMode) {
      // Exam: just select (re-pickable) — grading waits for Tiếp theo.
      setSelected(id);
      return;
    }
    const opt = q.options.find((o) => o.id === id);
    const wasCorrect = !!opt?.isCorrect;
    setSelected(id);
    setPhase('revealed');
    if (wasCorrect) setCorrectCount((c) => c + 1);
    else setWrongCount((c) => c + 1);
    onAnswer(q.itemId, wasCorrect);
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
  const twoUp = phase === 'revealed' || examMode;

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* Progress — calm shared row. Subtle Back returns to the section hub. */}
      <PracticeProgressRow index={index} total={questions.length} onBack={onExit} showTime={!examMode} />

      {/* Main area */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Question card */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vh,1.5rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {/* Header — question is the hero */}
            <div className="mb-[clamp(0.5rem,1vw,1rem)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-500" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)' }}>
                    {q.badge}
                  </div>
                  <div className="font-bold leading-snug text-gray-800 mt-0.5" style={{ fontSize: 'clamp(1.125rem, 2.6vw, 1.5rem)' }}>
                    {q.headerEn}
                  </div>
                  <div className="text-gray-500 mt-1" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
                    {q.headerVi}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <AudioButton src={q.questionAudioSrc} label="Nghe câu hỏi" size="sm" />
                </div>
              </div>
            </div>

            {/* Options — stacked before answering, 2-up after (or in exam mode) */}
            <div className={`grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)] ${twoUp ? 'sm:grid-cols-2' : ''}`}>
              {q.options.map((opt) => {
                const isPicked = selected === opt.id;
                let style = 'border-gray-200 hover:border-teal-300 bg-white';
                const chip = 'bg-gray-100 text-gray-700';
                let mark = <span className="w-6 h-6 rounded-full border-2 border-gray-300 shrink-0" />;

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
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(56px,7vh,72px)] p-[clamp(0.5rem,1.2vh,0.875rem)] outline-none focus-visible:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-100 ${style}`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${chip}`} style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                      {opt.id}
                    </div>
                    <div className="flex-1 text-gray-800 font-medium">
                      <div style={{ fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)' }}>{opt.en}</div>
                      {opt.vi && opt.vi !== opt.en ? (
                        <div className="text-gray-500 mt-0.5" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}>
                          {opt.vi}
                        </div>
                      ) : null}
                    </div>
                    {mark}
                  </button>
                );
              })}
            </div>

            {/* Learning Tip — mobile only, before answering (desktop shows it in the panel) */}
            {!examMode && phase !== 'revealed' ? (
              <div className="mt-[clamp(0.75rem,2vh,1.25rem)] lg:hidden">
                <LearningTipCard />
              </div>
            ) : null}

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

          {/* Pinned actions — exam: always visible; practice: only after answering */}
          {examMode || phase === 'revealed' ? (
            <div
              className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
            >
              <button
                type="button"
                onClick={onNext}
                disabled={examMode && !selected}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold shadow-md transition-all ${
                  examMode && !selected
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
                }`}
                style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
              >
                <span>{examMode && isLast ? 'Nộp bài' : 'Tiếp theo / Next'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : null}
        </div>

        {/* Support panel — illustration + one Learning Tip */}
        <PracticeSupportPanel />
      </div>

      <span className="sr-only">{title}</span>
    </div>
  );
}
