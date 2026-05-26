// Upstash Redis-backed rate limiter for Geocodio calls. Keeps a third-party
// API spend predictable: 5 / IP / hour and 10 / user / day. The setup action
// composes IP+user into a single key so a spoofed X-Forwarded-For still hits
// the user's daily cap.
//
// REQUIRED ENV (set in Vercel + .env.local):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// When the env is missing (e.g. local dev before Upstash is provisioned), we
// fall back to a no-op limiter that always allows. A console warning fires
// once at module load so it's obvious in logs. Do not ship to production
// without the env set — Geocodio quota will be unprotected.

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

interface LimiterLike {
  limit(identifier: string): Promise<{ success: boolean }>
}

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN
const upstashConfigured = Boolean(url && token)

if (!upstashConfigured) {
  console.warn(
    '[n400/rate-limit] UPSTASH_REDIS_REST_URL/TOKEN missing — Geocodio rate limiter is a NO-OP. ' +
      'Provision Upstash before production traffic.',
  )
}

const noopLimiter: LimiterLike = {
  async limit() {
    return { success: true }
  },
}

function makeLimiter(limiter: ReturnType<typeof Ratelimit.slidingWindow>, prefix: string): LimiterLike {
  if (!upstashConfigured) return noopLimiter
  const redis = new Redis({ url: url!, token: token! })
  return new Ratelimit({ redis, limiter, prefix })
}

export const geocodioIpLimiter: LimiterLike = makeLimiter(
  Ratelimit.slidingWindow(5, '1 h'),
  'n400:geocodio:ip',
)

export const geocodioUserLimiter: LimiterLike = makeLimiter(
  Ratelimit.slidingWindow(10, '24 h'),
  'n400:geocodio:user',
)
