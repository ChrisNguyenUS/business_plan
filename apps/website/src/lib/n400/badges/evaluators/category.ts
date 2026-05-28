// Phase 6B — Category mastery badge evaluators (5 badges).
//
// Spec §2.5: a category is "mastered" when the user has answered ≥80%
// of the questions in that category correctly on their MOST RECENT
// attempt for each question.
//
// Algorithm:
//   1. SELECT all question_attempts for this user, with the question's
//      category_code joined in.
//   2. For each (question_id, category_code), keep only the latest
//      answered_at row.
//   3. For each category, count how many of its questions have a
//      latest-attempt was_correct=true. Divide by total questions in
//      that category code (looked up server-side via a separate count
//      so the badge stays correct if admin adds questions later).
//   4. If ratio ≥ 0.80, unlock.
//
// One factory builds one evaluator per category code; the registry
// spreads them as the 5 slugs below.

import type { BadgeEvaluator, BadgeContext, UnlockResult } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

const CATEGORY_BADGES: { slug: string; code: 'A' | 'B' | 'C' | 'D' | 'E' }[] = [
  { slug: 'category-democracy', code: 'A' },
  { slug: 'category-government', code: 'B' },
  { slug: 'category-rights', code: 'C' },
  { slug: 'category-history', code: 'D' },
  { slug: 'category-symbols', code: 'E' },
];

const MASTERY_THRESHOLD = 0.8;

interface AttemptRow {
  question_id: number;
  was_correct: boolean;
  answered_at: string;
  n400_questions: { category_code: string | null } | null;
}

/**
 * Reads every attempt this user has ever made and computes per-category
 * latest-attempt accuracy in JS. Returns a map of category_code →
 * { mastered, total }. We do this once per evaluator-call group rather
 * than 5 times — but the dispatcher invokes each evaluator separately.
 * Memoizing across the dispatcher loop is a future optimization (the
 * spec accepts up to ~5 SELECTs per session-finalize as cheap).
 */
async function computeMasteryMap(
  userId: string,
  supabase: SupabaseClient,
): Promise<Map<string, { mastered: number; total: number }>> {
  const [attemptsRes, countsRes] = await Promise.all([
    supabase
      .from('n400_question_attempts')
      .select(
        'question_id, was_correct, answered_at, n400_quiz_attempts!inner(user_id), n400_questions(category_code)',
      )
      .eq('n400_quiz_attempts.user_id', userId)
      .order('answered_at', { ascending: true }),
    supabase
      .from('n400_questions')
      .select('category_code', { count: 'exact', head: false })
      .not('category_code', 'is', null),
  ]);

  const attempts = (attemptsRes.data ?? []) as unknown as AttemptRow[];

  // Last-wins per question_id.
  const latestPerQ = new Map<number, { wasCorrect: boolean; code: string | null }>();
  for (const r of attempts) {
    latestPerQ.set(r.question_id, {
      wasCorrect: r.was_correct,
      code: r.n400_questions?.category_code ?? null,
    });
  }

  const mastered = new Map<string, number>();
  for (const { wasCorrect, code } of latestPerQ.values()) {
    if (!code || !wasCorrect) continue;
    mastered.set(code, (mastered.get(code) ?? 0) + 1);
  }

  // Total questions per category, derived from n400_questions, so the
  // ratio stays correct if admin adds questions later.
  const totals = new Map<string, number>();
  for (const row of (countsRes.data ?? []) as Array<{ category_code: string | null }>) {
    if (!row.category_code) continue;
    totals.set(row.category_code, (totals.get(row.category_code) ?? 0) + 1);
  }

  const out = new Map<string, { mastered: number; total: number }>();
  for (const [code, total] of totals) {
    out.set(code, { mastered: mastered.get(code) ?? 0, total });
  }
  return out;
}

function makeCategoryEvaluator(slug: string, code: string): BadgeEvaluator {
  return async (
    userId: string,
    ctx: BadgeContext,
    supabase: SupabaseClient,
  ): Promise<UnlockResult | null> => {
    const map = await computeMasteryMap(userId, supabase);
    const entry = map.get(code);
    if (!entry || entry.total === 0) return null;
    const ratio = entry.mastered / entry.total;
    if (ratio < MASTERY_THRESHOLD) return null;
    return {
      slug,
      metadata: { mastered: entry.mastered, total: entry.total, ratio: Math.round(ratio * 100) / 100 },
      triggerAttemptId: ctx.attemptId,
    };
  };
}

export const categoryEvaluators: Record<string, BadgeEvaluator> = Object.fromEntries(
  CATEGORY_BADGES.map(({ slug, code }) => [slug, makeCategoryEvaluator(slug, code)]),
);

// Exported for testing the helper in isolation.
export const __test = { computeMasteryMap, MASTERY_THRESHOLD };
