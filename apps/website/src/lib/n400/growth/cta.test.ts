import { describe, expect, it } from 'vitest';
import {
  selectActiveCta,
  type CtaDefinition,
  type CtaEvent,
  type CtaInputs,
} from './cta';
import type { LearningSignals } from './learning-signals';

const USER = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-07-20T12:00:00Z');

function def(partial: Partial<CtaDefinition> & Pick<CtaDefinition, 'cta_id' | 'priority'>): CtaDefinition {
  return {
    variant: 'a',
    group_key: 'consultation',
    title_en: 't', title_vi: 't',
    body_en: 'b', body_vi: 'b',
    cta_label_en: 'go', cta_label_vi: 'đi',
    action: 'book_consultation',
    conditions: {},
    cooldown_days: 7,
    ...partial,
  };
}

// Mirrors the n400_16 seeds.
const SEEDS: CtaDefinition[] = [
  def({ cta_id: 's9_final_review',   priority: 100, conditions: { readiness_ready: true } }),
  def({ cta_id: 's4_interview_soon', priority: 90,  conditions: { interview_within_days: 30 } }),
  def({ cta_id: 's1_mock_ready',     priority: 80,  conditions: { min_mocks: 3, min_avg_pct: 90 } }),
  def({ cta_id: 's5_writing_help',   priority: 70,  conditions: { weakest_section: 'writing', min_sessions: 10 } }),
  def({ cta_id: 's6_speaking_help',  priority: 70,  conditions: { weakest_section: 'speaking', min_sessions: 10 } }),
  def({ cta_id: 's2_consistency',    priority: 60,  conditions: { min_practice_days: 20 } }),
  def({ cta_id: 's3_filing_stalled', priority: 50,  conditions: { journey_stage: 'preparing', stalled_days: 60 } }),
  def({ cta_id: 's7_civics_done',    priority: 40,  group_key: 'education', action: 'start_mock',
        conditions: { all_civics_sections_done: true } }),
];

const NO_SIGNALS: LearningSignals = {
  readinessReady: false,
  mockCount: 0,
  mockAvgPct: null,
  weakestSection: null,
  weakestSectionAttempts: 0,
  practiceDays: 0,
  allCivicsSectionsDone: false,
};

function inputs(partial: Partial<CtaInputs> = {}): CtaInputs {
  return {
    userId: USER,
    definitions: SEEDS,
    signals: NO_SIGNALS,
    events: [],
    journeyStage: null,
    interviewDate: null,
    journeyConfirmedAt: null,
    lastGrowthPromptAt: null,
    consultationBookedAt: null,
    availableActions: new Set(['book_consultation', 'start_mock', 'open_checklist']),
    now: NOW,
    ...partial,
  };
}

function shown(ctaId: string, at: string): CtaEvent { return { type: 'cta_shown', ctaId, group: 'consultation', at }; }
function dismissed(ctaId: string, at: string, group: 'consultation' | 'education' = 'consultation'): CtaEvent {
  return { type: 'cta_dismissed', ctaId, group, at };
}

describe('selectActiveCta — eligibility', () => {
  it('returns null with reason no_eligible when nothing matches', () => {
    const got = selectActiveCta(inputs());
    expect(got.def).toBeNull();
    expect(got.reason).toBe('no_eligible');
    expect(got.eligible).toEqual([]);
  });

  it('matches S9 on readiness and reports it as the winner', () => {
    const got = selectActiveCta(inputs({ signals: { ...NO_SIGNALS, readinessReady: true } }));
    expect(got.def?.cta_id).toBe('s9_final_review');
    expect(got.reason).toBe('priority_s9_final_review');
    expect(got.eligible).toContain('s9_final_review');
  });

  it('matches S4 only when the interview is inside the window', () => {
    expect(selectActiveCta(inputs({ interviewDate: '2026-08-01' })).def?.cta_id).toBe('s4_interview_soon');
    expect(selectActiveCta(inputs({ interviewDate: '2026-12-01' })).def).toBeNull();
  });

  it('matches S1 only when both mock count and average clear the bar', () => {
    const twoGood = { ...NO_SIGNALS, mockCount: 2, mockAvgPct: 95 };
    const threeGood = { ...NO_SIGNALS, mockCount: 3, mockAvgPct: 95 };
    const threeWeak = { ...NO_SIGNALS, mockCount: 3, mockAvgPct: 80 };
    expect(selectActiveCta(inputs({ signals: twoGood })).def).toBeNull();
    expect(selectActiveCta(inputs({ signals: threeWeak })).def).toBeNull();
    expect(selectActiveCta(inputs({ signals: threeGood })).def?.cta_id).toBe('s1_mock_ready');
  });

  it('S1 fires when the mock average equals min_avg_pct exactly', () => {
    const atThreshold = { ...NO_SIGNALS, mockCount: 3, mockAvgPct: 90 };
    expect(selectActiveCta(inputs({ signals: atThreshold })).def?.cta_id).toBe('s1_mock_ready');
  });

  it('maps the speaking sections onto the S6 weakest_section condition', () => {
    const yesno = { ...NO_SIGNALS, weakestSection: 'yesno' as const, weakestSectionAttempts: 12 };
    const writing = { ...NO_SIGNALS, weakestSection: 'writing' as const, weakestSectionAttempts: 12 };
    expect(selectActiveCta(inputs({ signals: yesno })).def?.cta_id).toBe('s6_speaking_help');
    expect(selectActiveCta(inputs({ signals: writing })).def?.cta_id).toBe('s5_writing_help');
  });

  it('holds S5 back until the section has enough graded sessions', () => {
    const few = { ...NO_SIGNALS, weakestSection: 'writing' as const, weakestSectionAttempts: 9 };
    expect(selectActiveCta(inputs({ signals: few })).def).toBeNull();
  });

  it('matches S3 only for a preparing stage that has been stale long enough', () => {
    const stale = { journeyStage: 'preparing' as const, journeyConfirmedAt: '2026-04-01T00:00:00Z' };
    const fresh = { journeyStage: 'preparing' as const, journeyConfirmedAt: '2026-07-01T00:00:00Z' };
    expect(selectActiveCta(inputs(stale)).def?.cta_id).toBe('s3_filing_stalled');
    expect(selectActiveCta(inputs(fresh)).def).toBeNull();
  });
});

describe('selectActiveCta — hard rules (spec §4.1)', () => {
  it('rule 1: at most one growth CTA per 7 days', () => {
    const eligible = { signals: { ...NO_SIGNALS, readinessReady: true } };
    const capped = selectActiveCta(inputs({ ...eligible, lastGrowthPromptAt: '2026-07-18T12:00:00Z' }));
    expect(capped.def).toBeNull();
    expect(capped.reason).toBe('cap_7d_active');
    // The cap does not hide what WAS eligible — the decision log still needs it.
    expect(capped.eligible).toContain('s9_final_review');

    const expired = selectActiveCta(inputs({ ...eligible, lastGrowthPromptAt: '2026-07-01T12:00:00Z' }));
    expect(expired.def?.cta_id).toBe('s9_final_review');
  });

  it('rule 4a: one dismiss snoozes that CTA for its cooldown', () => {
    const eligible = { signals: { ...NO_SIGNALS, readinessReady: true } };
    const justDismissed = selectActiveCta(inputs({
      ...eligible,
      events: [dismissed('s9_final_review', '2026-07-18T12:00:00Z')],
    }));
    expect(justDismissed.def).toBeNull();

    const cooledOff = selectActiveCta(inputs({
      ...eligible,
      events: [dismissed('s9_final_review', '2026-07-01T12:00:00Z')],
    }));
    expect(cooledOff.def?.cta_id).toBe('s9_final_review');
  });

  it('rule 4b: three dismisses mute the whole group for 30 days', () => {
    const events = [
      dismissed('s9_final_review', '2026-07-01T12:00:00Z'),
      dismissed('s1_mock_ready',   '2026-07-05T12:00:00Z'),
      dismissed('s2_consistency',  '2026-07-10T12:00:00Z'),
    ];
    const muted = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, readinessReady: true },
      events,
    }));
    expect(muted.def).toBeNull();
    expect(muted.reason).toBe('group_muted:consultation');

    // The education group is untouched by consultation dismisses.
    const education = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, allCivicsSectionsDone: true },
      events,
    }));
    expect(education.def?.cta_id).toBe('s7_civics_done');
  });

  it('rule 5: a booked consultation retires the consultation group for good', () => {
    const converted = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, readinessReady: true, allCivicsSectionsDone: true },
      consultationBookedAt: '2026-01-01T00:00:00Z',
    }));
    // S9 is gone despite being eligible and highest priority; education remains.
    expect(converted.def?.cta_id).toBe('s7_civics_done');
    expect(converted.eligible).not.toContain('s9_final_review');
  });

  it('rule 7: highest priority wins when several scenarios match', () => {
    const many = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, readinessReady: true, mockCount: 5, mockAvgPct: 95, practiceDays: 30 },
    }));
    expect(many.def?.cta_id).toBe('s9_final_review');
    expect(many.eligible).toEqual(
      expect.arrayContaining(['s9_final_review', 's1_mock_ready', 's2_consistency']),
    );
  });

  it('drops CTAs whose action has no destination yet (G3a: booking not built)', () => {
    const g3a = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, readinessReady: true, allCivicsSectionsDone: true },
      availableActions: new Set(['start_mock']),
    }));
    expect(g3a.def?.cta_id).toBe('s7_civics_done');
    expect(g3a.eligible).not.toContain('s9_final_review');
  });

  it('ignores an earlier impression of the same CTA once its cooldown passed', () => {
    const got = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, readinessReady: true },
      events: [shown('s9_final_review', '2026-06-01T12:00:00Z')],
    }));
    expect(got.def?.cta_id).toBe('s9_final_review');
  });
});
