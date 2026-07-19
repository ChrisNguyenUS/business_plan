// Pure builder for the Progress activity calendar. Lifted out of the statistic
// page for two reasons: it was untestable there (it read `new Date()` itself),
// and it only ever saw civics attempts — so a learner who spent a week on
// Writing saw a blank calendar. It now takes any dated attempts, and the page
// merges every skill before calling it.

import type { N400Dict } from './i18n/vi';

/** Anything with an ISO timestamp: civics QuestionAttempt or SectionAttempt. */
export interface ActivityDay {
  at: string;
}

export interface HeatGrid {
  /** 5 rows (oldest week first) x 7 columns (Mon..Sun); each cell 0–4. */
  grid: number[][];
  /** Localized label of the most-studied weekday, or '—' with no activity. */
  busiestDay: string;
  /** Distinct days with at least one attempt, across all history. */
  totalDays: number;
}

/** Monday-first weekday abbreviations, matching the grid's column order. */
export function heatWeekdays(dict: N400Dict): string[] {
  const w = dict.common.weekday;
  return [w.monday, w.tuesday, w.wednesday, w.thursday, w.friday, w.saturday, w.sunday];
}

/** Tailwind classes per intensity level; index matches the cell value. */
export const HEAT_COLORS = ['bg-teal-50', 'bg-teal-100', 'bg-teal-300', 'bg-teal-500', 'bg-teal-700'];

const WEEKS = 5;

function intensity(count: number): number {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 8) return 2;
  if (count <= 15) return 3;
  return 4;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function buildHeatGrid(attempts: readonly ActivityDay[], now: Date, dict: N400Dict): HeatGrid {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = new Map<string, number>();
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun

  for (const a of attempts) {
    const d = new Date(a.at);
    const key = dayKey(d);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    weekdayCount[(d.getDay() + 6) % 7] += 1; // JS Sunday=0 → Monday=0
  }

  const grid: number[][] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const row: number[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7 + (6 - d)));
      row.push(intensity(buckets.get(dayKey(date)) ?? 0));
    }
    grid.push(row);
  }

  // busiestDay deliberately looks at all history, not just the grid window —
  // "which day of the week do you study on" is a habit, not a recent trend.
  let maxIdx = 0;
  for (let i = 1; i < weekdayCount.length; i++) {
    if (weekdayCount[i] > weekdayCount[maxIdx]) maxIdx = i;
  }

  return {
    grid,
    busiestDay: weekdayCount[maxIdx] === 0 ? '—' : heatWeekdays(dict)[maxIdx],
    totalDays: buckets.size,
  };
}
