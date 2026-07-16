import { describe, expect, it } from 'vitest';
import { buildHeatGrid, HEAT_WEEKDAYS } from './activity-heatmap';

// A Wednesday, used as "now" throughout so the grid window is deterministic.
const NOW = new Date(2026, 6, 15, 10, 0, 0);

/** Local-midday ISO for `daysAgo` before NOW, so no timezone drift. */
function daysAgo(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function at(times: string[]) {
  return times.map((t) => ({ at: t }));
}

describe('buildHeatGrid', () => {
  it('returns a 5x7 grid', () => {
    const { grid } = buildHeatGrid([], NOW);
    expect(grid).toHaveLength(5);
    for (const row of grid) expect(row).toHaveLength(7);
  });

  it('is entirely cold with no activity', () => {
    const { grid, busiestDay, totalDays } = buildHeatGrid([], NOW);
    expect(grid.flat().every((v) => v === 0)).toBe(true);
    expect(busiestDay).toBe('—');
    expect(totalDays).toBe(0);
  });

  it('scales intensity by the number of attempts in a day', () => {
    // Today is the last cell of the last row.
    const cell = (times: string[]) => buildHeatGrid(at(times), NOW).grid[4][6];
    expect(cell([daysAgo(0)])).toBe(1);                              // 1–3
    expect(cell(Array(5).fill(daysAgo(0)))).toBe(2);                 // 4–8
    expect(cell(Array(12).fill(daysAgo(0)))).toBe(3);                // 9–15
    expect(cell(Array(20).fill(daysAgo(0)))).toBe(4);                // 16+
  });

  it('counts distinct active days, not attempts', () => {
    const { totalDays } = buildHeatGrid(at([daysAgo(0), daysAgo(0), daysAgo(3)]), NOW);
    expect(totalDays).toBe(2);
  });

  it('names the most-studied weekday', () => {
    // NOW (2026-07-15) is a Wednesday = T4; daysAgo(7) is also a Wednesday,
    // so T4 scores 2 against T3's 1.
    const { busiestDay } = buildHeatGrid(at([daysAgo(0), daysAgo(7), daysAgo(1)]), NOW);
    expect(busiestDay).toBe('T4');
    expect(HEAT_WEEKDAYS).toContain(busiestDay);
  });

  it('merges attempts from every skill onto one calendar', () => {
    // The whole point of the extraction: civics + section attempts together.
    const civics = at([daysAgo(0)]);
    const sections = at([daysAgo(0), daysAgo(0)]);
    expect(buildHeatGrid([...civics, ...sections], NOW).grid[4][6]).toBe(1); // 3 attempts → level 1
    expect(buildHeatGrid([...civics, ...sections, ...at([daysAgo(0)])], NOW).grid[4][6]).toBe(2); // 4 → level 2
  });

  it('ignores activity older than the 35-day window in the grid', () => {
    const { grid, totalDays } = buildHeatGrid(at([daysAgo(200)]), NOW);
    expect(grid.flat().every((v) => v === 0)).toBe(true);
    // totalDays intentionally counts all history, not just the window.
    expect(totalDays).toBe(1);
  });
});
