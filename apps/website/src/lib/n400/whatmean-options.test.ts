import { describe, it, expect } from 'vitest';
import { buildWhatMeanOptions } from './whatmean-options';
import { WHATMEAN_QUESTIONS_BY_ID } from './whatmean-data';

const q = WHATMEAN_QUESTIONS_BY_ID['wm-2']; // Register to vote

describe('buildWhatMeanOptions', () => {
  it('returns 4 options: the definition + its 3 distractors', () => {
    const opts = buildWhatMeanOptions(q, 'seed-1');
    expect(opts).toHaveLength(4);
    const texts = opts.map((o) => o.text).sort();
    expect(texts).toEqual([q.definitionEn, ...q.distractorsEn].sort());
    expect(opts.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(opts.find((o) => o.isCorrect)!.text).toBe(q.definitionEn);
  });

  it('is deterministic for a given (id, seed)', () => {
    expect(buildWhatMeanOptions(q, 's')).toEqual(buildWhatMeanOptions(q, 's'));
  });

  it('varies the correct answer position across seeds (not always first)', () => {
    const positions = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const opts = buildWhatMeanOptions(q, `seed-${i}`);
      positions.add(opts.findIndex((o) => o.isCorrect));
    }
    expect(positions.size).toBeGreaterThan(1); // shuffled, not fixed at index 0
  });

  it('assigns A–D ids in render order', () => {
    const opts = buildWhatMeanOptions(q, 'seed-1');
    expect(opts.map((o) => o.id)).toEqual(['A', 'B', 'C', 'D']);
  });
});
