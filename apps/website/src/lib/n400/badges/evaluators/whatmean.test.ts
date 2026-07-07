import { describe, it, expect } from 'vitest';
import { whatmeanEvaluators } from './whatmean';
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

describe('whatmeanEvaluators', () => {
  it('exposes exactly 6 evaluators wired to the whatmean section', () => {
    expect(Object.keys(whatmeanEvaluators).sort()).toEqual([
      'whatmean-15',
      'whatmean-30',
      'whatmean-45',
      'whatmean-62',
      'whatmean-first',
      'whatmean-perfect',
    ]);
  });

  it('whatmean-62 requires all 62 questions attempted', async () => {
    const rows = Array.from({ length: 61 }, (_, i) => ({ item_id: `wm-${i}`, was_correct: true }));
    const r = await whatmeanEvaluators['whatmean-62']('u', ctx, fakeSupabase(rows));
    expect(r).toBeNull();
  });
});
