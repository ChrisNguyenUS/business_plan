import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from }) }));

import { findPublishedPostsBySlug } from "./queries";

beforeEach(() => from.mockReset());

describe("findPublishedPostsBySlug", () => {
  it("never queries for a slug that could inject a PostgREST filter", async () => {
    expect(await findPublishedPostsBySlug("a,slug_vi.neq.x")).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("findPublishedPostsBySlug and old slugs", () => {
  // One fake PostgREST query per from() call; the awaited result is `limit`'s.
  function queries(...results: { data: unknown; error: unknown }[]) {
    const contains = vi.fn();
    for (const result of results) {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "or"]) q[m] = vi.fn(() => q);
      q.contains = vi.fn((...args: unknown[]) => {
        contains(...args);
        return q;
      });
      q.limit = vi.fn(async () => result);
      from.mockReturnValueOnce(q);
    }
    return contains;
  }

  it("returns posts whose current slug matches, without the old-slug lookup", async () => {
    const contains = queries({ data: [{ id: "p1" }], error: null });
    expect(await findPublishedPostsBySlug("bai-moi")).toEqual([{ id: "p1" }]);
    expect(from).toHaveBeenCalledTimes(1);
    expect(contains).not.toHaveBeenCalled();
  });

  it("finds a post by a slug it gave up, so the page can redirect", async () => {
    const contains = queries({ data: [], error: null }, { data: [{ id: "p1" }], error: null });
    expect(await findPublishedPostsBySlug("bai-cu")).toEqual([{ id: "p1" }]);
    expect(contains).toHaveBeenCalledWith("previous_slugs", ["bai-cu"]);
  });

  it("answers not found rather than failing when the old-slug lookup errors", async () => {
    queries({ data: [], error: null }, { data: null, error: { message: "column blog_posts.previous_slugs does not exist" } });
    expect(await findPublishedPostsBySlug("bai-cu")).toEqual([]);
  });
});
