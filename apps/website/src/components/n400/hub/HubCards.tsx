'use client';

// Shared building blocks for the skill hub pages (Civics / What Mean /
// Yes-No / Writing). One vertical stack, one decision per card:
//   HubHero          → skill identity (emoji, name, pool size, tagline)
//   HubContinueCard  → primary CTA, largest card
//   HubStudyCardsCard→ browse the flashcard deck with a status filter
//   HubPracticeCard  → opens PracticeModesSheet
//   HubWeakAreasCard → civics-only weak-topic shortcut

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Star, TrendingDown, Layers, PieChart } from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';

/** Progress numbers for the hero stat pills. */
export interface HubHeroStats {
  seenCount: number;
  totalCount: number;
  percent: number;
  /** Noun for the count pill, e.g. "câu" / "từ vựng". Defaults to "câu". */
  unitLabel?: string;
}

function HeroStat({ icon, tone, label, value }: { icon: React.ReactNode; tone: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <span className="leading-tight">
        <span className="block text-[11px] text-gray-400">{label}</span>
        <span className="block text-sm font-bold text-gray-900">{value}</span>
      </span>
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
}: {
  emoji: string;
  /** Skill illustration; falls back to the emoji tile when absent. */
  imageSrc?: string;
  title: string;
  countLabel: string;
  tagline: string;
  stats?: HubHeroStats;
}) {
  return (
    // Compact App-Store-style header: thumbnail + text share one centered row
    // (mobile and desktop alike — "same product"), stats sit full-width below.
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-4 sm:gap-5">
        {imageSrc ? (
          // Fixed 5:4 frame — object-cover/center keeps the illustration a
          // resized desktop version (subjects centred, equal L/R padding),
          // never a re-crop. Width tracks the viewport but caps on desktop.
          <div className="relative aspect-[5/4] w-2/5 max-w-[190px] shrink-0 overflow-hidden rounded-2xl bg-teal-50/50">
            <Image
              src={imageSrc}
              alt={title}
              fill
              sizes="(max-width: 640px) 40vw, 190px"
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
          <div className="text-sm font-bold text-teal-600">{countLabel}</div>
          <p className="mt-1 text-sm leading-snug text-gray-500">{tagline}</p>
        </div>
      </div>
      {stats ? (
        <div className="grid grid-cols-2 gap-2.5">
          <HeroStat
            icon={<Layers size={16} />}
            tone="bg-indigo-50 text-indigo-500"
            label="Tiến độ"
            value={`${stats.seenCount}/${stats.totalCount} ${stats.unitLabel ?? 'câu'}`}
          />
          <HeroStat
            icon={<PieChart size={16} />}
            tone="bg-teal-50 text-teal-600"
            label="Hoàn thành"
            value={`${stats.percent}%`}
          />
        </div>
      ) : null}
    </section>
  );
}

export function ProgressRing({
  done,
  total,
  percent,
  size = 'md',
}: {
  done: number;
  total: number;
  percent: number;
  /** md — hub continue card. lg — dashboard hero. */
  size?: 'md' | 'lg';
}) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const lg = size === 'lg';
  return (
    <div className={`relative shrink-0 ${lg ? 'h-32 w-32 xl:tall:h-36 xl:tall:w-36' : 'h-20 w-20'}`}>
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
        <div className={`${lg ? 'text-3xl xl:tall:text-4xl' : 'text-base'} font-extrabold leading-none text-gray-900`}>
          {done}
          <span className={`${lg ? 'text-base' : 'text-[10px]'} font-bold text-gray-400`}>/{total}</span>
        </div>
        <div className={`${lg ? 'mt-1 text-sm' : 'mt-0.5 text-xs'} font-bold text-teal-600`}>{percent}%</div>
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
    // Priority #1 card. The ring is the single progress indicator (the
    // duplicate horizontal bar was removed); ring + text + CTA sit on one row.
    <section className="rounded-[24px] border border-teal-100 bg-gradient-to-br from-teal-50/70 to-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-4 sm:gap-5">
        <ProgressRing done={seenCount} total={totalCount} percent={percent} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Star size={16} className="text-amber-400" fill="currentColor" />
            <h2 className="text-lg font-extrabold text-gray-900">Tiếp tục học</h2>
          </div>
          {nextLabel ? <p className="mt-0.5 text-sm text-gray-600">{nextLabel}</p> : null}
          <button
            type="button"
            onClick={onContinue}
            className="group mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700"
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
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Layers size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-extrabold text-gray-900">Thẻ học</h2>
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
          Xem thẻ
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
}

// Practice is no longer a Hub*Card here — the Practice card + mode picker live
// in components/n400/hub/PracticeSelector.tsx (current-mode-first design).

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
    <section className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
          <TrendingDown size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-gray-900">Điểm yếu</h2>
          <p className="text-sm font-semibold text-orange-600">{topicLabel}</p>
          <p className="text-xs text-gray-500">
            {questionCount} câu · độ chính xác {accuracyPercent}%
          </p>
          <div className="mt-1.5 max-w-[220px]">
            <ProgressBar progress={accuracyPercent} />
          </div>
        </div>
        <button
          type="button"
          onClick={onPractice}
          className="group inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-orange-400 bg-white px-4 py-2 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50"
        >
          Ôn luyện ngay
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
}
