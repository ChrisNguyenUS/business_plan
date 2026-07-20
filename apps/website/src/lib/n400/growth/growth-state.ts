'use server';

// The one growth read the UI makes (spec §1.7) — and nothing more. This file
// orchestrates: check flags, load the shared context, run each half's loader,
// assemble. It must NOT grow query logic.
//
// Adding a phase = adding a loader module + one line here. G3b (booking),
// G3c (checklist) and G4 (recommendation, lead status) all land this way. If
// this file starts holding .from(...) calls again, the decomposition has been
// undone — put the query in a loader.

import { getAuthedServerClient } from './server-client';
import { isFeatureOn, loadFeatureFlags, type FeatureFlag } from './flags';
import { loadGrowthContext } from './growth-context';
import { loadPromptState } from './prompt-state';
import { loadCtaState } from './cta-state';
import { assembleGrowthState, type GrowthState } from './growth-state-shape';
import type { CtaAction } from './cta';
import type { PromptSurface } from './profiling';
import { vi } from '../i18n/vi';

export type { GrowthState } from './growth-state-shape';

const EMPTY: GrowthState = { prompt: null, cta: null };

/** Actions with a real destination in this build. G3b appends
    'book_consultation', G3c appends 'open_checklist'. */
function availableActions(flags: Map<string, FeatureFlag>, userId: string): Set<CtaAction> {
  const actions = new Set<CtaAction>(['start_mock']);
  if (isFeatureOn(flags.get('booking_form'), userId)) actions.add('book_consultation');
  if (isFeatureOn(flags.get('filing_checklist'), userId)) actions.add('open_checklist');
  return actions;
}

// The server always sources its own dict (Vietnamese) here rather than taking
// one from the caller: vi.ts is ~48KB, and passing it from a client component
// into this 'use server' action would serialize the whole dict over the wire
// on every mount. deriveReadiness only uses dict for criterion label strings,
// none of which this path renders (only readiness.ready is consumed) — so a
// language-fixed dict here is safe, not a hidden i18n regression.
export async function getGrowthState(surface: PromptSurface): Promise<GrowthState> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return EMPTY;

  const flags = await loadFeatureFlags(supabase, [
    'growth_engine', 'profiling', 'cta_engine', 'booking_form', 'filing_checklist',
  ]);

  if (!isFeatureOn(flags.get('growth_engine'), user.id)) return EMPTY;
  const profilingOn = isFeatureOn(flags.get('profiling'), user.id);
  const ctaOn = isFeatureOn(flags.get('cta_engine'), user.id);
  if (!profilingOn && !ctaOn) return EMPTY;

  const ctx = await loadGrowthContext(supabase, user.id);

  // The two halves are independent once the context exists — run them together.
  const [prompt, cta] = await Promise.all([
    profilingOn ? loadPromptState(supabase, ctx, surface) : Promise.resolve(null),
    ctaOn
      ? loadCtaState(supabase, ctx, surface, availableActions(flags, user.id), vi)
      : Promise.resolve(null),
  ]);

  return assembleGrowthState(prompt, cta);
}
