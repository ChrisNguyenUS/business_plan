import { describe, it, expect } from 'vitest';
import {
  buildOptions,
  selectMockTestQuestions,
  isPass,
  correctAnswersFor,
  shuffle,
  MOCK_TEST_QUESTION_COUNT,
  MOCK_TEST_PASS_THRESHOLD,
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
