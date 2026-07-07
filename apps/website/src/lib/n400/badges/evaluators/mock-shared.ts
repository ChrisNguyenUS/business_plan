// Gamification v2 — shared helpers for combo/practice/other groups.
//
// Split out from combo.ts (rather than re-exported via an `__internal`
// object) so practice.ts/other.ts import a plain leaf module instead of a
// sibling group file — avoids the cross-group-file coupling that made the
// evaluator registry graph harder to reason about.

import type { SupabaseClient } from '@supabase/supabase-js';
import { loadLastAttemptPerItem, type StudySection } from './section-progress';

export async function civicsLastAttemptMap(
  userId: string,
  supabase: SupabaseClient,
): Promise<Map<number, boolean>> {
  const { data } = await supabase
    .from('n400_question_attempts')
    .select('question_id, was_correct, answered_at, n400_quiz_attempts!inner(user_id)')
    .eq('n400_quiz_attempts.user_id', userId)
    .order('answered_at', { ascending: true });
  const last = new Map<number, boolean>();
  for (const row of (data ?? []) as Array<{ question_id: number; was_correct: boolean }>) {
    last.set(row.question_id, row.was_correct);
  }
  return last;
}

export async function sectionCounts(userId: string, supabase: SupabaseClient) {
  const [writing, yesno, whatmean] = await Promise.all([
    loadLastAttemptPerItem(userId, 'writing', supabase),
    loadLastAttemptPerItem(userId, 'yesno', supabase),
    loadLastAttemptPerItem(userId, 'whatmean', supabase),
  ]);
  return { writing, yesno, whatmean };
}

export function accuracy(map: Map<unknown, boolean>, total: number): number {
  if (total === 0) return 0;
  const correct = [...map.values()].filter(Boolean).length;
  return correct / total;
}

export async function passedMockCounts(userId: string, supabase: SupabaseClient) {
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
}

export const SECTION_TOTAL: Record<StudySection, number> = { writing: 45, yesno: 37, whatmean: 62 };
export const CIVICS_TOTAL = 128;
