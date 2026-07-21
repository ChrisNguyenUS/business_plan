// Drift-lock test for the CTA engine's server-side learning signals.
//
// Mastery/coverage/section-tally derivation moved out of TS and into SQL
// (n400_learning_rollup(), n400_25 migration) — the "mastered ≠ deck state"
// rule (last GRADED attempt correct, never a flashcard self-grade) now lives
// there, with its own drift-lock comment pointing back at the TS functions it
// mirrors (quiz-engine.ts's masteredQuestionIds, section-progress.ts's
// deriveSectionMastered / deriveSectionGradedTally — see
// section-progress.test.ts for those functions' own drift-lock coverage).
//
// This file instead drift-locks the TS side of the contract: that
// loadLearningSignals (1) feeds the RPC's `mastered` counts — not graded
// accuracy or volume — into readiness, and (2) computes weakest-section from
// graded accuracy independently, with a stable tie-break order.

import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadLearningSignals } from './learning-signals';
import { vi as viDict } from '../i18n/vi';
import { N400_QUESTIONS } from '../questions-data';
import { WHATMEAN_QUESTIONS } from '../whatmean-data';
import { YESNO_QUESTIONS } from '../yesno-data';
import { WRITING_SENTENCES } from '../writing-data';
import type { GradedDay } from './profiling';

// Minimal fake of the Supabase query-builder chain loadLearningSignals uses:
// select/eq/not/order/limit all return `this`, and the object is a thenable
// so `Promise.all([...])` can await it directly, same as the real builder.
class FakeQuery<T> {
  constructor(private readonly data: T) {}
  select() { return this; }
  eq() { return this; }
  not() { return this; }
  order() { return this; }
  limit() { return this; }
  then<TResult1 = { data: T; error: null }>(
    onfulfilled?: ((value: { data: T; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
  ) {
    return Promise.resolve({ data: this.data, error: null }).then(onfulfilled ?? undefined);
  }
}

interface RollupSection {
  mastered: number;
  graded_correct: number;
  graded_total: number;
}

interface Rollup {
  civics_seen: number;
  civics_mastered: number;
  sections: Partial<Record<'whatmean' | 'yesno' | 'writing', RollupSection>>;
}

function fakeSupabase(opts: {
  rollup: Rollup;
  mocks?: unknown[];
  sectionMocks?: unknown[];
}): SupabaseClient {
  const rpc = vi.fn().mockResolvedValue({ data: opts.rollup, error: null });
  const from = vi.fn((table: string) => {
    if (table === 'n400_quiz_attempts') return new FakeQuery(opts.mocks ?? []);
    if (table === 'n400_section_mock_results') return new FakeQuery(opts.sectionMocks ?? []);
    throw new Error(`unexpected table in test fake: ${table}`);
  });
  return { rpc, from } as unknown as SupabaseClient;
}

const noGradedDays: readonly GradedDay[] = [];

describe('loadLearningSignals', () => {
  it('feeds SQL-computed mastery — not graded accuracy/volume — into readiness', async () => {
    // Every criterion EXCEPT writing_known is deliberately fully satisfied
    // (full civics/whatmean/yesno mastery, two passing mocks, latest writing
    // and speaking mocks passed) so writing_known is the ONLY thing that can
    // swing `readinessReady`. That isolation is the point: an earlier version
    // of this test asserted `readinessReady === false` from a fixture that
    // omitted mocks entirely, so civics_mock was already unmet regardless of
    // how writing mastery was wired — the assertion passed even under a bug.
    //
    // Writing has strong graded ACCURACY (40/45 correct = 89%, well past the
    // 80% bar) but its LATEST graded attempt per item never lands as
    // mastered, so the rollup reports mastered: 0. Target for writing_known
    // is ceil(0.8 * 45) = 36:
    //   - correct wiring (writingKnown = mastered = 0)            → unmet → readinessReady false
    //   - swapped wiring (writingKnown = graded_correct = 40 ≥ 36) → met   → readinessReady TRUE
    // so this test fails if loadLearningSignals ever substitutes
    // graded_correct/graded_total (or seen) for mastered in the section
    // wiring — the exact bug class the old flashcard-vs-graded drift-lock
    // warned about, now expressed as a rollup input.
    const supabase = fakeSupabase({
      rollup: {
        civics_seen: N400_QUESTIONS.length,
        civics_mastered: N400_QUESTIONS.length,
        sections: {
          whatmean: { mastered: WHATMEAN_QUESTIONS.length, graded_correct: 5, graded_total: 5 },
          yesno: { mastered: YESNO_QUESTIONS.length, graded_correct: 5, graded_total: 5 },
          writing: { mastered: 0, graded_correct: 40, graded_total: WRITING_SENTENCES.length },
        },
      },
      mocks: [
        {
          id: 'mock-1', score: 128, total_questions: 128, passed: true,
          started_at: '2026-06-01T00:00:00Z', completed_at: '2026-06-01T00:10:00Z',
          n400_question_attempts: [],
        },
        {
          id: 'mock-2', score: 128, total_questions: 128, passed: true,
          started_at: '2026-06-02T00:00:00Z', completed_at: '2026-06-02T00:10:00Z',
          n400_question_attempts: [],
        },
      ],
      sectionMocks: [
        { id: 'sm-1', section: 'writing', score: 3, total: 3, passed: true, completed_at: '2026-07-01T00:00:00Z' },
        { id: 'sm-2', section: 'speaking', score: 3, total: 3, passed: true, completed_at: '2026-07-01T00:00:00Z' },
      ],
    });

    const result = await loadLearningSignals(supabase, 'user-1', viDict, noGradedDays);

    // Sanity-check the "everything else is satisfied" premise itself, so a
    // broken mocks/sectionMocks pipeline can't silently make this pass for
    // the wrong reason (e.g. civics_mock failing instead of writing_known).
    expect(result.mockCount).toBe(2);
    expect(result.mockAvgPct).toBe(100);

    expect(result.readinessReady).toBe(false);
  });

  it('computes weakest section from graded accuracy, breaking ties in SECTION_KEYS order', async () => {
    // yesno and writing tie at 50% graded accuracy; whatmean is stronger.
    // SECTION_KEYS = ['whatmean', 'yesno', 'writing'], and the scan uses a
    // strict `<`, so the FIRST section reached at the lowest rate wins ties.
    const supabase = fakeSupabase({
      rollup: {
        civics_seen: 0,
        civics_mastered: 0,
        sections: {
          whatmean: { mastered: 0, graded_correct: 9, graded_total: 10 },
          yesno: { mastered: 0, graded_correct: 1, graded_total: 2 },
          writing: { mastered: 0, graded_correct: 2, graded_total: 4 },
        },
      },
    });

    const result = await loadLearningSignals(supabase, 'user-1', viDict, noGradedDays);

    expect(result.weakestSection).toBe('yesno');
    expect(result.weakestSectionAttempts).toBe(2);
  });

  it('skips sections with no graded attempts when picking the weakest', async () => {
    const supabase = fakeSupabase({
      rollup: {
        civics_seen: 0,
        civics_mastered: 0,
        sections: {
          writing: { mastered: 0, graded_correct: 1, graded_total: 3 },
        },
      },
    });

    const result = await loadLearningSignals(supabase, 'user-1', viDict, noGradedDays);

    expect(result.weakestSection).toBe('writing');
  });

  it('allCivicsSectionsDone is true only at civics_seen === N400_QUESTIONS.length', async () => {
    const atBoundary = fakeSupabase({
      rollup: { civics_seen: N400_QUESTIONS.length, civics_mastered: 0, sections: {} },
    });
    const belowBoundary = fakeSupabase({
      rollup: { civics_seen: N400_QUESTIONS.length - 1, civics_mastered: 0, sections: {} },
    });

    const atResult = await loadLearningSignals(atBoundary, 'user-1', viDict, noGradedDays);
    const belowResult = await loadLearningSignals(belowBoundary, 'user-1', viDict, noGradedDays);

    expect(atResult.allCivicsSectionsDone).toBe(true);
    expect(belowResult.allCivicsSectionsDone).toBe(false);
  });

  it('readiness is not ready for a learner with no mastery and no mocks', async () => {
    const supabase = fakeSupabase({
      rollup: { civics_seen: 0, civics_mastered: 0, sections: {} },
    });

    const result = await loadLearningSignals(supabase, 'user-1', viDict, noGradedDays);

    expect(result.readinessReady).toBe(false);
    expect(result.mockCount).toBe(0);
    expect(result.mockAvgPct).toBeNull();
  });
});
