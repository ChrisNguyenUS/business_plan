// Builds the profiling evaluator's inputs from the shared growth context, and
// shapes its decision into the UI-facing ActivePrompt. Split out of
// prompt-actions.ts because that file is 'use server' — every export there
// must be an async function, and toActivePrompt is synchronous.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  answersFromLeadProfile,
  type ActivePromptDecision,
  type ProfilingInputs,
  type PromptDefinition,
  type PromptOption,
  type PromptSurface,
} from './profiling';
import type { GrowthContext } from './growth-context';

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

export async function loadProfilingInputs(
  supabase: SupabaseClient,
  ctx: GrowthContext,
): Promise<ProfilingInputs> {
  const { data } = await supabase
    .from('n400_prompt_definitions')
    .select('question_key, variant, text_en, text_vi, options, trigger, depends_on, snooze_days, snooze_sessions, sort_order')
    .eq('enabled', true);
  return {
    userId: ctx.userId,
    definitions: (data ?? []) as PromptDefinition[],
    states: ctx.promptStates,
    answers: answersFromLeadProfile(ctx.leadProfile),
    gradedDays: ctx.gradedDays,
    now: ctx.now,
  };
}

export function toActivePrompt(decision: ActivePromptDecision, surface: PromptSurface): ActivePrompt {
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
