'use client';

// All four interview skills in ONE card — replaces the four separate StatsCards,
// which could not fit a mobile screen together with the hero. Answers "mình yếu
// ở đâu?" at a glance: the weakest skill is the only one flagged.

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';

/** Per-skill accent, so each card is recognisable at a glance. */
const ACCENTS = {
  teal: { bar: 'bg-teal-600', cta: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
  blue: { bar: 'bg-blue-500', cta: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
  purple: { bar: 'bg-purple-500', cta: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
  orange: { bar: 'bg-orange-400', cta: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
} as const;

export type SkillAccent = keyof typeof ACCENTS;

export interface SkillRow {
  id: string;
  /** Square thumbnail under /images/n400/Progress. */
  thumbnail: string;
  label: string;
  /** Size of the pool, e.g. "128 câu hỏi". */
  subtitle: string;
  /** Items the learner knows. */
  known: number;
  total: number;
  /** Absolute href (locale + base already applied). */
  href: string;
  ctaLabel: string;
  accent: SkillAccent;
  /** Exactly one row should carry this — the weakest skill. */
  weak: boolean;
}

export function SkillsCard({ rows }: { rows: SkillRow[] }) {
  return (
    <Card className="!p-3 sm:!p-6">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kỹ năng</h2>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:gap-3 lg:grid-cols-4">
        {rows.map((row) => {
          const percent = row.total === 0 ? 0 : Math.round((row.known / row.total) * 100);
          const accent = ACCENTS[row.accent];
          return (
            // The whole card is the tap target; the CTA below is a visual
            // affordance for desktop, which has the room for it.
            <Link
              key={row.id}
              href={row.href}
              className="flex flex-col rounded-2xl border border-slate-100 bg-white p-2 transition-colors hover:border-slate-200 hover:bg-slate-50/60 sm:p-3"
            >
              <div className="flex items-center gap-2.5">
                <Image
                  src={`/images/n400/Progress/${row.thumbnail}`}
                  alt=""
                  width={48}
                  height={48}
                  className="size-9 shrink-0 rounded-xl object-cover sm:size-12"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-xs font-bold text-slate-800 sm:text-sm">{row.label}</p>
                    {/* Only the weakest skill is flagged — a badge on every card
                        would flag nothing. */}
                    {row.weak ? (
                      <span className="shrink-0 text-[10px]" title="Cần luyện thêm">
                        ⚠️
                      </span>
                    ) : null}
                  </div>
                  <p className="hidden truncate text-[11px] text-slate-500 sm:block">{row.subtitle}</p>
                </div>
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-2 sm:mt-3">
                <span className="text-xs font-bold tabular-nums text-slate-800">
                  {row.known}
                  <span className="font-medium text-slate-400">/{row.total} câu</span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">{percent}%</span>
              </div>
              <div className="mt-1 sm:mt-1.5">
                <ProgressBar progress={percent} heightClass="h-2" colorClass={accent.bar} />
              </div>

              <span
                className={`mt-2.5 hidden items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors sm:inline-flex ${accent.cta}`}
              >
                {row.ctaLabel}
                <ArrowRight size={13} />
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
