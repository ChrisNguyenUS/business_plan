// Server-side learning signals for the CTA evaluator (spec §4.2 conditions).
//
// Everything here is loaded from the same tables useN400UserState hydrates
// from, then handed to the SAME pure derivations the client screens use.
// Reimplementing any of them would let the CTA engine disagree with the
// user's own Tiến độ screen — S9 firing for someone the app tells "chưa sẵn
// sàng" is the exact failure this module exists to prevent.
//
// Deliberate deviation from the plan's sketch: `n400_user_profile` has no
// `mastered_question_ids` / `seen_question_ids` columns (verified against the
// live schema) — civics mastery has never been denormalized there. The
// client derives it from the SAME quiz-attempts join this module now reads:
// `masteredQuestionIds` (quiz-engine.ts) over the full n400_quiz_attempts +
// n400_question_attempts history, exactly like user-state.tsx's `loadAll`
// and its `stats.mastered` / `stats.coverage` memo.

import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveReadiness, type ReadinessSignals } from '../readiness';
import {
  deriveSectionGradedTally,
  deriveSectionMastered,
  SECTION_KEYS,
  type SectionAttempt,
  type SectionKey,
} from '../section-progress';
import { masteredQuestionIds } from '../quiz-engine';
import type { MockResult, SectionMockResult, QuestionAttempt, QuizMode } from '../storage';
import type { N400Dict } from '../i18n/vi';
import type { GradedEvent } from './profiling';
import { N400_QUESTIONS } from '../questions-data';
import { WHATMEAN_QUESTIONS } from '../whatmean-data';
import { YESNO_QUESTIONS } from '../yesno-data';
import { WRITING_SENTENCES } from '../writing-data';

export interface LearningSignals {
  /** readiness.ready — the S9 condition. */
  readinessReady: boolean;
  /** Completed civics mocks, and their average percent (S1). */
  mockCount: number;
  mockAvgPct: number | null;
  /** Weakest graded section and how many graded attempts it has (S5/S6). */
  weakestSection: SectionKey | null;
  weakestSectionAttempts: number;
  /** Distinct days with a graded practice/mock event (S2). */
  practiceDays: number;
  /** Every civics question has been seen, any mode (S7) — same "coverage"
   *  concept as the client's stats memo (distinct question ids answered). */
  allCivicsSectionsDone: boolean;
}

interface DbQuestionAttemptRow {
  question_id: number;
  was_correct: boolean;
  answered_at: string;
  attempt_id: string;
}

interface DbQuiz {
  id: string;
  mode: string;
  score: number;
  total_questions: number;
  passed: boolean | null;
  started_at: string;
  completed_at: string | null;
  n400_question_attempts: DbQuestionAttemptRow[] | null;
}

interface DbSectionAttempt {
  section: SectionKey;
  item_id: string;
  mode: QuizMode;
  was_correct: boolean;
  answered_at: string;
}

interface DbSectionMock {
  id: string;
  section: 'writing' | 'speaking';
  score: number;
  total: number;
  passed: boolean;
  completed_at: string;
}

/**
 * `gradedEvents` comes from the shared growth context — this module must NOT
 * re-read n400_growth_events. Both halves of the growth state need that log,
 * and reading it per-evaluator is exactly the duplication the context layer
 * exists to remove.
 */
export async function loadLearningSignals(
  supabase: SupabaseClient,
  userId: string,
  dict: N400Dict,
  gradedEvents: readonly GradedEvent[],
): Promise<LearningSignals> {
  const [quizzesRes, sectionRes, sectionMockRes] = await Promise.all([
    supabase
      .from('n400_quiz_attempts')
      .select(
        `
        id, mode, score, total_questions, passed, started_at, completed_at,
        n400_question_attempts ( question_id, was_correct, answered_at, attempt_id )
      `,
      )
      .eq('user_id', userId),
    supabase
      .from('n400_section_attempts')
      .select('section, item_id, mode, was_correct, answered_at')
      .eq('user_id', userId)
      .order('answered_at', { ascending: true }),
    supabase
      .from('n400_section_mock_results')
      .select('id, section, score, total, passed, completed_at')
      .eq('user_id', userId),
  ]);

  const quizzes = (quizzesRes.data ?? []) as unknown as DbQuiz[];
  const quizModeById = new Map(quizzes.map((q) => [q.id, q.mode as QuizMode]));

  // Chronological order matters: masteredQuestionIds is last-attempt-wins, so
  // out-of-order rows would silently pick the wrong answer as "current". The
  // nested join has no per-parent ordering guarantee, so sort explicitly —
  // the same fix user-state.tsx's loadAll applies to this exact join.
  const civicsAttempts: QuestionAttempt[] = quizzes
    .flatMap((q) => q.n400_question_attempts ?? [])
    .filter((r) => quizModeById.has(r.attempt_id))
    .sort((a, b) => new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime())
    .map((r) => ({
      questionId: r.question_id,
      wasCorrect: r.was_correct,
      mode: quizModeById.get(r.attempt_id)!,
      at: r.answered_at,
    }));

  const civicsSeen = new Set(civicsAttempts.map((a) => a.questionId));
  const civicsMasteredCount = masteredQuestionIds(civicsAttempts).length;

  const mockResults: MockResult[] = quizzes
    .filter((q): q is DbQuiz & { completed_at: string } => q.mode === 'mock_test' && q.completed_at !== null)
    .map((q) => ({
      id: q.id,
      startedAt: q.started_at,
      completedAt: q.completed_at,
      score: q.score,
      total: q.total_questions,
      passed: q.passed === true,
      questionResults: (q.n400_question_attempts ?? []).map((r) => ({
        questionId: r.question_id,
        wasCorrect: r.was_correct,
      })),
    }));

  const sectionAttempts: SectionAttempt[] = ((sectionRes.data ?? []) as DbSectionAttempt[]).map((r) => ({
    section: r.section,
    itemId: r.item_id,
    wasCorrect: r.was_correct,
    mode: r.mode,
    at: r.answered_at,
  }));

  const sectionMockResults: SectionMockResult[] = ((sectionMockRes.data ?? []) as DbSectionMock[]).map((r) => ({
    id: r.id,
    section: r.section,
    passed: r.passed,
    score: r.score,
    total: r.total,
    completedAt: r.completed_at,
  }));

  // "Thuộc" = last GRADED attempt correct (deriveSectionMastered), never the
  // flashcard deck's marked-state (deriveSectionKnown) — swapping these would
  // let S9 fire for a user whose own Tiến độ screen says they're not ready.
  const mastered = deriveSectionMastered(sectionAttempts);
  const signals: ReadinessSignals = {
    civicsKnown: civicsMasteredCount,
    civicsTotal: N400_QUESTIONS.length,
    whatmeanKnown: mastered.whatmean.length,
    whatmeanTotal: WHATMEAN_QUESTIONS.length,
    yesnoKnown: mastered.yesno.length,
    yesnoTotal: YESNO_QUESTIONS.length,
    writingKnown: mastered.writing.length,
    writingTotal: WRITING_SENTENCES.length,
    mockResults,
    sectionMockResults,
  };
  const readiness = deriveReadiness(signals, dict);

  const pcts = mockResults.filter((m) => m.total > 0).map((m) => (m.score / m.total) * 100);
  const mockAvgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;

  // Weakest = lowest graded accuracy among sections that have graded attempts.
  // Ties break in SECTION_KEYS order, matching the Study/Progress pages.
  const tally = deriveSectionGradedTally(sectionAttempts);
  let weakestSection: SectionKey | null = null;
  let weakestRate = Infinity;
  for (const key of SECTION_KEYS) {
    const t = tally[key];
    if (t.total === 0) continue;
    const rate = t.correct / t.total;
    if (rate < weakestRate) {
      weakestRate = rate;
      weakestSection = key;
    }
  }

  // UTC day, the same currency G2's evaluator and the SQL scoring both use.
  const practiceDays = new Set(gradedEvents.map((e) => e.at.slice(0, 10))).size;

  return {
    readinessReady: readiness.ready,
    mockCount: mockResults.length,
    mockAvgPct,
    weakestSection,
    weakestSectionAttempts: weakestSection ? tally[weakestSection].total : 0,
    practiceDays,
    allCivicsSectionsDone: civicsSeen.size >= N400_QUESTIONS.length,
  };
}
