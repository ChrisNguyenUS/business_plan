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
