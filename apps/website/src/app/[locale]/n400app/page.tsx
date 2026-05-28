'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  Layers,
  Star,
  Trophy,
  Flame,
  BookOpen,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { BadgeIcon } from '@/components/n400/BadgeIcon';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { N400_QUESTIONS, N400_CATEGORY_LABELS, type N400CategoryKey } from '@/lib/n400/questions-data';
import { MOCK_TEST_PASS_THRESHOLD, MOCK_TEST_QUESTION_COUNT } from '@/lib/n400/quiz-engine';

export default function DashboardPage() {
  const { state, hydrated, stats } = useN400UserState();
  const badges = useN400Badges();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const lastMock = state.mockResults[state.mockResults.length - 1];

  const categoryProgress = useMemo(() => {
    const result: Record<N400CategoryKey, { total: number; mastered: number }> = {
      principles: { total: 0, mastered: 0 },
      system: { total: 0, mastered: 0 },
      rights: { total: 0, mastered: 0 },
      history: { total: 0, mastered: 0 },
      symbols: { total: 0, mastered: 0 },
    };
    const lastSeen = new Map<number, boolean>();
    for (const a of state.attempts) lastSeen.set(a.questionId, a.wasCorrect);
    for (const q of N400_QUESTIONS) {
      result[q.category].total += 1;
      if (lastSeen.get(q.id) === true) result[q.category].mastered += 1;
    }
    return result;
  }, [state.attempts]);

  const skillData = (Object.keys(N400_CATEGORY_LABELS) as N400CategoryKey[]).map((key, i) => {
    const cs = categoryProgress[key];
    const value = cs.total === 0 ? 0 : Math.round((cs.mastered / cs.total) * 100);
    const colors = ['bg-teal-600', 'bg-orange-500', 'bg-yellow-500', 'bg-purple-600', 'bg-blue-600'];
    return {
      name: N400_CATEGORY_LABELS[key].vi,
      value,
      color: colors[i % colors.length],
    };
  });

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex gap-6">
        <div className="w-2/3 space-y-6">
          <Card className="p-6">
            <h3 className="mb-3 text-sm font-medium text-slate-500">Tiến độ tổng quát</h3>
            <div className="mb-4 flex items-baseline gap-3">
              <span className="text-5xl font-semibold tracking-tight text-slate-900">
                {stats.coverage}%
              </span>
              <span className="text-sm text-slate-500">
                {stats.distinctAnswered} / 128 câu hỏi đã làm • {stats.mastered} đã thuộc
              </span>
            </div>
            <ProgressBar progress={stats.coverage} heightClass="h-2.5" />
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/n400app/practice`}
                className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-teal-700 shadow-md"
              >
                <CheckCircle size={16} /> Luyện tập
              </Link>
              <Link
                href={`/${locale}/n400app/mock-test`}
                className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold flex items-center gap-2 hover:bg-orange-600 shadow-md"
              >
                <ClipboardCheck size={16} /> Thi thử
              </Link>
              <Link
                href={`/${locale}/n400app/flashcards`}
                className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50"
              >
                <Layers size={16} /> Flashcards
              </Link>
            </div>
          </Card>

          <div className="flex gap-6">
            <Card className="relative w-1/3 min-h-[200px] overflow-hidden p-6">
              <div className="relative z-10 flex h-full flex-col">
                <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <Flame className="text-orange-500" size={16} /> Chuỗi học tập
                </h3>
                <div className="mt-3 text-3xl font-semibold text-slate-900">
                  {state.streak.current} ngày
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Cao nhất: {state.streak.longest} ngày
                </p>
                {badges.hydrated ? (
                  <Link
                    href={`/${locale}/n400app/profile#badges`}
                    className="mt-3 flex items-center gap-2 text-xs text-slate-500 hover:text-teal-700 transition-colors"
                  >
                    <span className="font-semibold text-slate-700">
                      {badges.earned.length}
                      <span className="font-normal text-slate-400"> / {badges.catalog.length}</span>
                    </span>
                    <span>huy hiệu</span>
                    <div className="flex -space-x-1.5 ml-1">
                      {badges.earned.slice(0, 3).map((b) => (
                        <BadgeIcon
                          key={b.slug}
                          slug={b.slug}
                          alt=""
                          size={20}
                          earned
                          className="ring-2 ring-white rounded-full"
                        />
                      ))}
                    </div>
                  </Link>
                ) : null}
              </div>
              <div className="pointer-events-none absolute -bottom-2 right-0 z-0 h-[170px] w-[120px] opacity-80">
                <Image
                  src="/images/n400/illu-flag-holding-transparent.png"
                  alt=""
                  fill
                  className="object-contain object-right-bottom"
                  sizes="120px"
                />
              </div>
            </Card>

            <Card className="w-2/3 p-6">
              <h3 className="mb-6 text-sm font-medium text-slate-500">Tiến độ theo danh mục</h3>
              <div className="flex h-32 items-end justify-around">
                {skillData.map((skill) => (
                  <div key={skill.name} className="flex flex-col items-center gap-3">
                    <div className="relative flex h-24 w-7 items-end overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`w-full rounded-full ${skill.color}`}
                        style={{ height: `${Math.max(skill.value, 2)}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-slate-700">{skill.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{skill.value}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-4 gap-6">
              <Stat icon={<BookOpen size={36} className="text-teal-600" strokeWidth={1.5} />}
                value={stats.totalAttempts.toLocaleString()}
                label="Lượt trả lời"
              />
              <Stat
                icon={<CheckCircle size={36} className="text-teal-600" />}
                value={`${stats.accuracy}%`}
                label="Độ chính xác"
              />
              <Stat
                icon={<Trophy size={36} className="text-amber-500" fill="currentColor" strokeWidth={1.5} />}
                value={state.mockResults.filter((m) => m.passed).length.toString()}
                label="Lần đạt thi thử"
              />
              <Stat
                icon={<Star size={36} className="text-amber-400" fill="currentColor" strokeWidth={1.5} />}
                value={state.bookmarks.length.toString()}
                label="Câu đã đánh dấu"
              />
            </div>
          </Card>

          {lastMock ? (
            <Card className={`p-6 ${lastMock.passed ? 'bg-teal-50' : 'bg-orange-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${
                      lastMock.passed ? 'bg-teal-600' : 'bg-orange-500'
                    }`}
                  >
                    <ClipboardCheck size={22} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Lần thi thử gần nhất</div>
                    <div className="text-lg font-bold text-gray-900">
                      {lastMock.score} / {lastMock.total} câu đúng
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({lastMock.passed ? 'Đạt' : 'Chưa đạt'} • cần ≥{MOCK_TEST_PASS_THRESHOLD}/{MOCK_TEST_QUESTION_COUNT})
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/${locale}/n400app/mock-test`}
                  className="text-sm text-teal-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Thi lại <ArrowRight size={14} />
                </Link>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="w-1/3">
          <div className="relative h-full min-h-[600px]">
            <Image
              src="/images/n400/illu-flag-holding-transparent.png"
              alt="Statue of Liberty with American flag and city skyline"
              fill
              className="object-contain object-bottom"
              sizes="560px"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xl font-semibold leading-tight text-slate-900">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
