'use server';

// CTA funnel writes (spec §4). Thin wrappers over the n400_24 RPCs — all the
// deciding happened in cta.ts; these only record what the user did.

import { getAuthedServerClient } from './server-client';
import type { PromptSurface } from './profiling';

/**
 * Call ONLY from a rendered card. This stamps the 7-day cap, so invoking it
 * from the evaluation path would let a CTA the user never saw consume the
 * week. The decision itself was already logged at evaluation time by
 * loadCtaState — this records the impression, not the decision.
 */
export async function markCtaShown(
  ctaId: string,
  variant: string,
  surface: PromptSurface,
): Promise<void> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return;
  await supabase.rpc('n400_mark_cta_shown', {
    p_cta_id: ctaId,
    p_variant: variant,
    p_surface: surface,
  });
}

export async function dismissCta(
  ctaId: string,
  variant: string,
  surface: PromptSurface,
): Promise<{ ok: boolean }> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false };
  const { error } = await supabase.rpc('n400_dismiss_cta', {
    p_cta_id: ctaId, p_variant: variant, p_surface: surface,
  });
  return { ok: !error };
}

export async function clickCta(
  ctaId: string,
  variant: string,
  surface: PromptSurface,
): Promise<{ ok: boolean }> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false };
  const { error } = await supabase.rpc('n400_click_cta', {
    p_cta_id: ctaId, p_variant: variant, p_surface: surface,
  });
  return { ok: !error };
}
