import { describe, expect, it } from 'vitest';
import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { correctAnswersFor } from '../quiz-engine';
import { getOralAnswerConfig } from './get-oral-config';
import { nearPromptAnswer, voiceOutcome } from './voice-outcome';

describe('voiceOutcome (spec §5, D7)', () => {
  it('correct and wrong are recorded as graded', () => {
    expect(voiceOutcome('correct', null)).toEqual({ shownCorrect: true, record: true });
    expect(voiceOutcome('wrong', null)).toEqual({ shownCorrect: false, record: false });
  });

  it('near waits for the learner', () => {
    expect(voiceOutcome('near', null)).toBeNull();
  });

  it('near + "Đúng vậy" is shown correct but never recorded', () => {
    expect(voiceOutcome('near', 'yes')).toEqual({ shownCorrect: true, record: null });
  });

  it('near + "Không" is recorded wrong', () => {
    expect(voiceOutcome('near', 'no')).toEqual({ shownCorrect: false, record: false });
  });
});

describe('nearPromptAnswer (final review: prompt names the answer the learner was near)', () => {
  const q23 = N400_QUESTIONS_BY_ID.get(23)!;
  const ca = { stateCode: 'CA' as const, districtNumber: null };
  const caAnswers = correctAnswersFor(q23, 'CA', null).map((a) => a.en);

  it('offers the senator whose name was nearly heard, not the first one', () => {
    expect(nearPromptAnswer('sciff', getOralAnswerConfig(23, ca)!, caAnswers)).toBe('Adam Schiff');
    expect(nearPromptAnswer('padila', getOralAnswerConfig(23, ca)!, caAnswers)).toBe('Alex Padilla');
  });

  it('single-answer questions offer the taught answer', () => {
    const q2 = N400_QUESTIONS_BY_ID.get(2)!;
    expect(nearPromptAnswer('the institution', getOralAnswerConfig(2)!, q2.answersEn)).toBe(q2.answersEn[0]);
  });

  it('returns null when alternatives cannot be matched to answers', () => {
    expect(nearPromptAnswer('x', { type: 'single', alternatives: [['a']] }, ['A', 'B'])).toBeNull();
  });
});
