// Thin wrapper tying dailyFiveSelection to a section + local date, plus the
// "x of 5 done today" count the landing hero shows. Seed is `${section}:${date}`
// so the set is stable all day and unique per section/day.

import { dailyFiveSelection } from './daily-five';
import type { SectionKey } from './section-progress';

export function sectionDailyFive(
  section: SectionKey,
  allIds: readonly string[],
  known: ReadonlySet<string>,
  seen: ReadonlySet<string>,
  localDate: string,
  count = 5,
): string[] {
  return dailyFiveSelection(allIds, known, seen, `${section}:${localDate}`, count);
}

export function dailyFiveDoneCount(selection: readonly string[], known: ReadonlySet<string>): number {
  return selection.filter((id) => known.has(id)).length;
}
