import { describe, it, expect } from 'vitest';
import {
  recommendDailyHero,
  pendingMockReviewIds,
  type HeroSignals,
} from './hero-recommendation';
import type { QuestionAttempt, MockResult } from './storage';
import type { SectionAttempt, SectionKey } from './section-progress';
import { vi } from './i18n/vi';

const NOW = new Date('2026-07-12T12:00:00Z');

const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

const att = (questionId: number, wasCorrect: boolean, at: string): QuestionAttempt => ({
  questionId,
  wasCorrect,
  mode: 'practice',
  at,
});

const sectionAtt = (section: SectionKey, at: string): SectionAttempt => ({
  section,
  itemId: `${section}-1`,
  wasCorrect: true,
  mode: 'flashcard',
  at,
});

const mock = (completedAt: string, wrongIds: number[], rightIds: number[] = [1, 2]): MockResult => ({
  id: `mock-${completedAt}`,
  startedAt: completedAt,
  completedAt,
  score: rightIds.length,
  total: rightIds.length + wrongIds.length,
  passed: true,
  questionResults: [
    ...rightIds.map((questionId) => ({ questionId, wasCorrect: true })),
    ...wrongIds.map((questionId) => ({ questionId, wasCorrect: false })),
  ],
});

// Baseline: mid-progress user, every section fresh, goals unfinished — so the
// default intent wins and each test flips exactly one signal.
const base = (over: Partial<HeroSignals> = {}): HeroSignals => ({
  now: NOW,
  civicsSeen: 50,
  civicsTotal: 128,
  attempts: [att(1, true, daysAgo(1))],
  mockResults: [],
  sectionAttempts: [
    sectionAtt('writing', daysAgo(1)),
    sectionAtt('yesno', daysAgo(1)),
    sectionAtt('whatmean', daysAgo(1)),
  ],
  goalsDone: 1,
  goalsTotal: 4,
  ...over,
});

describe('pendingMockReviewIds', () => {
  it('returns the wrong ids of the latest mock inside the window', () => {
    const ids = pendingMockReviewIds([mock(hoursAgo(2), [10, 20, 30])], [], NOW);
    expect(ids).toEqual([10, 20, 30]);
  });

  it('returns [] when the latest mock is older than the window', () => {
    expect(pendingMockReviewIds([mock(hoursAgo(80), [10])], [], NOW)).toEqual([]);
  });

  it('drops ids whose last attempt after the mock was correct, keeps re-missed ones', () => {
    const mocks = [mock(hoursAgo(5), [10, 20, 30])];
    const attempts = [
      att(10, true, hoursAgo(4)), // cleared
      att(20, true, hoursAgo(4)),
      att(20, false, hoursAgo(3)), // re-opened
      att(30, true, hoursAgo(10)), // before the mock — irrelevant
    ];
    expect(pendingMockReviewIds(mocks, attempts, NOW)).toEqual([20, 30]);
  });

  it('uses only the most recent mock', () => {
    const mocks = [mock(hoursAgo(50), [10]), mock(hoursAgo(2), [99])];
    expect(pendingMockReviewIds(mocks, [], NOW)).toEqual([99]);
  });

  it('flashcard self-grades after the mock do not clear review debt', () => {
    const mocks = [mock(hoursAgo(5), [10])];
    const attempts: QuestionAttempt[] = [
      { questionId: 10, wasCorrect: true, mode: 'flashcard', at: hoursAgo(3) },
    ];
    expect(pendingMockReviewIds(mocks, attempts, NOW)).toEqual([10]);
  });
});

describe('recommendDailyHero — priority ladder', () => {
  it('start_civics for a brand-new account', () => {
    const rec = recommendDailyHero(
      base({ attempts: [], sectionAttempts: [], mockResults: [], civicsSeen: 0 }),
      vi,
    );
    expect(rec.intent).toBe('start_civics');
    expect(rec.cta.href).toBe('/flashcards?filter=unknown');
  });

  it('review_mistakes when a fresh mock has uncorrected wrongs', () => {
    const rec = recommendDailyHero(base({ mockResults: [mock(hoursAgo(2), [10, 20, 30])] }), vi);
    expect(rec.intent).toBe('review_mistakes');
    expect(rec.title).toContain('3 câu');
    expect(rec.cta.href).toBe('/practice?start=review');
  });

  it('review_mistakes beats goal_complete', () => {
    const rec = recommendDailyHero(
      base({ mockResults: [mock(hoursAgo(1), [10])], goalsDone: 4 }),
      vi,
    );
    expect(rec.intent).toBe('review_mistakes');
  });

  it('goal_complete when all daily goals are done', () => {
    const rec = recommendDailyHero(base({ goalsDone: 4 }), vi);
    expect(rec.intent).toBe('goal_complete');
    expect(rec.cta.href).toBe('/mock-test');
  });

  it('first_mock at ≥80% coverage with no mock history', () => {
    const rec = recommendDailyHero(base({ civicsSeen: 110 }), vi);
    expect(rec.intent).toBe('first_mock');
    expect(rec.cta.href).toBe('/mock-test');
  });

  it('stale_section picks the coldest section and reports the day count', () => {
    const rec = recommendDailyHero(
      base({
        sectionAttempts: [
          sectionAtt('writing', daysAgo(12)),
          sectionAtt('yesno', daysAgo(9)),
          sectionAtt('whatmean', daysAgo(1)),
        ],
      }),
      vi,
    );
    expect(rec.intent).toBe('stale_section');
    expect(rec.title).toContain('12 ngày');
    expect(rec.title).toContain('Writing');
    expect(rec.cta.href).toBe('/writing');
  });

  it('nudges a never-started section only after half of civics is seen', () => {
    const early = recommendDailyHero(base({ civicsSeen: 40, sectionAttempts: [] }), vi);
    expect(early.intent).toBe('continue_civics');

    const invested = recommendDailyHero(base({ civicsSeen: 70, sectionAttempts: [] }), vi);
    expect(invested.intent).toBe('stale_section');
    expect(invested.title).toContain('chưa bắt đầu');
    expect(invested.title).toContain('Writing'); // priority tie-break
  });

  it('a genuinely stale started section outranks a never-started one', () => {
    const rec = recommendDailyHero(
      base({
        civicsSeen: 70,
        sectionAttempts: [sectionAtt('yesno', daysAgo(15))], // writing/whatmean unstarted
      }),
      vi,
    );
    expect(rec.intent).toBe('stale_section');
    expect(rec.title).toContain('Yes / No');
  });

  it('finish_civics when ≤20 questions remain (mock history present)', () => {
    const rec = recommendDailyHero(
      base({ civicsSeen: 115, mockResults: [mock(daysAgo(10), [10])] }),
      vi,
    );
    expect(rec.intent).toBe('finish_civics');
    expect(rec.title).toContain('13 câu');
  });

  it('continue_civics as the default mid-progress state', () => {
    const rec = recommendDailyHero(base(), vi);
    expect(rec.intent).toBe('continue_civics');
    expect(rec.subtitle).toContain('78 câu');
    expect(rec.cta.href).toBe('/flashcards?filter=unknown');
  });

  it('continue_civics switches to review copy when everything is seen', () => {
    const rec = recommendDailyHero(
      base({ civicsSeen: 128, mockResults: [mock(daysAgo(10), [10])] }),
      vi,
    );
    expect(rec.intent).toBe('continue_civics');
    expect(rec.title).toContain('Ôn lại');
    expect(rec.cta.href).toBe('/flashcards');
  });
});
