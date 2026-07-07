import { describe, it, expect } from 'vitest';
import { writingEvaluators } from './writing';
import type { BadgeContext } from '../types';

const ctx: BadgeContext = { trigger: 'session_complete', mode: 'practice', attemptId: 'a-1' };

function fakeSupabase(rows: Array<{ item_id: string; was_correct: boolean }>) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: async () => ({ data: rows }),
          }),
        }),
      }),
    }),
  } as any;
}

describe('writingEvaluators', () => {
  it('exposes exactly 6 evaluators wired to the writing section', () => {
    expect(Object.keys(writingEvaluators).sort()).toEqual([
      'writing-10',
      'writing-20',
      'writing-35',
      'writing-45',
      'writing-first',
      'writing-perfect',
    ]);
  });

  it('writing-45 requires all 45 sentences attempted', async () => {
    const rows = Array.from({ length: 44 }, (_, i) => ({ item_id: `wr-${i}`, was_correct: true }));
    const r = await writingEvaluators['writing-45']('u', ctx, fakeSupabase(rows));
    expect(r).toBeNull();
  });

  it('writing-perfect requires all 45 attempted at >=95% accuracy', async () => {
    const rows = Array.from({ length: 45 }, (_, i) => ({ item_id: `wr-${i}`, was_correct: i < 43 }));
    const r = await writingEvaluators['writing-perfect']('u', ctx, fakeSupabase(rows));
    expect(r?.slug).toBe('writing-perfect');
  });
});
