/**
 * Shared analytics event helpers used by both browser pixel and server-side CAPI.
 * The same `event_id` is sent to Meta from both paths so Meta dedupes them.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function generateEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("1") ? digits : `1${digits}`;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function trackGa(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params);
}

export function trackFbq(
  eventName: string,
  params: Record<string, unknown> = {},
  eventId?: string,
): void {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventId) {
    window.fbq("track", eventName, params, { eventID: eventId });
  } else {
    window.fbq("track", eventName, params);
  }
}

// N400 Phase 6B — fired once per badge slug, when the BadgeUnlockToast
// mounts in response to a server-side unlock. n400_user_badges PK
// guarantees one INSERT per (user, slug), so duplicate fires per user
// per slug aren't possible across sessions. Funnel param `trigger`
// distinguishes streak_change unlocks from session-end unlocks.
export function trackBadgeUnlocked(
  slug: string,
  trigger: "session_complete" | "streak_change" | "manual_recompute",
): void {
  if (typeof window === "undefined") return;
  const groupCode = slug.split("-")[0];
  const params = { slug, group_code: groupCode, trigger };
  try {
    trackGa("n400_badge_unlocked", params);
    const w = window as Window & { dataLayer?: unknown[] };
    w.dataLayer?.push({ event: "n400_badge_unlocked", ...params });
  } catch {
    // Analytics failures must never break the user-visible toast.
  }
}
