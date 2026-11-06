import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: () => ({ insert }) }),
}));
vi.mock("@/lib/analytics/meta-capi", () => ({ sendCapiLead: vi.fn() }));

import { POST } from "./route";
import { sendCapiLead } from "@/lib/analytics/meta-capi";

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
  vi.mocked(sendCapiLead).mockClear();
  insert.mockResolvedValue({ error: null });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  vi.stubEnv("RESEND_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/contact", () => {
  it("sends a Zalo number to Meta CAPI as a phone with the Vietnam country code", async () => {
    await post({ full_name: "An Nguyen", zalo: "0912 345 678", service_type: "eb3", message: "m", event_id: "ev1" });
    expect(sendCapiLead).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendCapiLead).mock.calls[0][0].user.phones).toEqual(["+84912345678"]);
  });

  it("sends both the phone and the Zalo number to Meta CAPI", async () => {
    await post({ full_name: "An", phone: "3465550123", zalo: "0912345678", message: "m", event_id: "ev1" });
    expect(vi.mocked(sendCapiLead).mock.calls[0][0].user.phones).toEqual(["3465550123", "+84912345678"]);
  });

  it("does not send a Zalo username to Meta CAPI as a phone", async () => {
    await post({ full_name: "An", zalo: "an.nguyen", message: "m", event_id: "ev1" });
    expect(vi.mocked(sendCapiLead).mock.calls[0][0].user.phones).toBeUndefined();
  });

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

describe("POST /api/contact server-side limits", () => {
  const base = { full_name: "An Nguyen", email: "an@example.com", service_type: "tax", message: "Need help" };

  it("still accepts the general form and the EB-3 form", async () => {
    expect((await post(base)).status).toBe(200);
    const eb3 = await post({ full_name: "Binh", zalo: "0912 345 678", service_type: "eb3", message: "Q1: yes", email: "" });
    expect(eb3.status).toBe(200);
  });

  it("rejects a name that is not text or is over 200 characters", async () => {
    expect((await post({ ...base, full_name: { a: 1 } })).status).toBe(400);
    expect((await post({ ...base, full_name: "x".repeat(201) })).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a message over 5000 characters", async () => {
    expect((await post({ ...base, message: "x".repeat(5001) })).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    expect((await post({ ...base, email: "not-an-email" })).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects an unknown service type", async () => {
    expect((await post({ ...base, service_type: "<script>" })).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("stores only en or vi as the locale", async () => {
    await post({ ...base, locale: "xx" });
    expect(insertedRow().locale).toBe("en");
  });

  it("cuts tracking fields to 500 characters instead of losing the lead", async () => {
    const res = await post({ ...base, utm_source: "u".repeat(900), fbclid: "f".repeat(900) });
    expect(res.status).toBe(200);
    const row = insertedRow();
    expect((row.utm_source as string).length).toBe(500);
    expect((row.fbclid as string).length).toBe(500);
  });
});

describe("POST /api/contact rate limit", () => {
  it("answers 429 to the 6th submission from one IP within a minute", async () => {
    const send = () =>
      POST(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.9" },
          body: JSON.stringify({ full_name: "An", email: "an@example.com" }),
        }),
      );
    for (let i = 0; i < 5; i++) expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
  });
});
