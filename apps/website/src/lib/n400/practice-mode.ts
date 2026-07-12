'use client';

// Study hubs remember the learner's last-picked practice mode per skill, so the
// Practice card can show a "current mode" up front instead of asking every time.
// This is a UI preference (not learning progress), so it lives in localStorage
// keyed by skill — no DB round-trip, no migration. Reads go through
// useSyncExternalStore so the value hydrates on mount and stays in sync across
// hook instances (and browser tabs) without a setState-in-effect.

import { useCallback, useSyncExternalStore } from 'react';
import type { PracticePreset } from './quiz-engine';

export type PracticeSkillKey = 'civics' | 'whatmean' | 'yesno' | 'writing';
type ModeId = PracticePreset['id'];

// Fixed display order across every hub (spec): Daily → Quick → Challenge → Full.
export const PRACTICE_MODE_ORDER: ModeId[] = ['standard', 'quick', 'deep', 'full'];

// Daily Practice is both the default and the "recommended today" mode.
export const DEFAULT_PRACTICE_MODE_ID: ModeId = 'standard';
export const RECOMMENDED_PRACTICE_MODE_ID: ModeId = 'standard';

const VALID_IDS = new Set<ModeId>(['quick', 'standard', 'deep', 'full']);
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

function readModeId(skill: PracticeSkillKey): ModeId {
  try {
    const saved = window.localStorage.getItem(storageKey(skill));
    if (saved && VALID_IDS.has(saved as ModeId)) return saved as ModeId;
  } catch {
    /* private mode / disabled storage */
  }
  return DEFAULT_PRACTICE_MODE_ID;
}

/**
 * Remembered practice-mode id for a skill. Renders the default on the server /
 * first paint, then the persisted choice; `setModeId` writes it back.
 */
export function usePracticeModeId(skill: PracticeSkillKey): [ModeId, (id: ModeId) => void] {
  const modeId = useSyncExternalStore(
    subscribe,
    () => readModeId(skill),
    () => DEFAULT_PRACTICE_MODE_ID,
  );

  const setModeId = useCallback(
    (next: ModeId) => {
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
