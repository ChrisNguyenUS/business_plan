'use client';

// Thi thử Viết — writing (dictation) mock test. Runs DictationQuiz over 3
// sentences drawn from the writing bank; the pass rule mirrors the real USCIS
// exam: writing ONE of the three sentences correctly is a pass. When the
// dictation session ends we swap the quiz for a pass/fail result screen.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Trophy, RotateCcw, ArrowLeft } from 'lucide-react';
import { WRITING_SENTENCES } from '@/lib/n400/writing-data';
import { shuffle } from '@/lib/n400/quiz-engine';
import { DictationQuiz } from '@/components/n400/speaking/DictationQuiz';

const SENTENCE_COUNT = 3;
const PASS_THRESHOLD = 1; // đúng ít nhất 1/3 là đạt

interface Outcome {
  correct: number;
  total: number;
}

export default function ThiThuVietPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  // Fresh random 3 sentences per attempt; `seed` bumps to reshuffle + remount.
  const [seed, setSeed] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const questions = useMemo(
    () => shuffle([...WRITING_SENTENCES], `mock-viet-${seed}`).slice(0, SENTENCE_COUNT),
    [seed],
  );

  const retake = () => {
    setOutcome(null);
    setSeed((s) => s + 1);
  };

  if (outcome) {
    const passed = outcome.correct >= PASS_THRESHOLD;
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
            {outcome.correct}
            <span className="text-2xl text-gray-500">/{outcome.total}</span>
          </div>
          <p className="text-sm text-gray-600">
            Cần viết đúng ≥ {PASS_THRESHOLD}/{outcome.total} câu để đạt.
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

  return (
    <DictationQuiz
      key={seed}
      questions={questions}
      onSessionEnd={({ correct, total }) => setOutcome({ correct, total })}
    />
  );
}
