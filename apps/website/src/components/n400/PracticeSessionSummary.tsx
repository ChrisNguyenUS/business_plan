'use client';

import { Trophy, RotateCw, SlidersHorizontal } from 'lucide-react';

export function PracticeSessionSummary({
  correct,
  total,
  onRetry,
  onChangeMode,
}: {
  correct: number;
  total: number;
  onRetry: () => void;
  onChangeMode: () => void;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 sm:p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
          <Trophy size={30} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Hoàn thành! / Session complete!</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">
          Bạn đã hoàn thành phiên luyện tập. Tiếp tục giữ vững phong độ nhé! 💪
        </p>

        <div className="rounded-2xl bg-gray-50 border border-gray-100 py-4 mb-6">
          <div className="text-3xl font-extrabold text-teal-600">
            {correct} / {total}
          </div>
          <div className="text-xs text-gray-500 mt-1">câu đúng · {pct}%</div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 font-semibold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors"
          >
            <RotateCw size={16} /> Luyện lại / Practice again
          </button>
          <button
            type="button"
            onClick={onChangeMode}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal size={16} /> Đổi chế độ / Change mode
          </button>
        </div>
      </div>
    </div>
  );
}
