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

