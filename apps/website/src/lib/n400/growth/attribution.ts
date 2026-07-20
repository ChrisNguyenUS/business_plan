//
// First-party attribution capture (spec §1.2). A cookie records first touch
// (immutable) + last touch (overwritten whenever a new UTM/click-id arrives).
// At login/signup the auth callback persists the cookie into
// n400_lead_profiles via the n400_set_attribution RPC. Edge-safe: no Node or
// Supabase imports — middleware runs this.

export const ATTRIB_COOKIE = 'n400_attrib';
export const ATTRIB_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

const PARAM_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ad_id', 'fbclid', 'gclid',
] as const;

const VALUE_MAX = 200;
const REFERRER_MAX = 500;

export type TouchData = {
  [K in (typeof PARAM_KEYS)[number]]?: string;
} & {
  referrer?: string;
  landing_page: string;
  ts: string;
};

export type AttributionCookie = { first: TouchData; last: TouchData };

export function hasAttributionSignal(url: URL): boolean {
  return PARAM_KEYS.some((k) => url.searchParams.get(k));
}

export function buildTouch(url: URL, referrer: string | null): TouchData {
  const touch: TouchData = {
    landing_page: url.pathname.slice(0, VALUE_MAX),
    ts: new Date().toISOString(),
  };
  for (const key of PARAM_KEYS) {
    const value = url.searchParams.get(key);
    if (value) touch[key] = value.slice(0, VALUE_MAX);
  }
  if (referrer) touch.referrer = referrer.slice(0, REFERRER_MAX);
  return touch;
}

export function parseAttributionCookie(raw: string | undefined): AttributionCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.first && parsed.last) {
      return parsed as AttributionCookie;
    }
    return null;
  } catch {
    return null;
  }
}

export function mergeAttributionCookie(raw: string | null | undefined, touch: TouchData): AttributionCookie {
  const existing = parseAttributionCookie(raw ?? undefined);
  if (!existing) return { first: touch, last: touch };
  return { first: existing.first, last: touch };
}
