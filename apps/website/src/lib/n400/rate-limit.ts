// Upstash Redis-backed rate limiter for Geocodio calls. Keeps a third-party
// API spend predictable: 5 / IP / hour and 10 / user / day. The setup action
// composes IP+user into a single key so a spoofed X-Forwarded-For still hits
// the user's daily cap.
//
// REQUIRED ENV (set in Vercel + .env.local):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const geocodioIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'n400:geocodio:ip',
})

export const geocodioUserLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '24 h'),
  prefix: 'n400:geocodio:user',
})
