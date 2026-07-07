// Phase 6B — "Huy hiệu tiếp theo" suggestion.
//
// Pure function: given the badge catalog, the set of earned slugs, and a
// snapshot of client-side progress counters, pick the unearned badge the
// user is closest to unlocking. Closeness = current/target ratio; ties
// (including everything we can't measure client-side, ratio 0) fall back
// to catalog sort_order.
//
// Ratios are approximations from client state — the server evaluators
// remain the source of truth for actual unlocks. NextBadgeProgress only
// snapshots civics-mock stats, so writing/yesno/whatmean/combo/secret
// badges (and anything needing cross-section or timeline data) get ratio 0
// and are only suggested when nothing measurable is in progress.

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
    case 'civics-first':
      return { current: p.distinctAnswered, target: 1 };
    case 'civics-10':
      return { current: p.distinctAnswered, target: 10 };
    case 'civics-30':
      return { current: p.distinctAnswered, target: 30 };
    case 'civics-50':
      return { current: p.distinctAnswered, target: 50 };
    case 'civics-100':
      return { current: p.distinctAnswered, target: 100 };
    case 'civics-128':
      return { current: p.distinctAnswered, target: 128 };
    case 'practice-exam-ready':
      return { current: Math.min(p.mockPassed, 1), target: 1 };
    case 'practice-mock-champion':
      return { current: p.mockPassed, target: 10 }; // approximation: civics-only passes, real badge spans all 3 mock types
    case 'practice-future-citizen':
      return { current: p.bestMockScore, target: 18 };
    case 'other-comeback':
      return {
        current: (p.mockPassed >= 1 ? 1 : 0) + (p.mockFailed >= 1 ? 1 : 0),
        target: 2,
      };
    default:
      return null; // writing/yesno/whatmean/combo/other/secret: not measurable from this snapshot
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
