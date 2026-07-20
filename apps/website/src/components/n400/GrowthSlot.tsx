'use client';

// Self-contained mount point for the whole growth surface: one server read
// (getGrowthState) returns at most one thing to render — a profiling question
// or a CTA. Host screens add one line; flags off → renders null, zero layout
// impact.

import { useEffect, useState } from 'react';
import { getGrowthState } from '@/lib/n400/growth/growth-state';
import type { GrowthState } from '@/lib/n400/growth/growth-state-shape';
import type { PromptSurface } from '@/lib/n400/growth/profiling';
import { GrowthPromptCard } from './GrowthPromptCard';
import { GrowthCtaCard } from './GrowthCtaCard';

export function GrowthSlot({ surface }: { surface: PromptSurface }) {
  const [state, setState] = useState<GrowthState | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGrowthState(surface)
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(() => {
        // Growth UI is best-effort — never break a learning screen over it.
      });
    return () => {
      cancelled = true;
    };
  }, [surface]);

  if (state?.prompt) {
    return (
      <GrowthPromptCard
        prompt={state.prompt}
        onDone={() => setState({ prompt: null, cta: null })}
      />
    );
  }
  if (state?.cta) {
    return (
      <GrowthCtaCard
        cta={state.cta}
        onDone={() => setState({ prompt: null, cta: null })}
      />
    );
  }
  return null;
}
