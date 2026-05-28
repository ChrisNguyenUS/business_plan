import { describe, it, expect } from 'vitest';
import { mockTestEvaluators } from './mock-test';
import type { BadgeContext } from '../types';

const ctx: BadgeContext = { trigger: 'session_complete', mode: 'mock_test', attemptId: 'a-1' };

// Minimal SupabaseClient stub that returns whatever you wire up per test.
function fakeFrom(handlers: Record<string, () => any>) {
  return {
    from: (_table: string) => handlers[_table]?.() ?? {},
  } as any;
}

describe('onboarding-first-session', () => {
  it('returns slug when user has at least one completed session with ≥5 question_attempts', async () => {
    const sb = fakeFrom({
      n400_quiz_attempts: () => ({
        select: () => ({
          eq: () => ({
            not: () => ({
              limit: async () => ({
                data: [
                  { id: '1', n400_question_attempts: [{ count: 7 }] },
                  { id: '2', n400_question_attempts: [{ count: 3 }] },
                ],
              }),
            }),
          }),
        }),
      }),
    });
    const r = await mockTestEvaluators['onboarding-first-session']('u', ctx, sb);
    expect(r?.slug).toBe('onboarding-first-session');
  });

  it('returns null when no session reaches ≥5 question_attempts', async () => {
    const sb = fakeFrom({
      n400_quiz_attempts: () => ({
        select: () => ({
          eq: () => ({
            not: () => ({
              limit: async () => ({
                data: [{ id: '1', n400_question_attempts: [{ count: 3 }] }],
              }),
            }),
          }),
        }),
      }),
    });
    const r = await mockTestEvaluators['onboarding-first-session']('u', ctx, sb);
    expect(r).toBeNull();
  });

  it('returns null when no completed sessions exist', async () => {
    const sb = fakeFrom({
      n400_quiz_attempts: () => ({
        select: () => ({
          eq: () => ({
            not: () => ({
              limit: async () => ({ data: [] }),
            }),
          }),
        }),
      }),
    });
    const r = await mockTestEvaluators['onboarding-first-session']('u', ctx, sb);
    expect(r).toBeNull();
  });
});

describe('mock-pass-first / mock-pass-five', () => {
  function passedCountStub(count: number) {
    return fakeFrom({
      n400_quiz_attempts: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: async () => ({ count }),
            }),
          }),
        }),
      }),
    });
  }

  it('mock-pass-first unlocks at 1 passed', async () => {
    const r = await mockTestEvaluators['mock-pass-first']('u', ctx, passedCountStub(1));
    expect(r?.slug).toBe('mock-pass-first');
  });

  it('mock-pass-first null at 0 passed', async () => {
    const r = await mockTestEvaluators['mock-pass-first']('u', ctx, passedCountStub(0));
    expect(r).toBeNull();
  });

  it('mock-pass-five unlocks at 5+ passed', async () => {
    const r = await mockTestEvaluators['mock-pass-five']('u', ctx, passedCountStub(5));
    expect(r?.slug).toBe('mock-pass-five');
  });

  it('mock-pass-five null at 4 passed', async () => {
    const r = await mockTestEvaluators['mock-pass-five']('u', ctx, passedCountStub(4));
    expect(r).toBeNull();
  });
});

describe('mock-high-score', () => {
  it('returns slug when there is a mock attempt with score >= 18', async () => {
    const sb = fakeFrom({
      n400_quiz_attempts: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              gte: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: { id: 'z', score: 19, total_questions: 20 } }),
                }),
              }),
            }),
          }),
        }),
      }),
    });
    const r = await mockTestEvaluators['mock-high-score']('u', ctx, sb);
    expect(r?.slug).toBe('mock-high-score');
    expect(r?.metadata).toMatchObject({ score: 19, total: 20 });
  });

  it('returns null when no mock attempt reaches the high score', async () => {
    const sb = fakeFrom({
      n400_quiz_attempts: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              gte: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          }),
        }),
      }),
    });
    const r = await mockTestEvaluators['mock-high-score']('u', ctx, sb);
    expect(r).toBeNull();
  });
});

describe('mock-perfect', () => {
  function passedAttemptsStub(rows: any[]) {
    return fakeFrom({
      n400_quiz_attempts: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({ limit: async () => ({ data: rows }) }),
              }),
            }),
          }),
        }),
      }),
    });
  }

  it('returns slug when a passed attempt has zero wrong + 12+ correct', async () => {
    const sb = passedAttemptsStub([
      {
        id: 'p1',
        score: 12,
        n400_question_attempts: Array.from({ length: 12 }, () => ({ was_correct: true })),
      },
    ]);
    const r = await mockTestEvaluators['mock-perfect']('u', ctx, sb);
    expect(r?.slug).toBe('mock-perfect');
  });

  it('returns null when every passed attempt has at least one wrong', async () => {
    const sb = passedAttemptsStub([
      {
        id: 'p1',
        score: 14,
        n400_question_attempts: [
          ...Array.from({ length: 14 }, () => ({ was_correct: true })),
          { was_correct: false },
        ],
      },
    ]);
    const r = await mockTestEvaluators['mock-perfect']('u', ctx, sb);
    expect(r).toBeNull();
  });
});

describe('mock-comeback', () => {
  function attemptsStub(passed: number, failed: number) {
    let calls = 0;
    return fakeFrom({
      n400_quiz_attempts: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: async () => {
                calls++;
                return { count: calls === 1 ? passed : failed };
              },
            }),
          }),
        }),
      }),
    });
  }

  it('unlocks when user has both a pass and a fail', async () => {
    const r = await mockTestEvaluators['mock-comeback']('u', ctx, attemptsStub(1, 1));
    expect(r?.slug).toBe('mock-comeback');
  });

  it('null when user has only passes', async () => {
    const r = await mockTestEvaluators['mock-comeback']('u', ctx, attemptsStub(3, 0));
    expect(r).toBeNull();
  });

  it('null when user has only fails', async () => {
    const r = await mockTestEvaluators['mock-comeback']('u', ctx, attemptsStub(0, 3));
    expect(r).toBeNull();
  });
});
