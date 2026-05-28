'use client';

import { Sparkles } from 'lucide-react';

const COPY: Record<number, string> = {
  3: 'Bạn đã giữ chuỗi 3 ngày — khởi đầu tuyệt vời!',
  7: 'Một tuần liên tục! Sự kiên trì đang được đền đáp.',
  14: 'Hai tuần liền — bạn đang biến việc học thành thói quen.',
  30: 'Một tháng học không gián đoạn. Bạn rất ấn tượng!',
  60: '60 ngày liên tục — kỷ luật ở đẳng cấp khác.',
  100: '100 ngày! Bạn đang ở đỉnh cao của sự kiên định.',
};

export function MilestoneBanner({ days }: { days: number }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-sm shrink-0">
        <Sparkles size={26} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold text-orange-700 mb-0.5">🎉 Cột mốc {days} ngày!</div>
        <div className="text-sm text-gray-700">{COPY[days] ?? `Bạn đã giữ chuỗi ${days} ngày.`}</div>
      </div>
    </div>
  );
}
