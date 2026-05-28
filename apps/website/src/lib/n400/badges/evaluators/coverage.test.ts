import { describe, it, expect } from 'vitest';
import { coverageEvaluators } from './coverage';
import type { BadgeContext } from '../types';

const ctx: BadgeContext = { trigger: 'session_complete', mode: 'practice', attemptId: 'a-1' };

function fakeFrom(handlers: Record<string, () => any>) {
  return { from: (t: string) => handlers[t]?.() ?? {} } as any;
}

describe('correct-answers-100', () => {
  function stub(count: number) {
    return fakeFrom({
      n400_question_attempts: () => ({
        select: () => ({
          eq: () => ({
            eq: async () => ({ count }),
          }),
        }),
      }),
    });
  }
  it('unlocks at 100 correct', async () => {
    const r = await coverageEvaluators['correct-answers-100']('u', ctx, stub(100));
    expect(r?.slug).toBe('correct-answers-100');
  });
  it('null at 99 correct', async () => {
    const r = await coverageEvaluators['correct-answers-100']('u', ctx, stub(99));
    expect(r).toBeNull();
  });
});

describe('flashcards-mastery', () => {
  function stub(rows: Array<{ question_id: number; was_correct: boolean }>) {
    return fakeFrom({
      n400_question_attempts: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: async () => ({ data: rows }),
            }),
          }),
        }),
      }),
    });
  }
  it('unlocks when ≥100 distinct question_ids have latest was_correct=true', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ question_id: i + 1, was_correct: true }));
    const r = await coverageEvaluators['flashcards-mastery']('u', ctx, stub(rows));
    expect(r?.slug).toBe('flashcards-mastery');
  });
  it('honors last-wins — a later was_correct=false drops the count', async () => {
    const rows: Array<{ question_id: number; was_correct: boolean }> = [];
    for (let i = 1; i <= 100; i++) {
      rows.push({ question_id: i, was_correct: true });
    }
    rows.push({ question_id: 1, was_correct: false }); // drops to 99 known
    const r = await coverageEvaluators['flashcards-mastery']('u', ctx, stub(rows));
    expect(r).toBeNull();
  });
});

describe('all-128-answered', () => {
  function stub(ids: number[]) {
    return fakeFrom({
      n400_question_attempts: () => ({
        select: () => ({
          eq: async () => ({ data: ids.map((id) => ({ question_id: id })) }),
        }),
      }),
    });
  }
  it('unlocks at 128 distinct question_ids', async () => {
    const ids = Array.from({ length: 128 }, (_, i) => i + 1);
    const r = await coverageEvaluators['all-128-answered']('u', ctx, stub(ids));
    expect(r?.slug).toBe('all-128-answered');
  });
  it('null at 127 distinct', async () => {
    const ids = Array.from({ length: 127 }, (_, i) => i + 1);
    const r = await coverageEvaluators['all-128-answered']('u', ctx, stub(ids));
    expect(r).toBeNull();
  });
  it('counts duplicates only once', async () => {
    // 128 rows but only 4 distinct → null
    const ids = [1, 1, 2, 2, 3, 3, 4, 4];
    const r = await coverageEvaluators['all-128-answered']('u', ctx, stub(ids));
    expect(r).toBeNull();
  });
});

describe('sessions-100', () => {
  function stub(rows: Array<{ count: number }>) {
    return fakeFrom({
      n400_quiz_attempts: () => ({
        select: () => ({
          eq: () => ({
            not: async () => ({
              data: rows.map((r) => ({ id: '_', n400_question_attempts: [r] })),
            }),
          }),
        }),
      }),
    });
  }
  it('unlocks at 100 completed sessions with ≥5 interactions', async () => {
    const rows = Array.from({ length: 100 }, () => ({ count: 7 }));
    const r = await coverageEvaluators['sessions-100']('u', ctx, stub(rows));
    expect(r?.slug).toBe('sessions-100');
  });
  it('skips sub-5-interaction sessions', async () => {
    const rows: Array<{ count: number }> = [
      ...Array.from({ length: 99 }, () => ({ count: 7 })),
      ...Array.from({ length: 5 }, () => ({ count: 2 })),
    ];
    const r = await coverageEvaluators['sessions-100']('u', ctx, stub(rows));
    expect(r).toBeNull();
  });
});
