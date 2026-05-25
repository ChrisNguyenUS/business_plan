# N400 App — Phase 6: Streak System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement daily streak tracking — DB transitions on session completion, header badge, dashboard card with milestone progress bar, and celebration modals at 3/7/14/30/100 days.

**UI source of truth:** v1 streak card on `/n400app` dashboard already uses `state.streak.current/longest/lastActivityDate`. Phase 1 of cleanup wired those to `n400_user_profile` via `useN400UserState`. This phase adds milestone modals + header badge; reuse v1 styling, do not redesign existing streak card.

**Architecture:** Streak logic is a pure function (testable). Server action `updateStreak` is called after `finalizeAttempt` / `finalizePractice` / `saveFlaschardSession`. Day attribution uses `started_at` in `America/Chicago` timezone. Idempotent via DB guard.

**Tech Stack:** Next.js Server Actions, Supabase, `date-fns-tz` for timezone handling.

**Prerequisite:** Phase 5 complete (all 3 modes save attempts to DB).

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/n400/streak.ts` | Create | Pure streak transition logic |
| `src/lib/n400/streak.test.ts` | Create | Unit tests for streak transitions |
| `src/lib/n400/streak-actions.ts` | Create | Server action: updateStreak |
| `src/components/n400/StreakBadge.tsx` | Create | Header 🔥 badge |
| `src/components/n400/StreakCard.tsx` | Create | Dashboard streak card with progress bar |
| `src/components/n400/MilestoneModal.tsx` | Create | Celebration modal at milestones |
| `src/app/[locale]/n400app/layout.tsx` | Modify | Add StreakBadge to header |

---

## Task 1: Streak logic unit tests + implementation

**Files:**
- Create: `apps/website/src/lib/n400/streak.ts`
- Create: `apps/website/src/lib/n400/streak.test.ts`

- [ ] **Step 1: Install date-fns-tz**

```bash
cd apps/website && npm install --save date-fns-tz@3.2.0
```

- [ ] **Step 2: Write failing tests**

Create `apps/website/src/lib/n400/streak.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeStreakUpdate } from './streak'

describe('computeStreakUpdate', () => {
  it('increments streak when activity is next day', () => {
    const result = computeStreakUpdate({
      lastActivityDate: '2026-05-13',
      activityDay: '2026-05-14',
      currentStreak: 5,
      longestStreak: 10,
    })
    expect(result.currentStreak).toBe(6)
    expect(result.lastActivityDate).toBe('2026-05-14')
    expect(result.longestStreak).toBe(10)
  })

  it('resets streak when gap > 1 day', () => {
    const result = computeStreakUpdate({
      lastActivityDate: '2026-05-10',
      activityDay: '2026-05-14',
      currentStreak: 5,
      longestStreak: 10,
    })
    expect(result.currentStreak).toBe(1)
    expect(result.lastActivityDate).toBe('2026-05-14')
  })

  it('no-ops when same day', () => {
    const result = computeStreakUpdate({
      lastActivityDate: '2026-05-14',
      activityDay: '2026-05-14',
      currentStreak: 5,
      longestStreak: 10,
    })
    expect(result).toBeNull()
  })

  it('updates longestStreak when current exceeds it', () => {
    const result = computeStreakUpdate({
      lastActivityDate: '2026-05-13',
      activityDay: '2026-05-14',
      currentStreak: 10,
      longestStreak: 10,
    })
    expect(result?.longestStreak).toBe(11)
  })

  it('starts streak from 1 when no prior activity', () => {
    const result = computeStreakUpdate({
      lastActivityDate: null,
      activityDay: '2026-05-14',
      currentStreak: 0,
      longestStreak: 0,
    })
    expect(result?.currentStreak).toBe(1)
  })

  it('detects milestone at 7', () => {
    const result = computeStreakUpdate({
      lastActivityDate: '2026-05-13',
      activityDay: '2026-05-14',
      currentStreak: 6,
      longestStreak: 6,
    })
    expect(result?.milestoneReached).toBe(7)
  })
})
```

- [ ] **Step 3: Run — expect FAIL**

```bash
cd apps/website && npm test -- src/lib/n400/streak.test.ts
```

Expected: `Cannot find module './streak'`

- [ ] **Step 4: Implement streak logic**

Create `apps/website/src/lib/n400/streak.ts`:

```typescript
const MILESTONES = [3, 7, 14, 30, 100]

export interface StreakInput {
  lastActivityDate: string | null  // 'YYYY-MM-DD' or null
  activityDay: string              // 'YYYY-MM-DD' in America/Chicago
  currentStreak: number
  longestStreak: number
}

export interface StreakUpdate {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string
  milestoneReached: number | null
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay)
}

export function computeStreakUpdate(input: StreakInput): StreakUpdate | null {
  const { lastActivityDate, activityDay, currentStreak, longestStreak } = input

  // Same day — already counted
  if (lastActivityDate === activityDay) return null

  let newStreak: number
  if (!lastActivityDate) {
    newStreak = 1
  } else {
    const diff = daysBetween(lastActivityDate, activityDay)
    newStreak = diff === 1 ? currentStreak + 1 : 1
  }

  const newLongest = Math.max(longestStreak, newStreak)
  const milestoneReached = MILESTONES.find(m => newStreak === m) ?? null

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActivityDate: activityDay,
    milestoneReached,
  }
}

export function getActivityDay(startedAt: string): string {
  // Convert ISO timestamp to YYYY-MM-DD in America/Chicago
  const date = new Date(startedAt)
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

export function isTodayActive(lastActivityDate: string | null): boolean {
  if (!lastActivityDate) return false
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  return lastActivityDate === today
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd apps/website && npm test -- src/lib/n400/streak.test.ts
```

Expected: `7 tests passed`

- [ ] **Step 6: Commit**

```bash
git add apps/website/src/lib/n400/streak.ts apps/website/src/lib/n400/streak.test.ts \
        apps/website/package.json apps/website/package-lock.json
git commit -m "feat(n400): implement streak logic with unit tests"
```

---

## Task 2: updateStreak server action

**Files:**
- Create: `apps/website/src/lib/n400/streak-actions.ts`

- [ ] **Step 1: Create server action**

Create `apps/website/src/lib/n400/streak-actions.ts`:

```typescript
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeStreakUpdate, getActivityDay } from './streak'

export async function updateStreak(attemptId: string): Promise<{ milestoneReached: number | null } | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Count answers in this attempt (must be ≥5 to count for streak)
  const { count } = await supabase
    .from('n400_question_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('attempt_id', attemptId)

  if (!count || count < 5) return null

  // Get attempt started_at for day attribution
  const { data: attempt } = await supabase
    .from('n400_quiz_attempts')
    .select('started_at')
    .eq('id', attemptId)
    .single()

  if (!attempt) return null

  const activityDay = getActivityDay(attempt.started_at)

  // Get current profile
  const { data: profile } = await supabase
    .from('n400_user_profile')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', user.id)
    .single()

  if (!profile) return null

  const update = computeStreakUpdate({
    lastActivityDate: profile.last_activity_date,
    activityDay,
    currentStreak: profile.current_streak,
    longestStreak: profile.longest_streak,
  })

  if (!update) return null  // same day, no-op

  // Idempotency guard: only update if last_activity_date hasn't changed since we read it.
  // ⚠️ PostgreSQL `=` returns NULL (not true) when comparing to NULL — so first-time users
  // (last_activity_date IS NULL) need an `is.null` guard, not `eq('', '')`. Using a query
  // builder with `.is(...)` for the null branch and `.eq(...)` for the value branch.
  const updateBuilder = supabase
    .from('n400_user_profile')
    .update({
      current_streak: update.currentStreak,
      longest_streak: update.longestStreak,
      last_activity_date: update.lastActivityDate,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  const { error } = profile.last_activity_date === null
    ? await updateBuilder.is('last_activity_date', null)
    : await updateBuilder.eq('last_activity_date', profile.last_activity_date)

  if (error) {
    // If the row was already updated by a concurrent request, the WHERE matched 0 rows
    // and Supabase returns no error — but if a real error occurred, swallow it (analytics-style).
    return null
  }

  return { milestoneReached: update.milestoneReached }
}
```

- [ ] **Step 2: Wire updateStreak into finalizeAttempt and finalizePractice**

In `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts`, add at end of `finalizeAttempt`:

```typescript
// Add import at top:
import { updateStreak } from '@/lib/n400/streak-actions'

// Add at end of finalizeAttempt, before return:
await updateStreak(attemptId)
```

In `apps/website/src/app/[locale]/n400app/practice/actions.ts`, add at end of `finalizePractice`:

```typescript
import { updateStreak } from '@/lib/n400/streak-actions'
// Add at end of finalizePractice, before return:
await updateStreak(attemptId)
```

In `apps/website/src/app/[locale]/n400app/flashcards/actions.ts`, add after saving attempt:

```typescript
import { updateStreak } from '@/lib/n400/streak-actions'
// After supabase insert of attempt, add:
if (attempt) await updateStreak(attempt.id)
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/n400/streak-actions.ts \
        apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts \
        apps/website/src/app/[locale]/n400app/practice/actions.ts \
        apps/website/src/app/[locale]/n400app/flashcards/actions.ts
git commit -m "feat(n400): wire streak update into all quiz finalization actions"
```

---

## Task 3: Streak UI components

**Files:**
- Create: `apps/website/src/components/n400/StreakBadge.tsx`
- Create: `apps/website/src/components/n400/StreakCard.tsx`
- Create: `apps/website/src/components/n400/MilestoneModal.tsx`
- Modify: `apps/website/src/app/[locale]/n400app/layout.tsx`

- [ ] **Step 1: Create StreakBadge**

Create `apps/website/src/components/n400/StreakBadge.tsx`:

```typescript
interface StreakBadgeProps {
  streak: number
  isActiveToday: boolean
}

export function StreakBadge({ streak, isActiveToday }: StreakBadgeProps) {
  if (streak === 0) return null
  return (
    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${isActiveToday ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
      🔥 {streak}
    </div>
  )
}
```

- [ ] **Step 2: Create StreakCard**

Create `apps/website/src/components/n400/StreakCard.tsx`:

```typescript
import { isTodayActive } from '@/lib/n400/streak'

const MILESTONES = [3, 7, 14, 30, 100]

interface StreakCardProps {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
}

export function StreakCard({ currentStreak, longestStreak, lastActivityDate }: StreakCardProps) {
  const activeToday = isTodayActive(lastActivityDate)
  const nextMilestone = MILESTONES.find(m => m > currentStreak) ?? 100
  const prevMilestone = [...MILESTONES].reverse().find(m => m <= currentStreak) ?? 0
  const progress = nextMilestone === prevMilestone ? 100
    : Math.round(((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100)

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-xl font-bold">{currentStreak} ngày liên tiếp</p>
            <p className="text-sm text-gray-500">Kỷ lục: {longestStreak} ngày</p>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{currentStreak} ngày</span>
          <span>Mục tiêu: {nextMilestone} ngày</span>
        </div>
        <div className="w-full bg-orange-100 rounded-full h-2">
          <div className="bg-orange-400 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {!activeToday && (
        <p className="text-sm text-orange-600 mt-3 font-medium">
          Bạn chưa học cho ngày hôm nay. Hãy bắt đầu ngay! / You haven't studied today yet!
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create MilestoneModal**

Create `apps/website/src/components/n400/MilestoneModal.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'

interface MilestoneModalProps {
  milestone: number | null
  onClose: () => void
}

const MILESTONE_MESSAGES: Record<number, { emoji: string; vi: string; en: string }> = {
  3:   { emoji: '🌱', vi: '3 ngày liên tiếp! Bạn đang bắt đầu tốt!', en: '3-day streak! Great start!' },
  7:   { emoji: '🔥', vi: '7 ngày liên tiếp! Một tuần học đều đặn!', en: '7-day streak! One full week!' },
  14:  { emoji: '⭐', vi: '14 ngày liên tiếp! Hai tuần kiên trì!', en: '14-day streak! Two weeks strong!' },
  30:  { emoji: '🏆', vi: '30 ngày liên tiếp! Một tháng xuất sắc!', en: '30-day streak! One amazing month!' },
  100: { emoji: '👑', vi: '100 ngày liên tiếp! Bạn thật phi thường!', en: '100-day streak! You are incredible!' },
}

export function MilestoneModal({ milestone, onClose }: MilestoneModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (milestone) setVisible(true)
  }, [milestone])

  if (!visible || !milestone) return null
  const msg = MILESTONE_MESSAGES[milestone]
  if (!msg) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
        <p className="text-6xl mb-4">{msg.emoji}</p>
        <h2 className="text-2xl font-bold mb-2">🎉 {milestone} ngày!</h2>
        <p className="text-lg mb-1">{msg.vi}</p>
        <p className="text-sm text-gray-500 mb-6">{msg.en}</p>
        <button onClick={() => { setVisible(false); onClose() }}
          className="w-full bg-orange-500 text-white rounded-xl px-6 py-3 text-lg font-semibold">
          Tiếp tục / Continue
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update N400 layout to show streak badge**

Modify `apps/website/src/app/[locale]/n400app/layout.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { StreakBadge } from '@/components/n400/StreakBadge'
import { isTodayActive } from '@/lib/n400/streak'

async function getStreak() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { streak: 0, isActiveToday: false }

  const { data: profile } = await supabase
    .from('n400_user_profile')
    .select('current_streak, last_activity_date')
    .eq('user_id', user.id)
    .single()

  return {
    streak: profile?.current_streak ?? 0,
    isActiveToday: isTodayActive(profile?.last_activity_date ?? null),
  }
}

export default async function N400Layout({ children }: { children: React.ReactNode }) {
  const { streak, isActiveToday } = await getStreak()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <a href="/n400app" className="font-bold text-lg">🇺🇸 N400 App</a>
        <StreakBadge streak={streak} isActiveToday={isActiveToday} />
      </header>
      <main className="flex-1">{children}</main>
      <footer className="text-center text-xs text-gray-400 py-4 px-4 border-t">
        Tài liệu học liệu. Không phải tư vấn pháp lý. Nội dung lấy từ USCIS.gov. /
        Study material only. Not legal advice. Content sourced from USCIS.gov.
      </footer>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/components/n400/ \
        apps/website/src/app/[locale]/n400app/layout.tsx
git commit -m "feat(n400): add streak UI — badge, dashboard card, milestone modal"
```

---

## Task 4: Wire MilestoneModal into mock-test result + dashboard

The `MilestoneModal` component exists but nothing renders it yet. Spec §4.7 says the modal fires "at milestones 3/7/14/30/100" — that's after a session that updates the streak.

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/page.tsx`
- Modify: `apps/website/src/app/[locale]/n400app/practice/page.tsx`
- Modify: `apps/website/src/app/[locale]/n400app/flashcards/page.tsx`
- Modify: `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts` — `finalizeAttempt` returns `milestoneReached`
- Modify: `apps/website/src/app/[locale]/n400app/practice/actions.ts` — `finalizePractice` returns `milestoneReached`
- Modify: `apps/website/src/app/[locale]/n400app/flashcards/actions.ts` — `saveFlashcardSession` returns `milestoneReached`

- [ ] **Step 1: Make finalize actions return milestoneReached**

In each finalize action, after calling `updateStreak`, propagate the milestone:

```typescript
// finalizeAttempt (mock-test)
const streak = await updateStreak(attemptId)
return { passed, score, total, milestoneReached: streak?.milestoneReached ?? null }

// finalizePractice (practice)
const streak = await updateStreak(attemptId)
return { score, total, milestoneReached: streak?.milestoneReached ?? null }

// saveFlashcardSession (flashcards) — replace existing return:
if (attempt) {
  const streak = await updateStreak(attempt.id)
  return { attemptId: attempt.id, milestoneReached: streak?.milestoneReached ?? null }
}
return { attemptId: null, milestoneReached: null }
```

(Update each function's return-type annotation accordingly.)

- [ ] **Step 2: Render the modal in result/end-of-session screens**

In **mock-test** `[attemptId]/result/page.tsx`, the result page is a Server Component and reads from DB. The cleanest mount point for the modal is the mock-test quiz page itself — render it before pushing to /result. Alternative: keep a small client wrapper in the result page that reads `milestoneReached` from a query string.

Simplest approach: store `milestoneReached` in `localStorage` keyed by attemptId before the redirect, and let a small client component on the result page read+clear it.

In `mock-test/[attemptId]/page.tsx`, replace both `finalizeAttempt(attemptId)` calls:

```typescript
const result = await finalizeAttempt(attemptId)
if (result.milestoneReached) {
  localStorage.setItem(`milestone-${attemptId}`, String(result.milestoneReached))
}
```

Create `apps/website/src/components/n400/MilestoneToast.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { MilestoneModal } from './MilestoneModal'

export function MilestoneToast({ attemptId }: { attemptId: string }) {
  const [milestone, setMilestone] = useState<number | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`milestone-${attemptId}`)
    if (stored) {
      setMilestone(Number(stored))
      localStorage.removeItem(`milestone-${attemptId}`)
    }
  }, [attemptId])

  return <MilestoneModal milestone={milestone} onClose={() => setMilestone(null)} />
}
```

Render `<MilestoneToast attemptId={params.attemptId} />` inside the mock-test result page. Do the same for the practice result screen and the flashcards "done" screen (those are client components — read from a state set by the finalize call directly, no localStorage hop needed).

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/n400/MilestoneToast.tsx \
        apps/website/src/app/[locale]/n400app/mock-test/ \
        apps/website/src/app/[locale]/n400app/practice/ \
        apps/website/src/app/[locale]/n400app/flashcards/
git commit -m "feat(n400): mount MilestoneModal at end of every quiz mode"
```

---

## Phase 6 Complete ✅

Streak logic tested and wired into all 3 modes. Header badge, dashboard card, and milestone modals implemented.

**Next:** Proceed to [Phase 7 — Admin Panel](2026-05-13-n400app-phase-7-admin.md).
