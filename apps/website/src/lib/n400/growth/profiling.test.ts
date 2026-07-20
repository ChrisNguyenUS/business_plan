import { describe, expect, it } from 'vitest';
import {
  answersFromLeadProfile,
  assignVariant,
  selectActivePrompt,
  type GradedEvent,
  type ProfilingInputs,
  type PromptDefinition,
  type PromptState,
} from './profiling';

const USER = '11111111-1111-4111-8111-111111111111';

function def(partial: Partial<PromptDefinition> & Pick<PromptDefinition, 'question_key' | 'sort_order'>): PromptDefinition {
  return {
    variant: 'a',
    text_en: 'q?',
    text_vi: 'hỏi?',
    options: [
      { value: 'yes', label_en: 'Yes', label_vi: 'Rồi' },
      { value: 'not_yet', label_en: 'Not yet', label_vi: 'Chưa' },
    ],
    trigger: {},
    depends_on: null,
    snooze_days: 6,
    snooze_sessions: 3,
    ...partial,
  };
}

// Mirrors the n400_16 seeds.
const SEEDS: PromptDefinition[] = [
  def({ question_key: 'filed', sort_order: 1, trigger: { after_event: 'practice_completed', min_count: 1 } }),
  def({
    question_key: 'filing_timeline', sort_order: 2,
    trigger: { after_event: 'mock_completed', min_count: 1 },
    depends_on: { question_key: 'filed', answer: 'not_yet' },
  }),
  def({
    question_key: 'interview_notice', sort_order: 3,
    trigger: { distinct_practice_days: 3 },
    depends_on: { question_key: 'filed', answer: 'yes' },
  }),
  def({
    question_key: 'interview_date', sort_order: 4,
    trigger: { immediately_after: 'interview_notice' },
    depends_on: { question_key: 'interview_notice', answer: 'yes' },
  }),
  def({ question_key: 'wants_guidance', sort_order: 5, trigger: { distinct_practice_days: 5 } }),
];

const NOW = new Date('2026-07-19T12:00:00Z');

function practiceOn(day: string): GradedEvent {
  return { type: 'practice_completed', at: `${day}T10:00:00Z` };
}

function inputs(partial: Partial<ProfilingInputs> = {}): ProfilingInputs {
  return {
    userId: USER,
    definitions: SEEDS,
    states: [],
    answers: {},
    gradedEvents: [],
    now: NOW,
    ...partial,
  };
}

describe('selectActivePrompt', () => {
  it('returns null for a brand-new user (filed needs one practice event)', () => {
    expect(selectActivePrompt(inputs(), 'results')).toBeNull();
  });

  it('offers filed on the results surface after the first practice event, with a debug reason', () => {
    const got = selectActivePrompt(inputs({ gradedEvents: [practiceOn('2026-07-19')] }), 'results');
    expect(got?.def.question_key).toBe('filed');
    expect(got?.reason).toBe('practice_completed>=1');
  });

  it('never re-offers an answered question', () => {
    const got = selectActivePrompt(
      inputs({ answers: { filed: 'yes' }, gradedEvents: [practiceOn('2026-07-19')] }),
      'results',
    );
    expect(got?.def.question_key).not.toBe('filed');
  });

  it('hides filing_timeline when filed=yes, shows it when filed=not_yet after a mock', () => {
    const events: GradedEvent[] = [practiceOn('2026-07-19'), { type: 'mock_completed', at: '2026-07-19T11:00:00Z' }];
    expect(
      selectActivePrompt(inputs({ answers: { filed: 'yes' }, gradedEvents: events }), 'results')?.def.question_key,
    ).not.toBe('filing_timeline');
    expect(
      selectActivePrompt(inputs({ answers: { filed: 'not_yet' }, gradedEvents: events }), 'results')?.def.question_key,
    ).toBe('filing_timeline');
  });

  it('gates interview_notice behind 3 distinct practice days', () => {
    const twoDays = [practiceOn('2026-07-17'), practiceOn('2026-07-18')];
    const threeDays = [...twoDays, practiceOn('2026-07-19')];
    expect(
      selectActivePrompt(inputs({ answers: { filed: 'yes' }, gradedEvents: twoDays }), 'results'),
    ).toBeNull();
    expect(
      selectActivePrompt(inputs({ answers: { filed: 'yes' }, gradedEvents: threeDays }), 'results')?.def.question_key,
    ).toBe('interview_notice');
  });

  it('offers interview_date immediately after interview_notice=yes', () => {
    const got = selectActivePrompt(
      inputs({ answers: { filed: 'yes', interview_notice: 'yes' }, gradedEvents: [practiceOn('2026-07-19')] }),
      'results',
    );
    expect(got?.def.question_key).toBe('interview_date');
  });

  it('routes a skipped question off results and onto dashboard only after snooze', () => {
    const skipped: PromptState[] = [{
      question_key: 'filed',
      answered_at: null,
      skipped_at: '2026-07-18T00:00:00Z',
      snooze_until: '2026-07-24T00:00:00Z',
    }];
    const base = inputs({ states: skipped, gradedEvents: [practiceOn('2026-07-19')] });
    expect(selectActivePrompt(base, 'results')).toBeNull();
    expect(selectActivePrompt(base, 'dashboard')).toBeNull(); // snooze not over, 1 active day since skip
    // 6 days later the snooze expired:
    expect(
      selectActivePrompt({ ...base, now: new Date('2026-07-25T00:00:00Z') }, 'dashboard')?.def.question_key,
    ).toBe('filed');
  });

  it('releases a snoozed question early after 3 distinct active days since skip', () => {
    const skipped: PromptState[] = [{
      question_key: 'filed',
      answered_at: null,
      skipped_at: '2026-07-16T00:00:00Z',
      snooze_until: '2026-07-22T00:00:00Z',
    }];
    const got = selectActivePrompt(
      inputs({
        states: skipped,
        gradedEvents: [practiceOn('2026-07-17'), practiceOn('2026-07-18'), practiceOn('2026-07-19')],
      }),
      'dashboard',
    );
    expect(got?.def.question_key).toBe('filed');
  });

  it('returns a single question — lowest sort_order wins', () => {
    const manyDays = ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'].map(practiceOn);
    // filed and wants_guidance are both eligible; filed (sort 1) wins.
    expect(selectActivePrompt(inputs({ gradedEvents: manyDays }), 'results')?.def.question_key).toBe('filed');
  });
});

describe('assignVariant', () => {
  it('is deterministic and returns a listed variant', () => {
    const v1 = assignVariant(USER, 'filed', ['a', 'b']);
    const v2 = assignVariant(USER, 'filed', ['b', 'a']);
    expect(v1).toBe(v2);
    expect(['a', 'b']).toContain(v1);
    expect(assignVariant(USER, 'filed', ['a'])).toBe('a');
  });
});

describe('answersFromLeadProfile', () => {
  it('maps profile columns back to question answers', () => {
    expect(answersFromLeadProfile(null)).toEqual({});
    expect(answersFromLeadProfile({
      n400_filed: true,
      filing_timeline: null,
      interview_scheduled: false,
      interview_date: null,
      wants_guidance: 'maybe',
    })).toEqual({ filed: 'yes', interview_notice: 'no', wants_guidance: 'maybe' });
    expect(answersFromLeadProfile({
      n400_filed: false,
      filing_timeline: '30d',
      interview_scheduled: null,
      interview_date: '2026-08-10',
      wants_guidance: null,
    })).toEqual({ filed: 'not_yet', filing_timeline: '30d', interview_date: '2026-08-10' });
  });
});
