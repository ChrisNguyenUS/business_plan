import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  sha256Hex,
} from "./events";

const GRAPH_API_VERSION = "v21.0";

type CapiUserData = {
  emails?: string[];
  phones?: string[];
  firstName?: string;
  lastName?: string;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

type CapiLeadInput = {
  eventId: string;
  eventSourceUrl: string;
  user: CapiUserData;
  customData?: Record<string, unknown>;
};

async function buildHashedUserData(user: CapiUserData) {
  const data: Record<string, unknown> = {};
  if (user.emails?.length) {
    data.em = await Promise.all(user.emails.map((e) => sha256Hex(normalizeEmail(e))));
  }
  if (user.phones?.length) {
    data.ph = await Promise.all(user.phones.map((p) => sha256Hex(normalizePhone(p))));
  }
  if (user.firstName) {
    data.fn = [await sha256Hex(normalizeName(user.firstName))];
  }
  if (user.lastName) {
    data.ln = [await sha256Hex(normalizeName(user.lastName))];
  }
  if (user.clientIp) data.client_ip_address = user.clientIp;
  if (user.clientUserAgent) data.client_user_agent = user.clientUserAgent;
  if (user.fbp) data.fbp = user.fbp;
  if (user.fbc) data.fbc = user.fbc;
  return data;
}

export async function sendCapiLead(input: CapiLeadInput): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return;

  const userData = await buildHashedUserData(input.user);
  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl,
        action_source: "website",
        user_data: userData,
        custom_data: input.customData ?? {},
      },
    ],
    ...(process.env.META_CAPI_TEST_EVENT_CODE
      ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }
      : {}),
  };

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Meta CAPI non-OK:", res.status, body);
    }
  } catch (err) {
    console.error("Meta CAPI fetch failed:", err);
  }
}
