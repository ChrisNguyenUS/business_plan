import { describe, expect, it } from 'vitest';
import { fetchAllRows } from './fetch-all-rows';

// A fake table that answers range(from, to) like PostgREST, but never with
// more than maxRows rows: Supabase's max_rows cuts a result without saying so.
function table(total: number, maxRows = 1000) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const ranges: Array<[number, number]> = [];
  const page = async (from: number, to: number) => {
    ranges.push([from, to]);
    return { data: rows.slice(from, Math.min(to + 1, from + maxRows)), error: null };
  };
  return { page, ranges };
}

describe('fetchAllRows', () => {
  it('returns every row past the 1000-row cap, in order', async () => {
    const t = table(2500);
    const { data, error } = await fetchAllRows(t.page);
    expect(error).toBeNull();
    expect(data).toHaveLength(2500);
    expect(data[0]).toEqual({ id: 0 });
    expect(data[2499]).toEqual({ id: 2499 });
    expect(t.ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('makes one request for a short history', async () => {
    const t = table(68);
    const { data } = await fetchAllRows(t.page);
    expect(data).toHaveLength(68);
    expect(t.ranges).toEqual([[0, 999]]);
  });

  it('asks once more after a page of exactly 1000', async () => {
    const t = table(1000);
    const { data } = await fetchAllRows(t.page);
    expect(data).toHaveLength(1000);
    expect(t.ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('stops at the first error and keeps the rows it already has', async () => {
    let calls = 0;
    const page = async (from: number) => {
      calls++;
      if (from >= 1000) return { data: null, error: { message: 'boom' } };
      return { data: Array.from({ length: 1000 }, (_, i) => ({ id: from + i })), error: null };
    };
    const { data, error } = await fetchAllRows(page);
    expect(error).toEqual({ message: 'boom' });
    expect(data).toHaveLength(1000);
    expect(calls).toBe(2);
  });
});
