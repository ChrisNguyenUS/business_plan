// Gamification v2 — Misc/other achievement badge evaluators (8 badges).

import type { BadgeEvaluator } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { distinctCivicsAnswered } from './civics';
import { loadLastAttemptPerItem } from './section-progress';
import {
  accuracy,
  civicsLastAttemptMap,
  passedMockCounts,
  CIVICS_TOTAL,
  SECTION_TOTAL,
} from './mock-shared';

async function completedMockCounts(userId: string, supabase: SupabaseClient) {
  const [civicsRes, writingRes, speakingRes] = await Promise.all([
    supabase
      .from('n400_quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mode', 'mock_test')
      .not('completed_at', 'is', null),
    supabase
      .from('n400_section_mock_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('section', 'writing'),
    supabase
      .from('n400_section_mock_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('section', 'speaking'),
  ]);
  return (civicsRes.count ?? 0) + (writingRes.count ?? 0) + (speakingRes.count ?? 0);
}

const otherFirstPractice: BadgeEvaluator = async (userId, ctx, supabase) => {
  const [{ count: civicsCount }, sectionRes] = await Promise.all([
    supabase
      .from('n400_question_attempts')
      .select('id, n400_quiz_attempts!inner(user_id)', { count: 'exact', head: true })
      .eq('n400_quiz_attempts.user_id', userId),
    supabase
      .from('n400_section_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);
  const total = (civicsCount ?? 0) + (sectionRes.count ?? 0);
  if (total < 1) return null;
  return { slug: 'other-first-practice', metadata: {}, triggerAttemptId: ctx.attemptId };
};

const otherMockRookie: BadgeEvaluator = async (userId, ctx, supabase) => {
  const n = await completedMockCounts(userId, supabase);
  if (n < 1) return null;
  return { slug: 'other-mock-rookie', metadata: { n }, triggerAttemptId: ctx.attemptId };
};

const otherTestVeteran: BadgeEvaluator = async (userId, ctx, supabase) => {
  const n = await completedMockCounts(userId, supabase);
  if (n < 50) return null;
  return { slug: 'other-test-veteran', metadata: { n }, triggerAttemptId: ctx.attemptId };
};

const otherComeback: BadgeEvaluator = async (userId, ctx, supabase) => {
  // Civics-only, mirrors the Phase 6B mock-comeback evaluator: at least one
  // passed and one failed civics mock, order not compared for simplicity.
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
  return { slug: 'other-comeback', metadata: { passed, failed }, triggerAttemptId: ctx.attemptId };
};

const otherLongTermMemory: BadgeEvaluator = async (userId, ctx, supabase) => {
  const { count } = await supabase
    .from('n400_question_attempts')
    .select('id, n400_quiz_attempts!inner(user_id), n400_bookmarks!inner(user_id)', {
      count: 'exact',
      head: true,
    })
    .eq('n400_quiz_attempts.user_id', userId)
    .eq('n400_bookmarks.user_id', userId)
    .eq('was_correct', true);
  if ((count ?? 0) < 50) return null;
  return { slug: 'other-long-term-memory', metadata: { count }, triggerAttemptId: ctx.attemptId };
};

const otherConsistentPerformer: BadgeEvaluator = async (userId, ctx, supabase) => {
  const streak =
    typeof ctx.currentStreak === 'number'
      ? ctx.currentStreak
      : await (async () => {
          const { data } = await supabase
            .from('n400_user_profile')
            .select('current_streak')
            .eq('user_id', userId)
            .maybeSingle();
          return Number(data?.current_streak ?? 0);
        })();
  if (streak < 30) return null;
  return { slug: 'other-consistent-performer', metadata: { streak }, triggerAttemptId: ctx.attemptId };
};

const otherMemoryMaster: BadgeEvaluator = async (userId, ctx, supabase) => {
  const [civicsMap, writing, yesno, whatmean] = await Promise.all([
    civicsLastAttemptMap(userId, supabase),
    loadLastAttemptPerItem(userId, 'writing', supabase),
    loadLastAttemptPerItem(userId, 'yesno', supabase),
    loadLastAttemptPerItem(userId, 'whatmean', supabase),
  ]);
  const ratios = [
    accuracy(civicsMap, CIVICS_TOTAL),
    accuracy(writing, SECTION_TOTAL.writing),
    accuracy(yesno, SECTION_TOTAL.yesno),
    accuracy(whatmean, SECTION_TOTAL.whatmean),
  ];
  if (!ratios.some((r) => r >= 0.9)) return null;
  return { slug: 'other-memory-master', metadata: {}, triggerAttemptId: ctx.attemptId };
};

const otherUltimate: BadgeEvaluator = async (userId, ctx, supabase) => {
  const [civics, writing, yesno, whatmean, mocks] = await Promise.all([
    distinctCivicsAnswered(userId, supabase),
    loadLastAttemptPerItem(userId, 'writing', supabase),
    loadLastAttemptPerItem(userId, 'yesno', supabase),
    loadLastAttemptPerItem(userId, 'whatmean', supabase),
    passedMockCounts(userId, supabase),
  ]);
  const sectionsComplete =
    civics >= CIVICS_TOTAL &&
    writing.size >= SECTION_TOTAL.writing &&
    yesno.size >= SECTION_TOTAL.yesno &&
    whatmean.size >= SECTION_TOTAL.whatmean;
  const mocksPassed = mocks.civics >= 1 && mocks.writing >= 1 && mocks.speaking >= 1;
  if (!sectionsComplete || !mocksPassed) return null;
  return { slug: 'other-ultimate', metadata: {}, triggerAttemptId: ctx.attemptId };
};

export const otherEvaluators: Record<string, BadgeEvaluator> = {
  'other-first-practice': otherFirstPractice,
  'other-mock-rookie': otherMockRookie,
  'other-test-veteran': otherTestVeteran,
  'other-comeback': otherComeback,
  'other-long-term-memory': otherLongTermMemory,
  'other-consistent-performer': otherConsistentPerformer,
  'other-memory-master': otherMemoryMaster,
  'other-ultimate': otherUltimate,
};
