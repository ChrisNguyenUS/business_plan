import { describe, expect, it } from 'vitest';
import { practiceAttemptRow } from './attempt-row';

const AT = '2026-09-24T12:00:00.000Z';

describe('practiceAttemptRow', () => {
  it('choice rows omit answer_mode (MC keeps working before migration n400_32)', () => {
    expect(practiceAttemptRow('u1', 'practice', true, 'choice', AT)).toEqual({
      user_id: 'u1',
      mode: 'practice',
      score: 1,
      total_questions: 1,
      passed: null,
      completed_at: AT,
    });
  });

  it('voice and typed rows carry answer_mode', () => {
    expect(practiceAttemptRow('u1', 'practice', false, 'voice', AT)).toMatchObject({ score: 0, answer_mode: 'voice' });
    expect(practiceAttemptRow('u1', 'practice', true, 'typed', AT)).toMatchObject({ score: 1, answer_mode: 'typed' });
  });
});
