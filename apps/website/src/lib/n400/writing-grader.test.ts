import { describe, it, expect } from 'vitest';
import { normalizeForGrading, compareWords, gradeWritingSentence } from './writing-grader';

describe('normalizeForGrading', () => {
  it('removes punctuation, lowercases, and collapses whitespace', () => {
    expect(normalizeForGrading('  The   President, lives here!  ')).toBe(
      'the president lives here',
    );
  });
});

describe('compareWords', () => {
  it('accepts an exact match with no annotation', () => {
    const result = compareWords('capital', 'capital');
    expect(result.isCorrect).toBe(true);
    expect(result.annotation).toBeNull();
  });

  it('accepts edit distance 1 for a short word (spelling slip)', () => {
    // "capital" (7 chars) → threshold 1; "capitol" is distance 1
    const result = compareWords('capitol', 'capital');
    expect(result.isCorrect).toBe(true);
    expect(result.annotation?.type).toBe('spelling');
  });

  it('accepts edit distance 2 for a word of >=8 chars (spelling slip)', () => {
    // "congress" (8 chars) → threshold 2; "kongres" is distance 2
    const result = compareWords('kongres', 'congress');
    expect(result.isCorrect).toBe(true);
    expect(result.annotation?.type).toBe('spelling');
  });

  it('rejects a larger edit distance', () => {
    // "vote" (4 chars) → threshold 1; "boat" is distance 3
    const result = compareWords('boat', 'vote');
    expect(result.isCorrect).toBe(false);
    expect(result.annotation).toBeNull();
  });

  it('detects a capitalization slip but still passes', () => {
    const result = compareWords('president', 'President');
    expect(result.isCorrect).toBe(true);
    expect(result.annotation?.type).toBe('capitalization');
  });

  it('detects a spelling slip but still passes', () => {
    // "freedom" (7 chars) → threshold 1; "freedon" is distance 1
    const result = compareWords('freedon', 'freedom');
    expect(result.isCorrect).toBe(true);
    expect(result.annotation?.type).toBe('spelling');
    expect(result.annotation?.canonicalWord).toBe('freedom');
  });

  it('rejects an abbreviation', () => {
    // "Feb" is far shorter than "February" → not an allowed slip
    const result = compareWords('Feb', 'February');
    expect(result.isCorrect).toBe(false);
    expect(result.annotation).toBeNull();
  });
});

describe('gradeWritingSentence', () => {
  it('passes a sentence with only capitalization/punctuation and minor spelling slips', () => {
    const result = gradeWritingSentence(
      'the capitol of the united states is washington',
      'The capital of the United States is Washington.',
    );
    expect(result.isCorrect).toBe(true);
    // "capitol" for "capital" is a tracked spelling annotation
    expect(result.annotations.some((a) => a.type === 'spelling')).toBe(true);
    expect(result.wordResults).toHaveLength(8);
  });

  it('fails a sentence with a wrong word', () => {
    const result = gradeWritingSentence(
      'The dog of the United States is Washington.',
      'The capital of the United States is Washington.',
    );
    expect(result.isCorrect).toBe(false);
  });

  it('fails when an abbreviation changes the word count', () => {
    const result = gradeWritingSentence('US is big', 'United States is big');
    expect(result.isCorrect).toBe(false);
  });
});
