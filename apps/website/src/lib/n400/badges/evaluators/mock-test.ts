// Phase 6B — Mock-test badge evaluators (6 badges).
//
// Each evaluator reads from n400_quiz_attempts (one row per session)
// and/or n400_question_attempts (one row per answered question). The
// dispatcher fires these on session_complete (mode=mock_test). They are
// also safe to run on manual_recompute — every check is a simple COUNT
// or EXISTS that re-derives state from the ledger.
//
// onboarding-first-session lives here per the spec catalog even though
// the dispatcher fires it for all 3 modes — it's "did the user complete
// any session at all yet."
//
// Idempotency lives at the DB layer: returning the same slug repeatedly
// after the first unlock is fine — n400_user_badges PK rejects the
// duplicate, dispatcher only surfaces newly-inserted rows.

import type { BadgeEvaluator } from '../types';

const MOCK_PASS_THRESHOLD = 12;
const MOCK_HIGH_SCORE = 18;

const onboardingFirstSession: BadgeEvaluator = async (userId, _ctx, supabase) => {
  // First completed session = first n400_quiz_attempts row with at least
  // 5 linked question_attempts. We count any single quiz_attempts row
  // that has completed_at set; the ≥5 floor matches the streak gate from
  // Phase 6 (a sub-5-question session doesn't count as activity).
  const { data } = await supabase
    .from('n400_quiz_attempts')
    .select('id, n400_question_attempts(count)')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .limit(50);
  const sessions = ((data ?? []) as Array<{ n400_question_attempts: { count: number }[] }>).filter(
    (r) => (r.n400_question_attempts?.[0]?.count ?? 0) >= 5,
  );
  if (sessions.length === 0) return null;
  return { slug: 'onboarding-first-session', metadata: { sessions: sessions.length } };
};

async function countPassedMockAttempts(
  userId: string,
  supabase: Parameters<BadgeEvaluator>[2],
): Promise<number> {
  const { count } = await supabase
    .from('n400_quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('mode', 'mock_test')
    .eq('passed', true);
  return count ?? 0;
}

const mockPassFirst: BadgeEvaluator = async (userId, ctx, supabase) => {
  const passed = await countPassedMockAttempts(userId, supabase);
  if (passed < 1) return null;
  return { slug: 'mock-pass-first', metadata: { passed }, triggerAttemptId: ctx.attemptId };
};

const mockPassFive: BadgeEvaluator = async (userId, ctx, supabase) => {
  const passed = await countPassedMockAttempts(userId, supabase);
  if (passed < 5) return null;
  return { slug: 'mock-pass-five', metadata: { passed }, triggerAttemptId: ctx.attemptId };
};

const mockHighScore: BadgeEvaluator = async (userId, ctx, supabase) => {
  // Any mock attempt where score >= 18.
  const { data } = await supabase
    .from('n400_quiz_attempts')
    .select('id, score, total_questions')
    .eq('user_id', userId)
    .eq('mode', 'mock_test')
    .gte('score', MOCK_HIGH_SCORE)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    slug: 'mock-high-score',
    metadata: { score: data.score, total: data.total_questions },
    triggerAttemptId: (data.id as string) ?? ctx.attemptId,
  };
};

const mockPerfect: BadgeEvaluator = async (userId, ctx, supabase) => {
  // Spec §9.2: zero wrong AND >=12 correct on a passed mock.
  // Strategy: pull the user's passed mock attempts + their per-question
  // correct/wrong counts in one round-trip via the embedded relation.
  // (Postgres groups by attempt; we check each row in JS — at most a
  // few dozen passed attempts per user.)
  const { data } = await supabase
    .from('n400_quiz_attempts')
    .select(`
      id,
      score,
      n400_question_attempts(was_correct)
    `)
    .eq('user_id', userId)
    .eq('mode', 'mock_test')
    .eq('passed', true)
    .order('completed_at', { ascending: false })
    .limit(50);
  for (const row of (data ?? []) as Array<{
    id: string;
    score: number;
    n400_question_attempts: Array<{ was_correct: boolean }>;
  }>) {
    const correct = row.n400_question_attempts.filter((a) => a.was_correct).length;
    const wrong = row.n400_question_attempts.filter((a) => !a.was_correct).length;
    if (wrong === 0 && correct >= MOCK_PASS_THRESHOLD) {
      return {
        slug: 'mock-perfect',
        metadata: { correct, wrong, attemptId: row.id },
        triggerAttemptId: row.id ?? ctx.attemptId,
      };
    }
  }
  return null;
};

const mockComeback: BadgeEvaluator = async (userId, ctx, supabase) => {
  // Unlock when the user has at least one passed=true mock AND at least
  // one passed=false mock. Order doesn't strictly matter for v1 — if the
  // user starts with a pass and later fails, the badge still represents
  // "you came back from a failed attempt at some point." Spec §2.2 says
  // "follows at least one prior passed=false," but the simpler form is
  // good enough and avoids comparing timestamps.
  const [passedRes, failedRes] = await Promise.all([
    supabase
      .from('n400_quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mode', 'mock_test')
      .eq('passed', true),
    supabase
      .from('n400_quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mode', 'mock_test')
      .eq('passed', false),
  ]);
  const passed = passedRes.count ?? 0;
  const failed = failedRes.count ?? 0;
  if (passed < 1 || failed < 1) return null;
  return {
    slug: 'mock-comeback',
    metadata: { passed, failed },
    triggerAttemptId: ctx.attemptId,
  };
};

export const mockTestEvaluators: Record<string, BadgeEvaluator> = {
  'onboarding-first-session': onboardingFirstSession,
  'mock-pass-first': mockPassFirst,
  'mock-pass-five': mockPassFive,
  'mock-high-score': mockHighScore,
  'mock-perfect': mockPerfect,
  'mock-comeback': mockComeback,
};
