// Gamification v2 — shared helper for the Writing/Yes-No/What Mean badge
// groups. All three sections read the same n400_section_attempts table,
// differing only by `section` value, item total, and badge thresholds —
// factored out per Rule of Three (writing.ts/yesno.ts/whatmean.ts all need
// it) rather than duplicating the query three times.

import type { BadgeEvaluator } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

export type StudySection = 'writing' | 'yesno' | 'whatmean';

interface AttemptRow {
  item_id: string;
  was_correct: boolean;
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

export function makeCountEvaluator(
  slug: string,
  section: StudySection,
  threshold: number,
): BadgeEvaluator {
  return async (userId, ctx, supabase) => {
    const last = await loadLastAttemptPerItem(userId, section, supabase);
    if (last.size < threshold) return null;
    return { slug, metadata: { distinct: last.size }, triggerAttemptId: ctx.attemptId };
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
