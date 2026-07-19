import { describe, expect, it } from 'vitest';
import { vi } from './i18n/vi';
import {
  FULL_CIVICS_COUNT,
  FULL_CIVICS_PASS,
  FULL_SPEAKING_COUNT,
  FULL_SPEAKING_PASS,
  FULL_WRITING_COUNT,
  FULL_WRITING_PASS,
  buildCivicsPhase,
  buildSpeakingPhase,
  buildWritingPhase,
} from './full-interview';

describe('full interview builders', () => {
  it('pass rules mirror the standalone mocks', () => {
    expect([FULL_CIVICS_COUNT, FULL_CIVICS_PASS]).toEqual([20, 12]);
    expect([FULL_SPEAKING_COUNT, FULL_SPEAKING_PASS]).toEqual([10, 8]);
    expect([FULL_WRITING_COUNT, FULL_WRITING_PASS]).toEqual([3, 1]);
  });

  it('civics phase: 20 unique questions, 4 options each, exactly one correct, civ- item ids', () => {
    const qs = buildCivicsPhase('seed-1', 'TX', null, vi);
    expect(qs).toHaveLength(20);
    expect(new Set(qs.map((q) => q.itemId)).size).toBe(20);
    for (const q of qs) {
      expect(q.itemId).toMatch(/^civ-\d+$/);
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
    }
  });

  it('civics phase is deterministic per seed', () => {
    const a = buildCivicsPhase('seed-1', 'TX', null, vi).map((q) => q.itemId);
    const b = buildCivicsPhase('seed-1', 'TX', null, vi).map((q) => q.itemId);
    expect(a).toEqual(b);
  });

  it('speaking phase: 5 what-mean then 5 yes-no, yes/no graded correctly', () => {
    const qs = buildSpeakingPhase('seed-1', vi);
    expect(qs).toHaveLength(10);
    expect(qs.slice(0, 5).every((q) => q.itemId.startsWith('wm-'))).toBe(true);
    const yn = qs.slice(5);
    expect(yn.every((q) => q.itemId.startsWith('yn-'))).toBe(true);
    for (const q of yn) {
      expect(q.options).toHaveLength(2);
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
      const correct = q.options.find((o) => o.isCorrect)!;
      expect(['Yes, officer', 'No, officer']).toContain(correct.en);
    }
  });

  it('writing phase: 3 sentences, deterministic per seed', () => {
    const a = buildWritingPhase('seed-1');
    expect(a).toHaveLength(3);
    expect(buildWritingPhase('seed-1').map((s) => s.id)).toEqual(a.map((s) => s.id));
  });
});
