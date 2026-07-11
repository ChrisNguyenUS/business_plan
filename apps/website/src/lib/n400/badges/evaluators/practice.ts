// Gamification v2 — Practice-performance badge evaluators (8 badges).
//
// Note on "practice session" scope: only civics mock_test rows in
// n400_quiz_attempts carry real session-level score/total (practice and
// flashcard modes write one row per single answer, so there's no natural
// "session" grouping for them in the current schema). "High Score" /
// "Excellence" / "Perfect Round" are therefore scoped to mock-test-shaped
// sessions across all 3 mock types (civics + n400_section_mock_results),
// not general practice quizzes — the closest faithful reading given what's
// actually queryable today.

import type { BadgeEvaluator, BadgeContext } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cached } from './run-cache';
import { passedMockCounts } from './mock-shared';
import { loadAttemptTimeline, longestCorrectRun } from './timeline';

interface MockSession {
  score: number;
  total: number;
}

function allMockSessions(
  userId: string,
  ctx: BadgeContext,
  supabase: SupabaseClient,
): Promise<MockSession[]> {
  return cached(ctx, `all-mock-sessions:${userId}`, async () => {
    const [civicsRes, sectionRes] = await Promise.all([
      supabase
        .from('n400_quiz_attempts')
        .select('score, total_questions')
        .eq('user_id', userId)
        .eq('mode', 'mock_test'),
      supabase
        .from('n400_section_mock_results')
        .select('score, total')
        .eq('user_id', userId),
    ]);
    const civics = ((civicsRes.data ?? []) as Array<{ score: number; total_questions: number }>).map((r) => ({
      score: r.score,
      total: r.total_questions,
    }));
    const sections = ((sectionRes.data ?? []) as MockSession[]).map((r) => ({ score: r.score, total: r.total }));
    return [...civics, ...sections];
  });
}

const practiceExamReady: BadgeEvaluator = async (userId, ctx, supabase) => {
  const { civics } = await passedMockCounts(userId, ctx, supabase);
  if (civics < 1) return null;
  return { slug: 'practice-exam-ready', metadata: { civics }, triggerAttemptId: ctx.attemptId };
};

const practiceFutureCitizen: BadgeEvaluator = async (userId, ctx, supabase) => {
  const { data } = await supabase
    .from('n400_quiz_attempts')
    .select('id, score, total_questions')
    .eq('user_id', userId)
    .eq('mode', 'mock_test')
    .limit(200);
  const hit = ((data ?? []) as Array<{ id: string; score: number; total_questions: number }>).find(
    (r) => r.total_questions > 0 && r.score / r.total_questions >= 0.9,
  );
  if (!hit) return null;
  return { slug: 'practice-future-citizen', metadata: { score: hit.score, total: hit.total_questions }, triggerAttemptId: hit.id };
};

const practiceHighScore: BadgeEvaluator = async (userId, ctx, supabase) => {
  const sessions = await allMockSessions(userId, ctx, supabase);
  const hit = sessions.some((s) => s.total > 0 && s.score / s.total >= 0.9);
  if (!hit) return null;
  return { slug: 'practice-high-score', metadata: {}, triggerAttemptId: ctx.attemptId };
};

const practiceExcellence: BadgeEvaluator = async (userId, ctx, supabase) => {
  const sessions = await allMockSessions(userId, ctx, supabase);
  const count = sessions.filter((s) => s.total > 0 && s.score / s.total >= 0.9).length;
  if (count < 10) return null;
  return { slug: 'practice-excellence', metadata: { count }, triggerAttemptId: ctx.attemptId };
};

const practicePerfectRound: BadgeEvaluator = async (userId, ctx, supabase) => {
  const sessions = await allMockSessions(userId, ctx, supabase);
  const hit = sessions.some((s) => s.total > 0 && s.score === s.total);
  if (!hit) return null;
  return { slug: 'practice-perfect-round', metadata: {}, triggerAttemptId: ctx.attemptId };
};

const practicePerfectAccuracy: BadgeEvaluator = async (userId, ctx, supabase) => {
  const timeline = await loadAttemptTimeline(userId, ctx, supabase);
  const run = longestCorrectRun(timeline);
  if (run < 100) return null;
  return { slug: 'practice-perfect-accuracy', metadata: { run }, triggerAttemptId: ctx.attemptId };
};

const practicePerfectStreak: BadgeEvaluator = async (userId, ctx, supabase) => {
  const timeline = await loadAttemptTimeline(userId, ctx, supabase);
  const run = longestCorrectRun(timeline);
  if (run < 50) return null;
  return { slug: 'practice-perfect-streak', metadata: { run }, triggerAttemptId: ctx.attemptId };
};

const practiceMockChampion: BadgeEvaluator = async (userId, ctx, supabase) => {
  const { civics, writing, speaking } = await passedMockCounts(userId, ctx, supabase);
  const total = civics + writing + speaking;
  if (total < 10) return null;
  return { slug: 'practice-mock-champion', metadata: { total }, triggerAttemptId: ctx.attemptId };
};

export const practiceEvaluators: Record<string, BadgeEvaluator> = {
  'practice-exam-ready': practiceExamReady,
  'practice-future-citizen': practiceFutureCitizen,
  'practice-high-score': practiceHighScore,
  'practice-excellence': practiceExcellence,
  'practice-perfect-accuracy': practicePerfectAccuracy,
  'practice-perfect-streak': practicePerfectStreak,
  'practice-perfect-round': practicePerfectRound,
  'practice-mock-champion': practiceMockChampion,
};
