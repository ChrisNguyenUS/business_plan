# N400 App — Phase 3: Auth + Setup Flow

> **Status (2026-05-26):** Code-side work landed in commits 88efc3e..6f78c24. Remaining work is environment/credentials only — see "Operator TODO" below. Task 7 was deliberately skipped: v1 page.tsx and layout.tsx already exist and are wired to Supabase via Phase 1 cleanup, and the master plan says "UI source of truth = v1 components."

> **Operator TODO (no code can land until these are set up):**
> - Task 1 — Google OAuth, Facebook OAuth in Supabase dashboard
> - Task 3 Step 2 — provision Upstash Redis via Vercel Marketplace, run `vercel env pull .env.local`
> - Task 4 Step 0 — sign up at geocod.io, add `GEOCODIO_API_KEY` to Vercel env + `.env.local`, run the curl smoke-test to confirm v1.7 response shape

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Google + Facebook OAuth into Supabase Auth, add `/n400app` to middleware auth guard, build the setup form (address → Geocodio → district), and render the dashboard shell.

**Architecture:** Extend existing `src/middleware.ts` to protect `/n400app/*` (except landing). New server action calls Geocodio API in-memory (no street address persisted). Upstash Redis rate-limits Geocodio calls. Dashboard is a Server Component with 4 mode cards.

**UI source of truth:** v1 pages under `apps/website/src/app/[locale]/n400app/*` and components under `src/components/n400/*`. Phase 1 of cleanup already swapped the dashboard to Supabase via `useN400UserState` and added the `/n400app` middleware gate (commits `634776d`, `13014de`, `6af08f5`). This plan completes the rest: OAuth providers, Geocodio integration, `/setup` form. Do not redesign existing pages.

**Tech Stack:** Supabase Auth (OAuth), `@upstash/redis`, `@upstash/ratelimit`, Geocodio REST API, Next.js Server Actions.

**Prerequisite:** Phase 1 complete (DB tables exist). Supabase project has Google + Facebook OAuth providers configured.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/middleware.ts` | Modify | Add N400_RE guard for `/n400app/*` |
| `src/app/[locale]/n400app/page.tsx` | Create | Landing page (public) + dashboard (auth-gated) |
| `src/app/[locale]/n400app/layout.tsx` | Create | N400 layout shell with header streak badge + disclaimer footer + Trợ giúp link |
| `src/app/[locale]/n400app/setup/page.tsx` | Create | Setup form UI |
| `src/app/[locale]/n400app/setup/actions.ts` | Create | Server action: Geocodio call + save profile |
| `src/app/[locale]/n400app/help/page.tsx` | Create | Help page stub (bilingual FAQ + contact placeholder) |
| `src/lib/n400/geocodio.ts` | Create | Geocodio API client (pure, testable) |
| `src/lib/n400/geocodio.test.ts` | Create | Unit tests for Geocodio response parsing |
| `src/lib/n400/rate-limit.ts` | Create | Upstash Redis rate limiter wrapper |

---

## Task 1: Configure OAuth providers in Supabase

- [ ] **Step 1: Enable Google OAuth**

In Supabase dashboard → Authentication → Providers → Google:
1. Enable Google provider
2. Add Google OAuth Client ID + Secret (from Google Cloud Console → APIs & Services → Credentials)
3. Authorized redirect URI: `https://ffsrlmtqzlidnuitkdvw.supabase.co/auth/v1/callback`

- [ ] **Step 2: Enable Facebook OAuth**

In Supabase dashboard → Authentication → Providers → Facebook:
1. Enable Facebook provider
2. Add Facebook App ID + Secret (from Meta Developer Console)
3. Authorized redirect URI: same as above

- [ ] **Step 3: Add env vars to Vercel + local .env**

No new env vars needed for OAuth — Supabase handles the redirect. Confirm existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

---

## Task 2: Extend middleware to protect /n400app/*

**Files:**
- Modify: `apps/website/src/middleware.ts`

- [x] **Step 1: Add N400 regex and profile-gate logic**

In `src/middleware.ts`, add after the existing `PORTAL_RE` line:

```typescript
const N400_RE = /^\/[a-z]{2}\/n400app(\/|$)/;
const N400_LANDING_RE = /^\/[a-z]{2}\/n400app\/?$/;
```

In the auth guard section, add N400 check after the existing `isPortalPath` check:

```typescript
const isN400Path = N400_RE.test(pathname);
const isN400Landing = N400_LANDING_RE.test(pathname);

// N400 landing is public; all other /n400app/* require auth
if (isN400Path && !isN400Landing) {
  if (!user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }
  // Profile gate: if no n400_user_profile, redirect to setup
  // (except if already on setup page)
  const isSetupPath = pathname.includes('/n400app/setup');
  if (!isSetupPath) {
    const { data: profile } = await supabase
      .from('n400_user_profile')
      .select('user_id')
      .eq('user_id', user.id)
      .single();
    if (!profile) {
      return NextResponse.redirect(new URL(`/${locale}/n400app/setup`, request.url));
    }
  }
}
```

Also update the early-return condition so N400 paths don't skip auth:
```typescript
if (!isAdminPath && !isPortalPath && !isN400Path) {
  return NextResponse.next();
}
```

- [x] **Step 2: Verify middleware compiles**

```bash
cd apps/website && npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors.

- [x] **Step 3: Commit**

```bash
git add apps/website/src/middleware.ts
git commit -m "feat(n400): extend middleware to protect /n400app/* with profile gate"
```

---

## Task 3: Install Upstash Redis + write rate limiter

**Files:**
- Modify: `apps/website/package.json`
- Create: `apps/website/src/lib/n400/rate-limit.ts`

- [x] **Step 1: Install Upstash packages**

```bash
cd apps/website && npm install --save @upstash/redis@1.34.3 @upstash/ratelimit@2.0.5
```

- [ ] **Step 2: Add Upstash env vars**

Provision Upstash Redis via Vercel Marketplace (free tier). This auto-adds to Vercel env:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Pull to local:
```bash
vercel env pull .env.local
```

- [x] **Step 3: Create rate limiter**

Create `apps/website/src/lib/n400/rate-limit.ts`:

```typescript
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 5 Geocodio calls per IP per hour
export const geocodioIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'n400:geocodio:ip',
})

// 10 Geocodio calls per user per day
export const geocodioUserLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '24 h'),
  prefix: 'n400:geocodio:user',
})
```

- [x] **Step 4: Commit**

```bash
git add apps/website/package.json apps/website/package-lock.json apps/website/src/lib/n400/rate-limit.ts
git commit -m "feat(n400): add Upstash Redis rate limiter for Geocodio calls"
```

---

## Task 4: Geocodio client + unit tests

**Files:**
- Create: `apps/website/src/lib/n400/geocodio.ts`
- Create: `apps/website/src/lib/n400/geocodio.test.ts`

- [ ] **Step 0: Verify Geocodio v1.7 response shape (pre-task)**

Before writing the parser, run a live test call with a known Houston address to confirm the exact field path for congressional districts:

```bash
curl -s "https://api.geocod.io/v1.7/geocode?q=9800+Bellaire+Blvd,+Houston,+TX+77036&fields=cd&api_key=<YOUR_KEY>" | jq '.results[0].fields'
```

Confirm:
- The congressional district data lives at `results[0].fields.congressional_districts` (not `cd` or another key)
- Each district object has `district_number` (int) and `state_abbreviation` (string)
- If the field path differs, update the parser and tests below before proceeding

- [x] **Step 1: Write failing tests**

Create `apps/website/src/lib/n400/geocodio.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseGeocodioResponse } from './geocodio'

const MOCK_SUCCESS = {
  results: [{
    fields: {
      congressional_districts: [{
        district_number: 9,
        state_abbreviation: 'TX',
      }]
    }
  }]
}

const MOCK_AMBIGUOUS = {
  results: [{
    fields: {
      congressional_districts: [
        { district_number: 7, state_abbreviation: 'TX' },
        { district_number: 9, state_abbreviation: 'TX' },
      ]
    }
  }]
}

const MOCK_EMPTY = { results: [] }

describe('parseGeocodioResponse', () => {
  it('returns district number on unambiguous success', () => {
    expect(parseGeocodioResponse(MOCK_SUCCESS)).toEqual({ districtNumber: 9, stateCode: 'TX' })
  })

  it('returns null when ambiguous (>1 district returned)', () => {
    expect(parseGeocodioResponse(MOCK_AMBIGUOUS)).toBeNull()
  })

  it('returns null when no results', () => {
    expect(parseGeocodioResponse(MOCK_EMPTY)).toBeNull()
  })
})
```

- [x] **Step 2: Run — expect FAIL**

```bash
cd apps/website && npm test -- src/lib/n400/geocodio.test.ts
```

Expected: `Cannot find module './geocodio'`

- [x] **Step 3: Implement Geocodio client**

Create `apps/website/src/lib/n400/geocodio.ts`:

```typescript
export interface GeocodeResult {
  districtNumber: number
  stateCode: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseGeocodioResponse(data: any): GeocodeResult | null {
  const districts = data?.results?.[0]?.fields?.congressional_districts
  if (!districts || districts.length === 0) return null
  // Spec §5.1: ambiguous (>1 district) → null. Saving the first match silently is wrong.
  if (districts.length > 1) return null
  const d = districts[0]
  if (typeof d.district_number !== 'number' || typeof d.state_abbreviation !== 'string') return null
  return {
    districtNumber: d.district_number,
    stateCode: d.state_abbreviation,
  }
}

export class GeocodioError extends Error {
  // Generic message only — never include the input address. Caller scrubs further before Sentry.
  constructor(public readonly status: number) { super(`Geocodio request failed (${status})`) }
}

export async function geocodeAddress(params: {
  street: string
  city: string
  state: string
  zip: string
  apiKey: string
}): Promise<GeocodeResult | null> {
  // Build the query but DO NOT include it in any thrown error message.
  const query = `${params.street}, ${params.city}, ${params.state} ${params.zip}`
  const url = new URL('https://api.geocod.io/v1.7/geocode')
  url.searchParams.set('q', query)
  url.searchParams.set('fields', 'cd')

  // Auth via header — keeps the API key out of any incidental URL/query logging.
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${params.apiKey}` },
  })
  if (!res.ok) throw new GeocodioError(res.status)

  const data = await res.json()
  return parseGeocodioResponse(data)
}
```

- [x] **Step 4: Run tests — expect PASS**

```bash
cd apps/website && npm test -- src/lib/n400/geocodio.test.ts
```

Expected: `3 tests passed`

- [x] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/geocodio.ts apps/website/src/lib/n400/geocodio.test.ts
git commit -m "feat(n400): add Geocodio client with unit tests"
```

---

## Task 5: Setup form server action

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/setup/actions.ts`

- [x] **Step 1: Create server action**

Create `apps/website/src/app/[locale]/n400app/setup/actions.ts`:

```typescript
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { geocodeAddress, GeocodioError } from '@/lib/n400/geocodio'
import { geocodioIpLimiter, geocodioUserLimiter } from '@/lib/n400/rate-limit'

function extractClientIp(forwardedFor: string | null): string {
  // Vercel's edge populates x-forwarded-for and strips/normalizes client-supplied values.
  // Take the first comma-separated token. Combined with user.id below so a spoofed IP still hits per-user caps.
  if (!forwardedFor) return 'unknown'
  return forwardedFor.split(',')[0]?.trim() || 'unknown'
}

export async function saveSetupProfile(formData: FormData) {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Rate limiting — IP key is `<ip>:<user.id>` so spoofed XFF values still count against the user.
  const ip = extractClientIp(headerStore.get('x-forwarded-for'))
  const { success: ipOk } = await geocodioIpLimiter.limit(`${ip}:${user.id}`)
  if (!ipOk) {
    return { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ. / Too many requests. Please try again in 1 hour.' }
  }

  const { success: userOk } = await geocodioUserLimiter.limit(user.id)
  if (!userOk) {
    return { error: 'Đã vượt quá giới hạn hôm nay. Vui lòng thử lại ngày mai. / Daily limit reached. Please try again tomorrow.' }
  }

  // Extract form fields (street address NOT saved)
  const street = formData.get('street') as string
  const city = formData.get('city') as string
  const state = formData.get('state') as string
  const zip = formData.get('zip') as string

  if (!street || !city || !state || !zip) {
    return { error: 'Vui lòng điền đầy đủ thông tin. / Please fill in all fields.' }
  }

  if (!/^\d{5}$/.test(zip)) {
    return { error: 'Zipcode phải có 5 chữ số. / Zipcode must be 5 digits.' }
  }

  // Geocode (street address used in-memory only, not persisted)
  let districtNumber: number | null = null
  let stateFromGeo: string | null = null
  try {
    const result = await geocodeAddress({
      street, city, state, zip,
      apiKey: process.env.GEOCODIO_API_KEY!,
    })
    districtNumber = result?.districtNumber ?? null
    stateFromGeo  = result?.stateCode ?? null
  } catch (err) {
    if (err instanceof GeocodioError) {
      // err.message is generic — never includes the input address. Safe to log/Sentry.
      // (Phase 8 wraps this with Sentry.captureException; the GeocodioError class guarantees no PII leakage.)
    }
    return { error: 'Không thể xác định khu vực. Vui lòng kiểm tra lại địa chỉ. / Could not determine your district. Please check your address.' }
  }

  // Ambiguous (parser returned null because >1 district) — save profile but mark district unresolved.
  // UI will show "Chưa xác định được đại biểu của bạn" for Q29 and prompt user to retry with more specific address.
  // Save profile (no street_address field)
  const { error: dbError } = await supabase.from('n400_user_profile').upsert({
    user_id: user.id,
    city,
    state_code: stateFromGeo ?? state,
    zipcode: zip,
    district_number: districtNumber,
    district_resolved_at: districtNumber ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (dbError) return { error: 'Lỗi lưu dữ liệu. Vui lòng thử lại. / Error saving data. Please try again.' }

  redirect(`/n400app`)
}
```

Add `GEOCODIO_API_KEY` to Vercel env vars and local `.env.local`.

- [x] **Step 2: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/setup/actions.ts
git commit -m "feat(n400): add setup form server action with Geocodio + rate limiting"
```

---

## Task 6: Setup form UI

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/setup/page.tsx`

- [x] **Step 1: Create setup page**

Create `apps/website/src/app/[locale]/n400app/setup/page.tsx`:

```typescript
'use client'

import { useFormStatus } from 'react-dom'
import { saveSetupProfile } from './actions'

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full bg-blue-600 text-white rounded-lg px-4 py-4 text-lg font-semibold mt-2 disabled:opacity-60"
    >
      {pending ? 'Đang xác định khu vực... / Resolving district...' : 'Tiếp tục / Continue →'}
    </button>
  )
}

export default function SetupPage({ searchParams }: { searchParams?: { city?: string; state?: string; zip?: string } }) {
  // searchParams pre-fill the form when the user arrives via the dashboard "Đổi địa chỉ" link.
  const prefill = searchParams ?? {}

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Cho biết bạn đang ở đâu</h1>
        <p className="text-lg font-semibold text-gray-600 mb-1">Where do you live?</p>

        <p className="text-sm text-gray-500 mb-6">
          Vui lòng điền địa chỉ chính xác để app xác định đúng đáp án cho câu hỏi về Hạ nghị sĩ khu vực bạn đang sinh sống. Zipcode đôi khi chồng lên nhiều khu vực bầu cử, nên cần địa chỉ cụ thể.
          <br />
          <span className="text-gray-400">Please enter your accurate address so we can identify your U.S. Representative. Zipcodes sometimes span multiple districts.</span>
        </p>

        <p className="text-xs text-gray-400 mb-6">
          Địa chỉ đầy đủ được gửi đến Geocodio (dịch vụ tra cứu khu vực bầu cử) chỉ để xác định Hạ nghị sĩ của bạn — không lưu trữ trên hệ thống của chúng tôi.
          <br />
          Your full address is sent to Geocodio (a districting lookup service) solely to identify your Representative — it is not stored on our servers.
        </p>

        <form action={saveSetupProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Địa chỉ nhà / Street Address <span className="text-red-500">*</span>
            </label>
            <input
              name="street"
              type="text"
              required
              autoComplete="street-address"
              placeholder="123 Main St"
              className="w-full border rounded-lg px-4 py-3 text-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Thành phố / City <span className="text-red-500">*</span>
              </label>
              <input
                name="city"
                type="text"
                required
                autoComplete="address-level2"
                defaultValue={prefill.city ?? ''}
                placeholder="Houston"
                className="w-full border rounded-lg px-4 py-3 text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Zipcode <span className="text-red-500">*</span>
              </label>
              <input
                name="zip"
                type="text"
                inputMode="numeric"
                required
                pattern="\d{5}"
                maxLength={5}
                autoComplete="postal-code"
                defaultValue={prefill.zip ?? ''}
                placeholder="77083"
                className="w-full border rounded-lg px-4 py-3 text-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tiểu bang / State <span className="text-red-500">*</span>
            </label>
            <select
              name="state"
              required
              defaultValue={prefill.state ?? 'TX'}
              className="w-full border rounded-lg px-4 py-3 text-lg"
            >
              <option value="">-- Chọn tiểu bang / Select state --</option>
              {US_STATES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          <SubmitButton />
        </form>
      </div>
    </div>
  )
}
```

- [x] **Step 2: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/setup/page.tsx
git commit -m "feat(n400): add setup form UI with bilingual labels"
```

---

## Task 7: N400 layout + landing/dashboard page

> **SKIPPED 2026-05-26.** v1's `layout.tsx` and `page.tsx` already exist and were wired to Supabase via the Phase 1 cleanup hook (`useN400UserState`). Replacing them with the proposed Server Component would discard the v1 visuals — and the master plan explicitly says "UI source of truth = v1 components." Leave existing files untouched. The dashboard's "Đổi địa chỉ" deep-link (with prefilled `city`/`state`/`zip`) into `/setup` already works because the setup page reads those query params.

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/layout.tsx`
- Create: `apps/website/src/app/[locale]/n400app/page.tsx`

- [ ] **Step 1: Create layout**

Create `apps/website/src/app/[locale]/n400app/layout.tsx`:

```typescript
export default function N400Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      <footer className="text-center text-xs text-gray-400 py-4 px-4 border-t">
        Tài liệu học liệu. Không phải tư vấn pháp lý. Nội dung lấy từ USCIS.gov. /
        Study material only. Not legal advice. Content sourced from USCIS.gov.
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Create landing + dashboard page**

Create `apps/website/src/app/[locale]/n400app/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('n400_user_profile')
    .select('current_streak, longest_streak, state_code, city, zipcode, district_number')
    .eq('user_id', user.id)
    .single()

  return { user, profile }
}

export default async function N400Page() {
  const { user, profile } = await getUser()

  // Landing page for unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Luyện Thi Quốc Tịch Mỹ</h1>
        <p className="text-xl text-gray-600 mb-2">U.S. Citizenship Test Practice</p>
        <p className="text-gray-500 mb-8 max-w-md">
          128 câu hỏi thi quốc tịch, song ngữ Anh-Việt, có audio phát âm chuẩn.
          <br />
          <span className="text-sm">128 civics questions, bilingual EN/VI, with pronunciation audio.</span>
        </p>
        <Link
          href="/login"
          className="bg-blue-600 text-white rounded-xl px-8 py-4 text-xl font-semibold"
        >
          Bắt đầu học / Get Started
        </Link>
      </div>
    )
  }

  // Dashboard for authenticated users
  const streak = profile?.current_streak ?? 0
  const modes = [
    { href: '/n400app/practice', emoji: '📝', title: 'Luyện Tập', subtitle: 'Daily Practice', desc: 'Chọn số câu và luyện tập ngẫu nhiên' },
    { href: '/n400app/mock-test', emoji: '🎯', title: 'Thi Thử', subtitle: 'Mock Test', desc: 'Giả lập phỏng vấn thật: 20 câu, cần đúng 12' },
    { href: '/n400app/flashcards', emoji: '🃏', title: 'Thẻ Ghi Nhớ', subtitle: 'Flashcards', desc: 'Học từng câu, lật thẻ xem đáp án' },
    { href: '/n400app/all-questions', emoji: '📚', title: 'Xem Tất Cả', subtitle: 'All 128 Questions', desc: 'Duyệt toàn bộ 128 câu hỏi và đáp án' },
  ]

  return (
    <div className="max-w-2xl mx-auto p-6">
      {streak > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-center">
          <span className="text-3xl">🔥</span>
          <p className="text-xl font-bold">{streak} ngày liên tiếp</p>
          <p className="text-sm text-gray-500">Kỷ lục: {profile?.longest_streak ?? 0} ngày</p>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">Chọn chế độ học / Choose a mode</h1>

      <div className="grid grid-cols-1 gap-4">
        {modes.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex items-center gap-4 border rounded-xl p-5 hover:bg-gray-50 active:bg-gray-100"
          >
            <span className="text-4xl">{m.emoji}</span>
            <div>
              <p className="text-xl font-semibold">{m.title}</p>
              <p className="text-sm text-gray-500">{m.subtitle}</p>
              <p className="text-sm text-gray-400 mt-1">{m.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Change-address link — re-runs setup with city/state/zip pre-filled (street empty) */}
      {profile?.state_code && (
        <div className="text-center mt-6 text-sm">
          <Link
            href={{
              pathname: '/n400app/setup',
              query: { city: profile.city ?? '', state: profile.state_code, zip: profile.zipcode ?? '' },
            }}
            className="text-blue-600 hover:underline"
          >
            Đổi địa chỉ / Change address
          </Link>
          <p className="text-gray-400 text-xs mt-1">
            Dùng cho câu hỏi về Hạ nghị sĩ khu vực / Used for the U.S. Representative question
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/layout.tsx apps/website/src/app/[locale]/n400app/page.tsx
git commit -m "feat(n400): add N400 layout, landing page, and dashboard"
```

---

## Task 8: Help page stub

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/help/page.tsx`

- [x] **Step 1: Create help page**

Create `apps/website/src/app/[locale]/n400app/help/page.tsx`:

```typescript
import Link from 'next/link'

const faqs = [
  {
    q_vi: 'Bài thi quốc tịch N-400 là gì?',
    q_en: 'What is the N-400 civics test?',
    a_vi: 'Đây là bài thi kiến thức công dân do USCIS tổ chức trong buổi phỏng vấn xin nhập tịch. Bạn cần trả lời đúng 12 trong 20 câu hỏi để đạt.',
    a_en: 'This is a civics knowledge test administered by USCIS during the naturalization interview. You need to answer 12 out of 20 questions correctly to pass.',
  },
  {
    q_vi: 'App này hoạt động như thế nào?',
    q_en: 'How does this app work?',
    a_vi: 'App có 4 chế độ học: Thi Thử (giả lập phỏng vấn thật), Luyện Tập hàng ngày, Thẻ Ghi Nhớ, và Xem Tất Cả 128 câu. Tất cả câu hỏi và đáp án đều song ngữ Anh-Việt với audio phát âm.',
    a_en: 'The app has 4 study modes: Mock Test (simulates the real interview), Daily Practice, Flashcards, and View All 128 questions. All questions and answers are bilingual EN/VI with pronunciation audio.',
  },
  {
    q_vi: 'Tôi cần hỗ trợ hoặc muốn nộp đơn N-400?',
    q_en: 'Need help or want to file your N-400?',
    a_vi: 'Liên hệ Manna One Solution để được tư vấn và hỗ trợ nộp đơn N-400.',
    a_en: 'Contact Manna One Solution for N-400 filing assistance and consultation.',
  },
]

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/n400app" className="text-sm text-muted-foreground hover:underline">← Về trang chủ / Home</Link>
      </div>

      <h1 className="text-2xl font-bold mb-1">Trợ Giúp</h1>
      <p className="text-muted-foreground mb-8">Help & FAQ</p>

      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <div key={i} className="border rounded-xl p-5">
            <p className="font-semibold text-base mb-1">{faq.q_vi}</p>
            <p className="text-sm text-muted-foreground mb-3">{faq.q_en}</p>
            <p className="text-base">{faq.a_vi}</p>
            <p className="text-sm text-muted-foreground mt-1">{faq.a_en}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 border rounded-xl p-5 bg-accent">
        <p className="font-semibold mb-1">Liên hệ / Contact</p>
        <p className="text-sm text-muted-foreground mb-3">Manna One Solution</p>
        {/* TODO: replace with real contact info before launch */}
        <p className="text-base">📞 [Số điện thoại / Phone number]</p>
        <p className="text-base">📧 [Email]</p>
        <p className="text-base">📍 Houston, TX</p>
      </div>
    </div>
  )
}
```

- [x] **Step 2: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/help/page.tsx
git commit -m "feat(n400): add help page stub with bilingual FAQ"
```

---

## Phase 3 Complete ✅

OAuth providers configured, middleware guards `/n400app/*`, setup form collects address → Geocodio → saves district, dashboard shows 4 mode cards + streak, help page stub live.

**Next:** Proceed to [Phase 4 — Mock Test](2026-05-13-n400app-phase-4-mock-test.md).
