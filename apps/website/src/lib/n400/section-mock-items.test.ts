import { describe, expect, it } from 'vitest';
import { sectionOfItem, speakingMockItems, writingMockItems } from './section-mock-items';
import { deriveSectionMastered, lastWrongSectionItemIds, type SectionAttempt } from './section-progress';

describe('sectionOfItem', () => {
  it('maps the namespaced item ids to their section', () => {
    expect(sectionOfItem('wm-12')).toBe('whatmean');
    expect(sectionOfItem('yn-3')).toBe('yesno');
    expect(sectionOfItem('wr-40')).toBe('writing');
  });

  it('is null for anything that is not a section item (e.g. a Civics item)', () => {
    expect(sectionOfItem('civ-29')).toBeNull();
    expect(sectionOfItem('29')).toBeNull();
  });
});

describe('speakingMockItems', () => {
  it('keeps each verdict and records how the item was answered', () => {
    expect(
      speakingMockItems([
        { itemId: 'wm-1', wasCorrect: true },
        { itemId: 'yn-2', wasCorrect: false, input: 'mic' },
        { itemId: 'wm-3', wasCorrect: true, input: 'typed' },
      ]),
    ).toEqual([
      { section: 'whatmean', itemId: 'wm-1', wasCorrect: true },
      { section: 'yesno', itemId: 'yn-2', wasCorrect: false, answerMode: 'voice' },
      { section: 'whatmean', itemId: 'wm-3', wasCorrect: true, answerMode: 'typed' },
    ]);
  });

  it('drops an id that is not a section item', () => {
    expect(speakingMockItems([{ itemId: 'civ-7', wasCorrect: true }])).toEqual([]);
  });
});

describe('writingMockItems', () => {
  it('turns the per-sentence verdicts into writing rows', () => {
    expect(writingMockItems([{ sentenceId: 'wr-5', correct: false }, { sentenceId: 'wr-9', correct: true }])).toEqual([
      { section: 'writing', itemId: 'wr-5', wasCorrect: false },
      { section: 'writing', itemId: 'wr-9', wasCorrect: true },
    ]);
  });
});

describe('mock rows count as graded (owner decision 2026-10-08, B′)', () => {
  const at = (m: number) => new Date(Date.UTC(2026, 9, 8, 10, m)).toISOString();
  const rows: SectionAttempt[] = [
    { section: 'whatmean', itemId: 'wm-1', wasCorrect: false, mode: 'mock_test', at: at(0) },
    { section: 'whatmean', itemId: 'wm-2', wasCorrect: true, mode: 'mock_test', at: at(0) },
  ];

  it('a miss in a mock joins Ôn câu sai; a later correct practice answer clears it', () => {
    expect(lastWrongSectionItemIds(rows, 'whatmean')).toEqual(['wm-1']);
    const later: SectionAttempt = { section: 'whatmean', itemId: 'wm-1', wasCorrect: true, mode: 'practice', at: at(5) };
    expect(lastWrongSectionItemIds([...rows, later], 'whatmean')).toEqual([]);
  });

  it('a right answer in a mock counts as known (thuộc)', () => {
    expect(deriveSectionMastered(rows).whatmean).toEqual(['wm-2']);
  });
});
