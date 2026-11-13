import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
let user: { id: string } | null = null;
let role: string | null = null;

vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: role ? { role } : null }) }),
      }),
    }),
  }),
}));

import { POST } from "./route";

describe("POST /api/admin/revalidate", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    user = null;
    role = null;
  });

  it("rejects a signed-out caller and refreshes nothing", async () => {
    const res = await POST();
    expect(res.status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a signed-in non-admin", async () => {
    user = { id: "u1" };
    role = "user";
    const res = await POST();
    expect(res.status).toBe(403);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refreshes every public page for an admin", async () => {
    user = { id: "u1" };
    role = "admin";
    const res = await POST();
    expect(res.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
