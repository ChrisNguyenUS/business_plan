'use client';

import Image from 'next/image';
import { ChevronDown, Search } from 'lucide-react';

const CATEGORY_NODES = [
  {
    id: 'vocabulary',
    top: '16%',
    left: '28%',
    color: '#2C9F9A',
    label1: 'Từ vựng',
    label2: 'Vocabulary',
  },
  {
    id: 'reading',
    top: '56%',
    left: '41%',
    color: '#EAB308',
    label1: 'Đọc hiểu',
    label2: 'Reading',
  },
  {
    id: 'grammar',
    top: '31%',
    left: '63%',
    color: '#EA580C',
    label1: 'Ngữ pháp',
    label2: 'Grammar',
  },
  {
    id: 'listening',
    top: '68%',
    left: '72%',
    color: '#6B21A8',
    label1: 'Nghe hiểu',
    label2: 'Listening',
  },
];

const LANDMARKS = [
  { src: '/images/n400/place-bridge.png', top: '33%', left: '12%', width: 128, height: 84 },
  { src: '/images/n400/place-capitol.png', top: '72%', left: '19%', width: 136, height: 120 },
  { src: '/images/n400/place-white-house.png', top: '20%', left: '82%', width: 136, height: 106 },
  { src: '/images/n400/place-sailboat.png', top: '53%', left: '87%', width: 118, height: 104 },
];

const TREE_POSITIONS = [
  ['21%', '11%'],
  ['26%', '16%'],
  ['14%', '44%'],
  ['20%', '72%'],
  ['17%', '92%'],
  ['60%', '12%'],
  ['72%', '30%'],
  ['78%', '88%'],
] as const;

export default function CategoriesPage() {
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
            placeholder="Tìm kiếm danh mục..."
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2C9F9A] focus:ring-4 focus:ring-[#2C9F9A]/10"
          />
        </label>

        <button
          type="button"
          className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 xl:w-56"
        >
          <span>Sắp xếp: A - Z</span>
          <ChevronDown size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="relative z-20 px-1 text-xl font-bold text-slate-950">Danh mục</h3>

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
            <div
              key={node.id}
              className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ top: node.top, left: node.left }}
            >
              <MapPin fill={node.color} />
              <div
                className="min-w-28 rounded-lg px-3 py-1.5 text-center text-sm font-bold leading-tight text-white shadow-sm"
                style={{ backgroundColor: node.color }}
              >
                <span>{node.label1}</span>
                <br />
                <span className="text-xs font-semibold opacity-95">{node.label2}</span>
              </div>
            </div>
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
              Tập trung vào điểm yếu và nâng cao kỹ năng của bạn.
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
