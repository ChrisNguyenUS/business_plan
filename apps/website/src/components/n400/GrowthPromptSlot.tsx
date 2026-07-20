'use client';

// Self-contained mount point: fetches the active question for its surface and
// renders the card or nothing. Host screens add one line; flags off (or no
// eligible question) → renders null, zero layout impact.

import { useEffect, useState } from 'react';
import { getActivePrompt, type ActivePrompt } from '@/lib/n400/growth/prompt-actions';
import type { PromptSurface } from '@/lib/n400/growth/profiling';
import { GrowthPromptCard } from './GrowthPromptCard';

export function GrowthPromptSlot({ surface }: { surface: PromptSurface }) {
  const [prompt, setPrompt] = useState<ActivePrompt | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActivePrompt(surface)
      .then((p) => {
        if (!cancelled) setPrompt(p);
      })
      .catch(() => {
        // Growth UI is best-effort — never break a learning screen over it.
      });
    return () => {
      cancelled = true;
    };
  }, [surface]);

  if (!prompt) return null;
  return <GrowthPromptCard prompt={prompt} onDone={() => setPrompt(null)} />;
}
