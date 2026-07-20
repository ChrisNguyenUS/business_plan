'use server';

// Profiling server actions (spec §3): getActivePrompt is the ONE read the UI
// calls; answers/skips go through the SECURITY DEFINER RPCs (n400_21). Flags
// off → getActivePrompt returns null and the whole conversation is silent.

import { getAuthedServerClient } from './server-client';
import { isFeatureOn, type FeatureFlag } from './flags';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  answersFromLeadProfile,
  selectActivePrompt,
  type ActivePromptDecision,
  type GradedEvent,
  type LeadProfileAnswers,
  type ProfilingInputs,
  type PromptDefinition,
  type PromptOption,
  type PromptState,
  type PromptSurface,
} from './profiling';

export interface ActivePrompt {
  questionKey: string;
  variant: string;
  /** The surface this question was selected for — echoed back on answer/skip
      so every funnel event is tagged without the card re-stating it. */
  surface: PromptSurface;
  textEn: string;
  textVi: string;
  options: PromptOption[];
  /** interview_date renders a date input instead of option pills. */
  isDate: boolean;
  /** Why this question won — debug only, never rendered. */
  reason: string;
}

function toActive(decision: ActivePromptDecision, surface: PromptSurface): ActivePrompt {
  const { def, reason } = decision;
  return {
    questionKey: def.question_key,
    variant: def.variant,
    surface,
    textEn: def.text_en,
    textVi: def.text_vi,
    options: def.options,
    isDate: def.question_key === 'interview_date',
    reason,
  };
}

async function profilingEnabled(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('n400_feature_flags')
    .select('flag_key, enabled, rollout_pct')
    .in('flag_key', ['growth_engine', 'profiling']);
  const flags = new Map((data ?? []).map((f: FeatureFlag) => [f.flag_key, f]));
  return (
    isFeatureOn(flags.get('growth_engine'), userId) &&
    isFeatureOn(flags.get('profiling'), userId)
  );
}

async function loadInputs(supabase: SupabaseClient, user: User): Promise<ProfilingInputs> {
  const [defsRes, statesRes, leadRes, eventsRes] = await Promise.all([
    supabase
      .from('n400_prompt_definitions')
      .select('question_key, variant, text_en, text_vi, options, trigger, depends_on, snooze_days, snooze_sessions, sort_order')
      .eq('enabled', true),
    supabase
      .from('n400_profile_prompts')
      .select('question_key, answered_at, skipped_at, snooze_until'),
    supabase
      .from('n400_lead_profiles')
      .select('n400_filed, filing_timeline, interview_scheduled, interview_date, wants_guidance')
      .maybeSingle(),
    // TODO(scale): per-answer envelope events grow with usage; switch to a
    // count RPC if this fetch gets heavy.
    supabase
      .from('n400_growth_events')
      .select('event_type, created_at')
      .in('event_type', ['practice_completed', 'mock_completed']),
  ]);
  return {
    userId: user.id,
    definitions: (defsRes.data ?? []) as PromptDefinition[],
    states: (statesRes.data ?? []) as PromptState[],
    answers: answersFromLeadProfile((leadRes.data ?? null) as LeadProfileAnswers | null),
    gradedEvents: ((eventsRes.data ?? []) as { event_type: string; created_at: string }[]).map(
      (e) => ({ type: e.event_type as GradedEvent['type'], at: e.created_at }),
    ),
    now: new Date(),
  };
}

export async function getActivePrompt(surface: PromptSurface): Promise<ActivePrompt | null> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return null;
  if (!(await profilingEnabled(supabase, user.id))) return null;
  const decision = selectActivePrompt(await loadInputs(supabase, user), surface);
  return decision ? toActive(decision, surface) : null;
}

export async function answerProfilePrompt(
  questionKey: string,
  variant: string,
  answer: string,
  surface: PromptSurface,
): Promise<{ ok: boolean; next: ActivePrompt | null }> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false, next: null };
  const { error } = await supabase.rpc('n400_answer_profile_prompt', {
    p_question_key: questionKey,
    p_answer: answer,
    p_variant: variant,
    p_surface: surface,
  });
  if (error) return { ok: false, next: null };
  // Chain ONLY the spec's "ask ④ right after ③ = yes" case — one question at
  // a time everywhere else (conversation, not interrogation). The follow-up
  // inherits the surface the user is standing on.
  const decision = selectActivePrompt(await loadInputs(supabase, user), surface);
  const next =
    decision && decision.def.trigger.immediately_after === questionKey
      ? toActive(decision, surface)
      : null;
  return { ok: true, next };
}

export async function skipProfilePrompt(
  questionKey: string,
  variant: string,
  surface: PromptSurface,
): Promise<{ ok: boolean }> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false };
  const { error } = await supabase.rpc('n400_skip_profile_prompt', {
    p_question_key: questionKey,
    p_variant: variant,
    p_surface: surface,
  });
  return { ok: !error };
}

export async function markPromptShown(
  questionKey: string,
  variant: string,
  surface: PromptSurface,
): Promise<void> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return;
  await supabase.rpc('n400_mark_prompt_shown', {
    p_question_key: questionKey,
    p_variant: variant,
    p_surface: surface,
  });
}
