'use client';

// Shared building blocks for the skill hub pages (Civics / What Mean /
// Yes-No / Writing). The hub is an *execution* page — the dashboard already
// answers "what should I study today?", so this page only answers "how do I
// want to study this subject?". One vertical stack, one decision per card:
//   HubHero          → skill identity + progress (thumbnail, name, pool size,
//                      Tiến độ / Hoàn thành stat cells)
//   PracticeSelector → primary CTA (lives in PracticeSelector.tsx)
//   HubStudyCardsCard→ browse the flashcard deck with a status filter
//   HubWeakAreasCard → targeted review, only when there is enough signal
// There is deliberately NO "continue learning" card and NO recommendation
// card here — learners study randomly, and recommendations belong to the
// dashboard.

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Layers, PieChart, TrendingUp } from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';

/** Progress numbers for the hero stat cells. */
export interface HubHeroStats {
  seenCount: number;
  totalCount: number;
  percent: number;
  /** Noun for the count cell, e.g. "câu" / "từ". Defaults to "câu". */
  unitLabel?: string;
}

function HeroStatCell({
  icon,
  tone,
  label,
  value,
  bar,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  /** Optional progress bar row under the value (the Tiến độ cell). */
  bar?: { percent: number; colorClass: string };
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[11px] text-gray-400">{label}</span>
          <span className="block truncate text-sm font-bold text-gray-900">{value}</span>
        </span>
      </div>
      {bar ? (
        <div className="mt-2 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ProgressBar progress={bar.percent} colorClass={bar.colorClass} />
          </div>
          <span className="shrink-0 text-xs font-semibold text-gray-400">{bar.percent}%</span>
        </div>
      ) : null}
    </div>
  );
}

export function HubHero({
  emoji,
  imageSrc,
  title,
  countLabel,
  tagline,
  stats,
  accentTextClass = 'text-teal-600',
  accentBarClass = 'bg-teal-500',
}: {
  emoji: string;
  /** Skill illustration; falls back to the emoji tile when absent. */
  imageSrc?: string;
  title: string;
  /** Pool size line under the title, e.g. "62 từ vựng". Omit when the title already carries it. */
  countLabel?: string;
  tagline: string;
  stats?: HubHeroStats;
  /** Subject accent for the count line / progress bar (teal / blue / purple / orange). */
  accentTextClass?: string;
  accentBarClass?: string;
}) {
  const statCells = stats ? (
    <div className="grid grid-cols-2 gap-2.5">
      <HeroStatCell
        icon={<Layers size={16} />}
        tone="bg-indigo-50 text-indigo-500"
        label="Tiến độ"
        value={`${stats.seenCount} / ${stats.totalCount} ${stats.unitLabel ?? 'câu'}`}
        bar={{ percent: stats.percent, colorClass: accentBarClass }}
      />
      <HeroStatCell
        icon={<PieChart size={16} />}
        tone="bg-teal-50 text-teal-600"
        label="Hoàn thành"
        value={`${stats.percent}%`}
      />
    </div>
  ) : null;

  return (
    // App-Store-style identity card: thumbnail + text share one centered row;
    // the stat cells live in the text column on desktop (mockup) and drop to a
    // full-width row on mobile where the column is too narrow.
    <section className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-4 sm:gap-5">
        {imageSrc ? (
          // Fixed 5:4 frame — object-cover/center keeps the illustration a
          // resized desktop version (subjects centred, equal L/R padding),
          // never a re-crop. Width tracks the viewport but caps on desktop.
          <div className="relative aspect-[5/4] w-2/5 max-w-[210px] shrink-0 overflow-hidden rounded-2xl bg-teal-50/50">
            <Image
              src={imageSrc}
              alt={title}
              fill
              sizes="(max-width: 640px) 40vw, 210px"
              className="object-cover object-center"
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-3xl">
            <span aria-hidden>{emoji}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl">{title}</h1>
          {countLabel ? <div className={`text-sm font-bold ${accentTextClass}`}>{countLabel}</div> : null}
          <p className="mt-1 text-sm leading-snug text-gray-500">{tagline}</p>
          {statCells ? <div className="mt-3 hidden sm:block">{statCells}</div> : null}
        </div>
      </div>
      {statCells ? <div className="mt-3 sm:hidden">{statCells}</div> : null}
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
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Layers size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-extrabold text-gray-900">Flashcards</h2>
            <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500">
              {totalCount} {unitLabel}
            </span>
          </div>
          <p className="text-sm text-gray-500">Xem và ôn lại toàn bộ câu hỏi.</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={selected === c.id}
            onClick={() => setSelected(c.id)}
            className={`min-h-[36px] cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              selected === c.id
                ? 'border-teal-600 bg-teal-50 text-teal-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onBrowse(selected)}
          className="group ml-auto inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-50"
        >
          Xem tất cả
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
}

export function HubWeakAreasCard({
  title = 'Điểm cần cải thiện',
  subtitle = 'Tập trung vào các chủ đề bạn còn yếu.',
  metricLabel,
  accuracyPercent,
  percentSuffix = 'độ chính xác',
  onPractice,
}: {
  title?: string;
  subtitle?: string;
  /** What the accuracy refers to — a weak topic name or "Độ chính xác trung bình". */
  metricLabel: string;
  accuracyPercent: number;
  /** Suffix after the bold percent; pass '' when metricLabel already says "độ chính xác". */
  percentSuffix?: string;
  onPractice: () => void;
}) {
  return (
    // "Need improvement" strip (mockup): identity left, the metric with its
    // bar in the middle, one outline CTA right. Only rendered with enough
    // graded data — the page decides; new users never see it.
    <section className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="min-w-0 sm:w-[220px]">
          <p className="truncate text-sm font-semibold text-gray-700">{metricLabel}</p>
          <p className="text-xs font-bold text-gray-900">
            {accuracyPercent}%{percentSuffix ? <span className="font-medium text-gray-500"> {percentSuffix}</span> : null}
          </p>
          <div className="mt-1">
            <ProgressBar progress={accuracyPercent} colorClass="bg-orange-500" />
          </div>
        </div>
        <button
          type="button"
          onClick={onPractice}
          className="group inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50"
        >
          Luyện ngay
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
}
