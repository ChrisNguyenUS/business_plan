//
// Growth event taxonomy (spec §1.5). event_version bumps when a type's payload
// shape changes — consumers read by version.
//
// SERVER_EVENT_TYPES are emitted by DB triggers or SECURITY DEFINER RPCs only;
// the RLS INSERT policy on n400_growth_events rejects them from clients.
// CLIENT_EVENT_TYPES may be inserted by the signed-in user for themself —
// pure UI telemetry that touches neither score nor funnel (see n400_24).

export const CLIENT_EVENT_TYPES = [
  'consultation_form_opened',
] as const;

export const SERVER_EVENT_TYPES = [
  'account_created',
  'onboarding_completed',
  'address_entered',
  'practice_completed',
  'mock_completed',
  // The whole prompt funnel is RPC-only (n400_21 / n400_22), so the G3
  // conversion analytics built on it cannot be forged — see n400_23.
  'prompt_shown',
  'prompt_answered',
  'prompt_skipped',
  // RPC-only since n400_24 (mark_cta_shown / dismiss_cta / click_cta):
  // cta_dismissed feeds the dismissed_consultation_cta_3 scoring penalty and
  // all three feed G4's funnel view, so none may be client-forgeable.
  'cta_shown',
  'cta_dismissed',
  'cta_clicked',
  // reserved, not emitted in G1:
  'section_completed',
  'readiness_snapshot',
  'app_shared',
  'review_left',
  'friend_invited',
  'push_disabled',
] as const;

export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];
export type ServerEventType = (typeof SERVER_EVENT_TYPES)[number];
export type GrowthEventType = ClientEventType | ServerEventType;

export const EVENT_VERSION = 1;

export function isClientEventType(type: string): type is ClientEventType {
  return (CLIENT_EVENT_TYPES as readonly string[]).includes(type);
}
