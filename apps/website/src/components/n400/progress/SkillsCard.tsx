'use client';

// All four interview skills in ONE card — replaces the four separate StatsCards,
// which could not fit a mobile screen together with the hero. Answers "mình yếu
// ở đâu?" at a glance: the weakest skill is the only one flagged.

import Link from 'next/link';
import { Card, ProgressBar } from '@/components/n400/ui';

export interface SkillRow {
  id: string;
  icon: string;
  label: string;
  /** Items the learner knows. */
  known: number;
  total: number;
  /** Absolute href (locale + base already applied). */
  href: string;
  /** Exactly one row should carry this — the weakest skill. */
  weak: boolean;
}

export function SkillsCard({ rows }: { rows: SkillRow[] }) {
  return (
    <Card className="!p-4 sm:!p-6">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Kỹ năng</h2>
      <div className="mt-2.5 space-y-2.5">
        {rows.map((row) => {
          const percent = row.total === 0 ? 0 : Math.round((row.known / row.total) * 100);
          return (
            <Link
              key={row.id}
              href={row.href}
              className="-mx-2 block rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-lg" aria-hidden="true">
                  {row.icon}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-gray-700">{row.label}</span>
                {row.weak ? (
                  <span className="shrink-0 text-xs" title="Cần luyện thêm">
                    ⚠️
                  </span>
                ) : null}
                <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-gray-500">
                  {row.known}/{row.total}
                </span>
              </div>
              <div className="mt-1.5">
                <ProgressBar
                  progress={percent}
                  heightClass="h-1.5"
                  colorClass={row.weak ? 'bg-orange-400' : 'bg-teal-600'}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
