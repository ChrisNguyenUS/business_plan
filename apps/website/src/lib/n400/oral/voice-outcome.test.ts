import { describe, expect, it } from 'vitest';
import { voiceOutcome } from './voice-outcome';

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
