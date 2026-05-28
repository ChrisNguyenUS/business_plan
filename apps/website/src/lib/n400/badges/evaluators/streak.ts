// Phase 6B — Streak badge evaluators (6 badges).
//
// Each evaluator answers a single question: "Is the user's current_streak
// at or above N right now?" If yes, it returns the slug. The dispatcher
// runs all 6 on every streak_change trigger (and on manual_recompute).
//
// Idempotency lives at the DB level — n400_user_badges PK rejects the
// duplicate, dispatcher only surfaces newly-inserted slugs. So an
// evaluator that returns the same slug forever after the first hit is
// fine.
//
// Performance: when ctx.currentStreak is provided (every streak_change
// trigger sets it), we skip the SELECT entirely — six in-memory
// comparisons. The fallback SELECT runs once for manual_recompute.

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

async function readCurrentStreak(
  userId: string,
  supabase: SupabaseClient,
): Promise<number> {
  const { data } = await supabase
    .from('n400_user_profile')
    .select('current_streak')
    .eq('user_id', userId)
    .maybeSingle();
  return Number(data?.current_streak ?? 0);
}

function makeEvaluator(slug: string, threshold: number): BadgeEvaluator {
  return async (
    userId: string,
    ctx: BadgeContext,
    supabase: SupabaseClient,
  ): Promise<UnlockResult | null> => {
    const streak =
      typeof ctx.currentStreak === 'number'
        ? ctx.currentStreak
        : await readCurrentStreak(userId, supabase);
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
