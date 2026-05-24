# N400 App — Phase 6B: Gamification & Badges

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 24-badge gamification system from `docs/superpowers/specs/2026-05-24-n400-gamification-design.md` — DB schema, award engine, evaluators, UI surfaces, analytics, backfill.

**Architecture:** Server-side evaluator registry called after every session-finalize action. Idempotent via `(user_id, slug)` PK + `ON CONFLICT DO NOTHING`. Streak group also fires from `updateStreak` on milestone change.

**Prerequisite:** Phase 6 (Streak) complete and deployed.

**Spec:** `docs/superpowers/specs/2026-05-24-n400-gamification-design.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/n400_NN_badges.sql` | Create | New tables + `category_code` column + seed catalog |
| `scripts/n400/backfill-category-codes.ts` | Create | One-shot — fill `n400_questions.category_code` from existing `category` text |
| `scripts/n400/verify-badges.ts` | Create | Pre-launch check + manual recompute driver |
| `src/lib/n400/badges/types.ts` | Create | `BadgeContext`, `UnlockResult`, `BadgeEvaluator` |
| `src/lib/n400/badges/registry.ts` | Create | Imports all evaluator groups |
| `src/lib/n400/badges/evaluator.ts` | Create | `evaluateBadges()` dispatcher + DB insert |
| `src/lib/n400/badges/evaluator.test.ts` | Create | Unit tests for dispatcher |
| `src/lib/n400/badges/evaluators/streak.ts` (+ `.test.ts`) | Create | 6 streak evaluators |
| `src/lib/n400/badges/evaluators/mock-test.ts` (+ `.test.ts`) | Create | 6 mock evaluators |
| `src/lib/n400/badges/evaluators/coverage.ts` (+ `.test.ts`) | Create | 4 coverage evaluators |
| `src/lib/n400/badges/evaluators/volume.ts` (+ `.test.ts`) | Create | 3 volume evaluators |
| `src/lib/n400/badges/evaluators/category.ts` (+ `.test.ts`) | Create | 5 category evaluators |
| `src/lib/n400/streak.ts` | Modify | Add `60` to `MILESTONES` |
| `src/lib/n400/streak-actions.ts` | Modify | Call `evaluateBadges` on milestone change |
| `src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts` | Modify | Call `evaluateBadges` from `finalizeAttempt` |
| `src/app/[locale]/n400app/practice/actions.ts` | Modify | Call `evaluateBadges` from `finalizePractice` |
| `src/app/[locale]/n400app/flashcards/actions.ts` | Modify | Call `evaluateBadges` from `saveFlashcardSession` |
| `src/components/n400/BadgeUnlockToast.tsx` | Create | Client toast on unlock |
| `src/components/n400/BadgeGallery.tsx` | Create | Profile gallery |
| `src/components/n400/BadgeIcon.tsx` | Create | Reusable image wrapper (earned/locked variants) |
| `src/app/[locale]/n400app/profile/page.tsx` | Modify | Mount `<BadgeGallery />` |
| `src/app/[locale]/n400app/page.tsx` (Dashboard) | Modify | Show `<earned> / 24 huy hiệu` + recent 3 |
| `src/lib/analytics/events.ts` | Modify | Add `n400_badge_unlocked` |

---

## Task 1: DB migration + catalog seed

**Files:**
- Create: `apps/website/supabase/migrations/n400_NN_badges.sql` (NN = next free number)

- [ ] **Step 1: Write migration**

```sql
-- n400_NN_badges.sql
create table public.n400_badges (
  slug text primary key,
  title_en text not null,
  title_vi text not null,
  description_en text not null,
  description_vi text not null,
  group_code text not null check (group_code in ('streak','mock','coverage','volume','category')),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.n400_user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null references public.n400_badges(slug) on delete cascade,
  unlocked_at timestamptz not null default now(),
  trigger_attempt_id uuid references public.n400_quiz_attempts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, slug)
);

create index n400_user_badges_user_idx on public.n400_user_badges(user_id, unlocked_at desc);

alter table public.n400_questions
  add column category_code text check (category_code in ('A','B','C','D','E'));

create index n400_questions_category_code_idx on public.n400_questions(category_code);

-- RLS
alter table public.n400_badges enable row level security;
alter table public.n400_user_badges enable row level security;

create policy n400_badges_read_all on public.n400_badges for select using (true);
create policy n400_badges_admin_write on public.n400_badges for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy n400_user_badges_read_own on public.n400_user_badges for select
  using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
-- INSERT only via server action (service role bypasses RLS), so no INSERT policy needed.

-- Seed catalog (24 rows)
insert into public.n400_badges (slug, title_en, title_vi, description_en, description_vi, group_code, sort_order) values
  ('streak-3',                  '3-day streak',         '3 ngày liên tiếp',   'Study 3 days in a row',                       'Học 3 ngày liên tiếp',                                   'streak',   10),
  ('streak-7',                  '7-day streak',         '7 ngày liên tiếp',   'Study 7 days in a row',                       'Học 7 ngày liên tiếp',                                   'streak',   20),
  ('streak-14',                 '14-day streak',        '14 ngày liên tiếp',  'Study 14 days in a row',                      'Học 14 ngày liên tiếp',                                  'streak',   30),
  ('streak-30',                 '30-day streak',        '30 ngày liên tiếp',  'Study 30 days in a row',                      'Học 30 ngày liên tiếp',                                  'streak',   40),
  ('streak-60',                 '60-day streak',        '60 ngày liên tiếp',  'Study 60 days in a row',                      'Học 60 ngày liên tiếp',                                  'streak',   50),
  ('streak-100',                '100-day streak',       '100 ngày liên tiếp', 'Study 100 days in a row',                     'Học 100 ngày liên tiếp',                                 'streak',   60),
  ('onboarding-first-session',  'First step',           'Khởi đầu hành trình','Complete your first session',                 'Hoàn thành buổi học đầu tiên',                           'mock',     10),
  ('mock-pass-first',           'Test ready',           'Sẵn sàng thi',       'Pass your first mock test',                   'Pass mock test đầu tiên',                                'mock',     20),
  ('mock-pass-five',            'Future citizen',       'Công dân tương lai', 'Pass 5 mock tests',                           'Pass 5 mock tests',                                      'mock',     30),
  ('mock-high-score',           'High score',           'Điểm cao',           'Score 18+/20 on a mock test',                 'Đạt điểm 18/20 trở lên trong mock test',                 'mock',     40),
  ('mock-perfect',              'Perfect run',          'Xuất sắc',           'Pass a mock test with zero wrong answers',    'Pass mock test mà không sai câu nào',                    'mock',     50),
  ('mock-comeback',             'Comeback',             'Bứt phá',            'Pass a mock test after a previous failure',   'Pass mock test sau khi đã từng fail',                    'mock',     60),
  ('correct-answers-100',       '100 correct',          '100 câu đúng',       'Answer 100 questions correctly',              'Trả lời đúng 100 câu',                                   'coverage', 10),
  ('flashcards-mastery',        'Deep mastery',         'Hiểu sâu nhớ lâu',   'Mark 100 distinct questions as mastered',     'Đánh dấu thuộc 100 câu khác nhau',                       'coverage', 20),
  ('all-128-answered',          'Liberty Bell',         'Tiếng chuông tự do', 'Answer all 128 questions at least once',      'Đã trả lời cả 128 câu ít nhất một lần',                  'coverage', 30),
  ('sessions-100',              'Century',              'Cột mốc 100',        'Complete 100 sessions',                       'Hoàn thành 100 buổi học',                                'coverage', 40),
  ('practice-sessions-10',      'Diligent',             'Học tập chăm chỉ',   'Complete 10 daily practice sessions',         'Hoàn thành 10 buổi luyện tập hàng ngày',                 'volume',   10),
  ('practice-sessions-30',      'Focused daily',        'Tập trung mỗi ngày', 'Complete 30 daily practice sessions',         'Hoàn thành 30 buổi luyện tập hàng ngày',                 'volume',   20),
  ('sessions-50',               'Persistent',           'Kiên trì bền bỉ',    'Complete 50 sessions',                        'Hoàn thành 50 buổi học',                                 'volume',   30),
  ('category-democracy',        'Democracy',            'Khởi đầu tự do',     'Master American Democracy questions',         'Thành thạo các câu về Nguyên Tắc Dân Chủ',               'category', 10),
  ('category-government',       'Constitutionalist',    'Nhà hiến pháp',      'Master Government questions',                 'Thành thạo các câu về Hệ Thống Chính Phủ',               'category', 20),
  ('category-rights',           'Justice & Rights',     'Công lý & Quyền',    'Master Rights & Responsibilities questions',  'Thành thạo các câu về Quyền & Trách Nhiệm',              'category', 30),
  ('category-history',          'Patriot',              'Yêu nước Mỹ',        'Master American History questions',           'Thành thạo các câu về Lịch Sử Mỹ',                       'category', 40),
  ('category-symbols',          'Symbols & Community',  'Tự nhiên & Cộng đồng','Master Symbols & Holidays questions',         'Thành thạo các câu về Biểu Tượng & Ngày Lễ',             'category', 50);
```

- [ ] **Step 2: Apply migration via Supabase CLI / Studio (per existing project workflow)**

- [ ] **Step 3: Commit**

```bash
git add apps/website/supabase/migrations/n400_NN_badges.sql
git commit -m "db(n400): add badges catalog + user_badges + category_code column"
```

---

## Task 2: Backfill `category_code`

**Files:**
- Create: `apps/website/scripts/n400/backfill-category-codes.ts`

- [ ] **Step 1: Write script**

The 5 categories in `docs/N400_questions_vi.md` map cleanly to A–E by USCIS numbering ranges. Confirm the actual `category` text values in DB first (`select distinct category from n400_questions`), then build a mapping table:

```ts
// apps/website/scripts/n400/backfill-category-codes.ts
import { createClient } from '@supabase/supabase-js'

const MAP: Record<string, 'A' | 'B' | 'C' | 'D' | 'E'> = {
  // fill exact-match strings from DB. example:
  'American Democracy': 'A',
  'System of Government': 'B',
  'Rights and Responsibilities': 'C',
  'American History': 'D',
  'Symbols and Holidays': 'E',
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: questions } = await supabase.from('n400_questions').select('id, category')
  if (!questions) throw new Error('no questions')

  const updates = questions.map(q => ({ id: q.id, category_code: MAP[q.category] ?? null }))
  const unmapped = updates.filter(u => !u.category_code)
  if (unmapped.length) {
    console.error('Unmapped category strings:', new Set(questions.filter((_, i) => !updates[i].category_code).map(q => q.category)))
    process.exit(1)
  }

  for (const u of updates) {
    await supabase.from('n400_questions').update({ category_code: u.category_code }).eq('id', u.id)
  }
  console.log(`backfilled ${updates.length} rows`)
}

main()
```

- [ ] **Step 2: Run + verify**

```bash
cd apps/website && tsx scripts/n400/backfill-category-codes.ts
# expect: backfilled 128 rows
# verify in DB: select category_code, count(*) from n400_questions group by category_code;
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/scripts/n400/backfill-category-codes.ts
git commit -m "chore(n400): backfill category_code for 128 questions"
```

---

## Task 3: Evaluator types + dispatcher (TDD)

**Files:**
- Create: `apps/website/src/lib/n400/badges/types.ts`
- Create: `apps/website/src/lib/n400/badges/registry.ts` (empty for now)
- Create: `apps/website/src/lib/n400/badges/evaluator.ts`
- Create: `apps/website/src/lib/n400/badges/evaluator.test.ts`

- [ ] **Step 1: types.ts**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type BadgeGroupCode = 'streak' | 'mock' | 'coverage' | 'volume' | 'category'

export interface BadgeContext {
  attemptId?: string
  trigger: 'session_complete' | 'streak_change' | 'manual_recompute'
  mode?: 'mock_test' | 'practice' | 'flashcard'
  currentStreak?: number
}

export interface UnlockResult {
  slug: string
  metadata?: Record<string, unknown>
  triggerAttemptId?: string
}

export type BadgeEvaluator = (
  userId: string,
  ctx: BadgeContext,
  supabase: SupabaseClient,
) => Promise<UnlockResult | null>
```

- [ ] **Step 2: Empty registry**

```ts
// src/lib/n400/badges/registry.ts
import type { BadgeEvaluator } from './types'
export const BADGE_EVALUATORS: Record<string, BadgeEvaluator> = {}
```

- [ ] **Step 3: Failing dispatcher tests**

```ts
// evaluator.test.ts
import { describe, it, expect, vi } from 'vitest'
import { evaluateBadges } from './evaluator'

describe('evaluateBadges', () => {
  it('runs only evaluators relevant to the trigger', async () => {
    const supabase = { from: vi.fn() } as any
    const ev1 = vi.fn().mockResolvedValue({ slug: 'a' })
    const ev2 = vi.fn().mockResolvedValue(null)
    const result = await evaluateBadges('u1', { trigger: 'streak_change', currentStreak: 7 }, supabase, { 'a': ev1, 'b': ev2 })
    expect(ev1).toHaveBeenCalled()
  })

  it('returns only newly inserted slugs', async () => { /* ... */ })
  it('swallows individual evaluator errors', async () => { /* ... */ })
})
```

- [ ] **Step 4: Implement dispatcher (make tests pass)**

```ts
// evaluator.ts
'use server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import * as Sentry from '@sentry/nextjs'
import type { BadgeContext, BadgeEvaluator, UnlockResult } from './types'
import { BADGE_EVALUATORS } from './registry'

export async function evaluateBadges(
  userId: string,
  ctx: BadgeContext,
  supabaseOverride?: any,
  evaluatorsOverride?: Record<string, BadgeEvaluator>,
): Promise<string[]> {
  const supabase = supabaseOverride ?? await getServerSupabase()
  const evaluators = evaluatorsOverride ?? BADGE_EVALUATORS

  // Already-earned filter — skip evaluators whose slug is already in n400_user_badges
  const { data: earned } = await supabase
    .from('n400_user_badges')
    .select('slug')
    .eq('user_id', userId)
  const earnedSet = new Set((earned ?? []).map((r: any) => r.slug))

  const candidates = Object.entries(evaluators).filter(([slug]) => !earnedSet.has(slug))
  const unlocks: UnlockResult[] = []

  for (const [slug, ev] of candidates) {
    try {
      const result = await ev(userId, ctx, supabase)
      if (result) unlocks.push(result)
    } catch (err) {
      Sentry.captureException(err, { tags: { evaluator: slug, userId } })
    }
  }

  if (unlocks.length === 0) return []

  const rows = unlocks.map(u => ({
    user_id: userId,
    slug: u.slug,
    metadata: u.metadata ?? {},
    trigger_attempt_id: u.triggerAttemptId ?? ctx.attemptId ?? null,
  }))

  const { data: inserted } = await supabase
    .from('n400_user_badges')
    .upsert(rows, { onConflict: 'user_id,slug', ignoreDuplicates: true })
    .select('slug')

  return (inserted ?? []).map((r: any) => r.slug)
}

async function getServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
}
```

- [ ] **Step 5: Run tests, expect PASS**
- [ ] **Step 6: Commit**

```bash
git add apps/website/src/lib/n400/badges/
git commit -m "feat(n400): badge evaluator dispatcher (idempotent + sentry-wrapped)"
```

---

## Task 4: Streak evaluators (6)

**Files:**
- Create: `apps/website/src/lib/n400/badges/evaluators/streak.ts` + `.test.ts`
- Modify: `apps/website/src/lib/n400/streak.ts` (add 60 to MILESTONES)
- Modify: `apps/website/src/lib/n400/streak-actions.ts` (call evaluateBadges)
- Modify: `apps/website/src/lib/n400/badges/registry.ts`

- [ ] **Step 1: Update MILESTONES**

```ts
// streak.ts
const MILESTONES = [3, 7, 14, 30, 60, 100]
```

Update existing tests to assert detection at 60.

- [ ] **Step 2: Create streak evaluators**

Each is a simple "if currentStreak ≥ N, return slug". The dispatcher already filters out earned badges.

```ts
// evaluators/streak.ts
import type { BadgeEvaluator } from '../types'

const make = (slug: string, threshold: number): BadgeEvaluator =>
  async (_userId, ctx) => {
    if (ctx.trigger !== 'streak_change') return null
    if ((ctx.currentStreak ?? 0) < threshold) return null
    return { slug, metadata: { streak: ctx.currentStreak } }
  }

export const streakEvaluators = {
  'streak-3':   make('streak-3', 3),
  'streak-7':   make('streak-7', 7),
  'streak-14':  make('streak-14', 14),
  'streak-30':  make('streak-30', 30),
  'streak-60':  make('streak-60', 60),
  'streak-100': make('streak-100', 100),
}
```

- [ ] **Step 3: Wire `updateStreak` to call `evaluateBadges`**

```ts
// streak-actions.ts — at the end, after a successful update:
import { evaluateBadges } from './badges/evaluator'

const unlockedBadges = await evaluateBadges(user.id, {
  trigger: 'streak_change',
  currentStreak: update.currentStreak,
}, supabase)

return { milestoneReached: update.milestoneReached, unlockedBadges }
```

Update the return type and downstream callers (mock-test/practice/flashcards finalize actions) to forward `unlockedBadges` to the client.

- [ ] **Step 4: Register in `registry.ts`**

```ts
import { streakEvaluators } from './evaluators/streak'
export const BADGE_EVALUATORS = { ...streakEvaluators }
```

- [ ] **Step 5: Tests + commit**

```bash
git add apps/website/src/lib/n400/
git commit -m "feat(n400): streak badge evaluators (3/7/14/30/60/100) + wire into updateStreak"
```

---

## Task 5: Mock-test evaluators (6)

**Files:** `evaluators/mock-test.ts` + `.test.ts` + register

- [ ] **Step 1: Implement** (each evaluator is a SELECT against `n400_quiz_attempts` filtered by `user_id` + `mode='mock_test'`)

```ts
import type { BadgeEvaluator } from '../types'

const onboardingFirstSession: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete') return null
  // Spec: ≥1 completed session ≥5 interactions. Cheapest: count of completed attempts with question_attempts ≥ 5.
  // The session that triggered us is itself completed by now.
  const { count } = await supabase
    .from('n400_quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
  return (count ?? 0) >= 1 ? { slug: 'onboarding-first-session', triggerAttemptId: ctx.attemptId } : null
}

const mockPassFirst: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete' || ctx.mode !== 'mock_test') return null
  const { count } = await supabase
    .from('n400_quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('mode', 'mock_test')
    .eq('passed', true)
  return (count ?? 0) >= 1 ? { slug: 'mock-pass-first', triggerAttemptId: ctx.attemptId } : null
}

const mockPassFive: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete' || ctx.mode !== 'mock_test') return null
  const { count } = await supabase
    .from('n400_quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('mode', 'mock_test').eq('passed', true)
  return (count ?? 0) >= 5 ? { slug: 'mock-pass-five', triggerAttemptId: ctx.attemptId } : null
}

const mockHighScore: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete' || ctx.mode !== 'mock_test' || !ctx.attemptId) return null
  const { data } = await supabase
    .from('n400_quiz_attempts')
    .select('score, total_questions')
    .eq('id', ctx.attemptId).single()
  if (!data) return null
  const ratio = data.score / Math.max(data.total_questions, 1)
  return ratio >= 0.9 ? { slug: 'mock-high-score', triggerAttemptId: ctx.attemptId, metadata: { score: data.score, total: data.total_questions } } : null
}

const mockPerfect: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete' || ctx.mode !== 'mock_test' || !ctx.attemptId) return null
  const { data: attempt } = await supabase
    .from('n400_quiz_attempts')
    .select('passed, score').eq('id', ctx.attemptId).single()
  if (!attempt?.passed) return null
  const { count: wrong } = await supabase
    .from('n400_question_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('attempt_id', ctx.attemptId).eq('was_correct', false)
  return (wrong ?? 0) === 0 && attempt.score >= 12
    ? { slug: 'mock-perfect', triggerAttemptId: ctx.attemptId } : null
}

const mockComeback: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete' || ctx.mode !== 'mock_test') return null
  const { data: this_attempt } = await supabase
    .from('n400_quiz_attempts').select('passed, started_at')
    .eq('id', ctx.attemptId!).single()
  if (!this_attempt?.passed) return null
  const { count: priorFails } = await supabase
    .from('n400_quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('mode', 'mock_test').eq('passed', false)
    .lt('started_at', this_attempt.started_at)
  return (priorFails ?? 0) >= 1 ? { slug: 'mock-comeback', triggerAttemptId: ctx.attemptId } : null
}

export const mockTestEvaluators = {
  'onboarding-first-session': onboardingFirstSession,
  'mock-pass-first': mockPassFirst,
  'mock-pass-five': mockPassFive,
  'mock-high-score': mockHighScore,
  'mock-perfect': mockPerfect,
  'mock-comeback': mockComeback,
}
```

- [ ] **Step 2: Wire `finalizeAttempt` (mock-test action) to call `evaluateBadges`**

```ts
const unlockedBadges = await evaluateBadges(user.id, {
  trigger: 'session_complete',
  attemptId,
  mode: 'mock_test',
}, supabase)
return { passed, score, total, milestoneReached, unlockedBadges }
```

- [ ] **Step 3: Register + tests + commit**

```bash
git commit -m "feat(n400): mock-test badge evaluators (6) + finalizeAttempt wiring"
```

---

## Task 6: Coverage evaluators (4)

**Files:** `evaluators/coverage.ts` + `.test.ts` + register

- [ ] **Step 1: Implement**

```ts
const correctAnswers100: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete') return null
  const { count } = await supabase
    .from('n400_question_attempts')
    .select('*, n400_quiz_attempts!inner(user_id)', { count: 'exact', head: true })
    .eq('was_correct', true)
    .eq('n400_quiz_attempts.user_id', userId)
  return (count ?? 0) >= 100 ? { slug: 'correct-answers-100' } : null
}

// flashcards-mastery — needs a flashcard-specific signal stored at saveFlashcardSession time.
// Phase 5's flashcard schema persists per-card outcomes (Đã thuộc / Chưa thuộc) in
// n400_question_attempts with was_correct=true ↔ Đã thuộc. So the rule is: distinct question_id
// where was_correct=true AND attempt belongs to a flashcard mode.
const flashcardsMastery: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete' || ctx.mode !== 'flashcard') return null
  const { data } = await supabase.rpc('n400_distinct_mastered_flashcard_count', { p_user_id: userId })
  return (data ?? 0) >= 100 ? { slug: 'flashcards-mastery' } : null
}

const all128Answered: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete') return null
  const { data } = await supabase.rpc('n400_distinct_questions_attempted_count', { p_user_id: userId })
  return (data ?? 0) >= 128 ? { slug: 'all-128-answered' } : null
}

const sessions100: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete') return null
  const { count } = await supabase
    .from('n400_quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId).not('completed_at', 'is', null)
  return (count ?? 0) >= 100 ? { slug: 'sessions-100' } : null
}
```

- [ ] **Step 2: Add Postgres RPC helpers** (faster than ORM for distinct counts)

Append to migration `n400_NN_badges.sql`:

```sql
create or replace function public.n400_distinct_questions_attempted_count(p_user_id uuid)
returns int language sql stable as $$
  select count(distinct qa.question_id)::int
  from public.n400_question_attempts qa
  join public.n400_quiz_attempts a on a.id = qa.attempt_id
  where a.user_id = p_user_id;
$$;

create or replace function public.n400_distinct_mastered_flashcard_count(p_user_id uuid)
returns int language sql stable as $$
  select count(distinct qa.question_id)::int
  from public.n400_question_attempts qa
  join public.n400_quiz_attempts a on a.id = qa.attempt_id
  where a.user_id = p_user_id
    and a.mode = 'flashcard'
    and qa.was_correct = true;
$$;
```

- [ ] **Step 3: Tests + commit**

```bash
git commit -m "feat(n400): coverage badge evaluators (4) + RPC helpers"
```

---

## Task 7: Volume evaluators (3)

**Files:** `evaluators/volume.ts` + `.test.ts` + register

- [ ] **Step 1: Implement**

```ts
const practice10: BadgeEvaluator = async (userId, ctx, supabase) => {
  if (ctx.trigger !== 'session_complete' || ctx.mode !== 'practice') return null
  const { count } = await supabase.from('n400_quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('mode', 'practice').not('completed_at', 'is', null)
  return (count ?? 0) >= 10 ? { slug: 'practice-sessions-10' } : null
}

const practice30: BadgeEvaluator = /* same shape, threshold 30, slug 'practice-sessions-30' */
const sessions50: BadgeEvaluator = /* count of all completed attempts ≥ 50, slug 'sessions-50' */
```

- [ ] **Step 2: Wire `finalizePractice` and `saveFlashcardSession` to call `evaluateBadges`** (mock-test was already wired in Task 5)

- [ ] **Step 3: Tests + commit**

```bash
git commit -m "feat(n400): volume badge evaluators (3) + practice/flashcards wiring"
```

---

## Task 8: Category evaluators (5)

**Files:** `evaluators/category.ts` + `.test.ts` + register

The rule: ≥80% latest-attempt accuracy across all questions in the category. "Latest attempt" = most recent `n400_question_attempts` row per `question_id` for that user.

- [ ] **Step 1: Add Postgres RPC for per-category accuracy**

```sql
-- Returns code, accuracy_pct (0-100), questions_total, questions_attempted
create or replace function public.n400_category_accuracy(p_user_id uuid)
returns table (category_code text, accuracy_pct numeric, questions_attempted int, questions_total int)
language sql stable as $$
  with latest as (
    select distinct on (qa.question_id) qa.question_id, qa.was_correct
    from public.n400_question_attempts qa
    join public.n400_quiz_attempts a on a.id = qa.attempt_id
    where a.user_id = p_user_id
    order by qa.question_id, qa.answered_at desc
  )
  select
    q.category_code,
    case when count(l.question_id) = 0 then 0
         else round(100.0 * sum(case when l.was_correct then 1 else 0 end) / count(l.question_id), 2)
    end as accuracy_pct,
    count(l.question_id)::int as questions_attempted,
    count(q.id)::int as questions_total
  from public.n400_questions q
  left join latest l on l.question_id = q.id
  where q.category_code is not null
  group by q.category_code;
$$;
```

- [ ] **Step 2: Implement evaluators**

```ts
const CATEGORY_BADGES: Record<'A'|'B'|'C'|'D'|'E', string> = {
  A: 'category-democracy', B: 'category-government', C: 'category-rights',
  D: 'category-history', E: 'category-symbols',
}

const makeCategoryEvaluator = (code: 'A'|'B'|'C'|'D'|'E'): BadgeEvaluator =>
  async (userId, ctx, supabase) => {
    if (ctx.trigger !== 'session_complete') return null
    const { data } = await supabase.rpc('n400_category_accuracy', { p_user_id: userId })
    const row = (data ?? []).find((r: any) => r.category_code === code)
    if (!row) return null
    // Require: attempted at least half the category AND ≥80% accuracy on attempted.
    if (row.questions_attempted < Math.ceil(row.questions_total / 2)) return null
    if (row.accuracy_pct < 80) return null
    return { slug: CATEGORY_BADGES[code], metadata: { accuracy: row.accuracy_pct } }
  }

export const categoryEvaluators = {
  [CATEGORY_BADGES.A]: makeCategoryEvaluator('A'),
  [CATEGORY_BADGES.B]: makeCategoryEvaluator('B'),
  [CATEGORY_BADGES.C]: makeCategoryEvaluator('C'),
  [CATEGORY_BADGES.D]: makeCategoryEvaluator('D'),
  [CATEGORY_BADGES.E]: makeCategoryEvaluator('E'),
}
```

(Spec §2.5 says ≥80% latest-attempt accuracy. The "≥ half attempted" guard prevents unlocking with 1/40 questions correct.)

- [ ] **Step 3: Tests + commit**

```bash
git commit -m "feat(n400): category badge evaluators (5) + accuracy RPC"
```

---

## Task 9: UI — BadgeIcon, BadgeUnlockToast

**Files:** `components/n400/BadgeIcon.tsx`, `components/n400/BadgeUnlockToast.tsx`

- [ ] **Step 1: BadgeIcon**

```tsx
// BadgeIcon.tsx
import Image from 'next/image'

interface Props {
  slug: string
  title: string
  size?: number
  earned: boolean
}

export function BadgeIcon({ slug, title, size = 64, earned }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src={`/images/n400/badges/${slug}.png`}
        alt={title}
        width={size}
        height={size}
        className={earned ? '' : 'opacity-30 grayscale'}
      />
    </div>
  )
}
```

- [ ] **Step 2: BadgeUnlockToast**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { BadgeIcon } from './BadgeIcon'
import { trackEvent } from '@/lib/analytics/events'

interface Catalog { slug: string; title_vi: string; title_en: string; group_code: string }

export function BadgeUnlockToast({ slugs, catalog }: { slugs: string[]; catalog: Catalog[] }) {
  const [queue, setQueue] = useState(slugs)
  if (queue.length === 0) return null
  const slug = queue[0]
  const meta = catalog.find(c => c.slug === slug)
  if (!meta) { setQueue(q => q.slice(1)); return null }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-xl border border-amber-200 max-w-sm">
      <BadgeIcon slug={slug} title={meta.title_vi} size={56} earned />
      <div>
        <p className="text-xs font-medium text-amber-600">Huy hiệu mới!</p>
        <p className="text-base font-semibold text-slate-900">{meta.title_vi}</p>
        <p className="text-xs text-slate-500">{meta.title_en}</p>
      </div>
      <button onClick={() => { trackEvent('n400_badge_unlocked', { slug, group_code: meta.group_code }); setQueue(q => q.slice(1)) }}
        className="ml-2 text-slate-400 hover:text-slate-600" aria-label="Đóng">×</button>
    </div>
  )
}
```

- [ ] **Step 3: Mount in mock-test result, practice result, flashcards done screens** — pass `unlockedBadges` from finalize action result. Catalog can be passed from the server component or hard-coded since the 24 are static.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(n400): BadgeIcon + BadgeUnlockToast"
```

---

## Task 10: UI — Profile gallery + dashboard preview

**Files:** `components/n400/BadgeGallery.tsx`, modify `profile/page.tsx`, modify dashboard `page.tsx`

- [ ] **Step 1: BadgeGallery (server component reading from DB)**

```tsx
// BadgeGallery.tsx
import { BadgeIcon } from './BadgeIcon'
import { createServerSupabase } from '@/lib/supabase/server'

export async function BadgeGallery({ userId }: { userId: string }) {
  const supabase = await createServerSupabase()
  const [{ data: catalog }, { data: earned }] = await Promise.all([
    supabase.from('n400_badges').select('*').eq('is_active', true).order('group_code').order('sort_order'),
    supabase.from('n400_user_badges').select('slug, unlocked_at').eq('user_id', userId),
  ])
  if (!catalog) return null
  const earnedMap = new Map((earned ?? []).map(r => [r.slug, r.unlocked_at]))

  const groups = ['streak','mock','coverage','volume','category'] as const
  return (
    <div id="badges" className="space-y-8">
      {groups.map(g => {
        const items = catalog.filter(c => c.group_code === g)
        return (
          <section key={g}>
            <h3 className="mb-4 text-sm font-medium text-slate-500">{GROUP_LABEL[g]}</h3>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
              {items.map(b => (
                <BadgeIcon key={b.slug} slug={b.slug} title={b.title_vi} earned={earnedMap.has(b.slug)} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

const GROUP_LABEL = {
  streak: 'Chuỗi học tập', mock: 'Mock Test', coverage: 'Mức độ bao phủ',
  volume: 'Bền bỉ', category: 'Thành thạo theo chủ đề',
} as const
```

- [ ] **Step 2: Mount in `/n400app/profile/page.tsx`**

- [ ] **Step 3: Dashboard preview** — modify `app/[locale]/n400app/page.tsx` Streak card section: after the streak number, add a small `<earned>/24 huy hiệu` row + the 3 most recently unlocked icons (server-fetched).

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(n400): badge gallery on profile + dashboard preview"
```

---

## Task 11: Analytics event

**Files:** modify `src/lib/analytics/events.ts`

- [ ] **Step 1: Add `n400_badge_unlocked` to the typed event set** (follow existing pattern). Already wired client-side in `BadgeUnlockToast`.
- [ ] **Step 2: Verify GA4 / Pixel firing in dev**.
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(n400): n400_badge_unlocked analytics event"
```

---

## Task 12: Verification + backfill script

**Files:** `apps/website/scripts/n400/verify-badges.ts`

- [ ] **Step 1: Verification checks**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { BADGE_EVALUATORS } from '../../src/lib/n400/badges/registry'

const PUBLIC = path.resolve(__dirname, '../../public/images/n400/badges')

async function main() {
  const issues: string[] = []
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 1. PNG files
  const { data: catalog } = await supabase.from('n400_badges').select('slug')
  const slugs = (catalog ?? []).map(r => r.slug)
  for (const slug of slugs) {
    if (!fs.existsSync(path.join(PUBLIC, `${slug}.png`))) issues.push(`MISSING PNG: ${slug}`)
  }

  // 2. Catalog vs registry parity
  const registered = new Set(Object.keys(BADGE_EVALUATORS))
  for (const slug of slugs) if (!registered.has(slug)) issues.push(`NO EVALUATOR: ${slug}`)
  for (const slug of registered) if (!slugs.includes(slug)) issues.push(`NO CATALOG ROW: ${slug}`)

  if (issues.length) { console.error(issues.join('\n')); process.exit(1) }
  console.log(`✓ ${slugs.length} badges verified`)
}
main()
```

- [ ] **Step 2: Optional `--recompute` flag** runs `evaluateBadges(userId, { trigger: 'manual_recompute' })` for every user, to backfill earned badges for users who pre-date Phase 6B.

- [ ] **Step 3: Run pre-launch + commit**

```bash
git commit -m "chore(n400): badge verification + backfill script"
```

---

## Phase 6B Complete ✅

Gamification system live: 24 badges across 5 groups, idempotent server-side award engine, unlock toast, profile gallery, dashboard preview, analytics event.

**Next:** Continue Phase 7 (Admin Panel) — admin can later add badges via the catalog table without code changes (assuming a generic evaluator exists for the new condition; otherwise this is a code change too).
