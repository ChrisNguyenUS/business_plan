// Gamification v2 — Badge evaluator dispatcher.
//
// Single entry point: evaluateBadges(userId, ctx, supabase). It:
//   1. Selects the evaluator subset relevant to the trigger (cheap
//      filter — running all 56 every time is harmless, but skipping
//      streak evaluators on practice-finalize is free correctness).
//   2. Runs each evaluator with try/catch — a failing evaluator must
//      not block the session-finalize that called us.
//   3. Inserts the unlock results with ON CONFLICT DO NOTHING. The
//      `RETURNING slug` clause tells us which slugs were actually
//      newly inserted so the client only sees first-time unlocks.
//
// The caller is responsible for choosing the right Supabase client.
// The route-handler/server-action layers already use the cookie-bound
// auth client; that's fine here because RLS on n400_user_badges has
// no INSERT policy — meaning unauthenticated/end-user clients cannot
// write — so callers MUST pass a service-role client.

import type { SupabaseClient } from '@supabase/supabase-js';
import { BADGE_EVALUATORS } from './registry';
import type { BadgeContext, UnlockResult } from './types';

// Evaluator selection per trigger. Most gamification-v2 badges are
// cross-section (combo/practice/other/secret all read multiple tables
// regardless of which mode just finished), so mode-based narrowing lost
// most of its value once the catalog grew past civics-only — we run the
// full set on every session_complete/manual_recompute and only keep the
// streak-only fast path for the very-frequent streak_change trigger.
function pickSlugs(ctx: BadgeContext): string[] {
  const all = Object.keys(BADGE_EVALUATORS);
  if (ctx.trigger === 'streak_change') {
    return all.filter((s) => s.startsWith('streak-'));
  }
  return all;
}

export async function evaluateBadges(
  userId: string,
  ctx: BadgeContext,
  supabase: SupabaseClient,
): Promise<string[]> {
  const slugs = pickSlugs(ctx);

  // Evaluators are independent reads, so they run concurrently — the
  // sequential version added one DB round trip of latency per badge to
  // every session finalize.
  const settled = await Promise.all(
    slugs.map(async (slug): Promise<UnlockResult | null> => {
      const evaluator = BADGE_EVALUATORS[slug];
      if (!evaluator) return null;
      try {
        return await evaluator(userId, ctx, supabase);
      } catch (e) {
        // Failing evaluator must not block session finalize. Swallow + log.
        // Sentry wiring lives at the route layer, so console.error is
        // enough here — deploy will surface this in Vercel logs.
        console.error(`n400/badges: evaluator '${slug}' threw`, e);
        return null;
      }
    }),
  );
  const results: UnlockResult[] = settled.filter((r): r is UnlockResult => r !== null);

  if (results.length === 0) return [];

  const rows = results.map((r) => ({
    user_id: userId,
    slug: r.slug,
    trigger_attempt_id: r.triggerAttemptId ?? ctx.attemptId ?? null,
    metadata: r.metadata ?? {},
  }));

  // Dedupe within this batch — if two evaluators returned the same
  // slug (shouldn't happen, but cheap to defend), the upsert sees
  // duplicates and Postgres rejects the second one with a constraint
  // error before ON CONFLICT can fire.
  const seen = new Set<string>();
  const dedupedRows = rows.filter((r) => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  });

  const { data, error } = await supabase
    .from('n400_user_badges')
    .upsert(dedupedRows, { onConflict: 'user_id,slug', ignoreDuplicates: true })
    .select('slug');

  if (error) {
    console.error('n400/badges: insert failed', error);
    return [];
  }
  return (data ?? []).map((r) => r.slug as string);
}
