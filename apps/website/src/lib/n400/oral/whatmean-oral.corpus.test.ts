import { describe, expect, it } from 'vitest';
import { WHATMEAN_QUESTIONS, WHATMEAN_QUESTIONS_BY_ID } from '../whatmean-data';
import { getWhatMeanOralConfig, gradeWhatMean } from './get-whatmean-config';
import { keywordsOf, stem } from './normalize';
import { WHATMEAN_ORAL_ALIASES } from './whatmean-oral-aliases';

const verdict = (id: string, said: string) => gradeWhatMean(said, id)!.verdict;
const ids = WHATMEAN_QUESTIONS.map((q) => q.id);

describe('every taught definition', () => {
  it.each(ids)('%s grades correct against its own config', (id) => {
    expect(verdict(id, WHATMEAN_QUESTIONS_BY_ID[id].definitionEn)).toBe('correct');
  });
});

describe('term echo', () => {
  it('reading the term aloud never grades correct for its own item', () => {
    expect(ids.filter((id) => verdict(id, WHATMEAN_QUESTIONS_BY_ID[id].termEn) === 'correct')).toEqual([]);
  });
});

describe('cross-term matrix (owner-reviewed at Gate S1)', () => {
  it('the definition of A grades correct for B only for these pairs', () => {
    const pairs: string[] = [];
    for (const a of ids) for (const b of ids) {
      if (a !== b && verdict(b, WHATMEAN_QUESTIONS_BY_ID[a].definitionEn) === 'correct') pairs.push(`${a}->${b}`);
    }
    // gun ⊂ "use a gun to defend…"; lie ⊂ "lie under oath"; tell ⊂ "promise to tell the truth".
    expect(pairs).toEqual(['wm-37->wm-9', 'wm-48->wm-29', 'wm-49->wm-62']);
  });
});

describe('synonyms', () => {
  const entries = Object.entries(WHATMEAN_ORAL_ALIASES).flatMap(([id, alts]) => alts.map((alt) => [id, alt.join(' ')] as const));

  it.each(entries)('%s "%s" grades correct', (id, said) => {
    expect(verdict(id, said)).toBe('correct');
  });

  it('a synonym grades correct for another term only for these pairs', () => {
    const pairs: string[] = [];
    for (const [id, said] of entries) for (const b of ids) {
      if (b !== id && verdict(b, said) === 'correct') pairs.push(`${id}:${said}->${b}`);
    }
    expect(pairs).toEqual([
      'wm-1:tell citizen->wm-62',
      'wm-32:not tell truth->wm-62',
      'wm-44:more 1 wife->wm-46',
      'wm-44:more 1 husband->wm-46',
      'wm-48:lying under oath->wm-29',
    ]);
  });

  it('no synonym duplicates a generated alternative', () => {
    const dupes = Object.entries(WHATMEAN_ORAL_ALIASES).filter(([id, alts]) => {
      const generated = getWhatMeanOralConfig(id)!.primary.alternatives.map((a) => a.join(' '));
      return alts.some((alt) => generated.includes(alt.join(' ')));
    });
    expect(dupes).toEqual([]);
  });
});

describe('negations, framing, stalls (Review Focus 1, 3)', () => {
  it('dropping the negation never grades correct', () => {
    expect(verdict('wm-6', 'Someone who is a U.S. citizen')).not.toBe('correct');
    expect(verdict('wm-5', 'Someone who lives in the U.S.')).not.toBe('correct');
  });

  it('a polite, framed answer grades like the bare definition', () => {
    expect(verdict('wm-7', 'It means to remove a government by force, officer')).toBe('correct');
  });

  const STALLS = [
    'give me a second', 'let me think', "I don't know", 'not sure', 'no idea', 'say that again',
    'one more time', 'yes', 'now', 'right now', 'good morning', 'I guess', 'I never learned this', 'sorry',
  ];

  it.each(STALLS)('"%s" never grades better than wrong, unless it IS the answer', (said) => {
    const stallStems = keywordsOf(said).map(stem);
    const better = ids.filter((id) => {
      const c = getWhatMeanOralConfig(id)!;
      const own = new Set(
        [c.primary, c.aliases].flatMap((x) => (x ? x.alternatives.flat().flatMap((p) => p.split(' ')) : [])).map(stem),
      );
      const isAnswer = stallStems.length > 0 && stallStems.every((s) => own.has(s));
      return !isAnswer && verdict(id, said) !== 'wrong';
    });
    expect(better).toEqual([]);
  });
});
