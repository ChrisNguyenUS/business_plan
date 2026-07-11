// Gamification v2 — shared helper for the Writing/Yes-No/What Mean badge
// groups. All three sections read the same n400_section_attempts table,
// differing only by `section` value, item total, and badge thresholds —
// factored out per Rule of Three (writing.ts/yesno.ts/whatmean.ts all need
// it) rather than duplicating the query three times.
//
// One per-run-cached fetch per (user, section) — see loadSectionAttemptRows.
// Last-wins mastery maps and "date when Nth distinct item was reached"
// (manual_recompute backfill dates) both derive from it in memory.

import type { BadgeEvaluator, BadgeContext } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cached } from './run-cache';

export type StudySection = 'writing' | 'yesno' | 'whatmean';

export interface SectionAttemptRow {
  item_id: string;
  was_correct: boolean;
  answered_at: string;
}

export function loadSectionAttemptRows(
  userId: string,
  section: StudySection,
  ctx: BadgeContext,
  supabase: SupabaseClient,
): Promise<SectionAttemptRow[]> {
  return cached(ctx, `section-rows:${userId}:${section}`, async () => {
    const { data } = await supabase
      .from('n400_section_attempts')
      .select('item_id, was_correct, answered_at')
      .eq('user_id', userId)
      .eq('section', section)
      .order('answered_at', { ascending: true });
    return (data ?? []) as SectionAttemptRow[];
  });
}

// Last-attempt-per-item distinct count + correctness, ordered so map
// overwrites give true last-wins — same "mastery" convention as
// flashcards-mastery/category evaluators in the civics groups.
export async function loadLastAttemptPerItem(
  userId: string,
  section: StudySection,
  ctx: BadgeContext,
  supabase: SupabaseClient,
): Promise<Map<string, boolean>> {
  const rows = await loadSectionAttemptRows(userId, section, ctx, supabase);
  const last = new Map<string, boolean>();
  for (const row of rows) {
    last.set(row.item_id, row.was_correct);
  }
  return last;
}

/**
 * Returns the timestamp at which the user first reached `threshold`
 * distinct items in a section. Used during manual_recompute. Rows are
 * already ordered ascending.
 */
function dateWhenDistinctReached(rows: SectionAttemptRow[], threshold: number): string | undefined {
  const seen = new Set<string>();
  for (const row of rows) {
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
    const rows = await loadSectionAttemptRows(userId, section, ctx, supabase);
    const last = new Map<string, boolean>();
    for (const row of rows) last.set(row.item_id, row.was_correct);
    if (last.size < threshold) return null;
    // For manual_recompute, find the actual historical date.
    const unlockedAt =
      ctx.trigger === 'manual_recompute' ? dateWhenDistinctReached(rows, threshold) : undefined;
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
    const last = await loadLastAttemptPerItem(userId, section, ctx, supabase);
    if (last.size < total) return null;
    const correct = [...last.values()].filter(Boolean).length;
    if (correct / total < minAccuracy) return null;
    return { slug, metadata: { correct, total }, triggerAttemptId: ctx.attemptId };
  };
}
