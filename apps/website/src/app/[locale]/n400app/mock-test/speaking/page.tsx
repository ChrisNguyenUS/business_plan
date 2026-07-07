'use client';

// Thi thử Speaking — hybrid speaking mock test. Combines 5 What Mean
// multiple-choice items with 5 Yes/No items into a single shuffled 10-question
// session. Chrome reuses the exact Speaking-section quiz layout (progress strip,
// question card, reveal feedback, pinned Next, decorative sidebar); the two card
// bodies (A/B/C/D grid vs Yes/No buttons) are branched per item. Pass rule:
// answer ≥ 8 / 10 correctly.

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  Lightbulb,
  ArrowRight,
  Trophy,
  RotateCcw,
  ArrowLeft,
  Target,
  Award,
  Rocket,
} from 'lucide-react';
import { AudioButton } from '@/components/n400/AudioButton';
import { useN400UserState } from '@/lib/n400/user-state';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { buildWhatMeanOptions } from '@/lib/n400/whatmean-options';
import {
  shuffle,
  whatMeanQuestionAudioUrl,
  whatMeanAnswerAudioUrl,
  yesNoAudioUrl,
} from '@/lib/n400/quiz-engine';

const MC_COUNT = 5;
const YESNO_COUNT = 5;
const TOTAL = MC_COUNT + YESNO_COUNT;
const PASS_THRESHOLD = 8; // đúng ≥ 8/10 là đạt

type Choice = 'yes' | 'no';

interface McItem {
  kind: 'mc';
  id: string;
  badge: string;
  headerEn: string;
  headerVi: string;
  questionAudioSrc: string | null;
  answerAudioSrc: string | null;
  options: { id: 'A' | 'B' | 'C' | 'D'; en: string; isCorrect: boolean }[];
  accepted: { en: string; vi: string };
}

interface YesNoItem {
  kind: 'yesno';
  id: string;
  num: number;
  questionEn: string;
  questionVi: string;
  answer: Choice;
  audioSrc: string | null;
}

type MockItem = McItem | YesNoItem;

function buildItems(seed: number): MockItem[] {
  const mc: McItem[] = shuffle([...WHATMEAN_QUESTIONS], `mock-spk-wm-${seed}`)
    .slice(0, MC_COUNT)
    .map((q) => ({
      kind: 'mc',
      id: q.id,
      badge: `Từ vựng / Vocabulary #${q.num}`,
      headerEn: q.termEn,
      headerVi: q.questionVi,
      questionAudioSrc: whatMeanQuestionAudioUrl(q.num),
      answerAudioSrc: whatMeanAnswerAudioUrl(q.num),
      options: buildWhatMeanOptions(q, `${seed}-${q.id}`).map((o) => ({
        id: o.id,
        en: o.text,
        isCorrect: o.isCorrect,
      })),
      accepted: { en: q.definitionEn, vi: q.definitionVi },
    }));

  const yesno: YesNoItem[] = shuffle([...YESNO_QUESTIONS], `mock-spk-yn-${seed}`)
    .slice(0, YESNO_COUNT)
    .map((q) => ({
      kind: 'yesno',
      id: q.id,
      num: q.num,
      questionEn: q.questionEn,
      questionVi: q.questionVi,
      answer: q.answer,
      audioSrc: yesNoAudioUrl(q.num),
    }));

  return shuffle([...mc, ...yesno], `mock-spk-mix-${seed}`);
}

export default function ThiThuSpeakingPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { recordSectionMockResult } = useN400UserState();

  const [seed, setSeed] = useState(0);
  const items = useMemo(() => buildItems(seed), [seed]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'revealed'>('idle');
  const [pickedMc, setPickedMc] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [pickedYn, setPickedYn] = useState<Choice | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const item = items[index];

  const retake = () => {
    setSeed((s) => s + 1);
    setIndex(0);
    setPhase('idle');
    setPickedMc(null);
    setPickedYn(null);
    setCorrectCount(0);
    setFinished(false);
  };

  if (finished) {
    const passed = correctCount >= PASS_THRESHOLD;
    return (
      <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center animate-in fade-in duration-300">
        <div
          className={`w-full max-w-md rounded-[24px] border p-6 text-center shadow-sm sm:p-8 ${
            passed ? 'border-teal-200 bg-teal-50' : 'border-orange-200 bg-orange-50'
          }`}
        >
          <div className="mb-4 flex flex-col items-center justify-center gap-3">
            <Trophy className={passed ? 'text-teal-600' : 'text-orange-500'} size={40} />
            <h2 className="text-2xl font-extrabold text-gray-800">
              {passed ? 'Chúc mừng! Bạn đã đạt!' : 'Cố lên! Lần sau sẽ tốt hơn.'}
            </h2>
          </div>
          <div className="mb-2 text-5xl font-extrabold text-gray-900">
            {correctCount}
            <span className="text-2xl text-gray-500">/{TOTAL}</span>
          </div>
          <p className="text-sm text-gray-600">
            Cần trả lời đúng ≥ {PASS_THRESHOLD}/{TOTAL} câu để đạt. Bạn đạt{' '}
            {Math.round((correctCount / TOTAL) * 100)}% độ chính xác.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={retake}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-teal-700"
            >
              <RotateCcw size={16} /> Thi lại
            </button>
            <Link
              href={`/${locale}/n400app/mock-test`}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft size={16} /> Chọn bài khác
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const isLast = index === items.length - 1;

  const reveal = (correct: boolean) => {
    setPhase('revealed');
    if (correct) setCorrectCount((c) => c + 1);
  };

  const onPickMc = (id: 'A' | 'B' | 'C' | 'D') => {
    if (phase === 'revealed' || item.kind !== 'mc') return;
    setPickedMc(id);
    reveal(!!item.options.find((o) => o.id === id)?.isCorrect);
  };

  const onRevealMc = () => {
    if (phase === 'revealed' || item.kind !== 'mc') return;
    setPickedMc(null);
    reveal(false); // viewing the answer counts as incorrect, like the practice quiz
  };

  const onPickYn = (choice: Choice) => {
    if (phase === 'revealed' || item.kind !== 'yesno') return;
    setPickedYn(choice);
    reveal(choice === item.answer);
  };

  const onNext = () => {
    if (isLast) {
      setFinished(true);
      void recordSectionMockResult('speaking', correctCount >= PASS_THRESHOLD, correctCount, TOTAL);
      return;
    }
    setIndex((i) => i + 1);
    setPhase('idle');
    setPickedMc(null);
    setPickedYn(null);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* Progress row */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <span className="font-bold text-gray-700" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>
          Câu {index + 1} / {TOTAL}
        </span>
        <Link
          href={`/${locale}/n400app/mock-test`}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <ArrowLeft size={14} /> Thoát
        </Link>
      </div>
      <div className="w-full bg-slate-100 rounded-full overflow-hidden h-[clamp(4px,0.5vw,10px)] shrink-0">
        <div
          className="h-full bg-teal-600 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${((index + 1) / TOTAL) * 100}%` }}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Question card */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vh,1.5rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {item.kind === 'mc' ? (
              <McBody item={item} phase={phase} picked={pickedMc} onPick={onPickMc} />
            ) : (
              <YesNoBody item={item} phase={phase} picked={pickedYn} onPick={onPickYn} />
            )}
          </div>

          {/* Pinned actions */}
          <div
            className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            {item.kind === 'mc' && phase !== 'revealed' ? (
              <div className="grid gap-3 grid-cols-[1fr_2fr]">
                <button
                  type="button"
                  onClick={onRevealMc}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                  style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                >
                  <Lightbulb size={16} />
                  <span className="leading-tight">Xem đáp án</span>
                </button>
                <NextButton disabled onClick={onNext} isLast={isLast} />
              </div>
            ) : (
              <NextButton disabled={phase !== 'revealed'} onClick={onNext} isLast={isLast} />
            )}
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
              Bình tĩnh và tự tin
              <br />
              như đang thi thật!
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Đạt ≥ {PASS_THRESHOLD}/{TOTAL} câu để vượt qua. Bạn làm được! 💪
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <TipCard icon={<Target size={20} />} tone="teal" title="Tập trung mỗi câu" desc="Nghe kỹ câu hỏi trước khi trả lời." />
            <TipCard icon={<Award size={20} />} tone="orange" title="What Mean + Yes/No" desc="5 câu giải nghĩa và 5 câu Yes/No." />
            <TipCard icon={<Rocket size={20} />} tone="purple" title="Chinh phục mục tiêu" desc="Trả lời đúng 8/10 là bạn đã sẵn sàng." />
          </div>
        </div>
      </div>
    </div>
  );
}

function NextButton({
  disabled,
  onClick,
  isLast,
}: {
  disabled: boolean;
  onClick: () => void;
  isLast: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold shadow-md transition-all ${
        disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
          : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
      }`}
      style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
    >
      <span>{isLast ? 'Nộp bài' : 'Tiếp theo / Next'}</span>
      <ArrowRight size={16} />
    </button>
  );
}

function McBody({
  item,
  phase,
  picked,
  onPick,
}: {
  item: McItem;
  phase: 'idle' | 'revealed';
  picked: 'A' | 'B' | 'C' | 'D' | null;
  onPick: (id: 'A' | 'B' | 'C' | 'D') => void;
}) {
  const pickedCorrect = !!item.options.find((o) => o.id === picked)?.isCorrect;
  return (
    <>
      {/* Header */}
      <div className="mb-[clamp(0.5rem,1vw,1rem)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-gray-500" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)' }}>
              {item.badge}
            </div>
            <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
              {item.headerEn}
            </div>
            <div className="text-gray-500 mt-0.5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
              {item.headerVi}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <AudioButton src={item.questionAudioSrc} label="Nghe câu hỏi" size="sm" />
          </div>
        </div>
      </div>

      {/* Options — 2-up on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(0.375rem,1vh,0.625rem)]">
        {item.options.map((opt) => {
          const isPicked = picked === opt.id;
          let style = 'border-gray-200 hover:border-teal-300 bg-white';
          let mark = <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />;

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
              <div className="flex-1 text-gray-800 font-medium" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                {opt.en}
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
            pickedCorrect ? 'bg-teal-50 border-teal-500' : 'bg-orange-50 border-orange-500'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="text-amber-500 shrink-0" size={16} />
            <span className="font-bold text-gray-800" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
              {pickedCorrect ? 'Chính xác! / Correct!' : 'Chưa đúng / Not quite'}
            </span>
            {item.answerAudioSrc ? (
              <AudioButton src={item.answerAudioSrc} label="Nghe đáp án" size="sm" className="ml-auto" />
            ) : null}
          </div>
          <ul className="text-gray-700 space-y-0.5 list-disc pl-5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
            <li>
              <span className="font-medium">{item.accepted.en}</span>
              {item.accepted.vi && item.accepted.vi !== item.accepted.en ? (
                <span className="text-gray-500"> — {item.accepted.vi}</span>
              ) : null}
            </li>
          </ul>
        </div>
      ) : null}
    </>
  );
}

function YesNoBody({
  item,
  phase,
  picked,
  onPick,
}: {
  item: YesNoItem;
  phase: 'idle' | 'revealed';
  picked: Choice | null;
  onPick: (choice: Choice) => void;
}) {
  const wasCorrect = picked === item.answer;
  const answerLabel = item.answer === 'yes' ? 'Yes, officer' : 'No, officer';
  const choices: { id: Choice; label: string }[] = [
    { id: 'yes', label: 'Yes, officer' },
    { id: 'no', label: 'No, officer' },
  ];
  return (
    <>
      {/* Header */}
      <div className="mb-[clamp(0.5rem,1vw,1rem)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-gray-500" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)' }}>
              Câu hỏi Yes/No #{item.num}
            </div>
            <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
              {item.questionEn}
            </div>
            <div className="text-gray-500 mt-0.5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
              {item.questionVi}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <AudioButton src={item.audioSrc} label="Nghe câu hỏi" size="sm" />
            <AudioButton src={item.audioSrc} label="Nghe chậm" size="sm" rate={0.7} variant="slow" />
          </div>
        </div>
      </div>

      {/* Answer buttons — Yes / No */}
      <div className="grid grid-cols-2 gap-[clamp(0.375rem,1vh,0.625rem)]">
        {choices.map((choice) => {
          const isPicked = picked === choice.id;
          const isCorrectChoice = item.answer === choice.id;
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
            <AudioButton src={item.audioSrc} label="Nghe đáp án" size="sm" className="ml-auto" />
          </div>
          <ul className="text-gray-700 space-y-0.5 list-disc pl-5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
            <li>
              <span className="font-medium">Đáp án chuẩn: {answerLabel}</span>
            </li>
            <li>
              <span className="text-gray-500">{item.questionVi}</span>
            </li>
          </ul>
        </div>
      ) : null}
    </>
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
