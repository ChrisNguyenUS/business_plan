// Phase 8 Task 1 — N400-specific client analytics helpers.
//
// Wraps the shared trackGa / trackFbq utilities in events.ts. Funnel
// events (mock_test_start, practice_complete, flashcard_session,
// streak_milestone, signup_complete) fire client-side to GA4 and the
// Meta Pixel. **Conversion events** (n400_mock_test_pass,
// n400_setup_complete) intentionally NOT in this module — those go
// through server-side CAPI with a deterministic event_id so retries
// dedupe in Meta. See lib/analytics/meta-capi.ts.
//
// trackBadgeUnlocked already lives in events.ts (Phase 6B). Re-exported
// here so all N400 analytics live behind one import path.

import { trackGa, generateEventId, trackBadgeUnlocked } from '@/lib/analytics/events';

const PIXEL_SAFE_EVENTS = new Set([
  'n400_mock_test_start',
  'n400_practice_complete',
  'n400_flashcard_session',
  'n400_streak_milestone',
  'n400_signup_complete',
]);

function trackPixelCustom(eventName: string, params: Record<string, unknown>, eventId: string): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  // Meta Pixel's trackCustom is the right call for non-standard events
  // (n400_*). The shared trackFbq helper hardcodes 'track' so we go
  // direct here. Passing eventID lets us dedupe with a parallel CAPI
  // fire if we ever add one for these funnel events.
  window.fbq('trackCustom', eventName, params, { eventID: eventId });
}

function trackN400Event(eventName: string, params?: Record<string, unknown>): void {
  trackGa(eventName, params ?? {});
  if (PIXEL_SAFE_EVENTS.has(eventName)) {
    trackPixelCustom(eventName, params ?? {}, generateEventId());
  }
}

export function trackMockTestStart(): void {
  trackN400Event('n400_mock_test_start');
}

export function trackPracticeComplete(score: number, total: number): void {
  trackN400Event('n400_practice_complete', {
    score,
    total,
    accuracy: total === 0 ? 0 : Math.round((score / total) * 100),
  });
}

export function trackFlashcardSession(known: number, total: number): void {
  trackN400Event('n400_flashcard_session', { known, total });
}

export function trackStreakMilestone(streakCount: number): void {
  trackN400Event('n400_streak_milestone', { streak_count: streakCount });
}

export function trackSignupComplete(stateCode: string | null): void {
  trackN400Event('n400_signup_complete', { state_code: stateCode ?? 'unknown' });
}

export { trackBadgeUnlocked };
