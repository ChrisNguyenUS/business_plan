// Prompt half of the growth state. Owns exactly one decision: which profiling
// question, if any, this surface should show.

import type { SupabaseClient } from '@supabase/supabase-js';
import { selectActivePrompt, type PromptSurface } from './profiling';
import { loadProfilingInputs, toActivePrompt, type ActivePrompt } from './profiling-inputs';
import type { GrowthContext } from './growth-context';

export async function loadPromptState(
  supabase: SupabaseClient,
  ctx: GrowthContext,
  surface: PromptSurface,
): Promise<ActivePrompt | null> {
  const decision = selectActivePrompt(await loadProfilingInputs(supabase, ctx), surface);
  return decision ? toActivePrompt(decision, surface) : null;
}
