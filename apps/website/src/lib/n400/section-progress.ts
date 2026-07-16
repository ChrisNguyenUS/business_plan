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

/**
 * Item ids whose LAST graded attempt was correct — the section twin of
 * quiz-engine's masteredQuestionIds, and the app's evidence of "thuộc".
 *
 * Note the deliberate contrast with deriveSectionKnown above: that one is
 * DECK STATE for the flashcard UI ("which cards have I marked?"), so it reads
 * flashcard mode only. This one is MASTERY ("have I actually answered it
 * right?"), so it reads graded modes only, per spec D1 — the same rule
 * lastWrongSectionItemIds below uses. The two answer different questions and
 * must not be swapped for one another.
 */
export function deriveSectionMastered(attempts: readonly SectionAttempt[]): SectionKnown {
  const last: Record<SectionKey, Map<string, boolean>> = {
    whatmean: new Map(),
    yesno: new Map(),
    writing: new Map(),
  };
  for (const a of attempts) {
    if (a.mode !== 'flashcard') last[a.section].set(a.itemId, a.wasCorrect);
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

/**
 * Item ids in one section whose LAST graded attempt is wrong, most recently
 * wrong first. Section twin of quiz-engine's lastWrongQuestionIds — the single
 * source of truth for "câu sai chưa ôn" (spec D1): flashcard self-grades
 * neither create nor clear debt; a later correct graded attempt clears an id,
 * a later wrong one re-opens it.
 */
export function lastWrongSectionItemIds(
  attempts: readonly SectionAttempt[],
  section: SectionKey,
): string[] {
  const last = new Map<string, SectionAttempt>();
  for (const a of attempts) {
    if (a.section !== section || a.mode === 'flashcard') continue;
    last.set(a.itemId, a);
  }
  return [...last.values()]
    .filter((a) => !a.wasCorrect)
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .map((a) => a.itemId);
}
