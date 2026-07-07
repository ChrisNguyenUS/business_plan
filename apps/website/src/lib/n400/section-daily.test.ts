import { describe, it, expect } from 'vitest';
import { sectionDailyFive, dailyFiveDoneCount } from './section-daily';

const ids = Array.from({ length: 20 }, (_, i) => `wm-${i + 1}`);

describe('sectionDailyFive', () => {
  it('is stable for the same section + date, differs by date', () => {
    const a = sectionDailyFive('whatmean', ids, new Set(), new Set(), '2026-07-06');
    const b = sectionDailyFive('whatmean', ids, new Set(), new Set(), '2026-07-06');
    const c = sectionDailyFive('whatmean', ids, new Set(), new Set(), '2026-07-07');
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(5);
  });
});

describe('dailyFiveDoneCount', () => {
  it('counts how many of the selection are known', () => {
    const pick = ['wm-1', 'wm-2', 'wm-3', 'wm-4', 'wm-5'];
    expect(dailyFiveDoneCount(pick, new Set(['wm-1', 'wm-3']))).toBe(2);
    expect(dailyFiveDoneCount(pick, new Set())).toBe(0);
  });
});
