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
