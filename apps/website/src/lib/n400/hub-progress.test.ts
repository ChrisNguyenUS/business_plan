import { describe, expect, it } from 'vitest';
import { deriveHubProgress, continueOrder } from './hub-progress';

const items = [
  { id: 'a', num: 1 },
  { id: 'b', num: 2 },
  { id: 'c', num: 3 },
];

describe('deriveHubProgress', () => {
  it('reports counts, percent and the first unseen item number', () => {
    const seen = new Set(['a']);
    const p = deriveHubProgress(items, (it) => seen.has(it.id), (it) => it.num);
    expect(p).toEqual({ seenCount: 1, totalCount: 3, percent: 33, nextNumber: 2, started: true });
  });

  it('handles a fresh learner', () => {
    const p = deriveHubProgress(items, () => false, (it) => it.num);
    expect(p).toEqual({ seenCount: 0, totalCount: 3, percent: 0, nextNumber: 1, started: false });
  });

  it('handles everything seen', () => {
    const p = deriveHubProgress(items, () => true, (it) => it.num);
    expect(p).toEqual({ seenCount: 3, totalCount: 3, percent: 100, nextNumber: null, started: true });
  });
});

describe('continueOrder', () => {
  it('puts unseen items first, preserving original order within each half', () => {
    const seen = new Set(['b']);
    expect(continueOrder(items, (it) => seen.has(it.id)).map((it) => it.id)).toEqual(['a', 'c', 'b']);
  });
});
