// CTA half of the growth state. Owns exactly one decision: which CTA, if any,
// this surface should show — and carries the decision trail the impression RPC
// needs for n400_cta_decision_log.

import type { SupabaseClient } from '@supabase/supabase-js';
import { selectActiveCta, type CtaAction, type CtaDefinition, type CtaGroup } from './cta';
import { loadLearningSignals } from './learning-signals';
import type { PromptSurface } from './profiling';
import type { GrowthContext } from './growth-context';
import type { N400Dict } from '../i18n/vi';

export interface ActiveCta {
  ctaId: string;
  variant: string;
  surface: PromptSurface;
  groupKey: CtaGroup;
  titleEn: string; titleVi: string;
  bodyEn: string;  bodyVi: string;
  labelEn: string; labelVi: string;
  action: CtaAction;
}

export async function loadCtaState(
  supabase: SupabaseClient,
  ctx: GrowthContext,
  surface: PromptSurface,
  availableActions: Set<CtaAction>,
  dict: N400Dict,
): Promise<ActiveCta | null> {
  const [defsRes, signals] = await Promise.all([
    supabase
      .from('n400_cta_definitions')
      .select('cta_id, variant, group_key, title_en, title_vi, body_en, body_vi, cta_label_en, cta_label_vi, action, conditions, priority, cooldown_days')
      .eq('enabled', true),
    loadLearningSignals(supabase, ctx.userId, dict, ctx.gradedEvents),
  ]);

  // S3 asks "how long has this stage been stale?" — the newest profiling
  // answer is when the user last confirmed anything about their journey.
  const journeyConfirmedAt = ctx.promptStates
    .map((s) => s.answered_at)
    .filter((a): a is string => Boolean(a))
    .sort()
    .pop() ?? null;

  const decision = selectActiveCta({
    userId: ctx.userId,
    definitions: (defsRes.data ?? []) as CtaDefinition[],
    signals,
    events: ctx.ctaEvents,
    journeyStage: ctx.leadProfile?.journey_stage ?? null,
    interviewDate: ctx.leadProfile?.interview_date ?? null,
    journeyConfirmedAt,
    lastGrowthPromptAt: ctx.leadProfile?.last_growth_prompt_at ?? null,
    consultationBookedAt: ctx.leadProfile?.consultation_booked_at ?? null,
    availableActions,
    now: ctx.now,
  });

  // Spec §1.5b: log EVERY evaluation, including the ones that show nothing —
  // "why did this user see nothing?" is the question this table exists to
  // answer, so the no-show runs are the valuable rows. Awaited rather than
  // fired-and-forgotten: a serverless function can freeze the moment the
  // response is returned, and a debug trail with holes in it is worse than
  // none. One insert; the n400_24 GC trigger keeps the table bounded.
  // Caught: a debug-log write failing (e.g. a network blip) must never take
  // down the actual CTA decision alongside it, or the prompt half running in
  // the same Promise.all in getGrowthState.
  try {
    await supabase.rpc('n400_log_cta_decision', {
      p_eligible_ctas: decision.eligible,
      p_selected_cta: decision.def?.cta_id ?? null,
      p_reason: decision.reason,
    });
  } catch {
    // Best-effort debug trail — never break a learning screen over it.
  }

  if (!decision.def) return null;
  const d = decision.def;
  return {
    ctaId: d.cta_id, variant: d.variant, surface,
    groupKey: d.group_key,
    titleEn: d.title_en, titleVi: d.title_vi,
    bodyEn: d.body_en,  bodyVi: d.body_vi,
    labelEn: d.cta_label_en, labelVi: d.cta_label_vi,
    action: d.action,
  };
}
