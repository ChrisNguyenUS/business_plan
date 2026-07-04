'use client';

import { Zap, ClipboardList, Layers, Library, Clock, ArrowRight } from 'lucide-react';
import type { PracticePreset } from '@/lib/n400/quiz-engine';

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

export function PracticeSessionPicker({
  presets,
  totalCount,
  onSelect,
}: {
  presets: PracticePreset[];
  /** Size of the full question pool (128). */
  totalCount: number;
  onSelect: (preset: PracticePreset) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto animate-in fade-in duration-300">
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">
          Chọn chế độ luyện tập / Choose a practice mode
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Luyện ngắn mỗi ngày hoặc ôn toàn bộ — tùy bạn chọn!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {presets.map((preset) => {
          const count = preset.count ?? totalCount;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset)}
              className="group flex flex-col text-left bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${PRESET_TONES[preset.id]}`}>
                {PRESET_ICONS[preset.id]}
              </div>
              <div className="font-bold text-gray-800 leading-tight">{preset.titleVi}</div>
              <div className="text-xs text-gray-400 mb-2">{preset.titleEn}</div>
              <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                <span className="font-semibold">{count} câu</span>
                {preset.minutes !== null ? (
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock size={13} /> ≈ {preset.minutes} phút
                  </span>
                ) : null}
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 group-hover:text-teal-700">
                Bắt đầu / Start <ArrowRight size={15} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
