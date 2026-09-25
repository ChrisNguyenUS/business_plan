import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { ga } = vi.hoisted(() => ({ ga: vi.fn() }));
vi.mock('@/lib/analytics/events', () => ({
  trackGa: ga,
  generateEventId: () => 'evt-1',
  trackBadgeUnlocked: () => {},
}));

import { trackMockTestStart, trackOralAnswer, type OralAnswerEvent } from './analytics';

const fbq = vi.fn();

beforeEach(() => {
  ga.mockReset();
  fbq.mockReset();
  vi.stubGlobal('window', { fbq });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const base: OralAnswerEvent = {
  qid: 69,
  context: 'practice',
  input: 'mic',
  verdict: 'wrong',
  retried: null,
  confirmedNear: null,
  error: 'none',
  transcriptLength: 12,
};

describe('trackOralAnswer (spec §9)', () => {
  it('sends n400_oral_answer to GA4 with exactly these params (no transcript)', () => {
    trackOralAnswer(base);
    expect(ga).toHaveBeenCalledWith('n400_oral_answer', {
      qid: 69,
      context: 'practice',
      input: 'mic',
      verdict: 'wrong',
      retried: 'n/a',
      confirmed_near: 'n/a',
      error: 'none',
      transcript_length: 12,
    });
  });

  it('never reaches the Meta Pixel', () => {
    trackOralAnswer(base);
    expect(fbq).not.toHaveBeenCalled();
  });

  it('maps yes/no/n-a', () => {
    trackOralAnswer({ ...base, context: 'mock', retried: true, confirmedNear: false });
    expect(ga.mock.calls[0][1]).toMatchObject({ retried: 'yes', confirmed_near: 'no' });
  });
});

describe('trackMockTestStart', () => {
  it('carries the answer mode to GA4 and the Pixel', () => {
    trackMockTestStart('voice');
    expect(ga).toHaveBeenCalledWith('n400_mock_test_start', { answer_mode: 'voice' });
    expect(fbq).toHaveBeenCalledWith('trackCustom', 'n400_mock_test_start', { answer_mode: 'voice' }, { eventID: 'evt-1' });
  });

  it('defaults to choice', () => {
    trackMockTestStart();
    expect(ga).toHaveBeenCalledWith('n400_mock_test_start', { answer_mode: 'choice' });
  });
});
