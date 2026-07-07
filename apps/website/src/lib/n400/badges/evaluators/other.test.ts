import { describe, it, expect } from 'vitest';
import { otherEvaluators } from './other';
import type { BadgeContext } from '../types';

const ctx: BadgeContext = { trigger: 'session_complete', mode: 'practice', attemptId: 'a-1' };

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

describe('other-first-practice', () => {
  it('unlocks after any single attempt exists', async () => {
    const supabase = fakeSupabase({
      n400_question_attempts: { count: 1 },
      n400_section_attempts: { count: 0 },
    });
    const r = await otherEvaluators['other-first-practice']('u', ctx, supabase);
    expect(r?.slug).toBe('other-first-practice');
  });

  it('blocks with zero attempts anywhere', async () => {
    const supabase = fakeSupabase({ n400_question_attempts: { count: 0 }, n400_section_attempts: { count: 0 } });
    const r = await otherEvaluators['other-first-practice']('u', ctx, supabase);
    expect(r).toBeNull();
  });
});

describe('other-comeback', () => {
  it('unlocks with at least one civics pass and one fail', async () => {
    let call = 0;
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: async () => ({ count: call++ === 0 ? 1 : 1 }),
            }),
          }),
        }),
      }),
    } as any;
    const r = await otherEvaluators['other-comeback']('u', ctx, supabase);
    expect(r?.slug).toBe('other-comeback');
  });
});

describe('other-consistent-performer', () => {
  it('unlocks at streak >= 30 from context', async () => {
    const supabase = fakeSupabase({});
    const r = await otherEvaluators['other-consistent-performer'](
      'u',
      { ...ctx, currentStreak: 30 },
      supabase,
    );
    expect(r?.slug).toBe('other-consistent-performer');
  });

  it('blocks below 30', async () => {
    const supabase = fakeSupabase({});
    const r = await otherEvaluators['other-consistent-performer'](
      'u',
      { ...ctx, currentStreak: 29 },
      supabase,
    );
    expect(r).toBeNull();
  });
});

describe('other registry shape', () => {
  it('exposes exactly 8 evaluators', () => {
    expect(Object.keys(otherEvaluators).sort()).toEqual([
      'other-comeback',
      'other-consistent-performer',
      'other-first-practice',
      'other-long-term-memory',
      'other-memory-master',
      'other-mock-rookie',
      'other-test-veteran',
      'other-ultimate',
    ]);
  });
});
