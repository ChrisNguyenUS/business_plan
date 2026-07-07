import { describe, it, expect } from 'vitest';
import { pickNextBadge, type NextBadgeProgress } from './next-badge';
import type { BadgeMeta } from '../use-badges';

const badge = (
  slug: string,
  sort_order: number,
  group_code: BadgeMeta['group_code'] = 'streak',
): BadgeMeta => ({
  slug,
  title_vi: slug,
  title_en: slug,
  description_vi: '',
  description_en: '',
  group_code,
  sort_order,
  is_secret: false,
});

const CATALOG: BadgeMeta[] = [
  badge('streak-3', 10),
  badge('streak-7', 20),
  badge('streak-14', 30),
  badge('civics-first', 100, 'civics'),
  badge('civics-128', 150, 'civics'),
  badge('practice-exam-ready', 600, 'practice'),
  badge('practice-mock-champion', 670, 'practice'),
  badge('practice-future-citizen', 610, 'practice'),
  badge('other-comeback', 730, 'other'),
  badge('other-first-practice', 700, 'other'),
];

const progress = (p: Partial<NextBadgeProgress> = {}): NextBadgeProgress => ({
  currentStreak: 0,
  distinctAnswered: 0,
  correctCount: 0,
  flashcardsKnown: 0,
  mockPassed: 0,
  mockFailed: 0,
  bestMockScore: 0,
  ...p,
});

describe('pickNextBadge', () => {
  it('never suggests an earned badge (regression: streak-3 earned, streak=3)', () => {
    // Dashboard bug: user already unlocked streak-3 but the card kept
    // showing "3 ngày liên tiếp" because it rendered catalog[0].
    const earned = new Set(['streak-3', 'other-first-practice', 'practice-exam-ready']);
    const r = pickNextBadge(CATALOG, earned, progress({ currentStreak: 3, mockPassed: 1 }));
    expect(r).not.toBeNull();
    expect(earned.has(r!.badge.slug)).toBe(false);
  });

  it('suggests the unearned badge with the highest progress ratio', () => {
    // streak 3/7 (~0.43) vs 120/128 answered (~0.94) → civics-128 wins.
    // civics-first is already earned (120 answered implies it was crossed
    // long ago) — otherwise its threshold of 1 clamps to ratio 1 and wins
    // by max-progress even though it's not the meaningful "next" badge.
    const earned = new Set(['streak-3', 'civics-first']);
    const r = pickNextBadge(
      CATALOG,
      earned,
      progress({ currentStreak: 3, distinctAnswered: 120 }),
    );
    expect(r?.badge.slug).toBe('civics-128');
    expect(r?.current).toBe(120);
    expect(r?.target).toBe(128);
  });

  it('falls back to sort_order when nothing is measurable', () => {
    const earned = new Set([
      'streak-3',
      'streak-7',
      'streak-14',
      'civics-first',
      'civics-128',
      'practice-exam-ready',
      'practice-mock-champion',
      'practice-future-citizen',
      'other-comeback',
    ]);
    const r = pickNextBadge(CATALOG, earned, progress());
    expect(r?.badge.slug).toBe('other-first-practice');
    expect(r?.ratio).toBe(0);
  });

  it('breaks ratio ties by lower sort_order', () => {
    // Zero progress everywhere → all measurable ratios are 0 → first by sort_order.
    const r = pickNextBadge(CATALOG, new Set(), progress());
    expect(r?.badge.slug).toBe('streak-3');
  });

  it('clamps ratio to 1 when the threshold is already met but unlock is pending', () => {
    const r = pickNextBadge(CATALOG, new Set(), progress({ currentStreak: 5 }));
    expect(r?.badge.slug).toBe('streak-3');
    expect(r?.ratio).toBe(1);
  });

  it('returns null when every badge is earned', () => {
    const all = new Set(CATALOG.map((b) => b.slug));
    expect(pickNextBadge(CATALOG, all, progress())).toBeNull();
  });

  it('returns null on an empty catalog', () => {
    expect(pickNextBadge([], new Set(), progress())).toBeNull();
  });

  it('mirrors the reported dashboard state: suggests practice-future-citizen with 14/18 progress', () => {
    // Screenshot state: streak=3, streak-3 + practice-exam-ready + other-first-practice earned,
    // 83/128 answered (so civics-first is earned too), 1 mock passed.
    const earned = new Set(['streak-3', 'other-first-practice', 'practice-exam-ready', 'civics-first']);
    const r = pickNextBadge(
      CATALOG,
      earned,
      progress({
        currentStreak: 3,
        distinctAnswered: 83,
        correctCount: 70,
        mockPassed: 1,
        bestMockScore: 14,
      }),
    );
    // bestMockScore 14/18 (~0.78) beats practice-mock-champion 1/10, streak 3/7,
    // 83/128 (~0.65) → practice-future-citizen is genuinely closest.
    expect(r?.badge.slug).toBe('practice-future-citizen');
    expect(r?.badge.slug).not.toBe('streak-3');
  });
});
