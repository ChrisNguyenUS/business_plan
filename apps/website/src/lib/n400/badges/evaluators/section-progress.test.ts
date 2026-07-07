import { describe, it, expect } from 'vitest';
import { makeCountEvaluator, makePerfectEvaluator } from './section-progress';
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

describe('makeCountEvaluator', () => {
  it('unlocks once distinct item count reaches threshold', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ item_id: `wr-${i}`, was_correct: true }));
    const evalFn = makeCountEvaluator('writing-10', 'writing', 10);
    const r = await evalFn('u', ctx, fakeSupabase(rows));
    expect(r?.slug).toBe('writing-10');
  });

  it('returns null below threshold', async () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ item_id: `wr-${i}`, was_correct: true }));
    const evalFn = makeCountEvaluator('writing-10', 'writing', 10);
    const r = await evalFn('u', ctx, fakeSupabase(rows));
    expect(r).toBeNull();
  });

  it('counts distinct item_ids, not row count', async () => {
    const rows = [
      { item_id: 'wr-1', was_correct: false },
      { item_id: 'wr-1', was_correct: true }, // retry, same item
    ];
    const evalFn = makeCountEvaluator('writing-first', 'writing', 1);
    const r = await evalFn('u', ctx, fakeSupabase(rows));
    expect(r?.metadata).toEqual({ distinct: 1 });
  });
});

describe('makePerfectEvaluator', () => {
  it('unlocks when all items attempted with last-wins accuracy >= threshold', async () => {
    const rows = Array.from({ length: 45 }, (_, i) => ({ item_id: `wr-${i}`, was_correct: i < 43 }));
    const evalFn = makePerfectEvaluator('writing-perfect', 'writing', 45);
    const r = await evalFn('u', ctx, fakeSupabase(rows)); // 43/45 = 95.5%
    expect(r?.slug).toBe('writing-perfect');
  });

  it('blocks when not all items attempted', async () => {
    const rows = Array.from({ length: 44 }, (_, i) => ({ item_id: `wr-${i}`, was_correct: true }));
    const evalFn = makePerfectEvaluator('writing-perfect', 'writing', 45);
    const r = await evalFn('u', ctx, fakeSupabase(rows));
    expect(r).toBeNull();
  });

  it('honors last-wins — a later wrong attempt drops accuracy below threshold', async () => {
    const rows: Array<{ item_id: string; was_correct: boolean }> = Array.from({ length: 45 }, (_, i) => ({
      item_id: `wr-${i}`,
      was_correct: true,
    }));
    rows.push({ item_id: 'wr-0', was_correct: false }); // retype it wrong
    rows.push({ item_id: 'wr-1', was_correct: false });
    rows.push({ item_id: 'wr-2', was_correct: false }); // 3 wrong of 45 = 93.3% < 95%
    const evalFn = makePerfectEvaluator('writing-perfect', 'writing', 45);
    const r = await evalFn('u', ctx, fakeSupabase(rows));
    expect(r).toBeNull();
  });
});
