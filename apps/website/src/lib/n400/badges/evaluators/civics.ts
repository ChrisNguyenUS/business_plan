// Gamification v2 — Civics progress badge evaluators (6 badges).
//
// "Answer N civics questions" = N distinct question_ids ever attempted
// (any mode), same distinct-count convention as the old all-128-answered
// evaluator. n400_question_attempts has no user_id column, so we join
// through n400_quiz_attempts.user_id.
//
// For manual_recompute, we compute the historical date when the Nth
// distinct question was first answered — so backfilled badges show
// the correct past date instead of today.

import type { BadgeEvaluator, BadgeContext } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

const CIVICS_BADGES: { slug: string; threshold: number }[] = [
  { slug: 'civics-first', threshold: 1 },
  { slug: 'civics-10', threshold: 10 },
  { slug: 'civics-30', threshold: 30 },
  { slug: 'civics-50', threshold: 50 },
  { slug: 'civics-100', threshold: 100 },
  { slug: 'civics-128', threshold: 128 },
];

export async function distinctCivicsAnswered(
  userId: string,
  supabase: SupabaseClient,
): Promise<number> {
  const { data } = await supabase
    .from('n400_question_attempts')
    .select('question_id, n400_quiz_attempts!inner(user_id)')
    .eq('n400_quiz_attempts.user_id', userId);
  const ids = new Set<number>();
  for (const row of (data ?? []) as Array<{ question_id: number }>) ids.add(row.question_id);
  return ids.size;
}

/**
 * Returns the timestamp at which the user first reached `threshold`
 * distinct civics questions answered. Used during manual_recompute to
 * set the historical unlocked_at date.
 */
async function dateWhenDistinctReached(
  userId: string,
  threshold: number,
  supabase: SupabaseClient,
): Promise<string | undefined> {
  const { data } = await supabase
    .from('n400_question_attempts')
    .select('question_id, answered_at, n400_quiz_attempts!inner(user_id)')
    .eq('n400_quiz_attempts.user_id', userId)
    .order('answered_at', { ascending: true });
  if (!data) return undefined;
  const seen = new Set<number>();
  for (const row of data as Array<{ question_id: number; answered_at: string }>) {
    seen.add(row.question_id);
    if (seen.size >= threshold) return row.answered_at;
  }
  return undefined;
}

function makeEvaluator(slug: string, threshold: number): BadgeEvaluator {
  return async (userId, ctx, supabase) => {
    const distinct = await distinctCivicsAnswered(userId, supabase);
    if (distinct < threshold) return null;
    // For manual_recompute, find the actual historical date.
    const unlockedAt =
      ctx.trigger === 'manual_recompute'
        ? await dateWhenDistinctReached(userId, threshold, supabase)
        : undefined;
    return { slug, metadata: { distinct }, triggerAttemptId: ctx.attemptId, unlockedAt };
  };
}

export const civicsEvaluators: Record<string, BadgeEvaluator> = Object.fromEntries(
  CIVICS_BADGES.map(({ slug, threshold }) => [slug, makeEvaluator(slug, threshold)]),
);

