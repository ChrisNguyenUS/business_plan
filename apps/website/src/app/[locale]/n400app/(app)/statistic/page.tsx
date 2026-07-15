'use client';

// Tiến độ — tab 2 of 2, "Chi tiết". The Tổng quan tab answers the three
// questions at a glance; this tab explains them. Nothing here is repeated
// there: the KPI row and the duplicate category block were removed because
// the readiness checklist and the skills card already carry those numbers.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { ProgressTabs } from '@/components/n400/progress/ProgressTabs';
import { useN400UserState } from '@/lib/n400/user-state';
import { deriveReadiness } from '@/lib/n400/readiness';
import { buildHeatGrid, HEAT_COLORS, HEAT_WEEKDAYS } from '@/lib/n400/activity-heatmap';
import { lastWrongQuestionIds } from '@/lib/n400/quiz-engine';
import { lastWrongSectionItemIds } from '@/lib/n400/section-progress';
import {
  N400_CATEGORY_LABELS,
  N400_QUESTIONS,
  type N400CategoryKey,
} from '@/lib/n400/questions-data';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';

const CATEGORY_COLORS: Record<N400CategoryKey, string> = {
  principles: 'bg-teal-600',
  system: 'bg-orange-500',
  rights: 'bg-yellow-500',
  history: 'bg-purple-600',
  symbols: 'bg-blue-600',
};

const MOCK_MAX_SCORE = 20;
const MOCK_PASS_SCORE = 12;

export default function StatisticPage() {
  const { state, hydrated, stats } = useN400UserState();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  // Every skill lands on the calendar, not just civics.
  const heat = useMemo(
    () =>
      buildHeatGrid(
        [
          ...state.attempts.map((a) => ({ at: a.at })),
          ...state.sectionAttempts.map((a) => ({ at: a.at })),
        ],
        new Date(),
      ),
    [state.attempts, state.sectionAttempts],
  );

  const readiness = useMemo(
    () =>
      deriveReadiness({
        civicsKnown: stats.mastered,
        civicsTotal: N400_QUESTIONS.length,
        whatmeanKnown: state.sectionKnown.whatmean.length,
        whatmeanTotal: WHATMEAN_QUESTIONS.length,
        yesnoKnown: state.sectionKnown.yesno.length,
        yesnoTotal: YESNO_QUESTIONS.length,
        mockResults: state.mockResults,
        sectionMockResults: state.sectionMockResults,
      }),
    [stats.mastered, state.sectionKnown, state.mockResults, state.sectionMockResults],
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
        { label: 'Civics', count: lastWrongQuestionIds(state.attempts).length, href: `${base}/practice?start=wrongs` },
        { label: 'What Mean', count: lastWrongSectionItemIds(state.sectionAttempts, 'whatmean').length, href: `${base}/speaking/what-mean?start=wrongs` },
        { label: 'Yes/No', count: lastWrongSectionItemIds(state.sectionAttempts, 'yesno').length, href: `${base}/speaking/yes-no?start=wrongs` },
        { label: 'Viết', count: lastWrongSectionItemIds(state.sectionAttempts, 'writing').length, href: `${base}/writing?start=wrongs` },
      ].filter((d) => d.count > 0),
    [state.attempts, state.sectionAttempts, base],
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
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  // A learner who has only touched Writing still has data — gate on every skill.
  const hasAnyActivity = state.attempts.length > 0 || state.sectionAttempts.length > 0;

  if (!hasAnyActivity) {
    return (
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4 animate-in fade-in duration-300">
        <ProgressTabs />
        <Card className="mx-auto max-w-xl p-6 text-center sm:p-12">
          <h3 className="mb-2 text-2xl font-bold text-gray-800">Chưa có dữ liệu thống kê</h3>
          <p className="mb-6 text-sm text-gray-500">
            Bắt đầu học hoặc thi thử để xem tiến độ chi tiết theo từng kỹ năng.
          </p>
          <Link
            href={`${base}/study`}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-teal-700"
          >
            Bắt đầu học ngay <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4 animate-in fade-in duration-300 sm:gap-6">
      <ProgressTabs />

      {/* 1. The full readiness checklist — the hero on /progress shows only the next item. */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800">Điều kiện sẵn sàng phỏng vấn</h3>
        <p className="mt-1 text-xs text-gray-400">
          Đạt {readiness.metCount}/{readiness.totalCount} điều kiện
        </p>
        <ul className="mt-4 space-y-2.5">
          {readiness.criteria.map((c) => (
            // The label gets a whole row to itself rather than competing with
            // the detail and the CTA — at 390px a three-way flex row shredded
            // "Thuộc 80% câu What Mean" across four lines.
            <li key={c.id} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  c.met ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {c.met ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                <span className={`min-w-0 flex-1 text-sm ${c.met ? 'text-gray-500 line-through' : 'font-medium text-gray-800'}`}>
                  {c.label}
                </span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs tabular-nums text-gray-400">{c.detail}</span>
                  {c.met ? null : (
                    <Link href={`${base}${c.cta.href}`} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                      {c.cta.label} →
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* 2. Mock tests — all three kinds in one place. */}
      <Card className="p-5">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-800">Kết quả thi thử</h3>
            <p className="mt-1 text-xs text-gray-400">Civics · Viết · Speaking</p>
          </div>
        </div>

        {mockTrend.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-sm text-gray-500">
            <div>Chưa có lần thi thử Civics nào.</div>
            <Link href={`${base}/mock-test`} className="mt-3 flex items-center gap-1 font-semibold text-teal-600">
              Bắt đầu thi thử <ArrowRight size={14} />
            </Link>
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
                Đạt: {MOCK_PASS_SCORE}
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

        <div className="mt-8 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          {[
            { label: '✍️ Thi thử Viết', result: lastWritingMock, href: `${base}/mock-test/viet` },
            { label: '🎤 Thi thử Speaking', result: lastSpeakingMock, href: `${base}/mock-test/speaking` },
          ].map((row) => (
            <Link
              key={row.label}
              href={row.href}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 hover:bg-slate-100"
            >
              <span className="text-sm font-medium text-gray-700">{row.label}</span>
              {row.result ? (
                <span className={`text-xs font-bold ${row.result.passed ? 'text-emerald-600' : 'text-orange-500'}`}>
                  {row.result.passed ? 'Đạt' : 'Chưa đạt'} · {row.result.score}/{row.result.total}
                </span>
              ) : (
                <span className="text-xs font-semibold text-teal-600">Chưa thi →</span>
              )}
            </Link>
          ))}
        </div>
      </Card>

      {/* 3. Where am I weak? */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
        <Card className="p-5">
          <h3 className="font-bold text-gray-800">Độ chính xác theo danh mục</h3>
          <p className="mt-1 text-xs text-gray-400">Civics · accuracy by topic</p>
          <div className="mt-6 space-y-4">
            {(Object.keys(N400_CATEGORY_LABELS) as N400CategoryKey[]).map((key) => {
              const a = categoryAccuracy[key];
              const percent = a.total === 0 ? 0 : Math.round((a.correct / a.total) * 100);
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-700">{N400_CATEGORY_LABELS[key].vi}</span>
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
          <h3 className="font-bold text-gray-800">Câu sai chưa ôn</h3>
          <p className="mt-1 text-xs text-gray-400">Ôn lại để xoá lỗi cũ</p>
          {debts.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              Bạn không còn câu sai nào chưa ôn. Giữ phong độ nhé! 🎉
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {debts.map((d) => (
                <Link
                  key={d.label}
                  href={d.href}
                  className="flex items-center justify-between gap-3 rounded-xl bg-orange-50 px-4 py-3 hover:bg-orange-100"
                >
                  <span className="text-sm font-medium text-gray-700">{d.label}</span>
                  <span className="shrink-0 text-xs font-bold text-orange-600">{d.count} câu →</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 4. Am I making progress? */}
      <Card className="p-5">
        <h3 className="mb-6 font-bold text-gray-800">Hoạt động học tập</h3>
        <div className="mb-2 flex pl-12 text-[10px] text-gray-400">
          {HEAT_WEEKDAYS.map((d) => (
            <div key={d} className="flex-1 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {heat.grid.map((row, weekIdx) => (
            <div key={weekIdx} className="flex items-center gap-2">
              <div className="w-10 text-[10px] text-gray-400">Tuần {weekIdx + 1}</div>
              <div className="grid flex-1 grid-cols-7 gap-1.5">
                {row.map((level, i) => (
                  <div key={i} className={`h-4 rounded-sm ${HEAT_COLORS[level]}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-gray-500">
          Ít
          <div className="flex gap-1">
            <div className="h-3 w-3 bg-teal-50" />
            <div className="h-3 w-3 bg-teal-300" />
            <div className="h-3 w-3 bg-teal-700" />
          </div>
          Nhiều
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-gray-500">Ngày học nhiều nhất:</span>
          <span className="font-semibold text-gray-800">{heat.busiestDay}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">Tổng ngày đã học:</span>
          <span className="font-semibold text-gray-800">{heat.totalDays} ngày</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">Chuỗi dài nhất:</span>
          <span className="font-semibold text-gray-800">{state.streak.longest} ngày</span>
        </div>
      </Card>
    </div>
  );
}
