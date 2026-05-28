// Phase 6B — Badge evaluator types.
//
// An evaluator is a pure-ish function that asks a single question:
// "Should this user unlock this badge right now?" It returns null when
// the answer is no, or `{ slug, metadata?, triggerAttemptId? }` when yes.
//
// Idempotency lives at the DB layer: n400_user_badges has PRIMARY KEY
// (user_id, slug) and the dispatcher uses INSERT ... ON CONFLICT DO
// NOTHING. So evaluators don't need to gate on "already unlocked" — they
// can be naive and the DB will reject the duplicate. The dispatcher
// surfaces only the slugs whose INSERT actually wrote a row.

import type { SupabaseClient } from '@supabase/supabase-js';

export type BadgeTrigger =
  | 'session_complete'
  | 'streak_change'
  | 'manual_recompute';

export interface BadgeContext {
  trigger: BadgeTrigger;
  // Present when called from a finalize action. Used as
  // n400_user_badges.trigger_attempt_id so we can later trace which
  // session caused the unlock.
  attemptId?: string;
  // Present when called from finalize_*_attempt — narrows which
  // evaluators run (see evaluator.ts).
  mode?: 'mock_test' | 'practice' | 'flashcard';
  // Present when trigger='streak_change' — current_streak after the
  // transition. Streak evaluators avoid an extra SELECT by reading this.
  currentStreak?: number;
}

export interface UnlockResult {
  slug: string;
  metadata?: Record<string, unknown>;
  triggerAttemptId?: string;
}

export type BadgeEvaluator = (
  userId: string,
  ctx: BadgeContext,
  supabase: SupabaseClient,
) => Promise<UnlockResult | null>;
