// Phase 6B — Volume / persistence badge evaluators (3 badges).
//
// practice-sessions-10  — 10 lifetime completed practice sessions
// practice-sessions-30  — 30 lifetime completed practice sessions
// sessions-50           — 50 lifetime completed sessions in any mode
//
// Same ≥5-interactions floor as onboarding-first-session and
// sessions-100 — a sub-5-question attempt doesn't count.

import type { BadgeEvaluator } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

async function countCompletedSessions(
  userId: string,
  supabase: SupabaseClient,
  mode: 'practice' | 'mock_test' | 'flashcard' | null,
): Promise<number> {
  let query = supabase
    .from('n400_quiz_attempts')
    .select('id, n400_question_attempts(count)')
    .eq('user_id', userId)
    .not('completed_at', 'is', null);
  if (mode) query = query.eq('mode', mode);
  const { data } = await query;
  const sessions = ((data ?? []) as Array<{ n400_question_attempts: { count: number }[] }>).filter(
    (r) => (r.n400_question_attempts?.[0]?.count ?? 0) >= 5,
  );
  return sessions.length;
}

const practiceSessions10: BadgeEvaluator = async (userId, ctx, supabase) => {
  const n = await countCompletedSessions(userId, supabase, 'practice');
  if (n < 10) return null;
  return { slug: 'practice-sessions-10', metadata: { sessions: n }, triggerAttemptId: ctx.attemptId };
};

const practiceSessions30: BadgeEvaluator = async (userId, ctx, supabase) => {
  const n = await countCompletedSessions(userId, supabase, 'practice');
  if (n < 30) return null;
  return { slug: 'practice-sessions-30', metadata: { sessions: n }, triggerAttemptId: ctx.attemptId };
};

const sessions50: BadgeEvaluator = async (userId, ctx, supabase) => {
  const n = await countCompletedSessions(userId, supabase, null);
  if (n < 50) return null;
  return { slug: 'sessions-50', metadata: { sessions: n }, triggerAttemptId: ctx.attemptId };
};

export const volumeEvaluators: Record<string, BadgeEvaluator> = {
  'practice-sessions-10': practiceSessions10,
  'practice-sessions-30': practiceSessions30,
  'sessions-50': sessions50,
};
