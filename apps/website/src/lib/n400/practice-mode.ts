'use client';

// Study hubs remember the learner's last-picked practice mode per skill, so the
// Practice card can show a "current mode" up front instead of asking every time.
// This is a UI preference (not learning progress), so it lives in localStorage
// keyed by skill — no DB round-trip, no migration. Reads go through
// useSyncExternalStore so the value hydrates on mount and stays in sync across
// hook instances (and browser tabs) without a setState-in-effect.

import { useCallback, useSyncExternalStore } from 'react';

export type PracticeSkillKey = 'civics' | 'whatmean' | 'yesno' | 'writing';

// The four shared preset tiers plus the review modes ('wrongs' = replay the
// wrong-answer debt, 'weak' = civics weak-topic session). Which of these a hub
// actually offers is decided per page; availability can change between visits
// (debt gets paid down), so the hub validates the stored id against today's
// mode list and falls back to its recommended mode when the pick is gone.
export type PracticeModeId = 'quick' | 'standard' | 'deep' | 'full' | 'wrongs' | 'weak';

export const DEFAULT_PRACTICE_MODE_ID: PracticeModeId = 'standard';

const VALID_IDS = new Set<PracticeModeId>(['quick', 'standard', 'deep', 'full', 'wrongs', 'weak']);
const storageKey = (skill: PracticeSkillKey) => `n400:practice-mode:${skill}`;

// In-tab listeners so a write in one hook instance re-renders every other one;
// the `storage` event covers cross-tab updates.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

function readModeId(skill: PracticeSkillKey): PracticeModeId {
  try {
    const saved = window.localStorage.getItem(storageKey(skill));
    if (saved && VALID_IDS.has(saved as PracticeModeId)) return saved as PracticeModeId;
  } catch {
    /* private mode / disabled storage */
  }
  return DEFAULT_PRACTICE_MODE_ID;
}

/**
 * Remembered practice-mode id for a skill. Renders the default on the server /
 * first paint, then the persisted choice; `setModeId` writes it back.
 */
export function usePracticeModeId(skill: PracticeSkillKey): [PracticeModeId, (id: PracticeModeId) => void] {
  const modeId = useSyncExternalStore(
    subscribe,
    () => readModeId(skill),
    () => DEFAULT_PRACTICE_MODE_ID,
  );

  const setModeId = useCallback(
    (next: PracticeModeId) => {
      try {
        window.localStorage.setItem(storageKey(skill), next);
      } catch {
        /* ignore write failures */
      }
      for (const l of listeners) l();
    },
    [skill],
  );

  return [modeId, setModeId];
}
