// Study-page logic (the "Learning Launcher"). The Study page has ONE job:
// help the user pick and enter a learning module fast. It never repeats the
// dashboard's overall-progress hero or "continue learning" recommendation.
//
// Two pure concerns live here:
//   1. Smart status badge + CTA per module — exactly ONE badge each.
//   2. A single personalized tip strip at the bottom.
//
// The recommendation engine highlights ONE module but NEVER reorders the
// cards (fixed civics → what-mean → yes/no → writing order preserves muscle
// memory). All hrefs are relative to the n400ready base (`/n400ready`).

import type { N400Dict } from './i18n/vi';
import { tFormat } from './i18n/format';

export type StudyModuleId = 'civics' | 'whatmean' | 'yesno' | 'writing';

export type StudyBadgeKind =
  | 'recommended'
  | 'continue'
  | 'needs-practice'
  | 'completed'
  | 'new';

export interface StudyModuleSignal {
  id: StudyModuleId;
  /** Distinct items the user has seen/answered. */
  done: number;
  /** Total items in the module. */
  total: number;
  /**
   * Graded attempts (correct + wrong): practice and mock only. Flashcard
   * self-grades are NOT attempts (spec D1) — counting a "Mastered" tap as a
   * correct answer would make a learner who never practises look flawless and
   * never get flagged weak.
   */
  gradedAttempts: number;
  /** Of those graded attempts, how many were correct. */
  correctAttempts: number;
}

export interface StudyModuleDecision {
  badge: StudyBadgeKind;
  /** Verb fixed by state: Start learning | Continue learning | Practice now | Review again. */
  ctaLabel: string;
}

// A module is "Needs Practice" only with enough evidence — a couple of wrong
// answers on a brand-new module shouldn't brand it as weak.
export const NEEDS_PRACTICE_MAX_ACCURACY = 70;
export const NEEDS_PRACTICE_MIN_ATTEMPTS = 3;

export function modulePercent(sig: Pick<StudyModuleSignal, 'done' | 'total'>): number {
  return sig.total === 0 ? 0 : Math.round((sig.done / sig.total) * 100);
}

/** Accuracy 0–100, or null when the module has no graded attempts yet. */
export function moduleAccuracy(
  sig: Pick<StudyModuleSignal, 'gradedAttempts' | 'correctAttempts'>,
): number | null {
  return sig.gradedAttempts === 0
    ? null
    : Math.round((sig.correctAttempts / sig.gradedAttempts) * 100);
}

function isComplete(sig: StudyModuleSignal): boolean {
  return sig.total > 0 && sig.done >= sig.total;
}

/**
 * Which module deserves the spotlight. Principle: "finish what you're closest
 * to completing." We pick the started-but-incomplete module with the highest
 * completion; ties fall to array order (civics leads). This never changes the
 * card order — only which card gets the ⭐ badge and a stronger frame.
 */
export function pickRecommendedModule(signals: readonly StudyModuleSignal[]): StudyModuleId | null {
  if (signals.length === 0) return null;

  const startedIncomplete = signals.filter((s) => s.done > 0 && !isComplete(s));
  if (startedIncomplete.length > 0) {
    return startedIncomplete.reduce((best, s) =>
      modulePercent(s) > modulePercent(best) ? s : best,
    ).id;
  }

  // Nobody in progress → nudge the first unstarted module (array order).
  const unstarted = signals.find((s) => !isComplete(s));
  if (unstarted) return unstarted.id;

  // Everything is complete → review the core module.
  return signals[0].id;
}

type StudyStateBadge = Exclude<StudyBadgeKind, 'recommended'>;

// CTA verb by module state — the "recommended" badge never changes the verb,
// it only changes the card's frame/⭐.
function ctaByState(dict: N400Dict): Record<StudyStateBadge, string> {
  return {
    completed: dict.common.cta.reviewAgain,
    new: dict.common.cta.startLearning,
    'needs-practice': dict.common.cta.practiceNow,
    continue: dict.common.cta.continueLearning,
  };
}

function decideStateBadge(sig: StudyModuleSignal): StudyStateBadge {
  if (isComplete(sig)) return 'completed';
  if (sig.done === 0) return 'new';

  const acc = moduleAccuracy(sig);
  if (
    acc !== null &&
    sig.gradedAttempts >= NEEDS_PRACTICE_MIN_ATTEMPTS &&
    acc < NEEDS_PRACTICE_MAX_ACCURACY
  ) {
    return 'needs-practice';
  }
  return 'continue';
}

/** The single badge + CTA for one card. Order encodes badge priority. */
export function decideModuleBadge(
  sig: StudyModuleSignal,
  isRecommended: boolean,
  dict: N400Dict,
): StudyModuleDecision {
  const state = decideStateBadge(sig);
  return {
    badge: isRecommended ? 'recommended' : state,
    ctaLabel: ctaByState(dict)[state],
  };
}

// ─── Personalized tip strip ──────────────────────────────────────────────

export interface StudyTip {
  line1: string;
  line2: string;
  /** Relative to the n400ready base. */
  href: string;
}

export interface StudyTipSignals {
  /**
   * Module with the most wrong-unreviewed items (graded modes only).
   * `href` must point at that module's review session deep link
   * (`/practice?start=wrongs` for civics, `<hub>?start=wrongs` for sections).
   */
  topWrongModule: { id: StudyModuleId; label: string; count: number; href: string } | null;
  /** Weakest civics category per recommendWeakCategory; null when none qualifies. */
  weakCategory: { label: string } | null;
  /** Lowest-accuracy started module. */
  lowestModule: { label: string; accuracy: number; href: string } | null;
  /** Lowest-coverage incomplete module; only set once the user has started something. */
  lowestCoverage: { label: string; done: number; total: number; href: string } | null;
}

export const TIP_MIN_WRONGS = 3;
export const TIP_REVIEW_CHUNK = 10;

/**
 * One dynamic tip — "fix mistakes first, then expand". The dashboard hero owns
 * the journey nudges (stale skills, civics sprint, mock tests); this ladder
 * only diagnoses weaknesses inside the study modules: pay down wrong-answer
 * debt → drill the weak civics topic → lift the lowest accuracy → expand
 * coverage. Debt is offered as a ≤10-question chunk; the total is never shown.
 */
export function buildStudyTip(s: StudyTipSignals, dict: N400Dict): StudyTip {
  const t = dict.modules.tip;
  if (s.topWrongModule && s.topWrongModule.count >= TIP_MIN_WRONGS) {
    const n = Math.min(s.topWrongModule.count, TIP_REVIEW_CHUNK);
    return {
      line1: tFormat(t.topWrong.line1, { n, label: s.topWrongModule.label }),
      line2: t.topWrong.line2,
      href: s.topWrongModule.href,
    };
  }
  if (s.weakCategory) {
    return {
      line1: tFormat(t.weakCategory.line1, { label: s.weakCategory.label }),
      line2: t.weakCategory.line2,
      href: '/practice?start=weak',
    };
  }
  if (s.lowestModule) {
    return {
      line1: tFormat(t.lowestAccuracy.line1, { label: s.lowestModule.label, accuracy: s.lowestModule.accuracy }),
      line2: t.lowestAccuracy.line2,
      href: s.lowestModule.href,
    };
  }
  if (s.lowestCoverage) {
    return {
      line1: tFormat(t.lowestCoverage.line1, {
        label: s.lowestCoverage.label,
        done: s.lowestCoverage.done,
        total: s.lowestCoverage.total,
      }),
      line2: t.lowestCoverage.line2,
      href: s.lowestCoverage.href,
    };
  }
  return {
    line1: t.fallback.line1,
    line2: t.fallback.line2,
    href: '/study/civics',
  };
}
