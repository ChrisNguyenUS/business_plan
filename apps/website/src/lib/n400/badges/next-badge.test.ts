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
});

const CATALOG: BadgeMeta[] = [
  badge('streak-3', 10),
  badge('streak-7', 20),
  badge('streak-14', 30),
  badge('onboarding-first-session', 100, 'mock'),
  badge('mock-pass-first', 110, 'mock'),
  badge('mock-pass-five', 120, 'mock'),
  badge('mock-high-score', 130, 'mock'),
  badge('correct-answers-100', 200, 'coverage'),
  badge('flashcards-mastery', 210, 'coverage'),
  badge('all-128-answered', 220, 'coverage'),
  badge('practice-sessions-10', 300, 'volume'),
  badge('category-democracy', 400, 'category'),
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
    const earned = new Set(['streak-3', 'onboarding-first-session', 'mock-pass-first']);
    const r = pickNextBadge(CATALOG, earned, progress({ currentStreak: 3, mockPassed: 1 }));
    expect(r).not.toBeNull();
    expect(earned.has(r!.badge.slug)).toBe(false);
  });

  it('suggests the unearned badge with the highest progress ratio', () => {
    // streak 3/7 (~0.43) vs 120/128 answered (~0.94) → all-128-answered wins.
    const earned = new Set(['streak-3']);
    const r = pickNextBadge(
      CATALOG,
      earned,
      progress({ currentStreak: 3, distinctAnswered: 120 }),
    );
    expect(r?.badge.slug).toBe('all-128-answered');
    expect(r?.current).toBe(120);
    expect(r?.target).toBe(128);
  });

  it('falls back to sort_order when nothing is measurable', () => {
    const earned = new Set([
      'streak-3',
      'streak-7',
      'streak-14',
      'onboarding-first-session',
      'mock-pass-first',
      'mock-pass-five',
      'mock-high-score',
      'correct-answers-100',
      'flashcards-mastery',
      'all-128-answered',
    ]);
    const r = pickNextBadge(CATALOG, earned, progress());
    expect(r?.badge.slug).toBe('practice-sessions-10');
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

  it('mirrors the reported dashboard state: suggests streak-7 with 3/7 progress', () => {
    // Screenshot state: streak=3, streak-3 + mock-pass-first + onboarding earned,
    // 83/128 answered, 1 mock passed.
    const earned = new Set(['streak-3', 'onboarding-first-session', 'mock-pass-first']);
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
    // bestMockScore 14/18 (~0.78) beats mock-pass-five 1/5, streak 3/7,
    // 83/128 (~0.65), 70/100 → mock-high-score is genuinely closest.
    expect(r?.badge.slug).toBe('mock-high-score');
    expect(r?.badge.slug).not.toBe('streak-3');
  });
});
