'use client';

// Yes/No answer quiz screen for the Speaking sections. Uses the shared calm
// "Luyện tập" chrome (PracticeProgressRow + PracticeSupportPanel) like the
// Civics practice page, but swaps the A/B/C/D option grid for two big
// [Yes, officer] / [No, officer] buttons. Picking reveals feedback; the bottom
// Tiếp theo bar only appears after answering.

import { useMemo, useState } from 'react';
import { CheckCircle, XCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { AudioButton } from '@/components/n400/AudioButton';
import { PracticeSessionSummary } from '@/components/n400/PracticeSessionSummary';
import { PracticeProgressRow, PracticeSupportPanel, LearningTipCard } from '@/components/n400/practice-chrome';
import { yesNoAudioUrl } from '@/lib/n400/quiz-engine';
import type { YesNoQuestion } from '@/lib/n400/yesno-data';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';

type Choice = 'yes' | 'no';

export function SectionYesNoQuiz({
  questions,
  onAnswer,
  onExit,
  onRestart,
  title,
  estimatedMinutes,
}: {
  questions: YesNoQuestion[];
  onAnswer: (itemId: string, wasCorrect: boolean) => void;
  onExit: () => void;
  onRestart: () => void;
  title: string;
  /** Total estimated minutes for the session (from preset). */
  estimatedMinutes?: number | null;
}) {
  const { dict } = useN400Lang();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Choice | null>(null);
  const [phase, setPhase] = useState<'idle' | 'revealed'>('idle');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const done = index >= questions.length;
  const q = done ? null : questions[index];
  const wasCorrect = useMemo(
    () => (q && selected ? selected === q.answer : false),
    [q, selected],
  );

  if (done || !q) {
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

  const audioSrc = yesNoAudioUrl(q.num);

  const onPick = (choice: Choice) => {
    if (phase === 'revealed') return;
    const ok = choice === q.answer;
    setSelected(choice);
    setPhase('revealed');
    if (ok) setCorrectCount((c) => c + 1);
    else setWrongCount((c) => c + 1);
    onAnswer(q.id, ok);
  };

  const onNext = () => {
    setSelected(null);
    setPhase('idle');
    setIndex((i) => i + 1);
  };

  const choices: { id: Choice; label: string }[] = [
    { id: 'yes', label: 'Yes, officer' },
    { id: 'no', label: 'No, officer' },
  ];

  const answerLabel = q.answer === 'yes' ? 'Yes, officer' : 'No, officer';

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* Progress — calm shared row. Subtle Back returns to the section hub. */}
      <PracticeProgressRow index={index} total={questions.length} onBack={onExit} estimatedMinutes={estimatedMinutes} />

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
                  {/* Item badge intentionally omitted — the progress row above
                      already tracks position. */}
                  <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1.125rem, 2.6vw, 1.5rem)' }}>
                    {q.questionEn}
                  </div>
                  <div className="text-gray-500 mt-1" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
                    {q.questionVi}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <AudioButton src={audioSrc} label={dict.flashcards.listenQuestion} size="sm" />
                  <AudioButton src={audioSrc} label={dict.speaking.yesno.slowLabel} size="sm" rate={0.7} variant="slow" />
                </div>
              </div>
            </div>

            {/* Answer buttons — Yes / No */}
            <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
              {choices.map((choice) => {
                const isPicked = selected === choice.id;
                const isCorrectChoice = q.answer === choice.id;
                let style = 'border-gray-200 hover:border-teal-300 bg-white';
                let mark = <span className="w-6 h-6 rounded-full border-2 border-gray-300 shrink-0" />;

                if (phase === 'revealed') {
                  if (isCorrectChoice) {
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
                    key={choice.id}
                    type="button"
                    disabled={phase === 'revealed'}
                    onClick={() => onPick(choice.id)}
                    className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 text-center transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(56px,7vh,72px)] p-[clamp(0.5rem,1.2vh,0.875rem)] outline-none focus-visible:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-100 ${style}`}
                  >
                    <span className="font-bold text-gray-800" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
                      {choice.label}
                    </span>
                    {mark}
                  </button>
                );
              })}
            </div>

            {/* Learning Tip — mobile only, before answering */}
            {phase !== 'revealed' ? (
              <div className="mt-[clamp(0.75rem,2vh,1.25rem)] lg:hidden">
                <LearningTipCard>{dict.speaking.yesno.learningTip}</LearningTipCard>
              </div>
            ) : null}

            {/* Feedback */}
            {phase === 'revealed' ? (
              <div
                className={`mt-[clamp(0.5rem,1vh,0.75rem)] rounded-2xl p-[clamp(0.625rem,1.5vh,1rem)] border-l-4 animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none ${
                  wasCorrect ? 'bg-teal-50 border-teal-500' : 'bg-orange-50 border-orange-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="text-amber-500 shrink-0" size={16} />
                  <span className="font-bold text-gray-800" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {wasCorrect ? dict.practice.correctFeedback : dict.practice.incorrectFeedback}
                  </span>
                  <AudioButton src={audioSrc} label={dict.flashcards.listenAnswer} size="sm" className="ml-auto" />
                </div>
                <ul className="text-gray-700 space-y-0.5 list-disc pl-5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                  <li>
                    <span className="font-medium">{tFormat(dict.speaking.yesno.standardAnswer, { label: answerLabel })}</span>
                  </li>
                  <li>
                    <span className="text-gray-500">{q.questionVi}</span>
                  </li>
                </ul>
              </div>
            ) : null}
          </div>

          {/* Pinned actions — only after answering */}
          {phase === 'revealed' ? (
            <div
              className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
            >
              <button
                type="button"
                onClick={onNext}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors"
                style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
              >
                <span>{dict.practice.next}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : null}
        </div>

        {/* Support panel — illustration + one Learning Tip */}
        <PracticeSupportPanel
          tip={<LearningTipCard>{dict.speaking.yesno.learningTip}</LearningTipCard>}
        />
      </div>

      <span className="sr-only">{title}</span>
    </div>
  );
}
