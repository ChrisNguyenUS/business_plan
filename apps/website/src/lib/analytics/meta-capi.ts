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

type CapiEventInput = {
  eventName: string;
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

// Generalized CAPI event sender. Used by both the contact-form Lead
// path (via sendCapiLead) and the N400 conversion events
// (n400_mock_test_pass, n400_setup_complete). The caller supplies the
// event name; everything else (env-gated pixel/token, hashed PII, test
// event code) is shared.
export async function sendCapiEvent(input: CapiEventInput): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return;

  const userData = await buildHashedUserData(input.user);
  const payload = {
    data: [
      {
        event_name: input.eventName,
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
      console.error(`Meta CAPI non-OK (${input.eventName}):`, res.status, body);
    }
  } catch (err) {
    console.error(`Meta CAPI fetch failed (${input.eventName}):`, err);
  }
}

// Thin wrapper preserving the existing contact-form call signature.
export async function sendCapiLead(input: CapiLeadInput): Promise<void> {
  return sendCapiEvent({
    eventName: "Lead",
    eventId: input.eventId,
    eventSourceUrl: input.eventSourceUrl,
    user: input.user,
    customData: input.customData,
  });
}
