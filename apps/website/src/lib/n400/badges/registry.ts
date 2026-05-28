// Phase 6B — Badge evaluator registry.
//
// Maps badge slug → evaluator. Each group module exports a record of
// {slug: evaluator} and we spread them all together. Adding a badge
// later means: (1) INSERT into n400_badges, (2) add an entry here.
//
// The registry is the single source of truth for "what evaluators
// exist." verify-badges.ts cross-checks this against the catalog row
// set so a missing pair (slug seeded but no evaluator, or vice-versa)
// fails loud at build time instead of silently dropping unlocks.

import type { BadgeEvaluator } from './types';

// Group modules will fill these out in subsequent commits. Keeping the
// imports here so the dispatcher type-checks immediately and growth
// is purely additive.

export const BADGE_EVALUATORS: Record<string, BadgeEvaluator> = {
  // streak group (Task 3)
  // mock-test group (Task 4)
  // coverage group (Task 5)
  // volume group (Task 6)
  // category group (Task 7)
};
