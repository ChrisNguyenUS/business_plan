'use server';

// Profiling server actions (spec §3): getGrowthState (growth-state.ts) is now
// the ONE read the UI calls; answers/skips here go through the SECURITY
// DEFINER RPCs (n400_21). Flags off → getGrowthState returns null and the
// whole conversation is silent.

import { getAuthedServerClient } from './server-client';
import { selectActivePrompt, type PromptSurface } from './profiling';
import { loadGrowthContext } from './growth-context';
import { loadProfilingInputs, toActivePrompt, type ActivePrompt } from './profiling-inputs';

export type { ActivePrompt } from './profiling-inputs';

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
  // inherits the surface the user is standing on. The RPC just wrote the
  // answer, so the context must be re-read from scratch to see it.
  const ctx = await loadGrowthContext(supabase, user.id);
  const decision = selectActivePrompt(await loadProfilingInputs(supabase, ctx), surface);
  const next =
    decision && decision.def.trigger.immediately_after === questionKey
      ? toActivePrompt(decision, surface)
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
