import { describe, expect, it } from 'vitest';
import { assembleGrowthState } from './growth-state-shape';
import type { ActivePrompt } from './profiling-inputs';
import type { ActiveCta } from './cta-state';

const PROMPT = { questionKey: 'filed', variant: 'a', surface: 'results' } as ActivePrompt;
const CTA = { ctaId: 's7_civics_done', variant: 'a', surface: 'results' } as ActiveCta;

describe('assembleGrowthState', () => {
  it('shows the question when both are available — asking first compounds', () => {
    expect(assembleGrowthState(PROMPT, CTA)).toEqual({ prompt: PROMPT, cta: null });
  });

  it('falls through to the CTA when there is no question', () => {
    expect(assembleGrowthState(null, CTA)).toEqual({ prompt: null, cta: CTA });
  });

  it('renders nothing when neither half has anything', () => {
    expect(assembleGrowthState(null, null)).toEqual({ prompt: null, cta: null });
  });
});
