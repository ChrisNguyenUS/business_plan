import { describe, it, expect } from 'vitest';
import { findKeywordSpans } from './keyword-match';
import { WHATMEAN_QUESTIONS } from './whatmean-data';
import { YESNO_QUESTIONS_BY_ID } from './yesno-data';

const TERMS = WHATMEAN_QUESTIONS.map((q) => ({ id: q.id, termEn: q.termEn }));

describe('findKeywordSpans', () => {
  it('matches simple inflections (claimed ← claim)', () => {
    const text = YESNO_QUESTIONS_BY_ID['yn-1'].questionEn; // "Have you ever claimed to be a U.S. citizen …"
    const spans = findKeywordSpans(text, TERMS);
    const matched = spans.map((s) => text.slice(s.start, s.end).toLowerCase());
    expect(matched.some((m) => m.startsWith('claimed to be a u.s. citizen'))).toBe(true);
  });

  it('prefers the longest term on overlap (register to vote beats vote)', () => {
    const spans = findKeywordSpans('Have you ever registered to vote in any election?', TERMS);
    const registered = spans.find((s) => s.start === 14);
    expect(registered).toBeDefined();
    // the "vote" inside "registered to vote" must NOT be a separate span
    for (const s of spans) {
      if (s === registered) continue;
      expect(s.start >= registered!.end || s.end <= registered!.start).toBe(true);
    }
  });

  it('spans are sorted and non-overlapping with valid offsets', () => {
    for (const q of Object.values(YESNO_QUESTIONS_BY_ID)) {
      const spans = findKeywordSpans(q.questionEn, TERMS);
      let prevEnd = -1;
      for (const s of spans) {
        expect(s.start).toBeGreaterThanOrEqual(0);
        expect(s.end).toBeGreaterThan(s.start);
        expect(s.end).toBeLessThanOrEqual(q.questionEn.length);
        expect(s.start).toBeGreaterThanOrEqual(prevEnd);
        prevEnd = s.end;
      }
    }
  });

  it('a majority of Yes/No questions contain at least one keyword', () => {
    const withSpans = Object.values(YESNO_QUESTIONS_BY_ID).filter(
      (q) => findKeywordSpans(q.questionEn, TERMS).length > 0,
    );
    // the vocab list was built from Part 12, so coverage should be broad
    expect(withSpans.length).toBeGreaterThanOrEqual(19); // > half of 37
  });

  it('returns [] for text with no keywords', () => {
    expect(findKeywordSpans('The sky is blue today.', TERMS)).toEqual([]);
  });
});
