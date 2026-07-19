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
// already exists. All hrefs are relative to the n400ready base (`/n400ready`).

import type { MockResult, SectionMockResult } from './storage';
import { FIRST_MOCK_MIN_PERCENT } from './hero-recommendation';
import type { N400Dict } from './i18n/vi';
import { tFormat } from './i18n/format';

export type ReadinessCriterionId =
  | 'civics_known'
  | 'whatmean_known'
  | 'yesno_known'
  | 'writing_known'
  | 'writing_mock'
  | 'speaking_mock'
  | 'civics_mock';

/** Mock criteria estimate in whole test sittings; known-criteria in items. */
export function isMockCriterion(id: ReadinessCriterionId): boolean {
  return id === 'writing_mock' || id === 'speaking_mock' || id === 'civics_mock';
}

export interface ReadinessCriterion {
  id: ReadinessCriterionId;
  /** Checklist row label, e.g. "Thuộc 80% câu Civics". */
  label: string;
  /**
   * The same goal phrased as the work left, e.g. "Học thêm 47 câu Civics" — what
   * the hero shows. Mock criteria have no count to phrase, so they reuse `label`.
   */
  milestone: string;
  /** Short progress detail, e.g. "102/128 câu". */
  detail: string;
  met: boolean;
  /** 0–1 progress toward this criterion. Partial credit keeps the ring moving. */
  progress: number;
  /**
   * Items still needed to MEET the criterion — not items left in the pool. A
   * learner who knows 56/128 civics needs 47 more to clear the 80% bar, not 72.
   * Mock criteria count in mocks (each mock is its own item). Never negative.
   */
  remaining: number;
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
  writingKnown: number;
  writingTotal: number;
  mockResults: readonly MockResult[];
  sectionMockResults: readonly SectionMockResult[];
}

/**
 * Share of a skill's items that must be known. Deliberately the same bar the
 * dashboard hero uses to decide a learner is ready for a first mock — one
 * definition of "biết đủ rồi" across the whole app.
 */
export const KNOWN_THRESHOLD = FIRST_MOCK_MIN_PERCENT / 100;

/**
 * How many of the most recent civics mocks must have passed. Note this makes a
 * lone passing mock read as half credit, same as two mocks with one failure —
 * intended: with a single attempt you haven't yet proven two consecutive passes.
 */
export const CIVICS_MOCK_PASS_STREAK = 2;

/**
 * Fallback pace: items a learner gets through in one sitting, used only until
 * `deriveLearningPace` has enough recent history to measure the real number.
 * Turns "47 câu nữa" into "2 – 3 buổi học nữa" on the hero — a motivating
 * unit, not a promise, so the estimate is always shown as a range.
 */
export const ITEMS_PER_SESSION = 25;

/**
 * How many more study sessions the criterion needs, as an inclusive range.
 * Null once it's met. A mock criterion IS one session, so it reports an exact
 * count rather than a range. `pace` is the learner's measured items-per-buổi
 * from `deriveLearningPace`; omitted (no recent history) it falls back to the
 * ITEMS_PER_SESSION default.
 */
export function estimateSessions(
  c: ReadinessCriterion,
  pace: number = ITEMS_PER_SESSION,
): { min: number; max: number } | null {
  if (c.remaining <= 0) return null;
  if (isMockCriterion(c.id)) {
    return { min: c.remaining, max: c.remaining };
  }
  const min = Math.ceil(c.remaining / pace);
  return { min, max: min + 1 };
}

// ── Learning pace ────────────────────────────────────────────────────────────
// "Buổi" is an ACTIVE day — a day with at least one graded answer — so an
// irregular schedule cannot corrupt the estimate: skipped days simply don't
// count, and the hero keeps promising buổi, never calendar dates.

/** A graded answer to one item, any skill. Flashcard self-grades never qualify. */
export interface VelocityEvent {
  /** Unique across skills, e.g. "civics:12" or "writing:wr-3". */
  itemKey: string;
  wasCorrect: boolean;
  at: string; // ISO datetime
}

/** Preferred window: current form, this week. */
export const PACE_RECENT_DAYS = 7;
/** Widened window for irregular learners with < 2 buổi this week. */
export const PACE_WINDOW_DAYS = 14;
/** One cram day is not a trend — a pace needs at least this many buổi. */
export const PACE_MIN_ACTIVE_DAYS = 2;
/**
 * Clamp bounds. The floor keeps a rough week from exploding the estimate into
 * a demotivating wall (and guards the divide when nothing new was mastered);
 * the ceiling keeps one heroic stretch from promising miracles.
 */
export const PACE_MIN = 5;
export const PACE_MAX = 40;

/** Pace over one window, or null when it has fewer than the minimum buổi. */
function windowPace(events: readonly VelocityEvent[], now: Date, days: number): number | null {
  const start = now.getTime() - days * 86_400_000;
  // Chronological replay: what was each item's standing before the window, and
  // where did it end up? Mastery here is the app-wide rule — last graded
  // answer correct.
  const sorted = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const masteredAtStart = new Map<string, boolean>();
  const lastOverall = new Map<string, VelocityEvent>();
  const activeDays = new Set<string>();
  for (const e of sorted) {
    if (new Date(e.at).getTime() < start) {
      masteredAtStart.set(e.itemKey, e.wasCorrect);
    } else {
      activeDays.add(e.at.slice(0, 10));
    }
    lastOverall.set(e.itemKey, e);
  }
  if (activeDays.size < PACE_MIN_ACTIVE_DAYS) return null;

  // Newly mastered = ends the window mastered without starting it mastered.
  // Re-answering an item known before the window is review, not progress.
  let newlyMastered = 0;
  for (const [key, e] of lastOverall) {
    if (new Date(e.at).getTime() < start) continue;
    if (e.wasCorrect && masteredAtStart.get(key) !== true) newlyMastered += 1;
  }
  return Math.min(Math.max(newlyMastered / activeDays.size, PACE_MIN), PACE_MAX);
}

/**
 * The learner's measured pace in items per buổi, for `estimateSessions`. Reads
 * the last 7 days when they hold at least 2 buổi, otherwise widens to 14 —
 * an irregular learner is judged over the longer stretch instead of being
 * treated as slow. Null when even 14 days lack 2 buổi (new learner, or back
 * from a break): the caller falls back to the ITEMS_PER_SESSION default.
 */
export function deriveLearningPace(events: readonly VelocityEvent[], now: Date = new Date()): number | null {
  return windowPace(events, now, PACE_RECENT_DAYS) ?? windowPace(events, now, PACE_WINDOW_DAYS);
}

function knownCriterion(
  id: ReadinessCriterionId,
  skillLabel: string,
  known: number,
  total: number,
  ctaLabel: string,
  href: string,
  t: N400Dict['readiness'],
): ReadinessCriterion {
  const target = total * KNOWN_THRESHOLD;
  const progress = target <= 0 ? 0 : Math.min(known / target, 1);
  // The bar is `known >= target` with target fractional (80% of 128 = 102.4),
  // so the first integer that clears it is ceil(target).
  const remaining = Math.max(0, Math.ceil(target) - known);
  return {
    id,
    label: tFormat(t.knownLabel, { percent: FIRST_MOCK_MIN_PERCENT, skillLabel }),
    milestone: tFormat(t.milestoneLabel, { remaining, skillLabel }),
    detail: tFormat(t.detailLabel, { known, total }),
    met: progress >= 1,
    progress,
    remaining,
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

/**
 * The most recent mock for one section, chronologically. "Đậu thi thử" for a
 * section means the LATEST attempt passed — same recency rule as the civics
 * criterion. An old pass must not survive a newer failure, or the checklist
 * row contradicts the Kết quả thi thử panel, which always shows the latest
 * attempt. Both sections record from the standalone mocks AND from the
 * matching part of the full interview, so a full interview counts here too.
 */
function latestSectionMock(
  results: readonly SectionMockResult[],
  section: SectionMockResult['section'],
): SectionMockResult | null {
  return (
    [...results]
      .filter((m) => m.section === section)
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .at(-1) ?? null
  );
}

export function deriveReadiness(s: ReadinessSignals, dict: N400Dict): Readiness {
  const t = dict.readiness;
  const passes = recentMockPasses(s.mockResults);
  const lastWriting = latestSectionMock(s.sectionMockResults, 'writing');
  const writingPassed = lastWriting?.passed ?? false;
  const lastSpeaking = latestSectionMock(s.sectionMockResults, 'speaking');
  const speakingPassed = lastSpeaking?.passed ?? false;

  const criteria: ReadinessCriterion[] = [
    // The civics CTA lands on the skill hub, not /flashcards: "thuộc" only
    // moves through graded answers, and the hub offers both the deck to learn
    // and the practice mode to prove — same target as the SkillsCard row.
    knownCriterion('civics_known', t.skillLabels.civics, s.civicsKnown, s.civicsTotal, t.cta.civics, '/study/civics', t),
    knownCriterion('whatmean_known', t.skillLabels.whatmean, s.whatmeanKnown, s.whatmeanTotal, t.cta.whatmean, '/speaking/what-mean', t),
    knownCriterion('yesno_known', t.skillLabels.yesno, s.yesnoKnown, s.yesnoTotal, t.cta.yesno, '/speaking/yes-no', t),
    // The writing mock samples only 3 random sentences per attempt (pass = 1
    // correct), so it can never prove pool coverage — this criterion is what
    // guarantees the learner has written every topic correctly in practice.
    knownCriterion('writing_known', t.skillLabels.writing, s.writingKnown, s.writingTotal, t.cta.writing, '/writing', t),
    {
      id: 'writing_mock',
      label: t.writingMockLabel,
      milestone: t.writingMockLabel,
      detail: writingPassed ? t.statusPassed : lastWriting ? t.statusFailed : t.statusNotTaken,
      met: writingPassed,
      progress: writingPassed ? 1 : 0,
      remaining: writingPassed ? 0 : 1,
      cta: { label: t.cta.writingMock, href: '/mock-test/viet' },
    },
    {
      id: 'speaking_mock',
      label: t.speakingMockLabel,
      milestone: t.speakingMockLabel,
      detail: speakingPassed ? t.statusPassed : lastSpeaking ? t.statusFailed : t.statusNotTaken,
      met: speakingPassed,
      progress: speakingPassed ? 1 : 0,
      remaining: speakingPassed ? 0 : 1,
      cta: { label: t.cta.speakingMock, href: '/mock-test/speaking' },
    },
    {
      id: 'civics_mock',
      label: tFormat(t.civicsMockLabel, { streak: CIVICS_MOCK_PASS_STREAK }),
      milestone: tFormat(t.civicsMockLabel, { streak: CIVICS_MOCK_PASS_STREAK }),
      detail: tFormat(t.civicsMockDetail, { passes, streak: CIVICS_MOCK_PASS_STREAK }),
      met: passes >= CIVICS_MOCK_PASS_STREAK,
      progress: passes / CIVICS_MOCK_PASS_STREAK,
      remaining: Math.max(0, CIVICS_MOCK_PASS_STREAK - passes),
      cta: { label: t.cta.civicsMock, href: '/mock-test' },
    },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const ready = metCount === criteria.length;

  const rawPercent = Math.round((criteria.reduce((sum, c) => sum + c.progress, 0) / criteria.length) * 100);
  // `percent` and `met` read the same progress values by different paths: this
  // is a rounded average, while `met` demands progress >= 1 exactly. So the
  // average can round up to 100 while a criterion is still short (e.g. 100/128
  // civics known with the rest done). `ready` is the truth; never let the ring
  // claim 100 next to a "việc tiếp theo" CTA — cap at 99 until all seven are met.
  const percent = ready ? 100 : Math.min(rawPercent, 99);

  return {
    percent,
    metCount,
    totalCount: criteria.length,
    criteria,
    next: criteria.find((c) => !c.met) ?? null,
    ready,
  };
}
