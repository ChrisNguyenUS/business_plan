// Gamification v2 — per-run memoization for shared history loaders.
//
// evaluateBadges runs all evaluators concurrently (Promise.all), and many
// of them need the same underlying history (civics attempts, section
// attempts, timeline, mock counts). Caching the *promise* — not the
// resolved value — means the second caller joins the first caller's
// in-flight query instead of firing a duplicate.
//
// The cache lives on BadgeContext and is seeded per evaluateBadges run,
// so nothing persists across runs, requests, or users.

import type { BadgeContext } from '../types';

export function cached<T>(
  ctx: BadgeContext,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!ctx.cache) return fn();
  const hit = ctx.cache.get(key);
  if (hit) return hit as Promise<T>;
  const p = fn();
  ctx.cache.set(key, p);
  return p;
}
