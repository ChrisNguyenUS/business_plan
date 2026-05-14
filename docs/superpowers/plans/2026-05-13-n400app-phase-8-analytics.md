# N400 App — Phase 8: Analytics + Monitoring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire GA4 events, Meta CAPI server-side for conversion events, Service Worker with content-version cache busting, and Sentry error tracking.

**Architecture:** Client-side GA4 + Pixel for funnel events. Server-side CAPI (via existing `lib/analytics/meta-capi.ts`) for `n400_mock_test_pass` and `n400_setup_complete` — these are high-value conversion events that must not be spoofable. Service Worker scoped to `/n400app/*` with version hash check.

**Tech Stack:** Existing `lib/analytics/events.ts` + `lib/analytics/meta-capi.ts` patterns, Next.js Service Worker via `public/sw-n400.js`, Sentry (already configured or add via `@sentry/nextjs`).

**Prerequisite:** Phase 4 complete (mock test finalization), Phase 3 complete (setup action). Existing Meta CAPI pattern from Phase 4 website.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/n400/analytics.ts` | Create | N400-specific analytics event helpers |
| `src/app/api/n400/content-version/route.ts` | Create | Returns content hash for SW cache busting |
| `public/sw-n400.js` | Create | Service Worker scoped to /n400app/* |
| `src/app/[locale]/n400app/layout.tsx` | Modify | Register SW on mount |
| `src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts` | Modify | Fire CAPI on pass |
| `src/app/[locale]/n400app/setup/actions.ts` | Modify | Fire CAPI on setup complete |

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

- [ ] **Step 2: Fire CAPI on mock test pass**

In `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts`, add to `finalizeAttempt` after computing `passed`:

```typescript
// Add import at top of file:
import { sendCapiEvent } from '@/lib/analytics/meta-capi'
import { generateEventId } from '@/lib/analytics/events'

// Add inside finalizeAttempt, after the DB update, only when passed === true:
if (passed) {
  try {
    await sendCapiEvent({
      eventName: 'n400_mock_test_pass',
      eventId: generateEventId(),
      userId: user.id,
      userEmail: user.email,
      customData: { score, total_questions: total },
    })
  } catch {
    // Non-blocking — analytics failure should not break the user flow
  }
}
```

- [ ] **Step 3: Fire CAPI on setup complete**

In `apps/website/src/app/[locale]/n400app/setup/actions.ts`, add after successful profile save:

```typescript
// Add import at top:
import { sendCapiEvent } from '@/lib/analytics/meta-capi'
import { generateEventId } from '@/lib/analytics/events'

// Add after successful supabase upsert, before redirect:
try {
  await sendCapiEvent({
    eventName: 'n400_setup_complete',
    eventId: generateEventId(),
    userId: user.id,
    userEmail: user.email,
    customData: { state_code: state },
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

## Task 3: Content version API route (for SW cache busting)

**Files:**
- Create: `apps/website/src/app/api/n400/content-version/route.ts`

- [ ] **Step 1: Create route**

Create `apps/website/src/app/api/n400/content-version/route.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

export const revalidate = 60  // cache for 1 minute

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  // Get latest updated_at across all content tables
  const { data: questions } = await supabase
    .from('n400_questions')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)

  const latestUpdate = questions?.[0]?.updated_at ?? '0'
  const hash = createHash('sha256').update(latestUpdate).digest('hex').slice(0, 8)

  return NextResponse.json({ version_hash: hash }, {
    headers: { 'Cache-Control': 'public, max-age=60' }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/app/api/n400/content-version/route.ts
git commit -m "feat(n400): add content-version API route for Service Worker cache busting"
```

---

## Task 4: Service Worker

**Files:**
- Create: `apps/website/public/sw-n400.js`
- Modify: `apps/website/src/app/[locale]/n400app/layout.tsx`

- [ ] **Step 1: Create Service Worker**

Create `apps/website/public/sw-n400.js`:

```javascript
const CACHE_NAME = 'n400-v1'
const CONTENT_VERSION_URL = '/api/n400/content-version'
const QUESTIONS_URL = '/api/n400/questions-with-answers'

// Cache audio files and question data
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only handle n400app routes and n400 API routes
  if (!url.pathname.startsWith('/n400app') && !url.pathname.startsWith('/api/n400')) {
    return
  }

  // Never cache content-version endpoint
  if (url.pathname === CONTENT_VERSION_URL) return

  // For audio files (Supabase Storage): cache-first
  if (url.hostname.includes('supabase') && url.pathname.includes('n400-audio')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      })
    )
    return
  }

  // For questions API: network-first with version check
  if (url.pathname === QUESTIONS_URL) {
    event.respondWith(
      fetch(CONTENT_VERSION_URL)
        .then(async (versionRes) => {
          const { version_hash } = await versionRes.json()
          const cache = await caches.open(CACHE_NAME)
          const cachedVersion = await cache.match('n400-content-version')
          const cachedVersionData = cachedVersion ? await cachedVersion.json() : null

          // If version changed, clear question cache
          if (cachedVersionData?.version_hash !== version_hash) {
            await cache.delete(QUESTIONS_URL)
            await cache.put('n400-content-version', new Response(JSON.stringify({ version_hash })))
          }

          const cached = await cache.match(QUESTIONS_URL)
          if (cached) return cached

          const response = await fetch(event.request)
          if (response.ok) cache.put(event.request, response.clone())
          return response
        })
        .catch(() => caches.match(QUESTIONS_URL))
    )
    return
  }
})
```

- [ ] **Step 2: Register SW in N400 layout**

Add SW registration to `apps/website/src/app/[locale]/n400app/layout.tsx`. Add a client component for SW registration:

Create `apps/website/src/components/n400/RegisterSW.tsx`:

```typescript
'use client'

import { useEffect } from 'react'

export function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-n400.js', { scope: '/n400app/' })
        .catch(() => {/* SW registration failure is non-critical */})
    }
  }, [])
  return null
}
```

Add `<RegisterSW />` to the N400 layout (inside the `<div>` wrapper, before `<header>`):

```typescript
// Add import:
import { RegisterSW } from '@/components/n400/RegisterSW'

// Add inside layout JSX, before <header>:
<RegisterSW />
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/public/sw-n400.js \
        apps/website/src/components/n400/RegisterSW.tsx \
        apps/website/src/app/[locale]/n400app/layout.tsx
git commit -m "feat(n400): add Service Worker with content-version cache busting"
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

- [ ] **Step 2: Add Sentry capture to Geocodio errors**

In `apps/website/src/lib/n400/geocodio.ts`, wrap the fetch call:

```typescript
import * as Sentry from '@sentry/nextjs'

// In geocodeAddress, update the catch:
} catch (err) {
  Sentry.captureException(err, { tags: { feature: 'n400-geocodio' } })
  throw err
}
```

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
