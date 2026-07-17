'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, Search, ArrowRight, Volume2 } from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { useN400UserState } from '@/lib/n400/user-state';
import {
  N400_QUESTIONS,
  N400_CATEGORY_LABELS,
  type N400CategoryKey,
} from '@/lib/n400/questions-data';
import { questionAudioUrl, answerAudioUrlFor, correctAnswersFor } from '@/lib/n400/quiz-engine';

const CATEGORY_NODES: { key: N400CategoryKey; top: string; left: string; color: string }[] = [
  { key: 'principles', top: '16%', left: '28%', color: '#2C9F9A' },
  { key: 'rights', top: '56%', left: '41%', color: '#EAB308' },
  { key: 'system', top: '31%', left: '63%', color: '#EA580C' },
  { key: 'history', top: '68%', left: '72%', color: '#6B21A8' },
  { key: 'symbols', top: '84%', left: '32%', color: '#2563EB' },
];

const LANDMARKS = [
  { src: '/images/n400/place-bridge.png', top: '33%', left: '12%', width: 128, height: 84 },
  { src: '/images/n400/place-capitol.png', top: '72%', left: '19%', width: 136, height: 120 },
  { src: '/images/n400/place-white-house.png', top: '20%', left: '82%', width: 136, height: 106 },
  { src: '/images/n400/place-sailboat.png', top: '53%', left: '87%', width: 118, height: 104 },
];

const TREE_POSITIONS: ReadonlyArray<readonly [string, string]> = [
  ['21%', '11%'],
  ['26%', '16%'],
  ['14%', '44%'],
  ['20%', '72%'],
  ['17%', '92%'],
  ['60%', '12%'],
  ['72%', '30%'],
  ['78%', '88%'],
];

export default function CategoriesPage() {
  const { state, hydrated, stats } = useN400UserState();
  const [search, setSearch] = useState('');
  const [openCategory, setOpenCategory] = useState<N400CategoryKey | null>(null);

  const categoryStats = useMemo(() => {
    const stats: Record<N400CategoryKey, { total: number; mastered: number; bookmarks: number }> = {
      principles: { total: 0, mastered: 0, bookmarks: 0 },
      system: { total: 0, mastered: 0, bookmarks: 0 },
      rights: { total: 0, mastered: 0, bookmarks: 0 },
      history: { total: 0, mastered: 0, bookmarks: 0 },
      symbols: { total: 0, mastered: 0, bookmarks: 0 },
    };
    const lastSeen = new Map<number, boolean>();
    for (const a of state.attempts) lastSeen.set(a.questionId, a.wasCorrect);
    for (const q of N400_QUESTIONS) {
      stats[q.category].total += 1;
      if (lastSeen.get(q.id) === true) stats[q.category].mastered += 1;
      if (state.bookmarks.includes(q.id)) stats[q.category].bookmarks += 1;
    }
    return stats;
  }, [state.attempts, state.bookmarks]);

  const filteredQuestions = useMemo(() => {
    if (!openCategory) return [];
    let qs = N400_QUESTIONS.filter((q) => q.category === openCategory);
    if (search.trim()) {
      const s = search.toLowerCase();
      qs = qs.filter(
        (q) =>
          q.questionEn.toLowerCase().includes(s) ||
          q.questionVi.toLowerCase().includes(s) ||
          String(q.id) === s
      );
    }
    return qs;
  }, [openCategory, search]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  return (
    <section className="mx-auto max-w-screen-2xl space-y-5 overflow-hidden">
      <div className="flex flex-col gap-4 xl:flex-row">
        <label className="relative block flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm câu hỏi theo từ khóa hoặc số (1-128)..."
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2C9F9A] focus:ring-4 focus:ring-[#2C9F9A]/10"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpenCategory(null)}
          className="flex h-12 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 xl:w-56"
        >
          <span>{openCategory ? N400_CATEGORY_LABELS[openCategory].vi : 'Tất cả danh mục'}</span>
          <ChevronDown size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {(Object.keys(N400_CATEGORY_LABELS) as N400CategoryKey[]).map((key) => {
          const cs = categoryStats[key];
          const pct = cs.total > 0 ? Math.round((cs.mastered / cs.total) * 100) : 0;
          const node = CATEGORY_NODES.find((n) => n.key === key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setOpenCategory(key)}
              className={`text-left transition-all ${
                openCategory === key ? 'ring-2 ring-teal-500 ring-offset-2' : ''
              }`}
            >
              <Card className="p-4 hover:shadow-md transition-shadow h-full">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: node?.color ?? '#2C9F9A' }}
                  />
                  <div className="text-sm font-bold text-gray-800">
                    {N400_CATEGORY_LABELS[key].vi}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-3">{N400_CATEGORY_LABELS[key].en}</div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold text-gray-800">{cs.mastered}</span>
                  <span className="text-xs text-gray-400">/ {cs.total} thuộc</span>
                </div>
                <ProgressBar
                  progress={pct}
                  heightClass="h-1.5"
                  colorClass="bg-teal-500"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{cs.bookmarks > 0 ? `★ ${cs.bookmarks}` : ' '}</span>
                  <span className="text-teal-600 font-semibold">Xem &rarr;</span>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {!openCategory ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="relative z-20 px-1 text-xl font-bold text-slate-950">Bản đồ chinh phục</h3>
          <div className="relative mt-2 overflow-hidden rounded-xl bg-white" style={{ minHeight: 470 }}>
            <RoadmapPath />

            {LANDMARKS.map((place) => (
              <div
                key={place.src}
                className="pointer-events-none absolute z-10"
                style={{
                  top: place.top,
                  left: place.left,
                  width: place.width,
                  height: place.height,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Image src={place.src} alt="" fill sizes={`${place.width}px`} className="object-contain" />
              </div>
            ))}

            {TREE_POSITIONS.map(([top, left]) => (
              <PaperTree key={`${top}-${left}`} top={top} left={left} />
            ))}

            {CATEGORY_NODES.map((node) => (
              <button
                type="button"
                onClick={() => setOpenCategory(node.key)}
                key={node.key}
                className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center hover:scale-110 transition-transform"
                style={{ top: node.top, left: node.left }}
              >
                <MapPin fill={node.color} />
                <div
                  className="min-w-28 rounded-lg px-3 py-1.5 text-center text-sm font-bold leading-tight text-white shadow-sm"
                  style={{ backgroundColor: node.color }}
                >
                  <span>{N400_CATEGORY_LABELS[node.key].vi}</span>
                  <br />
                  <span className="text-xs font-semibold opacity-95">
                    {N400_CATEGORY_LABELS[node.key].en}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div
            className="relative mt-4 flex items-center overflow-hidden rounded-2xl px-7 py-5"
            style={{ minHeight: 128, backgroundColor: '#ECF8F8' }}
          >
            <div className="relative z-10 max-w-md">
              <h4 className="text-lg font-bold text-slate-950">Khám phá tất cả danh mục</h4>
              <div className="mt-1 text-sm font-bold text-slate-950">Explore all categories</div>
              <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">
                Đã thuộc {stats.mastered} / 128 câu — tập trung vào nhóm còn yếu để tiến bộ nhanh hơn.
              </p>
            </div>

            <div
              className="absolute top-1/2 -translate-y-1/2"
              style={{ right: 48, width: 96, height: 96 }}
            >
              <Image
                src="/images/n400/compass-transparent.png"
                alt="Compass"
                fill
                className="object-contain"
                sizes="96px"
              />
            </div>
          </div>
        </div>
      ) : (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-800">
                {N400_CATEGORY_LABELS[openCategory].vi}
              </h3>
              <p className="text-xs text-gray-500">
                {N400_CATEGORY_LABELS[openCategory].en} • {filteredQuestions.length} câu
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/n400ready/study/civics`}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-teal-700"
              >
                Luyện tập <ArrowRight size={14} />
              </Link>
              <Link
                href={`/n400ready/flashcards`}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50"
              >
                Flashcards <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            {filteredQuestions.map((q) => {
              const correct = correctAnswersFor(q, state.settings.stateCode, state.address.districtNumber);
              const answers = correct.length > 0
                ? correct
                : q.answersEn.slice(0, 3).map((en, i) => ({ en, vi: q.answersVi[i] ?? en }));
              return (
                <details
                  key={q.id}
                  className="group rounded-xl border border-gray-200 bg-white open:border-teal-300 open:bg-teal-50/30"
                >
                  <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-xs text-teal-600 font-bold mb-1">Q. {q.id}</div>
                      <div className="font-semibold text-gray-800">{q.questionEn}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{q.questionVi}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AudioButton src={questionAudioUrl(q.id)} size="sm" label="Nghe câu hỏi" />
                      <ChevronDown size={16} className="text-gray-400 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="px-4 pb-4 text-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2 flex items-center gap-2">
                      <Volume2 size={12} /> Đáp án
                    </div>
                    <ul className="space-y-1.5 list-disc pl-5 text-gray-700">
                      {answers.map((a, i) => (
                        <li key={i}>
                          <span className="font-medium">{a.en}</span>
                          {a.vi !== a.en ? <span className="text-gray-500"> — {a.vi}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              );
            })}
          </div>
        </Card>
      )}
    </section>
  );
}

function RoadmapPath() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0"
      style={{ width: '100%', height: '100%' }}
      viewBox="0 0 1000 470"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M98 176 C205 66 365 68 420 124 C495 199 373 251 260 225 C173 205 164 318 280 337 C417 360 536 310 507 231 C481 161 582 102 695 139 C814 178 853 245 771 287 C682 333 612 370 710 406 C800 439 879 386 883 289"
        fill="none"
        stroke="#FCE3C4"
        strokeWidth="6"
        strokeDasharray="14 18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MapPin({ fill }: { fill: string }) {
  return (
    <svg
      className="mb-1.5 drop-shadow-sm"
      style={{ width: 44, height: 56 }}
      viewBox="0 0 64 88"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 83C27.6 73.8 8.5 54.8 8.5 32.5C8.5 19.1 19.1 8.5 32 8.5C44.9 8.5 55.5 19.1 55.5 32.5C55.5 54.8 36.4 73.8 32 83Z"
        fill={fill}
        stroke="#020617"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32.5" r="10.25" fill="white" stroke="#020617" strokeWidth="3" />
    </svg>
  );
}

function PaperTree({ top, left }: { top: string; left: string }) {
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ top, left, width: 32, height: 64 }}
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-0 h-8 w-6 -translate-x-1/2 rounded-full bg-[#82B993]" />
      <div className="absolute left-0 top-4 h-6 w-6 rounded-full bg-[#8EC29D]" />
      <div className="absolute right-0 top-4 h-6 w-6 rounded-full bg-[#8EC29D]" />
      <div className="absolute bottom-2 left-1/2 h-9 w-1.5 -translate-x-1/2 rounded-full bg-[#9B552E]" />
      <div className="absolute bottom-0 left-1/2 h-2.5 w-11 -translate-x-1/2 rounded-full bg-[#FFF7E6]" />
    </div>
  );
}
