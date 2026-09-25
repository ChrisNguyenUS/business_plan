import { describe, expect, it } from 'vitest';
import { contentTokens, keywordsOf, normalizeTokens, stem, transcriptStems } from './normalize';

describe('normalizeTokens', () => {
  it('lowercases and strips punctuation, hyphens become spaces', () => {
    expect(normalizeTokens('Self-government!')).toEqual(['self', 'government']);
  });

  it('formats numbers the same regardless of recognizer style', () => {
    expect(normalizeTokens('Twenty-seven.')).toEqual(['27']);
    expect(normalizeTokens('27')).toEqual(['27']);
    expect(normalizeTokens('four hundred thirty five')).toEqual(['435']);
    expect(normalizeTokens('One hundred (100)')).toEqual(['100', '100']);
  });

  it('turns ordinals into digits', () => {
    expect(normalizeTokens('the fourteenth amendment')).toEqual(['the', '14', 'amendment']);
    expect(normalizeTokens('14th Amendment')).toEqual(['14', 'amendment']);
    expect(normalizeTokens('July 4th, 1776')).toEqual(['july', '4', '1776']);
  });

  it('canonicalizes world war numbering before dropping single letters', () => {
    expect(normalizeTokens('After World War I')).toEqual(['after', 'world', 'war', '1']);
    expect(normalizeTokens('world war two')).toEqual(['world', 'war', '2']);
    expect(normalizeTokens('World War II')).toEqual(['world', 'war', '2']);
  });

  it('keeps negation from contractions and curly quotes', () => {
    expect(normalizeTokens('can’t')).toEqual(['can', 'not']);
    expect(normalizeTokens("don't")).toEqual(['do', 'not']);
    expect(normalizeTokens('cannot')).toEqual(['can', 'not']);
  });

  it('drops possessive s and single-letter tokens', () => {
    expect(normalizeTokens("President's Cabinet")).toEqual(['president', 'cabinet']);
    expect(normalizeTokens('Washington, D.C.')).toEqual(['washington']);
  });

  it('does not treat object prototype keys as numbers', () => {
    expect(normalizeTokens('constructor toString')).toEqual(['constructor', 'tostring']);
  });
});

describe('stem', () => {
  it.each([
    ['courts', 'court'], ['court', 'court'],
    ['writes', 'writ'], ['write', 'writ'],
    ['laws', 'law'], ['states', 'stat'], ['state', 'stat'],
    ['freed', 'fre'], ['free', 'fre'],
    ['voting', 'vot'], ['voted', 'vot'], ['vote', 'vot'],
    ['taxes', 'tax'], ['colonies', 'colony'],
    ['congress', 'congress'], ['americans', 'american'],
  ])('%s -> %s', (word, expected) => {
    expect(stem(word)).toBe(expected);
  });

  it('leaves digits and short words alone', () => {
    expect(stem('435')).toBe('435');
    expect(stem('war')).toBe('war');
  });
});

describe('contentTokens / keywordsOf', () => {
  it('drops stopwords and qualifiers', () => {
    expect(contentTokens(normalizeTokens('I think the U.S. Constitution'))).toEqual(['constitution']);
    expect(contentTokens(normalizeTokens('the United States of America'))).toEqual([]);
  });

  it('keeps qualifiers when asked', () => {
    expect(contentTokens(normalizeTokens('The United States'), { keepQualifiers: true })).toEqual(['united', 'states']);
  });

  it('keywordsOf falls back to qualifiers when nothing else is left, and dedupes by stem', () => {
    expect(keywordsOf('The United States')).toEqual(['united', 'states']);
    expect(keywordsOf('Freed the slaves, free slaves')).toEqual(['freed', 'slaves']);
  });

  it('never drops negation', () => {
    expect(keywordsOf('Powers not given to the federal government')).toEqual(['powers', 'not', 'given', 'federal', 'government']);
  });

  it('treats "day" as filler', () => {
    expect(keywordsOf("New Year's Day")).toEqual(['new', 'year']);
  });
});

describe('transcriptStems', () => {
  it('keeps qualifiers and stems', () => {
    expect(transcriptStems('the United States')).toEqual(['unit', 'stat']);
  });

  it('filler-only speech yields nothing', () => {
    expect(transcriptStems('um, I think… uh')).toEqual([]);
  });
});

describe('normalizeTokens — number words are composed, never summed', () => {
  it('keeps separate numbers separate', () => {
    expect(normalizeTokens('four, five')).toEqual(['4', '5']);
    expect(normalizeTokens('one two three')).toEqual(['1', '2', '3']);
    expect(normalizeTokens('twenty-seven, twenty-seven')).toEqual(['27', '27']);
    expect(normalizeTokens('one hundred one hundred')).toEqual(['100', '100']);
  });

  it('allows "and" inside a hundreds number', () => {
    expect(normalizeTokens('four hundred and thirty-five')).toEqual(['435']);
  });

  it('reads two spoken pairs as a year', () => {
    expect(normalizeTokens('July fourth, seventeen seventy six')).toEqual(['july', '4', '1776']);
    expect(normalizeTokens('nineteen twenty nine')).toEqual(['1929']);
  });
});

describe('normalizeTokens — accents', () => {
  it('strips diacritics instead of splitting the word', () => {
    expect(normalizeTokens('Ben Ray Luján')).toEqual(['ben', 'ray', 'lujan']);
    expect(normalizeTokens('Jenniffer González-Colón')).toEqual(['jenniffer', 'gonzalez', 'colon']);
  });
});

// Rev 3.16 (filler sweep after Gate 3): stalls are dropped from the transcript
// before numbers are read, so "give me a second" no longer becomes "2".
describe('transcriptStems — stall phrases', () => {
  it.each([
    'give me a second', 'Just a second.', 'wait a minute', 'one moment', 'let me think', "I don't know",
    "I'm not sure", 'no clue', 'dunno', 'say that again', 'come again', 'one more time', 'yes', 'good morning', 'I guess',
  ])('%s → nothing to grade', (said) => {
    expect(transcriptStems(said)).toEqual([]);
  });

  it('keeps the answer around a stall', () => {
    expect(transcriptStems('let me think... the Constitution')).toEqual(['constitution']);
    expect(transcriptStems('give me a second, two years')).toEqual(['2', 'year']);
  });

  it('leaves ordinals that belong to an answer alone (guard)', () => {
    expect(transcriptStems('the second world war')).toContain('2');
    expect(transcriptStems('July fourth')).toEqual(['july', '4']);
  });
});

// Speaking spec §3.4: a stall is kept when every one of its words is a keyword
// of the item being graded (What-mean #61 "Current" is "Right now").
describe('transcriptStems — stall protection (speaking spec §3.4)', () => {
  it('keeps a stall whose every word is a keyword of the item', () => {
    expect(transcriptStems('right now', { keep: new Set(['right', 'now', 'live']) })).toEqual(['right', 'now']);
  });

  it('still drops it without that keyword set', () => {
    expect(transcriptStems('right now')).toEqual([]);
  });

  it('drops a stall that shares only one word with the item (Civics Q35 "more people")', () => {
    expect(transcriptStems('one more time', { keep: new Set(['more', 'peopl']) })).toEqual([]);
  });
});
