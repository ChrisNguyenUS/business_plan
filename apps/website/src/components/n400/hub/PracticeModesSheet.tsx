'use client';

// Bottom sheet for picking a practice mode — replaces the old inline
// PracticeSessionPicker grid. Hubs show one "Luyện tập" card and open this
// on demand (progressive disclosure: one decision per screen).

import { useEffect } from 'react';
import { X, Zap, Star, Target, Trophy } from 'lucide-react';
import type { PracticePreset } from '@/lib/n400/quiz-engine';

const MODE_META: Record<PracticePreset['id'], { icon: React.ReactNode; tone: string; hot?: boolean }> = {
  quick: { icon: <Zap size={22} />, tone: 'bg-teal-50 text-teal-600' },
  standard: { icon: <Star size={22} />, tone: 'bg-amber-50 text-amber-500', hot: true },
  deep: { icon: <Target size={22} />, tone: 'bg-blue-50 text-blue-600' },
  full: { icon: <Trophy size={22} />, tone: 'bg-purple-50 text-purple-600' },
};

export function PracticeModesSheet({
  open,
  onClose,
  presets,
  totalCount,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  presets: PracticePreset[];
  totalCount: number;
  onSelect: (preset: PracticePreset) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Chế độ luyện tập">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-slate-900/40 backdrop-blur-[2px]"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 sm:p-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Chế độ luyện tập</h2>
              <p className="mt-1 text-sm text-gray-500">Chọn chế độ phù hợp với thời gian và mục tiêu của bạn.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="cursor-pointer rounded-xl p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:grid-cols-2 lg:grid-cols-4">
            {presets.map((preset) => {
              const meta = MODE_META[preset.id];
              const count = preset.count ?? totalCount;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelect(preset)}
                  className="relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {meta.hot ? (
                    <span className="absolute right-3 top-3 rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Hot
                    </span>
                  ) : null}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${meta.tone}`}>{meta.icon}</div>
                  <div className="font-bold text-gray-800">{preset.titleVi}</div>
                  <div className="text-sm font-semibold text-teal-700">
                    {count} câu
                    {preset.minutes !== null ? (
                      <span className="font-normal text-gray-500"> · ≈ {preset.minutes} phút</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-500">{preset.descVi}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
