// Phase 6B — "Huy hiệu tiếp theo" suggestion.
//
// Pure function: given the badge catalog, the set of earned slugs, and a
// snapshot of client-side progress counters, pick the unearned badge the
// user is closest to unlocking. Closeness = current/target ratio; ties
// (including everything we can't measure client-side, ratio 0) fall back
// to catalog sort_order.
//
// Ratios are approximations from client state — the server evaluators
// remain the source of truth for actual unlocks. Badges whose criteria
// can't be derived from client state (volume/sessions, category,
// mock-perfect) get ratio 0 and are only suggested when nothing
// measurable is in progress.

import type { BadgeMeta } from '../use-badges';

export interface NextBadgeProgress {
  currentStreak: number;
  distinctAnswered: number; // distinct questions attempted, of 128
  correctCount: number; // correct answers (any mode)
  flashcardsKnown: number; // questions currently marked known in flashcard mode
  mockPassed: number; // passed mock attempts
  mockFailed: number; // failed mock attempts
  bestMockScore: number; // highest mock score, 0 when none
}

export interface NextBadgeSuggestion {
  badge: BadgeMeta;
  /** 0..1 fraction toward unlock; 0 when not measurable client-side. */
  ratio: number;
  /** current/target counters when the criterion is measurable. */
  current?: number;
  target?: number;
}

const STREAK_TARGETS: Record<string, number> = {
  'streak-3': 3,
  'streak-7': 7,
  'streak-14': 14,
  'streak-30': 30,
  'streak-60': 60,
  'streak-100': 100,
};

function progressFor(
  slug: string,
  p: NextBadgeProgress,
): { current: number; target: number } | null {
  const streakTarget = STREAK_TARGETS[slug];
  if (streakTarget) return { current: p.currentStreak, target: streakTarget };
  switch (slug) {
    case 'all-128-answered':
      return { current: p.distinctAnswered, target: 128 };
    case 'correct-answers-100':
      return { current: p.correctCount, target: 100 };
    case 'flashcards-mastery':
      return { current: p.flashcardsKnown, target: 100 };
    case 'mock-pass-first':
      return { current: Math.min(p.mockPassed, 1), target: 1 };
    case 'mock-pass-five':
      return { current: p.mockPassed, target: 5 };
    case 'mock-high-score':
      return { current: p.bestMockScore, target: 18 };
    case 'mock-comeback':
      return {
        current: (p.mockPassed >= 1 ? 1 : 0) + (p.mockFailed >= 1 ? 1 : 0),
        target: 2,
      };
    default:
      return null; // sessions/volume, category, mock-perfect: not measurable client-side
  }
}

export function pickNextBadge(
  catalog: BadgeMeta[],
  earnedSlugs: Set<string>,
  progress: NextBadgeProgress,
): NextBadgeSuggestion | null {
  let best: NextBadgeSuggestion | null = null;
  for (const badge of catalog) {
    if (earnedSlugs.has(badge.slug)) continue;
    const counters = progressFor(badge.slug, progress);
    const ratio = counters
      ? Math.min(Math.max(counters.current / counters.target, 0), 1)
      : 0;
    const candidate: NextBadgeSuggestion = {
      badge,
      ratio,
      ...(counters ?? {}),
    };
    if (
      !best ||
      candidate.ratio > best.ratio ||
      (candidate.ratio === best.ratio && badge.sort_order < best.badge.sort_order)
    ) {
      best = candidate;
    }
  }
  return best;
}
