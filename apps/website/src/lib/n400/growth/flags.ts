//
// Feature flags with deterministic percentage rollout (spec §1.6).
// hash(user_id, flag_key) buckets a user 0-99; the bucket is stable, so a user
// never flip-flops in and out of a rollout. No assignment table needed.

export type FeatureFlag = {
  flag_key: string;
  enabled: boolean;
  rollout_pct: number;
};

// FNV-1a 32-bit — tiny, dependency-free, stable across platforms.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function isUserInRollout(flagKey: string, userId: string, rolloutPct: number): boolean {
  if (rolloutPct >= 100) return true;
  if (rolloutPct <= 0) return false;
  return fnv1a(`${flagKey}:${userId}`) % 100 < rolloutPct;
}

export function isFeatureOn(flag: FeatureFlag | null | undefined, userId: string): boolean {
  if (!flag || !flag.enabled) return false;
  return isUserInRollout(flag.flag_key, userId, flag.rollout_pct);
}
