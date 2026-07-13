'use client';

// MockTestResult — 7-section result experience for the full interview mock test.
// Replaces the old single CenterCard summary with a rich learning-first result
// that encourages review before retake. Follows the "Learning > Testing" principle.

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BookOpen,
  ArrowRight,
  RotateCcw,
  ArrowLeft,
  Target,
  Clock,
  TrendingUp,
  Lightbulb,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { N400_QUESTIONS_BY_ID, N400_CATEGORY_LABELS, type N400CategoryKey } from '@/lib/n400/questions-data';

interface PartResult {
  correct: number;
  total: number;
  passed: boolean;
}

interface MockTestResultProps {
  civics: PartResult | null;
  speaking: PartResult | null;
  writing: PartResult | null;
  overall: boolean;
  totalScore: number;
  totalQuestions: number;
  wrongCount: number;
  civicsAnswers: { questionId: number; wasCorrect: boolean }[];
  onRetake: () => void;
  onReviewWrongAnswers: () => void;
  basePath: string; // e.g. /en/n400app
}

/* ─── Helpers ─── */

function sectionStatus(correct: number, total: number, passThreshold: number) {
  const pct = total > 0 ? (correct / total) * 100 : 0;
  if (pct >= 90) return { label: 'Xuất sắc', colorClass: 'bg-teal-100 text-teal-700', barColor: 'bg-teal-500' };
  if (pct >= 70) return { label: 'Tốt', colorClass: 'bg-blue-100 text-blue-700', barColor: 'bg-blue-500' };
  if (correct >= passThreshold) return { label: 'Cần cải thiện', colorClass: 'bg-amber-100 text-amber-700', barColor: 'bg-amber-500' };
  return { label: 'Chưa đạt', colorClass: 'bg-orange-100 text-orange-700', barColor: 'bg-orange-400' };
}

function findWeakestCategory(civicsAnswers: { questionId: number; wasCorrect: boolean }[]): N400CategoryKey | null {
  const catWrong: Partial<Record<N400CategoryKey, number>> = {};
  for (const a of civicsAnswers) {
    if (a.wasCorrect) continue;
    const q = N400_QUESTIONS_BY_ID.get(a.questionId);
    if (!q) continue;
    catWrong[q.category] = (catWrong[q.category] ?? 0) + 1;
  }
  let maxCat: N400CategoryKey | null = null;
  let maxCount = 0;
  for (const [cat, count] of Object.entries(catWrong) as [N400CategoryKey, number][]) {
    if (count > maxCount) {
      maxCat = cat;
      maxCount = count;
    }
  }
  return maxCat;
}

/* ─── Main Component ─── */

export default function MockTestResult({
  civics,
  speaking,
  writing,
  overall,
  totalScore,
  totalQuestions,
  wrongCount,
  civicsAnswers,
  onRetake,
  onReviewWrongAnswers,
  basePath,
}: MockTestResultProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const readinessPercent = useMemo(
    () => Math.round((totalScore / totalQuestions) * 100),
    [totalScore, totalQuestions],
  );

  const weakCategory = useMemo(() => findWeakestCategory(civicsAnswers), [civicsAnswers]);
  const weakCategoryLabel = weakCategory ? N400_CATEGORY_LABELS[weakCategory] : null;

  const civicsWrongCount = civicsAnswers.filter((a) => !a.wasCorrect).length;

  // Estimated review time: ~1 min per wrong answer
  const estimatedMinutes = Math.max(5, civicsWrongCount + 2);

  const sections = [
    {
      icon: '🏛',
      label: 'Civics',
      result: civics,
      passThreshold: 12,
    },
    {
      icon: '💬',
      label: 'Speaking',
      result: speaking,
      passThreshold: 8,
    },
    {
      icon: '✍️',
      label: 'Writing',
      result: writing,
      passThreshold: 1,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-32 animate-in fade-in duration-300 lg:pb-8">

      {/* ══════════════ SECTION 1 — Hero Result Card ══════════════ */}
      <Card
        className={`relative overflow-hidden text-center ${
          overall
            ? 'border-teal-200 bg-gradient-to-br from-teal-50 via-white to-sky-50'
            : 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50'
        }`}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-100/30" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-amber-100/20" />

        <div className="relative">
          <div className="mb-3 text-5xl" aria-hidden>
            {overall ? '🏆' : '💪'}
          </div>

          <h2 className="text-2xl font-extrabold text-gray-800 sm:text-3xl">
            {overall ? '🎉 Chúc mừng!' : 'Chưa đạt — Bạn đã rất gần rồi!'}
          </h2>

          <div className="mt-4 text-6xl font-extrabold text-gray-900">
            {totalScore}
            <span className="text-3xl text-gray-500">/{totalQuestions}</span>
          </div>

          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-600">
            {overall ? (
              'Bạn đã sẵn sàng cho buổi phỏng vấn quốc tịch. Hãy tiếp tục luyện tập để tự tin hơn!'
            ) : (
              <>
                Bạn chỉ còn thiếu <span className="font-bold text-gray-800">{wrongCount} câu đúng</span> để
                vượt qua bài thi.
                <br />
                <span className="mt-1 block text-gray-500">
                  Đừng lo! Ôn lại các câu sai và bạn sẽ cải thiện rất nhanh.
                </span>
              </>
            )}
          </p>
        </div>
      </Card>

      {/* ══════════════ SECTION 2 — Performance Breakdown ══════════════ */}
      <div>
        <h3 className="mb-3 text-lg font-bold text-gray-800">Kết quả chi tiết</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {sections.map(({ icon, label, result, passThreshold }) => {
            const correct = result?.correct ?? 0;
            const total = result?.total ?? 0;
            const pct = total > 0 ? (correct / total) * 100 : 0;
            const status = sectionStatus(correct, total, passThreshold);
            return (
              <Card key={label} className="p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>{icon}</span>
                  <span className="text-sm font-bold text-gray-800">{label}</span>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-gray-900">
                  {correct}
                  <span className="text-lg text-gray-500">/{total}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar progress={pct} colorClass={status.barColor} heightClass="h-2" />
                </div>
                <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${status.colorClass}`}>
                  {status.label}
                </span>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ══════════════ SECTION 3 — Next Steps to Pass ══════════════ */}
      {!overall && civicsWrongCount > 0 && (
        <Card className="p-5 sm:p-8">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-teal-600" />
            <h3 className="text-lg font-bold text-gray-800">Bước tiếp theo để đạt</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Hoàn thành các hoạt động sau để cải thiện trước khi thi lại.
          </p>

          {/* Vertical roadmap */}
          <div className="relative mt-6 ml-5">
            {/* Connecting line */}
            <div className="absolute left-0 top-3 h-[calc(100%-24px)] w-0.5 bg-gray-200" />

            {[
              {
                icon: '📖',
                title: `Xem lại ${civicsWrongCount} câu sai`,
                desc: 'Hiểu sai ở đâu và học đáp án đúng.',
                action: (
                  <button
                    type="button"
                    onClick={onReviewWrongAnswers}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
                  >
                    Xem ngay <ArrowRight size={12} />
                  </button>
                ),
              },
              {
                icon: '📝',
                title: 'Luyện tập câu hỏi yếu',
                desc: weakCategoryLabel
                  ? `Tập trung vào phần ${weakCategoryLabel.vi}.`
                  : 'Luyện tập các chủ đề còn yếu.',
                action: (
                  <Link
                    href={`${basePath}/study`}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Luyện tập <ArrowRight size={12} />
                  </Link>
                ),
              },
              {
                icon: '🔄',
                title: 'Thi lại Mock Test',
                desc: 'Kiểm tra lại kết quả sau khi ôn bài.',
                action: (
                  <button
                    type="button"
                    onClick={onRetake}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200"
                  >
                    Thi lại <ArrowRight size={12} />
                  </button>
                ),
              },
            ].map((step, i) => (
              <div key={i} className="relative mb-6 pl-8 last:mb-0">
                {/* Circle marker */}
                <div className="absolute left-0 top-0.5 -translate-x-1/2 rounded-full border-2 border-white bg-teal-600 p-1">
                  <Circle size={8} className="text-white" fill="white" />
                </div>
                <span className="text-xl" aria-hidden>{step.icon}</span>
                <h4 className="mt-1 text-sm font-bold text-gray-800">{step.title}</h4>
                <p className="text-xs text-gray-500">{step.desc}</p>
                {step.action}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-600">
              Ước tính khoảng {estimatedMinutes} phút
            </span>
          </div>
        </Card>
      )}

      {/* ══════════════ SECTION 4 — Review Wrong Answers CTA ══════════════ */}
      {civicsWrongCount > 0 && (
        <Card className="relative overflow-hidden border-l-4 border-l-teal-600 p-5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <BookOpen size={22} className="text-teal-600" />
                <h3 className="text-lg font-bold text-gray-800">Xem lại câu sai</h3>
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-700">
                  {civicsWrongCount} Câu
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Bạn trả lời sai {civicsWrongCount} câu hỏi Civics. Xem lại từng câu với đáp án đúng và giải thích.
              </p>
            </div>
            <button
              type="button"
              onClick={onReviewWrongAnswers}
              className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
            >
              Xem lại câu sai
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>
        </Card>
      )}

      {/* ══════════════ SECTION 5 — Recommended Practice ══════════════ */}
      {weakCategory && weakCategoryLabel && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl">
              💡
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-gray-800">Đề xuất luyện tập</h3>
              <p className="mt-1 text-sm text-gray-600">
                Bạn sai nhiều câu về <span className="font-semibold text-gray-800">{weakCategoryLabel.vi}</span>.
                Luyện tập lại trước khi thi lần nữa.
              </p>
              <Link
                href={`${basePath}/study`}
                className="group mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
              >
                <Lightbulb size={14} />
                Luyện tập phần yếu
                <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* ══════════════ SECTION 6 — Interview Readiness ══════════════ */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-4">
          {/* Circular progress */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                className="text-gray-100"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={`${(readinessPercent / 100) * 175.93} 175.93`}
                strokeLinecap="round"
                className={readinessPercent >= 70 ? 'text-teal-500' : 'text-amber-500'}
              />
            </svg>
            <span className="absolute text-sm font-extrabold text-gray-800">{readinessPercent}%</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-gray-800">Mức độ sẵn sàng phỏng vấn</h3>
            <div className="mt-1 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-teal-500" />
              <span className="text-xs text-gray-500">
                {overall
                  ? 'Bạn đã sẵn sàng cho buổi phỏng vấn!'
                  : 'Tiếp tục luyện tập để nâng cao điểm số.'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ══════════════ SECTION 7 — Bottom Actions ══════════════ */}
      {/* Desktop: regular section */}
      <div className="hidden space-y-3 lg:block">
        {civicsWrongCount > 0 && (
          <button
            type="button"
            onClick={onReviewWrongAnswers}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
          >
            <BookOpen size={16} />
            Xem lại câu sai
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        )}
        <button
          type="button"
          onClick={onRetake}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <RotateCcw size={16} />
          Thi lại
        </button>
        <Link
          href={`${basePath}/mock-test`}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          Chọn bài thi khác
        </Link>
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md gap-3">
          {civicsWrongCount > 0 && (
            <button
              type="button"
              onClick={onReviewWrongAnswers}
              className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
            >
              <BookOpen size={14} />
              Xem lại câu sai
            </button>
          )}
          <button
            type="button"
            onClick={onRetake}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <RotateCcw size={14} />
            Thi lại
          </button>
        </div>
      </div>
    </div>
  );
}
