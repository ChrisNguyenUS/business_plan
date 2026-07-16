import { describe, it, expect } from 'vitest';
import {
  deriveSectionKnown,
  deriveSectionGradedTally,
  deriveSectionMastered,
  deriveSectionSeen,
  lastWrongSectionItemIds,
  type SectionAttempt,
} from './section-progress';

const at = (n: number) => new Date(2026, 6, n).toISOString();

const attempts: SectionAttempt[] = [
  { section: 'whatmean', itemId: 'wm-1', wasCorrect: true, mode: 'flashcard', at: at(1) },
  { section: 'whatmean', itemId: 'wm-2', wasCorrect: true, mode: 'flashcard', at: at(1) },
  // toggled back to unknown later — last flashcard attempt wins
  { section: 'whatmean', itemId: 'wm-2', wasCorrect: false, mode: 'flashcard', at: at(2) },
  // practice answers do NOT affect known
  { section: 'whatmean', itemId: 'wm-3', wasCorrect: true, mode: 'practice', at: at(2) },
  { section: 'yesno', itemId: 'yn-1', wasCorrect: true, mode: 'flashcard', at: at(3) },
];

describe('deriveSectionKnown', () => {
  it('keeps only items whose LAST flashcard attempt was correct, per section', () => {
    const known = deriveSectionKnown(attempts);
    expect(known.whatmean).toEqual(['wm-1']);
    expect(known.yesno).toEqual(['yn-1']);
    expect(known.writing).toEqual([]);
  });

  it('returns empty sections for no attempts', () => {
    const known = deriveSectionKnown([]);
    expect(known).toEqual({ whatmean: [], yesno: [], writing: [] });
  });
});

describe('deriveSectionSeen', () => {
  it('collects every item touched in any mode, per section', () => {
    const seen = deriveSectionSeen(attempts);
    expect([...seen.whatmean].sort()).toEqual(['wm-1', 'wm-2', 'wm-3']);
    expect([...seen.yesno]).toEqual(['yn-1']);
    expect(seen.writing.size).toBe(0);
  });
});

describe('lastWrongSectionItemIds — graded review debt (spec D1)', () => {
  const g = (itemId: string, wasCorrect: boolean, day: number, mode: SectionAttempt['mode'] = 'practice'): SectionAttempt =>
    ({ section: 'writing', itemId, wasCorrect, mode, at: at(day) });

  it('returns items whose last graded attempt is wrong, most recently wrong first', () => {
    const ids = lastWrongSectionItemIds([g('wr-1', false, 1), g('wr-2', false, 3), g('wr-3', true, 2)], 'writing');
    expect(ids).toEqual(['wr-2', 'wr-1']);
  });

  it('scopes to the requested section', () => {
    const other: SectionAttempt = { section: 'yesno', itemId: 'yn-9', wasCorrect: false, mode: 'practice', at: at(1) };
    expect(lastWrongSectionItemIds([other], 'writing')).toEqual([]);
    expect(lastWrongSectionItemIds([other], 'yesno')).toEqual(['yn-9']);
  });

  it('a later correct graded attempt clears the item; a later wrong one re-opens it', () => {
    expect(lastWrongSectionItemIds([g('wr-1', false, 1), g('wr-1', true, 2)], 'writing')).toEqual([]);
    expect(lastWrongSectionItemIds([g('wr-1', false, 1), g('wr-1', true, 2), g('wr-1', false, 3)], 'writing')).toEqual(['wr-1']);
  });

  it('flashcard self-grades neither create nor clear debt', () => {
    expect(lastWrongSectionItemIds([g('wr-1', false, 1, 'flashcard')], 'writing')).toEqual([]);
    expect(lastWrongSectionItemIds([g('wr-1', false, 1), g('wr-1', true, 2, 'flashcard')], 'writing')).toEqual(['wr-1']);
  });
});

describe('deriveSectionMastered', () => {
  const a = (itemId: string, wasCorrect: boolean, mode: 'practice' | 'mock_test' | 'flashcard', at = '2026-07-01T00:00:00Z') =>
    ({ section: 'whatmean' as const, itemId, wasCorrect, mode, at });

  it('counts an item mastered when its last GRADED attempt was correct', () => {
    expect(deriveSectionMastered([a('wm-1', true, 'practice')]).whatmean).toEqual(['wm-1']);
    expect(deriveSectionMastered([a('wm-1', true, 'mock_test')]).whatmean).toEqual(['wm-1']);
  });

  it('ignores flashcard self-grades entirely — tapping "Đã thuộc" proves nothing', () => {
    // The whole point: recognition is not retrieval (spec D1).
    expect(deriveSectionMastered([a('wm-1', true, 'flashcard')]).whatmean).toEqual([]);
  });

  it('does not let a flashcard tap override a wrong graded answer', () => {
    const out = deriveSectionMastered([
      a('wm-1', false, 'practice', '2026-07-01T00:00:00Z'),
      a('wm-1', true, 'flashcard', '2026-07-02T00:00:00Z'),
    ]);
    expect(out.whatmean).toEqual([]);
  });

  it('lets a later wrong graded answer un-master an item', () => {
    const out = deriveSectionMastered([
      a('wm-1', true, 'practice', '2026-07-01T00:00:00Z'),
      a('wm-1', false, 'practice', '2026-07-02T00:00:00Z'),
    ]);
    expect(out.whatmean).toEqual([]);
  });

  it('keeps each section separate', () => {
    const out = deriveSectionMastered([
      { section: 'whatmean', itemId: 'wm-1', wasCorrect: true, mode: 'practice', at: '2026-07-01T00:00:00Z' },
      { section: 'yesno', itemId: 'yn-1', wasCorrect: true, mode: 'practice', at: '2026-07-01T00:00:00Z' },
    ]);
    expect(out.whatmean).toEqual(['wm-1']);
    expect(out.yesno).toEqual(['yn-1']);
    expect(out.writing).toEqual([]);
  });
});

describe('deriveSectionGradedTally', () => {
  const a = (section: SectionAttempt['section'], wasCorrect: boolean, mode: 'practice' | 'mock_test' | 'flashcard') =>
    ({ section, itemId: 'x-1', wasCorrect, mode, at: '2026-07-01T00:00:00Z' });

  it('counts graded attempts and how many were correct', () => {
    const t = deriveSectionGradedTally([
      a('whatmean', true, 'practice'),
      a('whatmean', false, 'practice'),
      a('whatmean', true, 'mock_test'),
    ]);
    expect(t.whatmean).toEqual({ total: 3, correct: 2 });
  });

  it('excludes flashcard taps entirely — "yếu" is judged on graded answers', () => {
    // A learner who taps 👍 on everything must not look 100% accurate.
    const t = deriveSectionGradedTally([
      a('whatmean', true, 'flashcard'),
      a('whatmean', true, 'flashcard'),
      a('whatmean', false, 'practice'),
    ]);
    expect(t.whatmean).toEqual({ total: 1, correct: 0 });
  });

  it('reports an all-flashcard section as having no graded evidence', () => {
    const t = deriveSectionGradedTally([a('yesno', true, 'flashcard')]);
    expect(t.yesno).toEqual({ total: 0, correct: 0 });
  });

  it('keeps sections separate and zero-fills untouched ones', () => {
    const t = deriveSectionGradedTally([a('writing', true, 'practice')]);
    expect(t.writing).toEqual({ total: 1, correct: 1 });
    expect(t.whatmean).toEqual({ total: 0, correct: 0 });
    expect(t.yesno).toEqual({ total: 0, correct: 0 });
  });
});
