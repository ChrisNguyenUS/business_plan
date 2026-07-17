'use client';

// Thi thử Speaking — hybrid speaking mock test. Combines 5 What Mean
// multiple-choice items with 5 Yes/No items into a single shuffled 10-question
// session. Chrome reuses the exact Speaking-section quiz layout (progress strip,
// question card, pinned Next, decorative sidebar); the two card bodies (A/B/C/D
// grid vs Yes/No buttons) are branched per item. Pass rule: answer ≥ 8 / 10.
//
// Exam semantics: picking only selects (re-pickable); grading happens silently
// on Tiếp theo and the answer is never revealed mid-run — the score surfaces
// on the result screen only, like the real interview.

import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AudioButton } from '@/components/n400/AudioButton';
import { MockResultScreen, type MockResultRow } from '@/components/n400/MockResultScreen';
import { MockExamProgress, MockExamPanel, MockExamRulesCard } from '@/components/n400/mock-test-chrome';
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
  const { recordSectionMockResult } = useN400UserState();

  const [seed, setSeed] = useState(0);
  const items = useMemo(() => buildItems(seed), [seed]);

  const [index, setIndex] = useState(0);
  const [pickedMc, setPickedMc] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [pickedYn, setPickedYn] = useState<Choice | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  // Per-question verdicts collected as each answer is graded — feeds the
  // result screen's answer sheet (the learner never sees them mid-run).
  const [answers, setAnswers] = useState<MockResultRow[]>([]);
  const [finished, setFinished] = useState(false);

  const item = items[index];

  const retake = () => {
    setSeed((s) => s + 1);
    setIndex(0);
    setPickedMc(null);
    setPickedYn(null);
    setCorrectCount(0);
    setAnswers([]);
    setFinished(false);
  };

  if (finished) {
    return (
      <MockResultScreen
        passed={correctCount >= PASS_THRESHOLD}
        score={correctCount}
        total={TOTAL}
        requirement={`Cần trả lời đúng ≥ ${PASS_THRESHOLD}/${TOTAL} câu để vượt qua.`}
        passSubtitle="Bạn đã sẵn sàng cho phần Speaking của buổi phỏng vấn."
        onRetake={retake}
        rows={answers}
        reviewHref={`/n400ready/study`}
        reviewLabel="Ôn luyện Speaking"
        reviewTip="Ôn lại phần Từ vựng và câu hỏi Yes/No để cải thiện điểm số của bạn!"
        hubHref={`/n400ready/mock-test`}
      />
    );
  }

  if (!item) return null;

  const isLast = index === items.length - 1;
  const hasPick = item.kind === 'mc' ? pickedMc !== null : pickedYn !== null;

  // Picking only selects — re-pickable until Tiếp theo, no grading yet.
  const onPickMc = (id: 'A' | 'B' | 'C' | 'D') => {
    if (item.kind !== 'mc') return;
    setPickedMc(id);
  };

  const onPickYn = (choice: Choice) => {
    if (item.kind !== 'yesno') return;
    setPickedYn(choice);
  };

  const onNext = () => {
    if (!hasPick) return;
    // Grade silently on advance; the learner never sees per-question results.
    const wasCorrect =
      item.kind === 'mc'
        ? !!item.options.find((o) => o.id === pickedMc)?.isCorrect
        : pickedYn === item.answer;
    const row: MockResultRow =
      item.kind === 'mc'
        ? {
            key: `${index}-${item.id}`,
            badge: `Câu ${index + 1} / ${item.badge}`,
            prompt: item.headerEn,
            promptVi: item.headerVi,
            userAnswer: item.options.find((o) => o.id === pickedMc)?.en ?? null,
            correctAnswer: item.options.find((o) => o.isCorrect)?.en ?? item.accepted.en,
            correctAnswerVi: item.accepted.vi,
            ok: wasCorrect,
            audioSrc: item.questionAudioSrc,
          }
        : {
            key: `${index}-${item.id}`,
            badge: `Câu ${index + 1} / Yes-No #${item.num}`,
            prompt: item.questionEn,
            promptVi: item.questionVi,
            userAnswer: pickedYn === 'yes' ? 'Yes, officer' : 'No, officer',
            correctAnswer: item.answer === 'yes' ? 'Yes, officer' : 'No, officer',
            ok: wasCorrect,
            audioSrc: item.audioSrc,
          };
    setAnswers((prev) => [...prev, row]);
    const newCount = correctCount + (wasCorrect ? 1 : 0);
    setCorrectCount(newCount);
    if (isLast) {
      setFinished(true);
      void recordSectionMockResult('speaking', newCount >= PASS_THRESHOLD, newCount, TOTAL);
      return;
    }
    setIndex((i) => i + 1);
    setPickedMc(null);
    setPickedYn(null);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* Progress — calm exam card: counter · bar · questions remaining */}
      <MockExamProgress index={index} total={TOTAL} />

      {/* Main area */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Question card */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vh,1.5rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {item.kind === 'mc' ? (
              <McBody item={item} picked={pickedMc} onPick={onPickMc} />
            ) : (
              <YesNoBody item={item} picked={pickedYn} onPick={onPickYn} />
            )}

            {/* Mobile Exam Rules (desktop shows it in the right rail) */}
            <div className="mt-[clamp(0.75rem,2vh,1.25rem)] lg:hidden">
              <MockExamRulesCard />
            </div>
          </div>

          {/* Pinned actions — no Xem đáp án in a mock test */}
          <div
            className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            <NextButton disabled={!hasPick} onClick={onNext} isLast={isLast} />
          </div>
        </div>

        {/* Right rail — exam illustration + Exam Rules */}
        <MockExamPanel mode="speaking" />
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
      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold shadow-md transition-all ${
        disabled
          ? 'cursor-not-allowed bg-teal-600/20 text-teal-700/50 shadow-none'
          : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
      }`}
      style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
    >
      <span>{isLast ? 'Nộp bài' : 'Next'}</span>
      <ArrowRight size={16} />
    </button>
  );
}

function McBody({
  item,
  picked,
  onPick,
}: {
  item: McItem;
  picked: 'A' | 'B' | 'C' | 'D' | null;
  onPick: (id: 'A' | 'B' | 'C' | 'D') => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="mb-[clamp(0.5rem,1vw,1rem)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Question position intentionally omitted — the progress row above
                already tracks it. */}
            <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
              {item.headerEn}
            </div>
            {/* English only while taking — Vietnamese gloss appears in the result. */}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <AudioButton src={item.questionAudioSrc} label="Nghe câu hỏi" size="sm" />
            <AudioButton src={item.questionAudioSrc} label="Đọc chậm / Speak Slower" size="sm" rate={0.7} variant="slow" />
          </div>
        </div>
      </div>

      {/* Options — calm stacked column, chip + radio on the right */}
      <div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
        {item.options.map((opt) => {
          const isPicked = picked === opt.id;
          // Selected-but-ungraded: teal highlight with a filled radio — no ✓/✗
          // so nothing hints at correctness before the test is over.
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
              className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(56px,7vh,72px)] p-[clamp(0.5rem,1.2vh,0.875rem)] ${style}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 font-bold text-gray-700" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                {opt.id}
              </div>
              <div className="flex-1 text-gray-800 font-medium" style={{ fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)' }}>
                {opt.en}
              </div>
              {mark}
            </button>
          );
        })}
      </div>
    </>
  );
}

function YesNoBody({
  item,
  picked,
  onPick,
}: {
  item: YesNoItem;
  picked: Choice | null;
  onPick: (choice: Choice) => void;
}) {
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
            {/* Question position intentionally omitted — the progress row above
                already tracks it. */}
            <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
              {item.questionEn}
            </div>
            {/* English only while taking — Vietnamese gloss appears in the result. */}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <AudioButton src={item.audioSrc} label="Nghe câu hỏi" size="sm" />
            <AudioButton src={item.audioSrc} label="Đọc chậm / Speak Slower" size="sm" rate={0.7} variant="slow" />
          </div>
        </div>
      </div>

      {/* Answer buttons — Yes / No */}
      <div className="grid grid-cols-2 gap-[clamp(0.375rem,1vh,0.625rem)]">
        {choices.map((choice) => {
          const isPicked = picked === choice.id;
          // Selected-but-ungraded: teal highlight, no ✓/✗ before the test ends.
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
              key={choice.id}
              type="button"
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
    </>
  );
}

