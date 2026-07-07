// Pure types + derivations for the Speaking/Writing study sections.
// Mirrors the civics pattern: "known" is derived from the LAST flashcard-mode
// attempt per item (so toggling known→unknown actually unmarks), and is never
// stored directly. Persistence lives in n400_section_attempts (user-state.tsx).

import type { QuizMode } from './storage';

export type SectionKey = 'whatmean' | 'yesno' | 'writing';

export const SECTION_KEYS: SectionKey[] = ['whatmean', 'yesno', 'writing'];

export interface SectionAttempt {
  section: SectionKey;
  itemId: string; // 'wm-<n>' | 'yn-<n>' | 'wr-<n>'
  wasCorrect: boolean;
  mode: QuizMode;
  at: string; // ISO datetime
}

export type SectionKnown = Record<SectionKey, string[]>;

export function deriveSectionKnown(attempts: SectionAttempt[]): SectionKnown {
  const last: Record<SectionKey, Map<string, boolean>> = {
    whatmean: new Map(),
    yesno: new Map(),
    writing: new Map(),
  };
  for (const a of attempts) {
    if (a.mode === 'flashcard') last[a.section].set(a.itemId, a.wasCorrect);
  }
  const out = {} as SectionKnown;
  for (const key of SECTION_KEYS) {
    out[key] = [...last[key].entries()].filter(([, ok]) => ok).map(([id]) => id);
  }
  return out;
}

export function deriveSectionSeen(attempts: SectionAttempt[]): Record<SectionKey, Set<string>> {
  const out: Record<SectionKey, Set<string>> = {
    whatmean: new Set(),
    yesno: new Set(),
    writing: new Set(),
  };
  for (const a of attempts) out[a.section].add(a.itemId);
  return out;
}
