// Shared read layer for the growth state. Every table BOTH the prompt half and
// the CTA half touch is fetched here, exactly once per page.
//
// Adding a phase means adding a loader that consumes this context — not
// another round of the same queries. If a new loader needs a table nothing
// else reads, it fetches that table itself; only genuinely shared rows belong
// here.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GradedDay, PromptState } from './profiling';
import type { CtaEvent } from './cta';
import type { LeadProfileAnswers } from './profiling';

export interface GrowthContext {
  userId: string;
  /** The profiling answer columns + the CTA gating columns, one row, one read. */
  leadProfile:
    | (LeadProfileAnswers & {
        journey_stage: string | null;
        last_growth_prompt_at: string | null;
        consultation_booked_at: string | null;
      })
    | null;
  /** One row per UTC day with graded activity, from n400_graded_day_rollup()
   *  — prompt triggers AND S2 practice days, bounded by distinct study days
   *  instead of the PostgREST 1000-row cap on raw events. */
  gradedDays: GradedDay[];
  /** cta_shown / cta_dismissed / cta_clicked — cooldowns, mutes, funnel. */
  ctaEvents: CtaEvent[];
  /** Per-question prompt state; also carries S3's "journey last confirmed" clock. */
  promptStates: PromptState[];
  now: Date;
}

export async function loadGrowthContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<GrowthContext> {
  // Explicit user_id filters everywhere — RLS is not a scope on these tables:
  // admins can read every row, which silently breaks maybeSingle() and
  // inflates event counts. (Learned the hard way in the G2 post-review fix.)
  const [leadRes, eventsRes, statesRes, rollupRes] = await Promise.all([
    supabase
      .from('n400_lead_profiles')
      .select('n400_filed, filing_timeline, interview_scheduled, interview_date, wants_guidance, journey_stage, last_growth_prompt_at, consultation_booked_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('n400_growth_events')
      .select('event_type, payload, created_at')
      .eq('user_id', userId)
      .in('event_type', ['cta_shown', 'cta_dismissed', 'cta_clicked']),
    supabase
      .from('n400_profile_prompts')
      .select('question_key, answered_at, skipped_at, snooze_until, shown_count, last_shown_at')
      .eq('user_id', userId),
    supabase.rpc('n400_graded_day_rollup'),
  ]);

  if (rollupRes.error) console.error('n400_graded_day_rollup error:', rollupRes.error);

  const rows = (eventsRes.data ?? []) as {
    event_type: string;
    payload: { cta_id?: string; group?: string } | null;
    created_at: string;
  }[];

  const gradedDays: GradedDay[] = ((rollupRes.data ?? []) as {
    day: string; practice_count: number; mock_count: number; last_at: string;
  }[]).map((r) => ({
    day: r.day, practiceCount: r.practice_count, mockCount: r.mock_count, lastAt: r.last_at,
  }));

  const ctaEvents: CtaEvent[] = rows
    .filter((e) => e.event_type.startsWith('cta_'))
    .map((e) => ({
      type: e.event_type as CtaEvent['type'],
      ctaId: e.payload?.cta_id ?? '',
      group: (e.payload?.group ?? 'consultation') as CtaEvent['group'],
      at: e.created_at,
    }));

  return {
    userId,
    leadProfile: (leadRes.data ?? null) as GrowthContext['leadProfile'],
    gradedDays,
    ctaEvents,
    promptStates: (statesRes.data ?? []) as PromptState[],
    now: new Date(),
  };
}
