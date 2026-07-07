import { describe, it, expect } from 'vitest';
import { loadAttemptTimeline, longestCorrectRun } from './timeline';

function fakeSupabase(
  civicsRows: Array<{ was_correct: boolean; answered_at: string }>,
  sectionRows: Array<{ was_correct: boolean; answered_at: string }>,
) {
  return {
    from: (table: string) => {
      if (table === 'n400_question_attempts') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: civicsRows }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: sectionRows }),
            }),
          }),
        }),
      };
    },
  } as any;
}

describe('loadAttemptTimeline', () => {
  it('merges and sorts civics + section attempts chronologically', async () => {
    const civics = [{ was_correct: true, answered_at: '2026-01-01T10:00:00Z' }];
    const sections = [{ was_correct: false, answered_at: '2026-01-01T09:00:00Z' }];
    const timeline = await loadAttemptTimeline('u', fakeSupabase(civics, sections));
    expect(timeline.map((e) => e.at)).toEqual(['2026-01-01T09:00:00Z', '2026-01-01T10:00:00Z']);
  });
});

describe('longestCorrectRun', () => {
  it('finds the longest consecutive correct streak', () => {
    const entries = [
      { wasCorrect: true, at: 't1' },
      { wasCorrect: true, at: 't2' },
      { wasCorrect: false, at: 't3' },
      { wasCorrect: true, at: 't4' },
      { wasCorrect: true, at: 't5' },
      { wasCorrect: true, at: 't6' },
    ];
    expect(longestCorrectRun(entries)).toBe(3);
  });

  it('returns 0 for an all-wrong timeline', () => {
    expect(longestCorrectRun([{ wasCorrect: false, at: 't1' }])).toBe(0);
  });

  it('returns 0 for an empty timeline', () => {
    expect(longestCorrectRun([])).toBe(0);
  });
});
