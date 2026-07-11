// Gamification v2 — shared helpers for combo/practice/other groups.
//
// Split out from combo.ts (rather than re-exported via an `__internal`
// object) so practice.ts/other.ts import a plain leaf module instead of a
// sibling group file — avoids the cross-group-file coupling that made the
// evaluator registry graph harder to reason about.
//
// Everything here rides the per-run cache: civicsLastAttemptMap derives
// from the civics row loader, sectionCounts from the per-section loaders,
// and passedMockCounts memoizes its own count queries — so combo/practice/
// other evaluators calling these repeatedly cost one round of queries per
// evaluateBadges run.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BadgeContext } from '../types';
import { cached } from './run-cache';
import { loadCivicsAttemptRows } from './civics';
import { loadLastAttemptPerItem, type StudySection } from './section-progress';

export async function civicsLastAttemptMap(
  userId: string,
  ctx: BadgeContext,
  supabase: SupabaseClient,
): Promise<Map<number, boolean>> {
  const rows = await loadCivicsAttemptRows(userId, ctx, supabase);
  const last = new Map<number, boolean>();
  for (const row of rows) {
    last.set(row.question_id, row.was_correct);
  }
  return last;
}

export async function sectionCounts(userId: string, ctx: BadgeContext, supabase: SupabaseClient) {
  const [writing, yesno, whatmean] = await Promise.all([
    loadLastAttemptPerItem(userId, 'writing', ctx, supabase),
    loadLastAttemptPerItem(userId, 'yesno', ctx, supabase),
    loadLastAttemptPerItem(userId, 'whatmean', ctx, supabase),
  ]);
  return { writing, yesno, whatmean };
}

export function accuracy(map: Map<unknown, boolean>, total: number): number {
  if (total === 0) return 0;
  const correct = [...map.values()].filter(Boolean).length;
  return correct / total;
}

export function passedMockCounts(userId: string, ctx: BadgeContext, supabase: SupabaseClient) {
  return cached(ctx, `passed-mock-counts:${userId}`, async () => {
    const [civicsRes, writingRes, speakingRes] = await Promise.all([
      supabase
        .from('n400_quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('mode', 'mock_test')
        .eq('passed', true),
      supabase
        .from('n400_section_mock_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('section', 'writing')
        .eq('passed', true),
      supabase
        .from('n400_section_mock_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('section', 'speaking')
        .eq('passed', true),
    ]);
    return {
      civics: civicsRes.count ?? 0,
      writing: writingRes.count ?? 0,
      speaking: speakingRes.count ?? 0,
    };
  });
}

export const SECTION_TOTAL: Record<StudySection, number> = { writing: 45, yesno: 37, whatmean: 62 };
export const CIVICS_TOTAL = 128;
