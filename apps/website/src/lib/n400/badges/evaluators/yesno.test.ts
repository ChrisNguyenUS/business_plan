import { describe, it, expect } from 'vitest';
import { yesnoEvaluators } from './yesno';
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

describe('yesnoEvaluators', () => {
  it('exposes exactly 6 evaluators wired to the yesno section', () => {
    expect(Object.keys(yesnoEvaluators).sort()).toEqual([
      'yesno-10',
      'yesno-20',
      'yesno-30',
      'yesno-37',
      'yesno-first',
      'yesno-perfect',
    ]);
  });

  it('yesno-37 requires all 37 questions attempted', async () => {
    const rows = Array.from({ length: 37 }, (_, i) => ({ item_id: `yn-${i}`, was_correct: true }));
    const r = await yesnoEvaluators['yesno-37']('u', ctx, fakeSupabase(rows));
    expect(r?.slug).toBe('yesno-37');
  });

  it('yesno-10 unlocks at 10 distinct answered', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ item_id: `yn-${i}`, was_correct: false }));
    const r = await yesnoEvaluators['yesno-10']('u', ctx, fakeSupabase(rows));
    expect(r?.slug).toBe('yesno-10');
  });
});
