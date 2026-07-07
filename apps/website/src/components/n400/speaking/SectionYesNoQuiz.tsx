'use client';

// Yes/No answer quiz screen for the Speaking sections. Mirrors SectionMCQuiz
// chrome exactly (progress + Đổi chế độ/Trộn lại, question card with header,
// reveal feedback, pinned Tiếp theo, decorative right sidebar) but swaps the
// 2×2 A/B/C/D option grid for two big [Yes, officer] / [No, officer] buttons.

import { useMemo, useState } from 'react';
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
import { yesNoAudioUrl } from '@/lib/n400/quiz-engine';
import type { YesNoQuestion } from '@/lib/n400/yesno-data';

type Choice = 'yes' | 'no';

export function SectionYesNoQuiz({
  questions,
  onAnswer,
  onExit,
  onRestart,
  title,
}: {
  questions: YesNoQuestion[];
  onAnswer: (itemId: string, wasCorrect: boolean) => void;
  onExit: () => void;
  onRestart: () => void;
  title: string;
}) {
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
                    Câu hỏi Yes/No #{q.num}
                  </div>
                  <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                    {q.questionEn}
                  </div>
                  <div className="text-gray-500 mt-0.5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {q.questionVi}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <AudioButton src={audioSrc} label="Nghe câu hỏi" size="sm" />
                  <AudioButton src={audioSrc} label="Nghe chậm" size="sm" rate={0.7} variant="slow" />
                </div>
              </div>
            </div>

            {/* Answer buttons — Yes / No */}
            <div className="grid grid-cols-2 gap-[clamp(0.375rem,1vh,0.625rem)]">
              {choices.map((choice) => {
                const isPicked = selected === choice.id;
                const isCorrectChoice = q.answer === choice.id;
                let style = 'border-gray-200 hover:border-teal-300 bg-white';
                let mark = <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />;

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
                    className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 text-center transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(52px,7vh,68px)] p-[clamp(0.5rem,1.2vh,0.875rem)] ${style}`}
                  >
                    <span className="font-bold text-gray-800" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
                      {choice.label}
                    </span>
                    {mark}
                  </button>
                );
              })}
            </div>

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
                    {wasCorrect ? 'Chính xác! / Correct!' : 'Chưa đúng / Not quite'}
                  </span>
                  <AudioButton src={audioSrc} label="Nghe đáp án" size="sm" className="ml-auto" />
                </div>
                <ul className="text-gray-700 space-y-0.5 list-disc pl-5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                  <li>
                    <span className="font-medium">Đáp án chuẩn: {answerLabel}</span>
                  </li>
                  <li>
                    <span className="text-gray-500">{q.questionVi}</span>
                  </li>
                </ul>
              </div>
            ) : null}
          </div>

          {/* Pinned actions */}
          <div
            className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            <button
              type="button"
              onClick={onNext}
              disabled={phase !== 'revealed'}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold shadow-md transition-all ${
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
