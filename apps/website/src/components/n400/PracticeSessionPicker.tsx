'use client';

import Image from 'next/image';
import { Zap, ClipboardList, Layers, Library, ArrowRight, ChevronRight, Lightbulb } from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';
import type { PracticePreset, PracticeRecommendation } from '@/lib/n400/quiz-engine';
import { N400_CATEGORY_LABELS } from '@/lib/n400/questions-data';

const PRESET_ICONS: Record<PracticePreset['id'], React.ReactNode> = {
  quick: <Zap size={22} />,
  standard: <ClipboardList size={22} />,
  deep: <Layers size={22} />,
  full: <Library size={22} />,
};

const PRESET_TONES: Record<PracticePreset['id'], string> = {
  quick: 'bg-teal-50 text-teal-600',
  standard: 'bg-blue-50 text-blue-600',
  deep: 'bg-orange-50 text-orange-500',
  full: 'bg-purple-50 text-purple-600',
};

export interface ResumeSession {
  preset: PracticePreset;
  /** 0-based index of the next unanswered question. */
  index: number;
  total: number;
}

export function PracticeSessionPicker({
  presets,
  totalCount,
  resume,
  recommendation,
  onSelect,
  onResume,
  onPracticeRecommendation,
}: {
  presets: PracticePreset[];
  /** Size of the full question pool (128). */
  totalCount: number;
  resume: ResumeSession | null;
  recommendation: PracticeRecommendation | null;
  onSelect: (preset: PracticePreset) => void;
  onResume: () => void;
  onPracticeRecommendation: (recommendation: PracticeRecommendation) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto animate-in fade-in duration-300">
      <div className="flex flex-col gap-6 sm:gap-8 pb-6">
        {resume ? <ContinueHero resume={resume} onResume={onResume} /> : null}

        <section>
          <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3">
            Chọn chế độ luyện tập
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {presets.map((preset) => {
              const count = preset.count ?? totalCount;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelect(preset)}
                  className="group flex items-center gap-4 w-full text-left bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm transition-all duration-200 motion-reduce:transition-none hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${PRESET_TONES[preset.id]}`}>
                    {PRESET_ICONS[preset.id]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 leading-tight">{preset.titleVi}</div>
                    <div className="text-sm mt-0.5">
                      <span className="font-semibold text-teal-700">{count} câu</span>
                      {preset.minutes !== null ? (
                        <span className="text-gray-500"> · ≈ {preset.minutes} phút</span>
                      ) : null}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5 truncate">{preset.descVi}</div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="shrink-0 text-gray-300 transition-all duration-200 motion-reduce:transition-none group-hover:text-teal-600 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                  />
                </button>
              );
            })}
          </div>
        </section>

        {recommendation ? (
          <Recommendation
            recommendation={recommendation}
            onPractice={() => onPracticeRecommendation(recommendation)}
          />
        ) : null}
      </div>
    </div>
  );
}

function ContinueHero({ resume, onResume }: { resume: ResumeSession; onResume: () => void }) {
  const { preset, index, total } = resume;
  const minutesLeft = preset.minutes !== null
    ? Math.max(1, Math.ceil((preset.minutes * (total - index)) / total))
    : null;

  return (
    <section className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div className="relative h-20 w-24 shrink-0 hidden sm:block">
        <Image
          src="/images/n400/illu-statue-city.png"
          alt=""
          fill
          className="object-contain object-bottom"
          sizes="96px"
          priority
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold uppercase tracking-wide text-teal-600">Tiếp tục học</div>
        <div className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mt-0.5">
          {preset.titleVi} — Câu {index + 1}/{total}
        </div>
        <div className="mt-2 max-w-sm">
          <ProgressBar progress={(index / total) * 100} heightClass="h-1.5" />
        </div>
        {minutesLeft !== null ? (
          <div className="text-sm text-gray-500 mt-1.5">≈ {minutesLeft} phút còn lại</div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onResume}
        className="group shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 font-semibold text-white shadow-md shadow-teal-600/20 transition-all duration-200 motion-reduce:transition-none hover:bg-teal-700"
      >
        Tiếp tục học
        <ArrowRight size={16} className="transition-transform duration-200 motion-reduce:transition-none group-hover:translate-x-0.5" />
      </button>
    </section>
  );
}

function Recommendation({
  recommendation,
  onPractice,
}: {
  recommendation: PracticeRecommendation;
  onPractice: () => void;
}) {
  const label = N400_CATEGORY_LABELS[recommendation.category].vi;

  return (
    <section className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-500 flex items-center justify-center shrink-0">
        <Lightbulb size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Gợi ý hôm nay</div>
        <div className="text-sm font-semibold text-gray-800 mt-0.5">
          Bạn sai {recommendation.wrongCount}/{recommendation.sampleSize} câu gần đây về {label}.
        </div>
        <div className="text-sm text-gray-600">Ôn lại 5 câu trong khoảng 3 phút.</div>
      </div>
      <button
        type="button"
        onClick={onPractice}
        className="group shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-teal-600 bg-white px-5 py-2.5 text-sm font-semibold text-teal-700 transition-colors duration-200 motion-reduce:transition-none hover:bg-teal-50"
      >
        Luyện ngay
        <ArrowRight size={15} className="transition-transform duration-200 motion-reduce:transition-none group-hover:translate-x-0.5" />
      </button>
    </section>
  );
}
