'use client';

// Shared post-mock-test result screen (Civics / Speaking / Viết mocks).
// Hero: pass/fail illustration + verdict + score + Thi lại. Details: the full
// answer sheet with a Tất cả / Đúng / Sai filter (+ Đã lưu when rows are
// bookmarkable) and a state-specific footer — fail nudges review, pass offers
// retake / back to the mock-test hub.

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  CheckCircle,
  ClipboardCheck,
  Flame,
  Lightbulb,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { useN400UserState } from '@/lib/n400/user-state';

export interface MockResultRow {
  key: string;
  /** e.g. "Câu 1 / Question #66" */
  badge: string;
  prompt: string;
  promptVi?: string;
  userAnswer: string | null;
  /** Shown on wrong rows only; omit when `prompt` already is the answer. */
  correctAnswer?: string;
  /** Vietnamese gloss for the correct answer — shown after the test, next to `correctAnswer`. */
  correctAnswerVi?: string;
  ok: boolean;
  audioSrc?: string | null;
  /** Civics question id — presence enables the bookmark button + Đã lưu filter. */
  bookmarkId?: number;
}

export function MockResultHero({
  passed,
  score,
  total,
  requirement,
  passSubtitle = 'Bạn đã sẵn sàng cho buổi phỏng vấn.',
  streak,
  onRetake,
}: {
  passed: boolean;
  score: number;
  total: number;
  /** "Cần đạt ≥ N câu đúng để vượt qua." — the pass rule for this mock. */
  requirement: string;
  passSubtitle?: string;
  streak?: { current: number; longest: number };
  onRetake: () => void;
}) {
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <Card className="relative overflow-hidden p-5 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-50/70 via-white to-white"
      />
      <div className="relative grid grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,260px)_1fr] sm:gap-8">
        <div className="relative mx-auto h-44 w-44 sm:h-60 sm:w-60">
          <Image
            src={passed ? '/images/n400/after_mocktest/success.png' : '/images/n400/after_mocktest/not_pass.png'}
            alt=""
            fill
            className="object-contain"
            sizes="(max-width: 640px) 176px, 240px"
            priority
          />
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-extrabold text-gray-800 sm:text-3xl">
            {passed ? (
              <>
                Tuyệt vời! Bạn đã <span className="text-teal-600">vượt qua</span> bài thi!
              </>
            ) : (
              'Cố lên! Lần sau bạn sẽ làm tốt hơn.'
            )}
          </h3>
          {passed ? (
            <p className="mt-1.5 text-sm text-gray-500 sm:text-base">{passSubtitle}</p>
          ) : null}

          <div className="mt-3 text-5xl font-extrabold text-teal-600 sm:text-6xl">
            {score}
            <span className="text-2xl font-bold text-gray-400 sm:text-3xl">/{total}</span>
          </div>

          {passed ? (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-sm font-semibold text-teal-700">
              <CheckCircle size={15} />
              Đạt {accuracy}% độ chính xác
            </div>
          ) : null}

          <p className="mt-3 text-sm text-gray-600">
            {requirement} {passed ? 'Bạn đã làm rất tốt!' : `Bạn đạt ${accuracy}% độ chính xác.`}
          </p>

          {!passed && streak ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/70 px-3 py-1.5 text-sm text-gray-700">
              <Flame size={16} className="text-orange-500" />
              <span className="font-semibold">{streak.current} ngày</span>
              <span className="text-xs text-gray-500">· Cao nhất: {streak.longest} ngày</span>
            </div>
          ) : null}

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={onRetake}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-7 py-3 font-semibold text-white shadow-md transition-colors duration-200 hover:bg-teal-800"
            >
              <RefreshCw size={16} />
              Thi lại
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

type ResultFilter = 'all' | 'correct' | 'wrong';

const FILTERS: { id: ResultFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'correct', label: 'Đúng' },
  { id: 'wrong', label: 'Sai' },
];

export function MockResultScreen({
  passed,
  score,
  total,
  requirement,
  passSubtitle,
  streak,
  onRetake,
  rows,
  userAnswerLabel = 'Bạn chọn:',
  reviewHref,
  reviewLabel = 'Ôn câu sai',
  reviewTip = 'Ôn lại những câu sai để cải thiện điểm số của bạn!',
  hubHref,
}: {
  passed: boolean;
  score: number;
  total: number;
  requirement: string;
  passSubtitle?: string;
  streak?: { current: number; longest: number };
  onRetake: () => void;
  rows: MockResultRow[];
  /** "Bạn chọn:" for picked answers, "Bạn viết:" for dictation. */
  userAnswerLabel?: string;
  /** Fail-footer CTA target; the tip strip is hidden when omitted. */
  reviewHref?: string;
  reviewLabel?: string;
  reviewTip?: string;
  /** "Về trang Thi thử" target on the pass footer. */
  hubHref: string;
}) {
  const { state, toggleBookmark } = useN400UserState();
  const [filter, setFilter] = useState<ResultFilter>('all');
  const [savedOnly, setSavedOnly] = useState(false);

  const bookmarkable = rows.some((r) => r.bookmarkId != null);

  const visible = rows.filter((r) => {
    if (filter === 'correct' && !r.ok) return false;
    if (filter === 'wrong' && r.ok) return false;
    if (savedOnly && (r.bookmarkId == null || !state.bookmarks.includes(r.bookmarkId))) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <MockResultHero
        passed={passed}
        score={score}
        total={total}
        requirement={requirement}
        passSubtitle={passSubtitle}
        streak={streak}
        onRetake={onRetake}
      />

      {/* Answer breakdown — filterable Tất cả / Đúng / Sai + Đã lưu */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-bold text-gray-800">Chi tiết các câu trả lời</h4>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                    filter === f.id
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {bookmarkable ? (
              <button
                type="button"
                onClick={() => setSavedOnly((v) => !v)}
                aria-pressed={savedOnly}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                  savedOnly
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:text-teal-600'
                }`}
              >
                <Bookmark size={14} fill={savedOnly ? 'currentColor' : 'none'} />
                Đã lưu
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-gray-500">
              Không có câu nào khớp bộ lọc này.
            </div>
          ) : null}
          {visible.map((row) => (
            <div
              key={row.key}
              className={`p-4 rounded-xl border ${row.ok ? 'border-teal-200 bg-teal-50/40' : 'border-orange-200 bg-orange-50/40'}`}
            >
              <div className="flex items-start gap-3">
                {row.ok ? (
                  <CheckCircle className="text-teal-600 shrink-0 mt-0.5" size={20} />
                ) : (
                  <XCircle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                )}
                <div className="flex-1">
                  <div className="text-xs text-gray-500">{row.badge}</div>
                  <div className="font-semibold text-gray-800 mt-1">{row.prompt}</div>
                  {row.promptVi ? (
                    <div className="text-xs text-gray-500 mt-0.5">{row.promptVi}</div>
                  ) : null}
                  <div className="text-sm mt-2">
                    <span className="text-gray-500">{userAnswerLabel} </span>
                    <span className={row.ok ? 'text-teal-700 font-medium' : 'text-orange-600 font-medium'}>
                      {row.userAnswer ?? '— (bỏ qua)'}
                    </span>
                  </div>
                  {!row.ok && row.correctAnswer ? (
                    <div className="text-sm">
                      <span className="text-gray-500">Đáp án đúng: </span>
                      <span className="text-teal-700 font-medium">{row.correctAnswer}</span>
                      {row.correctAnswerVi && row.correctAnswerVi !== row.correctAnswer ? (
                        <span className="text-gray-500"> ({row.correctAnswerVi})</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0 self-stretch justify-between">
                  <div className="flex items-center gap-1.5">
                    {row.audioSrc !== undefined ? (
                      <AudioButton src={row.audioSrc} size="sm" label="Nghe câu hỏi" />
                    ) : null}
                    {row.bookmarkId != null ? (
                      <BookmarkToggle
                        id={row.bookmarkId}
                        active={state.bookmarks.includes(row.bookmarkId)}
                        onToggle={toggleBookmark}
                      />
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      row.ok ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {row.ok ? 'Đúng' : 'Sai'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer — fail: nudge to review wrongs; pass: retake or back to the hub */}
        {!passed && reviewHref ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-50/70 px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm text-gray-700">
              <Lightbulb size={16} className="shrink-0 text-indigo-500" />
              <span>
                <span className="font-semibold">Mẹo học hiệu quả:</span> {reviewTip}
              </span>
            </div>
            <Link
              href={reviewHref}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-sm font-semibold text-indigo-600 transition-colors duration-200 hover:bg-indigo-50"
            >
              {reviewLabel}
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : passed ? (
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onRetake}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors duration-200 hover:border-teal-300 hover:text-teal-700"
            >
              <RefreshCw size={15} />
              Làm lại bài thi
            </button>
            <Link
              href={hubHref}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors duration-200 hover:bg-teal-700"
            >
              <ClipboardCheck size={15} />
              Về trang Thi thử
            </Link>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function BookmarkToggle({
  id,
  active,
  onToggle,
}: {
  id: number;
  active: boolean;
  onToggle: (id: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`p-1.5 rounded-lg transition-colors duration-200 ${
        active
          ? 'text-teal-600 bg-teal-50 hover:bg-teal-100'
          : 'text-gray-300 hover:text-teal-500 hover:bg-gray-100'
      }`}
      aria-label={active ? 'Bỏ đánh dấu' : 'Đánh dấu để học sau'}
      title={active ? 'Bỏ đánh dấu' : 'Đánh dấu để học sau'}
    >
      <Bookmark size={16} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}
