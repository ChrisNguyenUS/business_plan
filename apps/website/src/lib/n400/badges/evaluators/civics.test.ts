import { describe, it, expect } from 'vitest';
import { civicsEvaluators } from './civics';
import type { BadgeContext } from '../types';

const ctx: BadgeContext = { trigger: 'session_complete', mode: 'practice', attemptId: 'a-1' };

function fakeSupabase(ids: number[]) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: ids.map((id, i) => ({
              question_id: id,
              was_correct: true,
              answered_at: `2026-01-01T00:00:${String(i % 60).padStart(2, '0')}Z`,
            })),
          }),
        }),
      }),
    }),
  } as any;
}

describe('civicsEvaluators', () => {
  it('civics-first unlocks at 1 distinct question', async () => {
    const r = await civicsEvaluators['civics-first']('u', ctx, fakeSupabase([1]));
    expect(r?.slug).toBe('civics-first');
  });

  it('civics-128 requires all 128 distinct questions', async () => {
    const ids = Array.from({ length: 127 }, (_, i) => i + 1);
    const r = await civicsEvaluators['civics-128']('u', ctx, fakeSupabase(ids));
    expect(r).toBeNull();
    const r2 = await civicsEvaluators['civics-128']('u', ctx, fakeSupabase([...ids, 128]));
    expect(r2?.slug).toBe('civics-128');
  });

  it('exposes exactly 6 evaluators', () => {
    expect(Object.keys(civicsEvaluators).sort()).toEqual([
      'civics-10',
      'civics-100',
      'civics-128',
      'civics-30',
      'civics-50',
      'civics-first',
    ]);
  });
});
