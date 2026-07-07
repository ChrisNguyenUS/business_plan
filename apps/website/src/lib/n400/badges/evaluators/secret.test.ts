import { describe, it, expect } from 'vitest';
import { secretEvaluators } from './secret';
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

function fakeSupabaseTimeline(civics: unknown[], sections: unknown[]) {
  return {
    from: (table: string) =>
      chain({ data: table === 'n400_question_attempts' ? civics : sections }),
  } as any;
}

describe('secret-marathon', () => {
  it('unlocks when a single UTC day has >=100 answers', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      was_correct: true,
      answered_at: `2026-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
    }));
    const supabase = fakeSupabaseTimeline(rows, []);
    const r = await secretEvaluators['secret-marathon']('u', ctx, supabase);
    expect(r?.slug).toBe('secret-marathon');
  });

  it('blocks when spread across two days under 100 each', async () => {
    const day1 = Array.from({ length: 60 }, (_, i) => ({ was_correct: true, answered_at: `2026-01-01T0${i % 9}:00:00Z` }));
    const day2 = Array.from({ length: 60 }, (_, i) => ({ was_correct: true, answered_at: `2026-01-02T0${i % 9}:00:00Z` }));
    const supabase = fakeSupabaseTimeline([...day1, ...day2], []);
    const r = await secretEvaluators['secret-marathon']('u', ctx, supabase);
    expect(r).toBeNull();
  });
});

describe('secret-speed-learner', () => {
  it('unlocks when 20 correct answers land within a 10-minute window', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      was_correct: true,
      answered_at: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`,
    }));
    // 20 entries spaced 1s apart span 19s total, well under 10 minutes.
    const supabase = fakeSupabaseTimeline(rows, []);
    const r = await secretEvaluators['secret-speed-learner']('u', ctx, supabase);
    expect(r?.slug).toBe('secret-speed-learner');
  });

  it('blocks when 20 correct answers are spread over hours', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      was_correct: true,
      answered_at: `2026-01-01T${String(i).padStart(2, '0')}:00:00Z`,
    }));
    const supabase = fakeSupabaseTimeline(rows, []);
    const r = await secretEvaluators['secret-speed-learner']('u', ctx, supabase);
    expect(r).toBeNull();
  });
});

describe('secret-never-give-up', () => {
  it('unlocks when the user answers again after 20 lifetime wrong answers', async () => {
    const wrongs = Array.from({ length: 20 }, (_, i) => ({
      was_correct: false,
      answered_at: `2026-01-01T00:${String(i).padStart(2, '0')}:00Z`,
    }));
    const oneMore = [{ was_correct: true, answered_at: '2026-01-01T01:00:00Z' }];
    const supabase = fakeSupabaseTimeline([...wrongs, ...oneMore], []);
    const r = await secretEvaluators['secret-never-give-up']('u', ctx, supabase);
    expect(r?.slug).toBe('secret-never-give-up');
  });

  it('blocks right at the 20th wrong answer with nothing after it', async () => {
    const wrongs = Array.from({ length: 20 }, (_, i) => ({
      was_correct: false,
      answered_at: `2026-01-01T00:${String(i).padStart(2, '0')}:00Z`,
    }));
    const supabase = fakeSupabaseTimeline(wrongs, []);
    const r = await secretEvaluators['secret-never-give-up']('u', ctx, supabase);
    expect(r).toBeNull();
  });
});

describe('secret registry shape', () => {
  it('exposes exactly 5 evaluators', () => {
    expect(Object.keys(secretEvaluators).sort()).toEqual([
      'secret-early-bird',
      'secret-marathon',
      'secret-never-give-up',
      'secret-night-owl',
      'secret-speed-learner',
    ]);
  });
});
