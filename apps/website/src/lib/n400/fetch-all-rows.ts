// PostgREST answers at most 1000 rows per request (Supabase max_rows) and says
// nothing when it cuts a result off. Page with .range() until a page comes
// back short, so a long history is never silently truncated. The caller's
// query needs a unique tiebreak in its order (e.g. id) so pages don't overlap.
// PAGE_SIZE must not exceed the project's max_rows (Dashboard → API settings,
// 1000 here): a smaller server cap would make the first page look like the last.
export const PAGE_SIZE = 1000;

export async function fetchAllRows<T, E>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: E | null }>,
  pageSize = PAGE_SIZE
): Promise<{ data: T[]; error: E | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return { data: rows, error: null };
  }
}
