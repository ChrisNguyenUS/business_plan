# N400 App — Gamification & Badges System Design Spec

**Date:** 2026-05-24
**Status:** Draft — extends `2026-05-13-n400app-design.md` §4.7 (Streak)
**Target route:** `mannaos.com/n400app` (existing N400 app)
**Codebase location:** `apps/website/`
**Asset source:** `docs/N400_app_UI/UI/Badges Icons/` (24 PNG files, hand-drawn vector style matching the "White & Paper" design system)
**Asset destination:** `apps/website/public/images/n400/badges/<slug>.png` (already deployed)

---

## 1. Problem & Goals

The current N400 app has only a streak counter (`current_streak` / `longest_streak` in `n400_user_profile`). That is enough to track daily activity but does not reward the broader learning journey: passing the mock test, mastering a category, hitting accuracy milestones, etc.

The owner has produced 24 hand-drawn badge illustrations that map naturally onto a richer achievement system. This spec defines:
- Which badge unlocks for which behavior
- The DB schema to persist achievements per user
- The award engine (server-side, idempotent, replayable)
- The UI surface points (toast on unlock, profile gallery, dashboard preview)
- How analytics tie into the existing `n400_streak_milestone` event family

**Success criteria:**
- Every one of the 24 badges has a precise, server-verifiable unlock condition (no ambiguity, no client-trusted state).
- A user can earn a badge **at most once**; replaying a session that already triggered an unlock is idempotent.
- Adding new badges later requires only an admin-side INSERT into `n400_badges` + a registered evaluator function — no migration.
- Badge unlocks fire a single analytics event `n400_badge_unlocked` for funnel visibility.

**Non-goals (v1):**
- Leaderboards
- Badge trading / sharing
- Time-limited / seasonal badges
- Push or email notifications when a badge unlocks

---

## 2. Badge Catalog (24 badges across 5 groups)

Each row maps a source asset → public slug → unlock condition. The slug is the kebab-case identifier used as both the filename in `public/images/n400/badges/` and the `n400_badges.slug` column.

### 2.1 Group A — Streak (6 badges)

Streak badges replace the current `MILESTONES = [3, 7, 14, 30, 100]` array in `lib/n400/streak.ts`. We add **60** to align with the asset set, which gives `[3, 7, 14, 30, 60, 100]`. Each milestone hit also unlocks the matching badge.

| Source PNG | Slug | Title (VI / EN) | Unlock when |
|---|---|---|---|
| `3 ngày liên tiếp.png` | `streak-3` | 3 ngày liên tiếp / 3-day streak | `current_streak` reaches 3 |
| `7 ngày liên tiếp.png` | `streak-7` | 7 ngày liên tiếp / 7-day streak | `current_streak` reaches 7 |
| `14 ngày liên tiếp.png` | `streak-14` | 14 ngày liên tiếp / 14-day streak | `current_streak` reaches 14 |
| `30 ngày liên tiếp.png` | `streak-30` | 30 ngày liên tiếp / 30-day streak | `current_streak` reaches 30 |
| `60 ngày liên tiếp.png` | `streak-60` | 60 ngày liên tiếp / 60-day streak | `current_streak` reaches 60 |
| `100 ngày liên tiếp.png` | `streak-100` | 100 ngày liên tiếp / 100-day streak | `current_streak` reaches 100 |

### 2.2 Group B — Mock Test Performance (5 badges)

| Source PNG | Slug | Title (VI / EN) | Unlock when |
|---|---|---|---|
| `Sát cánh ước mơ.png` | `onboarding-first-session` | Khởi đầu hành trình / First step | First completed session in any mode (≥5 question_attempts) |
| `Sẵn sàng thi.png` | `mock-pass-first` | Sẵn sàng thi / Test ready | First mock test where `passed=true` |
| `Công dân tương lai.png` | `mock-pass-five` | Công dân tương lai / Future citizen | 5 lifetime mock tests with `passed=true` |
| `High Score.png` | `mock-high-score` | High Score | Any mock test with `score >= 18 / 20` (≥ 90% before early-stop kicks in; for early-stop sessions, treat 12-correct-with-≤2-wrong as 18+) |
| `Xuất sắc.png` | `mock-perfect` | Xuất sắc / Perfect run | Any mock test with **zero wrong answers before reaching 12 correct** |
| `Bứt phá.png` | `mock-comeback` | Bứt phá / Comeback | First `passed=true` mock test that follows at least one prior `passed=false` mock test |

### 2.3 Group C — Coverage & Mastery (4 badges)

| Source PNG | Slug | Title (VI / EN) | Unlock when |
|---|---|---|---|
| `Trả lời chính xác.png` | `correct-answers-100` | 100 câu đúng / 100 correct | Lifetime sum of `n400_question_attempts WHERE was_correct=true` reaches 100 |
| `Hiểu sâu nhớ lâu.png` | `flashcards-mastery` | Hiểu sâu nhớ lâu / Deep mastery | User has marked "Đã thuộc ✓" for ≥100 distinct questions across all flashcard sessions |
| `Tiếng chuông tự do.png` | `all-128-answered` | Tiếng chuông tự do / Liberty Bell | User has answered (with any outcome) at least one attempt for **all 128 distinct questions** |
| `Cột mốc 100.png` | `sessions-100` | Cột mốc 100 / Century | 100 lifetime completed sessions (any mode, ≥5 interactions each) |

### 2.4 Group D — Volume / Persistence (3 badges)

| Source PNG | Slug | Title (VI / EN) | Unlock when |
|---|---|---|---|
| `Học tập chăm chỉ.png` | `practice-sessions-10` | Học tập chăm chỉ / Diligent | 10 lifetime completed `practice` sessions |
| `Tập trung mỗi ngày.png` | `practice-sessions-30` | Tập trung mỗi ngày / Focused daily | 30 lifetime completed `practice` sessions |
| `Kiên trì bền bỉ.png` | `sessions-50` | Kiên trì bền bỉ / Persistent | 50 lifetime completed sessions (any mode) |

### 2.5 Group E — Category Mastery (5 badges)

A "category mastery" unlock = the user has answered ≥80% of questions in that category correctly **on their most recent attempt** of each question (deduped: latest attempt per question_id within the category). The 5 categories match the source-of-truth headings in `docs/N400_questions_vi.md`.

| Source PNG | Slug | Title (VI / EN) | Category | Unlock when |
|---|---|---|---|---|
| `Khởi đầu tự do.png` | `category-democracy` | Khởi đầu tự do / Democracy | A. Các Nguyên Tắc Dân Chủ Hoa Kỳ | ≥80% latest-attempt accuracy across all questions in this category |
| `Nhà hiến pháp.png` | `category-government` | Nhà hiến pháp / Constitutionalist | B. Hệ Thống Chính Phủ | same rule |
| `Công lý & Quyền.png` | `category-rights` | Công lý & Quyền / Justice & Rights | C. Quyền Và Trách Nhiệm | same rule |
| `Yêu nước Mỹ.png` | `category-history` | Yêu nước Mỹ / Patriot | D. Lịch Sử Mỹ | same rule |
| `Tự nhiên & Cộng đồng.png` | `category-symbols` | Tự nhiên & Cộng đồng / Symbols & Community | E. Biểu Tượng Và Ngày Lễ | same rule |

**Note on category storage.** `n400_questions.category` is `text` today (free-form). Phase 1 of this plan introduces a `n400_category_codes` enum-style mapping (`A` … `E`) and backfills `n400_questions` with the canonical code so the evaluator can group reliably. Adding a tiny `category_code text` column avoids breaking existing rows that store a localized category string.

---

## 3. Data Model

### 3.1 New tables

**`n400_badges`** (admin-managed catalog — INSERT once at seed time, editable later)

| field | type | notes |
|---|---|---|
| slug | text PK | matches filename in `public/images/n400/badges/<slug>.png` |
| title_en | text | |
| title_vi | text | |
| description_en | text | one-liner shown in tooltip |
| description_vi | text | |
| group_code | text | `streak` \| `mock` \| `coverage` \| `volume` \| `category` |
| sort_order | int | for stable ordering in profile gallery |
| is_active | bool default true | hide a badge without deleting history |

**`n400_user_badges`** (user achievements — INSERT-only, append-only ledger)

| field | type | notes |
|---|---|---|
| user_id | uuid FK → auth.users | composite PK with slug |
| slug | text FK → n400_badges.slug | composite PK |
| unlocked_at | timestamptz default now() | |
| trigger_attempt_id | uuid nullable FK → n400_quiz_attempts | the attempt that caused the unlock (null for non-quiz triggers) |
| metadata | jsonb default '{}' | e.g. `{"streak": 7}` for streak badges, `{"score": 19, "total": 20}` for high-score |

`PRIMARY KEY (user_id, slug)` — guarantees idempotency at the DB level. A second unlock attempt for the same user+slug is a no-op (`ON CONFLICT DO NOTHING`).

### 3.2 Modified tables

**`n400_questions`** — add column:

| field | type | notes |
|---|---|---|
| category_code | text nullable | one of `A` `B` `C` `D` `E`. Backfilled by Phase 6B Task 1 from `category` text. |

We keep the existing `category` text column (admin-edited, displayable label) and add `category_code` for the evaluator. Future admin work can normalize these, but v1 is additive only.

### 3.3 RLS policies

- `n400_badges`: SELECT public; INSERT/UPDATE/DELETE admin only (reuse `profiles.role = 'admin'` expression from existing pattern).
- `n400_user_badges`: SELECT own (`auth.uid() = user_id`); INSERT via server action only (no client direct INSERT — server uses service role); admin SELECT all.

---

## 4. Award Engine

### 4.1 Architecture

A single server-side function `evaluateBadges(userId, context)` runs after every session-finalize action. It is:

- **Idempotent.** Uses `INSERT … ON CONFLICT (user_id, slug) DO NOTHING`. Re-running on the same data inserts zero rows.
- **Pure-ish.** Reads from DB, returns a list of newly unlocked slugs. Side effect = the inserts.
- **Composed of small evaluators.** Each badge has a registered evaluator `(userId, context, supabase) => Promise<UnlockResult | null>`. The dispatcher loops registered evaluators and gathers unlocks. Adding a badge = adding one evaluator + one DB row.

```ts
// src/lib/n400/badges/types.ts
export interface BadgeContext {
  attemptId?: string             // present when called from finalize action
  trigger: 'session_complete' | 'streak_change' | 'manual_recompute'
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

### 4.2 Wiring

`evaluateBadges` is called at the end of:
1. `finalizeAttempt` (mock-test) — after `updateStreak`. Returns mock-related unlocks.
2. `finalizePractice` — after `updateStreak`.
3. `saveFlashcardSession` — after `updateStreak`.
4. `updateStreak` itself when a streak milestone fires — calls `evaluateBadges(userId, { trigger: 'streak_change' })`. This keeps streak badges award timing aligned with the existing milestone modal.

The finalize actions return `{ ..., milestoneReached, unlockedBadges: string[] }` so the client can render a toast / modal stack.

### 4.3 Evaluator registry

```ts
// src/lib/n400/badges/registry.ts
import { streakEvaluators } from './evaluators/streak'
import { mockTestEvaluators } from './evaluators/mock-test'
import { coverageEvaluators } from './evaluators/coverage'
import { volumeEvaluators } from './evaluators/volume'
import { categoryEvaluators } from './evaluators/category'

export const BADGE_EVALUATORS: Record<string, BadgeEvaluator> = {
  ...streakEvaluators,    // streak-3, streak-7, streak-14, streak-30, streak-60, streak-100
  ...mockTestEvaluators,  // onboarding-first-session, mock-pass-first, mock-pass-five,
                          // mock-high-score, mock-perfect, mock-comeback
  ...coverageEvaluators,  // correct-answers-100, flashcards-mastery, all-128-answered, sessions-100
  ...volumeEvaluators,    // practice-sessions-10, practice-sessions-30, sessions-50
  ...categoryEvaluators,  // category-democracy, …, category-symbols
}
```

### 4.4 Evaluator selection per trigger

Running all 24 evaluators on every session is cheap (each is one COUNT or one SELECT) but unnecessary. A small filter narrows the set:

| Trigger | Evaluators run |
|---|---|
| `session_complete` (mode = `mock_test`) | mock-test group + coverage group + volume group + category group + onboarding |
| `session_complete` (mode = `practice`) | coverage + volume + category + onboarding |
| `session_complete` (mode = `flashcard`) | coverage (`flashcards-mastery`, `all-128-answered`, `sessions-100`) + volume + onboarding |
| `streak_change` | streak group only |
| `manual_recompute` | all evaluators (used by an admin/maintenance script) |

### 4.5 Idempotency & replay

The `INSERT … ON CONFLICT DO NOTHING` clause on the `(user_id, slug)` PK is the contract. An evaluator that returns `{slug: 'streak-7'}` on every call after the first is fine — the DB rejects the duplicate.

`evaluateBadges` returns `RETURNING slug` from the multi-INSERT so the caller knows which slugs were *actually* newly inserted. Those — and only those — are surfaced to the client for the toast/modal.

### 4.6 Failure mode

A failing evaluator must not block the session finalize. Wrap each evaluator call in `try/catch`, log to Sentry, and continue. A user who passes a mock test must still see their pass screen even if the badge insert times out. Streak update has the same contract today.

---

## 5. UI Surfaces

### 5.1 Unlock toast (immediate)

Triggered from any finalize action that returns a non-empty `unlockedBadges` array. Stack of toasts (one per slug), each:

```
┌────────────────────────────────────┐
│  [icon 64×64]  Huy hiệu mới!       │
│                Sẵn sàng thi        │
│                Bạn đã pass mock!   │
└────────────────────────────────────┘
```

Component: `src/components/n400/BadgeUnlockToast.tsx` (client). Auto-dismiss after 5s; click → `/n400app/profile#badges`.

### 5.2 Profile badge gallery

New section on `/n400app/profile`. 5 group rows, each a horizontal scroll of all badges in the group. Earned badges in full color; unearned shown desaturated at `opacity-30` with a tooltip showing the unlock condition. Tap a badge → modal with title, description, and (if earned) `unlocked_at` date.

Component: `src/components/n400/BadgeGallery.tsx` (server-rendered list, client modal).

### 5.3 Dashboard preview

Replace the existing `Cố lên! 🔥` line in the streak card with a small preview: `<earned> / 24 huy hiệu`, plus the 3 most-recently-unlocked badge icons. Click → `/n400app/profile#badges`.

### 5.4 Asset rendering

All 24 PNGs already live at `apps/website/public/images/n400/badges/<slug>.png`. They are square-ish (~200×200), antialiased, with white/transparent background suitable for `<Image>` rendering on slate-50.

```tsx
<Image
  src={`/images/n400/badges/${slug}.png`}
  alt={title}
  width={64}
  height={64}
  className={earned ? '' : 'opacity-30 grayscale'}
/>
```

---

## 6. Analytics

Add one event to the existing GA4 + Meta Pixel set:

- `n400_badge_unlocked` — params: `{ slug, group_code, trigger: session_complete | streak_change }`. Fires client-side from the toast component when it mounts.

Streak milestones already have `n400_streak_milestone`. Keep that event — it fires *in addition to* `n400_badge_unlocked` for streak slugs, since the milestone modal is a separate UX moment from the badge toast.

No CAPI server-side dedupe needed (this is a funnel event, not a conversion). Event_id = random UUID per fire.

---

## 7. Test Strategy

### 7.1 Unit tests (Vitest, co-located)

Each evaluator gets a test file. Pattern:

```ts
// evaluators/mock-test.test.ts
describe('mockPassFirstEvaluator', () => {
  it('returns slug when user has 1 passed attempt and no prior', async () => { ... })
  it('returns null when user already has the badge', async () => { ... })
  it('returns null when user has zero passed attempts', async () => { ... })
})
```

Mock the Supabase client. No DB hit in unit tests.

### 7.2 Integration tests

`evaluateBadges` end-to-end against a seeded test DB:
- Seed user, complete a passing mock test → assert `n400_user_badges` has `mock-pass-first`.
- Run `evaluateBadges` again with the same context → no new rows.
- Seed a category to 81% accuracy → assert that category's badge unlocks; drop to 79% → no unlock (would only matter going forward; existing rows are not deleted).

### 7.3 Pre-launch verification script

`apps/website/scripts/n400/verify-badges.ts`:
- All 24 PNGs exist at the expected path
- All 24 slugs exist in `n400_badges` after seed
- Every slug has a registered evaluator in `BADGE_EVALUATORS`
- Every evaluator's slug exists in the catalog table (catches typos in either direction)

---

## 8. Implementation Phasing

This work slots in as **Phase 6B** (after Phase 6 Streak ships).

1. **Migration:** create `n400_badges`, `n400_user_badges`, add `n400_questions.category_code`. Seed catalog. Backfill `category_code` from existing `category` text.
2. **Evaluator registry + types** — empty registry compiles.
3. **Streak evaluators (6)** + add `60` to streak milestones; wire `updateStreak` to call `evaluateBadges` on milestone change.
4. **Mock-test evaluators (6)** + wire `finalizeAttempt`.
5. **Coverage evaluators (4)** + wire all 3 finalize actions.
6. **Volume evaluators (3)** + wire all 3 finalize actions.
7. **Category evaluators (5)** + wire all 3 finalize actions.
8. **UI: BadgeUnlockToast, BadgeGallery, dashboard preview.**
9. **Analytics event wiring.**
10. **Verification script + smoke test.**

Each task = one commit per CLAUDE.md atomic-commit rule.

---

## 9. Open Questions

1. **Backfill on first deploy.** Existing users (Phase 6 launch) already have streaks and attempts. After deploy, do we run a one-shot `manual_recompute` over all users? **Proposal:** yes, during Phase 6B Task 10 (verification script doubles as backfill driver). This avoids the awkward state where a user with `current_streak=12` doesn't have `streak-7` because the badge system didn't exist when they earned it.

2. **`mock-perfect` exact rule.** Spec says "zero wrong before 12 correct". This is unambiguous for the early-stop case (player wins after exactly 12 correct, 0 wrong). Edge case: a 20-question session that goes all 20 (mode allows it via "I want to keep going" — not currently implemented) and ends 20/0. Treated identically. **Decision:** the rule is `wrong_count == 0 AND correct_count >= 12` on a `passed=true` mock attempt. Codify this in the evaluator.

3. **Category-mastery regression.** A user who hits 80% in category A then later does a bad practice session that drops their latest-attempt accuracy below 80% does NOT lose the badge (`n400_user_badges` is append-only). Consistent with how every other achievement system works.

---

## 10. Out-of-Scope (v2 candidates)

- Badge sharing to social media
- "Almost there" preview ("3 more correct answers to unlock 100 câu đúng")
- Seasonal / time-limited badges
- Leaderboards
- Badges for negative behaviors corrected (e.g. "Came back after a 30-day gap")
