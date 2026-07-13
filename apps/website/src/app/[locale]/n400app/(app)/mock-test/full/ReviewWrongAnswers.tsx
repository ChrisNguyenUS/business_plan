'use client';

// ReviewWrongAnswers — Card-by-card guided review of wrong civics answers.
// Feels like a guided lesson rather than a punishing exam review.
// Users navigate one question at a time with Previous/Next.

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle,
  XCircle,
  RotateCcw,
  PartyPopper,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { useN400UserState } from '@/lib/n400/user-state';
import { N400_QUESTIONS_BY_ID, N400_CATEGORY_LABELS } from '@/lib/n400/questions-data';
import { questionAudioUrl } from '@/lib/n400/quiz-engine';

interface ReviewWrongAnswersProps {
  civicsAnswers: { questionId: number; wasCorrect: boolean }[];
  onBack: () => void;
  onRetake: () => void;
}

export default function ReviewWrongAnswers({
  civicsAnswers,
  onBack,
  onRetake,
}: ReviewWrongAnswersProps) {
  const { state, toggleBookmark } = useN400UserState();

  const wrongAnswers = useMemo(
    () => civicsAnswers.filter((a) => !a.wasCorrect),
    [civicsAnswers],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const total = wrongAnswers.length;

  if (total === 0) {
    // Edge case: no wrong answers (shouldn't normally reach here)
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center animate-in fade-in duration-300">
        <Card className="w-full max-w-lg p-8 text-center">
          <div className="mb-4 text-5xl" aria-hidden>🎉</div>
          <h2 className="text-2xl font-extrabold text-gray-800">Tuyệt vời!</h2>
          <p className="mt-2 text-sm text-gray-600">Bạn không có câu sai nào để xem lại.</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-teal-700"
          >
            <ArrowLeft size={16} /> Quay lại kết quả
          </button>
        </Card>
      </div>
    );
  }

  // Completion screen
  if (currentIndex >= total) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center animate-in fade-in duration-300">
        <Card className="w-full max-w-lg border-teal-200 bg-gradient-to-br from-teal-50 via-white to-sky-50 p-8 text-center">
          <div className="mb-4 text-5xl" aria-hidden>
            <PartyPopper className="mx-auto text-teal-600" size={48} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800">
            Bạn đã xem hết tất cả câu sai! 🎉
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-600">
            Bạn đã hiểu những chỗ cần cải thiện. Tiếp tục luyện tập hoặc thử thi lại nhé!
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ArrowLeft size={16} /> Quay lại kết quả
            </button>
            <button
              type="button"
              onClick={onRetake}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-teal-700"
            >
              <RotateCcw size={16} /> Thi lại
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const currentWrong = wrongAnswers[currentIndex];
  const question = N400_QUESTIONS_BY_ID.get(currentWrong.questionId);

  if (!question) {
    // Skip unknown question
    setCurrentIndex((i) => i + 1);
    return null;
  }

  const isBookmarked = state.bookmarks.includes(question.id);
  const categoryLabel = N400_CATEGORY_LABELS[question.category];
  const progressPct = ((currentIndex + 1) / total) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl animate-in fade-in duration-300">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <span className="text-sm font-semibold text-gray-600">
          Câu {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <ProgressBar progress={progressPct} colorClass="bg-teal-500" heightClass="h-1.5" />
      </div>

      {/* Question card */}
      <Card className="p-5 sm:p-8">
        {/* Category badge */}
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {categoryLabel?.vi ?? question.category} · #{question.id}
          </span>
          <div className="flex items-center gap-2">
            <AudioButton src={questionAudioUrl(question.id)} size="sm" label="Nghe câu hỏi" />
            <button
              type="button"
              onClick={() => toggleBookmark(question.id)}
              className={`rounded-lg p-1.5 transition-colors duration-200 ${
                isBookmarked
                  ? 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                  : 'text-gray-300 hover:bg-gray-100 hover:text-teal-500'
              }`}
              aria-label={isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu để học sau'}
            >
              <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Question */}
        <h3 className="text-lg font-bold leading-snug text-gray-800">
          {question.questionEn}
        </h3>
        <p className="mt-1 text-sm text-gray-500">{question.questionVi}</p>

        {/* Separator */}
        <div className="my-5 border-t border-gray-100" />

        {/* User's answer (wrong) */}
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50/60 p-4">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="shrink-0 text-orange-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-orange-600">
              Câu trả lời của bạn
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-orange-800">
            Không có đáp án chính xác được ghi nhận
          </p>
        </div>

        {/* Correct answer */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="shrink-0 text-teal-600" />
            <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Đáp án đúng
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {question.answersEn.map((ans, i) => (
              <p key={i} className="text-sm font-medium text-teal-800">
                {ans}
                {question.answersVi[i] ? (
                  <span className="ml-2 text-xs text-teal-600">({question.answersVi[i]})</span>
                ) : null}
              </p>
            ))}
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={16} /> Câu trước
        </button>
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => i + 1)}
          className="group inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
        >
          {currentIndex === total - 1 ? 'Hoàn thành' : 'Câu tiếp theo'}
          <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
