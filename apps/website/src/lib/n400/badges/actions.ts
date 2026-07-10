'use server';

// Phase 6B — Server action wrappers around evaluateBadges.
//
// Why a separate file: n400_user_badges has no client-INSERT policy
// (intentional — clients can't grant themselves badges), so the
// dispatcher must run with the service role client. This module owns
// that and wraps the dispatcher in two thin actions:
//   - evaluateAfterAttempt  → for finalize_*_attempt server actions
//   - evaluateAfterStreak   → for streak milestone hooks
//
// Both verify the caller's identity through the cookie-bound auth
// client before touching the service-role client; an unauthenticated
// caller short-circuits and gets [].

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { evaluateBadges } from './evaluator';
import type { BadgeContext } from './types';

async function getAuthedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function runEvaluator(ctx: BadgeContext): Promise<string[]> {
  const userId = await getAuthedUserId();
  if (!userId) return [];
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Service key isn't configured in this env — log and swallow so
    // sessions still finalize cleanly. Once the key is set, badges
    // start unlocking on the next session-end.
    console.warn('n400/badges: SUPABASE_SERVICE_ROLE_KEY not set; skipping badge evaluation');
    return [];
  }
  const service = createServerSupabaseClient();
  try {
    return await evaluateBadges(userId, ctx, service);
  } catch (e) {
    // Belt-and-suspenders: dispatcher already swallows per-evaluator
    // errors, but if the upsert itself throws we still don't want to
    // block the finalize action.
    console.error('n400/badges: evaluateBadges threw at action layer', e);
    return [];
  }
}

export async function evaluateAfterAttempt(
  mode: 'mock_test' | 'practice' | 'flashcard',
  attemptId: string,
): Promise<string[]> {
  return runEvaluator({ trigger: 'session_complete', mode, attemptId });
}

export async function evaluateAfterStreak(currentStreak: number): Promise<string[]> {
  return runEvaluator({ trigger: 'streak_change', currentStreak });
}

/**
 * Full badge recompute — runs every evaluator with the 'manual_recompute'
 * trigger so any missed unlocks (streak milestones crossed before the badge
 * system was deployed, session_complete evaluators skipped by the every-5th
 * heuristic, etc.) get caught up.
 *
 * Called lazily from the use-badges hook on mount so badge-display surfaces
 * (profile page, progress page) auto-heal without user action.
 */
export async function recomputeAllBadges(): Promise<string[]> {
  return runEvaluator({ trigger: 'manual_recompute' });
}
