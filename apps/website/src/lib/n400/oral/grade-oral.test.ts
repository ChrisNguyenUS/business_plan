import { describe, expect, it } from 'vitest';
import { gradeOralAnswer } from './grade-oral';
import type { OralAnswerConfig } from './types';

const single = (...alts: string[]): OralAnswerConfig => ({ type: 'single', alternatives: alts.map((a) => [a]) });

describe('gradeOralAnswer — single', () => {
  const constitution = single('constitution');

  it('exact keyword with extra words is correct', () => {
    expect(gradeOralAnswer('I think it is the constitution', constitution).verdict).toBe('correct');
  });

  it('a different real word within edit distance is only near (D8)', () => {
    expect(gradeOralAnswer('the institution', constitution).verdict).toBe('near');
  });

  it('empty transcript is wrong', () => {
    expect(gradeOralAnswer('', constitution)).toEqual({ verdict: 'wrong', matched: [], missing: ['constitution'] });
    expect(gradeOralAnswer('   ', constitution).verdict).toBe('wrong');
  });

  it('filler-only speech is wrong', () => {
    expect(gradeOralAnswer('um, I think… uh', constitution).verdict).toBe('wrong');
  });

  it('all keywords required; half is near', () => {
    const cfg = single('keep powerful');
    expect(gradeOralAnswer('to keep him from being too powerful', cfg).verdict).toBe('correct');
    expect(gradeOralAnswer('so the president is not too powerful', cfg).verdict).toBe('near');
  });

  it('best alternative wins', () => {
    const cfg = single('self government', 'govern themselves');
    expect(gradeOralAnswer('people govern themselves', cfg).verdict).toBe('correct');
    expect(gradeOralAnswer('people rule themselves', cfg).verdict).toBe('near');
    expect(gradeOralAnswer('freedom', cfg).verdict).toBe('wrong');
  });

  it('digits never near-match', () => {
    expect(gradeOralAnswer('26', single('27')).verdict).toBe('wrong');
  });
});

describe('gradeOralAnswer — phrase', () => {
  const q60: OralAnswerConfig = {
    type: 'phrase',
    alternatives: [['powers not given federal government belong states']],
    minKeywords: 5,
    mustInclude: ['not'],
  };

  it('meets minKeywords with mustInclude', () => {
    expect(gradeOralAnswer('powers not given to the federal government belong to the states', q60).verdict).toBe('correct');
  });

  it('missing a mustInclude keyword is not correct', () => {
    expect(gradeOralAnswer('powers given to the federal government belong to the states', q60).verdict).toBe('near');
  });

  it('numbers in mustInclude separate world wars', () => {
    const q102: OralAnswerConfig = { type: 'phrase', alternatives: [['after world war 1']], minKeywords: 3, mustInclude: ['1'] };
    expect(gradeOralAnswer('after world war one', q102).verdict).toBe('correct');
    expect(gradeOralAnswer('after world war two', q102).verdict).toBe('near');
  });
});

describe('gradeOralAnswer — enumeration', () => {
  const q16: OralAnswerConfig = { type: 'enumeration', alternatives: [['congress', 'president', 'courts']] };

  it('every part required', () => {
    expect(gradeOralAnswer('congress, the president and the courts', q16).verdict).toBe('correct');
    expect(gradeOralAnswer('congress and the president', q16).verdict).toBe('near');
  });

  it('repeating one part does not satisfy the others', () => {
    expect(gradeOralAnswer('congress congress congress', q16).verdict).toBe('wrong');
  });

  it('a word may be reused across parts, not within one', () => {
    const q81: OralAnswerConfig = {
      type: 'enumeration',
      alternatives: [['new york', 'new jersey', 'north carolina', 'south carolina', 'virginia']],
    };
    expect(gradeOralAnswer('new york new jersey virginia north and south carolina', q81).verdict).toBe('correct');
    const q48: OralAnswerConfig = { type: 'enumeration', alternatives: [['secretary education', 'secretary energy']] };
    expect(gradeOralAnswer('secretary of education and energy', q48).verdict).toBe('correct');
  });
});

describe('gradeOralAnswer — mustExclude', () => {
  const q42: OralAnswerConfig = { type: 'single', alternatives: [['president']], mustExclude: ['vice'] };

  it('blocks correct but can still be near', () => {
    expect(gradeOralAnswer('the president', q42).verdict).toBe('correct');
    expect(gradeOralAnswer('the vice president', q42).verdict).toBe('near');
  });
});

describe('gradeOralAnswer — matched / missing', () => {
  it('reports which keywords were heard', () => {
    const g = gradeOralAnswer('congress and the president', { type: 'enumeration', alternatives: [['congress', 'president', 'courts']] });
    expect(g.matched).toEqual(['congress', 'president']);
    expect(g.missing).toEqual(['courts']);
  });
});

describe('gradeOralAnswer — enumeration near counts items, not keywords (rev 3.2)', () => {
  it('half the items named is near', () => {
    const q19: OralAnswerConfig = { type: 'enumeration', alternatives: [['senate', 'house representatives']] };
    expect(gradeOralAnswer('senate', q19).verdict).toBe('near');
  });

  it('fewer than half the items named is wrong', () => {
    const q65: OralAnswerConfig = {
      type: 'enumeration',
      alternatives: [['freedom speech', 'freedom religion', 'bear arms']],
    };
    expect(gradeOralAnswer('freedom of speech', q65).verdict).toBe('wrong');
  });

  it('a word shared by every item names no item', () => {
    const q48: OralAnswerConfig = { type: 'enumeration', alternatives: [['secretary education', 'secretary energy']] };
    expect(gradeOralAnswer('secretary', q48).verdict).toBe('wrong');
  });
});

describe('gradeOralAnswer — "not" never near-matches (rev 3.15)', () => {
  it('"I don\'t know" is not a near "vote" (Gate 3: not ≈ vot)', () => {
    const participation: OralAnswerConfig = { type: 'enumeration', alternatives: [['vote', 'write newspaper']] };
    expect(gradeOralAnswer("I don't know", participation).verdict).toBe('wrong');
    expect(gradeOralAnswer('not sure', participation).verdict).toBe('wrong');
  });

  it('a real one-edit word still counts as near', () => {
    const participation: OralAnswerConfig = { type: 'enumeration', alternatives: [['vote', 'write newspaper']] };
    expect(gradeOralAnswer('vat', participation).verdict).toBe('near');
  });
});

describe('gradeOralAnswer — negations never near-match (rev 3.16)', () => {
  it('"never" is not a near "Evers" (filler sweep: never ≈ ever)', () => {
    expect(gradeOralAnswer('never', single('evers')).verdict).toBe('wrong');
  });
});
