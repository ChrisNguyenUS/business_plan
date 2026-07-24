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

/** Milliseconds in a day — for calendar-based ignore revisit. */
const DAY_MS = 86_400_000;

/** 'yyyy-mm-dd' in UTC — the same day currency GradedDay.day and the pace
 *  engine already use, so "one ask per day" cannot disagree with "one buổi". */
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Ignore-cooldown windows, measured in distinct active study days ("buổi")
 *  since the question was last shown. A gate (a question others depend_on)
 *  is re-offered sooner because ignoring it freezes its whole subtree. */
export const GATE_IGNORE_ACTIVE_DAYS = 3;
export const LEAF_IGNORE_ACTIVE_DAYS = 10;
/** After this many impressions a gate stops being eager and uses the leaf
 *  cadence, so a chronic ignorer is not asked forever on the short window.
 *
 *  INVARIANT: shown_count counts impressions on BOTH surfaces, but only
 *  results-surface impressions can ever reach this check — a dashboard
 *  impression implies skipped_at is set, and the results arm `continue`s on
 *  skip before getting here. If a future feature ever CLEARS skipped_at
 *  (admin reset, "re-ask after a long snooze"), a question's accumulated
 *  dashboard impressions would make it instantly chronic; that feature must
 *  split the counter per surface (n400_growth_events.prompt_shown carries
 *  the surface) rather than lean on this column. */
export const CHRONIC_IGNORE_LIMIT = 4;
/** Absolute revisit ceiling for BOTH tiers: an inactive user is re-asked after
 *  this many calendar days regardless of active-day count — the situation may
 *  have moved on even though they never studied. */
export const IGNORE_CALENDAR_DAYS = 30;

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
  /** Impression counter — incremented once per time the card is shown
      (n400_mark_prompt_shown). Proxy for "how many times ignored". */
  shown_count: number;
  /** ISO timestamp of the most recent impression, or null if never shown. */
  last_shown_at: string | null;
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

  // A question is a "gate" if any other definition depends on it.
  const gateKeys = new Set<string>();
  for (const d of definitions) if (d.depends_on) gateKeys.add(d.depends_on.question_key);

  // At most one profiling ask per day — conversation, not interrogation.
  // Profiling has no global cap of its own (last_growth_prompt_at is the CTA's),
  // and the ignore cooldown below yields to the NEXT candidate the moment a
  // question has been shown, so without this a user with several sessions in one
  // day would be walked through the whole survey back to back.
  // Only an ignored impression (unanswered AND unskipped) spends the day's ask:
  // an answer is engagement — the interview_notice → interview_date follow-up
  // re-evaluates this surface seconds later and must still chain — and a skipped
  // question's impressions belong to the dashboard surface.
  if (surface === 'results') {
    const today = utcDay(now.getTime());
    const askedToday = states.some(
      (s) =>
        s.last_shown_at &&
        !s.answered_at &&
        !s.skipped_at &&
        utcDay(new Date(s.last_shown_at).getTime()) === today,
    );
    if (askedToday) return null;
  }

  const eventCount = (type: 'practice_completed' | 'mock_completed') =>
    gradedDays.reduce((n, d) => n + (type === 'practice_completed' ? d.practiceCount : d.mockCount), 0);
  const distinctDays = gradedDays.length;

  // Parse each graded day's newest-event timestamp ONCE. Both per-candidate
  // scans below (ignore cooldown, skip snooze) walk this list, and the rollup
  // is unbounded — it returns every day the user has ever studied.
  const gradedAtMs = gradedDays.map((d) => new Date(d.lastAt).getTime());
  /** Distinct active study days ("buổi") whose newest graded event is after
   *  `sinceMs` — the currency both cooldowns are measured in. */
  const activeDaysSince = (sinceMs: number) => gradedAtMs.filter((t) => t > sinceMs).length;

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
      // Ignored (shown, never answered/skipped): yield to the next candidate
      // until the tier's revisit window elapses. Explicit skip above wins first.
      if (st?.last_shown_at) {
        const lastShownMs = new Date(st.last_shown_at).getTime();
        const activeDaysSinceShown = activeDaysSince(lastShownMs);
        const chronic = (st.shown_count ?? 0) >= CHRONIC_IGNORE_LIMIT;
        const needDays = gateKeys.has(def.question_key) && !chronic
          ? GATE_IGNORE_ACTIVE_DAYS
          : LEAF_IGNORE_ACTIVE_DAYS;
        const activeReached = activeDaysSinceShown >= needDays;
        const calendarReached =
          (now.getTime() - lastShownMs) / DAY_MS >= IGNORE_CALENDAR_DAYS;
        if (!activeReached && !calendarReached) continue;
        reasons.push(activeReached ? `ignore_revisit_active>=${needDays}` : 'ignore_revisit_calendar');
      }
    } else {
      if (!skipped) continue;
      const snoozeOver =
        !st?.snooze_until || new Date(st.snooze_until).getTime() <= now.getTime();
      const skippedAtMs = new Date(st!.skipped_at!).getTime();
      // max(created_at) that day > skip time ⇔ some graded event that day
      // after the skip — exactly what the old per-event filter computed.
      const activeDaysSinceSkip = activeDaysSince(skippedAtMs);
      if (!snoozeOver && activeDaysSinceSkip < def.snooze_sessions) continue;
      reasons.push(snoozeOver ? 'snooze_expired' : `active_days_since_skip>=${def.snooze_sessions}`);
    }
    return { def, reason: reasons.join('+') || 'unconditional' };
  }
  return null;
}
