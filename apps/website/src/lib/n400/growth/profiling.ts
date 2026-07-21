// Progressive-profiling evaluator (spec §3). Pure decision logic: which single
// question is active on a surface, honoring triggers, depends_on chains, and
// the skip → snooze → dashboard fallback. Server actions load the inputs; UI
// only renders the result.
//
// Surface routing (spec §3.2–3.3): 'results' shows never-skipped questions
// (Level 2, the main asking point). A skipped question moves to 'dashboard'
// (Level 1 soft card) once its snooze expires — snooze_days OR
// snooze_sessions distinct active days since the skip, whichever comes first.
// A "session" is an active day, the same currency as the pace engine's buổi.

import { fnv1a } from './flags';

export type PromptSurface = 'results' | 'dashboard';

export interface PromptOption {
  value: string;
  label_en: string;
  label_vi: string;
}

export interface PromptDefinition {
  question_key: string;
  variant: string;
  text_en: string;
  text_vi: string;
  options: PromptOption[];
  trigger: {
    after_event?: 'practice_completed' | 'mock_completed';
    min_count?: number;
    distinct_practice_days?: number;
    immediately_after?: string;
  };
  depends_on: { question_key: string; answer: string } | null;
  snooze_days: number;
  snooze_sessions: number;
  sort_order: number;
}

export interface PromptState {
  question_key: string;
  answered_at: string | null;
  skipped_at: string | null;
  snooze_until: string | null;
}

/** One row per UTC day with graded activity — the n400_graded_day_rollup()
 *  shape, bounded by distinct study days instead of raw event count. */
export interface GradedDay {
  /** 'yyyy-mm-dd' (UTC). */
  day: string;
  practiceCount: number;
  mockCount: number;
  /** ISO timestamp of the newest graded event that day. */
  lastAt: string;
}

export interface ProfilingInputs {
  userId: string;
  definitions: PromptDefinition[];
  states: PromptState[];
  /** question_key → answered value, reconstructed from n400_lead_profiles. */
  answers: Record<string, string>;
  gradedDays: GradedDay[];
  now: Date;
}

/** Shape of the n400_lead_profiles columns the profiling questions write. */
export interface LeadProfileAnswers {
  n400_filed: boolean | null;
  filing_timeline: string | null;
  interview_scheduled: boolean | null;
  interview_date: string | null;
  wants_guidance: string | null;
}

export function answersFromLeadProfile(lp: LeadProfileAnswers | null): Record<string, string> {
  const a: Record<string, string> = {};
  if (!lp) return a;
  if (lp.n400_filed !== null) a.filed = lp.n400_filed ? 'yes' : 'not_yet';
  if (lp.filing_timeline) a.filing_timeline = lp.filing_timeline;
  if (lp.interview_scheduled !== null) a.interview_notice = lp.interview_scheduled ? 'yes' : 'no';
  if (lp.interview_date) a.interview_date = lp.interview_date;
  if (lp.wants_guidance) a.wants_guidance = lp.wants_guidance;
  return a;
}

/** Deterministic A/B assignment — same recipe as flag rollout bucketing. */
export function assignVariant(userId: string, questionKey: string, variants: string[]): string {
  if (variants.length <= 1) return variants[0] ?? 'a';
  const sorted = [...variants].sort();
  return sorted[fnv1a(`${questionKey}:${userId}`) % sorted.length];
}

export interface ActivePromptDecision {
  def: PromptDefinition;
  /** Which conditions the winner satisfied — for logs/debug (the profiling
      cousin of the G3 CTA decision log; nothing persists it in G2). */
  reason: string;
}

export function selectActivePrompt(
  inputs: ProfilingInputs,
  surface: PromptSurface,
): ActivePromptDecision | null {
  const { userId, definitions, states, answers, gradedDays, now } = inputs;
  const stateByKey = new Map(states.map((s) => [s.question_key, s]));

  // One deterministic variant per (user, question); other variants invisible.
  const byKey = new Map<string, PromptDefinition[]>();
  for (const d of definitions) {
    const list = byKey.get(d.question_key) ?? [];
    list.push(d);
    byKey.set(d.question_key, list);
  }
  const candidates: PromptDefinition[] = [];
  for (const [key, variants] of byKey) {
    const pick = assignVariant(userId, key, variants.map((v) => v.variant));
    const chosen = variants.find((v) => v.variant === pick);
    if (chosen) candidates.push(chosen);
  }
  candidates.sort((a, b) => a.sort_order - b.sort_order);

  const eventCount = (type: 'practice_completed' | 'mock_completed') =>
    gradedDays.reduce((n, d) => n + (type === 'practice_completed' ? d.practiceCount : d.mockCount), 0);
  const distinctDays = gradedDays.length;

  for (const def of candidates) {
    if (answers[def.question_key] !== undefined) continue;
    const st = stateByKey.get(def.question_key);
    if (st?.answered_at) continue;

    if (def.depends_on && answers[def.depends_on.question_key] !== def.depends_on.answer) continue;

    const trg = def.trigger;
    if (trg.after_event && eventCount(trg.after_event) < (trg.min_count ?? 1)) continue;
    if (trg.distinct_practice_days && distinctDays < trg.distinct_practice_days) continue;
    if (trg.immediately_after && answers[trg.immediately_after] === undefined) continue;

    const reasons: string[] = [];
    if (trg.after_event) reasons.push(`${trg.after_event}>=${trg.min_count ?? 1}`);
    if (trg.distinct_practice_days) reasons.push(`distinct_practice_days>=${trg.distinct_practice_days}`);
    if (trg.immediately_after) reasons.push(`immediately_after:${trg.immediately_after}`);

    const skipped = Boolean(st?.skipped_at);
    if (surface === 'results') {
      if (skipped) continue;
    } else {
      if (!skipped) continue;
      const snoozeOver =
        !st?.snooze_until || new Date(st.snooze_until).getTime() <= now.getTime();
      const skippedAtMs = new Date(st!.skipped_at!).getTime();
      // max(created_at) that day > skip time ⇔ some graded event that day
      // after the skip — exactly what the old per-event filter computed.
      const activeDaysSinceSkip = gradedDays.filter(
        (d) => new Date(d.lastAt).getTime() > skippedAtMs,
      ).length;
      if (!snoozeOver && activeDaysSinceSkip < def.snooze_sessions) continue;
      reasons.push(snoozeOver ? 'snooze_expired' : `active_days_since_skip>=${def.snooze_sessions}`);
    }
    return { def, reason: reasons.join('+') || 'unconditional' };
  }
  return null;
}
