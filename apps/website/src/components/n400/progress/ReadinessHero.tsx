'use client';

// The Tiến độ hero: one number for "am I ready?", one action for "what's next?".
// It deliberately shows only the single most important unmet condition — the
// full checklist lives on the Chi tiết tab. Keep it compact: this card shares
// one mobile screen with the skills card and the chip row.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/n400/ui';
import type { Readiness } from '@/lib/n400/readiness';

const SIZE = 72;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ReadinessHero({ readiness, base }: { readiness: Readiness; base: string }) {
  const { percent, metCount, totalCount, next, ready } = readiness;

  return (
    <Card className="!p-4 sm:!p-6">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              stroke="currentColor"
              className="text-slate-100"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              stroke="currentColor"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
              className={ready ? 'text-emerald-500' : 'text-teal-600'}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-extrabold tabular-nums text-teal-900">
            {percent}%
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="text-base font-bold text-teal-900 sm:text-lg">Sẵn sàng phỏng vấn</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Đạt {metCount}/{totalCount} điều kiện
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-gray-100 pt-3">
        {next ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Việc tiếp theo</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{next.label}</p>
            <Link
              href={`${base}${next.cta.href}`}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              {next.cta.label} <ArrowRight size={14} />
            </Link>
          </>
        ) : (
          <p className="text-sm font-semibold text-emerald-700">
            🎉 Bạn đã đạt đủ {totalCount} điều kiện — sẵn sàng cho buổi phỏng vấn!
          </p>
        )}
      </div>
    </Card>
  );
}
