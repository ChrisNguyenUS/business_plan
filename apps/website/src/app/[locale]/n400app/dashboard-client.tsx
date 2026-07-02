'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  Layers,
  Star,
  Trophy,
  Flame,
  BookOpen,
  Zap,
  Target,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Lightbulb
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { BadgeIcon } from '@/components/n400/BadgeIcon';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackSignupComplete } from '@/lib/n400/analytics';
import { N400_QUESTIONS, N400_CATEGORY_LABELS, type N400CategoryKey } from '@/lib/n400/questions-data';
import { MOCK_TEST_PASS_THRESHOLD, MOCK_TEST_QUESTION_COUNT } from '@/lib/n400/quiz-engine';

export default function DashboardPage() {
  const { state, hydrated, stats } = useN400UserState();
  const badges = useN400Badges();
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = (params?.locale as string) || 'en';

  // n400_signup_complete fires once when the user lands on the dashboard
  useEffect(() => {
    if (search?.get('welcome') !== 'signup') return;
    if (!hydrated) return;
    trackSignupComplete(state.address.stateCode);
    router.replace(pathname);
  }, [search, hydrated, state.address.stateCode, router, pathname]);

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
    const icons = [
      <Target key="i1" size={20}/>, 
      <ShieldCheck key="i2" size={20}/>, 
      <CheckCircle key="i3" size={20}/>, 
      <BookOpen key="i4" size={20}/>, 
      <Star key="i5" size={20}/>
    ];
    return {
      name: N400_CATEGORY_LABELS[key].vi,
      value,
      color: colors[i % colors.length],
      icon: icons[i % icons.length],
    };
  });

  if (!hydrated) {
    return <div className="text-sm font-medium text-slate-500 p-8">Đang tải…</div>;
  }

  // --- Derived Gamification Data ---
  const xpPerMastered = 10;
  const xpPerAttempt = 2;
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysAttempts = state.attempts.filter(a => a.at.startsWith(todayStr));
  const todaysXp = todaysAttempts.length * xpPerAttempt;
  
  const totalXp = (stats.mastered * xpPerMastered) + (stats.totalAttempts * xpPerAttempt);
  const xpPerLevel = 500;
  const currentLevel = Math.floor(totalXp / xpPerLevel) + 1;
  const xpProgress = totalXp % xpPerLevel;
  const xpProgressPercent = Math.round((xpProgress / xpPerLevel) * 100);

  // Daily Goals Mock Data
  const GOAL_QUESTIONS = 20;
  const todayQuestions = todaysAttempts.length;
  const qProgress = Math.min(Math.round((todayQuestions / GOAL_QUESTIONS) * 100), 100);

  return (
    <div className="animate-in fade-in duration-500 max-w-[1400px] mx-auto">
      


      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* ================================================== */}
        {/* LEFT COLUMN - MAIN CONTENT                        */}
        {/* ================================================== */}
        <div className="flex-1 space-y-8 min-w-0">
          
          {/* 1. HERO PROGRESS CARD */}
          <Card className="!p-0 overflow-hidden border-slate-200/60 shadow-sm">
            <div className="flex flex-col lg:flex-row">
              
              {/* Left Side: Progress */}
              <div className="flex-1 p-8 sm:p-10">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Target className="text-teal-600" size={22} />
                  Tiến độ tổng quát
                </h3>
                
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-6">
                  <span className="text-6xl sm:text-7xl font-bold tracking-tight text-slate-900">
                    {stats.coverage}%
                  </span>
                  <div className="text-sm font-semibold text-slate-500 flex flex-col justify-end pb-2">
                    <span>{stats.distinctAnswered} / 128 câu hỏi đã làm</span>
                    <span className="text-teal-700">{stats.mastered} câu đã thuộc lòng</span>
                  </div>
                </div>
                
                <ProgressBar progress={stats.coverage} heightClass="h-3 sm:h-4" />

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href={`/${locale}/n400app/practice`}
                    className="flex-1 sm:flex-none justify-center px-8 py-4 rounded-[20px] bg-teal-600 text-white text-base font-bold flex items-center gap-2 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <CheckCircle size={20} /> Tiếp tục luyện tập
                  </Link>
                  <Link
                    href={`/${locale}/n400app/mock-test`}
                    className="flex-1 sm:flex-none justify-center px-6 py-4 rounded-[20px] bg-white border-2 border-slate-200 text-slate-700 text-base font-bold flex items-center gap-2 hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    <ClipboardCheck size={20} /> Thi thử
                  </Link>
                  <Link
                    href={`/${locale}/n400app/flashcards`}
                    className="flex-1 sm:flex-none justify-center px-6 py-4 rounded-[20px] bg-white border-2 border-slate-200 text-slate-700 text-base font-bold flex items-center gap-2 hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    <Layers size={20} /> Flashcards
                  </Link>
                </div>
              </div>

              {/* Right Side: Gamification Details */}
              <div className="w-full lg:w-[320px] bg-slate-50 p-8 sm:p-10 lg:border-l border-slate-100 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 shadow-sm">
                      <Zap size={24} fill="currentColor" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">XP hôm nay</div>
                      <div className="text-2xl font-bold text-orange-600">+{todaysXp} XP</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600 shadow-sm">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cấp độ hiện tại</div>
                      <div className="text-2xl font-bold text-teal-700">Level {currentLevel}</div>
                    </div>
                  </div>
                </div>
                
                <div className="w-full mb-8">
                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>Tiến độ Level</span>
                    <span>{xpProgress} / {xpPerLevel} XP</span>
                  </div>
                  <ProgressBar progress={xpProgressPercent} heightClass="h-2.5" colorClass="bg-teal-500" />
                </div>

                {badges.catalog.length > 0 && badges.catalog[0] && (
                  <div className="mt-auto pt-6 border-t border-slate-200/60">
                    <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Huy hiệu tiếp theo</div>
                    <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                      <BadgeIcon slug={badges.catalog[0].slug} alt="" size={32} earned={false} />
                      <div className="text-sm font-bold text-slate-700">{badges.catalog[0].title_vi}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>


          {/* 2. CATEGORY PROGRESS */}
          <Card>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="text-blue-500" size={24} />
                Tiến độ theo danh mục
              </h3>
              <Link href={`/${locale}/n400app/practice`} className="text-sm font-bold text-teal-600 flex items-center gap-1 hover:text-teal-700 transition-colors">
                Xem tất cả <ChevronRight size={18} />
              </Link>
            </div>
            
            <div className="flex flex-col gap-3">
              {skillData.map((skill) => (
                <div key={skill.name} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-[20px] transition-colors group cursor-default">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${skill.color} shadow-sm group-hover:scale-105 transition-transform`}>
                    {skill.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-2.5">
                      <span className="font-bold text-slate-700 text-base">{skill.name}</span>
                      <span className="font-bold text-slate-900 text-lg leading-none">{skill.value}%</span>
                    </div>
                    <ProgressBar progress={skill.value} heightClass="h-2.5" colorClass={skill.color} />
                  </div>
                  <ChevronRight size={24} className="text-slate-300 ml-2 group-hover:text-slate-400 transition-colors" />
                </div>
              ))}
            </div>
          </Card>


          {/* 3. STATISTICS GRID */}
          <Card>
            <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
              <Star className="text-yellow-500" size={24} />
              Thống kê tổng quan
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <Stat icon={<BookOpen size={32} className="text-teal-600" />} value={stats.totalAttempts.toLocaleString()} label="Lượt trả lời" />
              <Stat icon={<CheckCircle size={32} className="text-teal-600" />} value={`${stats.accuracy}%`} label="Độ chính xác" />
              <Stat icon={<Trophy size={32} className="text-amber-500" fill="currentColor" />} value={state.mockResults.filter((m) => m.passed).length.toString()} label="Lần đạt thi thử" />
              <Stat icon={<Star size={32} className="text-amber-400" fill="currentColor" />} value={state.bookmarks.length.toString()} label="Câu đã đánh dấu" />
            </div>
          </Card>


          {/* 4. RECENT MOCK TEST & RECOMMENDATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {lastMock && (
              <Card className={`relative overflow-hidden ${lastMock.passed ? 'border-teal-200 bg-teal-50' : 'border-orange-200 bg-orange-50'}`}>
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md ${lastMock.passed ? 'bg-teal-600 shadow-teal-600/20' : 'bg-orange-500 shadow-orange-500/20'}`}>
                    <Trophy size={32} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-500 mb-1">Lần thi thử gần nhất</div>
                    <div className="text-4xl font-bold text-slate-900 leading-none">
                      {lastMock.score} <span className="text-2xl text-slate-500 font-medium">/ {lastMock.total}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-200/60">
                  <span className={`px-4 py-2 rounded-xl text-sm font-bold tracking-wide ${lastMock.passed ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-800'}`}>
                    {lastMock.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                  </span>
                  <Link href={`/${locale}/n400app/mock-test`} className="text-sm text-teal-700 font-bold flex items-center gap-1.5 hover:gap-2.5 transition-all">
                    Thi lại <ArrowRight size={18} />
                  </Link>
                </div>
              </Card>
            )}

            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 relative overflow-hidden flex flex-col h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Lightbulb size={120} />
              </div>
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb size={24} className="text-indigo-600" fill="currentColor" />
                  <span className="text-sm font-bold text-indigo-900 uppercase tracking-wider">Gợi ý hôm nay</span>
                </div>
                <p className="text-indigo-800 font-medium text-base leading-relaxed flex-1">
                  Bạn thường sai các câu hỏi về <strong className="text-indigo-900">Hệ Thống Chính Phủ</strong>. Dành 5 phút ôn tập ngay để cải thiện điểm số nhé!
                </p>
                <Link href={`/${locale}/n400app/practice`} className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-colors w-max shadow-md shadow-indigo-600/20">
                  Bắt đầu ôn tập <ArrowRight size={18} />
                </Link>
              </div>
            </Card>
          </div>

        </div>

        {/* ================================================== */}
        {/* RIGHT COLUMN - MOTIVATIONAL SIDEBAR               */}
        {/* ================================================== */}
        <div className="w-full xl:w-[380px] flex flex-col gap-8">
          
          {/* Daily Goals Card with Liberty */}
          <Card className="!p-0 border-teal-100 bg-white shadow-md overflow-hidden flex flex-col">
            {/* Supporting Illustration Area (Clipped inside the card) */}
            <div className="relative h-[240px] bg-gradient-to-b from-teal-50 to-white flex items-end justify-center px-4 pt-6">
              <div className="relative w-[220px] h-full pointer-events-none">
                <Image
                  src="/images/n400/illu-flag-holding-transparent.png"
                  alt="Statue of Liberty"
                  fill
                  className="object-contain object-bottom drop-shadow-xl"
                  sizes="220px"
                  priority
                />
              </div>
            </div>
            
            {/* Card Content */}
            <div className="p-8 sm:p-10 pt-4 relative z-10 bg-white">
              <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
                <Target className="text-teal-600" size={24} />
                Mục tiêu hôm nay
              </h3>
              
              <div className="space-y-8">
                {/* Goal 1 */}
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                        <Zap size={24} fill="currentColor" />
                      </div>
                      <span className="font-bold text-slate-700 text-base">Trả lời {GOAL_QUESTIONS} câu hỏi</span>
                    </div>
                    <span className="text-base font-bold text-slate-500">{todayQuestions} <span className="text-sm">/ {GOAL_QUESTIONS}</span></span>
                  </div>
                  <ProgressBar progress={qProgress} heightClass="h-3" colorClass="bg-orange-500" />
                </div>
                
                {/* Goal 2 */}
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                        <Layers size={24} fill="currentColor" />
                      </div>
                      <span className="font-bold text-slate-700 text-base">Ôn tập Flashcards</span>
                    </div>
                    <span className="text-base font-bold text-slate-500">0 <span className="text-sm">/ 15</span></span>
                  </div>
                  <ProgressBar progress={0} heightClass="h-3" colorClass="bg-purple-500" />
                </div>
              </div>

              <button className="w-full mt-10 py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-base hover:bg-slate-200 transition-colors">
                Xem tất cả nhiệm vụ
              </button>
            </div>
          </Card>


          {/* Streak Card */}
          <Card>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Flame className="text-orange-500" size={24} fill="currentColor" />
                Chuỗi học tập
              </h3>
              <div className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-xl text-sm font-bold flex items-center gap-1.5">
                <Flame size={16} fill="currentColor" />
                {state.streak.current} ngày
              </div>
            </div>

            {/* Mini Calendar/Progress Row */}
            <div className="flex justify-between items-center bg-slate-50 p-5 rounded-3xl mb-8 border border-slate-100">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const isActive = day <= (state.streak.current % 7 || 7) && state.streak.current > 0;
                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-110' : 'bg-slate-200 text-slate-400'}`}>
                      <Flame size={isActive ? 20 : 18} fill="currentColor" className={isActive ? 'opacity-100' : 'opacity-50'} />
                    </div>
                    <span className={`text-[12px] font-bold ${isActive ? 'text-orange-600' : 'text-slate-400'}`}>T{day+1 > 7 ? 'CN' : day+1}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
                <Calendar size={28} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-500 mb-0.5">Kỷ lục dài nhất</div>
                <div className="text-2xl font-bold text-slate-900">{state.streak.longest} ngày</div>
              </div>
            </div>
          </Card>

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
    <div className="flex flex-col items-start gap-4 p-2">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-4xl font-bold tracking-tight text-slate-900">{value}</div>
        <div className="mt-1 text-sm font-bold text-slate-500">{label}</div>
      </div>
    </div>
  );
}
