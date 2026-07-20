// CTA engine evaluator (spec §4). Pure decision logic: which single CTA — if
// any — a user should see right now, plus the reason and the full eligible
// set, both of which go straight into n400_cta_decision_log so "why did this
// user see nothing?" is one query (spec §1.5b).
//
// The seven hard rules of §4.1 are deliberately evaluated in a fixed order:
// global gates first (converted → group mute → 7-day cap), then per-CTA
// eligibility, then per-CTA cooldown, then priority. Order matters for the
// REASON string more than for the outcome — a capped user and a muted user
// look identical from the outside, and telling them apart is the whole point
// of the log.
//
// Escalation ladder (§4.1 rule 6) is not separate code: it is encoded in the
// seeded `priority` column plus each scenario's conditions, exactly as §4.1
// rule 7 describes. Do not add a second ordering mechanism.

import type { LearningSignals } from './learning-signals';
import type { SectionKey } from '../section-progress';

export type CtaAction = 'book_consultation' | 'open_checklist' | 'start_mock';
export type CtaGroup = 'consultation' | 'education';

export interface CtaDefinition {
  cta_id: string;
  variant: string;
  group_key: CtaGroup;
  title_en: string; title_vi: string;
  body_en: string;  body_vi: string;
  cta_label_en: string; cta_label_vi: string;
  action: CtaAction;
  conditions: {
    readiness_ready?: boolean;
    interview_within_days?: number;
    min_mocks?: number;
    min_avg_pct?: number;
    weakest_section?: 'writing' | 'speaking';
    min_sessions?: number;
    min_practice_days?: number;
    journey_stage?: string;
    stalled_days?: number;
    all_civics_sections_done?: boolean;
  };
  priority: number;
  cooldown_days: number;
}

export interface CtaEvent {
  type: 'cta_shown' | 'cta_dismissed' | 'cta_clicked';
  ctaId: string;
  group: CtaGroup;
  at: string;
}

export interface CtaInputs {
  userId: string;
  definitions: CtaDefinition[];
  signals: LearningSignals;
  events: CtaEvent[];
  journeyStage: string | null;
  /** ISO date (yyyy-mm-dd). */
  interviewDate: string | null;
  /** When the user last confirmed anything about their journey — the clock
      S3's `stalled_days` runs against. */
  journeyConfirmedAt: string | null;
  lastGrowthPromptAt: string | null;
  consultationBookedAt: string | null;
  /** Actions with a destination that exists in this build. G3a ships only
      `start_mock`; G3b adds `book_consultation`, G3c adds `open_checklist`. */
  availableActions: Set<CtaAction>;
  now: Date;
}

export interface CtaDecision {
  def: CtaDefinition | null;
  /** Mirrors n400_cta_decision_log.reason. */
  reason: string;
  /** Everything that passed scenario conditions, before the global gates —
      this is what makes the log answer "eligible but suppressed". */
  eligible: string[];
}

const DAY_MS = 86_400_000;

/** §4.1 rule 1. Seeded value; a param only in the sense that the cap is the
    same for every CTA, so it does not belong in per-row conditions. */
export const GLOBAL_CAP_DAYS = 7;
/** §4.1 rule 4: dismiss this many times → mute the group. */
export const GROUP_MUTE_DISMISSALS = 3;
/** §4.1 rule 4: for this many days. */
export const GROUP_MUTE_DAYS = 30;

function daysBetween(from: string, now: Date): number {
  return (now.getTime() - new Date(from).getTime()) / DAY_MS;
}

/** The seeds say "speaking", the app has two speaking sections. */
function sectionMatches(condition: 'writing' | 'speaking', section: SectionKey): boolean {
  return condition === 'writing' ? section === 'writing' : section === 'yesno' || section === 'whatmean';
}

function meetsConditions(def: CtaDefinition, i: CtaInputs): boolean {
  const c = def.conditions;
  const s = i.signals;

  if (c.readiness_ready === true && !s.readinessReady) return false;

  if (c.interview_within_days !== undefined) {
    if (!i.interviewDate) return false;
    const days = (new Date(i.interviewDate).getTime() - i.now.getTime()) / DAY_MS;
    if (days < 0 || days > c.interview_within_days) return false;
  }

  if (c.min_mocks !== undefined && s.mockCount < c.min_mocks) return false;
  if (c.min_avg_pct !== undefined && (s.mockAvgPct === null || s.mockAvgPct <= c.min_avg_pct)) return false;

  if (c.weakest_section !== undefined) {
    if (!s.weakestSection || !sectionMatches(c.weakest_section, s.weakestSection)) return false;
    if (s.weakestSectionAttempts < (c.min_sessions ?? 0)) return false;
  }

  if (c.min_practice_days !== undefined && s.practiceDays < c.min_practice_days) return false;

  if (c.journey_stage !== undefined) {
    if (i.journeyStage !== c.journey_stage) return false;
    if (c.stalled_days !== undefined) {
      if (!i.journeyConfirmedAt) return false;
      if (daysBetween(i.journeyConfirmedAt, i.now) < c.stalled_days) return false;
    }
  }

  if (c.all_civics_sections_done === true && !s.allCivicsSectionsDone) return false;

  return true;
}

export function selectActiveCta(inputs: CtaInputs): CtaDecision {
  const { definitions, events, now } = inputs;

  // §4.1 rule 5 — a converted lead never sees a consultation CTA again.
  const consultationRetired = Boolean(inputs.consultationBookedAt);

  // §4.1 rule 4b — group mute. Counted over the mute window, so the mute
  // eventually lifts on its own rather than being permanent.
  const mutedGroups = new Set<CtaGroup>();
  for (const group of ['consultation', 'education'] as const) {
    const recent = events.filter(
      (e) => e.type === 'cta_dismissed' && e.group === group && daysBetween(e.at, now) <= GROUP_MUTE_DAYS,
    );
    if (recent.length >= GROUP_MUTE_DISMISSALS) mutedGroups.add(group);
  }

  const eligible: CtaDefinition[] = [];
  for (const def of definitions) {
    if (!inputs.availableActions.has(def.action)) continue;
    if (consultationRetired && def.group_key === 'consultation') continue;
    if (!meetsConditions(def, inputs)) continue;
    eligible.push(def);
  }
  eligible.sort((a, b) => b.priority - a.priority);
  const eligibleIds = eligible.map((d) => d.cta_id);

  if (eligible.length === 0) return { def: null, reason: 'no_eligible', eligible: [] };

  // §4.1 rule 1 — the global cap. Checked AFTER eligibility so the log can say
  // "these were ready, the cap held them".
  if (
    inputs.lastGrowthPromptAt &&
    daysBetween(inputs.lastGrowthPromptAt, now) < GLOBAL_CAP_DAYS
  ) {
    return { def: null, reason: 'cap_7d_active', eligible: eligibleIds };
  }

  const survivors = eligible.filter((def) => {
    if (mutedGroups.has(def.group_key)) return false;
    // §4.1 rule 4a — one dismiss snoozes that CTA for its own cooldown.
    const lastDismiss = events
      .filter((e) => e.type === 'cta_dismissed' && e.ctaId === def.cta_id)
      .map((e) => e.at)
      .sort()
      .pop();
    if (lastDismiss && daysBetween(lastDismiss, now) < def.cooldown_days) return false;
    return true;
  });

  if (survivors.length === 0) {
    const muted = eligible.find((d) => mutedGroups.has(d.group_key));
    return {
      def: null,
      reason: muted ? `group_muted:${muted.group_key}` : 'cooldown_active',
      eligible: eligibleIds,
    };
  }

  // §4.1 rule 7 — priority order (already sorted).
  const winner = survivors[0];
  return { def: winner, reason: `priority_${winner.cta_id}`, eligible: eligibleIds };
}
