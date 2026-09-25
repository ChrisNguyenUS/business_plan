import { describe, expect, it } from 'vitest';
import { N400_QUESTIONS } from '../questions-data';
import { REPS_BY_STATE } from '../reps-data';
import { STATES } from '../state-data';
import { gradeOralAnswer } from './grade-oral';
import { getOralAnswerConfig } from './get-oral-config';
import { contentTokens, keywordsOf, normalizeTokens, stem, transcriptStems } from './normalize';
import type { OralAnswerConfig, OralVerdict } from './types';

const graded = N400_QUESTIONS.filter((q) => !q.isLocationBased);
const verdict = (qid: number, said: string) => gradeOralAnswer(said, getOralAnswerConfig(qid)!).verdict;

describe('spec §3.3 reference table', () => {
  it.each<[number, string, OralVerdict]>([
    [2, 'the constitution', 'correct'],
    [2, 'constitution constitution constitution', 'correct'],
    [2, 'the institution', 'near'],
    [7, '27 amendments', 'correct'],
    [20, 'I think the president writes laws', 'correct'],
    [37, 'to keep him from being too powerful', 'correct'],
    [37, 'so the president is not too powerful', 'near'],
    [38, 'trump', 'correct'],
    [16, 'congress and the president', 'near'],
    [16, 'congress congress congress', 'wrong'],
    [4, 'people govern themselves', 'correct'],
    [4, 'people rule themselves', 'near'],
    [4, 'freedom', 'wrong'],
    [60, 'powers not given to the federal government belong to the states', 'correct'],
    [102, 'after world war two', 'near'],
    [42, 'the vice president', 'near'],
    [81, 'new york new jersey virginia north and south carolina', 'correct'],
    [102, 'before world war one', 'near'],
    [22, 'six', 'correct'],
    [18, 'congress, the president and the courts', 'near'],
    [19, 'senate', 'near'],
    [48, 'secretary', 'wrong'],
    [69, "I don't know", 'wrong'],
    [27, 'give me a second', 'wrong'],
    [6, 'right', 'correct'],
  ])('Q%i "%s" → %s', (qid, said, expected) => {
    expect(verdict(qid, said)).toBe(expected);
  });

  it('Q23 (UT): a stall alone is wrong, a stall before the answer is dropped (rev 3.16)', () => {
    const ut = getOralAnswerConfig(23, { stateCode: 'UT', districtNumber: null })!;
    expect(gradeOralAnswer('let me think', ut).verdict).toBe('wrong');
    expect(gradeOralAnswer('let me think, Mike Lee', ut).verdict).toBe('correct');
  });

  it('Q60 without "not" is never correct', () => {
    expect(verdict(60, 'powers given to the federal government belong to the states')).not.toBe('correct');
  });
});

describe('every taught answer', () => {
  it.each(graded.map((q) => [q.id, q.answersEn[0]] as const))('Q%i "%s" grades correct', (qid, answer) => {
    expect(verdict(qid, answer)).toBe('correct');
  });
});

describe('real-word substitutions never grade correct (D8)', () => {
  it.each<[number, string]>([
    [2, 'the institution'],
    [1, 'republican'],
    [19, 'senator and house of representatives'],
  ])('Q%i "%s"', (qid, said) => {
    expect(verdict(qid, said)).not.toBe('correct');
  });
});

describe('question echo', () => {
  const ECHO_EXCEPTIONS = [6, 76]; // spec §3.1 — every keyword is in the question

  it('reading the question aloud is never correct, except the pinned exceptions', () => {
    const passing = graded.filter((q) => verdict(q.id, q.questionEn) === 'correct').map((q) => q.id);
    expect(passing).toEqual(ECHO_EXCEPTIONS);
  });
});

describe('cross-question matrix', () => {
  // "Q_a->Q_b": Q_a's taught answer grades `correct` for Q_b. Identical answers excluded.
  // Owner-reviewed at Gate 1 (spec rev 3.2, 2026-09-24); any new pair needs a new review.
  const ALLOWED_OVERLAPS = [
    '25->27', '27->25', '31->63', '31->64', '31->122', '32->63', '32->64', '32->122', '33->63',
    '33->64', '34->63', '34->64', '37->42', '37->43', '37->44', '37->45', '37->46', '47->42',
    '47->43', '47->44', '47->45', '47->46', '49->42', '49->43', '49->44', '49->45', '49->46',
    '60->122', '63->64', '63->70', '64->63', '65->6', '65->73', '66->122', '67->66', '67->122',
    '69->70', '79->36', '81->120', '84->2', '84->82', '87->9', '87->11', '87->14', '87->80',
    '97->5', '98->91', '98->92', '98->96', '107->25', '107->27', '110->109', '111->109', '113->6',
    '113->91', '113->92', '113->96', '115->66', '115->122',
  ];

  it('matches the reviewed allowlist exactly', () => {
    const same = (a: string, b: string) => keywordsOf(a).join(' ') === keywordsOf(b).join(' ');
    const overlaps: string[] = [];
    for (const a of graded) {
      for (const b of graded) {
        if (a.id === b.id || same(a.answersEn[0], b.answersEn[0])) continue;
        if (verdict(b.id, a.answersEn[0]) === 'correct') overlaps.push(`${a.id}->${b.id}`);
      }
    }
    expect(overlaps).toEqual(ALLOWED_OVERLAPS);
  });
});

describe('spoken numbers (final review)', () => {
  it.each<[number, string, OralVerdict]>([
    [53, 'four, five', 'wrong'],
    [54, 'two, three', 'wrong'],
    [7, 'twenty-seven, twenty-seven', 'correct'],
    [24, 'four hundred and thirty-five', 'correct'],
    [79, 'July fourth, seventeen seventy six', 'correct'],
    [104, 'the stock market crash of nineteen twenty nine', 'correct'],
  ])('Q%i "%s" → %s', (qid, said, expected) => {
    expect(verdict(qid, said)).toBe(expected);
  });
});

// Gate 3 (2026-09-25): "not" sat one edit from the stem "vot", so "I don't know"
// graded near on Q69/Q70 and practice asked "Có phải bạn nói: Vote…?".
describe('not-knowing replies never grade better than wrong (spec §3.3, rev 3.15)', () => {
  it.each(["I don't know", 'I do not know', "I don't remember", 'not sure', 'I am not sure'])('%s', (said) => {
    const better = graded.filter((q) => verdict(q.id, said) !== 'wrong').map((q) => q.id);
    expect(better).toEqual([]);
  });
});

// Rev 3.16 (filler sweep after Gate 3): every grading config, incl. each state
// and district, so location answers (Lee, Reed, Chu, Des Moines…) are covered.
function everyConfig(): [string, OralAnswerConfig][] {
  const out: [string, OralAnswerConfig][] = [];
  for (const q of N400_QUESTIONS) {
    if (!q.isLocationBased) {
      const c = getOralAnswerConfig(q.id);
      if (c) out.push([`Q${q.id}`, c]);
      continue;
    }
    for (const s of STATES) {
      const districts = [null, ...(REPS_BY_STATE.get(s.code) ?? []).map((r) => r.districtNumber)];
      for (const d of districts) {
        const c = getOralAnswerConfig(q.id, { stateCode: s.code, districtNumber: d });
        if (c) out.push([`Q${q.id}:${s.code}${d === null ? '' : `-${d}`}`, c]);
      }
    }
  }
  return out;
}

const STALLS = [
  'give me a second', 'just a second', 'wait a second', 'one second', 'hold on a second', 'give me a minute',
  'one moment', 'just a moment', 'wait', 'hold on', 'hang on', 'let me think', 'let me see', 'let me remember',
  'let me try', 'I need to think', "I don't know", "I don't remember", 'I forgot', "I'm not sure", 'no idea',
  'no clue', 'dunno', "I can't remember", 'I never learned this', 'never heard of it', 'say again', 'say that again',
  'can you repeat that', 'repeat the question', 'come again', 'one more time', 'could you say it again', 'pardon',
  'sorry', 'excuse me', 'what was the question', 'yes', 'yeah', 'okay', 'now', 'good morning', 'hello',
  'thank you', 'I guess',
];

describe('stall phrases never grade better than wrong, on any config (spec §3.3, rev 3.16)', () => {
  const configs = everyConfig();
  it.each(STALLS)('%s', (said) => {
    const better = configs.filter(([, c]) => gradeOralAnswer(said, c).verdict !== 'wrong').map(([label]) => label);
    expect(better).toEqual([]);
  });
});

describe('a stall before the taught answer keeps it correct (rev 3.16)', () => {
  it.each(['let me think', 'give me a second', 'say that again', 'yes'])('%s, <answer>', (stall) => {
    const broken = graded.filter((q) => verdict(q.id, `${stall}, ${q.answersEn[0]}`) !== 'correct').map((q) => q.id);
    expect(broken).toEqual([]);
  });
});

describe('stall removal never touches a taught answer (rev 3.16)', () => {
  it('every answer, incl. names, capitals and reps, reads the same with and without it', () => {
    const texts = [
      ...N400_QUESTIONS.flatMap((q) => q.answersEn),
      ...STATES.flatMap((s) => [s.governor, s.capital ?? '', ...s.senators]),
      ...[...REPS_BY_STATE.values()].flat().map((r) => r.name),
    ].filter(Boolean);
    const changed = texts.filter(
      (t) => transcriptStems(t).join(' ') !== contentTokens(normalizeTokens(t), { keepQualifiers: true }).map(stem).join(' '),
    );
    expect(changed).toEqual([]);
  });
});
