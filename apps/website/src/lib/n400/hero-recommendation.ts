// Intent-based hero recommendation for the dashboard. Instead of always
// showing "question #N of 128", the hero answers one question — "What action
// creates the highest learning value right now?" — by walking a fixed
// priority ladder over the user's learning state:
//
//   1. start_civics     brand-new account, nothing attempted yet
//   2. review_mistakes  fresh mock-test wrongs (≤72h) not yet re-answered right
//   3. goal_complete    all daily goals done → convert momentum into a mock
//   4. first_mock       civics coverage ≥80% but never took a mock (diagnostic)
//   5. stale_section    a Speaking/Writing skill went cold ≥7 days
//   6. finish_civics    ≤20 unseen civics left → sprint to the finish line
//   7. continue_civics  default
//
// Pure module: the dashboard derives the signals and renders the result.
// All hrefs are relative to the n400ready base (`/n400ready`).

import type { QuestionAttempt, MockResult } from './storage';
import type { SectionAttempt, SectionKey } from './section-progress';
import type { N400Dict } from './i18n/vi';
import { tFormat } from './i18n/format';

export type HeroIntent =
  | 'filing_checklist'
  | 'interview_mode'
  | 'start_civics'
  | 'review_mistakes'
  | 'goal_complete'
  | 'first_mock'
  | 'stale_section'
  | 'finish_civics'
  | 'continue_civics';

export interface HeroCta {
  label: string;
  href: string; // relative to the n400ready base
}

export interface HeroRecommendation {
  intent: HeroIntent;
  emoji: string;
  title: string;
  subtitle: string;
  cta: HeroCta;
  secondary: HeroCta;
}

export interface HeroSignals {
  now: Date;
  civicsSeen: number;
  civicsTotal: number;
  attempts: readonly QuestionAttempt[];
  mockResults: readonly MockResult[];
  sectionAttempts: readonly SectionAttempt[];
  goalsDone: number;
  goalsTotal: number;
  /** G2 growth intent tier — journey stage from profiling answers. Pass only
      when the growth_engine flag is on for this user; undefined/null leaves
      the behavior ladder untouched. */
  journeyStage?: 'exploring' | 'preparing' | 'filed' | 'waiting_interview' | 'interview_scheduled' | null;
  /** ISO date (yyyy-mm-dd) when known. */
  interviewDate?: string | null;
  /** G3c — filing_checklist flag is on for this user (the route is live).
      The tier must stand down when the destination would bounce. */
  checklistEnabled?: boolean;
  /** G3c — every checklist item ticked on this device (checklist-storage).
      Device-local is fine for a hero: worst case the nudge reappears on a
      second device, and it is one tap to stand down again. */
  checklistDone?: boolean;
}

export const MOCK_REVIEW_WINDOW_HOURS = 72;
export const STALE_SECTION_DAYS = 7;
export const FINISH_CIVICS_THRESHOLD = 20;
export const FIRST_MOCK_MIN_PERCENT = 80;

const DAY_MS = 86_400_000;

// Ordered by nudge priority when staleness ties: Writing is graded hardest in
// the real interview, so it wins over the two speaking drills. Labels are
// feature names (Writing / Yes-No / What Mean) — identical in both locales.
const SECTION_META: { key: SectionKey; label: string; emoji: string; href: string }[] = [
  { key: 'writing', label: 'Writing', emoji: '✍️', href: '/writing' },
  { key: 'yesno', label: 'Yes / No', emoji: '🗣️', href: '/speaking/yes-no' },
  { key: 'whatmean', label: 'What Mean', emoji: '🗣️', href: '/speaking/what-mean' },
];

/**
 * Question ids the user got wrong in their most recent mock test (within the
 * review window) and has not answered correctly since. Order follows the mock.
 * Shared by the dashboard hero and the practice `?start=review` deep link so
 * both always agree on what "review wrong answers" means.
 */
export function pendingMockReviewIds(
  mockResults: readonly MockResult[],
  attempts: readonly QuestionAttempt[],
  now: Date,
): number[] {
  if (mockResults.length === 0) return [];
  const latest = [...mockResults].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  )[mockResults.length - 1];
  const completedAt = new Date(latest.completedAt).getTime();
  if (now.getTime() - completedAt > MOCK_REVIEW_WINDOW_HOURS * 3_600_000) return [];

  const wrong: number[] = [];
  for (const r of latest.questionResults) {
    if (!r.wasCorrect && !wrong.includes(r.questionId)) wrong.push(r.questionId);
  }
  if (wrong.length === 0) return [];

  // Cleared when the LAST graded attempt after the mock is correct — a later
  // wrong answer re-opens the question. Flashcard self-grades are recognition,
  // not retrieval, so they cannot pay down mock-review debt (spec D1).
  const lastAfterMock = new Map<number, boolean>();
  for (const a of attempts) {
    if (a.mode === 'flashcard') continue;
    if (new Date(a.at).getTime() > completedAt) lastAfterMock.set(a.questionId, a.wasCorrect);
  }
  return wrong.filter((id) => lastAfterMock.get(id) !== true);
}

interface StaleSection {
  key: SectionKey;
  label: string;
  emoji: string;
  href: string;
  /** Days since the last attempt; null when the section was never started. */
  days: number | null;
}

function findStalestSection(
  sectionAttempts: readonly SectionAttempt[],
  now: Date,
  civicsSeen: number,
  civicsTotal: number,
): StaleSection | null {
  const lastAt = new Map<SectionKey, number>();
  for (const a of sectionAttempts) {
    const t = new Date(a.at).getTime();
    if (t > (lastAt.get(a.section) ?? 0)) lastAt.set(a.section, t);
  }
  // Never-started sections only become a nudge once the user is clearly
  // invested in the app (half of civics seen) — a brand-new user should not
  // be pushed sideways before building a core habit.
  const nudgeUnstarted = civicsTotal > 0 && civicsSeen >= Math.ceil(civicsTotal / 2);

  let best: StaleSection | null = null;
  let bestScore = 0;
  for (const meta of SECTION_META) {
    const last = lastAt.get(meta.key);
    if (last === undefined) {
      if (!nudgeUnstarted) continue;
      // Unstarted ranks at the threshold, so a genuinely stale started
      // section (bigger day count) always wins over it.
      if (best === null || STALE_SECTION_DAYS > bestScore) {
        best = { ...meta, days: null };
        bestScore = STALE_SECTION_DAYS;
      }
      continue;
    }
    const days = Math.floor((now.getTime() - last) / DAY_MS);
    if (days < STALE_SECTION_DAYS) continue;
    if (days > bestScore) {
      best = { ...meta, days };
      bestScore = days;
    }
  }
  return best;
}

/**
 * Growth intent tier (spec §3.4) — sits ABOVE the behavior ladder: what the
 * user TOLD us about their journey outranks what their practice data implies.
 * Ordered by `priority` descending, first match wins. Lazy by construction:
 * `match` runs only until one returns non-null.
 *
 * Priority scale is shared with n400_cta_definitions.priority (100 = final
 * review, 90 = interview imminent, 80 = mock-ready…). G3 appends rows here —
 * do not reintroduce inline if-branches.
 */
export interface GrowthIntentTier {
  priority: number;
  match: (
    signals: HeroSignals,
    dict: N400Dict,
  ) => HeroRecommendation | null;
}

export const GROWTH_INTENT_TIERS: GrowthIntentTier[] = [
  {
    // 90 — the user told us the interview is scheduled. The dashboard flips to
    // interview-priority mode immediately: this is the visible reward for
    // answering the profiling question.
    priority: 90,
    match: (signals: HeroSignals, dict: N400Dict): HeroRecommendation | null => {
      if (signals.journeyStage !== 'interview_scheduled') return null;
      const t = dict.heroRec;
      const days = signals.interviewDate
        ? Math.max(
            0,
            Math.ceil(
              (new Date(signals.interviewDate).getTime() - signals.now.getTime()) / DAY_MS,
            ),
          )
        : null;
      return {
        intent: 'interview_mode',
        emoji: '🔥',
        title:
          days !== null
            ? tFormat(t.intent.interviewMode.titleWithDays, { days })
            : t.intent.interviewMode.title,
        subtitle: t.intent.interviewMode.subtitle,
        cta: { label: t.cta.takeMockTest, href: '/mock-test' },
        secondary: { label: t.intent.interviewMode.secondary, href: '/speaking/yes-no' },
      };
    },
  },
  {
    // 70 — the user told us they haven't filed yet (journey_stage 'preparing').
    // The immediate L3 reward (spec §3.4 filed=not_yet) is the checklist
    // recommendation; the capped, dismissible S10 CTA covers later visits.
    priority: 70,
    match: (signals: HeroSignals, dict: N400Dict): HeroRecommendation | null => {
      if (!signals.checklistEnabled || signals.checklistDone) return null;
      if (signals.journeyStage !== 'preparing') return null;
      const t = dict.heroRec;
      return {
        intent: 'filing_checklist',
        emoji: '📋',
        title: t.intent.checklist.title,
        subtitle: t.intent.checklist.subtitle,
        cta: { label: t.cta.openChecklist, href: '/filing-checklist' },
        secondary: { label: t.cta.continueCivics, href: '/flashcards?filter=unknown' },
      };
    },
  },
].sort((a, b) => b.priority - a.priority);

export function recommendDailyHero(signals: HeroSignals, dict: N400Dict): HeroRecommendation {
  for (const tier of GROWTH_INTENT_TIERS) {
    const hit = tier.match(signals, dict);
    if (hit) return hit;
  }

  const {
    now,
    civicsSeen,
    civicsTotal,
    attempts,
    mockResults,
    sectionAttempts,
    goalsDone,
    goalsTotal,
  } = signals;
  const remaining = Math.max(civicsTotal - civicsSeen, 0);
  const percent = civicsTotal === 0 ? 0 : (civicsSeen / civicsTotal) * 100;
  const t = dict.heroRec;

  const continueCivicsCta: HeroCta = { label: t.cta.continueCivics, href: '/flashcards?filter=unknown' };
  const pickCategoryCta: HeroCta = { label: t.cta.pickCategory, href: '/categories' };

  // 1. Brand-new account — one clear entry point, no branching choices.
  if (attempts.length === 0 && sectionAttempts.length === 0 && mockResults.length === 0) {
    return {
      intent: 'start_civics',
      emoji: '🇺🇸',
      title: t.intent.startCivics.title,
      subtitle: tFormat(t.intent.startCivics.subtitle, { civicsTotal }),
      cta: { label: dict.common.cta.startLearning, href: '/flashcards?filter=unknown' },
      secondary: pickCategoryCta,
    };
  }

  // 2. Fresh mock-test mistakes beat everything: error correction right after
  // a test is the highest-retention moment in the whole loop.
  const reviewIds = pendingMockReviewIds(mockResults, attempts, now);
  if (reviewIds.length > 0) {
    return {
      intent: 'review_mistakes',
      emoji: '📖',
      title: tFormat(t.intent.reviewMistakes.title, { n: reviewIds.length }),
      subtitle: t.intent.reviewMistakes.subtitle,
      cta: { label: dict.common.reviewWrongAnswers, href: '/practice?start=review' },
      secondary: continueCivicsCta,
    };
  }

  // 3. Daily goals done — celebrate, then convert the momentum into a mock.
  if (goalsTotal > 0 && goalsDone >= goalsTotal) {
    return {
      intent: 'goal_complete',
      emoji: '🎉',
      title: t.intent.goalComplete.title,
      subtitle: t.intent.goalComplete.subtitle,
      cta: { label: t.cta.takeMockTest, href: '/mock-test' },
      secondary: { label: t.intent.goalComplete.secondary, href: '/progress' },
    };
  }

  // 4. High coverage but never mocked — a first mock is the best diagnostic
  // and feeds the review_mistakes loop above.
  if (mockResults.length === 0 && percent >= FIRST_MOCK_MIN_PERCENT) {
    return {
      intent: 'first_mock',
      emoji: '🚀',
      title: t.intent.firstMock.title,
      subtitle: tFormat(t.intent.firstMock.subtitle, { civicsSeen, civicsTotal }),
      cta: { label: t.cta.takeMockTest, href: '/mock-test' },
      secondary: continueCivicsCta,
    };
  }

  // 5. A required interview skill went cold.
  const stale = findStalestSection(sectionAttempts, now, civicsSeen, civicsTotal);
  if (stale) {
    return {
      intent: 'stale_section',
      emoji: stale.emoji,
      title:
        stale.days === null
          ? tFormat(t.intent.staleSection.neverStartedTitle, { label: stale.label })
          : tFormat(t.intent.staleSection.staleTitle, { days: stale.days, label: stale.label }),
      subtitle: t.intent.staleSection.subtitle,
      cta: { label: tFormat(t.intent.staleSection.cta, { label: stale.label }), href: stale.href },
      secondary: continueCivicsCta,
    };
  }

  // 6. Sprint to the civics finish line.
  if (remaining > 0 && remaining <= FINISH_CIVICS_THRESHOLD) {
    return {
      intent: 'finish_civics',
      emoji: '🇺🇸',
      title: tFormat(t.intent.finishCivics.title, { remaining }),
      subtitle: tFormat(t.intent.finishCivics.subtitle, { civicsTotal }),
      cta: { label: dict.common.cta.continueLearning, href: '/flashcards?filter=unknown' },
      secondary: pickCategoryCta,
    };
  }

  // 7. Default: keep going where you left off.
  if (remaining === 0) {
    return {
      intent: 'continue_civics',
      emoji: '📚',
      title: tFormat(t.intent.continueCivics.allSeenTitle, { civicsTotal }),
      subtitle: tFormat(t.intent.continueCivics.allSeenSubtitle, { civicsTotal }),
      cta: { label: t.intent.continueCivics.allSeenCta, href: '/flashcards' },
      secondary: pickCategoryCta,
    };
  }
  return {
    intent: 'continue_civics',
    emoji: '📚',
    title: t.intent.continueCivics.title,
    subtitle: tFormat(t.intent.continueCivics.subtitle, { remaining, civicsTotal }),
    cta: { label: dict.common.cta.continueLearning, href: '/flashcards?filter=unknown' },
    secondary: pickCategoryCta,
  };
}
