// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { CHECKLIST_ITEM_IDS } from './checklist-data';
import { isChecklistComplete, loadTicks, saveTicks } from './checklist-storage';

const USER = 'u-test';

describe('checklist-storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('returns an empty set when nothing is stored', () => {
    expect(loadTicks(USER).size).toBe(0);
  });

  it('round-trips ticks per user', () => {
    saveTicks(USER, new Set([CHECKLIST_ITEM_IDS[0]]));
    expect([...loadTicks(USER)]).toEqual([CHECKLIST_ITEM_IDS[0]]);
    expect(loadTicks('someone-else').size).toBe(0);
  });

  it('drops unknown and non-string ids on load (stale content swap)', () => {
    window.localStorage.setItem(
      `n400:filing-checklist:${USER}`,
      JSON.stringify([CHECKLIST_ITEM_IDS[0], 'removed-item', 7]),
    );
    expect([...loadTicks(USER)]).toEqual([CHECKLIST_ITEM_IDS[0]]);
  });

  it('survives garbage in storage', () => {
    window.localStorage.setItem(`n400:filing-checklist:${USER}`, '{not json');
    expect(loadTicks(USER).size).toBe(0);
  });

  it('isChecklistComplete only when every item is ticked', () => {
    expect(isChecklistComplete(new Set())).toBe(false);
    expect(isChecklistComplete(new Set(CHECKLIST_ITEM_IDS.slice(0, 1)))).toBe(false);
    expect(isChecklistComplete(new Set(CHECKLIST_ITEM_IDS))).toBe(true);
  });
});
