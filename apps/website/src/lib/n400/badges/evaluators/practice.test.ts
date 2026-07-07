import { describe, it, expect } from 'vitest';
import { practiceEvaluators } from './practice';
import type { BadgeContext } from '../types';

const ctx: BadgeContext = { trigger: 'session_complete', mode: 'mock_test', attemptId: 'a-1' };

function chain(result: unknown) {
  const proxy: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(result);
        return () => proxy;
      },
    },
  );
  return proxy;
}

function fakeSupabase(byTable: Record<string, unknown>) {
  return { from: (table: string) => chain(byTable[table] ?? { data: [], count: 0 }) } as any;
}

describe('practice-exam-ready', () => {
  it('unlocks once a civics mock is passed', async () => {
    const supabase = fakeSupabase({ n400_quiz_attempts: { count: 1 }, n400_section_mock_results: { count: 0 } });
    const r = await practiceEvaluators['practice-exam-ready']('u', ctx, supabase);
    expect(r?.slug).toBe('practice-exam-ready');
  });

  it('blocks when no civics mock passed yet', async () => {
    const supabase = fakeSupabase({ n400_quiz_attempts: { count: 0 }, n400_section_mock_results: { count: 0 } });
    const r = await practiceEvaluators['practice-exam-ready']('u', ctx, supabase);
    expect(r).toBeNull();
  });
});

describe('practice-high-score / practice-excellence / practice-perfect-round', () => {
  const nineOfTen = { data: [{ score: 9, total_questions: 10 }] };
  const fivePerfect = { data: Array.from({ length: 10 }, () => ({ score: 20, total: 20 })) };

  it('practice-high-score unlocks at >=90% on any mock session', async () => {
    const supabase = fakeSupabase({ n400_quiz_attempts: nineOfTen, n400_section_mock_results: { data: [] } });
    const r = await practiceEvaluators['practice-high-score']('u', ctx, supabase);
    expect(r?.slug).toBe('practice-high-score');
  });

  it('practice-excellence needs 10 sessions at >=90%', async () => {
    const supabase = fakeSupabase({ n400_quiz_attempts: { data: [] }, n400_section_mock_results: fivePerfect });
    const r = await practiceEvaluators['practice-excellence']('u', ctx, supabase);
    expect(r?.slug).toBe('practice-excellence');
  });

  it('practice-perfect-round unlocks on a 100% session', async () => {
    const supabase = fakeSupabase({
      n400_quiz_attempts: { data: [{ score: 20, total_questions: 20 }] },
      n400_section_mock_results: { data: [] },
    });
    const r = await practiceEvaluators['practice-perfect-round']('u', ctx, supabase);
    expect(r?.slug).toBe('practice-perfect-round');
  });
});

describe('practice-perfect-accuracy / practice-perfect-streak', () => {
  it('unlocks perfect-streak on a 50-correct-in-a-row timeline', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      was_correct: true,
      answered_at: `2026-01-01T00:${String(i).padStart(2, '0')}:00Z`,
    }));
    const supabase = fakeSupabase({ n400_question_attempts: { data: rows }, n400_section_attempts: { data: [] } });
    const r = await practiceEvaluators['practice-perfect-streak']('u', ctx, supabase);
    expect(r?.slug).toBe('practice-perfect-streak');
  });

  it('does not unlock perfect-accuracy (100) on only 50 correct in a row', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      was_correct: true,
      answered_at: `2026-01-01T00:${String(i).padStart(2, '0')}:00Z`,
    }));
    const supabase = fakeSupabase({ n400_question_attempts: { data: rows }, n400_section_attempts: { data: [] } });
    const r = await practiceEvaluators['practice-perfect-accuracy']('u', ctx, supabase);
    expect(r).toBeNull();
  });
});

describe('practice registry shape', () => {
  it('exposes exactly 8 evaluators', () => {
    expect(Object.keys(practiceEvaluators).sort()).toEqual([
      'practice-exam-ready',
      'practice-excellence',
      'practice-future-citizen',
      'practice-high-score',
      'practice-mock-champion',
      'practice-perfect-accuracy',
      'practice-perfect-round',
      'practice-perfect-streak',
    ]);
  });
});
