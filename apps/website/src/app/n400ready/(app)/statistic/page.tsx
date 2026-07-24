'use client';

// Tiến độ — tab 2 of 2, "Chi tiết". The Tổng quan tab answers the three
// questions at a glance; this tab explains them. The old KPI row and the
// duplicate category block were removed because the readiness checklist and
// the skills card already carry those numbers.
//
// One thing is deliberately echoed across both tabs: "Đạt X/5 điều kiện", the
// anchor the whole screen hangs on. Both tabs read it from the same
// deriveReadiness call shape, so they cannot disagree. Everything else lives
// on exactly one tab.

import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  MessageCircle,
  MessagesSquare,
  Mic,
  Pencil,
  type LucideIcon,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { ProgressTabs } from '@/components/n400/progress/ProgressTabs';
import { useN400UserState } from '@/lib/n400/user-state';
import {
  CIVICS_MOCK_PASS_STREAK,
  deriveReadiness,
  isMockCriterion,
  type ReadinessCriterionId,
} from '@/lib/n400/readiness';
import { tFormat } from '@/lib/n400/i18n/format';
import { buildHeatGrid, HEAT_COLORS, heatWeekdays } from '@/lib/n400/activity-heatmap';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { lastWrongQuestionIds } from '@/lib/n400/quiz-engine';
import { deriveSectionMastered, lastWrongSectionItemIds } from '@/lib/n400/section-progress';
import {
  N400_CATEGORY_LABELS,
  N400_QUESTIONS,
  type N400CategoryKey,
} from '@/lib/n400/questions-data';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { WRITING_SENTENCES } from '@/lib/n400/writing-data';

const CATEGORY_COLORS: Record<N400CategoryKey, string> = {
  principles: 'bg-teal-600',
  system: 'bg-orange-500',
  rights: 'bg-yellow-500',
  history: 'bg-purple-600',
  symbols: 'bg-blue-600',
};

const MOCK_MAX_SCORE = 20;
const MOCK_PASS_SCORE = 12;

// UI-only: an icon + soft accent per readiness milestone. Drawn from the
// dashboard's existing palette (teal/purple/amber/blue/orange) — no new colors.
const CRITERION_STYLE: Record<ReadinessCriterionId, { Icon: LucideIcon; iconBg: string; iconText: string }> = {
  civics_known: { Icon: BookOpen, iconBg: 'bg-teal-50', iconText: 'text-teal-600' },
  whatmean_known: { Icon: MessageCircle, iconBg: 'bg-purple-50', iconText: 'text-purple-600' },
  yesno_known: { Icon: MessagesSquare, iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  writing_known: { Icon: Pencil, iconBg: 'bg-teal-50', iconText: 'text-teal-600' },
  writing_mock: { Icon: FileCheck2, iconBg: 'bg-blue-50', iconText: 'text-blue-600' },
  speaking_mock: { Icon: Mic, iconBg: 'bg-orange-50', iconText: 'text-orange-500' },
  civics_mock: { Icon: ClipboardCheck, iconBg: 'bg-yellow-50', iconText: 'text-yellow-600' },
};

/**
 * Encouraging, never punitive: ○ not started · ◔ in progress · ✓ done. The
 * in-progress state is a real arc so partial work still reads as forward motion.
 * No red anywhere — an unmet milestone is calm slate, not a failure.
 */
function StatusRing({ progress, met }: { progress: number; met: boolean }) {
  if (met) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white">
        <Check size={12} strokeWidth={3} />
      </span>
    );
  }
  if (progress <= 0) {
    return <span className="block size-5 shrink-0 rounded-full border-2 border-slate-200" />;
  }
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(0.06, Math.min(progress, 1)) * circumference;
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0 -rotate-90" aria-hidden>
      <circle cx="10" cy="10" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="3" />
      <circle
        cx="10"
        cy="10"
        r={radius}
        fill="none"
        stroke="#0d9488"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
      />
    </svg>
  );
}

export default function StatisticPage() {
  const { dict, lang } = useN400Lang();
  const { state, hydrated, stats } = useN400UserState();
  const base = '/n400ready';

  // Every skill lands on the calendar, not just civics.
  const heat = useMemo(
    () =>
      buildHeatGrid(
        [
          ...state.attempts.map((a) => ({ at: a.at })),
          ...state.sectionAttempts.map((a) => ({ at: a.at })),
        ],
        new Date(),
        dict,
      ),
    [state.attempts, state.sectionAttempts, dict],
  );

  // "Thuộc" = last graded attempt correct (spec D1) — NOT the flashcard deck's
  // marked-state, which proves nothing about retrieval.
  const sectionMastered = useMemo(
    () => deriveSectionMastered(state.sectionAttempts),
    [state.sectionAttempts],
  );

  const readiness = useMemo(
    () =>
      deriveReadiness(
        {
          civicsKnown: stats.mastered,
          civicsTotal: N400_QUESTIONS.length,
          whatmeanKnown: sectionMastered.whatmean.length,
          whatmeanTotal: WHATMEAN_QUESTIONS.length,
          yesnoKnown: sectionMastered.yesno.length,
          yesnoTotal: YESNO_QUESTIONS.length,
          writingKnown: sectionMastered.writing.length,
          writingTotal: WRITING_SENTENCES.length,
          mockResults: state.mockResults,
          sectionMockResults: state.sectionMockResults,
        },
        dict,
      ),
    [stats.mastered, sectionMastered, state.mockResults, state.sectionMockResults, dict],
  );

  const categoryAccuracy = useMemo(() => {
    const acc: Record<N400CategoryKey, { correct: number; total: number }> = {
      principles: { correct: 0, total: 0 },
      system: { correct: 0, total: 0 },
      rights: { correct: 0, total: 0 },
      history: { correct: 0, total: 0 },
      symbols: { correct: 0, total: 0 },
    };
    const categoryById = new Map(N400_QUESTIONS.map((q) => [q.id, q.category]));
    for (const a of state.attempts) {
      const cat = categoryById.get(a.questionId);
      if (!cat) continue;
      acc[cat].total += 1;
      if (a.wasCorrect) acc[cat].correct += 1;
    }
    return acc;
  }, [state.attempts]);

  // "Câu sai chưa ôn" — graded modes only; flashcard self-grades never create
  // or clear debt. Same helpers the study tip uses, so the counts agree.
  const debts = useMemo(
    () =>
      [
        { label: 'Civics', thumbnail: 'civics-thumbnail.png', count: lastWrongQuestionIds(state.attempts).length, href: `${base}/practice?start=wrongs` },
        { label: 'What Mean', thumbnail: 'whatmean-thumbnail.png', count: lastWrongSectionItemIds(state.sectionAttempts, 'whatmean').length, href: `${base}/speaking/what-mean?start=wrongs` },
        { label: 'Yes/No', thumbnail: 'yesno-thumbnail.png', count: lastWrongSectionItemIds(state.sectionAttempts, 'yesno').length, href: `${base}/speaking/yes-no?start=wrongs` },
        { label: dict.readiness.skillLabels.writing, thumbnail: 'writing-thumbnail.png', count: lastWrongSectionItemIds(state.sectionAttempts, 'writing').length, href: `${base}/writing?start=wrongs` },
      ].filter((d) => d.count > 0),
    [state.attempts, state.sectionAttempts, base, dict],
  );

  const mockTrend = state.mockResults.slice(-10);
  const lastWritingMock = useMemo(
    () => [...state.sectionMockResults].reverse().find((m) => m.section === 'writing') ?? null,
    [state.sectionMockResults],
  );
  const lastSpeakingMock = useMemo(
    () => [...state.sectionMockResults].reverse().find((m) => m.section === 'speaking') ?? null,
    [state.sectionMockResults],
  );

  if (!hydrated) {
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  // A learner who has only touched Writing still has data — gate on every skill.
  const hasAnyActivity = state.attempts.length > 0 || state.sectionAttempts.length > 0;

  if (!hasAnyActivity) {
    return (
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4 animate-in fade-in duration-300">
        <ProgressTabs />
        <Card className="mx-auto max-w-xl p-6 text-center sm:p-12">
          <h3 className="mb-2 text-2xl font-bold text-gray-800">{dict.progress.noData.title}</h3>
          <p className="mb-6 text-sm text-gray-500">
            {dict.progress.noData.subtitle}
          </p>
          <Link
            href={`${base}/study`}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-teal-700"
          >
            {dict.common.cta.startLearning} <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4 animate-in fade-in duration-300 sm:gap-6">
      <ProgressTabs />

      {/* 1. The full readiness checklist — the hero on /progress shows only the next item. */}
      <Card className="p-5 sm:p-6">
        {/* Compact summary — the visual entry point of the card. */}
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800">{dict.progress.readiness.title}</h3>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-gray-400">{dict.progress.readiness.leadIn}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4 rounded-2xl bg-slate-50 p-4 sm:min-w-[380px]">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <ClipboardCheck size={24} />
            </div>
            <div className="shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-600">
                {dict.progress.readiness.summaryLabel}
              </p>
              <p className="text-xl font-extrabold leading-tight tabular-nums text-gray-800">
                {readiness.metCount} <span className="font-bold text-gray-300">/</span> {readiness.totalCount}
              </p>
              <p className="text-[11px] text-gray-400">{dict.progress.readiness.milestonesCompleted}</p>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="min-w-0 flex-1">
                <ProgressBar progress={readiness.percent} colorClass="bg-teal-500" heightClass="h-2" />
              </div>
              <span className="shrink-0 text-xs font-bold tabular-nums text-gray-500">{readiness.percent}%</span>
            </div>
          </div>
        </div>

        <ul className="space-y-1">
          {readiness.criteria.map((c) => {
            const style = CRITERION_STYLE[c.id];
            const Icon = style.Icon;
            const isMock = isMockCriterion(c.id);
            const pct = Math.round(c.progress * 100);
            const desc = tFormat(dict.progress.readiness.itemDesc[c.id], {
              streak: CIVICS_MOCK_PASS_STREAK,
            });
            return (
              <li key={c.id} className="rounded-2xl px-2 py-3.5 transition-colors hover:bg-slate-50/70 sm:px-3">
                <div className="flex items-start gap-3">
                  <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${style.iconBg}`}>
                    <Icon size={20} className={style.iconText} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusRing progress={c.progress} met={c.met} />
                      <span className={`truncate text-sm font-bold ${c.met ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {c.label}
                      </span>
                    </div>
                    <p className="mt-0.5 pl-7 text-xs leading-relaxed text-gray-400">{desc}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <span className="text-sm font-semibold tabular-nums text-gray-700">{c.detail}</span>
                    {c.met ? null : (
                      <Link
                        href={`${base}${c.cta.href}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        {c.cta.label} <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3 pl-14">
                  <div className="min-w-0 flex-1">
                    <ProgressBar progress={pct} colorClass="bg-teal-500" heightClass="h-1.5" />
                  </div>
                  {isMock ? null : (
                    <span className="w-9 shrink-0 text-right text-[11px] font-bold tabular-nums text-gray-400">{pct}%</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* 2. Mock tests — all three kinds in one place. */}
      <Card className="p-5 sm:p-6">
        {/* When there are no civics mocks the header lives inside the friendly
            empty state, so we don't stack two titles. */}
        {mockTrend.length > 0 && (
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-800">{dict.progress.mock.title}</h3>
              <p className="mt-1 text-xs text-gray-400">{dict.progress.mock.subtitle}</p>
            </div>
          </div>
        )}

        {mockTrend.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-2 text-center sm:flex-row sm:items-center sm:gap-10 sm:py-6 sm:text-left">
            <div className="w-44 shrink-0 sm:w-56">
              <Image
                src="/images/n400/no_test_yet.png"
                alt=""
                width={448}
                height={360}
                className="h-auto w-full"
              />
            </div>
            <div className="max-w-md">
              <div className="mb-3 flex items-center justify-center gap-2 text-teal-600 sm:justify-start">
                <ClipboardCheck size={18} />
                <span className="text-sm font-bold">{dict.progress.mock.title}</span>
              </div>
              <h4 className="text-xl font-extrabold text-gray-800 sm:text-2xl">{dict.progress.mock.emptyTitle}</h4>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{dict.progress.mock.emptyDesc}</p>
              <Link
                href={`${base}/mock-test`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700"
              >
                {dict.mockTest.intro.startButtonFirst} <ArrowRight size={16} />
              </Link>
              <p className="mt-4 text-xs text-gray-300">{dict.progress.mock.emptyFootnote}</p>
            </div>
          </div>
        ) : (
          <div className="relative h-56 pl-8 pr-2 sm:h-64">
            <div className="absolute left-0 top-0 flex h-full flex-col justify-between py-2 text-[10px] text-gray-400">
              <span>20</span>
              <span>15</span>
              <span>12</span>
              <span>5</span>
              <span>0</span>
            </div>
            {[20, 15, 12, 5, 0].map((v) => (
              <div
                key={v}
                className="pointer-events-none absolute left-8 right-2 border-t border-gray-100"
                style={{ bottom: `${(v / MOCK_MAX_SCORE) * 100}%` }}
              />
            ))}
            <div
              className="pointer-events-none absolute left-8 right-2 z-10 border-t-2 border-dashed border-teal-300"
              style={{ bottom: `${(MOCK_PASS_SCORE / MOCK_MAX_SCORE) * 100}%` }}
            >
              <span className="absolute -top-4 right-0 rounded bg-teal-50 px-1 text-[10px] text-teal-600">
                {tFormat(dict.progress.mock.passLine, { score: MOCK_PASS_SCORE })}
              </span>
            </div>
            <div className="absolute bottom-0 left-8 right-2 top-0 flex items-end gap-3">
              {mockTrend.map((m, i) => {
                const barHeight = (m.score / MOCK_MAX_SCORE) * 100;
                return (
                  <div
                    key={m.id}
                    className="relative h-full min-w-0 flex-1"
                    title={`${m.score}/${m.total} • ${new Date(m.completedAt).toLocaleDateString('vi-VN')}`}
                  >
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold text-gray-700"
                      style={{ bottom: `calc(${barHeight}% + 4px)` }}
                    >
                      {m.score}
                    </div>
                    <div
                      className={`absolute bottom-0 left-1 right-1 rounded-t-lg transition-all duration-500 ${m.passed ? 'bg-teal-500' : 'bg-orange-400'}`}
                      style={{ height: `${barHeight}%`, minHeight: 4 }}
                    />
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-gray-400">
                      #{i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hide the Viết/Speaking quick-links only when there is nothing at all
            to show — the empty state above already invites the first test. */}
        {(mockTrend.length > 0 || lastWritingMock || lastSpeakingMock) && (
        <div className="mt-8 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          {[
            { label: dict.progress.mock.writing, result: lastWritingMock, href: `${base}/mock-test/viet` },
            { label: dict.progress.mock.speaking, result: lastSpeakingMock, href: `${base}/mock-test/speaking` },
          ].map((row) => (
            <Link
              key={row.label}
              href={row.href}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 hover:bg-slate-100"
            >
              <span className="text-sm font-medium text-gray-700">{row.label}</span>
              {row.result ? (
                <span className={`text-xs font-bold ${row.result.passed ? 'text-emerald-600' : 'text-orange-500'}`}>
                  {tFormat(row.result.passed ? dict.progress.mock.passed : dict.progress.mock.failed, {
                    score: row.result.score,
                    total: row.result.total,
                  })}
                </span>
              ) : (
                <span className="text-xs font-semibold text-teal-600">{dict.progress.mock.notAttempted}</span>
              )}
            </Link>
          ))}
        </div>
        )}
      </Card>

      {/* 3. Where am I weak? */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
        <Card className="p-5">
          <h3 className="font-bold text-gray-800">{dict.progress.accuracy.byCategory}</h3>
          <p className="mt-1 text-xs text-gray-400">{dict.progress.accuracy.byTopic}</p>
          <div className="mt-6 space-y-4">
            {(Object.keys(N400_CATEGORY_LABELS) as N400CategoryKey[]).map((key) => {
              const a = categoryAccuracy[key];
              const percent = a.total === 0 ? 0 : Math.round((a.correct / a.total) * 100);
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-700">{N400_CATEGORY_LABELS[key][lang === 'en' ? 'en' : 'vi']}</span>
                    <span className="shrink-0 font-bold text-gray-800">
                      {percent}% <span className="text-xs font-normal text-gray-400">({a.correct}/{a.total})</span>
                    </span>
                  </div>
                  <ProgressBar progress={percent} colorClass={CATEGORY_COLORS[key]} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-gray-800">{dict.progress.debt.title}</h3>
          <p className="mt-1 text-xs text-gray-400">{dict.progress.debt.subtitle}</p>
          {debts.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              {dict.progress.debt.cleared}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {debts.map((d) => (
                // The whole row is the tap target — no separate "Luyện ngay"
                // button; the count + chevron already read as "go review".
                <Link
                  key={d.label}
                  href={d.href}
                  className="flex items-center gap-3 rounded-xl bg-orange-50 px-3 py-2 hover:bg-orange-100"
                >
                  <Image
                    src={`/images/n400/Progress/${d.thumbnail}`}
                    alt=""
                    width={48}
                    height={48}
                    className="size-8 shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 truncate text-sm font-medium text-gray-700">{d.label}</span>
                  <span className="ml-auto shrink-0 text-xs font-bold text-orange-600">{tFormat(dict.practice.wrongCountLabel, { count: d.count })}</span>
                  <ChevronRight size={14} className="shrink-0 text-orange-400" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 4. Am I making progress? */}
      <Card className="p-5">
        <h3 className="mb-6 font-bold text-gray-800">{dict.progress.activity.title}</h3>
        <div className="mb-2 flex pl-12 text-[10px] text-gray-400">
          {heatWeekdays(dict).map((d) => (
            <div key={d} className="flex-1 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {heat.grid.map((row, weekIdx) => (
            <div key={weekIdx} className="flex items-center gap-2">
              <div className="w-10 text-[10px] text-gray-400">{tFormat(dict.progress.activity.weekLabel, { n: weekIdx + 1 })}</div>
              <div className="grid flex-1 grid-cols-7 gap-1.5">
                {row.map((level, i) => (
                  <div key={i} className={`h-4 rounded-sm ${HEAT_COLORS[level]}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-gray-500">
          {dict.progress.heat.low}
          <div className="flex gap-1">
            <div className="h-3 w-3 bg-teal-50" />
            <div className="h-3 w-3 bg-teal-300" />
            <div className="h-3 w-3 bg-teal-700" />
          </div>
          {dict.progress.heat.high}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-gray-500">{dict.progress.activity.busiestDay}</span>
          <span className="font-semibold text-gray-800">{heat.busiestDay}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">{dict.progress.activity.totalDays}</span>
          <span className="font-semibold text-gray-800">{tFormat(dict.progress.activity.daysUnit, { count: heat.totalDays })}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">{dict.progress.activity.longestStreak}</span>
          <span className="font-semibold text-gray-800">{tFormat(dict.progress.activity.daysUnit, { count: state.streak.longest })}</span>
        </div>
      </Card>
    </div>
  );
}
