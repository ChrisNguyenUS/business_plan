// Gamification v2 — shared helper for the Writing/Yes-No/What Mean badge
// groups. All three sections read the same n400_section_attempts table,
// differing only by `section` value, item total, and badge thresholds —
// factored out per Rule of Three (writing.ts/yesno.ts/whatmean.ts all need
// it) rather than duplicating the query three times.
//
// For manual_recompute, we compute the historical date when the Nth
// distinct item was first answered — so backfilled badges show the
// correct past date instead of today.

import type { BadgeEvaluator, BadgeContext } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

export type StudySection = 'writing' | 'yesno' | 'whatmean';

interface AttemptRow {
  item_id: string;
  was_correct: boolean;
}

interface AttemptRowWithTime {
  item_id: string;
  was_correct: boolean;
  answered_at: string;
}

// Last-attempt-per-item distinct count + correctness, ordered so map
// overwrites give true last-wins — same "mastery" convention as
// flashcards-mastery/category evaluators in the civics groups.
export async function loadLastAttemptPerItem(
  userId: string,
  section: StudySection,
  supabase: SupabaseClient,
): Promise<Map<string, boolean>> {
  const { data } = await supabase
    .from('n400_section_attempts')
    .select('item_id, was_correct')
    .eq('user_id', userId)
    .eq('section', section)
    .order('answered_at', { ascending: true });
  const last = new Map<string, boolean>();
  for (const row of (data ?? []) as AttemptRow[]) {
    last.set(row.item_id, row.was_correct);
  }
  return last;
}

/**
 * Returns the timestamp at which the user first reached `threshold`
 * distinct items in a section. Used during manual_recompute.
 */
async function dateWhenDistinctReached(
  userId: string,
  section: StudySection,
  threshold: number,
  supabase: SupabaseClient,
): Promise<string | undefined> {
  const { data } = await supabase
    .from('n400_section_attempts')
    .select('item_id, was_correct, answered_at')
    .eq('user_id', userId)
    .eq('section', section)
    .order('answered_at', { ascending: true });
  if (!data) return undefined;
  const seen = new Set<string>();
  for (const row of data as AttemptRowWithTime[]) {
    seen.add(row.item_id);
    if (seen.size >= threshold) return row.answered_at;
  }
  return undefined;
}

export function makeCountEvaluator(
  slug: string,
  section: StudySection,
  threshold: number,
): BadgeEvaluator {
  return async (userId, ctx, supabase) => {
    const last = await loadLastAttemptPerItem(userId, section, supabase);
    if (last.size < threshold) return null;
    // For manual_recompute, find the actual historical date.
    const unlockedAt =
      ctx.trigger === 'manual_recompute'
        ? await dateWhenDistinctReached(userId, section, threshold, supabase)
        : undefined;
    return { slug, metadata: { distinct: last.size }, triggerAttemptId: ctx.attemptId, unlockedAt };
  };
}

// "Complete all N items with >=minAccuracy" — accuracy is last-wins across
// the full item set, so a wrong final attempt on any item blocks the badge
// until the learner retypes/retries it correctly.
export function makePerfectEvaluator(
  slug: string,
  section: StudySection,
  total: number,
  minAccuracy = 0.95,
): BadgeEvaluator {
  return async (userId, ctx, supabase) => {
    const last = await loadLastAttemptPerItem(userId, section, supabase);
    if (last.size < total) return null;
    const correct = [...last.values()].filter(Boolean).length;
    if (correct / total < minAccuracy) return null;
    return { slug, metadata: { correct, total }, triggerAttemptId: ctx.attemptId };
  };
}

