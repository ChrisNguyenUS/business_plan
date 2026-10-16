import { describe, expect, it } from 'vitest';
import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { correctAnswersFor } from '../quiz-engine';
import { gradeOralAnswer } from './grade-oral';
import { getOralAnswerConfig } from './get-oral-config';
import { ORAL_ALIASES } from './oral-aliases';
import { ORAL_ANSWER_CONFIG } from './oral-answer-config.generated';

const TX = { stateCode: 'TX' as const, districtNumber: null };

describe('getOralAnswerConfig', () => {
  it('returns the generated config plus aliases', () => {
    expect(getOralAnswerConfig(4)).toEqual({
      type: 'single',
      alternatives: [['self government'], ['govern themselves']],
    });
  });

  it('returns null for unknown questions', () => {
    expect(getOralAnswerConfig(999)).toBeNull();
  });

  it('location-based questions need a location', () => {
    expect(getOralAnswerConfig(23)).toBeNull();
  });

  it.each([23, 29, 61, 62])('Q%i: every personal answer for TX grades correct', (id) => {
    const q = N400_QUESTIONS_BY_ID.get(id)!;
    const config = getOralAnswerConfig(id, TX);
    expect(config).not.toBeNull();
    for (const a of correctAnswersFor(q, TX.stateCode, TX.districtNumber)) {
      expect(gradeOralAnswer(a.en, config!).verdict).toBe('correct');
    }
  });

  it('senators and governors accept the surname alone', () => {
    expect(gradeOralAnswer('Cruz', getOralAnswerConfig(23, TX)!).verdict).toBe('correct');
    expect(gradeOralAnswer('Abbott', getOralAnswerConfig(61, TX)!).verdict).toBe('correct');
  });
});

describe('ORAL_ALIASES', () => {
  it('each alias grades correct as spoken', () => {
    for (const [qid, alts] of Object.entries(ORAL_ALIASES)) {
      for (const parts of alts) {
        expect(gradeOralAnswer(parts.join(' '), getOralAnswerConfig(Number(qid))!).verdict).toBe('correct');
      }
    }
  });

  it('no alias duplicates a generated alternative', () => {
    for (const [qid, alts] of Object.entries(ORAL_ALIASES)) {
      const generated = ORAL_ANSWER_CONFIG[Number(qid)].alternatives.map((a) => a.join('|'));
      for (const parts of alts) expect(generated).not.toContain(parts.join('|'));
    }
  });
});

describe('getOralAnswerConfig — accented names', () => {
  it('accepts the unaccented spelling a recognizer may return', () => {
    const nm = { stateCode: 'NM' as const, districtNumber: null };
    const pr = { stateCode: 'PR' as const, districtNumber: null };
    expect(gradeOralAnswer('Lujan', getOralAnswerConfig(23, nm)!).verdict).toBe('correct');
    expect(gradeOralAnswer('Gonzalez Colon', getOralAnswerConfig(61, pr)!).verdict).toBe('correct');
  });
});

const grade = (qid: number, code: 'DC' | 'GU' | 'TX', said: string) =>
  gradeOralAnswer(said, getOralAnswerConfig(qid, { stateCode: code, districtNumber: 0 })!).verdict;

describe('oral grading for D.C. and territory rule answers', () => {
  it('accepts the USCIS rule said out loud', () => {
    expect(grade(23, 'DC', 'D.C. has no senators')).toBe('correct');
    expect(grade(23, 'GU', 'Guam does not have senators')).toBe('correct');
    expect(grade(61, 'DC', 'Washington D.C. does not have a governor')).toBe('correct');
    expect(grade(62, 'DC', 'D.C. is not a state')).toBe('correct');
  });

  it('rejects the old taught name and the opposite statement', () => {
    expect(grade(61, 'DC', 'Muriel Bowser')).not.toBe('correct');
    expect(grade(23, 'DC', 'D.C. has two senators')).not.toBe('correct');
  });

  it('accepts a territory capital said without diacritics', () => {
    expect(grade(62, 'GU', 'Hagatna')).toBe('correct');
  });

  it('keeps state answers unchanged', () => {
    expect(grade(62, 'TX', 'Austin')).toBe('correct');
  });
});
