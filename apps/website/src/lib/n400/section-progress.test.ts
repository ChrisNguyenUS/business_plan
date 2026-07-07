import { describe, it, expect } from 'vitest';
import { deriveSectionKnown, deriveSectionSeen, type SectionAttempt } from './section-progress';

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
