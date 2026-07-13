'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Compass,
  Flame,
  Medal,
  Target,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { ProgressTabs } from '@/components/n400/progress/ProgressTabs';
import { useN400UserState } from '@/lib/n400/user-state';
import {
  N400_CATEGORY_LABELS,
  N400_QUESTIONS,
  type N400CategoryKey,
} from '@/lib/n400/questions-data';

const HEAT_COLORS = ['bg-teal-50', 'bg-teal-100', 'bg-teal-300', 'bg-teal-500', 'bg-teal-700'];

function buildHeatGrid(attempts: { at: string }[]): { grid: number[][]; busiestDay: string; totalDays: number } {
  // Last 5 weeks (35 days), grouped by week-of-month index x weekday (Mon-Sun).
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = new Map<string, number>();
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun

  for (const a of attempts) {
    const d = new Date(a.at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    const dow = (d.getDay() + 6) % 7; // Mon=0
    weekdayCount[dow] += 1;
  }

  const grid: number[][] = [];
  for (let w = 4; w >= 0; w--) {
    const row: number[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7 + (6 - d)));
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const count = buckets.get(key) ?? 0;
      let level = 0;
      if (count > 0 && count <= 3) level = 1;
      else if (count <= 8) level = 2;
      else if (count <= 15) level = 3;
      else if (count > 15) level = 4;
      row.push(level);
    }
    grid.push(row);
  }

  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  let maxIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (weekdayCount[i] > weekdayCount[maxIdx]) maxIdx = i;
  }
  const busiestDay = weekdayCount[maxIdx] === 0 ? '—' : days[maxIdx];
  const totalDays = buckets.size;

  return { grid, busiestDay, totalDays };
}

export default function StatisticPage() {
  const { state, hydrated, stats } = useN400UserState();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const heat = useMemo(() => buildHeatGrid(state.attempts), [state.attempts]);

  const categoryRows = useMemo(() => {
    const lastSeen = new Map<number, boolean>();
    for (const a of state.attempts) lastSeen.set(a.questionId, a.wasCorrect);
    return (Object.keys(N400_CATEGORY_LABELS) as N400CategoryKey[]).map((key) => {
      const total = N400_QUESTIONS.filter((q) => q.category === key).length;
      const mastered = N400_QUESTIONS.filter(
        (q) => q.category === key && lastSeen.get(q.id) === true
      ).length;
      const pct = total === 0 ? 0 : Math.round((mastered / total) * 100);
      return { key, label: N400_CATEGORY_LABELS[key].vi, total, mastered, pct };
    });
  }, [state.attempts]);

  const categoryAccuracy = useMemo(() => {
    const acc: Record<N400CategoryKey, { correct: number; total: number; color: string }> = {
      principles: { correct: 0, total: 0, color: 'bg-teal-600' },
      system: { correct: 0, total: 0, color: 'bg-orange-500' },
      rights: { correct: 0, total: 0, color: 'bg-yellow-500' },
      history: { correct: 0, total: 0, color: 'bg-purple-600' },
      symbols: { correct: 0, total: 0, color: 'bg-blue-600' },
    };
    const qById = new Map(N400_QUESTIONS.map((q) => [q.id, q.category]));
    for (const a of state.attempts) {
      const cat = qById.get(a.questionId);
      if (!cat) continue;
      acc[cat].total += 1;
      if (a.wasCorrect) acc[cat].correct += 1;
    }
    return acc;
  }, [state.attempts]);

  const totalAnswered = stats.totalAttempts;

  // Mock results timeline data — last 10
  const mockTrend = state.mockResults.slice(-10);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  if (totalAnswered === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 max-w-[1400px] mx-auto">
        <ProgressTabs />
        <Card className="mx-auto max-w-xl p-6 text-center sm:p-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Chưa có dữ liệu thống kê</h3>
          <p className="text-sm text-gray-500 mb-6">
            Bắt đầu Luyện tập hoặc Thi thử để xem tiến độ và độ chính xác theo từng danh mục.
          </p>
          <Link
            href={`/${locale}/n400app/study/civics`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 shadow-md"
          >
            Bắt đầu luyện tập <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  const KPIS = [
    {
      title: 'Độ chính xác',
      subtitle: 'Accuracy',
      val: `${stats.accuracy}%`,
      inc: `${stats.correctCount} câu đúng`,
      icon: Target,
      bg: 'bg-teal-50',
      text: 'text-teal-600',
    },
    {
      title: 'Trả lời đúng',
      subtitle: 'Correct answers',
      val: stats.correctCount.toLocaleString(),
      inc: `${stats.totalAttempts.toLocaleString()} lượt trả lời`,
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      title: 'Phủ chương trình',
      subtitle: 'Coverage',
      val: `${stats.coverage}%`,
      inc: `${stats.distinctAnswered} / 128 câu`,
      icon: Compass,
      bg: 'bg-orange-50',
      text: 'text-orange-500',
    },
    {
      title: 'Chuỗi hiện tại',
      subtitle: 'Current streak',
      val: state.streak.current.toString(),
      unit: 'ngày',
      inc: `Cao nhất: ${state.streak.longest} ngày`,
      icon: Flame,
      bg: 'bg-orange-50',
      text: 'text-orange-500',
    },
    {
      title: 'Thi thử đạt',
      subtitle: 'Passed mocks',
      val: state.mockResults.filter((m) => m.passed).length.toString(),
      inc: `${state.mockResults.length} lần thi`,
      icon: Medal,
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-[1400px] mx-auto">
      <ProgressTabs />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="relative flex min-w-0 items-center justify-between gap-4 p-6 xl:min-h-[148px] xl:flex-col xl:items-start overflow-hidden">
              <div className="min-w-0 relative z-10">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{kpi.title}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{kpi.subtitle}</div>
                <div className="mt-3 text-4xl font-extrabold leading-none tracking-tight text-gray-900">
                  {kpi.val}
                  {kpi.unit ? <span className="ml-1.5 text-base font-semibold text-gray-500">{kpi.unit}</span> : null}
                </div>
                <div className="mt-2 text-xs font-medium text-gray-400">{kpi.inc}</div>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kpi.bg} xl:absolute xl:top-5 xl:right-5`}>
                <Icon size={22} className={kpi.text} />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <Card className="w-full p-5 xl:w-3/5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-800">Kết quả thi thử gần đây</h3>
              <p className="mt-1 text-xs text-gray-400">Mock test trend</p>
            </div>
            <button
              type="button"
              className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600"
            >
              {mockTrend.length} lần <ChevronDown size={14} />
            </button>
          </div>
          {mockTrend.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-sm text-gray-500">
              <div>Chưa có lần thi thử nào.</div>
              <Link
                href={`/${locale}/n400app/mock-test`}
                className="mt-3 text-teal-600 font-semibold flex items-center gap-1"
              >
                Bắt đầu thi thử <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="relative h-56 pl-8 pr-2 sm:h-64">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 flex h-full flex-col justify-between py-2 text-[10px] text-gray-400">
                <span>20</span>
                <span>15</span>
                <span>12</span>
                <span>5</span>
                <span>0</span>
              </div>
              {/* Horizontal grid lines */}
              {[20, 15, 12, 5, 0].map((v) => (
                <div
                  key={v}
                  className="absolute left-8 right-2 border-t border-gray-100 pointer-events-none"
                  style={{ bottom: `${(v / 20) * 100}%` }}
                />
              ))}
              {/* Pass threshold line */}
              <div
                className="absolute left-8 right-2 border-t-2 border-dashed border-teal-300 pointer-events-none z-10"
                style={{ bottom: `${(12 / 20) * 100}%` }}
              >
                <span className="absolute -top-4 right-0 text-[10px] text-teal-600 bg-teal-50 px-1 rounded">
                  Đạt: 12
                </span>
              </div>
              {/* Bar columns */}
              <div className="absolute left-8 right-2 top-0 bottom-0 flex items-end gap-3">
                {mockTrend.map((m, i) => {
                  const barH = (m.score / 20) * 100;
                  return (
                    <div
                      key={m.id}
                      className="relative flex-1 min-w-0 h-full"
                      title={`${m.score}/${m.total} • ${new Date(m.completedAt).toLocaleDateString('vi-VN')}`}
                    >
                      {/* Score label */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold text-gray-700"
                        style={{ bottom: `calc(${barH}% + 4px)` }}
                      >
                        {m.score}
                      </div>
                      {/* Bar */}
                      <div
                        className={`absolute bottom-0 left-1 right-1 rounded-t-lg transition-all duration-500 ${m.passed ? 'bg-teal-500' : 'bg-orange-400'}`}
                        style={{ height: `${barH}%`, minHeight: 4 }}
                      />
                      {/* Attempt label */}
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap">
                        #{i + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card className="w-full p-5 xl:w-2/5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-800">Độ chính xác theo danh mục</h3>
              <p className="mt-1 text-xs text-gray-400">Accuracy by topic</p>
            </div>
          </div>
          <div className="space-y-4">
            {(Object.keys(N400_CATEGORY_LABELS) as N400CategoryKey[]).map((key) => {
              const a = categoryAccuracy[key];
              const pct = a.total === 0 ? 0 : Math.round((a.correct / a.total) * 100);
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-700">
                      {N400_CATEGORY_LABELS[key].vi}
                    </span>
                    <span className="shrink-0 font-bold text-gray-800">
                      {pct}% <span className="text-xs font-normal text-gray-400">({a.correct}/{a.total})</span>
                    </span>
                  </div>
                  <ProgressBar progress={pct} colorClass={a.color} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-bold text-gray-800 mb-6">Tiến độ theo danh mục</h3>
          <div className="space-y-3">
            {categoryRows.map((row) => (
              <div key={row.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{row.label}</span>
                  <span className="text-gray-500 text-xs">
                    {row.mastered}/{row.total}
                  </span>
                </div>
                <ProgressBar progress={row.pct} heightClass="h-1.5" colorClass="bg-teal-600" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-6 font-bold text-gray-800">Hoạt động học tập</h3>
          <div className="flex mb-2 text-[10px] text-gray-400 pl-12">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
              <div key={d} className="flex-1 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {heat.grid.map((row, weekIdx) => (
              <div key={weekIdx} className="flex items-center gap-2">
                <div className="w-10 text-[10px] text-gray-400">Tuần {weekIdx + 1}</div>
                <div className="grid grid-cols-7 gap-1.5 flex-1">
                  {row.map((level, i) => (
                    <div key={i} className={`h-4 rounded-sm ${HEAT_COLORS[level]}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end items-center gap-2 mt-4 text-[10px] text-gray-500">
            Ít
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-teal-50" />
              <div className="w-3 h-3 bg-teal-300" />
              <div className="w-3 h-3 bg-teal-700" />
            </div>
            Nhiều
          </div>
          <div className="flex justify-between items-center mt-4 text-xs">
            <span className="text-gray-500">Ngày học nhiều nhất:</span>
            <span className="font-semibold text-gray-800">{heat.busiestDay}</span>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs">
            <span className="text-gray-500">Tổng ngày đã học:</span>
            <span className="font-semibold text-gray-800">{heat.totalDays} ngày</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
