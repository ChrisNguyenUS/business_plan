'use client';

// Shared building blocks for the skill hub pages (Civics / What Mean /
// Yes-No / Writing). One vertical stack, one decision per card:
//   HubHero          → skill identity (emoji, name, pool size, tagline)
//   HubContinueCard  → primary CTA, largest card
//   HubStudyCardsCard→ browse the flashcard deck with a status filter
//   HubPracticeCard  → opens PracticeModesSheet
//   HubWeakAreasCard → civics-only weak-topic shortcut

import { useState } from 'react';
import { ArrowRight, Star, TrendingDown, Layers, Target } from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';

export function HubHero({
  emoji,
  title,
  countLabel,
  tagline,
}: {
  emoji: string;
  title: string;
  countLabel: string;
  tagline: string;
}) {
  return (
    <section className="flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-3xl">
        <span aria-hidden>{emoji}</span>
      </div>
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{title}</h1>
        <div className="text-sm font-bold text-teal-600">{countLabel}</div>
        <p className="mt-0.5 text-sm text-gray-500">{tagline}</p>
      </div>
    </section>
  );
}

function ProgressRing({ done, total, percent }: { done: number; total: number; percent: number }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - percent / 100)}
          className="text-teal-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-extrabold leading-none text-gray-900">
          {done}
          <span className="text-xs font-bold text-gray-400">/{total}</span>
        </div>
        <div className="mt-1 text-xs font-bold text-teal-600">{percent}%</div>
      </div>
    </div>
  );
}

export function HubContinueCard({
  seenCount,
  totalCount,
  percent,
  nextLabel,
  started,
  onContinue,
}: {
  seenCount: number;
  totalCount: number;
  percent: number;
  nextLabel: string | null;
  started: boolean;
  onContinue: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-teal-100 bg-gradient-to-br from-teal-50/70 to-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <ProgressRing done={seenCount} total={totalCount} percent={percent} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center gap-1.5 sm:justify-start">
            <Star size={16} className="text-amber-400" fill="currentColor" />
            <h2 className="text-lg font-extrabold text-gray-900">Tiếp tục học</h2>
          </div>
          {nextLabel ? <p className="mt-1 text-sm text-gray-600">{nextLabel}</p> : null}
          <div className="mt-3">
            <ProgressBar progress={percent} />
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="group mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700"
          >
            {started ? 'Tiếp tục' : 'Bắt đầu học'}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

export type StudyCardsFilter = 'all' | 'unknown' | 'known' | 'bookmarks';

export function HubStudyCardsCard({
  totalCount,
  unitLabel = 'thẻ',
  chips,
  onBrowse,
}: {
  totalCount: number;
  unitLabel?: string;
  /** Civics passes 4 chips (incl. Đã lưu); sections pass 3 (no bookmark data). */
  chips: { id: StudyCardsFilter; label: string }[];
  onBrowse: (filter: StudyCardsFilter) => void;
}) {
  const [selected, setSelected] = useState<StudyCardsFilter>('all');
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Layers size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-gray-900">Thẻ học</h2>
          <p className="mt-0.5 text-sm text-gray-500">Xem và ôn lại toàn bộ câu hỏi.</p>
          <div className="mt-1.5 inline-flex items-center rounded-lg bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
            {totalCount} {unitLabel}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected === c.id}
              onClick={() => setSelected(c.id)}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                selected === c.id
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onBrowse(selected)}
          className="group inline-flex cursor-pointer items-center gap-2 rounded-xl border border-teal-600 bg-white px-5 py-2.5 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50"
        >
          Xem thẻ
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
}

export function HubPracticeCard({ subtitle, onStart }: { subtitle: string; onStart: () => void }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <Target size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-gray-900">Luyện tập</h2>
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700"
        >
          Bắt đầu
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
}

export function HubWeakAreasCard({
  topicLabel,
  questionCount,
  accuracyPercent,
  onPractice,
}: {
  topicLabel: string;
  questionCount: number;
  accuracyPercent: number;
  onPractice: () => void;
}) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
          <TrendingDown size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-gray-900">Điểm yếu</h2>
          <p className="mt-0.5 text-sm font-semibold text-orange-600">{topicLabel}</p>
          <p className="text-sm text-gray-600">
            {questionCount} câu · độ chính xác {accuracyPercent}%
          </p>
          <div className="mt-2 max-w-[240px]">
            <ProgressBar progress={accuracyPercent} />
          </div>
        </div>
        <button
          type="button"
          onClick={onPractice}
          className="group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-orange-500 bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50"
        >
          Luyện tập
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
}
