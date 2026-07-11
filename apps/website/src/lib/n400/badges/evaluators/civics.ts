// Gamification v2 — Civics progress badge evaluators (6 badges).
//
// "Answer N civics questions" = N distinct question_ids ever attempted
// (any mode), same distinct-count convention as the old all-128-answered
// evaluator. n400_question_attempts has no user_id column, so we join
// through n400_quiz_attempts.user_id.
//
// All six evaluators (plus combo/other/mock-shared consumers) derive from
// one per-run-cached fetch of the user's civics attempt rows, ordered
// ascending — see loadCivicsAttemptRows. Distinct counts, last-wins
// correctness maps, and "date when Nth distinct question was reached"
// (manual_recompute backfill dates) are all computed in memory from it.

import type { BadgeEvaluator, BadgeContext } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cached } from './run-cache';

const CIVICS_BADGES: { slug: string; threshold: number }[] = [
  { slug: 'civics-first', threshold: 1 },
  { slug: 'civics-10', threshold: 10 },
  { slug: 'civics-30', threshold: 30 },
  { slug: 'civics-50', threshold: 50 },
  { slug: 'civics-100', threshold: 100 },
  { slug: 'civics-128', threshold: 128 },
];

export interface CivicsAttemptRow {
  question_id: number;
  was_correct: boolean;
  answered_at: string;
}

export function loadCivicsAttemptRows(
  userId: string,
  ctx: BadgeContext,
  supabase: SupabaseClient,
): Promise<CivicsAttemptRow[]> {
  return cached(ctx, `civics-rows:${userId}`, async () => {
    const { data } = await supabase
      .from('n400_question_attempts')
      .select('question_id, was_correct, answered_at, n400_quiz_attempts!inner(user_id)')
      .eq('n400_quiz_attempts.user_id', userId)
      .order('answered_at', { ascending: true });
    return (data ?? []) as unknown as CivicsAttemptRow[];
  });
}

export async function distinctCivicsAnswered(
  userId: string,
  ctx: BadgeContext,
  supabase: SupabaseClient,
): Promise<number> {
  const rows = await loadCivicsAttemptRows(userId, ctx, supabase);
  const ids = new Set<number>();
  for (const row of rows) ids.add(row.question_id);
  return ids.size;
}

/**
 * Returns the timestamp at which the user first reached `threshold`
 * distinct civics questions answered. Used during manual_recompute to
 * set the historical unlocked_at date. Rows are already ordered ascending.
 */
function dateWhenDistinctReached(rows: CivicsAttemptRow[], threshold: number): string | undefined {
  const seen = new Set<number>();
  for (const row of rows) {
    seen.add(row.question_id);
    if (seen.size >= threshold) return row.answered_at;
  }
  return undefined;
}

function makeEvaluator(slug: string, threshold: number): BadgeEvaluator {
  return async (userId, ctx, supabase) => {
    const rows = await loadCivicsAttemptRows(userId, ctx, supabase);
    const distinctIds = new Set<number>();
    for (const row of rows) distinctIds.add(row.question_id);
    const distinct = distinctIds.size;
    if (distinct < threshold) return null;
    // For manual_recompute, find the actual historical date.
    const unlockedAt =
      ctx.trigger === 'manual_recompute' ? dateWhenDistinctReached(rows, threshold) : undefined;
    return { slug, metadata: { distinct }, triggerAttemptId: ctx.attemptId, unlockedAt };
  };
}

export const civicsEvaluators: Record<string, BadgeEvaluator> = Object.fromEntries(
  CIVICS_BADGES.map(({ slug, threshold }) => [slug, makeEvaluator(slug, threshold)]),
);
