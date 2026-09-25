import { describe, expect, it } from 'vitest';
import { canSpeak, gradeSpokenItem, spokenItemFromId } from './grade-spoken-item';

const TX = { stateCode: 'TX' as const, districtNumber: null };
const DC = { stateCode: 'DC' as const, districtNumber: null };

describe('spokenItemFromId', () => {
  it('reads civics, What-mean and Yes/No ids', () => {
    expect(spokenItemFromId('civ-12')).toEqual({ kind: 'civics', qid: 12 });
    expect(spokenItemFromId('wm-3')).toEqual({ kind: 'whatmean', id: 'wm-3' });
    expect(spokenItemFromId('yn-7')).toEqual({ kind: 'yesno', id: 'yn-7' });
  });

  it('unknown ids are null', () => {
    expect(spokenItemFromId('civ-999')).toBeNull();
    expect(spokenItemFromId('wm-999')).toBeNull();
    expect(spokenItemFromId('hello')).toBeNull();
  });
});

describe('canSpeak (Review Focus 4)', () => {
  it('is true for gradable items', () => {
    expect(canSpeak({ kind: 'civics', qid: 2 }, TX)).toBe(true);
    expect(canSpeak({ kind: 'civics', qid: 23 }, TX)).toBe(true);
    expect(canSpeak({ kind: 'whatmean', id: 'wm-1' }, TX)).toBe(true);
    expect(canSpeak({ kind: 'yesno', id: 'yn-1' }, TX)).toBe(true);
  });

  it('is false for a location question without a spoken answer (DC senators / capital)', () => {
    expect(canSpeak({ kind: 'civics', qid: 23 }, DC)).toBe(false);
    expect(canSpeak({ kind: 'civics', qid: 62 }, DC)).toBe(false);
  });
});

describe('gradeSpokenItem', () => {
  it('civics: correct, and near offers the taught answer', () => {
    expect(gradeSpokenItem({ kind: 'civics', qid: 2 }, 'the constitution', TX)).toEqual({ verdict: 'correct', nearAnswer: null });
    expect(gradeSpokenItem({ kind: 'civics', qid: 2 }, 'the institution', TX)).toEqual({
      verdict: 'near',
      nearAnswer: 'The U.S. Constitution',
    });
  });

  it('civics without a spoken answer is wrong, never a throw (Review Focus 4)', () => {
    expect(gradeSpokenItem({ kind: 'civics', qid: 23 }, 'I do not know', DC)).toEqual({ verdict: 'wrong', nearAnswer: null });
  });

  it('What-mean: correct, near offers the taught definition, wrong', () => {
    expect(gradeSpokenItem({ kind: 'whatmean', id: 'wm-7' }, 'to remove a government by force', TX).verdict).toBe('correct');
    expect(gradeSpokenItem({ kind: 'whatmean', id: 'wm-7' }, 'to remove the government', TX)).toEqual({
      verdict: 'near',
      nearAnswer: 'To remove a government by force.',
    });
    expect(gradeSpokenItem({ kind: 'whatmean', id: 'wm-7' }, 'overthrow', TX).verdict).toBe('wrong');
  });

  it('Yes/No: correct, wrong, unclear — never near', () => {
    expect(gradeSpokenItem({ kind: 'yesno', id: 'yn-1' }, 'No, officer', TX)).toEqual({ verdict: 'correct', nearAnswer: null });
    expect(gradeSpokenItem({ kind: 'yesno', id: 'yn-1' }, 'Yes', TX)).toEqual({ verdict: 'wrong', nearAnswer: null });
    expect(gradeSpokenItem({ kind: 'yesno', id: 'yn-1' }, "I don't know", TX)).toEqual({ verdict: 'unclear', nearAnswer: null });
  });

  it('an unknown id inside a SpokenItem is wrong, never a throw', () => {
    expect(gradeSpokenItem({ kind: 'whatmean', id: 'wm-999' }, 'anything', TX)).toEqual({ verdict: 'wrong', nearAnswer: null });
    expect(gradeSpokenItem({ kind: 'yesno', id: 'yn-999' }, 'no', TX)).toEqual({ verdict: 'wrong', nearAnswer: null });
  });
});
