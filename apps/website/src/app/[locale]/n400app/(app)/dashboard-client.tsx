'use client';

// Dashboard — single-column layout per the dashboard redesign mock:
//   1. Hero: intent-based daily recommendation (recommendDailyHero) with the
//      statue thumbnail.
//   2. Two-column row: Mục tiêu hôm nay (4 daily-goal rows, deep-linked) and
//      Gợi ý dành cho bạn (weak-topic drill + streak nudge).
//   3. Quick-nav cards: Học tập / Thi thử / Tiến độ.
//   4. Stats strip: streak · accuracy · mastered · badges.

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Award,
  BarChart2,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Flame,
  GraduationCap,
  Landmark,
  Lightbulb,
  MessageCircle,
  MessagesSquare,
  Pencil,
  Star,
  Target,
} from 'lucide-react';
import { Card } from '@/components/n400/ui';
import { useAuth } from '@/components/providers/AuthProvider';
import { getShortName } from '@/lib/profile-utils';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackSignupComplete } from '@/lib/n400/analytics';
import { N400_QUESTIONS, N400_CATEGORY_LABELS } from '@/lib/n400/questions-data';
import { recommendWeakCategory } from '@/lib/n400/quiz-engine';
import { recommendDailyHero } from '@/lib/n400/hero-recommendation';
import { deriveHubProgress } from '@/lib/n400/hub-progress';
import type { SectionKey } from '@/lib/n400/section-progress';

export default function DashboardPage() {
  const { state, hydrated, stats } = useN400UserState();
  const { profile } = useAuth();
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

  // Daily goals for the Yes/No and What Mean sections count distinct questions
  // *practiced today* (any mode) — matching the "Luyện 5 câu hỏi" label and the
  // Writing goal below. Mastery ("known") is derived from flashcard mode only,
  // so measuring the goal by mastery left it stuck after a practice session.
  const todaySectionCount = useMemo(() => {
    const seen: Record<string, Set<string>> = {};
    for (const a of state.sectionAttempts) {
      if (!a.at.startsWith(todayStrLocal)) continue;
      (seen[a.section] ??= new Set()).add(a.itemId);
    }
    return (section: SectionKey) => seen[section]?.size ?? 0;
  }, [state.sectionAttempts, todayStrLocal]);

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
  const whatMeanDoneCount = Math.min(todaySectionCount('whatmean'), 5);
  const yesNoDoneCount = Math.min(todaySectionCount('yesno'), 5);
  const writingToday = state.sectionAttempts.filter(
    (a) => a.section === 'writing' && a.at.startsWith(todayStrLocal),
  ).length;

  const goals = [
    {
      label: `Trả lời ${GOAL_QUESTIONS} câu hỏi`,
      sub: 'Civics',
      count: `${Math.min(todayQuestions, GOAL_QUESTIONS)}/${GOAL_QUESTIONS}`,
      done: todayQuestions >= GOAL_QUESTIONS,
      href: `${base}/practice`,
      icon: Landmark,
      tint: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Luyện 5 câu hỏi',
      sub: 'Yes / No',
      count: `${yesNoDoneCount}/5`,
      done: yesNoDoneCount >= 5,
      href: `${base}/speaking/yes-no`,
      icon: MessageCircle,
      tint: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Luyện 5 câu hỏi',
      sub: 'What Mean',
      count: `${whatMeanDoneCount}/5`,
      done: whatMeanDoneCount >= 5,
      href: `${base}/speaking/what-mean`,
      icon: MessagesSquare,
      tint: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Luyện tập Writing',
      sub: 'Chép chính tả ít nhất 1 câu',
      count: `${Math.min(writingToday, 1)}/1`,
      done: writingToday > 0,
      href: `${base}/writing`,
      icon: Pencil,
      tint: 'bg-orange-50 text-orange-500',
    },
  ];
  const goalsDone = goals.filter((g) => g.done).length;

  // Intent-based hero: "what action creates the highest learning value right
  // now?" — see hero-recommendation.ts for the priority ladder.
  const hero = recommendDailyHero({
    now: new Date(),
    civicsSeen: civicsProgress.seenCount,
    civicsTotal: civicsProgress.totalCount,
    attempts: state.attempts,
    mockResults: state.mockResults,
    sectionAttempts: state.sectionAttempts,
    goalsDone,
    goalsTotal: goals.length,
  });

  // Quick-nav cards — Tổng quan dropped (this page IS the overview; Tiến độ
  // covers the stats deep-dive).
  const navCards = [
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
      caption: 'Keep it up!',
      captionTint: 'text-orange-500',
      href: `${base}/statistic`,
      icon: Flame,
      filled: true,
      tint: 'bg-orange-50 text-orange-500',
    },
    {
      label: 'Độ chính xác',
      value: `${stats.accuracy}%`,
      caption: 'Good progress!',
      captionTint: 'text-amber-500',
      href: `${base}/statistic`,
      icon: Star,
      filled: true,
      tint: 'bg-amber-50 text-amber-500',
    },
    {
      label: 'Câu đã thuộc',
      value: `${stats.mastered} câu`,
      caption: 'Continue!',
      captionTint: 'text-teal-600',
      href: `${base}/flashcards?filter=known`,
      icon: CheckCircle2,
      tint: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Huy hiệu',
      value: `${badges.earnedSlugs.size}`,
      caption: 'Danh hiệu',
      captionTint: 'text-yellow-600',
      href: `${base}/progress`,
      icon: Award,
      tint: 'bg-yellow-50 text-yellow-600',
    },
  ];

  // Mobile greeting — the sticky header shows the brand on mobile, so the
  // time-of-day greeting scrolls with the content (per the mobile mock).
  const hour = new Date().getHours();
  const greetingVi = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-3 lg:short:space-y-2 xl:tall:space-y-5">
      {/* 0. MOBILE GREETING */}
      <div className="lg:hidden">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {greetingVi}
          {profile ? `, ${getShortName(profile)}` : ''}! 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">Sẵn sàng tiếp tục hành trình chinh phục quốc tịch Mỹ chưa?</p>
      </div>

      {/* 1. HERO — Continue studying the 128 Civics questions */}
      {/* Outer wrapper: tiny top padding — the torch flame overflows into the
          main content's own top padding so the card lines up with the other
          screens' hero cards */}
      <div className="lg:pt-2 lg:short:pt-1">
        <Card className="!p-0 !overflow-visible border-slate-200/60 shadow-sm relative">

          {/* ── Right-side image group. The box spans the card height PLUS
              the --pop overflow above it. Two layers fill the exact same box
              so their object-cover geometry is pixel-identical:
                1. full panorama, clip-path'ed to the card bounds
                2. statue-top cutout (transparent PNG), unclipped, so only
                   the torch flame breaks out above the card ── */}
          {/* Mobile shows the same image group without the torch overflow:
              --pop collapses to 0 so the box (and both cover layers) aligns
              exactly with the card bounds. Desktop geometry is unchanged. */}
          <div
            className="absolute bottom-0 right-0 w-[45%] lg:w-[44%] z-[0] pointer-events-none [--pop:0px] lg:[--pop:32px] lg:short:[--pop:24px]"
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
                sizes="(min-width: 1024px) 44vw, 45vw"
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
              sizes="(min-width: 1024px) 44vw, 45vw"
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
            <div className="flex flex-col items-start gap-3 p-5 text-left sm:p-8 xl:tall:p-9 lg:w-[56%]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-700 shadow-sm">
                <Star size={12} className="text-amber-400" fill="currentColor" />
                Gợi ý hôm nay
              </span>
              {/* Title/subtitle keep clear of the statue below lg (image is
                  visible on mobile); the opaque buttons may overlap it. */}
              <div className="pr-[38%] lg:pr-0">
                <h2 className="text-xl sm:text-2xl xl:tall:text-3xl font-extrabold text-slate-900">
                  {hero.emoji} {hero.title}
                </h2>
                <p className="mt-1.5 text-sm xl:tall:text-base text-slate-600">{hero.subtitle}</p>
              </div>
              <div className="mt-1 xl:tall:mt-2 flex flex-wrap gap-2.5 sm:gap-3">
                <Link
                  href={`${base}${hero.cta.href}`}
                  className="group inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-2.5 text-xs sm:px-7 sm:py-3 sm:text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {hero.cta.label}
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={`${base}${hero.secondary.href}`}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-xs sm:px-6 sm:py-3 sm:text-sm font-bold text-slate-700 transition-all hover:border-teal-200 hover:bg-white"
                >
                  {hero.secondary.label}
                </Link>
              </div>
            </div>

          </div>

        </Card>
      </div>

      {/* 2. MỤC TIÊU HÔM NAY + GỢI Ý DÀNH CHO BẠN */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 xl:tall:gap-5">
        {/* Amber-tinted below lg per the mobile mock; plain white on desktop. */}
        <Card className="!p-4 xl:tall:!p-6 lg:col-span-3 max-lg:border-amber-100 max-lg:bg-gradient-to-br max-lg:from-amber-50/60 max-lg:to-white">
          <div className="mb-3 xl:tall:mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 shadow-sm">
                <Target size={22} />
              </div>
              <div>
                <h3 className="text-base xl:tall:text-lg font-extrabold text-slate-900">Mục tiêu hôm nay</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Hoàn thành 1 hoạt động để tiến gần hơn đến buổi phỏng vấn quốc tịch!
                </p>
              </div>
            </div>
            <span className="shrink-0 whitespace-nowrap rounded-xl bg-amber-100 px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-bold text-amber-700">
              {goalsDone} / {goals.length} hoàn thành
            </span>
          </div>

          <div className="space-y-2.5 xl:tall:space-y-3">
            {goals.map((goal) => {
              const Icon = goal.icon;
              return (
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
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${goal.tint}`}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-800 group-hover:text-teal-700">
                      {goal.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{goal.sub}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-slate-400">{goal.count}</span>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Mobile: compact blue banner (per the mobile mock) */}
        <Card className="lg:hidden !p-4 !border-blue-100 !bg-blue-50/60">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
              <Target size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-slate-900">Gợi ý dành cho bạn</h3>
              {recommendation ? (
                <>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Bạn thường sai câu hỏi về{' '}
                    <strong className="font-bold text-slate-800">
                      {N400_CATEGORY_LABELS[recommendation.category].vi}
                    </strong>
                    . Luyện 5 câu để cải thiện độ chính xác!
                  </p>
                  <Link
                    href={`${base}/practice?start=weak`}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    Luyện ngay <ArrowRight size={14} />
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Luyện tập mỗi ngày để tiến bộ đều đặn. Làm 5 câu nhanh để khởi động hôm nay!
                  </p>
                  <Link
                    href={`${base}/practice?start=quick`}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    Luyện ngay <ArrowRight size={14} />
                  </Link>
                </>
              )}
            </div>
            <div className="relative h-16 w-20 shrink-0">
              <Image src="/images/n400/illu-reading.png" alt="" fill className="object-contain" sizes="80px" />
            </div>
          </div>
        </Card>

        {/* Desktop: full suggestion card */}
        <Card className="!p-4 xl:tall:!p-6 hidden lg:flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-sm">
              <Lightbulb size={22} />
            </div>
            <div>
              <h3 className="text-base xl:tall:text-lg font-extrabold text-slate-900">Gợi ý dành cho bạn</h3>
              <p className="mt-0.5 text-sm text-slate-500">Dựa trên quá trình học của bạn.</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
              <Target size={24} />
            </span>
            {recommendation ? (
              <>
                <p className="text-sm font-bold leading-snug text-slate-800">
                  Bạn thường sai câu hỏi về{' '}
                  <span className="text-blue-700">{N400_CATEGORY_LABELS[recommendation.category].vi}</span>.
                </p>
                <p className="text-xs text-slate-500">Luyện 5 câu để cải thiện độ chính xác!</p>
                <Link
                  href={`${base}/practice?start=weak`}
                  className="group mt-1 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Luyện ngay
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm font-bold leading-snug text-slate-800">
                  Luyện tập mỗi ngày để tiến bộ đều đặn.
                </p>
                <p className="text-xs text-slate-500">Làm 5 câu nhanh để khởi động hôm nay!</p>
                <Link
                  href={`${base}/practice?start=quick`}
                  className="group mt-1 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Luyện ngay
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <CalendarDays size={18} />
            </span>
            <p className="text-sm leading-snug text-slate-600">
              {state.streak.current > 0 ? (
                <>
                  Đã <strong className="font-bold text-slate-800">{state.streak.current} ngày liên tiếp</strong> bạn
                  duy trì việc học. Cố gắng giữ chuỗi nhé!
                </>
              ) : (
                <>Bắt đầu chuỗi học tập của bạn ngay hôm nay!</>
              )}
            </p>
          </div>
        </Card>
      </div>

      {/* 3. QUICK-NAV CARDS — 3-up on every breakpoint (mobile mock keeps
          them side by side, just more compact) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {navCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative flex flex-col rounded-[24px] border border-slate-100 bg-white p-3 sm:p-3.5 xl:tall:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`mb-2 xl:tall:mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${card.tint}`}>
                <Icon size={20} />
              </div>
              <h4 className="text-sm xl:tall:text-base font-extrabold text-slate-900">{card.label}</h4>
              {/* Arrow floats bottom-right so the sub text keeps the full
                  card width (matters on the narrow mobile cards) */}
              <p className="mt-1 pr-8 pb-1 text-[11px] sm:text-xs xl:tall:text-sm leading-relaxed text-slate-500">
                {card.sub}
              </p>
              <span
                className={`absolute bottom-3 right-3 sm:bottom-3.5 sm:right-3.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5 ${card.tint}`}
              >
                <ArrowRight size={16} />
              </span>
            </Link>
          );
        })}
      </div>

      {/* 4. STATS STRIP — one scrollable row on mobile with ~3 stats visible
          (the mock's 4th cell is cut by the screen edge); 4 fixed columns
          from xl up */}
      <Card className="!p-0 overflow-hidden">
        <div className="flex divide-x divide-slate-100 overflow-x-auto xl:grid xl:grid-cols-4">
          {bottomStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="flex min-w-[124px] shrink-0 items-center gap-2 px-3 py-3 sm:min-w-[180px] sm:gap-3 sm:px-5 lg:short:py-2.5 xl:min-w-0 xl:shrink xl:tall:py-4 transition-colors hover:bg-slate-50"
              >
                <div
                  className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${stat.tint}`}
                >
                  <Icon size={18} fill={stat.filled ? 'currentColor' : 'none'} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[10px] sm:text-xs xl:tall:text-sm font-medium text-slate-500">
                    {stat.label}
                  </div>
                  <div className="truncate text-sm sm:text-base xl:tall:text-lg font-extrabold text-slate-900">
                    {stat.value}
                  </div>
                  <div className={`truncate text-[10px] sm:text-[11px] font-bold ${stat.captionTint}`}>
                    {stat.caption}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* 5. DAILY TIP BANNER — mobile only (per the mobile mock) */}
      <Card className="lg:hidden !p-4 !border-teal-100 !bg-teal-50/60">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
            <BookOpen size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-slate-900">Hãy luyện tập mỗi ngày!</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Chỉ cần 15-20 phút mỗi ngày sẽ giúp bạn ghi nhớ lâu hơn và tự tin hơn trong buổi phỏng vấn.
            </p>
          </div>
          <div className="relative h-14 w-16 shrink-0">
            <Image src="/images/n400/illu-wink.png" alt="" fill className="object-contain" sizes="64px" />
          </div>
        </div>
      </Card>
    </div>
  );
}
