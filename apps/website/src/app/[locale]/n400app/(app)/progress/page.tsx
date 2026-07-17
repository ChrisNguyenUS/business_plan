'use client';

// Tiến độ — tab 1 of 2, "Tổng quan". Answers the three questions the screen
// exists for, at a glance and in one mobile screen with no scrolling:
//   "Khi nào sẵn sàng?" → the readiness hero
//   "Mình yếu ở đâu?"   → the skills card, weakest skill flagged
//   "Tiến bộ không?"    → the stat row (streak, badges, accuracy, mock)
// Everything that needs explaining rather than glancing lives on /statistic.

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { deriveSectionGradedTally, deriveSectionMastered } from '@/lib/n400/section-progress';
import { gradedOnly } from '@/lib/n400/quiz-engine';
import { deriveLearningPace, deriveReadiness } from '@/lib/n400/readiness';
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

/** Plain-language read of the accuracy number, so the cell says something. */
function accuracyHint(accuracy: number): string {
  if (accuracy >= 80) return 'Rất tốt!';
  if (accuracy >= 60) return 'Đang tiến bộ';
  return 'Cần cải thiện';
}

export default function ProgressPage() {
  const { state, hydrated, stats } = useN400UserState();
  const badges = useN400Badges();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

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
      deriveReadiness({
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
      }),
    [stats.mastered, sectionMastered, state.mockResults, state.sectionMockResults],
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
          { id: 'civics', thumbnail: 'civics-thumbnail.png', label: 'Civics', subtitle: `${N400_QUESTIONS.length} câu hỏi`, known: stats.mastered, total: N400_QUESTIONS.length, href: `${base}/study/civics`, accent: 'teal' },
          { id: 'whatmean', thumbnail: 'whatmean-thumbnail.png', label: 'What Mean', subtitle: `${WHATMEAN_QUESTIONS.length} từ & cụm từ`, known: sectionMastered.whatmean.length, total: WHATMEAN_QUESTIONS.length, href: `${base}/speaking/what-mean`, accent: 'blue' },
          { id: 'yesno', thumbnail: 'yesno-thumbnail.png', label: 'Yes / No', subtitle: `${YESNO_QUESTIONS.length} câu hỏi`, known: sectionMastered.yesno.length, total: YESNO_QUESTIONS.length, href: `${base}/speaking/yes-no`, accent: 'purple' },
          { id: 'writing', thumbnail: 'writing-thumbnail.png', label: 'Viết', subtitle: `${WRITING_SENTENCES.length} chủ đề`, known: sectionMastered.writing.length, total: WRITING_SENTENCES.length, href: `${base}/writing`, accent: 'orange' },
        ] as const
      ).map((row) => ({
        ...row,
        weak: row.id === weakestId,
        // "Tiếp tục học" only once there's something to continue from.
        ctaLabel: row.known > 0 ? 'Tiếp tục học' : 'Học ngay',
      })),
    [stats.mastered, sectionMastered, base, weakestId],
  );

  // Mock standing reuses the readiness criterion rather than recounting passes,
  // so this cell and the hero can never disagree about where the learner stands.
  const civicsMock = readiness.criteria.find((c) => c.id === 'civics_mock')!;
  const hasCivicsMocks = state.mockResults.length > 0;

  const statCells: StatCell[] = useMemo(
    () => [
      {
        id: 'streak',
        icon: 'flame',
        label: 'Chuỗi học tập',
        value: `${state.streak.current} ngày`,
        hint: state.streak.current > 0 ? 'Giữ vững phong độ!' : 'Học hôm nay để bắt đầu',
        tint: 'orange',
      },
      {
        id: 'badges',
        icon: 'trophy',
        label: 'Huy hiệu',
        value: badges.hydrated ? `${badges.earned.length}` : '—',
        hint: 'Danh hiệu',
        tint: 'yellow',
        href: `${base}/profile`,
      },
      {
        id: 'accuracy',
        icon: 'target',
        label: 'Độ chính xác',
        value: `${stats.accuracy}%`,
        hint: accuracyHint(stats.accuracy),
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
        label: 'Thi thử Civics',
        value: hasCivicsMocks ? civicsMock.detail.replace(' lần đậu', '') : 'Chưa thi',
        hint: hasCivicsMocks
          ? civicsMock.met
            ? 'Đạt chuẩn phỏng vấn!'
            : 'Đậu 2 bài gần nhất để đạt'
          : 'Làm bài thi thử đầu tiên',
        tint: 'purple',
        href: hasCivicsMocks ? `${base}/statistic` : `${base}/mock-test`,
      },
    ],
    [state.streak, badges.hydrated, badges.earned.length, stats.accuracy, civicsMock.detail, civicsMock.met, hasCivicsMocks, base],
  );

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
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
