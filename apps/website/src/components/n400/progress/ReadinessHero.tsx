'use client';

// The Tiến độ hero: one number for "am I ready?", one action for "what's next?".
// It deliberately shows only the single most important unmet condition — the
// full checklist lives on the Chi tiết tab. Keep it compact: this card shares
// one mobile screen with the skills card and the stat row.

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarDays, ChevronRight, Star, Target } from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { estimateSessions, isMockCriterion, type Readiness } from '@/lib/n400/readiness';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import type { N400Dict } from '@/lib/n400/i18n/vi';

// The ring is drawn in a fixed 92-unit viewBox and scaled down by CSS on
// mobile, so the geometry maths stays in one place.
const SIZE = 92;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** "2 – 3 buổi học nữa". A mock is one sitting, so it gets an exact count. */
function sessionsLabel(
  estimate: { min: number; max: number },
  isMock: boolean,
  t: N400Dict['progress']['hero'],
): string {
  if (isMock) return tFormat(t.sessionsMock, { count: estimate.min });
  return tFormat(t.sessionsRange, { min: estimate.min, max: estimate.max });
}

export function ReadinessHero({
  readiness,
  base,
  pace,
}: {
  readiness: Readiness;
  base: string;
  /** Measured câu-per-buổi from deriveLearningPace; null falls back to the default. */
  pace?: number | null;
}) {
  const { dict } = useN400Lang();
  const t = dict.progress.hero;
  const { percent, metCount, totalCount, next, ready } = readiness;
  const estimate = next ? estimateSessions(next, pace ?? undefined) : null;
  const isMockNext = next ? isMockCriterion(next.id) : false;

  return (
    <Card className="relative !overflow-hidden !p-0 border-slate-200/60">
      {/* ── Right-side scene. Hidden below sm: the milestone cells need the full
          width on mobile, and the card must not grow to make room for both. ── */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] sm:block">
        <Image
          src="/images/n400/Progress/hero-thumbnail.png"
          alt=""
          fill
          className="object-cover object-[62%_45%]"
          sizes="(min-width: 640px) 44vw, 0px"
          priority
        />
        {/* Left-edge gradient: blends the scene into the white card, same
            recipe as the dashboard hero. */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white/80 to-transparent" />
      </div>

      <div className="relative z-[1] p-3 sm:w-[62%] sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative size-[60px] shrink-0 sm:size-[92px]">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90" aria-hidden="true">
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
            <div className="absolute inset-0 flex items-center justify-center text-base font-extrabold tabular-nums text-teal-900 sm:text-xl">
              {percent}%
            </div>
          </div>

          <div className="min-w-0">
            {/* The chip states the metric, not the verdict — at 37% a bare
                "SẴN SÀNG" would read as a claim the learner is ready. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                  ready
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-white text-teal-700'
                }`}
              >
                <Star size={11} className="text-amber-400" fill="currentColor" />
                {ready ? t.readyBadge : t.readinessLevel}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {tFormat(t.conditions, { metCount, totalCount })}
              </span>
            </div>
            <h1 className="mt-1.5 text-base font-extrabold text-slate-900 sm:text-xl">{t.title}</h1>
            {/* Encouragement is the first thing to go on mobile — the milestone
                below it is the part that drives the next action. */}
            <p className="mt-1 hidden text-sm text-slate-600 sm:block">
              {ready ? t.readyMessage : t.onTrackMessage}
            </p>
          </div>
        </div>

        {next ? (
          <>
            <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white/80 p-2.5 sm:p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 sm:size-9">
                    <Target size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t.nextMilestone}
                      {/* The estimate has no room for its own cell on mobile, so
                          it rides along here instead of being dropped. */}
                      {estimate ? (
                        <span className="sm:hidden"> · {sessionsLabel(estimate, isMockNext, t)}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-800">{next.milestone}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 sm:mt-2.5">
                  <ProgressBar progress={Math.round(next.progress * 100)} heightClass="h-2" />
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">
                    {next.detail}
                  </span>
                </div>
              </div>

              <Link
                href={`${base}/statistic`}
                className="group hidden items-center gap-2.5 rounded-2xl border border-slate-100 bg-white/80 p-3 transition-colors hover:border-teal-200 hover:bg-white sm:flex"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                  <CalendarDays size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.estimatedCompletion}</p>
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {estimate ? sessionsLabel(estimate, isMockNext, t) : '—'}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="ml-auto shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <Link
              href={`${base}${next.cta.href}`}
              className="group mt-3 inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-all hover:-translate-y-0.5 hover:bg-teal-700 active:translate-y-0 sm:mt-4 sm:py-2.5"
            >
              {next.cta.label}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </>
        ) : (
          <Link
            href={`${base}/mock-test`}
            className="group mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0"
          >
            {t.celebratory}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </Card>
  );
}
