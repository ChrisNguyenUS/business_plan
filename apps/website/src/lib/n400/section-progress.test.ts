import { describe, it, expect } from 'vitest';
import {
  deriveSectionKnown,
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
