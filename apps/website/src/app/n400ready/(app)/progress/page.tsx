'use client';

// Tiến độ — tab 1 of 2, "Tổng quan". Answers the three questions the screen
// exists for, at a glance and in one mobile screen with no scrolling:
//   "Khi nào sẵn sàng?" → the readiness hero
//   "Mình yếu ở đâu?"   → the skills card, weakest skill flagged
//   "Tiến bộ không?"    → the stat row (streak, badges, accuracy, mock)
// Everything that needs explaining rather than glancing lives on /statistic.

import { useMemo } from 'react';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { deriveSectionGradedTally, deriveSectionMastered } from '@/lib/n400/section-progress';
import { gradedOnly } from '@/lib/n400/quiz-engine';
import { deriveLearningPace, deriveReadiness, CIVICS_MOCK_PASS_STREAK } from '@/lib/n400/readiness';
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
import { StatsRow, type StatCell } from '@/components/n400/progress/StatsRow';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import type { N400Dict } from '@/lib/n400/i18n/vi';

/** Plain-language read of the accuracy number, so the cell says something. */
function accuracyHint(accuracy: number, t: N400Dict['progress']['stats']): string {
  if (accuracy >= 80) return t.accuracyExcellent;
  if (accuracy >= 60) return t.accuracyProgressing;
  return t.accuracyNeedsWork;
}

export default function ProgressPage() {
  const { dict } = useN400Lang();
  const { state, hydrated, stats } = useN400UserState();
  const badges = useN400Badges();
  const base = '/n400ready';

  // "Yếu" is judged on graded answers only (spec D1) — a flashcard 👍 is not
  // an answer. Shared with the Study page so the two can never disagree about
  // which skill is weakest.
  const sectionGraded = useMemo(
    () => deriveSectionGradedTally(state.sectionAttempts),
    [state.sectionAttempts],
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

  // The weakest skill: lowest accuracy among those with enough evidence to
  // judge. Same bar the study page uses for its "needs practice" badge, so the
  // two screens never disagree about which skill is weak.
  const gradedCivics = useMemo(() => gradedOnly(state.attempts), [state.attempts]);

  // Measured câu-per-buổi across every skill, for the hero's "Ước tính hoàn
  // thành". Null (no recent history) lets estimateSessions use its default.
  const pace = useMemo(
    () =>
      deriveLearningPace([
        ...gradedCivics.map((a) => ({ itemKey: `civics:${a.questionId}`, wasCorrect: a.wasCorrect, at: a.at })),
        ...gradedOnly(state.sectionAttempts).map((a) => ({ itemKey: `${a.section}:${a.itemId}`, wasCorrect: a.wasCorrect, at: a.at })),
      ]),
    [gradedCivics, state.sectionAttempts],
  );

  const weakestId = useMemo(() => {
    // No type annotation here on purpose: the shape changes through the
    // filter→map chain, and inference carries the id literals to the end.
    const candidates = [
      { id: 'civics', gradedAttempts: gradedCivics.length, correctAttempts: gradedCivics.filter((a) => a.wasCorrect).length },
      { id: 'whatmean', gradedAttempts: sectionGraded.whatmean.total, correctAttempts: sectionGraded.whatmean.correct },
      { id: 'yesno', gradedAttempts: sectionGraded.yesno.total, correctAttempts: sectionGraded.yesno.correct },
      { id: 'writing', gradedAttempts: sectionGraded.writing.total, correctAttempts: sectionGraded.writing.correct },
    ]
      .filter((c) => c.gradedAttempts >= NEEDS_PRACTICE_MIN_ATTEMPTS)
      .map((c) => ({ id: c.id, accuracy: moduleAccuracy(c) ?? 100 }))
      .filter((c) => c.accuracy < NEEDS_PRACTICE_MAX_ACCURACY);

    if (candidates.length === 0) return null;
    return candidates.reduce((worst, c) => (c.accuracy < worst.accuracy ? c : worst)).id;
  }, [gradedCivics, sectionGraded]);

  const skillRows: SkillRow[] = useMemo(
    () =>
      (
        [
          { id: 'civics', thumbnail: 'civics-thumbnail.png', label: 'Civics', subtitle: tFormat(dict.flashcards.categoryCount, { count: N400_QUESTIONS.length }), known: stats.mastered, total: N400_QUESTIONS.length, href: `${base}/study/civics`, accent: 'teal' },
          { id: 'whatmean', thumbnail: 'whatmean-thumbnail.png', label: 'What Mean', subtitle: tFormat(dict.progress.skills.whatmeanSubtitle, { count: WHATMEAN_QUESTIONS.length }), known: sectionMastered.whatmean.length, total: WHATMEAN_QUESTIONS.length, href: `${base}/speaking/what-mean`, accent: 'blue' },
          { id: 'yesno', thumbnail: 'yesno-thumbnail.png', label: 'Yes / No', subtitle: tFormat(dict.flashcards.categoryCount, { count: YESNO_QUESTIONS.length }), known: sectionMastered.yesno.length, total: YESNO_QUESTIONS.length, href: `${base}/speaking/yes-no`, accent: 'purple' },
          { id: 'writing', thumbnail: 'writing-thumbnail.png', label: dict.readiness.skillLabels.writing, subtitle: tFormat(dict.progress.skills.writingSubtitle, { count: WRITING_SENTENCES.length }), known: sectionMastered.writing.length, total: WRITING_SENTENCES.length, href: `${base}/writing`, accent: 'orange' },
        ] as const
      ).map((row) => ({
        ...row,
        weak: row.id === weakestId,
        // "Tiếp tục học" only once there's something to continue from.
        ctaLabel: row.known > 0 ? dict.common.cta.continueLearning : dict.common.cta.startLearning,
      })),
    [stats.mastered, sectionMastered, base, weakestId, dict],
  );

  // Mock standing reuses the readiness criterion rather than recounting passes,
  // so this cell and the hero can never disagree about where the learner stands.
  const civicsMock = readiness.criteria.find((c) => c.id === 'civics_mock')!;
  const hasCivicsMocks = state.mockResults.length > 0;
  // civicsMock.detail is dict-formatted text (e.g. "1/2 lần đậu" / "1/2 passed");
  // the stat cell wants only the bare "X/Y" count, so derive it from the
  // criterion's own numbers instead of parsing the localized string.
  const civicsMockPasses = CIVICS_MOCK_PASS_STREAK - civicsMock.remaining;
  const streakCurrent = state.streak.current;
  const streakValue = tFormat(dict.progress.activity.daysUnit, { count: streakCurrent });

  const statCells: StatCell[] = useMemo(
    () => [
      {
        id: 'streak',
        icon: 'flame',
        label: dict.progress.stats.streak,
        value: streakValue,
        hint: streakCurrent > 0 ? dict.progress.stats.streakActive : dict.progress.stats.streakInactive,
        tint: 'orange',
      },
      {
        id: 'badges',
        icon: 'trophy',
        label: dict.progress.stats.badges,
        value: badges.hydrated ? `${badges.earned.length}` : '—',
        hint: dict.progress.stats.badgesCaption,
        tint: 'yellow',
        href: `${base}/profile`,
      },
      {
        id: 'accuracy',
        icon: 'target',
        label: dict.progress.stats.accuracy,
        value: `${stats.accuracy}%`,
        hint: accuracyHint(stats.accuracy, dict.progress.stats),
        tint: 'teal',
        href: `${base}/statistic`,
      },
      {
        id: 'mock',
        icon: 'clipboard',
        // "0/2 · Bài thi đạt chuẩn" read as "took 0 of 2 tests"; say what the
        // number actually is — passes among the 2 most recent Civics mocks,
        // the readiness condition's own bar. Never attempted is its own state:
        // "0/2" would look like two failures, so invite the first mock instead.
        label: dict.progress.stats.civicsMock,
        value: hasCivicsMocks ? `${civicsMockPasses}/${CIVICS_MOCK_PASS_STREAK}` : dict.progress.stats.noMockYet,
        hint: hasCivicsMocks
          ? civicsMock.met
            ? dict.progress.stats.passStandard
            : dict.progress.stats.needMorePasses
          : dict.progress.stats.firstMock,
        tint: 'purple',
        href: hasCivicsMocks ? `${base}/statistic` : `${base}/mock-test`,
      },
    ],
    [streakValue, streakCurrent, badges.hydrated, badges.earned.length, stats.accuracy, civicsMockPasses, civicsMock.met, hasCivicsMocks, base, dict],
  );

  if (!hydrated) {
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-2 animate-in fade-in duration-300 sm:gap-4">
      <ProgressTabs />

      <ReadinessHero readiness={readiness} base={base} pace={pace} />

      <SkillsCard rows={skillRows} />

      <StatsRow cells={statCells} />
    </div>
  );
}
