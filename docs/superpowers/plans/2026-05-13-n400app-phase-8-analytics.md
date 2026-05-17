# N400 App — Phase 8: Analytics + Monitoring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire GA4 events, Meta CAPI server-side for conversion events, Service Worker with content-version cache busting, and Sentry error tracking.

**Architecture:** Client-side GA4 + Pixel for funnel events. Server-side CAPI (via a generalized helper extracted from the existing `lib/analytics/meta-capi.ts`) for `n400_mock_test_pass` and `n400_setup_complete`. **Deterministic event_id** so retries dedupe in Meta. Service Worker registered at root scope so it can intercept `/api/n400/*` cache-busting paths. Public content reads use `unstable_cache` with `next-tag` `n400-content` so admin saves actually invalidate.

**Tech Stack:** Existing `lib/analytics/events.ts` + extension to `lib/analytics/meta-capi.ts`, Next.js Service Worker via `public/sw-n400.js` registered at root scope, Sentry (already configured or add via `@sentry/nextjs`).

**Prerequisite:** Phase 4 complete (mock test finalization), Phase 3 complete (setup action). The existing `sendCapiLead` only fires `event_name: "Lead"` — Task 0 below generalizes it to a parameterized `sendCapiEvent`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/analytics/meta-capi.ts` | Modify | Add generalized `sendCapiEvent({ eventName, ... })` alongside existing `sendCapiLead` |
| `src/lib/n400/analytics.ts` | Create | N400-specific analytics event helpers |
| `src/lib/n400/cached-content.ts` | Create | `unstable_cache` wrappers with tag `n400-content` for public content reads |
| `src/app/api/n400/content-version/route.ts` | Create | Returns content hash for SW cache busting |
| `public/sw-n400.js` | Create | Service Worker (registered at root scope) |
| `src/app/[locale]/n400app/layout.tsx` | Modify | Register SW on mount |
| `src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts` | Modify | Fire CAPI on pass with deterministic event_id |
| `src/app/[locale]/n400app/setup/actions.ts` | Modify | Fire CAPI on setup complete with deterministic event_id |

---

## Task 0: Generalize Meta CAPI helper

**Files:**
- Modify: `apps/website/src/lib/analytics/meta-capi.ts`

The existing `sendCapiLead` hardcodes `event_name: "Lead"` and a fixed user-data shape. We need it to fire arbitrary event names (`n400_mock_test_pass`, `n400_setup_complete`) while preserving the existing Lead behavior used by the contact form.

- [ ] **Step 1: Add `sendCapiEvent` alongside the existing function**

Edit `apps/website/src/lib/analytics/meta-capi.ts`. Keep `sendCapiLead` as a thin wrapper, add a generalized helper:

```typescript
// ── existing imports/types/buildHashedUserData stay unchanged ──

type CapiEventInput = {
  eventName: string                // 'Lead' | 'n400_mock_test_pass' | 'n400_setup_complete' | ...
  eventId: string
  eventSourceUrl: string
  user: CapiUserData
  customData?: Record<string, unknown>
}

export async function sendCapiEvent(input: CapiEventInput): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN
  if (!pixelId || !accessToken) return

  const userData = await buildHashedUserData(input.user)
  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl,
        action_source: 'website',
        user_data: userData,
        custom_data: input.customData ?? {},
      },
    ],
    ...(process.env.META_CAPI_TEST_EVENT_CODE
      ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }
      : {}),
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`Meta CAPI non-OK (${input.eventName}):`, res.status, body)
    }
  } catch (err) {
    console.error(`Meta CAPI fetch failed (${input.eventName}):`, err)
  }
}

// Thin wrapper preserving the existing contact-form call signature.
// Maps CapiLeadInput fields to the generalized CapiEventInput shape.
export async function sendCapiLead(input: CapiLeadInput): Promise<void> {
  return sendCapiEvent({
    eventName: 'Lead',
    eventId: input.eventId,
    eventSourceUrl: input.eventSourceUrl,
    user: input.user,
    customData: input.customData,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/lib/analytics/meta-capi.ts
git commit -m "refactor(analytics): generalize sendCapiEvent for n400 conversion events"
```

---

## Task 1: N400 analytics helpers

**Files:**
- Create: `apps/website/src/lib/n400/analytics.ts`

- [ ] **Step 1: Read existing analytics patterns**

Read `apps/website/src/lib/analytics/events.ts` and `apps/website/src/lib/analytics/meta-capi.ts` to understand the existing event_id deduplication and CAPI payload structure before writing new code.

- [ ] **Step 2: Create N400 analytics module**

Create `apps/website/src/lib/n400/analytics.ts`:

```typescript
// Client-side GA4 + Meta Pixel events for N400 app
// High-value conversions (pass, setup_complete) go through server-side CAPI only

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

function generateEventId(): string {
  return `n400-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function trackN400Event(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  // GA4
  window.gtag?.('event', eventName, params)

  // Meta Pixel (non-conversion events only — conversions go via CAPI)
  const pixelSafeEvents = [
    'n400_mock_test_start',
    'n400_practice_complete',
    'n400_flashcard_session',
    'n400_streak_milestone',
  ]
  if (pixelSafeEvents.includes(eventName)) {
    window.fbq?.('trackCustom', eventName, { ...params, event_id: generateEventId() })
  }
}

export function trackMockTestStart() {
  trackN400Event('n400_mock_test_start')
}

export function trackPracticeComplete(score: number, total: number) {
  trackN400Event('n400_practice_complete', { score, total, accuracy: Math.round((score / total) * 100) })
}

export function trackFlashcardSession(knew: number, total: number) {
  trackN400Event('n400_flashcard_session', { knew, total })
}

export function trackStreakMilestone(streakCount: number) {
  trackN400Event('n400_streak_milestone', { streak_count: streakCount })
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/n400/analytics.ts
git commit -m "feat(n400): add client-side analytics helpers for GA4 and Meta Pixel"
```

---

## Task 2: Server-side CAPI for conversion events

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts`
- Modify: `apps/website/src/app/[locale]/n400app/setup/actions.ts`

- [ ] **Step 1: Read existing CAPI implementation**

Read `apps/website/src/lib/analytics/meta-capi.ts` to understand the existing `sendCapiEvent` function signature and required payload fields.

- [ ] **Step 2: Fire CAPI on mock test pass (deterministic event_id)**

In `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts`, add to `finalizeAttempt` after computing `passed`:

```typescript
// Add imports at top of file:
import { sendCapiEvent } from '@/lib/analytics/meta-capi'
import { headers } from 'next/headers'
import { createHash } from 'crypto'

// Inside finalizeAttempt, after the DB update — only when passed === true:
if (passed) {
  try {
    const hdrs = await headers()
    // Deterministic event_id: same attempt → same id → Meta dedupes if finalize is retried.
    const eventId = createHash('sha256').update(`n400-pass:${attemptId}`).digest('hex').slice(0, 32)
    await sendCapiEvent({
      eventName: 'n400_mock_test_pass',
      eventId,
      eventSourceUrl: hdrs.get('referer') ?? 'https://mannaos.com/n400app',
      user: {
        emails: user.email ? [user.email] : undefined,
        clientIp: hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        clientUserAgent: hdrs.get('user-agent') ?? null,
      },
      customData: { score, total_questions: total },
    })
  } catch {
    // Non-blocking — analytics failure should not break the user flow
  }
}
```

- [ ] **Step 3: Fire CAPI on setup complete (deterministic event_id)**

In `apps/website/src/app/[locale]/n400app/setup/actions.ts`, add after successful profile save:

```typescript
// Add imports at top:
import { sendCapiEvent } from '@/lib/analytics/meta-capi'
import { createHash } from 'crypto'

// Add after successful supabase upsert, before redirect:
try {
  // Deterministic event_id: same user + same resolved location → same id, dedupe-safe on retry.
  const idInput = `n400-setup:${user.id}:${stateFromGeo ?? state}:${districtNumber ?? 'na'}`
  const eventId = createHash('sha256').update(idInput).digest('hex').slice(0, 32)
  await sendCapiEvent({
    eventName: 'n400_setup_complete',
    eventId,
    eventSourceUrl: 'https://mannaos.com/n400app/setup',
    user: {
      emails: user.email ? [user.email] : undefined,
      clientIp: extractClientIp(headerStore.get('x-forwarded-for')),
      clientUserAgent: headerStore.get('user-agent') ?? null,
    },
    customData: { state_code: stateFromGeo ?? state, district_resolved: districtNumber !== null },
  })
} catch {
  // Non-blocking
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts \
        apps/website/src/app/[locale]/n400app/setup/actions.ts
git commit -m "feat(n400): fire server-side Meta CAPI for mock test pass and setup complete"
```

---

## Task 3: Content version API route + cached content reads

**Files:**
- Create: `apps/website/src/app/api/n400/content-version/route.ts`
- Create: `apps/website/src/lib/n400/cached-content.ts`

The master plan promised that admin saves invalidate via `revalidateTag('n400-content')`. Direct `supabase.from(...)` calls are NOT in Next's data cache, so the tag never matches anything. Wrap public reads in `unstable_cache` with the tag.

- [ ] **Step 1: Create cached-content helpers**

Create `apps/website/src/lib/n400/cached-content.ts`:

```typescript
import { unstable_cache } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function publicSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

/**
 * Cached read of all 128 questions + correct answers (for Flashcards / View All).
 * Tagged 'n400-content' so admin saves invalidate it via revalidateTag.
 * 1h soft revalidate as a safety net.
 */
export const getAllQuestionsCached = unstable_cache(
  async () => {
    const supabase = await publicSupabase()
    const [questionsRes, answersRes] = await Promise.all([
      supabase
        .from('n400_questions')
        .select('id, question_en, question_vi, question_audio_url, is_location_based, category')
        .is('deleted_at', null)
        .order('id'),
      supabase
        .from('n400_answers')
        .select('id, question_id, answer_en, answer_vi, answer_audio_url, is_correct')
        .is('deleted_at', null),
    ])
    return { questions: questionsRes.data ?? [], answers: answersRes.data ?? [] }
  },
  ['n400-all-questions-with-answers'],
  { tags: ['n400-content'], revalidate: 3600 }
)

/** Latest updated_at across content tables — used by content-version endpoint. */
export const getContentVersion = unstable_cache(
  async () => {
    const supabase = await publicSupabase()
    const { data } = await supabase
      .from('n400_questions')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
    return data?.[0]?.updated_at ?? '0'
  },
  ['n400-content-version'],
  { tags: ['n400-content'], revalidate: 60 }
)
```

Update Phase 5's `/api/n400/questions-with-answers/route.ts` and Phase 5's All-Questions server page to call `getAllQuestionsCached()` instead of inline `supabase.from(...)` queries. (Phase 7 admin actions already call `revalidateTag('n400-content')`.)

- [ ] **Step 2: Create content-version route**

Create `apps/website/src/app/api/n400/content-version/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getContentVersion } from '@/lib/n400/cached-content'

export async function GET() {
  const latest = await getContentVersion()
  const hash = createHash('sha256').update(String(latest)).digest('hex').slice(0, 8)
  return NextResponse.json({ version_hash: hash }, {
    headers: { 'Cache-Control': 'public, max-age=60' }
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/n400/cached-content.ts \
        apps/website/src/app/api/n400/content-version/route.ts \
        apps/website/src/app/[locale]/n400app/all-questions/ \
        apps/website/src/app/api/n400/questions-with-answers/
git commit -m "feat(n400): tag-based cache for content + content-version API"
```

---

## Task 4: Service Worker (root scope)

**Files:**
- Create: `apps/website/public/sw-n400.js`
- Create: `apps/website/src/components/n400/RegisterSW.tsx`
- Modify: `apps/website/next.config.ts` — add `Service-Worker-Allowed: /` header for `/sw-n400.js`
- Modify: `apps/website/src/app/[locale]/n400app/layout.tsx`

⚠️ **Why root scope:** a Service Worker can only intercept requests under its registered scope. We need to intercept BOTH `/n400app/*` (audio fetched from Supabase, UI navigations) AND `/api/n400/*` (questions API + content-version). The SW file lives at `/sw-n400.js` (already root) but the registration scope must be `/`. Browsers reject root-scope registrations from a non-root file unless the response carries `Service-Worker-Allowed: /`.

The SW's fetch handler is path-filtered so it never touches anything outside `/n400app` or `/api/n400` — non-n400 routes are unaffected.

- [ ] **Step 1: Create Service Worker**

Create `apps/website/public/sw-n400.js`:

```javascript
const CACHE_NAME = 'n400-v1'
const VERSION_REQ_URL = '/n400-content-version-cache-key' // synthetic key for the version blob inside the cache

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const sameOrigin = url.origin === self.location.origin

  // Audio (Supabase Storage CDN): cache-first.
  // No path filter on origin — Supabase URL — but we only handle GETs to the n400-audio bucket.
  if (event.request.method === 'GET' && url.hostname.includes('supabase') && url.pathname.includes('n400-audio')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(event.request)
      if (cached) return cached
      const response = await fetch(event.request)
      if (response.ok) cache.put(event.request, response.clone())
      return response
    })())
    return
  }

  // Anything outside our app paths — let the network handle it.
  if (!sameOrigin) return
  if (!url.pathname.startsWith('/n400app') && !url.pathname.startsWith('/api/n400')) return

  // Never cache content-version itself.
  if (url.pathname === '/api/n400/content-version') return

  // Questions API: version-aware cache.
  if (url.pathname === '/api/n400/questions-with-answers' && event.request.method === 'GET') {
    event.respondWith((async () => {
      try {
        const versionRes = await fetch('/api/n400/content-version', { cache: 'no-store' })
        const { version_hash } = await versionRes.json()
        const cache = await caches.open(CACHE_NAME)

        // Stored version blob lives under a synthetic Request URL so cache.match works deterministically.
        const versionKey = new Request(VERSION_REQ_URL)
        const cachedVersion = await cache.match(versionKey)
        const cachedVersionData = cachedVersion ? await cachedVersion.json() : null

        if (cachedVersionData?.version_hash !== version_hash) {
          await cache.delete(event.request)
          await cache.put(versionKey, new Response(JSON.stringify({ version_hash }), {
            headers: { 'Content-Type': 'application/json' },
          }))
        }

        const cached = await cache.match(event.request)
        if (cached) return cached

        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      } catch {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(event.request)
        if (cached) return cached
        return fetch(event.request)
      }
    })())
    return
  }

  // Other /n400app/* and /api/n400/* requests: pass through (no caching).
})
```

- [ ] **Step 2: Allow root-scope registration via Next config**

Add to `apps/website/next.config.ts` `headers()`:

```typescript
async headers() {
  return [
    {
      source: '/sw-n400.js',
      headers: [
        // Allow registering this SW at root scope from any route.
        { key: 'Service-Worker-Allowed', value: '/' },
        // Don't cache the SW itself — we want updates to roll out fast.
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
      ],
    },
    // ...existing headers
  ]
}
```

- [ ] **Step 3: Register SW at root scope**

Create `apps/website/src/components/n400/RegisterSW.tsx`:

```typescript
'use client'

import { useEffect } from 'react'

export function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Root scope is required so the SW can intercept /api/n400/* (which lives outside /n400app/).
      navigator.serviceWorker.register('/sw-n400.js', { scope: '/' })
        .catch(() => {/* SW registration failure is non-critical */})
    }
  }, [])
  return null
}
```

Add `<RegisterSW />` to `apps/website/src/app/[locale]/n400app/layout.tsx` inside the wrapper, before `<header>`.

- [ ] **Step 4: Commit**

```bash
git add apps/website/public/sw-n400.js \
        apps/website/src/components/n400/RegisterSW.tsx \
        apps/website/src/app/[locale]/n400app/layout.tsx \
        apps/website/next.config.ts
git commit -m "feat(n400): root-scope Service Worker with content-version cache busting"
```

---

## Task 5: Wire client-side analytics events

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/mock-test/page.tsx`
- Modify: `apps/website/src/app/[locale]/n400app/practice/page.tsx`
- Modify: `apps/website/src/app/[locale]/n400app/flashcards/page.tsx`

- [ ] **Step 1: Add trackMockTestStart to mock test start page**

In `apps/website/src/app/[locale]/n400app/mock-test/page.tsx`, add to `handleStart`:

```typescript
import { trackMockTestStart } from '@/lib/n400/analytics'

// Inside handleStart, before startMockTest():
trackMockTestStart()
```

- [ ] **Step 2: Add trackPracticeComplete to practice page**

In `apps/website/src/app/[locale]/n400app/practice/page.tsx`, add to `handleNext` when quiz ends:

```typescript
import { trackPracticeComplete } from '@/lib/n400/analytics'

// Inside handleNext, after finalizePractice:
const r = await finalizePractice(state.attemptId)
trackPracticeComplete(r.score, r.total)
```

- [ ] **Step 3: Add trackFlashcardSession to flashcards page**

In `apps/website/src/app/[locale]/n400app/flashcards/page.tsx`, add to `handleMark` when done:

```typescript
import { trackFlashcardSession } from '@/lib/n400/analytics'

// Inside handleMark, before setDone(true):
trackFlashcardSession(newKnew.length, cards.length)
```

- [ ] **Step 4: Add trackStreakMilestone to quiz finalization**

In `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/page.tsx`, after `finalizeAttempt` returns, check for milestone from streak update. Since `updateStreak` is called server-side inside `finalizeAttempt`, pass milestone back to client:

Update `finalizeAttempt` in `actions.ts` to return milestone:

```typescript
// In finalizeAttempt return type, add milestoneReached:
export async function finalizeAttempt(attemptId: string): Promise<{ passed: boolean; score: number; total: number; milestoneReached?: number | null }>

// After updateStreak call:
const streakResult = await updateStreak(attemptId)
return { passed, score, total, milestoneReached: streakResult?.milestoneReached }
```

In the quiz page, after receiving result:
```typescript
import { trackStreakMilestone } from '@/lib/n400/analytics'

// After finalizeAttempt:
const result = await finalizeAttempt(attemptId)
if (result.milestoneReached) trackStreakMilestone(result.milestoneReached)
```

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/
git commit -m "feat(n400): wire client-side analytics events across all quiz modes"
```

---

## Task 5.5: Track n400_signup_complete in GA4

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/setup/page.tsx` (or the auth callback)

The PRD requires a `n400_signup_complete` GA4 event fired once when a new user completes the setup flow. This is a client-side event (not a CAPI conversion) — it fires on the setup page's `onSuccess` callback or on mount of the post-setup dashboard redirect.

- [ ] **Step 1: Add event to analytics helpers**

In `apps/website/src/lib/n400/analytics.ts`, add:

```typescript
export function trackSignupComplete(stateCode: string) {
  trackN400Event('n400_signup_complete', { state_code: stateCode })
}
```

- [ ] **Step 2: Fire on setup completion**

In the setup page client component, after the `saveSetup` server action returns successfully, call:

```typescript
import { trackSignupComplete } from '@/lib/n400/analytics'

// After successful saveSetup:
trackSignupComplete(stateCode)
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/n400/analytics.ts \
        apps/website/src/app/[locale]/n400app/setup/
git commit -m "feat(n400): fire n400_signup_complete GA4 event on setup completion"
```

---

## Task 6: Sentry error tracking

**Files:**
- Modify: `apps/website/src/lib/n400/geocodio.ts`
- Modify: `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts`

- [ ] **Step 1: Check if Sentry is already configured**

```bash
ls apps/website/sentry.*.ts 2>/dev/null || echo "Sentry not configured"
cat apps/website/package.json | grep sentry
```

If Sentry is not installed:
```bash
cd apps/website && npm install --save @sentry/nextjs@8.54.0
npx @sentry/wizard@latest -i nextjs
```

- [ ] **Step 2: Add Sentry capture to Geocodio errors (PII-safe)**

In `apps/website/src/lib/n400/geocodio.ts`, wrap the fetch — but **never include the input address in the captured exception**. The custom `GeocodioError` class from Phase 3 already carries only the HTTP status; we capture that, and explicitly scrub any extra context.

```typescript
import * as Sentry from '@sentry/nextjs'
import { GeocodioError } from './geocodio'  // self-import OK or just inline

// In geocodeAddress, replace the catch:
} catch (err) {
  // Re-package as GeocodioError (no PII) before reporting.
  const safe = err instanceof GeocodioError ? err : new GeocodioError(0)
  Sentry.captureException(safe, {
    tags: { feature: 'n400-geocodio' },
    // Explicitly empty extra/contexts — guarantees no address fragment leaks.
    extra: {},
  })
  throw safe
}
```

Sentry's default `beforeSend` should also be configured (`apps/website/sentry.server.config.ts`) to scrub `request.url` for any path under `/n400app/setup` — defense in depth in case a future code path accidentally puts the address into a thrown message or breadcrumb.

- [ ] **Step 3: Add Sentry capture to quiz finalization errors**

In `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts`, wrap DB errors:

```typescript
import * as Sentry from '@sentry/nextjs'

// In finalizeAttempt, after DB update error:
if (updateError) {
  Sentry.captureException(updateError, { tags: { feature: 'n400-finalize' } })
}
```

- [ ] **Step 4: Add SENTRY_DSN to Vercel env**

In Vercel dashboard → Settings → Environment Variables, add:
- `SENTRY_DSN`: your Sentry project DSN
- `NEXT_PUBLIC_SENTRY_DSN`: same value (for client-side)

- [ ] **Step 5: Commit**

```bash
git add apps/website/
git commit -m "feat(n400): add Sentry error tracking for Geocodio and quiz finalization"
```

---

## Phase 8 Complete ✅

GA4 + Meta Pixel client events wired. Server-side CAPI fires for `n400_mock_test_pass` and `n400_setup_complete`. Service Worker caches audio + questions with version-based invalidation. Sentry captures Geocodio and quiz errors.

**Next:** Proceed to [Phase 9 — Pre-Launch Verification](2026-05-13-n400app-phase-9-launch.md).
