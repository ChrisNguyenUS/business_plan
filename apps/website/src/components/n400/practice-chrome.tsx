'use client';

/*
 * Shared "Luyện tập" chrome — the calm, distraction-free study module used by
 * every practice surface (Civics practice, Speaking What-Mean / Yes-No, Writing
 * dictation). Extracted so all four screens stay visually identical:
 *
 *   • PracticeProgressRow — one quiet row: counter · bar · % complete · time left.
 *   • PracticeSupportPanel — minimal right rail: one decorative illustration +
 *     one Learning Tip. No stats / streak / KPI cards.
 *   • LearningTipCard — the single supportive note (also used inline on mobile).
 *
 * Design intent: before answering, the only task is read → think → select, so
 * nothing here competes with the question.
 */

import Image from 'next/image';
import { Clock, ChevronLeft } from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';

/** ~0.85 min per remaining question ≈ the Civics reference (Q7/20 → ~12 min). */
const MINUTES_PER_QUESTION = 0.85;

export function PracticeProgressRow({
  index,
  total,
  unit = 'Câu hỏi',
  onBack,
  showTime = true,
}: {
  index: number;
  total: number;
  /** Leading noun before the counter, e.g. "Câu hỏi" or "Câu". */
  unit?: string;
  /** When provided, renders a subtle leading back-chevron (return to hub). */
  onBack?: () => void;
  /** Hidden in exam mode where a real timer, not an estimate, governs pace. */
  showTime?: boolean;
}) {
  const percent = ((index + 1) / total) * 100;
  const minutesRemaining = Math.max(1, Math.round((total - index) * MINUTES_PER_QUESTION));

  return (
    <div className="shrink-0 flex items-center gap-[clamp(0.5rem,1.5vw,1rem)] rounded-2xl bg-white border border-slate-100 shadow-sm px-[clamp(0.75rem,2vw,1.25rem)] py-[clamp(0.5rem,1.2vh,0.875rem)]">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại"
          className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <ChevronLeft size={18} />
        </button>
      ) : null}
      <span className="font-bold text-gray-700 whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.9375rem)' }}>
        {unit} {index + 1} / {total}
      </span>
      <div className="min-w-0 flex-1">
        <ProgressBar progress={percent} heightClass="h-[clamp(6px,0.6vw,10px)]" />
      </div>
      <span className="hidden whitespace-nowrap text-gray-700 sm:inline" style={{ fontSize: 'clamp(0.75rem, 1.4vw, 0.875rem)' }}>
        <span className="font-bold">{Math.round(percent)}%</span> <span className="text-gray-500">hoàn thành</span>
      </span>
      {showTime ? (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-gray-500" style={{ fontSize: 'clamp(0.7rem, 1.3vw, 0.8125rem)' }}>
          <Clock size={14} className="shrink-0" /> Còn ~ {minutesRemaining} phút
        </span>
      ) : null}
    </div>
  );
}

/**
 * The single supportive note shown beside/below the question. Decorative and
 * calm — reinforces one helpful behaviour, never stats or progress. Pass
 * `title`/`children` to make it contextual (e.g. writing rules).
 */
export function LearningTipCard({
  title = 'Mẹo học tập / Learning Tip',
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-base" aria-hidden>💡</span>
        <span className="text-sm font-bold text-gray-800">{title}</span>
      </div>
      <div className="text-[13px] leading-relaxed text-gray-600">
        {children ?? (
          <>Đọc kỹ tất cả các đáp án trước khi chọn. Nhiều đáp án sai được thiết kế để rất dễ gây nhầm lẫn.</>
        )}
      </div>
    </div>
  );
}

/**
 * Desktop-only right rail: reduced-height Statue illustration (full aspect, no
 * crop) + one Learning Tip. Pass `tip` to override the default tip content.
 */
export function PracticeSupportPanel({ tip }: { tip?: React.ReactNode }) {
  return (
    <div className="hidden shrink-0 self-start lg:flex lg:w-[280px] lg:flex-col lg:gap-4 xl:w-[320px]">
      {/* Aspect matches the source (1402×1122) so the full statue — torch to
          base — always shows without cropping, scaling with panel width. */}
      <div className="relative aspect-[1402/1122] w-full overflow-hidden rounded-3xl">
        <Image
          src="/images/n400/practace-thumbnail.png"
          alt="Statue of Liberty with the city skyline"
          fill
          className="object-cover object-center"
          sizes="320px"
          priority
        />
      </div>
      {tip ?? <LearningTipCard />}
    </div>
  );
}
