// Drift-lock test for the CTA engine's server-side learning signals.
//
// This does NOT hit the network. It feeds one fixture through the client's
// pure derivation functions (the same ones learning-signals.ts calls) and
// asserts the two things the CTA engine must never get wrong:
//   1. Readiness/mastery reads GRADED attempts only — flashcard self-grades
//      never count. See [[n400-known-metric-asymmetry]]: deriveSectionKnown
//      (deck state) and deriveSectionMastered (mastery) answer different
//      questions and a prior bug class silently swapped them.
//   2. A learner with no mastery and no mocks is never "ready".

import { describe, expect, it } from 'vitest';
import { deriveReadiness, type ReadinessSignals } from '../readiness';
import { deriveSectionGradedTally, deriveSectionMastered, deriveSectionKnown } from '../section-progress';
import type { SectionAttempt } from '../section-progress';
import { vi as viDict } from '../i18n/vi';

// A learner who self-graded everything on flashcards but has poor GRADED
// accuracy. If the CTA engine ever swaps mastery for deck state, this learner
// reads as ready — the exact bug [[n400-known-metric-asymmetry]] warns about.
const attempts: SectionAttempt[] = [
  { section: 'writing', mode: 'flashcard', itemId: 'wr-1', wasCorrect: true, at: '2026-07-01T10:00:00Z' },
  { section: 'writing', mode: 'flashcard', itemId: 'wr-2', wasCorrect: true, at: '2026-07-01T10:01:00Z' },
  { section: 'writing', mode: 'practice', itemId: 'wr-1', wasCorrect: false, at: '2026-07-02T10:00:00Z' },
  { section: 'yesno', mode: 'practice', itemId: 'yn-1', wasCorrect: true, at: '2026-07-02T10:05:00Z' },
];

describe('learning-signals derivations', () => {
  it('uses mastery, never deck state, for readiness inputs', () => {
    const mastered = deriveSectionMastered(attempts);
    const known = deriveSectionKnown(attempts);
    // Both `deriveSectionMastered` and `deriveSectionKnown` return
    // Record<SectionKey, string[]> — arrays, not Sets — so compare lengths.
    // The two genuinely disagree for this learner — that is the point.
    expect(known.writing.length).toBeGreaterThan(mastered.writing.length);
    expect(mastered.writing.length).toBe(0); // last graded attempt on wr-1 was wrong
  });

  it('excludes flashcard self-grades from the weakest-section tally', () => {
    const tally = deriveSectionGradedTally(attempts);
    expect(tally.writing).toEqual({ total: 1, correct: 0 });
    expect(tally.yesno).toEqual({ total: 1, correct: 1 });
    // Writing is weakest on graded evidence, despite looking perfect on the deck.
    expect(tally.writing.correct / tally.writing.total)
      .toBeLessThan(tally.yesno.correct / tally.yesno.total);
  });

  it('readiness is not ready for a learner with no mastery and no mocks', () => {
    const signals: ReadinessSignals = {
      civicsKnown: 0, civicsTotal: 128,
      whatmeanKnown: 0, whatmeanTotal: 10,
      yesnoKnown: 0, yesnoTotal: 10,
      writingKnown: 0, writingTotal: 10,
      mockResults: [],
      sectionMockResults: [],
    };
    expect(deriveReadiness(signals, viDict).ready).toBe(false);
  });
});
