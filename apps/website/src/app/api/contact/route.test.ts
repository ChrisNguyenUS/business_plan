import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: () => ({ insert }) }),
}));
vi.mock("@/lib/analytics/meta-capi", () => ({ sendCapiLead: vi.fn() }));

import { POST } from "./route";

let ipCounter = 0;
function post(body: Record<string, unknown>) {
  ipCounter += 1; // unique IP per request so the in-memory rate limiter never trips
  return POST(
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${ipCounter}` },
      body: JSON.stringify(body),
    }),
  );
}

function insertedRow() {
  expect(insert).toHaveBeenCalledTimes(1);
  return insert.mock.calls[0][0] as Record<string, unknown>;
}

beforeEach(() => {
  insert.mockReset();
  insert.mockResolvedValue({ error: null });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  vi.stubEnv("RESEND_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/contact", () => {
  it("accepts a Facebook-only lead and prepends the handle to the message", async () => {
    const res = await post({
      full_name: "Nguyễn Văn An",
      facebook: "  facebook.com/an.nguyen ",
      service_type: "eb3",
      message: "[EB-3 Screening]\nNơi ở: Việt Nam",
    });
    expect(res.status).toBe(200);
    const row = insertedRow();
    expect(row.service_type).toBe("eb3");
    expect(row.phone).toBeNull();
    expect(row.email).toBeNull();
    expect(row.message).toBe("Facebook: facebook.com/an.nguyen\n[EB-3 Screening]\nNơi ở: Việt Nam");
  });

  it("accepts a Zalo-only lead", async () => {
    const res = await post({ full_name: "An", zalo: "0901234567", message: "hi" });
    expect(res.status).toBe(200);
    expect(insertedRow().message).toBe("Zalo: 0901234567\nhi");
  });

  it("orders Facebook before Zalo before the message", async () => {
    await post({ full_name: "An", facebook: "fb", zalo: "zl", message: "m" });
    expect(insertedRow().message).toBe("Facebook: fb\nZalo: zl\nm");
  });

  it("leaves a legacy email lead's message untouched", async () => {
    const res = await post({ full_name: "Bob", email: "bob@example.com", service_type: "tax", message: "Hello" });
    expect(res.status).toBe(200);
    const row = insertedRow();
    expect(row.message).toBe("Hello");
    expect(row.email).toBe("bob@example.com");
  });

  it("stores null message when nothing was provided besides a phone", async () => {
    const res = await post({ full_name: "Bob", phone: "3465550123" });
    expect(res.status).toBe(200);
    expect(insertedRow().message).toBeNull();
  });

  it("rejects a lead with no contact method", async () => {
    const res = await post({ full_name: "An", message: "hi" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Name and a contact method are required." });
    expect(insert).not.toHaveBeenCalled();
  });

  it("treats whitespace-only Facebook/Zalo as missing", async () => {
    const res = await post({ full_name: "An", facebook: "   ", zalo: " " });
    expect(res.status).toBe(400);
  });

  it("ignores non-string Facebook/Zalo values", async () => {
    const res = await post({ full_name: "An", facebook: 123, zalo: { x: 1 } });
    expect(res.status).toBe(400);
  });
});
