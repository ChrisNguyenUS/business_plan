// Server-side learning signals for the CTA evaluator (spec §4.2 conditions).
//
// Everything here is loaded from the same tables useN400UserState hydrates
// from, then handed to the SAME pure derivations the client screens use.
// Reimplementing any of them would let the CTA engine disagree with the
// user's own Tiến độ screen — S9 firing for someone the app tells "chưa sẵn
// sàng" is the exact failure this module exists to prevent.
//
// Mastery/coverage/section tallies now come from n400_learning_rollup() (SQL,
// n400_25 migration) instead of a full n400_quiz_attempts + n400_section_attempts
// read: PostgREST silently caps a response at 1000 rows with no defined order,
// so the most active users were getting truncated, arbitrary subsets of their
// own history. The "mastered ≠ deck state" rule (last GRADED attempt correct,
// never a flashcard self-grade) now lives in that SQL — see the migration's
// comment for the drift-lock — mirroring quiz-engine.ts's masteredQuestionIds
// and section-progress.ts's deriveSectionMastered / deriveSectionGradedTally.

import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveReadiness, type ReadinessSignals } from '../readiness';
import { SECTION_KEYS, type SectionKey } from '../section-progress';
import type { MockResult, SectionMockResult } from '../storage';
import type { N400Dict } from '../i18n/vi';
import type { GradedDay } from './profiling';
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
}

interface DbMockQuiz {
  id: string;
  score: number;
  total_questions: number;
  passed: boolean | null;
  started_at: string;
  completed_at: string;
  n400_question_attempts: DbQuestionAttemptRow[] | null;
}

interface DbSectionMock {
  id: string;
  section: 'writing' | 'speaking';
  score: number;
  total: number;
  passed: boolean;
  completed_at: string;
}

interface LearningRollup {
  civics_seen: number;
  civics_mastered: number;
  sections: Partial<
    Record<
      SectionKey,
      {
        mastered: number;
        graded_correct: number;
        graded_total: number;
      }
    >
  >;
}

/**
 * `gradedDays` comes from the shared growth context (n400_graded_day_rollup())
 * — this module must NOT re-read n400_growth_events. Both halves of the
 * growth state need that log, and reading it per-evaluator is exactly the
 * duplication the context layer exists to remove.
 */
export async function loadLearningSignals(
  supabase: SupabaseClient,
  userId: string,
  dict: N400Dict,
  gradedDays: readonly GradedDay[],
): Promise<LearningSignals> {
  const [rollupRes, mocksRes, sectionMockRes] = await Promise.all([
    supabase.rpc('n400_learning_rollup'),
    supabase
      .from('n400_quiz_attempts')
      .select(
        `
        id, mode, score, total_questions, passed, started_at, completed_at,
        n400_question_attempts ( question_id, was_correct, answered_at, attempt_id )
      `,
      )
      .eq('user_id', userId)
      .eq('mode', 'mock_test')
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(100),
    supabase
      .from('n400_section_mock_results')
      .select('id, section, score, total, passed, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(100),
  ]);

  const rollup = (rollupRes.data ?? { civics_seen: 0, civics_mastered: 0, sections: {} }) as LearningRollup;

  // Fetched `desc` so `.limit(100)` keeps the RECENT rows for an active user;
  // reverse back to ascending here so downstream sees the same chronological
  // shape the old insertion-order fetch produced (deriveReadiness's gần-nhất
  // rules depend on that order, not on any resorting of theirs).
  const mockResults: MockResult[] = ((mocksRes.data ?? []) as DbMockQuiz[])
    .slice()
    .reverse()
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

  const sectionMockResults: SectionMockResult[] = ((sectionMockRes.data ?? []) as DbSectionMock[])
    .slice()
    .reverse()
    .map((r) => ({
      id: r.id,
      section: r.section,
      passed: r.passed,
      score: r.score,
      total: r.total,
      completedAt: r.completed_at,
    }));

  const sec = (k: SectionKey) => rollup.sections[k] ?? { mastered: 0, graded_correct: 0, graded_total: 0 };

  const signals: ReadinessSignals = {
    civicsKnown: rollup.civics_mastered,
    civicsTotal: N400_QUESTIONS.length,
    whatmeanKnown: sec('whatmean').mastered,
    whatmeanTotal: WHATMEAN_QUESTIONS.length,
    yesnoKnown: sec('yesno').mastered,
    yesnoTotal: YESNO_QUESTIONS.length,
    writingKnown: sec('writing').mastered,
    writingTotal: WRITING_SENTENCES.length,
    mockResults,
    sectionMockResults,
  };
  const readiness = deriveReadiness(signals, dict);

  const pcts = mockResults.filter((m) => m.total > 0).map((m) => (m.score / m.total) * 100);
  const mockAvgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;

  // Weakest = lowest graded accuracy among sections with graded attempts;
  // ties break in SECTION_KEYS order (strict <), matching Study/Progress.
  let weakestSection: SectionKey | null = null;
  let weakestRate = Infinity;
  for (const key of SECTION_KEYS) {
    const t = sec(key);
    if (t.graded_total === 0) continue;
    const rate = t.graded_correct / t.graded_total;
    if (rate < weakestRate) {
      weakestRate = rate;
      weakestSection = key;
    }
  }

  return {
    readinessReady: readiness.ready,
    mockCount: mockResults.length,
    mockAvgPct,
    weakestSection,
    weakestSectionAttempts: weakestSection ? sec(weakestSection).graded_total : 0,
    practiceDays: gradedDays.length,
    allCivicsSectionsDone: rollup.civics_seen >= N400_QUESTIONS.length,
  };
}
