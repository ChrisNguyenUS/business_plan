'use client';

// Dashboard — single-column layout per the dashboard redesign mock:
//   1. Hero: Civics continue card (ring + next question + thumbnail) with a
//      weak-topic hint strip.
//   2. Mục tiêu hôm nay: 4 daily-goal tiles (Civics / Yes-No / What Mean /
//      Writing), each deep-linking into its practice screen.
//   3. Quick-nav cards mirroring the sidebar's 4 top-level areas.
//   4. Stats strip: streak · accuracy · mastered · badges.

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Award,
  BarChart2,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Flame,
  GraduationCap,
  Home,
  Lightbulb,
  Star,
  Target,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { ProgressRing } from '@/components/n400/hub/HubCards';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackSignupComplete } from '@/lib/n400/analytics';
import { N400_QUESTIONS, N400_CATEGORY_LABELS } from '@/lib/n400/questions-data';
import { recommendWeakCategory } from '@/lib/n400/quiz-engine';
import { deriveHubProgress } from '@/lib/n400/hub-progress';
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
  const base = `/${locale}/n400app`;

  // n400_signup_complete fires once when the user lands on the dashboard
  useEffect(() => {
    if (search?.get('welcome') !== 'signup') return;
    if (!hydrated) return;
    trackSignupComplete(state.address.stateCode);
    router.replace(pathname);
  }, [search, hydrated, state.address.stateCode, router, pathname]);

  const getLocalDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStrLocal = getLocalDateStr(new Date());

  // Daily Goals for What Mean and Yes No sections.
  // IMPORTANT: every hook (useMemo) must run before the `hydrated` early
  // return below. React requires a stable hook count across renders —
  // placing these after the return crashes with "Rendered more hooks than
  // during the previous render" (React #310) once hydration flips true.
  const whatMeanIds = useMemo(() => WHATMEAN_QUESTIONS.map((q) => q.id), []);
  const yesNoIds = useMemo(() => YESNO_QUESTIONS.map((q) => q.id), []);

  const whatMeanKnown = useMemo(() => new Set(state.sectionKnown.whatmean), [state.sectionKnown.whatmean]);
  const yesNoKnown = useMemo(() => new Set(state.sectionKnown.yesno), [state.sectionKnown.yesno]);

  const sectionSeen = useMemo(() => deriveSectionSeen(state.sectionAttempts), [state.sectionAttempts]);

  const whatMeanDaily = useMemo(
    () => sectionDailyFive('whatmean', whatMeanIds, whatMeanKnown, sectionSeen.whatmean, todayStrLocal),
    [whatMeanIds, whatMeanKnown, sectionSeen.whatmean, todayStrLocal],
  );
  const yesNoDaily = useMemo(
    () => sectionDailyFive('yesno', yesNoIds, yesNoKnown, sectionSeen.yesno, todayStrLocal),
    [yesNoIds, yesNoKnown, sectionSeen.yesno, todayStrLocal],
  );

  // Civics "Tiếp tục học" — same derivation as the Civics hub so both screens
  // always agree on where the user left off.
  const attempted = useMemo(() => new Set(state.attempts.map((a) => a.questionId)), [state.attempts]);
  const civicsProgress = useMemo(
    () => deriveHubProgress(N400_QUESTIONS, (q) => attempted.has(q.id), (q) => q.id),
    [attempted],
  );
  const recommendation = useMemo(() => recommendWeakCategory(state.attempts), [state.attempts]);

  if (!hydrated) {
    return <div className="text-sm font-medium text-slate-500 p-8">Đang tải…</div>;
  }

  // --- Daily goals ---
  const GOAL_QUESTIONS = 20;
  const todaysAttempts = state.attempts.filter((a) => a.at.startsWith(todayStrLocal));
  const todayQuestions = todaysAttempts.filter((a) => a.mode !== 'flashcard').length;
  const whatMeanDoneCount = dailyFiveDoneCount(whatMeanDaily, whatMeanKnown);
  const yesNoDoneCount = dailyFiveDoneCount(yesNoDaily, yesNoKnown);
  const writingToday = state.sectionAttempts.filter(
    (a) => a.section === 'writing' && a.at.startsWith(todayStrLocal),
  ).length;

  const goals = [
    {
      label: `Trả lời ${GOAL_QUESTIONS} câu hỏi`,
      sub: `Civics · ${Math.min(todayQuestions, GOAL_QUESTIONS)}/${GOAL_QUESTIONS}`,
      done: todayQuestions >= GOAL_QUESTIONS,
      href: `${base}/practice`,
    },
    {
      label: 'Luyện 5 câu hỏi',
      sub: `Yes / No · ${yesNoDoneCount}/5`,
      done: yesNoDoneCount >= 5,
      href: `${base}/speaking/yes-no`,
    },
    {
      label: 'Luyện 5 câu hỏi',
      sub: `What Mean · ${whatMeanDoneCount}/5`,
      done: whatMeanDoneCount >= 5,
      href: `${base}/speaking/what-mean`,
    },
    {
      label: 'Luyện tập Writing',
      sub: writingToday > 0 ? `Đã luyện ${writingToday} câu hôm nay` : 'Chép chính tả ít nhất 1 câu',
      done: writingToday > 0,
      href: `${base}/writing`,
    },
  ];
  const goalsDone = goals.filter((g) => g.done).length;

  // Quick-nav cards — mirror the sidebar's 4 top-level areas.
  const navCards = [
    {
      label: 'Tổng quan',
      sub: 'Xem tổng quan quá trình học của bạn.',
      href: base,
      icon: Home,
      tint: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Học tập',
      sub: 'Học và luyện tập theo từng kỹ năng.',
      href: `${base}/study`,
      icon: GraduationCap,
      tint: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Thi thử',
      sub: 'Thi thử như kỳ thi thật, đánh giá năng lực.',
      href: `${base}/mock-test`,
      icon: ClipboardCheck,
      tint: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Tiến độ',
      sub: 'Theo dõi tiến độ và thành tích của bạn.',
      href: `${base}/statistic`,
      icon: BarChart2,
      tint: 'bg-orange-50 text-orange-600',
    },
  ];

  const bottomStats = [
    {
      label: 'Chuỗi học tập',
      value: `${state.streak.current} ngày`,
      href: `${base}/statistic`,
      icon: Flame,
      filled: true,
      tint: 'bg-orange-50 text-orange-500',
    },
    {
      label: 'Độ chính xác',
      value: `${stats.accuracy}%`,
      href: `${base}/statistic`,
      icon: Star,
      filled: true,
      tint: 'bg-amber-50 text-amber-500',
    },
    {
      label: 'Câu đã thuộc',
      value: `${stats.mastered} câu`,
      href: `${base}/flashcards?filter=known`,
      icon: CheckCircle2,
      tint: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Huy hiệu',
      value: `${badges.earnedSlugs.size} danh hiệu`,
      href: `${base}/progress`,
      icon: Award,
      tint: 'bg-yellow-50 text-yellow-600',
    },
  ];

  return (
    <div className="animate-in fade-in duration-500 max-w-[1400px] mx-auto space-y-3 lg:short:space-y-2 xl:tall:space-y-5">
      {/* 1. HERO — Continue studying the 128 Civics questions */}
      {/* Outer wrapper: top padding reserves space for statue overflow */}
      <div className="lg:pt-14 lg:short:pt-10 xl:tall:pt-20">
        <Card className="!p-0 !overflow-visible border-slate-200/60 shadow-sm relative">

          {/* ── Right-side image group. The box spans the card height PLUS
              96px above it. Two layers fill the exact same box so their
              object-cover geometry is pixel-identical:
                1. full panorama, clip-path'ed to the card bounds
                2. statue-top cutout (transparent PNG), unclipped, so only
                   the torch/head break out above the card ── */}
          <div
            className="absolute bottom-0 right-0 hidden lg:block lg:w-[44%] z-[0] pointer-events-none [--pop:88px] short:[--pop:64px]"
            style={{ top: 'calc(-1 * var(--pop))' }}
          >
            {/* Base panorama — clipped to the card area (skyline, body,
                tablet, flag all stay inside the border) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: 'inset(var(--pop) 0 0 0 round 0 24px 24px 0)' }}
            >
              <Image
                src="/images/n400/Dashboard-thumbnail-panorama.png"
                alt=""
                fill
                className="object-cover object-[65%_20%] scale-[1.15] -translate-y-3"
                sizes="(min-width: 1024px) 44vw, 0px"
                priority
              />
              {/* Left-edge gradient: blends panorama into white card */}
              <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-white via-white/80 to-transparent" />
            </div>

            {/* Statue cutout — same canvas + same object-fit as the base, so
                it lands exactly on top of the statue; torch/head overflow */}
            <Image
              src="/images/n400/Dashboard-thumbnail-statue.png"
              alt=""
              fill
              className="object-cover object-[65%_20%] scale-[1.15] -translate-y-3 z-[1]"
              sizes="(min-width: 1024px) 44vw, 0px"
              priority
            />

            {/* Decorative sparkles — positioned above the card boundary */}
            <div className="absolute z-[2] pointer-events-none" style={{ top: '66px', right: '15%' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#daa520" strokeWidth="2" className="animate-pulse">
                <line x1="12" y1="2" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="4.93" x2="8.46" y2="8.46"/><line x1="15.54" y1="15.54" x2="19.07" y2="19.07"/>
                <line x1="4.93" y1="19.07" x2="8.46" y2="15.54"/><line x1="15.54" y1="8.46" x2="19.07" y2="4.93"/>
              </svg>
            </div>
            <div className="absolute z-[2] pointer-events-none" style={{ top: '51px', right: '30%' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#daa520" strokeWidth="1.5" className="animate-pulse" style={{ animationDelay: '0.5s' }}>
                <line x1="12" y1="2" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="22" y2="12"/>
              </svg>
            </div>
          </div>

          {/* ── Left content: relative z-index so text sits above image ── */}
          <div className="relative z-[2]">
            <div className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:gap-7 xl:tall:p-7 lg:w-[56%]">
              <ProgressRing
                done={civicsProgress.seenCount}
                total={civicsProgress.totalCount}
                percent={civicsProgress.percent}
                size="lg"
              />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Star size={18} className="text-amber-400" fill="currentColor" />
                  <h2 className="text-xl xl:tall:text-2xl font-extrabold text-slate-900">Tiếp tục học</h2>
                </div>
                <p className="mt-1.5 text-sm xl:tall:text-base text-slate-600">
                  {civicsProgress.nextNumber !== null
                    ? `Bạn đang ở câu #${civicsProgress.nextNumber} trong 128 câu Civics`
                    : `Bạn đã học qua cả ${civicsProgress.totalCount} câu Civics — ôn lại nhé!`}
                </p>
                <div className="mt-3 max-w-md mx-auto sm:mx-0">
                  <ProgressBar progress={civicsProgress.percent} heightClass="h-2.5" />
                </div>
                <Link
                  href={`${base}/flashcards?filter=unknown`}
                  className="group mt-3 xl:tall:mt-5 inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-7 py-3 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {civicsProgress.started ? 'Tiếp tục học' : 'Bắt đầu học'}
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* Hint strip — white background, image bleeds through on right */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 bg-white/90 px-5 py-2.5 xl:tall:py-3 text-sm sm:px-6 rounded-b-[24px]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <Lightbulb size={15} className="text-amber-500" />
              </span>
              {recommendation ? (
                <>
                  <span className="text-slate-600">
                    <strong className="font-bold text-slate-800">Gợi ý cho bạn:</strong> Bạn thường sai câu về{' '}
                    <strong className="font-bold text-slate-800">
                      {N400_CATEGORY_LABELS[recommendation.category].vi}
                    </strong>.
                  </span>
                  <Link
                    href={`${base}/practice?start=weak`}
                    className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-800"
                  >
                    Luyện 5 câu ngay <ArrowRight size={15} />
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-slate-600">
                    <strong className="font-bold text-slate-800">Gợi ý cho bạn:</strong> Luyện tập mỗi ngày để giữ chuỗi
                    học tập của bạn.
                  </span>
                  <Link
                    href={`${base}/practice`}
                    className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-800"
                  >
                    Luyện 5 câu ngay <ArrowRight size={15} />
                  </Link>
                </>
              )}
            </div>
          </div>

        </Card>
      </div>

      {/* 2. MỤC TIÊU HÔM NAY */}
      <Card className="!p-4 xl:tall:!p-6 border-amber-100 bg-gradient-to-br from-amber-50/60 to-white">
        <div className="mb-3 xl:tall:mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 shadow-sm">
              <Target size={22} />
            </div>
            <div>
              <h3 className="text-base xl:tall:text-lg font-extrabold text-slate-900">Mục tiêu hôm nay</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Hoàn thành 1 hoạt động để tiến gần đến buổi phỏng vấn quốc tịch!
              </p>
            </div>
          </div>
          <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-700">
            {goalsDone} / {goals.length} hoàn thành
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {goals.map((goal) => (
            <Link
              key={goal.label + goal.sub}
              href={goal.href}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 xl:tall:p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              {goal.done ? (
                <CheckCircle2 size={24} className="shrink-0 text-green-500" fill="currentColor" stroke="white" />
              ) : (
                <Circle size={24} className="shrink-0 text-slate-300" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-800 group-hover:text-teal-700">{goal.label}</span>
                <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{goal.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </Card>

      {/* 3. QUICK-NAV CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {navCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group flex flex-col rounded-[24px] border border-slate-100 bg-white p-3.5 xl:tall:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`mb-2 xl:tall:mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${card.tint}`}>
                <Icon size={20} />
              </div>
              <h4 className="text-sm xl:tall:text-base font-extrabold text-slate-900">{card.label}</h4>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="text-xs xl:tall:text-sm leading-relaxed text-slate-500">{card.sub}</p>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5 ${card.tint}`}
                >
                  <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 4. STATS STRIP */}
      <Card className="!p-0 overflow-hidden">
        <div className="grid grid-cols-2 divide-slate-100 xl:grid-cols-4 xl:divide-x max-xl:gap-y-px">
          {bottomStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="flex items-center gap-3 px-5 py-3 lg:short:py-2.5 xl:tall:py-4 transition-colors hover:bg-slate-50"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.tint}`}>
                  <Icon size={20} fill={stat.filled ? 'currentColor' : 'none'} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs xl:tall:text-sm font-medium text-slate-500">{stat.label}</div>
                  <div className="truncate text-base xl:tall:text-lg font-extrabold text-slate-900">{stat.value}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
