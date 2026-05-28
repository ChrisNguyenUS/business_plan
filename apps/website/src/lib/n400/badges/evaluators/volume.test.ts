import { describe, it, expect } from 'vitest';
import { volumeEvaluators } from './volume';
import type { BadgeContext } from '../types';

const ctx: BadgeContext = { trigger: 'session_complete', mode: 'practice', attemptId: 'a-1' };

function fakeFromMode(rows: Array<{ count: number }>) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            eq: async () => ({
              data: rows.map((r) => ({ id: '_', n400_question_attempts: [r] })),
            }),
          }),
        }),
      }),
    }),
  } as any;
}

function fakeFromAny(rows: Array<{ count: number }>) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          not: async () => ({
            data: rows.map((r) => ({ id: '_', n400_question_attempts: [r] })),
          }),
        }),
      }),
    }),
  } as any;
}

describe('practice-sessions-10', () => {
  it('unlocks at 10 ≥5-interaction practice sessions', async () => {
    const rows = Array.from({ length: 10 }, () => ({ count: 7 }));
    const r = await volumeEvaluators['practice-sessions-10']('u', ctx, fakeFromMode(rows));
    expect(r?.slug).toBe('practice-sessions-10');
  });
  it('null at 9', async () => {
    const rows = Array.from({ length: 9 }, () => ({ count: 7 }));
    const r = await volumeEvaluators['practice-sessions-10']('u', ctx, fakeFromMode(rows));
    expect(r).toBeNull();
  });
  it('skips sub-5-interaction sessions', async () => {
    const rows: Array<{ count: number }> = [
      ...Array.from({ length: 9 }, () => ({ count: 7 })),
      ...Array.from({ length: 5 }, () => ({ count: 1 })),
    ];
    const r = await volumeEvaluators['practice-sessions-10']('u', ctx, fakeFromMode(rows));
    expect(r).toBeNull();
  });
});

describe('practice-sessions-30', () => {
  it('unlocks at 30', async () => {
    const rows = Array.from({ length: 30 }, () => ({ count: 6 }));
    const r = await volumeEvaluators['practice-sessions-30']('u', ctx, fakeFromMode(rows));
    expect(r?.slug).toBe('practice-sessions-30');
  });
  it('null at 29', async () => {
    const rows = Array.from({ length: 29 }, () => ({ count: 6 }));
    const r = await volumeEvaluators['practice-sessions-30']('u', ctx, fakeFromMode(rows));
    expect(r).toBeNull();
  });
});

describe('sessions-50', () => {
  it('unlocks at 50 ≥5-interaction sessions in any mode', async () => {
    const rows = Array.from({ length: 50 }, () => ({ count: 7 }));
    const r = await volumeEvaluators['sessions-50']('u', ctx, fakeFromAny(rows));
    expect(r?.slug).toBe('sessions-50');
  });
  it('null at 49', async () => {
    const rows = Array.from({ length: 49 }, () => ({ count: 7 }));
    const r = await volumeEvaluators['sessions-50']('u', ctx, fakeFromAny(rows));
    expect(r).toBeNull();
  });
});
