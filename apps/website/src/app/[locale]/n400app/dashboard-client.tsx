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
  Flame,
  Zap,
  Target,
  ShieldCheck,
  Calendar,
  Lightbulb,
  BarChart2,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { BadgeIcon } from '@/components/n400/BadgeIcon';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { pickNextBadge } from '@/lib/n400/badges/next-badge';
import { trackSignupComplete } from '@/lib/n400/analytics';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { sectionDailyFive, dailyFiveDoneCount } from '@/lib/n400/section-daily';
import { deriveSectionSeen } from '@/lib/n400/section-progress';

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



  if (!hydrated) {
    return <div className="text-sm font-medium text-slate-500 p-8">Đang tải…</div>;
  }

  // --- Derived Gamification Data ---
  const xpPerMastered = 10;
  const xpPerAttempt = 2;

  const getLocalDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayDate = new Date();
  const todayStrLocal = getLocalDateStr(todayDate);

  // Daily Goals for What Mean and Yes No sections
  const whatMeanIds = useMemo(() => WHATMEAN_QUESTIONS.map((q) => q.id), []);
  const yesNoIds = useMemo(() => YESNO_QUESTIONS.map((q) => q.id), []);

  const whatMeanKnown = useMemo(() => new Set(state.sectionKnown.whatmean), [state.sectionKnown.whatmean]);
  const yesNoKnown = useMemo(() => new Set(state.sectionKnown.yesno), [state.sectionKnown.yesno]);

  const sectionSeen = useMemo(() => deriveSectionSeen(state.sectionAttempts), [state.sectionAttempts]);

  const whatMeanDaily = useMemo(
    () => sectionDailyFive('whatmean', whatMeanIds, whatMeanKnown, sectionSeen.whatmean, todayStrLocal),
    [whatMeanIds, whatMeanKnown, sectionSeen.whatmean, todayStrLocal],
  );
  const whatMeanDoneCount = dailyFiveDoneCount(whatMeanDaily, whatMeanKnown);

  const yesNoDaily = useMemo(
    () => sectionDailyFive('yesno', yesNoIds, yesNoKnown, sectionSeen.yesno, todayStrLocal),
    [yesNoIds, yesNoKnown, sectionSeen.yesno, todayStrLocal],
  );
  const yesNoDoneCount = dailyFiveDoneCount(yesNoDaily, yesNoKnown);

  const todaysAttempts = state.attempts.filter(a => a.at.startsWith(todayStrLocal));
  const todaysXp = todaysAttempts.length * xpPerAttempt;
  
  const totalXp = (stats.mastered * xpPerMastered) + (stats.totalAttempts * xpPerAttempt);
  const xpPerLevel = 500;
  const currentLevel = Math.floor(totalXp / xpPerLevel) + 1;
  const xpProgress = totalXp % xpPerLevel;
  const xpProgressPercent = Math.round((xpProgress / xpPerLevel) * 100);

  // Next-badge suggestion: closest unearned badge by progress toward its
  // unlock threshold (see lib/n400/badges/next-badge.ts).
  const mockPassed = state.mockResults.filter((r) => r.passed).length;
  const nextBadge = pickNextBadge(badges.catalog, badges.earnedSlugs, {
    currentStreak: state.streak.current,
    distinctAnswered: stats.distinctAnswered,
    correctCount: stats.correctCount,
    flashcardsKnown: state.flashcardKnown.length,
    mockPassed,
    mockFailed: state.mockResults.length - mockPassed,
    bestMockScore: state.mockResults.reduce((m, r) => Math.max(m, r.score), 0),
  });

  // Daily Goals Data
  const GOAL_QUESTIONS = 20;
  const GOAL_FLASHCARDS = 15;
  const todayQuestions = todaysAttempts.filter(a => a.mode !== 'flashcard').length;
  const todayFlashcards = todaysAttempts.filter(a => a.mode === 'flashcard').length;
  const qProgress = Math.min(Math.round((todayQuestions / GOAL_QUESTIONS) * 100), 100);
  const fProgress = Math.min(Math.round((todayFlashcards / GOAL_FLASHCARDS) * 100), 100);

  // Streak Calendar Derivation
  const currentDayOfWeek = todayDate.getDay();
  const normalizedToday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const startOfWeek = new Date(todayDate);
  startOfWeek.setDate(todayDate.getDate() - normalizedToday);

  const weekDaysInfo = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = getLocalDateStr(d);
    
    let isActive = false;
    if (state.streak.current > 0 && state.streak.lastActivityDate) {
      const match = state.streak.lastActivityDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        const lastActiveMidnight = new Date(year, month - 1, day);
        const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diffDays = Math.round((lastActiveMidnight.getTime() - dMidnight.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays < state.streak.current) {
          isActive = true;
        }
      }
    }

    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    return {
      label: dayNames[i],
      isActive,
      isToday: dateStr === todayStrLocal
    };
  });

  return (
    <div className="animate-in fade-in duration-500 max-w-[1400px] mx-auto">
      


      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
        
        {/* ================================================== */}
        {/* LEFT COLUMN - MAIN CONTENT                        */}
        {/* ================================================== */}
        <div className="flex-1 space-y-6 min-w-0">
          
          {/* 1. HERO PROGRESS CARD */}
          <Card className="!p-0 overflow-hidden border-slate-200/60 shadow-sm">
            <div className="flex flex-col lg:flex-row">
              
              {/* Left Side: Progress */}
              <div className="flex-1 p-6 sm:p-8 lg:p-10">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Target className="text-teal-600" size={18} />
                  Tiến độ tổng quát
                </h3>
                
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-4">
                  <span className="text-6xl sm:text-7xl font-extrabold tracking-tight text-slate-900">
                    {stats.coverage}%
                  </span>
                  <div className="text-sm font-medium text-slate-500 flex flex-col gap-0.5 pb-2">
                    <span>{stats.distinctAnswered} / 128 câu hỏi đã làm</span>
                    <span className="text-teal-600 font-semibold">{stats.mastered} câu đã thuộc lòng</span>
                  </div>
                </div>
                
                <ProgressBar progress={stats.coverage} heightClass="h-3 sm:h-4" />

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/${locale}/n400app/practice`}
                    className="flex-1 sm:flex-none justify-center whitespace-nowrap min-w-[140px] px-6 py-3.5 rounded-2xl bg-teal-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <CheckCircle size={18} /> Tiếp tục luyện tập
                  </Link>
                  <Link
                    href={`/${locale}/n400app/mock-test`}
                    className="flex-1 sm:flex-none justify-center whitespace-nowrap min-w-[100px] px-5 py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold flex items-center gap-2 hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    <ClipboardCheck size={18} /> Thi thử
                  </Link>
                  <Link
                    href={`/${locale}/n400app/flashcards`}
                    className="flex-1 sm:flex-none justify-center whitespace-nowrap min-w-[100px] px-5 py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold flex items-center gap-2 hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    <Layers size={18} /> Flashcards
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

                {nextBadge && (
                  <div className="mt-auto pt-6 border-t border-slate-200/60">
                    <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Huy hiệu tiếp theo</div>
                    <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                      <BadgeIcon slug={nextBadge.badge.slug} alt="" size={32} earned={false} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-700">{nextBadge.badge.title_vi}</div>
                        {nextBadge.target != null && nextBadge.current != null && (
                          <div className="mt-1.5">
                            <ProgressBar progress={Math.round(nextBadge.ratio * 100)} heightClass="h-1.5" colorClass="bg-teal-500" />
                            <div className="mt-1 text-[11px] font-semibold text-slate-400">
                              {Math.min(nextBadge.current, nextBadge.target)} / {nextBadge.target}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>


          {/* 2. QUICK INSIGHT LINE → Learning Progress */}
          <Link
            href={`/${locale}/n400app/statistic`}
            className="group flex items-center gap-3 px-5 py-3 bg-slate-50/80 rounded-xl text-sm text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors duration-[var(--motion-fast)] border border-slate-100/80"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-teal-100 transition-colors">
              <BarChart2 size={16} className="text-slate-400 group-hover:text-teal-600 transition-colors" />
            </div>
            <span className="font-medium">
              {stats.accuracy}% chính xác · {stats.mastered} câu đã thuộc
              {state.mockResults.length > 0 && (
                <> · Thi thử: {state.mockResults[state.mockResults.length - 1].score}/{state.mockResults[state.mockResults.length - 1].total}{' '}
                  <span className={state.mockResults[state.mockResults.length - 1].passed ? 'text-teal-600 font-bold' : 'text-orange-500 font-bold'}>
                    {state.mockResults[state.mockResults.length - 1].passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                  </span>
                </>
              )}
            </span>
            <ArrowRight size={16} className="ml-auto text-slate-300 group-hover:text-teal-500 transition-colors" />
          </Link>


          {/* 3. RECOMMENDATION */}
          <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Lightbulb size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={24} className="text-indigo-600" fill="currentColor" />
                <span className="text-sm font-bold text-indigo-900 uppercase tracking-wider">Gợi ý hôm nay</span>
              </div>
              <p className="text-indigo-800 font-medium text-base leading-relaxed">
                Bạn thường sai các câu hỏi về <strong className="text-indigo-900">Hệ Thống Chính Phủ</strong>. Dành 5 phút ôn tập ngay để cải thiện điểm số nhé!
              </p>
              <Link href={`/${locale}/n400app/flashcards?filter=system`} className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-colors w-max shadow-md shadow-indigo-600/20">
                Bắt đầu ôn tập <ArrowRight size={18} />
              </Link>
            </div>
          </Card>

        </div>

        {/* ================================================== */}
        {/* RIGHT COLUMN - MOTIVATIONAL SIDEBAR               */}
        {/* ================================================== */}
        <div className="w-full xl:w-[360px] flex flex-col gap-6">
          
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
                    <span className="text-base font-bold text-slate-500">{todayFlashcards} <span className="text-sm">/ {GOAL_FLASHCARDS}</span></span>
                  </div>
                  <ProgressBar progress={fProgress} heightClass="h-3" colorClass="bg-purple-500" />
                </div>

                {/* Goal 3: What Mean */}
                <Link href={`/${locale}/n400app/speaking/what-mean`}>
                  <div className="group cursor-pointer">
                    <div className="flex justify-between items-end mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600 shadow-sm group-hover:bg-teal-200 transition-colors">
                          <Zap size={24} fill="currentColor" />
                        </div>
                        <span className="font-bold text-slate-700 text-base group-hover:text-teal-700 transition-colors">5 thẻ What Mean hôm nay</span>
                      </div>
                      <span className="text-base font-bold text-slate-500">{whatMeanDoneCount} <span className="text-sm">/ 5</span></span>
                    </div>
                    <ProgressBar progress={Math.min(Math.round((whatMeanDoneCount / 5) * 100), 100)} heightClass="h-3" colorClass="bg-teal-500" />
                  </div>
                </Link>

                {/* Goal 4: Yes No */}
                <Link href={`/${locale}/n400app/speaking/yes-no`}>
                  <div className="group cursor-pointer">
                    <div className="flex justify-between items-end mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-200 transition-colors">
                          <CheckCircle size={24} />
                        </div>
                        <span className="font-bold text-slate-700 text-base group-hover:text-blue-700 transition-colors">5 thẻ Yes No hôm nay</span>
                      </div>
                      <span className="text-base font-bold text-slate-500">{yesNoDoneCount} <span className="text-sm">/ 5</span></span>
                    </div>
                    <ProgressBar progress={Math.min(Math.round((yesNoDoneCount / 5) * 100), 100)} heightClass="h-3" colorClass="bg-blue-500" />
                  </div>
                </Link>
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
            <div className="flex justify-between items-center bg-slate-50 p-5 rounded-3xl mb-8 border border-slate-100 relative">
              {weekDaysInfo.map((info) => (
                <div key={info.label} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${info.isActive ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-110' : 'bg-slate-200 text-slate-400'} ${info.isToday && !info.isActive ? 'ring-2 ring-orange-200 ring-offset-2' : ''}`}>
                    <Flame size={info.isActive ? 20 : 18} fill="currentColor" className={info.isActive ? 'opacity-100' : 'opacity-50'} />
                  </div>
                  <span className={`text-[12px] font-bold ${info.isActive ? 'text-orange-600' : info.isToday ? 'text-orange-400' : 'text-slate-400'}`}>{info.label}</span>
                </div>
              ))}
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
