// Rate limit for /api/contact: 5 submissions per IP per minute.
//
// With Upstash configured (the same UPSTASH_REDIS_REST_* env the N400
// Geocodio limiter uses) the count is shared by every server instance.
// Without it, or if Redis errors, it falls back to a per-instance memory
// bucket, the route's old behaviour: a serverless instance starts empty, so
// that only slows a burst that hits one warm instance. A lead is never
// refused because the limiter itself is down.
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const MAX_PER_WINDOW = 5;
const WINDOW_MS = 60_000;

export interface ContactLimiter {
  allow(key: string): Promise<boolean>;
}

export function memoryLimiter(max = MAX_PER_WINDOW, windowMs = WINDOW_MS, now = () => Date.now()): ContactLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    async allow(key) {
      const t = now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt < t) {
        if (buckets.size > 5_000) {
          for (const [k, v] of buckets) if (v.resetAt < t) buckets.delete(k);
        }
        buckets.set(key, { count: 1, resetAt: t + windowMs });
        return true;
      }
      if (bucket.count >= max) return false;
      bucket.count++;
      return true;
    },
  };
}

export function createContactLimiter(env: Record<string, string | undefined> = process.env): ContactLimiter {
  const memory = memoryLimiter();
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return memory;

  const shared = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_PER_WINDOW, '1 m'),
    prefix: 'contact:ip',
  });
  return {
    async allow(key) {
      try {
        return (await shared.limit(key)).success;
      } catch {
        return memory.allow(key);
      }
    },
  };
}
