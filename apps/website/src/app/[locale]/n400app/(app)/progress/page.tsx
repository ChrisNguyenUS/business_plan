'use client';

// Tiến độ — tab 1 of 2, "Tổng quan". Answers the three questions the screen
// exists for, at a glance and in one mobile screen with no scrolling:
//   "Khi nào sẵn sàng?" → the readiness hero
//   "Mình yếu ở đâu?"   → the skills card, weakest skill flagged
//   "Tiến bộ không?"    → the chip row (streak, badges, last mock)
// Everything that needs explaining rather than glancing lives on /statistic.

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { deriveSectionMastered, type SectionKey } from '@/lib/n400/section-progress';
import { deriveReadiness } from '@/lib/n400/readiness';
import {
  moduleAccuracy,
  NEEDS_PRACTICE_MIN_ATTEMPTS,
  NEEDS_PRACTICE_MAX_ACCURACY,
} from '@/lib/n400/study-modules';
import { N400_QUESTIONS } from '@/lib/n400/questions-data';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { WRITING_SENTENCES } from '@/lib/n400/writing-data';
import { ProgressTabs } from '@/components/n400/progress/ProgressTabs';
import { ReadinessHero } from '@/components/n400/progress/ReadinessHero';
import { SkillsCard, type SkillRow } from '@/components/n400/progress/SkillsCard';

export default function ProgressPage() {
  const { state, hydrated, stats } = useN400UserState();
  const badges = useN400Badges();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  // Graded tallies per section, mirroring the study page's derivation.
  const sectionGraded = useMemo(() => {
    const graded: Record<SectionKey, { total: number; correct: number }> = {
      whatmean: { total: 0, correct: 0 },
      yesno: { total: 0, correct: 0 },
      writing: { total: 0, correct: 0 },
    };
    for (const a of state.sectionAttempts) {
      graded[a.section].total += 1;
      if (a.wasCorrect) graded[a.section].correct += 1;
    }
    return graded;
  }, [state.sectionAttempts]);

  // "Thuộc" = last graded attempt correct (spec D1) — NOT the flashcard deck's
  // marked-state, which proves nothing about retrieval.
  const sectionMastered = useMemo(
    () => deriveSectionMastered(state.sectionAttempts),
    [state.sectionAttempts],
  );

  const readiness = useMemo(
    () =>
      deriveReadiness({
        civicsKnown: stats.mastered,
        civicsTotal: N400_QUESTIONS.length,
        whatmeanKnown: sectionMastered.whatmean.length,
        whatmeanTotal: WHATMEAN_QUESTIONS.length,
        yesnoKnown: sectionMastered.yesno.length,
        yesnoTotal: YESNO_QUESTIONS.length,
        mockResults: state.mockResults,
        sectionMockResults: state.sectionMockResults,
      }),
    [stats.mastered, sectionMastered, state.mockResults, state.sectionMockResults],
  );

  // The weakest skill: lowest accuracy among those with enough evidence to
  // judge. Same bar the study page uses for its "needs practice" badge, so the
  // two screens never disagree about which skill is weak.
  const weakestId = useMemo(() => {
    // No type annotation here on purpose: the shape changes through the
    // filter→map chain, and inference carries the id literals to the end.
    const candidates = [
      { id: 'civics', gradedAttempts: state.attempts.length, correctAttempts: state.attempts.filter((a) => a.wasCorrect).length },
      { id: 'whatmean', gradedAttempts: sectionGraded.whatmean.total, correctAttempts: sectionGraded.whatmean.correct },
      { id: 'yesno', gradedAttempts: sectionGraded.yesno.total, correctAttempts: sectionGraded.yesno.correct },
      { id: 'writing', gradedAttempts: sectionGraded.writing.total, correctAttempts: sectionGraded.writing.correct },
    ]
      .filter((c) => c.gradedAttempts >= NEEDS_PRACTICE_MIN_ATTEMPTS)
      .map((c) => ({ id: c.id, accuracy: moduleAccuracy(c) ?? 100 }))
      .filter((c) => c.accuracy < NEEDS_PRACTICE_MAX_ACCURACY);

    if (candidates.length === 0) return null;
    return candidates.reduce((worst, c) => (c.accuracy < worst.accuracy ? c : worst)).id;
  }, [state.attempts, sectionGraded]);

  const skillRows: SkillRow[] = useMemo(
    () =>
      [
        { id: 'civics', icon: '📚', label: 'Civics', known: stats.mastered, total: N400_QUESTIONS.length, href: `${base}/study/civics` },
        { id: 'whatmean', icon: '📖', label: 'What Mean', known: sectionMastered.whatmean.length, total: WHATMEAN_QUESTIONS.length, href: `${base}/speaking/what-mean` },
        { id: 'yesno', icon: '🎤', label: 'Yes/No', known: sectionMastered.yesno.length, total: YESNO_QUESTIONS.length, href: `${base}/speaking/yes-no` },
        { id: 'writing', icon: '✍️', label: 'Viết', known: sectionMastered.writing.length, total: WRITING_SENTENCES.length, href: `${base}/writing` },
      ].map((row) => ({ ...row, weak: row.id === weakestId })),
    [stats.mastered, sectionMastered, base, weakestId],
  );

  const lastMock = state.mockResults.length > 0 ? state.mockResults[state.mockResults.length - 1] : null;

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-3 animate-in fade-in duration-300 sm:gap-4">
      <ProgressTabs />

      <ReadinessHero readiness={readiness} base={base} />

      <SkillsCard rows={skillRows} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600">
          🔥 {state.streak.current} ngày
        </span>
        <Link
          href={`${base}/profile`}
          className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-100"
        >
          🏅 {badges.hydrated ? `${badges.earned.length}/${badges.catalog.length}` : '—'} huy hiệu
        </Link>
        <Link
          href={`${base}/statistic`}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-slate-200"
        >
          📝 {lastMock ? (lastMock.passed ? 'Thi thử: Đạt' : 'Thi thử: Chưa đạt') : 'Chưa thi thử'}
        </Link>
      </div>
    </div>
  );
}
