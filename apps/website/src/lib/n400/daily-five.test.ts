import { describe, it, expect } from 'vitest';
import { dailyFiveSelection } from './daily-five';

const ids = Array.from({ length: 20 }, (_, i) => `wm-${i + 1}`);

describe('dailyFiveSelection', () => {
  it('is deterministic for the same seed key', () => {
    const a = dailyFiveSelection(ids, new Set(), new Set(), 'whatmean:2026-07-06');
    const b = dailyFiveSelection(ids, new Set(), new Set(), 'whatmean:2026-07-06');
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
  });

  it('differs across seed keys (different day or section)', () => {
    const a = dailyFiveSelection(ids, new Set(), new Set(), 'whatmean:2026-07-06');
    const b = dailyFiveSelection(ids, new Set(), new Set(), 'whatmean:2026-07-07');
    const c = dailyFiveSelection(ids, new Set(), new Set(), 'yesno:2026-07-06');
    // 20 choose 5 orderings — collisions astronomically unlikely
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('prioritizes unseen, reserves exactly 1 review slot when possible', () => {
    const known = new Set(['wm-1', 'wm-2']);
    const seen = new Set(['wm-1', 'wm-2', 'wm-3', 'wm-4']); // wm-3, wm-4 = chưa thuộc
    const pick = dailyFiveSelection(ids, known, seen, 'whatmean:2026-07-06');
    expect(pick).toHaveLength(5);
    const reviewCount = pick.filter((id) => known.has(id)).length;
    expect(reviewCount).toBe(1); // exactly one đã-thuộc for review
    // the other 4 come from unseen/learning, never duplicated
    expect(new Set(pick).size).toBe(5);
  });

  it('falls back to learning then mastered when unseen runs out', () => {
    const known = new Set(ids.slice(0, 17)); // 17 mastered
    const seen = new Set(ids); // everything seen; 3 learning (wm-18..20)
    const pick = dailyFiveSelection(ids, known, seen, 'whatmean:2026-07-06');
    expect(pick).toHaveLength(5);
    // all 3 learning items must be in the set; remaining 2 are review
    for (const id of ['wm-18', 'wm-19', 'wm-20']) expect(pick).toContain(id);
  });

  it('becomes a pure review day when everything is mastered', () => {
    const known = new Set(ids);
    const pick = dailyFiveSelection(ids, known, new Set(ids), 'whatmean:2026-07-06');
    expect(pick).toHaveLength(5);
    for (const id of pick) expect(known.has(id)).toBe(true);
  });

  it('caps at pool size for tiny pools', () => {
    const pick = dailyFiveSelection(['wm-1', 'wm-2'], new Set(), new Set(), 'x:2026-07-06');
    expect(pick).toHaveLength(2);
  });
});
