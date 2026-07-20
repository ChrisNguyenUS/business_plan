// The GrowthState shape and its assembly rule — kept OUT of growth-state.ts
// because that file is 'use server', and Next.js requires every export of a
// 'use server' module to be an async function. assembleGrowthState is a pure
// synchronous function, so it (and the type it returns) live here instead.

import type { ActivePrompt } from './profiling-inputs';
import type { ActiveCta } from './cta-state';

export interface GrowthState {
  prompt: ActivePrompt | null;
  cta: ActiveCta | null;
}

/**
 * One question OR one CTA, never both (spec §4.1 rule 2 in spirit: one ask per
 * screen). The question wins — a profiling answer makes every later CTA
 * decision better, so asking first compounds.
 *
 * Pure on purpose: this is the precedence rule, and it is the thing most
 * likely to change when G3b/G3c add surfaces. Keeping it out of the I/O path
 * is what makes it testable.
 */
export function assembleGrowthState(
  prompt: ActivePrompt | null,
  cta: ActiveCta | null,
): GrowthState {
  return prompt ? { prompt, cta: null } : { prompt: null, cta };
}
