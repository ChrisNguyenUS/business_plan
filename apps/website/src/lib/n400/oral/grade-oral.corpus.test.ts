import { describe, expect, it } from 'vitest';
import { N400_QUESTIONS } from '../questions-data';
import { gradeOralAnswer } from './grade-oral';
import { getOralAnswerConfig } from './get-oral-config';
import { keywordsOf } from './normalize';
import type { OralVerdict } from './types';

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
  ])('Q%i "%s" → %s', (qid, said, expected) => {
    expect(verdict(qid, said)).toBe(expected);
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
  // PROVISIONAL until the owner signs off Gate 1; each pair is listed in the gate report.
  const ALLOWED_OVERLAPS = [
    '8->35', '16->18', '16->42', '16->43', '16->44', '16->45', '16->46', '25->27',
    '31->63', '31->64', '31->122', '32->63', '32->64', '32->122', '33->63', '33->64',
    '34->63', '34->64', '37->42', '37->43', '37->44', '37->45', '37->46', '47->42',
    '47->43', '47->44', '47->45', '47->46', '49->42', '49->43', '49->44', '49->45',
    '49->46', '60->122', '63->64', '63->70', '64->63', '65->6', '65->73', '66->122',
    '67->66', '67->122', '69->70', '79->36', '81->120', '84->2', '84->35', '84->82',
    '87->9', '87->11', '87->14', '87->80', '88->2', '88->82', '97->5', '98->91',
    '98->92', '98->96', '107->27', '110->109', '111->109', '113->6', '113->91', '113->92',
    '113->96', '115->66', '115->122', '128->35',
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
