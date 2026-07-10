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
// longest_streak from the DB and reconstruct the historical date when
// each milestone was first reached by walking through attempt timestamps.
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

/**
 * Reconstruct daily activity from all attempt timestamps and find
 * the date when the streak first reached `threshold` consecutive days.
 */
async function dateWhenStreakReached(
  userId: string,
  threshold: number,
  supabase: SupabaseClient,
): Promise<string | undefined> {
  // Fetch timestamps from both civics and section attempts.
  const [civicsRes, sectionRes] = await Promise.all([
    supabase
      .from('n400_question_attempts')
      .select('answered_at, n400_quiz_attempts!inner(user_id)')
      .eq('n400_quiz_attempts.user_id', userId)
      .order('answered_at', { ascending: true }),
    supabase
      .from('n400_section_attempts')
      .select('answered_at')
      .eq('user_id', userId)
      .order('answered_at', { ascending: true }),
  ]);

  // Collect all timestamps and extract unique local dates (YYYY-MM-DD).
  const allTimestamps: string[] = [];
  for (const row of (civicsRes.data ?? []) as Array<{ answered_at: string }>) {
    allTimestamps.push(row.answered_at);
  }
  for (const row of (sectionRes.data ?? []) as Array<{ answered_at: string }>) {
    allTimestamps.push(row.answered_at);
  }
  if (allTimestamps.length === 0) return undefined;

  // Extract unique days (sorted ascending).
  const daySet = new Set<string>();
  for (const ts of allTimestamps) {
    daySet.add(ts.slice(0, 10)); // "YYYY-MM-DD"
  }
  const days = [...daySet].sort();

  // Walk through consecutive days and track streak.
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak++;
    } else {
      streak = 1;
    }
    if (streak >= threshold) {
      // Find the first timestamp on this day to use as unlocked_at.
      const day = days[i];
      const firstOnDay = allTimestamps
        .filter((ts) => ts.startsWith(day))
        .sort()[0];
      return firstOnDay ?? `${day}T00:00:00Z`;
    }
  }
  // Edge case: threshold === 1 is satisfied by the first day.
  if (threshold <= 1 && days.length > 0) {
    const firstOnDay = allTimestamps
      .filter((ts) => ts.startsWith(days[0]))
      .sort()[0];
    return firstOnDay ?? `${days[0]}T00:00:00Z`;
  }
  return undefined;
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

    // For manual_recompute, find the actual historical date.
    const unlockedAt =
      ctx.trigger === 'manual_recompute'
        ? await dateWhenStreakReached(userId, threshold, supabase)
        : undefined;

    return { slug, metadata: { streak }, unlockedAt };
  };
}

export const streakEvaluators: Record<string, BadgeEvaluator> =
  Object.fromEntries(
    STREAK_BADGES.map(({ slug, threshold }) => [
      slug,
      makeEvaluator(slug, threshold),
    ]),
  );


