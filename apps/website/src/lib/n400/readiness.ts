// Journey-level engine for the Tiến độ screen: "which conditions am I still
// missing before I'm ready for the real N-400 interview?"
//
// This is the third of the app's three recommendation engines. They answer
// deliberately different questions and must not drift into each other:
//
//   hero-recommendation.ts  → the MOMENT:  "what do I do right now?"
//   study-modules.ts (tip)  → the SESSION: "what do I study first in here?"
//   readiness.ts (this)     → the JOURNEY: "what's left before the interview?"
//
// Harmony is structural, not a convention: the pass mark is imported from the
// hero engine rather than re-declared, and every CTA reuses a deep link that
// already exists. All hrefs are relative to the n400app base (`/${locale}/n400app`).

import type { MockResult, SectionMockResult } from './storage';
import { FIRST_MOCK_MIN_PERCENT } from './hero-recommendation';

export type ReadinessCriterionId =
  | 'civics_known'
  | 'whatmean_known'
  | 'yesno_known'
  | 'writing_mock'
  | 'civics_mock';

export interface ReadinessCriterion {
  id: ReadinessCriterionId;
  /** Checklist row label, e.g. "Thuộc 80% câu Civics". */
  label: string;
  /** Short progress detail, e.g. "102/128 câu". */
  detail: string;
  met: boolean;
  /** 0–1 progress toward this criterion. Partial credit keeps the ring moving. */
  progress: number;
  cta: { label: string; href: string };
}

export interface Readiness {
  /** 0–100, rounded. Every criterion contributes an equal share. */
  percent: number;
  metCount: number;
  totalCount: number;
  /** Fixed order: foundations first, mock tests last. */
  criteria: ReadinessCriterion[];
  /** First unmet criterion in that order; null once everything is met. */
  next: ReadinessCriterion | null;
  ready: boolean;
}

export interface ReadinessSignals {
  civicsKnown: number;
  civicsTotal: number;
  whatmeanKnown: number;
  whatmeanTotal: number;
  yesnoKnown: number;
  yesnoTotal: number;
  mockResults: readonly MockResult[];
  sectionMockResults: readonly SectionMockResult[];
}

/**
 * Share of a skill's items that must be known. Deliberately the same bar the
 * dashboard hero uses to decide a learner is ready for a first mock — one
 * definition of "biết đủ rồi" across the whole app.
 */
export const KNOWN_THRESHOLD = FIRST_MOCK_MIN_PERCENT / 100;

/** How many of the most recent civics mocks must have passed. */
export const CIVICS_MOCK_PASS_STREAK = 2;

function knownCriterion(
  id: ReadinessCriterionId,
  skillLabel: string,
  known: number,
  total: number,
  ctaLabel: string,
  href: string,
): ReadinessCriterion {
  const target = total * KNOWN_THRESHOLD;
  const progress = target <= 0 ? 0 : Math.min(known / target, 1);
  return {
    id,
    label: `Thuộc ${FIRST_MOCK_MIN_PERCENT}% câu ${skillLabel}`,
    detail: `${known}/${total} câu`,
    met: progress >= 1,
    progress,
    cta: { label: ctaLabel, href },
  };
}

/** Passes among the most recent CIVICS_MOCK_PASS_STREAK mocks, chronologically. */
function recentMockPasses(mockResults: readonly MockResult[]): number {
  return [...mockResults]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .slice(-CIVICS_MOCK_PASS_STREAK)
    .filter((m) => m.passed).length;
}

export function deriveReadiness(s: ReadinessSignals): Readiness {
  const passes = recentMockPasses(s.mockResults);
  const writingPassed = s.sectionMockResults.some((m) => m.section === 'writing' && m.passed);

  const criteria: ReadinessCriterion[] = [
    knownCriterion('civics_known', 'Civics', s.civicsKnown, s.civicsTotal, 'Học Civics', '/flashcards?filter=unknown'),
    knownCriterion('whatmean_known', 'What Mean', s.whatmeanKnown, s.whatmeanTotal, 'Luyện What Mean', '/speaking/what-mean'),
    knownCriterion('yesno_known', 'Yes/No', s.yesnoKnown, s.yesnoTotal, 'Luyện Yes/No', '/speaking/yes-no'),
    {
      id: 'writing_mock',
      label: 'Đậu bài thi thử Viết',
      detail: writingPassed ? 'Đã đậu' : 'Chưa đậu',
      met: writingPassed,
      progress: writingPassed ? 1 : 0,
      cta: { label: 'Thi thử Viết', href: '/mock-test/viet' },
    },
    {
      id: 'civics_mock',
      label: `Đậu ${CIVICS_MOCK_PASS_STREAK} bài thi thử Civics gần nhất`,
      detail: `${passes}/${CIVICS_MOCK_PASS_STREAK} lần đậu`,
      met: passes >= CIVICS_MOCK_PASS_STREAK,
      progress: passes / CIVICS_MOCK_PASS_STREAK,
      cta: { label: 'Thi thử Civics', href: '/mock-test' },
    },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  return {
    percent: Math.round((criteria.reduce((sum, c) => sum + c.progress, 0) / criteria.length) * 100),
    metCount,
    totalCount: criteria.length,
    criteria,
    next: criteria.find((c) => !c.met) ?? null,
    ready: metCount === criteria.length,
  };
}
