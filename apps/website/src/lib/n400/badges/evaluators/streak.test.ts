import { describe, it, expect, vi } from 'vitest';
import { streakEvaluators } from './streak';
import type { BadgeContext } from '../types';

const ctx = (currentStreak?: number): BadgeContext => ({
  trigger: 'streak_change',
  currentStreak,
});

const fakeSupabase = (currentStreak: number | null = null) =>
  ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: currentStreak === null ? null : { current_streak: currentStreak },
          }),
        }),
      }),
    }),
  }) as unknown as Parameters<typeof streakEvaluators['streak-3']>[2];

describe('streakEvaluators', () => {
  it('returns slug when streak >= threshold (from context)', async () => {
    const r = await streakEvaluators['streak-7']('user-1', ctx(7), fakeSupabase());
    expect(r?.slug).toBe('streak-7');
    expect(r?.metadata).toEqual({ streak: 7 });
  });

  it('returns null when streak < threshold', async () => {
    const r = await streakEvaluators['streak-7']('user-1', ctx(6), fakeSupabase());
    expect(r).toBeNull();
  });

  it('returns slug for all thresholds <= current streak', async () => {
    const results = await Promise.all(
      ['streak-3', 'streak-7', 'streak-14', 'streak-30', 'streak-60', 'streak-100'].map((slug) =>
        streakEvaluators[slug]('user-1', ctx(30), fakeSupabase()),
      ),
    );
    const unlocked = results.filter(Boolean).map((r) => r!.slug);
    expect(unlocked).toEqual(['streak-3', 'streak-7', 'streak-14', 'streak-30']);
  });

  it('falls back to DB read when ctx has no currentStreak', async () => {
    const r = await streakEvaluators['streak-14'](
      'user-1',
      ctx(undefined),
      fakeSupabase(20),
    );
    expect(r?.slug).toBe('streak-14');
  });

  it('returns null when DB has no profile row', async () => {
    const r = await streakEvaluators['streak-3'](
      'user-1',
      ctx(undefined),
      fakeSupabase(null),
    );
    expect(r).toBeNull();
  });

  it('runs the same evaluator twice without throwing — idempotency lives at DB layer', async () => {
    const r1 = await streakEvaluators['streak-7']('user-1', ctx(7), fakeSupabase());
    const r2 = await streakEvaluators['streak-7']('user-1', ctx(7), fakeSupabase());
    expect(r1?.slug).toBe('streak-7');
    expect(r2?.slug).toBe('streak-7');
  });
});

describe('streakEvaluators registry shape', () => {
  it('exposes exactly 6 evaluators', () => {
    expect(Object.keys(streakEvaluators).sort()).toEqual([
      'streak-100',
      'streak-14',
      'streak-3',
      'streak-30',
      'streak-60',
      'streak-7',
    ]);
  });
});

// Vitest implicit unused-var keeps `vi` referenced for future use:
void vi;
