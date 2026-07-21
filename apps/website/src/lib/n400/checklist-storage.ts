// Tick state for the Filing Checklist. Per-device by design (user decision
// 2026-07-21): localStorage, no table, no sync — the growth engine only ever
// sees the checklist_viewed event. Keyed by userId so a shared device does
// not leak ticks between accounts. All storage access is try/catch-wrapped
// for private mode, same as practice-mode.ts.

import { CHECKLIST_ITEM_IDS } from './checklist-data';

const storageKey = (userId: string) => `n400:filing-checklist:${userId}`;

export function loadTicks(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    // Unknown ids are dropped so a content swap can never leave the count
    // above the total (ids are stable, but items can be removed).
    return new Set(
      parsed.filter((v): v is string => typeof v === 'string' && CHECKLIST_ITEM_IDS.includes(v)),
    );
  } catch {
    return new Set();
  }
}

export function saveTicks(userId: string, ticks: ReadonlySet<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify([...ticks]));
  } catch {
    /* private mode / storage disabled — ticks just don't persist */
  }
}

export function isChecklistComplete(ticks: ReadonlySet<string>): boolean {
  return CHECKLIST_ITEM_IDS.length > 0 && CHECKLIST_ITEM_IDS.every((id) => ticks.has(id));
}
