import { describe, expect, it } from 'vitest';
import {
  deriveReadiness,
  estimateSessions,
  ITEMS_PER_SESSION,
  type ReadinessSignals,
} from './readiness';
import type { MockResult, SectionMockResult } from './storage';

function mock(passed: boolean, completedAt: string): MockResult {
  return {
    id: completedAt,
    startedAt: completedAt,
    completedAt,
    score: passed ? 15 : 5,
    total: 20,
    passed,
    questionResults: [],
  };
}

function sectionMock(
  section: 'writing' | 'speaking',
  passed: boolean,
  completedAt = '2026-07-01T00:00:00Z',
): SectionMockResult {
  return { id: `${section}-${passed}-${completedAt}`, section, passed, score: passed ? 1 : 0, total: 3, completedAt };
}

/** Nothing done at all. */
function emptySignals(): ReadinessSignals {
  return {
    civicsKnown: 0,
    civicsTotal: 128,
    whatmeanKnown: 0,
    whatmeanTotal: 62,
    yesnoKnown: 0,
    yesnoTotal: 37,
    mockResults: [],
    sectionMockResults: [],
  };
}

/** Every criterion satisfied. */
function readySignals(): ReadinessSignals {
  return {
    civicsKnown: 128,
    civicsTotal: 128,
    whatmeanKnown: 62,
    whatmeanTotal: 62,
    yesnoKnown: 37,
    yesnoTotal: 37,
    mockResults: [mock(true, '2026-07-01T00:00:00Z'), mock(true, '2026-07-02T00:00:00Z')],
    sectionMockResults: [sectionMock('writing', true)],
  };
}

describe('deriveReadiness', () => {
  it('reports zero for a brand-new learner and points at civics first', () => {
    const r = deriveReadiness(emptySignals());
    expect(r.percent).toBe(0);
    expect(r.metCount).toBe(0);
    expect(r.totalCount).toBe(5);
    expect(r.ready).toBe(false);
    expect(r.next?.id).toBe('civics_known');
  });

  it('reports 100 and no next action once every criterion is met', () => {
    const r = deriveReadiness(readySignals());
    expect(r.percent).toBe(100);
    expect(r.metCount).toBe(5);
    expect(r.ready).toBe(true);
    expect(r.next).toBeNull();
  });

  it('orders criteria foundations-first, mock tests last', () => {
    expect(deriveReadiness(emptySignals()).criteria.map((c) => c.id)).toEqual([
      'civics_known',
      'whatmean_known',
      'yesno_known',
      'writing_mock',
      'civics_mock',
    ]);
  });

  it('treats the 80% threshold as full credit for a known-criterion', () => {
    // 80% of 128 = 102.4, so 103 known clears it.
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 103 });
    const civics = r.criteria.find((c) => c.id === 'civics_known')!;
    expect(civics.met).toBe(true);
    expect(civics.progress).toBe(1);
    // One of five criteria fully met → 20%.
    expect(r.percent).toBe(20);
  });

  it('gives partial credit below the threshold, so the ring moves while learning', () => {
    // Half of the 102.4 target.
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 51 });
    const civics = r.criteria.find((c) => c.id === 'civics_known')!;
    expect(civics.met).toBe(false);
    expect(civics.progress).toBeCloseTo(0.498, 2);
    expect(r.percent).toBe(10);
  });

  it('never shows 100% while a criterion is still unmet', () => {
    // 100/128 = 78.1% known → progress 0.977, just short of the 80% bar. The
    // other four criteria are fully met, so the rounded average rounds up to
    // 100 even though the learner is not ready.
    const r = deriveReadiness({ ...readySignals(), civicsKnown: 100 });
    expect(r.ready).toBe(false);
    expect(r.metCount).toBe(4);
    expect(r.next?.id).toBe('civics_known');
    expect(r.percent).toBe(99);
  });

  it('never lets a known-criterion exceed full credit', () => {
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 128 });
    expect(r.criteria.find((c) => c.id === 'civics_known')!.progress).toBe(1);
  });

  it('requires the two most recent civics mocks to have passed', () => {
    const signals = {
      ...readySignals(),
      mockResults: [mock(true, '2026-07-01T00:00:00Z'), mock(false, '2026-07-02T00:00:00Z')],
    };
    const civicsMock = deriveReadiness(signals).criteria.find((c) => c.id === 'civics_mock')!;
    expect(civicsMock.met).toBe(false);
    expect(civicsMock.progress).toBe(0.5);
  });

  it('gives a single passing mock only half credit, since two in a row is the bar', () => {
    const signals = { ...readySignals(), mockResults: [mock(true, '2026-07-01T00:00:00Z')] };
    const civicsMock = deriveReadiness(signals).criteria.find((c) => c.id === 'civics_mock')!;
    expect(civicsMock.met).toBe(false);
    expect(civicsMock.progress).toBe(0.5);
  });

  it('ignores older passes when a recent mock failed', () => {
    // Three passes then a fail: the last two are [pass, fail] → not met.
    const signals = {
      ...readySignals(),
      mockResults: [
        mock(true, '2026-07-01T00:00:00Z'),
        mock(true, '2026-07-02T00:00:00Z'),
        mock(true, '2026-07-03T00:00:00Z'),
        mock(false, '2026-07-04T00:00:00Z'),
      ],
    };
    expect(deriveReadiness(signals).criteria.find((c) => c.id === 'civics_mock')!.met).toBe(false);
  });

  it('sorts mocks by completion date rather than trusting array order', () => {
    const signals = {
      ...readySignals(),
      mockResults: [mock(false, '2026-07-09T00:00:00Z'), mock(true, '2026-07-01T00:00:00Z'), mock(true, '2026-07-02T00:00:00Z')],
    };
    // Chronologically the newest is the failure → last two are [pass, fail].
    expect(deriveReadiness(signals).criteria.find((c) => c.id === 'civics_mock')!.met).toBe(false);
  });

  it('treats the writing mock as all-or-nothing and ignores speaking mocks', () => {
    const failed = deriveReadiness({ ...readySignals(), sectionMockResults: [sectionMock('writing', false)] });
    expect(failed.criteria.find((c) => c.id === 'writing_mock')!.progress).toBe(0);
    expect(failed.next?.id).toBe('writing_mock');

    const speakingOnly = deriveReadiness({ ...readySignals(), sectionMockResults: [sectionMock('speaking', true)] });
    expect(speakingOnly.criteria.find((c) => c.id === 'writing_mock')!.met).toBe(false);

    const passed = deriveReadiness({
      ...readySignals(),
      sectionMockResults: [
        sectionMock('writing', false, '2026-07-01T00:00:00Z'),
        sectionMock('writing', true, '2026-07-02T00:00:00Z'),
      ],
    });
    expect(passed.criteria.find((c) => c.id === 'writing_mock')!.met).toBe(true);
  });

  it('judges the writing mock by the LATEST attempt — an old pass does not survive a newer failure', () => {
    // Same shape as the civics criterion ("gần nhất"): passing once in the past
    // proves nothing if the most recent attempt failed. This is the bug where
    // the checklist said "Đã đậu" while Kết quả thi thử showed "Chưa đạt · 0/3".
    const signals = {
      ...readySignals(),
      sectionMockResults: [
        sectionMock('writing', true, '2026-07-01T00:00:00Z'),
        sectionMock('writing', false, '2026-07-05T00:00:00Z'),
      ],
    };
    const writing = deriveReadiness(signals).criteria.find((c) => c.id === 'writing_mock')!;
    expect(writing.met).toBe(false);
    expect(writing.progress).toBe(0);
    expect(writing.remaining).toBe(1);
  });

  it('sorts writing mocks by completion date rather than trusting array order', () => {
    // Newest failure listed first: chronological order must still win.
    const signals = {
      ...readySignals(),
      sectionMockResults: [
        sectionMock('writing', false, '2026-07-09T00:00:00Z'),
        sectionMock('writing', true, '2026-07-01T00:00:00Z'),
      ],
    };
    expect(deriveReadiness(signals).criteria.find((c) => c.id === 'writing_mock')!.met).toBe(false);
  });

  it('distinguishes "never attempted" from "latest attempt failed" in the writing detail', () => {
    const never = deriveReadiness(emptySignals()).criteria.find((c) => c.id === 'writing_mock')!;
    expect(never.detail).toBe('Chưa thi');

    const failedLatest = deriveReadiness({
      ...readySignals(),
      sectionMockResults: [sectionMock('writing', false)],
    }).criteria.find((c) => c.id === 'writing_mock')!;
    expect(failedLatest.detail).toBe('Chưa đậu');

    const passedLatest = deriveReadiness(readySignals()).criteria.find((c) => c.id === 'writing_mock')!;
    expect(passedLatest.detail).toBe('Đã đậu');
  });

  it('picks the first unmet criterion in order as the next action', () => {
    // Civics done, What Mean not → What Mean is next even though later ones are also unmet.
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 128 });
    expect(r.next?.id).toBe('whatmean_known');
  });

  it('gives every criterion a base-relative CTA href', () => {
    for (const c of deriveReadiness(emptySignals()).criteria) {
      expect(c.cta.href.startsWith('/')).toBe(true);
      expect(c.cta.label.length).toBeGreaterThan(0);
    }
  });

  it('guards against an empty question pool instead of dividing by zero', () => {
    const r = deriveReadiness({ ...emptySignals(), civicsTotal: 0, whatmeanTotal: 0, yesnoTotal: 0 });
    expect(Number.isNaN(r.percent)).toBe(false);
    expect(r.criteria.find((c) => c.id === 'civics_known')!.progress).toBe(0);
  });
});

describe('criterion.remaining', () => {
  it('counts items still needed to clear the 80% bar, not items left in the pool', () => {
    // 80% of 128 = 102.4 → 103 known clears it; 56 known leaves 47 to go.
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 56 });
    expect(r.criteria.find((c) => c.id === 'civics_known')!.remaining).toBe(47);
  });

  it('is zero once a criterion is met, even when the learner overshot the bar', () => {
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 128 });
    expect(r.criteria.find((c) => c.id === 'civics_known')!.remaining).toBe(0);
  });

  it('counts a missing writing mock as one item and missing civics mocks individually', () => {
    const empty = deriveReadiness(emptySignals());
    expect(empty.criteria.find((c) => c.id === 'writing_mock')!.remaining).toBe(1);
    expect(empty.criteria.find((c) => c.id === 'civics_mock')!.remaining).toBe(2);

    const onePass = deriveReadiness({ ...emptySignals(), mockResults: [mock(true, '2026-07-01T00:00:00Z')] });
    expect(onePass.criteria.find((c) => c.id === 'civics_mock')!.remaining).toBe(1);
  });

  it('never goes negative when the pool is empty', () => {
    const r = deriveReadiness({ ...emptySignals(), civicsTotal: 0 });
    expect(r.criteria.find((c) => c.id === 'civics_known')!.remaining).toBe(0);
  });
});

describe('criterion.milestone', () => {
  it('phrases a known-criterion as the work left, not the bar to clear', () => {
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 56 });
    expect(r.criteria.find((c) => c.id === 'civics_known')!.milestone).toBe('Học thêm 47 câu Civics');
  });

  it('reuses the checklist label for mock criteria, which have no count to phrase', () => {
    const r = deriveReadiness(emptySignals());
    const writing = r.criteria.find((c) => c.id === 'writing_mock')!;
    expect(writing.milestone).toBe(writing.label);
  });
});

describe('estimateSessions', () => {
  it('turns items left to learn into a session range', () => {
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 56 });
    // 47 items to go at 25 per session → 2 sessions, shown as a 2–3 range.
    expect(estimateSessions(r.criteria.find((c) => c.id === 'civics_known')!)).toEqual({ min: 2, max: 3 });
  });

  it('rounds a partial session up rather than promising less work than there is', () => {
    // 102 known → 1 item left, still a whole session.
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 102 });
    expect(estimateSessions(r.criteria.find((c) => c.id === 'civics_known')!)).toEqual({ min: 1, max: 2 });
  });

  it('gives mock criteria an exact count, since a mock IS one session', () => {
    const r = deriveReadiness(emptySignals());
    expect(estimateSessions(r.criteria.find((c) => c.id === 'writing_mock')!)).toEqual({ min: 1, max: 1 });
    expect(estimateSessions(r.criteria.find((c) => c.id === 'civics_mock')!)).toEqual({ min: 2, max: 2 });
  });

  it('returns null for a met criterion — there is nothing left to estimate', () => {
    const r = deriveReadiness(readySignals());
    for (const c of r.criteria) {
      expect(estimateSessions(c)).toBeNull();
    }
  });

  it('keeps ITEMS_PER_SESSION a positive number so the estimate can never divide by zero', () => {
    expect(ITEMS_PER_SESSION).toBeGreaterThan(0);
  });
});
