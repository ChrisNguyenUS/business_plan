import { describe, expect, it } from 'vitest';
import { practiceAttemptRow, sectionAttemptRow, sectionMockResultRow } from './attempt-row';

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

describe('sectionAttemptRow (speaking spec §6)', () => {
  it('a choice answer inserts exactly as before n400_34 (no answer_mode)', () => {
    expect(sectionAttemptRow('u1', 'yesno', 'yn-1', true, 'practice')).toEqual({
      user_id: 'u1',
      section: 'yesno',
      item_id: 'yn-1',
      mode: 'practice',
      was_correct: true,
    });
    expect(sectionAttemptRow('u1', 'yesno', 'yn-1', true, 'practice', 'choice')).not.toHaveProperty('answer_mode');
  });

  it('voice and typed answers carry answer_mode', () => {
    expect(sectionAttemptRow('u1', 'whatmean', 'wm-7', false, 'practice', 'voice')).toMatchObject({ answer_mode: 'voice' });
    expect(sectionAttemptRow('u1', 'whatmean', 'wm-7', true, 'practice', 'typed')).toMatchObject({ answer_mode: 'typed' });
  });
});

describe('sectionMockResultRow (speaking spec §5.1)', () => {
  it('a choice run inserts exactly as before (no answer_mode)', () => {
    expect(sectionMockResultRow('u1', 'speaking', true, 9, 10)).toEqual({
      user_id: 'u1',
      section: 'speaking',
      passed: true,
      score: 9,
      total: 10,
    });
    expect(sectionMockResultRow('u1', 'writing', false, 0, 3, 'choice')).not.toHaveProperty('answer_mode');
  });

  it('voice and typed runs carry answer_mode', () => {
    expect(sectionMockResultRow('u1', 'speaking', false, 7, 10, 'voice')).toMatchObject({ answer_mode: 'voice' });
    expect(sectionMockResultRow('u1', 'speaking', true, 8, 10, 'typed')).toMatchObject({ answer_mode: 'typed' });
  });
});
