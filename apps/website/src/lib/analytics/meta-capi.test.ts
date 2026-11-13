import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendCapiEvent, sendCapiLead } from "./meta-capi";
import { sha256Hex } from "./events";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123");
  vi.stubEnv("META_CAPI_ACCESS_TOKEN", "tok&en");
  vi.stubEnv("META_CAPI_TEST_EVENT_CODE", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function sent() {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, body: JSON.parse(String(init.body)) };
}

const baseEvent = {
  eventName: "n400_setup_complete",
  eventId: "ev-1",
  eventSourceUrl: "https://www.mannaos.com/n400ready",
  user: {},
};

describe("sendCapiEvent", () => {
  it("sends nothing when the pixel id or the access token is missing", async () => {
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "");
    await sendCapiEvent(baseEvent);
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "");
    await sendCapiEvent(baseEvent);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts one event to the pixel with the shared event id", async () => {
    await sendCapiEvent({ ...baseEvent, customData: { locale: "vi" } });
    const { url, init, body } = sent();
    expect(url).toBe("https://graph.facebook.com/v21.0/123/events?access_token=tok%26en");
    expect(init.method).toBe("POST");
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      event_name: "n400_setup_complete",
      event_id: "ev-1",
      event_source_url: "https://www.mannaos.com/n400ready",
      action_source: "website",
      custom_data: { locale: "vi" },
    });
    expect(Math.abs(body.data[0].event_time - Date.now() / 1000)).toBeLessThan(5);
    expect(body).not.toHaveProperty("test_event_code");
  });

  it("hashes email, phone and names after normalizing them, and never sends them raw", async () => {
    await sendCapiEvent({
      ...baseEvent,
      user: {
        emails: [" An@Example.com "],
        phones: ["+84 912 345 678", "(512) 555-0100"],
        firstName: "An",
        lastName: "Nguyen",
        clientIp: "203.0.113.7",
        clientUserAgent: "UA/1.0",
        fbp: "fb.1.123",
        fbc: null,
      },
    });
    const { body } = sent();
    const user = body.data[0].user_data;
    expect(user.em).toEqual([await sha256Hex("an@example.com")]);
    expect(user.ph).toEqual([await sha256Hex("84912345678"), await sha256Hex("15125550100")]);
    expect(user.fn).toEqual([await sha256Hex("an")]);
    expect(user.ln).toEqual([await sha256Hex("nguyen")]);
    expect(user).toMatchObject({
      client_ip_address: "203.0.113.7",
      client_user_agent: "UA/1.0",
      fbp: "fb.1.123",
    });
    expect(user).not.toHaveProperty("fbc");
    const raw = JSON.stringify(body).toLowerCase();
    expect(raw).not.toContain("an@example.com");
    expect(raw).not.toContain("nguyen");
  });

  it("adds the test event code when one is set", async () => {
    vi.stubEnv("META_CAPI_TEST_EVENT_CODE", "TEST123");
    await sendCapiEvent(baseEvent);
    expect(sent().body.test_event_code).toBe("TEST123");
  });

  it("logs and swallows an error answer or a network failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response("bad token", { status: 400 }));
    await expect(sendCapiEvent(baseEvent)).resolves.toBeUndefined();
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(sendCapiEvent(baseEvent)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledTimes(2);
  });
});

describe("sendCapiLead", () => {
  it("sends the contact-form lead as a Lead event", async () => {
    await sendCapiLead({ eventId: "ev-2", eventSourceUrl: "https://www.mannaos.com/vi/contact", user: {} });
    expect(sent().body.data[0]).toMatchObject({ event_name: "Lead", event_id: "ev-2" });
  });
});
