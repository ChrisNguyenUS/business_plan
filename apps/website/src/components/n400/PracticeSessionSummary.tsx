'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Lightbulb,
  ListChecks,
  RotateCw,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';

/*
 * Practice completion screen — a "completion moment", not a dialog.
 * Answers three questions in order: how did I do (illustration + verdict +
 * score), what next (CTA ladder: review wrongs → practice again → change
 * mode), why continue (insight strip + today's progress).
 *
 * Shared by Civics practice and the Speaking/Writing section quizzes; the
 * civics-only extras (time, topic insight, daily progress) are optional props
 * and their sections simply don't render when omitted.
 */

type Tier = 'perfect' | 'passed' | 'low';

// Practice uses the same bar as the civics mock rule of thumb: ~70% to "pass".
const PASS_RATIO = 0.7;

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

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PracticeSessionSummary({
  correct,
  total,
  wrongCount,
  onReviewWrong,
  onRetry,
  onChangeMode,
  elapsedSec,
  topCategory,
  sessionsToday,
}: {
  correct: number;
  total: number;
  /** Distinct questions answered wrong this session (0 when unknown). */
  wrongCount: number;
  onReviewWrong: () => void;
  onRetry: () => void;
  onChangeMode: () => void;
  /** Session duration in seconds — the time stat renders only when provided. */
  elapsedSec?: number;
  /**
   * Most-missed topic label, or null when there is no dominant topic.
   * The insight strip renders only when this prop is passed at all.
   */
  topCategory?: { en: string; vi: string } | null;
  /** Sessions finished today — the progress card renders only when provided. */
  sessionsToday?: { done: number; goal: number } | null;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const need = Math.ceil(total * PASS_RATIO);
  const tier: Tier = pct === 100 ? 'perfect' : correct >= need ? 'passed' : 'low';
  const passed = tier !== 'low';

  // Wrong ids can be missing for sessions resumed from older stored progress;
  // fall back to the plain practice-again flow rather than an empty review.
  const canReview = tier !== 'perfect' && wrongCount > 0;
  const reviewMinutes = Math.max(1, Math.round(wrongCount * 0.5));
  const displayCorrect = useCountUp(correct);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto animate-in fade-in duration-300">
      <div className="mx-auto flex min-h-full w-full max-w-[880px] flex-col justify-center gap-4 py-2">
        {/* Result card — illustration + verdict + score + stats + actions */}
        <section className="relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-50/70 via-white to-white"
          />

          <div className="relative grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-8">
            <div className="relative mx-auto h-36 w-36 animate-in zoom-in-95 duration-300 motion-reduce:animate-none sm:h-52 sm:w-52">
              <Image
                src={passed ? '/images/n400/after_practice/success.png' : '/images/n400/after_practice/fail.png'}
                alt=""
                fill
                className="object-contain"
                sizes="(max-width: 640px) 144px, 208px"
                priority
              />
            </div>

            <div className="text-center">
              <h2 className="text-xl font-extrabold text-gray-800 sm:text-2xl">
                {tier === 'perfect' ? (
                  <>Hoàn hảo! Bạn đã trả lời đúng <span className="text-teal-600">tất cả các câu</span>!</>
                ) : tier === 'passed' ? (
                  <>Chúc mừng! Bạn đã <span className="text-teal-600">vượt qua</span> bài luyện tập!</>
                ) : (
                  <>Tiếp tục nhé! Bạn đang <span className="text-teal-600">tiến bộ mỗi ngày</span>!</>
                )}
              </h2>
              <p className="mt-1.5 text-sm text-gray-500 sm:text-base">
                {tier === 'perfect'
                  ? 'Thành tích tuyệt vời — hãy giữ vững phong độ này.'
                  : tier === 'passed'
                    ? 'Bạn đang tiến rất gần đến buổi phỏng vấn.'
                    : 'Ôn lại những câu sai sẽ giúp bạn nắm chắc hơn.'}
              </p>

              <div className="mt-2 text-5xl font-extrabold text-teal-600 sm:text-6xl">
                {displayCorrect}
                <span className="text-2xl font-bold text-gray-400 sm:text-3xl"> / {total}</span>
              </div>

              <div
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                  passed
                    ? 'border-teal-200 bg-teal-50 text-teal-700'
                    : 'border-orange-200 bg-orange-50 text-orange-600'
                }`}
              >
                <CheckCircle size={15} />
                Đạt {pct}% độ chính xác
              </div>

              <p className="mt-2.5 text-sm text-gray-600">
                Cần đạt ≥ {need} câu đúng để vượt qua.{' '}
                {passed ? 'Bạn đã làm rất tốt!' : 'Cùng cố gắng nhé!'}
              </p>
            </div>
          </div>

          {/* Quick stats — correct / wrong / time */}
          <div
            className={`relative mt-5 grid grid-cols-1 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white/70 sm:divide-x sm:divide-y-0 ${
              elapsedSec != null ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <Target size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Câu đúng</div>
                <div className="font-extrabold text-gray-800">{correct} / {total}</div>
                <div className="text-xs text-gray-500">{pct}%</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                <XCircle size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Câu sai</div>
                <div className="font-extrabold text-gray-800">{total - correct} câu</div>
                <div className="text-xs text-gray-500">{total - correct > 0 ? 'Cần ôn lại' : 'Tuyệt vời!'}</div>
              </div>
            </div>
            {elapsedSec != null ? (
              <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Thời gian làm bài</div>
                  <div className="font-extrabold text-gray-800">{formatDuration(elapsedSec)}</div>
                  <div className="text-xs text-gray-500">Phút</div>
                </div>
              </div>
            ) : null}
          </div>

          {/* One insight — weakest topic + review-time estimate */}
          {topCategory !== undefined && wrongCount > 0 ? (
            <div className="relative mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                <Lightbulb size={16} />
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-bold text-gray-800">Gợi ý cho bạn</div>
                {topCategory ? (
                  <div className="mt-0.5">
                    Bạn sai nhiều nhất ở chủ đề:{' '}
                    <span className="font-semibold text-orange-600">{topCategory.vi}</span>
                  </div>
                ) : null}
                <div className="mt-0.5 text-gray-500">
                  Ôn lại {wrongCount} câu sai mất khoảng {reviewMinutes} phút.
                </div>
              </div>
            </div>
          ) : null}

          {/* CTA ladder — review wrongs (primary) → practice again → change mode */}
          <div className={`relative mt-5 grid grid-cols-1 gap-3 ${canReview ? 'sm:grid-cols-2' : ''}`}>
            {canReview ? (
              <button
                type="button"
                onClick={onReviewWrong}
                className="flex cursor-pointer items-center gap-3 rounded-2xl bg-teal-600 px-5 py-3.5 text-left text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
              >
                <ListChecks size={20} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">Ôn lại câu sai</span>
                  <span className="block text-xs text-teal-100">Xem lại và hiểu rõ những câu bạn chưa đúng</span>
                </span>
                <ArrowRight size={18} className="shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onRetry}
                className="flex cursor-pointer items-center gap-3 rounded-2xl bg-teal-600 px-5 py-3.5 text-left text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
              >
                <RotateCw size={20} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">Luyện bài mới</span>
                  <span className="block text-xs text-teal-100">Bắt đầu một lượt luyện tập khác</span>
                </span>
                <ArrowRight size={18} className="shrink-0" />
              </button>
            )}

            {canReview ? (
              <button
                type="button"
                onClick={onRetry}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-left text-gray-700 transition-colors hover:border-teal-300 hover:bg-gray-50"
              >
                <RotateCw size={18} className="shrink-0 text-gray-500" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">Luyện lại</span>
                  <span className="block text-xs text-gray-500">Làm lại bài luyện tập này</span>
                </span>
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onChangeMode}
            className="relative mx-auto mt-4 flex cursor-pointer items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            <ArrowLeft size={14} /> Chọn chế độ luyện tập khác
          </button>
        </section>

        {/* Today's progress — one subtle habit card below the result */}
        {sessionsToday ? (
          <section className="flex items-center gap-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:px-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
              <TrendingUp size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-800">Tiến độ hôm nay</div>
              <div className="text-sm text-gray-500">
                Bạn đã hoàn thành{' '}
                <span className="font-semibold text-gray-700">
                  {sessionsToday.done} / {sessionsToday.goal}
                </span>{' '}
                phiên luyện tập.
              </div>
            </div>
            <div className="ml-auto hidden max-w-[260px] flex-1 items-center gap-1.5 sm:flex">
              {Array.from({ length: sessionsToday.goal }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < sessionsToday.done ? 'bg-teal-600' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <div className="ml-auto shrink-0 text-sm font-bold text-gray-800 sm:ml-3">
              {Math.min(sessionsToday.done, sessionsToday.goal)} / {sessionsToday.goal}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
