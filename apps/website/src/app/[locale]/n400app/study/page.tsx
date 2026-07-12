'use client';

// /study — the "Học tập" Learning Launcher. Single responsibility: help the
// user pick and enter a learning module fast. It deliberately does NOT repeat
// the dashboard's overall-progress hero, streak, or "continue learning"
// recommendation (those live on Tổng quan). The page is just:
//   1. Four module cards (fixed order) — each with ONE smart status badge.
//   2. One personalized tip strip.
// The page title + subtitle + streak live in the shared <Header>.

import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  BookMarked,
  CheckCircle2,
  Lightbulb,
  Play,
  Sparkles,
  Star,
  TrendingDown,
} from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';
import { useN400UserState } from '@/lib/n400/user-state';
import { deriveSectionSeen, type SectionKey } from '@/lib/n400/section-progress';
import {
  N400_QUESTIONS,
  N400_CATEGORY_LABELS,
  type N400CategoryKey,
} from '@/lib/n400/questions-data';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { WRITING_SENTENCES } from '@/lib/n400/writing-data';
import {
  pickRecommendedModule,
  decideModuleBadge,
  buildStudyTip,
  modulePercent,
  moduleAccuracy,
  type StudyModuleId,
  type StudyModuleSignal,
  type StudyBadgeKind,
} from '@/lib/n400/study-modules';

const CIVICS_TOTAL = 128;
const STALE_DAYS = 7;
const DAY_MS = 86_400_000;

// Static presentation config — colors, copy, images, routes. Fixed order:
// civics → what-mean → yes/no → writing (preserves muscle memory). Only the
// badge + frame emphasis change; positions never do.
interface ModuleConfig {
  id: StudyModuleId;
  href: string; // relative to base
  image: string;
  title: string;
  desc: string;
  barClass: string;
  btnFilled: string;
  btnOutline: string;
  recFrame: string; // stronger border/ring when recommended
  recBg: string;
}

const BADGE_META: Record<
  StudyBadgeKind,
  { label: string; Icon: typeof Star; chip: string; iconClass?: string }
> = {
  recommended: {
    label: 'Recommended',
    Icon: Star,
    chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70',
    iconClass: 'fill-amber-400 text-amber-500',
  },
  continue: {
    label: 'Continue',
    Icon: Play,
    chip: 'bg-white text-blue-600 ring-1 ring-blue-100',
    iconClass: 'fill-blue-600',
  },
  'needs-practice': {
    label: 'Needs Practice',
    Icon: TrendingDown,
    chip: 'bg-white text-orange-600 ring-1 ring-orange-100',
  },
  completed: {
    label: 'Completed',
    Icon: CheckCircle2,
    chip: 'bg-white text-emerald-600 ring-1 ring-emerald-100',
  },
  new: {
    label: 'New',
    Icon: Sparkles,
    chip: 'bg-white text-slate-500 ring-1 ring-slate-200',
  },
};

function BadgeChip({ kind, className = '' }: { kind: StudyBadgeKind; className?: string }) {
  const b = BADGE_META[kind];
  const Icon = b.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${b.chip} ${className}`}
    >
      <Icon size={13} className={`shrink-0 ${b.iconClass ?? ''}`} />
      <span className="truncate">{b.label}</span>
    </span>
  );
}

export default function StudyPage() {
  const { state, hydrated, stats } = useN400UserState();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const configs: ModuleConfig[] = useMemo(
    () => [
      {
        id: 'civics',
        href: `${base}/study/civics`,
        image: '/images/n400/civic-thumbnail-study.png',
        title: 'Civic 128 câu',
        desc: 'Học toàn bộ 128 câu hỏi Civics theo thứ tự và theo chủ đề.',
        barClass: 'bg-teal-500',
        btnFilled: 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/20',
        btnOutline: 'border border-teal-300 text-teal-700 hover:bg-teal-50',
        recFrame: 'border-teal-200 ring-2 ring-teal-400/30 shadow-lg shadow-teal-600/5',
        recBg: 'bg-gradient-to-b from-teal-50/50 to-white',
      },
      {
        id: 'whatmean',
        href: `${base}/speaking/what-mean`,
        image: '/images/n400/whatmean-thumbnail-study.png',
        title: 'What Mean',
        desc: 'Học và hiểu ý nghĩa của các từ và cụm từ quan trọng.',
        barClass: 'bg-blue-500',
        btnFilled: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20',
        btnOutline: 'border border-blue-300 text-blue-700 hover:bg-blue-50',
        recFrame: 'border-blue-200 ring-2 ring-blue-400/30 shadow-lg shadow-blue-600/5',
        recBg: 'bg-gradient-to-b from-blue-50/50 to-white',
      },
      {
        id: 'yesno',
        href: `${base}/speaking/yes-no`,
        image: '/images/n400/yesno-thumbnail-study.png',
        title: 'Yes / No',
        desc: 'Luyện tập trả lời các câu hỏi Yes / No trong đơn N-400.',
        barClass: 'bg-purple-500',
        btnFilled: 'bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/20',
        btnOutline: 'border border-purple-300 text-purple-700 hover:bg-purple-50',
        recFrame: 'border-purple-200 ring-2 ring-purple-400/30 shadow-lg shadow-purple-600/5',
        recBg: 'bg-gradient-to-b from-purple-50/50 to-white',
      },
      {
        id: 'writing',
        href: `${base}/writing`,
        image: '/images/n400/writing-thumbnail-study.png',
        title: 'Writing',
        desc: 'Luyện viết chính tả và viết hoa, dấu chấm đúng chuẩn.',
        barClass: 'bg-orange-500',
        btnFilled: 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20',
        btnOutline: 'border border-orange-300 text-orange-700 hover:bg-orange-50',
        recFrame: 'border-orange-200 ring-2 ring-orange-400/30 shadow-lg shadow-orange-500/5',
        recBg: 'bg-gradient-to-b from-orange-50/50 to-white',
      },
    ],
    [base],
  );

  // ── Derive raw learning signals from user state ──────────────────────────
  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts), [state.sectionAttempts]);

  // Civics: last-attempt-per-question drives both "wrong to review" and the
  // weakest-topic tip. state.attempts is civics-only (question_id rows).
  const civics = useMemo(() => {
    const last = new Map<number, boolean>();
    for (const a of state.attempts) last.set(a.questionId, a.wasCorrect);
    let wrong = 0;
    const catWrong = new Map<N400CategoryKey, number>();
    const byId = new Map(N400_QUESTIONS.map((q) => [q.id, q]));
    for (const [qid, ok] of last) {
      if (ok) continue;
      wrong += 1;
      const q = byId.get(qid);
      if (q) catWrong.set(q.category, (catWrong.get(q.category) ?? 0) + 1);
    }
    let weakest: { label: string; count: number } | null = null;
    for (const [key, count] of catWrong) {
      if (!weakest || count > weakest.count) {
        weakest = { label: N400_CATEGORY_LABELS[key].en, count };
      }
    }
    return { done: stats.distinctAnswered, wrong, weakest };
  }, [state.attempts, stats.distinctAnswered]);

  // Sections: last-attempt-per-item wrong counts, graded accuracy, staleness.
  const sections = useMemo(() => {
    const last: Record<SectionKey, Map<string, boolean>> = {
      whatmean: new Map(),
      yesno: new Map(),
      writing: new Map(),
    };
    const graded: Record<SectionKey, { total: number; correct: number }> = {
      whatmean: { total: 0, correct: 0 },
      yesno: { total: 0, correct: 0 },
      writing: { total: 0, correct: 0 },
    };
    const lastAt: Record<SectionKey, number> = { whatmean: 0, yesno: 0, writing: 0 };
    for (const a of state.sectionAttempts) {
      last[a.section].set(a.itemId, a.wasCorrect);
      graded[a.section].total += 1;
      if (a.wasCorrect) graded[a.section].correct += 1;
      const t = new Date(a.at).getTime();
      if (t > lastAt[a.section]) lastAt[a.section] = t;
    }
    const wrong = (k: SectionKey) => [...last[k].values()].filter((v) => !v).length;
    return {
      wrong: { whatmean: wrong('whatmean'), yesno: wrong('yesno'), writing: wrong('writing') },
      graded,
      lastAt,
    };
  }, [state.sectionAttempts]);

  const totals: Record<StudyModuleId, number> = {
    civics: CIVICS_TOTAL,
    whatmean: WHATMEAN_QUESTIONS.length,
    yesno: YESNO_QUESTIONS.length,
    writing: WRITING_SENTENCES.length,
  };

  const signals: StudyModuleSignal[] = useMemo(
    () => [
      {
        id: 'civics',
        done: civics.done,
        total: totals.civics,
        gradedAttempts: state.attempts.length,
        correctAttempts: state.attempts.filter((a) => a.wasCorrect).length,
      },
      {
        id: 'whatmean',
        done: seen.whatmean.size,
        total: totals.whatmean,
        gradedAttempts: sections.graded.whatmean.total,
        correctAttempts: sections.graded.whatmean.correct,
      },
      {
        id: 'yesno',
        done: seen.yesno.size,
        total: totals.yesno,
        gradedAttempts: sections.graded.yesno.total,
        correctAttempts: sections.graded.yesno.correct,
      },
      {
        id: 'writing',
        done: seen.writing.size,
        total: totals.writing,
        gradedAttempts: sections.graded.writing.total,
        correctAttempts: sections.graded.writing.correct,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [civics.done, seen, sections.graded, state.attempts, totals.whatmean, totals.yesno, totals.writing],
  );

  const recommendedId = useMemo(() => pickRecommendedModule(signals), [signals]);
  const signalById = useMemo(() => new Map(signals.map((s) => [s.id, s])), [signals]);

  // Personalized tip: weakest topic → stale skill → civics sprint → low accuracy.
  const tip = useMemo(() => {
    const sectionMeta: { key: SectionKey; label: string; href: string }[] = [
      { key: 'writing', label: 'Writing', href: `${base}/writing` },
      { key: 'yesno', label: 'Yes / No', href: `${base}/speaking/yes-no` },
      { key: 'whatmean', label: 'What Mean', href: `${base}/speaking/what-mean` },
    ];
    const now = Date.now();
    let staleSection: { label: string; days: number; href: string } | null = null;
    for (const m of sectionMeta) {
      const last = sections.lastAt[m.key];
      if (last === 0) continue; // never started → not "stale"
      const days = Math.floor((now - last) / DAY_MS);
      if (days >= STALE_DAYS && (!staleSection || days > staleSection.days)) {
        staleSection = { label: m.label, days, href: m.href };
      }
    }

    const labels: Record<StudyModuleId, string> = {
      civics: 'Civics',
      whatmean: 'What Mean',
      yesno: 'Yes / No',
      writing: 'Writing',
    };
    let lowestModule: { label: string; accuracy: number; href: string } | null = null;
    for (const c of configs) {
      const sig = signalById.get(c.id)!;
      const acc = moduleAccuracy(sig);
      if (acc === null || sig.done === 0 || sig.done >= sig.total) continue;
      if (!lowestModule || acc < lowestModule.accuracy) {
        lowestModule = { label: labels[c.id], accuracy: acc, href: c.href };
      }
    }

    return buildStudyTip({
      weakestCategory: civics.weakest,
      staleSection,
      civicsRemaining: Math.max(totals.civics - civics.done, 0),
      lowestModule,
    });
  }, [base, sections.lastAt, configs, signalById, civics.weakest, civics.done, totals.civics]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const wrongById: Record<StudyModuleId, number> = {
    civics: civics.wrong,
    whatmean: sections.wrong.whatmean,
    yesno: sections.wrong.yesno,
    writing: sections.wrong.writing,
  };

  return (
    // Mobile: fill the viewport (h-full) and let the card grid absorb spare
    // height so the whole page fits without scrolling on any phone size.
    // Desktop (lg): natural flow, centered max-width.
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3 animate-in fade-in duration-300 lg:h-auto lg:gap-5 lg:pb-4">
      {/* Four learning modules — fixed order, one smart badge each.
          Mobile = 2×2 grid that grows to fill remaining height; desktop = 4 cols. */}
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3 lg:flex-none lg:grid-cols-4 lg:grid-rows-1 lg:gap-4">
        {configs.map((c) => {
          const sig = signalById.get(c.id)!;
          const isRec = c.id === recommendedId;
          const { badge, ctaLabel } = decideModuleBadge(sig, isRec);
          const percent = modulePercent(sig);
          const btnClass = badge === 'completed' ? c.btnOutline : c.btnFilled;

          // Secondary link (desktop only): a finished module has no wrongs to
          // review, so surface saved questions instead; otherwise the review pool.
          const secondary =
            badge === 'completed'
              ? { label: 'Câu đã lưu', count: state.bookmarks.length, href: `${base}/bookmark` }
              : {
                  label: c.id === 'whatmean' ? 'Ôn lại từ sai' : 'Ôn lại câu sai',
                  count: wrongById[c.id],
                  href: c.href,
                };

          return (
            <div
              key={c.id}
              className={`group flex min-h-0 flex-col overflow-hidden rounded-2xl border p-2.5 transition-all duration-200 hover:shadow-lg motion-reduce:transition-none lg:rounded-3xl lg:p-4 lg:hover:-translate-y-0.5 ${
                isRec ? c.recFrame + ' ' + c.recBg : 'border-slate-100 bg-white shadow-sm'
              }`}
            >
              {/* Thumbnail — image on top at every size. On mobile it flexes to
                  absorb/release vertical space; on desktop it's a fixed 4:3. */}
              <div className="relative min-h-[56px] w-full flex-1 overflow-hidden rounded-xl bg-slate-50 lg:aspect-[4/3] lg:min-h-0 lg:flex-none lg:rounded-2xl">
                <Image
                  src={c.image}
                  alt={c.title}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
                {/* Single badge — overlays the thumbnail at all sizes. */}
                <BadgeChip
                  kind={badge}
                  className="absolute left-2 top-2 max-w-[calc(100%-1rem)] px-2 py-0.5 text-[11px] lg:left-3 lg:top-3 lg:px-2.5 lg:py-1 lg:text-xs"
                />
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-col lg:mt-4 lg:flex-1">
                <h3 className="mt-2 truncate text-sm font-extrabold text-gray-800 lg:mt-0 lg:whitespace-normal lg:text-lg">
                  {c.title}
                </h3>
                {/* Description: desktop only (saves vertical space on mobile). */}
                <p className="mt-1 hidden text-sm leading-relaxed text-gray-500 lg:line-clamp-2 lg:block lg:flex-1">
                  {c.desc}
                </p>

                {/* Progress */}
                <div className="mt-1.5 flex items-center justify-between text-xs lg:mt-3 lg:text-sm">
                  <span className="truncate font-semibold text-gray-700">
                    {sig.done}/{sig.total} câu
                  </span>
                  <span className="shrink-0 font-semibold text-gray-400">{percent}%</span>
                </div>
                <div className="mt-1 lg:mt-1.5">
                  <ProgressBar progress={percent} colorClass={c.barClass} />
                </div>

                <Link
                  href={c.href}
                  className={`mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors lg:mt-3 lg:gap-2 lg:rounded-xl lg:px-4 lg:py-2.5 lg:text-sm ${btnClass}`}
                >
                  <span className="truncate">{ctaLabel}</span>
                  <ArrowRight
                    size={15}
                    className="shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                  />
                </Link>

                {/* Secondary review link — desktop only. */}
                {secondary.count > 0 && (
                  <Link
                    href={secondary.href}
                    className="mt-3 hidden items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-800 lg:inline-flex"
                  >
                    <BookMarked size={14} />
                    {secondary.label} ({secondary.count})
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Personalized tip — one dynamic recommendation, never generic. Stays a
          compact single strip on mobile so it never forces a scroll. */}
      <section className="flex shrink-0 items-center gap-3 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/80 to-emerald-50/50 p-3 lg:gap-4 lg:rounded-3xl lg:p-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-teal-600 shadow-sm lg:h-11 lg:w-11 lg:rounded-2xl">
          <Lightbulb size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-gray-900 lg:text-base">Gợi ý dành cho bạn</h3>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600 lg:text-sm">
            {tip.line1} {tip.line2}
          </p>
        </div>
        <Link
          href={`${base}${tip.href}`}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 shadow-sm transition-colors hover:bg-teal-50 lg:px-4 lg:py-2.5"
        >
          <span className="hidden sm:inline">Xem gợi ý</span>
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
