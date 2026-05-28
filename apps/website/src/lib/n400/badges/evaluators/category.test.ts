import { describe, it, expect } from 'vitest';
import { categoryEvaluators } from './category';
import type { BadgeContext } from '../types';

const ctx: BadgeContext = { trigger: 'session_complete', mode: 'practice', attemptId: 'a-1' };

// Stub the two queries computeMasteryMap fires in parallel:
//   1. n400_question_attempts (with embedded n400_questions)
//   2. n400_questions (count by category_code)
function fakeSupabase(
  attempts: Array<{ question_id: number; was_correct: boolean; answered_at: string; category_code: string | null }>,
  questionRows: Array<{ category_code: string | null }>,
) {
  return {
    from: (table: string) => {
      if (table === 'n400_question_attempts') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: attempts.map((a) => ({
                  question_id: a.question_id,
                  was_correct: a.was_correct,
                  answered_at: a.answered_at,
                  n400_questions: { category_code: a.category_code },
                })),
              }),
            }),
          }),
        };
      }
      if (table === 'n400_questions') {
        return {
          select: () => ({
            not: async () => ({ data: questionRows }),
          }),
        };
      }
      return {};
    },
  } as any;
}

describe('category-democracy (code A)', () => {
  it('unlocks at 80% latest-attempt accuracy in category A', async () => {
    const cat = 'A';
    const totalQs = 14; // matches DB count for principles
    const correctQs = Math.ceil(totalQs * 0.8); // 12
    const attempts: Array<{ question_id: number; was_correct: boolean; answered_at: string; category_code: string | null }> = [];
    for (let i = 1; i <= correctQs; i++) {
      attempts.push({ question_id: i, was_correct: true, answered_at: `2026-01-${i}`, category_code: cat });
    }
    for (let i = correctQs + 1; i <= totalQs; i++) {
      attempts.push({ question_id: i, was_correct: false, answered_at: `2026-01-${i}`, category_code: cat });
    }
    const questionRows = Array.from({ length: totalQs }, () => ({ category_code: cat }));
    const r = await categoryEvaluators['category-democracy']('u', ctx, fakeSupabase(attempts, questionRows));
    expect(r?.slug).toBe('category-democracy');
    expect(r?.metadata).toMatchObject({ total: 14 });
  });

  it('returns null below 80%', async () => {
    const cat = 'A';
    const totalQs = 14;
    const correctQs = 10; // ~71%
    const attempts: Array<{ question_id: number; was_correct: boolean; answered_at: string; category_code: string | null }> = [];
    for (let i = 1; i <= correctQs; i++) {
      attempts.push({ question_id: i, was_correct: true, answered_at: `2026-01-${i}`, category_code: cat });
    }
    for (let i = correctQs + 1; i <= totalQs; i++) {
      attempts.push({ question_id: i, was_correct: false, answered_at: `2026-01-${i}`, category_code: cat });
    }
    const questionRows = Array.from({ length: totalQs }, () => ({ category_code: cat }));
    const r = await categoryEvaluators['category-democracy']('u', ctx, fakeSupabase(attempts, questionRows));
    expect(r).toBeNull();
  });

  it('honors last-wins — earlier wrong + later correct on same q counts as correct', async () => {
    const cat = 'A';
    const totalQs = 1;
    const attempts = [
      { question_id: 1, was_correct: false, answered_at: '2026-01-01', category_code: cat },
      { question_id: 1, was_correct: true, answered_at: '2026-01-02', category_code: cat },
    ];
    const questionRows = [{ category_code: cat }];
    const r = await categoryEvaluators['category-democracy']('u', ctx, fakeSupabase(attempts, questionRows));
    expect(r?.slug).toBe('category-democracy');
  });

  it('isolates by category — questions in B do not count toward A', async () => {
    const attempts = [
      { question_id: 1, was_correct: true, answered_at: '2026-01-01', category_code: 'A' },
      { question_id: 2, was_correct: true, answered_at: '2026-01-01', category_code: 'B' },
    ];
    const questionRows = [{ category_code: 'A' }, { category_code: 'A' }, { category_code: 'B' }];
    // Category A: 1 mastered / 2 total = 50% → no unlock
    const r = await categoryEvaluators['category-democracy']('u', ctx, fakeSupabase(attempts, questionRows));
    expect(r).toBeNull();
  });
});

describe('all 5 category evaluators are registered', () => {
  it('exposes the expected slug set', () => {
    expect(Object.keys(categoryEvaluators).sort()).toEqual([
      'category-democracy',
      'category-government',
      'category-history',
      'category-rights',
      'category-symbols',
    ]);
  });
});
