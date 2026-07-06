import { describe, it, expect } from 'vitest';
import {
  buildOptions,
  selectMockTestQuestions,
  isPass,
  correctAnswersFor,
  shuffle,
  selectPracticeQuestionIds,
  recommendWeakCategory,
  PRACTICE_PRESETS,
  isPersonalizedAnswerUnavailable,
  MOCK_TEST_QUESTION_COUNT,
  MOCK_TEST_PASS_THRESHOLD,
  filterFlashcards,
} from './quiz-engine';
import { N400_QUESTIONS, N400_QUESTIONS_BY_ID } from './questions-data';

// These tests lock in the security-critical invariants of the quiz engine.
// The scoring path on the server (slide_manifest + submit_mock_answer RPC)
// trusts buildOptions to mark exactly one option correct; if that contract
// breaks, the manifest goes wrong and the user gets graded on a lie.

describe('buildOptions', () => {
  const SAMPLE_QID = 7;

  it('always produces exactly 4 options', () => {
    for (const q of N400_QUESTIONS) {
      const opts = buildOptions(q, 'TX', `seed-${q.id}`);
      expect(opts.length, `q${q.id}`).toBe(4);
    }
  });

  it('marks exactly one option correct per slide', () => {
    for (const q of N400_QUESTIONS) {
      const opts = buildOptions(q, 'TX', `seed-${q.id}`);
      const correctCount = opts.filter((o) => o.isCorrect).length;
      expect(correctCount, `q${q.id}`).toBe(1);
    }
  });

  it('assigns A/B/C/D as the option ids', () => {
    const opts = buildOptions(N400_QUESTIONS_BY_ID.get(SAMPLE_QID)!, 'TX', 'seed-1');
    expect(opts.map((o) => o.id)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('is deterministic given (questionId, stateCode, seed)', () => {
    const q = N400_QUESTIONS_BY_ID.get(SAMPLE_QID)!;
    const a = buildOptions(q, 'TX', 'fixed-seed');
    const b = buildOptions(q, 'TX', 'fixed-seed');
    expect(a).toEqual(b);
  });

  it('produces a different shuffle when seed changes', () => {
    const q = N400_QUESTIONS_BY_ID.get(SAMPLE_QID)!;
    // Sample several seeds — with 4 options the chance of every shuffle
    // colliding is 1/24 per pair, so 6 distinct seeds is comfortably safe.
    const fingerprints = new Set(
      ['s1', 's2', 's3', 's4', 's5', 's6'].map((s) =>
        buildOptions(q, 'TX', s)
          .map((o) => o.en)
          .join('|'),
      ),
    );
    expect(fingerprints.size).toBeGreaterThan(1);
  });

  it('produces unique option text within a slide', () => {
    for (const q of N400_QUESTIONS) {
      const opts = buildOptions(q, 'TX', `dedupe-${q.id}`);
      const texts = new Set(opts.map((o) => o.en.toLowerCase().trim()));
      expect(texts.size, `q${q.id}`).toBe(4);
    }
  });

  it('never shows a distractor that equals the correct answer ignoring parentheses/case', () => {
    // USCIS marks optional words with parens, e.g. "(Franklin) Roosevelt".
    // A distractor differing from the answer only by "()" is confusing and
    // must be filtered out (regression for Q105 Franklin Roosevelt).
    const strip = (s: string) =>
      s.toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    for (const q of N400_QUESTIONS) {
      for (const s of ['a', 'b', 'c', 'd', 'e']) {
        const opts = buildOptions(q, 'TX', `paren-${q.id}-${s}`);
        const correct = strip(opts.find((o) => o.isCorrect)!.en);
        for (const o of opts.filter((o) => !o.isCorrect)) {
          expect(strip(o.en), `q${q.id} seed ${s}`).not.toBe(correct);
        }
      }
    }
  });

  it('uses state-specific correct answers for Q23 (senators)', () => {
    const q23 = N400_QUESTIONS_BY_ID.get(23)!;
    const tx = buildOptions(q23, 'TX', 'q23-tx');
    const ca = buildOptions(q23, 'CA', 'q23-ca');
    const txCorrect = tx.find((o) => o.isCorrect)!.en;
    const caCorrect = ca.find((o) => o.isCorrect)!.en;
    // TX senators: Cornyn / Cruz; CA senators: Padilla / Schiff. Different sets.
    expect(['John Cornyn', 'Ted Cruz']).toContain(txCorrect);
    expect(['Alex Padilla', 'Adam Schiff']).toContain(caCorrect);
  });

  it('uses state governor for Q61', () => {
    const q61 = N400_QUESTIONS_BY_ID.get(61)!;
    const opts = buildOptions(q61, 'CA', 'q61-ca');
    expect(opts.find((o) => o.isCorrect)!.en).toBe('Gavin Newsom');
  });

  it('uses state capital for Q62', () => {
    const q62 = N400_QUESTIONS_BY_ID.get(62)!;
    const opts = buildOptions(q62, 'TX', 'q62-tx');
    expect(opts.find((o) => o.isCorrect)!.en).toBe('Austin');
  });

  it('uses static distractors from distractors-data for Q1', () => {
    const q1 = N400_QUESTIONS_BY_ID.get(1)!;
    const opts = buildOptions(q1, 'TX', 'test-q1');
    const correctOpt = opts.find((o) => o.isCorrect)!;
    const distractorOpts = opts.filter((o) => !o.isCorrect);

    expect(correctOpt.en).toBe('Republic');
    
    // Distractors should be drawn from static list (Monarchy, Direct democracy, Theocracy, Communist state, Confederation)
    const validStaticDistractors = [
      'Monarchy',
      'Direct democracy',
      'Theocracy',
      'Communist state',
      'Confederation'
    ];
    for (const d of distractorOpts) {
      expect(validStaticDistractors).toContain(d.en);
    }
  });

  it('filters out static distractors that collide with correct answers (e.g. Q23 Vermont scenario)', () => {
    // Q23 correct answers for VT would normally include Bernie Sanders if he were Senator of VT.
    // Let's mock or simulate VT senators. In state-data.ts, VT (Vermont) senators are Bernie Sanders & Peter Welch.
    // If the correct answers contain Bernie Sanders, Bernie Sanders (which is in the static distractor list for Q23)
    // must be filtered out and never present as a distractor.
    const q23 = N400_QUESTIONS_BY_ID.get(23)!;
    const opts = buildOptions(q23, 'VT', 'test-q23-vt');
    
    // There should be exactly one correct option, and no option should have 'Bernie Sanders' marked as incorrect
    const bernieIncorrect = opts.some((o) => o.en === 'Bernie Sanders' && !o.isCorrect);
    expect(bernieIncorrect).toBe(false);
  });
});

describe('correctAnswersFor', () => {
  it('returns plain answers for non-location questions', () => {
    const q1 = N400_QUESTIONS_BY_ID.get(1)!;
    expect(correctAnswersFor(q1, 'TX').length).toBe(q1.answersEn.length);
  });

  it('returns both senators for Q23', () => {
    const q23 = N400_QUESTIONS_BY_ID.get(23)!;
    expect(correctAnswersFor(q23, 'TX').map((a) => a.en)).toEqual([
      'John Cornyn',
      'Ted Cruz',
    ]);
  });
});

describe('selectMockTestQuestions', () => {
  it(`returns exactly ${MOCK_TEST_QUESTION_COUNT} questions`, () => {
    expect(selectMockTestQuestions('seed-a').length).toBe(MOCK_TEST_QUESTION_COUNT);
  });

  it('returns no duplicates', () => {
    const ids = selectMockTestQuestions('seed-b').map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only returns valid question objects', () => {
    for (const q of selectMockTestQuestions('seed-c')) {
      expect(q).toBeDefined();
      expect(q.id).toBeGreaterThan(0);
    }
  });

  it('is deterministic given the same seed', () => {
    const a = selectMockTestQuestions('fixed').map((q) => q.id);
    const b = selectMockTestQuestions('fixed').map((q) => q.id);
    expect(a).toEqual(b);
  });
});

describe('isPass', () => {
  it(`returns true at the ${MOCK_TEST_PASS_THRESHOLD} threshold`, () => {
    expect(isPass(MOCK_TEST_PASS_THRESHOLD)).toBe(true);
  });

  it(`returns false below ${MOCK_TEST_PASS_THRESHOLD}`, () => {
    expect(isPass(MOCK_TEST_PASS_THRESHOLD - 1)).toBe(false);
  });

  it('returns false at 0', () => {
    expect(isPass(0)).toBe(false);
  });
});

describe('shuffle', () => {
  it('preserves all elements', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, 'seed');
    expect(out.sort()).toEqual([...input].sort());
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const before = [...input];
    shuffle(input, 'seed');
    expect(input).toEqual(before);
  });

  it('is deterministic given the same seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], 's')).toEqual(shuffle([1, 2, 3, 4, 5], 's'));
  });
});

describe('selectPracticeQuestionIds', () => {
  it('returns exactly the requested count with no duplicate ids', () => {
    for (const count of [5, 15, 40]) {
      const ids = selectPracticeQuestionIds('seed-1', count);
      expect(ids.length).toBe(count);
      expect(new Set(ids).size).toBe(count);
    }
  });

  it('returns the full 128-question pool when count is null, including Q29', () => {
    const ids = selectPracticeQuestionIds('seed-1', null);
    expect(ids.length).toBe(N400_QUESTIONS.length);
    expect(ids).toContain(29);
  });

  it('is deterministic for a given seed and differs across seeds', () => {
    const a = selectPracticeQuestionIds('seed-1', 15);
    const b = selectPracticeQuestionIds('seed-1', 15);
    const c = selectPracticeQuestionIds('seed-2', 15);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('clamps count to the available pool', () => {
    const ids = selectPracticeQuestionIds('seed-1', 999);
    expect(ids.length).toBe(N400_QUESTIONS.length);
  });

  it('exposes the four product presets in display order', () => {
    expect(PRACTICE_PRESETS.map((p) => p.id)).toEqual(['quick', 'standard', 'deep', 'full']);
    expect(PRACTICE_PRESETS.map((p) => p.count)).toEqual([5, 15, 40, null]);
  });

  it('draws only from the requested category when one is given', () => {
    const ids = selectPracticeQuestionIds('seed-1', 5, 'system');
    expect(ids.length).toBe(5);
    for (const id of ids) {
      expect(N400_QUESTIONS_BY_ID.get(id)!.category).toBe('system');
    }
  });

  it('keeps the historical order for an existing seed when category is omitted', () => {
    expect(selectPracticeQuestionIds('seed-1', null)).toEqual(
      selectPracticeQuestionIds('seed-1', null, null)
    );
  });
});

describe('recommendWeakCategory', () => {
  const systemIds = N400_QUESTIONS.filter((q) => q.category === 'system').map((q) => q.id);
  const historyIds = N400_QUESTIONS.filter((q) => q.category === 'history').map((q) => q.id);
  const attempt = (questionId: number, wasCorrect: boolean) => ({ questionId, wasCorrect });

  it('returns null when no category has enough attempts', () => {
    expect(recommendWeakCategory([])).toBeNull();
    expect(
      recommendWeakCategory(systemIds.slice(0, 4).map((id) => attempt(id, false)))
    ).toBeNull();
  });

  it('returns null when recent attempts are mostly correct', () => {
    const attempts = systemIds.slice(0, 10).map((id, i) => attempt(id, i !== 0));
    expect(recommendWeakCategory(attempts)).toBeNull();
  });

  it('surfaces the weakest category with its recent wrong count', () => {
    const attempts = [
      ...historyIds.slice(0, 10).map((id, i) => attempt(id, i >= 3)), // 3/10 wrong
      ...systemIds.slice(0, 10).map((id, i) => attempt(id, i >= 6)),  // 6/10 wrong
    ];
    const rec = recommendWeakCategory(attempts);
    expect(rec).toEqual({ category: 'system', wrongCount: 6, sampleSize: 10 });
  });

  it('only counts the most recent window per category', () => {
    // 10 old misses followed by 10 recent correct answers: no longer weak.
    const attempts = [
      ...systemIds.slice(0, 10).map((id) => attempt(id, false)),
      ...systemIds.slice(0, 10).map((id) => attempt(id, true)),
    ];
    expect(recommendWeakCategory(attempts)).toBeNull();
  });
});

describe('isPersonalizedAnswerUnavailable', () => {
  it('is true only for Q29 without a resolved district', () => {
    const q29 = N400_QUESTIONS_BY_ID.get(29)!;
    const q23 = N400_QUESTIONS_BY_ID.get(23)!;
    expect(isPersonalizedAnswerUnavailable(q29, null)).toBe(true);
    expect(isPersonalizedAnswerUnavailable(q29, 12)).toBe(false);
    expect(isPersonalizedAnswerUnavailable(q23, null)).toBe(false);
  });
});

describe('filterFlashcards', () => {
  const qs = N400_QUESTIONS;

  it('returns all questions for the all filter', () => {
    expect(filterFlashcards(qs, 'all', [], [])).toHaveLength(qs.length);
  });

  it('unknown excludes known question ids', () => {
    const known = [qs[0].id, qs[1].id];
    const out = filterFlashcards(qs, 'unknown', [], known);
    expect(out).toHaveLength(qs.length - 2);
    expect(out.some((q) => known.includes(q.id))).toBe(false);
  });

  it('known returns only known question ids', () => {
    const known = [qs[0].id, qs[5].id];
    const out = filterFlashcards(qs, 'known', [], known);
    expect(out.map((q) => q.id).sort((a, b) => a - b)).toEqual(known.sort((a, b) => a - b));
  });

  it('bookmarks returns only bookmarked question ids', () => {
    const bookmarks = [qs[2].id];
    const out = filterFlashcards(qs, 'bookmarks', bookmarks, []);
    expect(out.map((q) => q.id)).toEqual(bookmarks);
  });

  it('category filter returns only that category', () => {
    const out = filterFlashcards(qs, 'history', [], []);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((q) => q.category === 'history')).toBe(true);
  });
});
