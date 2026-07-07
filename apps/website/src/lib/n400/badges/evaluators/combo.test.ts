import { describe, it, expect } from 'vitest';
import { comboEvaluators } from './combo';
import type { BadgeContext } from '../types';

const ctx: BadgeContext = { trigger: 'session_complete', mode: 'practice', attemptId: 'a-1' };

// Generic chainable stub: any method call returns the same proxy, and
// `await`ing it at any point in the chain resolves to `result`. Lets one
// stub stand in for arbitrarily different Supabase query-builder shapes
// without having to match each evaluator's exact .select().eq().eq() chain.
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

describe('combo-starter / combo-explorer', () => {
  it('unlocks combo-starter when every section clears its threshold', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ item_id: `x-${i}`, was_correct: true }));
    const supabase = fakeSupabase({ n400_section_attempts: { data: rows } });
    const r = await comboEvaluators['combo-starter']('u', ctx, supabase);
    expect(r?.slug).toBe('combo-starter');
  });

  it('blocks combo-starter when sections are empty', async () => {
    const supabase = fakeSupabase({ n400_section_attempts: { data: [] } });
    const r = await comboEvaluators['combo-starter']('u', ctx, supabase);
    expect(r).toBeNull();
  });
});

describe('combo-interview-ready', () => {
  it('unlocks once civics + all 3 sections have at least one attempt', async () => {
    const supabase = fakeSupabase({
      n400_question_attempts: { data: [{ question_id: 1 }] },
      n400_section_attempts: { data: [{ item_id: 'x-1', was_correct: true }] },
    });
    const r = await comboEvaluators['combo-interview-ready']('u', ctx, supabase);
    expect(r?.slug).toBe('combo-interview-ready');
  });

  it('blocks when civics has no attempts yet', async () => {
    const supabase = fakeSupabase({
      n400_question_attempts: { data: [] },
      n400_section_attempts: { data: [{ item_id: 'x-1', was_correct: true }] },
    });
    const r = await comboEvaluators['combo-interview-ready']('u', ctx, supabase);
    expect(r).toBeNull();
  });
});

describe('combo-interview-master', () => {
  it('unlocks once all 3 mock types have a passed result', async () => {
    const supabase = fakeSupabase({
      n400_quiz_attempts: { count: 1 },
      n400_section_mock_results: { count: 1 },
    });
    const r = await comboEvaluators['combo-interview-master']('u', ctx, supabase);
    expect(r?.slug).toBe('combo-interview-master');
  });

  it('blocks when a mock type has zero passes', async () => {
    const supabase = fakeSupabase({
      n400_quiz_attempts: { count: 0 },
      n400_section_mock_results: { count: 1 },
    });
    const r = await comboEvaluators['combo-interview-master']('u', ctx, supabase);
    expect(r).toBeNull();
  });
});

describe('combo registry shape', () => {
  it('exposes exactly 5 evaluators', () => {
    expect(Object.keys(comboEvaluators).sort()).toEqual([
      'combo-explorer',
      'combo-interview-master',
      'combo-interview-ready',
      'combo-language-champion',
      'combo-starter',
    ]);
  });
});
