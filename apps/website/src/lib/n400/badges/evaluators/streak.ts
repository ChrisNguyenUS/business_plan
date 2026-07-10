// Phase 6B — Streak badge evaluators (6 badges).
//
// Each evaluator answers: "Has the user ever reached a streak of N?"
// Streak badges are permanent achievements — once earned, never lost.
// So we compare against longest_streak (the all-time best), not
// current_streak (which resets when the user misses a day).
//
// For streak_change triggers (real-time), ctx.currentStreak is the new
// value at the moment of crossing — which is also the new longest if
// it crossed a milestone. For manual_recompute (catch-up), we read
// longest_streak from the DB to surface badges earned in the past.
//
// Idempotency lives at the DB level — n400_user_badges PK rejects the
// duplicate, dispatcher only surfaces newly-inserted slugs.

import type { BadgeEvaluator, BadgeContext, UnlockResult } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

const STREAK_BADGES: { slug: string; threshold: number }[] = [
  { slug: 'streak-3', threshold: 3 },
  { slug: 'streak-7', threshold: 7 },
  { slug: 'streak-14', threshold: 14 },
  { slug: 'streak-30', threshold: 30 },
  { slug: 'streak-60', threshold: 60 },
  { slug: 'streak-100', threshold: 100 },
];

async function readLongestStreak(
  userId: string,
  supabase: SupabaseClient,
): Promise<number> {
  const { data } = await supabase
    .from('n400_user_profile')
    .select('current_streak, longest_streak')
    .eq('user_id', userId)
    .maybeSingle();
  // Use the higher of current and longest — covers edge cases where
  // longest_streak wasn't backfilled but current is already high.
  return Math.max(
    Number(data?.longest_streak ?? 0),
    Number(data?.current_streak ?? 0),
  );
}

function makeEvaluator(slug: string, threshold: number): BadgeEvaluator {
  return async (
    userId: string,
    ctx: BadgeContext,
    supabase: SupabaseClient,
  ): Promise<UnlockResult | null> => {
    // For streak_change: ctx.currentStreak is the live value at the
    // moment of crossing (and the new longest). For manual_recompute:
    // read longest_streak from DB to catch past achievements.
    const streak =
      typeof ctx.currentStreak === 'number'
        ? ctx.currentStreak
        : await readLongestStreak(userId, supabase);
    if (streak < threshold) return null;
    return { slug, metadata: { streak } };
  };
}

export const streakEvaluators: Record<string, BadgeEvaluator> =
  Object.fromEntries(
    STREAK_BADGES.map(({ slug, threshold }) => [
      slug,
      makeEvaluator(slug, threshold),
    ]),
  );

