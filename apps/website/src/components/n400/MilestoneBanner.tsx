'use client';

import { Sparkles } from 'lucide-react';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';

export function MilestoneBanner({ days }: { days: number }) {
  const { dict } = useN400Lang();
  const copy: Record<number, string> = {
    3: dict.common.milestone3,
    7: dict.common.milestone7,
    14: dict.common.milestone14,
    30: dict.common.milestone30,
    60: dict.common.milestone60,
    100: dict.common.milestone100,
  };

  return (
    <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-sm shrink-0">
        <Sparkles size={26} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold text-orange-700 mb-0.5">
          {tFormat(dict.common.milestoneBannerTitle, { days })}
        </div>
        <div className="text-sm text-gray-700">
          {copy[days] ?? tFormat(dict.common.milestoneBannerFallback, { days })}
        </div>
      </div>
    </div>
  );
}
