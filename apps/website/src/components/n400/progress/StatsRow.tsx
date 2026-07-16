'use client';

// The "tiến bộ không?" row: four glanceable numbers under the skills card.
// Each cell is a number plus a plain-language read of it — the explanations
// live on the Chi tiết tab, which is where the linked cells point.

import Link from 'next/link';
import { ClipboardList, Flame, Target, Trophy } from 'lucide-react';

export interface StatCell {
  id: string;
  icon: 'flame' | 'trophy' | 'target' | 'clipboard';
  label: string;
  value: string;
  /** Plain-language read of the number, e.g. "Giữ vững phong độ!". */
  hint: string;
  tint: keyof typeof TINTS;
  /** Absolute href; the cell is static when omitted. */
  href?: string;
}

const TINTS = {
  orange: { icon: 'bg-orange-50 text-orange-500', hint: 'text-orange-600' },
  yellow: { icon: 'bg-yellow-50 text-yellow-500', hint: 'text-yellow-700' },
  teal: { icon: 'bg-teal-50 text-teal-600', hint: 'text-teal-700' },
  purple: { icon: 'bg-purple-50 text-purple-500', hint: 'text-purple-700' },
} as const;

const ICONS = { flame: Flame, trophy: Trophy, target: Target, clipboard: ClipboardList } as const;

export function StatsRow({ cells }: { cells: StatCell[] }) {
  return (
    // Four across even on mobile: stacked cells are short enough that one row
    // fits, and a 2×2 grid costs the height the screen doesn't have.
    <div className="grid grid-cols-4 gap-1 rounded-[24px] border border-slate-100 bg-white p-2 shadow-sm sm:gap-2 sm:p-3">
      {cells.map((cell) => {
        const Icon = ICONS[cell.icon];
        const tint = TINTS[cell.tint];
        const body = (
          <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-3 sm:text-left">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full sm:size-11 ${tint.icon}`}>
              <Icon size={17} className="sm:size-[19px]" />
            </span>
            {/* Reversed on mobile so the number leads and the label reads as a
                caption under it; the hidden hint doesn't take part. */}
            <div className="flex min-w-0 max-w-full flex-col-reverse sm:flex-col">
              <p className="truncate text-[10px] font-semibold text-slate-500 sm:text-[11px]">{cell.label}</p>
              <p className="text-sm font-extrabold tabular-nums text-slate-900 sm:text-lg">{cell.value}</p>
              {/* The hint is the first thing to go on mobile: the number and its
                  label already carry the meaning. */}
              <p className={`hidden truncate text-[11px] font-medium sm:block ${tint.hint}`}>{cell.hint}</p>
            </div>
          </div>
        );

        const className = 'rounded-2xl p-1 sm:p-3';
        return cell.href ? (
          <Link key={cell.id} href={cell.href} className={`${className} transition-colors hover:bg-slate-50`}>
            {body}
          </Link>
        ) : (
          <div key={cell.id} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
