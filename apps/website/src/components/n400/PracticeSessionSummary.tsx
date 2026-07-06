'use client';

import { RotateCw, ArrowRight, ArrowLeft, ListChecks } from 'lucide-react';
import { useEffect, useState } from 'react';

/*
 * Learning Continuation screen — not a plain result screen.
 * Feedback and actions adapt to the score so the user always knows
 * the next meaningful step:
 *   wrong answers → Review wrong answers → Practice again → picker
 *   perfect score → Start another practice → picker
 */

type Tier = 'perfect' | 'good' | 'low';

const TIER_CONTENT: Record<Tier, { emoji: string; circle: string; title: string }> = {
  perfect: { emoji: '🎉', circle: 'bg-amber-50', title: 'Xuất sắc! / Perfect!' },
  good: { emoji: '👏', circle: 'bg-teal-50', title: 'Làm tốt lắm! / Nice work!' },
  low: { emoji: '💪', circle: 'bg-orange-50', title: 'Cố lên nhé! / Keep going!' },
};

function useCountUp(target: number, durationMs = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduce ? 0 : durationMs;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export function PracticeSessionSummary({
  correct,
  total,
  wrongCount,
  onReviewWrong,
  onRetry,
  onChangeMode,
}: {
  correct: number;
  total: number;
  /** Distinct questions answered wrong this session (0 when unknown). */
  wrongCount: number;
  onReviewWrong: () => void;
  onRetry: () => void;
  onChangeMode: () => void;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const missed = total - correct;
  const tier: Tier = pct === 100 ? 'perfect' : pct >= 60 ? 'good' : 'low';
  const { emoji, circle, title } = TIER_CONTENT[tier];

  const feedback =
    tier === 'perfect'
      ? 'Bạn đã trả lời đúng tất cả các câu hỏi.'
      : tier === 'good'
        ? `Chỉ còn ${missed} câu cần ôn lại.`
        : 'Ôn lại các câu sai rồi thử lại nhé.';

  // Wrong ids can be missing for sessions resumed from older stored progress;
  // fall back to the plain practice-again flow rather than an empty review.
  const canReview = tier !== 'perfect' && wrongCount > 0;
  const displayCorrect = useCountUp(correct);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 sm:p-8 text-center">
        <div
          className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl animate-in zoom-in-50 duration-300 motion-reduce:animate-none ${circle}`}
        >
          <span role="img" aria-hidden="true">{emoji}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>

        <div className="rounded-2xl bg-gray-50 border border-gray-100 py-4 mt-4">
          <div className="text-3xl font-extrabold text-teal-600">
            {displayCorrect} / {total}
          </div>
          <div className="text-xs text-gray-500 mt-1">câu đúng · {pct}%</div>
        </div>

        <p className="text-sm text-gray-500 mt-3 mb-5">{feedback}</p>

        <div className="grid grid-cols-1 gap-3">
          {canReview ? (
            <button
              type="button"
              onClick={onReviewWrong}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 font-semibold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors cursor-pointer"
            >
              <ListChecks size={16} /> Ôn lại câu sai / Review wrong answers
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 font-semibold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors cursor-pointer"
            >
              Luyện bài mới / Start another practice <ArrowRight size={16} />
            </button>
          )}

          {canReview ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <RotateCw size={16} /> Luyện lại / Practice again
            </button>
          ) : null}

          <button
            type="button"
            onClick={onChangeMode}
            className="mx-auto mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Chọn chế độ khác
          </button>
        </div>
      </div>
    </div>
  );
}
