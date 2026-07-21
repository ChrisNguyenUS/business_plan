# N400 Growth Engine — G3b (Booking) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the consultation booking flow (spec §5 "Cả hai"): in-app form → `n400_consultation_requests` insert → Resend staff notify + Meta CAPI `Lead` → confirm screen with Calendly link — plus the two review findings from the G3a post-merge review (the S1 `min_avg_pct` boundary bug and the 1000-row truncation perf debt).

**Architecture:** Booking follows the G3a read-path decomposition exactly: pure logic in `booking.ts`, one thin `'use server'` actions file, side effects (Resend/CAPI) best-effort after the insert. Score (+60) and `consultation_requested_at` stamping already happen in the DB (`n400_17` trigger on `n400_consultation_requests` INSERT) — the server action only inserts the row. The perf fix moves event/attempt counting into two SQL rollup RPCs so the growth read path never hauls one-row-per-answer tables through PostgREST's silent 1000-row cap.

**Tech Stack:** Next.js (App Router — **this repo's Next version has breaking changes; read `node_modules/next/dist/docs/` before writing page code**), Supabase (RLS + SECURITY INVOKER RPCs), Resend (dynamic import pattern), Meta CAPI (`sendCapiLead`), vitest.

**Branch:** `feat/n400-growth-g3b` (worktree, per using-git-worktrees).

---

## Verified contracts (recon done 2026-07-20 — do NOT re-derive, but DO re-verify column names against the live schema before applying migrations; both G2 and G3a found draft-vs-schema drift)

| Thing | Verified fact |
|---|---|
| `n400_consultation_requests` (n400_15) | Columns: `id, user_id, name, phone, preferred_time, topic CHECK IN ('n400_review','interview_prep','writing','speaking','other'), source_cta, status DEFAULT 'new' CHECK IN ('new','contacted','booked','done','no_show','cancelled'), outcome, outcome_note, note, first_touch jsonb, last_touch jsonb, created_at, updated_at`. RLS: own INSERT + own SELECT exist already. |
| `n400_17` trigger | `trg_n400_consultation_recompute` AFTER INSERT OR UPDATE already stamps `lead_profiles.consultation_requested_at` / `consultation_booked_at` (on status booked/done) and calls `recompute_n400_lead_score`. **The server action must NOT emit any event or recompute anything.** There is no `consultation_requested` growth-event type — scoring reads the table itself. |
| CAPI | `sendCapiLead({ eventId, eventSourceUrl, user: { emails?, phones?, firstName?, lastName? }, customData? })` at `src/lib/analytics/meta-capi.ts:103`. Never throws (catches internally). Env-gated on `NEXT_PUBLIC_META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN`. |
| Resend pattern | `src/app/api/contact/route.ts:114-140`: gate on `process.env.RESEND_API_KEY`, `const { Resend } = await import("resend")`, from `process.env.RESEND_FROM_EMAIL || "MannaOS <notifications@mannaos.com>"`, to `["Chris@mannaos.com"]`, try/catch + `console.error`. Mirror it. |
| Calendly | `src/app/[locale]/portal/page.tsx:94,150`: `process.env.NEXT_PUBLIC_CALENDLY_URL ?? "https://calendly.com/mannaonesolution"`. Reuse the same env + fallback. |
| Name prefill | Shared `profiles` table keyed by `id`: `first_name, middle_name, last_name, preferred_name, name_suffix, full_name`. Render with `getDisplayName()` from `src/lib/profile-utils.ts` (returns `'User'` when empty — treat that as no prefill). No phone column exists; phone is always typed by the user. |
| Client event | `ingestClientEvent(eventType, payload)` in `growth/ingest.ts`; `consultation_form_opened` is already in `CLIENT_EVENT_TYPES` and the RLS whitelist (n400_24). |
| `source_cta` | Newest `cta_clicked` event's `payload->>'cta_id'` (n400_24 comment says G3b reads exactly this). |
| CTA card | `GrowthCtaCard.ACTION_HREF.book_consultation` already points to `/n400ready/consultation`; `availableActions` in `growth-state.ts` already adds `book_consultation` when the `booking_form` flag is on. **No wiring change needed for the CTA→form hop.** |
| Graded-event consumers | `profiling.ts` uses gradedEvents ONLY as: count per type (`eventCount`), distinct UTC days, distinct days after a skip timestamp. `learning-signals.ts` uses them ONLY for `practiceDays`. A per-day rollup `{day, practice_count, mock_count, last_at}` reproduces all four exactly (`max(created_at) > skipped_at` ⇔ "some event that day after skip"). |
| Mastery semantics | `masteredQuestionIds` (quiz-engine.ts:419) = last attempt with `mode !== 'flashcard'` per question was correct. `civicsSeen` = distinct question_id over ALL modes. Sections: `deriveSectionMastered` (latest graded per item correct), `deriveSectionGradedTally` (graded correct/total per section). SQL in Task 2 mirrors these; the mapping is simple enough to mirror (DISTINCT ON latest + FILTER counts) but the migration verify step MUST compare RPC output against raw-row TS derivation for a real user before commit. |

## Review findings this plan fixes (from the 2026-07-20 G3a post-merge review)

1. **S1 boundary bug (cta.ts:114):** `s.mockAvgPct <= c.min_avg_pct` rejects a user whose average is exactly 90. "min" must be inclusive. → Task 1.
2. **1000-row silent truncation:** `loadGrowthContext` fetches every `practice_completed`/`mock_completed` event (1 row per graded answer) and `loadLearningSignals` fetches every `n400_quiz_attempts` envelope + nested `n400_question_attempts` (practice mode = 1 envelope per answer) and every `n400_section_attempts` row, all with no limit. Supabase/PostgREST caps responses at 1000 rows **silently and without defined order**, so the most active users — exactly who S2 (`min_practice_days: 20`) and S9 target — would get arbitrary subsets and wrong signals. → Tasks 2–4.
3. **Minor, folded into Task 9:** a converted user's decision log says `no_eligible` (consultation defs are filtered before conditions run), which misleads the §1.5b "why nothing?" query. Task 9 adds honest `converted` / `consultation_pending` reasons while adding the pending gate.

## File map

- Modify: `apps/website/src/lib/n400/growth/cta.ts` (Tasks 1, 9)
- Create: `apps/website/supabase/migrations/n400_25_growth_read_rollups.sql` (Task 2)
- Modify: `apps/website/src/lib/n400/growth/growth-context.ts`, `profiling.ts`, `prompt-state.ts`, `learning-signals.ts` (+ tests) (Tasks 3–4)
- Create: `apps/website/src/lib/n400/growth/booking.ts` + `booking.test.ts` (Task 5)
- Create: `apps/website/src/lib/n400/growth/notify.ts` (Task 6)
- Create: `apps/website/src/lib/n400/growth/booking-actions.ts` (Task 7)
- Create: `apps/website/src/app/n400ready/(app)/consultation/page.tsx`; Modify: `i18n/vi.ts`, `i18n/en.ts` (Task 8)
- Modify: `apps/website/src/lib/n400/growth/cta-state.ts`, `cta.test.ts` (Task 9)
- Modify: `docs/ROADMAP.md` (Task 10)

---

### Task 1: S1 boundary fix — `min_avg_pct` is inclusive

**Files:**
- Modify: `apps/website/src/lib/n400/growth/cta.ts:114`
- Test: `apps/website/src/lib/n400/growth/cta.test.ts`

- [ ] **Step 1: Write the failing test** (use the file's existing builder helpers if present; the fully-explicit form below always works)

```ts
it('S1 fires when the mock average equals min_avg_pct exactly', () => {
  const def: CtaDefinition = {
    cta_id: 's1_mock_ready', variant: 'a', group_key: 'consultation',
    title_en: '', title_vi: '', body_en: '', body_vi: '',
    cta_label_en: '', cta_label_vi: '', action: 'book_consultation',
    conditions: { min_mocks: 3, min_avg_pct: 90 },
    priority: 80, cooldown_days: 7,
  };
  const decision = selectActiveCta({
    userId: 'u1', definitions: [def],
    signals: {
      readinessReady: false, mockCount: 3, mockAvgPct: 90,
      weakestSection: null, weakestSectionAttempts: 0,
      practiceDays: 0, allCivicsSectionsDone: false,
    },
    events: [], journeyStage: null, interviewDate: null,
    journeyConfirmedAt: null, lastGrowthPromptAt: null, consultationBookedAt: null,
    availableActions: new Set<CtaAction>(['book_consultation']),
    now: new Date('2026-07-20T12:00:00Z'),
  });
  expect(decision.def?.cta_id).toBe('s1_mock_ready');
});
```

- [ ] **Step 2: Run it — expect FAIL** — `npx vitest run src/lib/n400/growth/cta.test.ts` (decision.def is null: `90 <= 90` rejects).
- [ ] **Step 3: Fix** — in `meetsConditions`, change `s.mockAvgPct <= c.min_avg_pct` to `s.mockAvgPct < c.min_avg_pct`.
- [ ] **Step 4: Run again — expect PASS** (whole file stays green).
- [ ] **Step 5: Commit** — `fix(n400-growth): make min_avg_pct inclusive so an exact-threshold mock average passes S1`

---

### Task 2: Migration n400_25 — rollup RPCs for the growth read path

**Files:**
- Create: `apps/website/supabase/migrations/n400_25_growth_read_rollups.sql`

Both functions are SECURITY INVOKER with an **explicit `auth.uid()` filter** — never rely on RLS as scope (admin read policies exist on these tables; that bug already happened once, see the G2 post-review fix).

- [ ] **Step 1: Verify live columns before writing SQL.** With `mcp__supabase__execute_sql` on project `ffsrlmtqzlidnuitkdvw`, confirm: `n400_question_attempts(question_id, was_correct, answered_at, attempt_id)`, `n400_quiz_attempts(id, user_id, mode)`, `n400_section_attempts(user_id, section, item_id, mode, was_correct, answered_at)`, `n400_growth_events(user_id, event_type, created_at)`. Adjust the SQL below if anything differs.

- [ ] **Step 2: Write the migration**

```sql
-- Growth Engine G3b: server-side rollups for the growth read path.
--
-- loadGrowthContext / loadLearningSignals previously hauled raw rows
-- (1 growth event per graded answer, 1 quiz envelope per practice answer).
-- PostgREST silently caps a response at 1000 rows with no defined order, so
-- the most active users would get truncated, arbitrary subsets — S2
-- (min_practice_days) breaks for exactly the users it targets. These rollups
-- do the counting in SQL; result size is bounded by distinct study days.

-- One row per UTC day with graded activity.
-- last_at deliberately included: profiling's "active days since skip" needs
-- "was there an event this day AFTER timestamp T" ⇔ max(created_at) > T.
CREATE OR REPLACE FUNCTION public.n400_graded_day_rollup()
RETURNS TABLE (day date, practice_count int, mock_count int, last_at timestamptz)
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(*) FILTER (WHERE event_type = 'practice_completed')::int AS practice_count,
    COUNT(*) FILTER (WHERE event_type = 'mock_completed')::int    AS mock_count,
    MAX(created_at)                                               AS last_at
  FROM n400_growth_events
  WHERE user_id = auth.uid()
    AND event_type IN ('practice_completed', 'mock_completed')
  GROUP BY 1
  ORDER BY 1;
$$;

-- Mastery / coverage / per-section tallies, mirroring the client's pure
-- derivations (quiz-engine.ts masteredQuestionIds, section-progress.ts
-- deriveSectionMastered / deriveSectionGradedTally):
--   graded   = mode <> 'flashcard'
--   mastered = LATEST graded attempt per question/item was correct
--   seen     = any attempt, any mode
-- If these TS functions ever change, this SQL must change with them — the
-- Step 4 comparison query is the drift check, rerun it.
CREATE OR REPLACE FUNCTION public.n400_learning_rollup()
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  WITH civics AS (
    SELECT qa.question_id, qa.was_correct, qa.answered_at, q.mode
    FROM n400_question_attempts qa
    JOIN n400_quiz_attempts q ON q.id = qa.attempt_id
    WHERE q.user_id = auth.uid()
  ),
  civics_latest AS (
    SELECT DISTINCT ON (question_id) question_id, was_correct
    FROM civics WHERE mode <> 'flashcard'
    ORDER BY question_id, answered_at DESC
  ),
  section_graded AS (
    SELECT section, item_id, was_correct, answered_at
    FROM n400_section_attempts
    WHERE user_id = auth.uid() AND mode <> 'flashcard'
  ),
  section_latest AS (
    SELECT DISTINCT ON (section, item_id) section, was_correct
    FROM section_graded
    ORDER BY section, item_id, answered_at DESC
  ),
  section_stats AS (
    SELECT
      g.section,
      (SELECT COUNT(*) FROM section_latest l
        WHERE l.section = g.section AND l.was_correct)::int AS mastered,
      COUNT(*) FILTER (WHERE g.was_correct)::int            AS graded_correct,
      COUNT(*)::int                                         AS graded_total
    FROM section_graded g
    GROUP BY g.section
  )
  SELECT jsonb_build_object(
    'civics_seen',     (SELECT COUNT(DISTINCT question_id) FROM civics),
    'civics_mastered', (SELECT COUNT(*) FROM civics_latest WHERE was_correct),
    'sections', COALESCE(
      (SELECT jsonb_object_agg(section, jsonb_build_object(
                'mastered', mastered,
                'graded_correct', graded_correct,
                'graded_total', graded_total))
         FROM section_stats),
      '{}'::jsonb)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.n400_graded_day_rollup() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.n400_learning_rollup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.n400_graded_day_rollup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_learning_rollup() TO authenticated;
```

- [ ] **Step 3: Apply** with `mcp__supabase__apply_migration` (name `n400_25_growth_read_rollups`).
- [ ] **Step 4: Verify against raw rows (rolled-back style, read-only here).** Via `execute_sql`, pick the most active real user and compare — this is the drift check for the TS-vs-SQL mastery semantics:
  - `SELECT COUNT(DISTINCT (created_at AT TIME ZONE 'UTC')::date) FROM n400_growth_events WHERE user_id = '<u>' AND event_type IN ('practice_completed','mock_completed')` vs the row count of `n400_graded_day_rollup()` run as that user is impractical via SQL editor — instead re-run the rollup bodies with `auth.uid()` replaced by the literal `'<u>'` and compare with independent hand-written aggregates (e.g. mastered via `SELECT COUNT(*) FROM (SELECT DISTINCT ON (qa.question_id) qa.was_correct FROM n400_question_attempts qa JOIN n400_quiz_attempts q ON q.id = qa.attempt_id WHERE q.user_id='<u>' AND q.mode <> 'flashcard' ORDER BY qa.question_id, qa.answered_at DESC) t WHERE was_correct`). All numbers must match.
- [ ] **Step 5: Commit the SQL file** — `feat(n400-growth): rollup RPCs so the growth read path stops hauling per-answer rows`

---

### Task 3: growth-context + profiling consume GradedDay rollup

**Files:**
- Modify: `apps/website/src/lib/n400/growth/profiling.ts` (replace `GradedEvent` with `GradedDay`)
- Modify: `apps/website/src/lib/n400/growth/growth-context.ts`
- Modify: `apps/website/src/lib/n400/growth/prompt-state.ts` (passes `ctx.gradedDays` through)
- Modify: `apps/website/src/lib/n400/growth/learning-signals.ts` (parameter type + `practiceDays` only — full rewire is Task 4)
- Test: `profiling.test.ts`, `growth-state.test.ts`, `learning-signals.test.ts` fixtures

- [ ] **Step 1: Add the type and update the evaluator, TDD.** In `profiling.ts` replace `GradedEvent` with:

```ts
export interface GradedDay {
  /** 'yyyy-mm-dd' (UTC). */
  day: string;
  practiceCount: number;
  mockCount: number;
  /** ISO timestamp of the newest graded event that day. */
  lastAt: string;
}
```

Update `ProfilingInputs.gradedEvents: GradedEvent[]` → `gradedDays: GradedDay[]` and inside `selectActivePrompt`:

```ts
const eventCount = (type: 'practice_completed' | 'mock_completed') =>
  gradedDays.reduce((n, d) => n + (type === 'practice_completed' ? d.practiceCount : d.mockCount), 0);
const distinctDays = gradedDays.length;
```

and the dashboard-surface snooze block:

```ts
const skippedAtMs = new Date(st!.skipped_at!).getTime();
// max(created_at) that day > skip time ⇔ some graded event that day after the skip —
// exactly what the old per-event filter computed.
const activeDaysSinceSkip = gradedDays.filter(
  (d) => new Date(d.lastAt).getTime() > skippedAtMs,
).length;
```

First convert the fixtures in `profiling.test.ts` (write a tiny helper `const gDay = (day: string, practice = 1, mock = 0, lastAt = `${day}T12:00:00Z`): GradedDay => ({ day, practiceCount: practice, mockCount: mock, lastAt });`), run to see the type failures, then apply the evaluator change until green. Behavior assertions must not change — same triggers must fire on equivalent day data.

- [ ] **Step 2: Rewire `growth-context.ts`.** Replace `gradedEvents` with `gradedDays` in `GrowthContext`; the events query keeps ONLY `['cta_shown','cta_dismissed','cta_clicked']` (bounded by the 7-day cap — fine to stay raw); add the RPC to the same `Promise.all`:

```ts
const [leadRes, eventsRes, statesRes, rollupRes] = await Promise.all([
  /* lead profile select — unchanged */,
  supabase
    .from('n400_growth_events')
    .select('event_type, payload, created_at')
    .eq('user_id', userId)
    .in('event_type', ['cta_shown', 'cta_dismissed', 'cta_clicked']),
  /* prompt states select — unchanged */,
  supabase.rpc('n400_graded_day_rollup'),
]);

const gradedDays: GradedDay[] = ((rollupRes.data ?? []) as {
  day: string; practice_count: number; mock_count: number; last_at: string;
}[]).map((r) => ({
  day: r.day, practiceCount: r.practice_count, mockCount: r.mock_count, lastAt: r.last_at,
}));
```

- [ ] **Step 3: Fix the two pass-through consumers.** `prompt-state.ts`: pass `gradedDays: ctx.gradedDays` into the evaluator inputs. `learning-signals.ts`: change the last parameter to `gradedDays: readonly GradedDay[]` and `practiceDays` to `gradedDays.length` (its callsite in `cta-state.ts` passes `ctx.gradedDays`). Update `learning-signals.test.ts` / `growth-state.test.ts` fixtures with the same `gDay` helper.
- [ ] **Step 4: Full check** — `npx tsc --noEmit && npx vitest run` in `apps/website`. Green.
- [ ] **Step 5: Commit** — `refactor(n400-growth): growth context reads the graded-day rollup instead of per-answer events`

---

### Task 4: learning-signals reads the mastery rollup + bounded mock queries

**Files:**
- Modify: `apps/website/src/lib/n400/growth/learning-signals.ts`
- Test: `apps/website/src/lib/n400/growth/learning-signals.test.ts`

- [ ] **Step 1: Replace the three queries.** Drop the full `n400_quiz_attempts` join and the full `n400_section_attempts` fetch; keep `deriveReadiness` and the drift-lock comments (the "mastered ≠ deck state" rule now lives in n400_25's SQL — say so in the comment):

```ts
const [rollupRes, mocksRes, sectionMockRes] = await Promise.all([
  supabase.rpc('n400_learning_rollup'),
  supabase
    .from('n400_quiz_attempts')
    .select(`
      id, mode, score, total_questions, passed, started_at, completed_at,
      n400_question_attempts ( question_id, was_correct, answered_at, attempt_id )
    `)
    .eq('user_id', userId)
    .eq('mode', 'mock_test')
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(100),
  supabase
    .from('n400_section_mock_results')
    .select('id, section, score, total, passed, completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(100),
]);

interface LearningRollup {
  civics_seen: number;
  civics_mastered: number;
  sections: Partial<Record<SectionKey, {
    mastered: number; graded_correct: number; graded_total: number;
  }>>;
}
const rollup = (rollupRes.data ?? { civics_seen: 0, civics_mastered: 0, sections: {} }) as LearningRollup;
```

**Ordering caution:** the old code fetched in insertion order; `deriveReadiness`'s gần-nhất rules must not silently change meaning. After fetching `desc` (which is what makes `.limit(100)` keep the *recent* rows), `.reverse()` both arrays back to ascending before mapping, so downstream sees the same chronological shape as before.

- [ ] **Step 2: Rebuild the signals from the rollup.**

```ts
const sec = (k: SectionKey) => rollup.sections[k] ?? { mastered: 0, graded_correct: 0, graded_total: 0 };

const signals: ReadinessSignals = {
  civicsKnown: rollup.civics_mastered,
  civicsTotal: N400_QUESTIONS.length,
  whatmeanKnown: sec('whatmean').mastered, whatmeanTotal: WHATMEAN_QUESTIONS.length,
  yesnoKnown: sec('yesno').mastered,       yesnoTotal: YESNO_QUESTIONS.length,
  writingKnown: sec('writing').mastered,   writingTotal: WRITING_SENTENCES.length,
  mockResults, sectionMockResults,
};

// Weakest = lowest graded accuracy among sections with graded attempts;
// ties break in SECTION_KEYS order (strict <), matching Study/Progress.
let weakestSection: SectionKey | null = null;
let weakestRate = Infinity;
for (const key of SECTION_KEYS) {
  const t = sec(key);
  if (t.graded_total === 0) continue;
  const rate = t.graded_correct / t.graded_total;
  if (rate < weakestRate) { weakestRate = rate; weakestSection = key; }
}

return {
  readinessReady: readiness.ready,
  mockCount: mockResults.length,
  mockAvgPct,
  weakestSection,
  weakestSectionAttempts: weakestSection ? sec(weakestSection).graded_total : 0,
  practiceDays: gradedDays.length,
  allCivicsSectionsDone: rollup.civics_seen >= N400_QUESTIONS.length,
};
```

Delete the now-unused imports (`masteredQuestionIds`, `deriveSectionMastered`, `deriveSectionGradedTally`, `SectionAttempt`, `QuestionAttempt`, `QuizMode`) and the `DbQuestionAttemptRow` / `DbSectionAttempt` interfaces. `mockResults` mapping stays as-is (rows are already mock_test + completed; keep the per-quiz `questionResults` mapping and the chronological sort of nested attempts only if `deriveReadiness` consumes `questionResults` — check; if not consumed, keep the field but the nested sort can go).

- [ ] **Step 3: Update `learning-signals.test.ts`** — mock `supabase.rpc('n400_learning_rollup')` responses instead of raw attempt rows. Keep the drift-lock test's *assertions* (mastered-not-deck-state scenarios) by expressing them as rollup inputs, and keep a test for weakest-section tie-break order and for `allCivicsSectionsDone` at exactly `civics_seen === N400_QUESTIONS.length`.
- [ ] **Step 4: Full check** — `npx tsc --noEmit && npx vitest run`. Green.
- [ ] **Step 5: Commit** — `refactor(n400-growth): learning signals read the SQL mastery rollup, mock queries bounded`

---

### Task 5: Pure booking logic (TDD)

**Files:**
- Create: `apps/website/src/lib/n400/growth/booking.ts`
- Test: `apps/website/src/lib/n400/growth/booking.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { topicForCta, validateBookingInput } from './booking';

describe('topicForCta', () => {
  it('maps writing/speaking coaching CTAs to their topics', () => {
    expect(topicForCta('s5_writing_help')).toBe('writing');
    expect(topicForCta('s6_speaking_help')).toBe('speaking');
  });
  it('maps filing-stalled to n400_review and readiness/mock CTAs to interview_prep', () => {
    expect(topicForCta('s3_filing_stalled')).toBe('n400_review');
    expect(topicForCta('s1_mock_ready')).toBe('interview_prep');
    expect(topicForCta('s4_interview_soon')).toBe('interview_prep');
    expect(topicForCta('s9_final_review')).toBe('interview_prep');
  });
  it('defaults to n400_review when there is no source CTA', () => {
    expect(topicForCta(null)).toBe('n400_review');
  });
});

describe('validateBookingInput', () => {
  const good = { name: 'Chris Nguyen', phone: '+1 (713) 555-0100', preferredTime: 'weekday_evening', topic: 'interview_prep' };
  it('accepts a complete input and trims the name', () => {
    const v = validateBookingInput({ ...good, name: '  Chris Nguyen ' });
    expect(v).toEqual({ ok: true, value: { ...good, name: 'Chris Nguyen' } });
  });
  it.each([
    ['name', { ...good, name: '   ' }],
    ['name', { ...good, name: 'x'.repeat(121) }],
    ['phone', { ...good, phone: '12345' }],
    ['phone', { ...good, phone: 'call me' }],
    ['preferred_time', { ...good, preferredTime: 'midnight' }],
    ['topic', { ...good, topic: 'divorce_law' }],
  ])('rejects bad %s', (error, raw) => {
    expect(validateBookingInput(raw)).toEqual({ ok: false, error });
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`booking.ts` doesn't exist).
- [ ] **Step 3: Implement**

```ts
// Pure booking logic (spec §5). No IO here — the server action calls these.

export const CONSULTATION_TOPICS = ['n400_review', 'interview_prep', 'writing', 'speaking', 'other'] as const;
export type ConsultationTopic = (typeof CONSULTATION_TOPICS)[number];

export const PREFERRED_TIMES = ['weekday_day', 'weekday_evening', 'weekend'] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];

/** Prefill the form topic from the CTA that brought the user here (spec §5.1). */
export function topicForCta(sourceCta: string | null): ConsultationTopic {
  if (!sourceCta) return 'n400_review';
  if (sourceCta.startsWith('s5_')) return 'writing';
  if (sourceCta.startsWith('s6_')) return 'speaking';
  if (sourceCta.startsWith('s3_')) return 'n400_review';
  return 'interview_prep'; // s1 / s4 / s9 — readiness & mock scenarios
}

export interface BookingInput {
  name: string;
  phone: string;
  preferredTime: PreferredTime;
  topic: ConsultationTopic;
}

export type BookingValidation =
  | { ok: true; value: BookingInput }
  | { ok: false; error: 'name' | 'phone' | 'preferred_time' | 'topic' };

export function validateBookingInput(raw: {
  name?: unknown; phone?: unknown; preferredTime?: unknown; topic?: unknown;
}): BookingValidation {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name || name.length > 120) return { ok: false, error: 'name' };

  const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
  // Lenient by design: US or VN formats, 7–20 chars, at least 7 digits.
  if (!/^[+()\d\s.\-]{7,20}$/.test(phone) || (phone.match(/\d/g) ?? []).length < 7) {
    return { ok: false, error: 'phone' };
  }

  if (!(PREFERRED_TIMES as readonly string[]).includes(raw.preferredTime as string)) {
    return { ok: false, error: 'preferred_time' };
  }
  if (!(CONSULTATION_TOPICS as readonly string[]).includes(raw.topic as string)) {
    return { ok: false, error: 'topic' };
  }
  return {
    ok: true,
    value: { name, phone, preferredTime: raw.preferredTime as PreferredTime, topic: raw.topic as ConsultationTopic },
  };
}
```

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `feat(n400-growth): pure booking validation and CTA-to-topic prefill`

---

### Task 6: Staff notification (Resend)

**Files:**
- Create: `apps/website/src/lib/n400/growth/notify.ts`

Thin env-gated IO wrapper (same class as `cta-actions.ts` — no unit test; tsc + the Task 10 checkpoint cover it). Mirrors `src/app/api/contact/route.ts` exactly.

- [ ] **Step 1: Implement**

```ts
// Staff notifications (spec §1.7 notify.ts). Server-only, best-effort:
// a failed email must never fail the consultation insert that triggered it.

export interface ConsultationNotifyInput {
  name: string;
  phone: string;
  preferredTime: string;
  topic: string;
  sourceCta: string | null;
  userEmail: string | null;
}

export async function notifyConsultationRequest(input: ConsultationNotifyInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'MannaOS <notifications@mannaos.com>',
      to: ['Chris@mannaos.com'],
      subject: `N400Ready consultation request — ${input.name}`,
      html: [
        '<h2>New consultation request (N400Ready)</h2>',
        `<p><strong>Name:</strong> ${escapeHtml(input.name)}</p>`,
        `<p><strong>Phone:</strong> ${escapeHtml(input.phone)}</p>`,
        `<p><strong>Email:</strong> ${escapeHtml(input.userEmail ?? '—')}</p>`,
        `<p><strong>Preferred time:</strong> ${escapeHtml(input.preferredTime)}</p>`,
        `<p><strong>Topic:</strong> ${escapeHtml(input.topic)}</p>`,
        `<p><strong>Source CTA:</strong> ${escapeHtml(input.sourceCta ?? 'none')}</p>`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Consultation notify error:', err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

(If `contact/route.ts` already exports/contains an HTML-escape helper, reuse that instead of redefining — check first.)

- [ ] **Step 2: `npx tsc --noEmit` green.**
- [ ] **Step 3: Commit** — `feat(n400-growth): Resend staff notification for consultation requests`

---

### Task 7: Booking server actions

**Files:**
- Create: `apps/website/src/lib/n400/growth/booking-actions.ts`

Thin `'use server'` wrappers, same shape as `prompt-actions.ts` / `cta-actions.ts`. All decisions live in `booking.ts`; the DB trigger (n400_17) handles score + timestamps.

- [ ] **Step 1: Implement**

```ts
'use server';

// Booking flow writes/reads (spec §5). The insert is the source of truth:
// n400_17's trigger stamps consultation_requested_at and recomputes the score,
// so this file emits NO growth event and touches NO lead-profile column.
// Resend + CAPI run after the insert, best-effort — they can fail without
// costing the user their request.

import { getAuthedServerClient } from './server-client';
import { isFeatureOn, loadFeatureFlags } from './flags';
import {
  topicForCta, validateBookingInput,
  type ConsultationTopic,
} from './booking';
import { notifyConsultationRequest } from './notify';
import { sendCapiLead } from '@/lib/analytics/meta-capi';
import { getDisplayName } from '@/lib/profile-utils';

export interface BookingContext {
  enabled: boolean;
  alreadyRequested: boolean;
  prefillName: string;
  sourceCta: string | null;
  prefillTopic: ConsultationTopic;
}

const DISABLED: BookingContext = {
  enabled: false, alreadyRequested: false, prefillName: '', sourceCta: null, prefillTopic: 'n400_review',
};

async function latestClickedCta(
  supabase: Awaited<ReturnType<typeof getAuthedServerClient>>['supabase'],
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('n400_growth_events')
    .select('payload')
    .eq('user_id', userId)
    .eq('event_type', 'cta_clicked')
    .order('created_at', { ascending: false })
    .limit(1);
  return ((data?.[0]?.payload as { cta_id?: string } | null)?.cta_id) ?? null;
}

export async function getBookingContext(): Promise<BookingContext> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return DISABLED;
  const flags = await loadFeatureFlags(supabase, ['growth_engine', 'booking_form']);
  if (!isFeatureOn(flags.get('growth_engine'), user.id) || !isFeatureOn(flags.get('booking_form'), user.id)) {
    return DISABLED;
  }

  const [openRes, profileRes, sourceCta] = await Promise.all([
    supabase
      .from('n400_consultation_requests')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['new', 'contacted'])
      .limit(1),
    supabase
      .from('profiles')
      .select('first_name, middle_name, last_name, preferred_name, name_suffix, full_name')
      .eq('id', user.id)
      .maybeSingle(),
    latestClickedCta(supabase, user.id),
  ]);

  const display = profileRes.data ? getDisplayName(profileRes.data) : '';
  return {
    enabled: true,
    alreadyRequested: (openRes.data ?? []).length > 0,
    prefillName: display === 'User' ? '' : display,
    sourceCta,
    prefillTopic: topicForCta(sourceCta),
  };
}

export async function submitConsultationRequest(raw: {
  name?: unknown; phone?: unknown; preferredTime?: unknown; topic?: unknown;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false, error: 'unauthorized' };
  const flags = await loadFeatureFlags(supabase, ['growth_engine', 'booking_form']);
  if (!isFeatureOn(flags.get('growth_engine'), user.id) || !isFeatureOn(flags.get('booking_form'), user.id)) {
    return { ok: false, error: 'disabled' };
  }

  const v = validateBookingInput(raw);
  if (!v.ok) return { ok: false, error: `invalid_${v.error}` };

  // Server-side dedupe: one open request per user. Idempotent success —
  // a double-submit or a second tab should land on the confirm screen, not an error.
  const open = await supabase
    .from('n400_consultation_requests')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['new', 'contacted'])
    .limit(1);
  if ((open.data ?? []).length > 0) return { ok: true };

  const [touchRes, sourceCta] = await Promise.all([
    supabase.from('n400_lead_profiles').select('first_touch, last_touch').eq('user_id', user.id).maybeSingle(),
    latestClickedCta(supabase, user.id),
  ]);

  const { data: inserted, error } = await supabase
    .from('n400_consultation_requests')
    .insert({
      user_id: user.id,
      name: v.value.name,
      phone: v.value.phone,
      preferred_time: v.value.preferredTime,
      topic: v.value.topic,
      source_cta: sourceCta,
      first_touch: touchRes.data?.first_touch ?? null,
      last_touch: touchRes.data?.last_touch ?? null,
    })
    .select('id')
    .single();
  if (error || !inserted) return { ok: false, error: 'insert_failed' };

  // Best-effort side effects — both helpers catch internally and never throw.
  await Promise.all([
    notifyConsultationRequest({
      name: v.value.name, phone: v.value.phone,
      preferredTime: v.value.preferredTime, topic: v.value.topic,
      sourceCta, userEmail: user.email ?? null,
    }),
    sendCapiLead({
      eventId: `n400-consultation-${inserted.id}`,
      eventSourceUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mannaos.com'}/n400ready/consultation`,
      user: { emails: user.email ? [user.email] : [], phones: [v.value.phone] },
      customData: { source: 'n400ready', topic: v.value.topic, source_cta: sourceCta ?? 'none' },
    }),
  ]);

  return { ok: true };
}
```

Before committing, check how `src/app/api/contact/route.ts` builds `eventSourceUrl` — if it derives from the request/headers or a different env var, mirror that instead of `NEXT_PUBLIC_SITE_URL`.

- [ ] **Step 2: `npx tsc --noEmit` green.**
- [ ] **Step 3: Commit** — `feat(n400-growth): consultation booking server actions with dedupe, notify and CAPI Lead`

---

### Task 8: Consultation page + dict

**Files:**
- Create: `apps/website/src/app/n400ready/(app)/consultation/page.tsx`
- Modify: `apps/website/src/lib/n400/i18n/vi.ts` (growth section), `apps/website/src/lib/n400/i18n/en.ts` (same keys)

- [ ] **Step 1: Add dict keys.** In `vi.ts` inside `growth:` add (and mirror in `en.ts` with English copy):

```ts
booking: {
  eyebrow: 'Tư vấn miễn phí',
  title: 'Đặt buổi tư vấn miễn phí',
  subtitle: 'Điền thông tin, đội ngũ Manna sẽ liên hệ trong 1 ngày làm việc.',
  nameLabel: 'Họ tên',
  phoneLabel: 'Số điện thoại',
  timeLabel: 'Khung giờ thuận tiện',
  timeOptions: {
    weekday_day: 'Ngày thường — giờ hành chính',
    weekday_evening: 'Ngày thường — buổi tối',
    weekend: 'Cuối tuần',
  },
  topicLabel: 'Bạn muốn trao đổi về',
  topics: {
    n400_review: 'Rà soát hồ sơ N-400',
    interview_prep: 'Chuẩn bị phỏng vấn',
    writing: 'Luyện Viết',
    speaking: 'Luyện Nói / phỏng vấn',
    other: 'Chủ đề khác',
  },
  submit: 'Gửi yêu cầu',
  submitting: 'Đang gửi…',
  errorRequired: 'Vui lòng kiểm tra lại họ tên và số điện thoại.',
  errorGeneric: 'Không gửi được yêu cầu. Vui lòng thử lại.',
  confirmTitle: 'Đã nhận yêu cầu của bạn!',
  confirmBody: 'Chúng tôi sẽ liên hệ trong 1 ngày làm việc. Muốn chọn giờ ngay bây giờ?',
  calendlyCta: 'Tự chọn lịch trên Calendly',
  alreadyTitle: 'Bạn đã có một yêu cầu đang chờ',
  alreadyBody: 'Đội ngũ Manna sẽ sớm liên hệ với bạn. Cần đổi giờ? Chọn lịch trực tiếp bên dưới.',
  backToDashboard: 'Về trang chính',
},
```

English (`en.ts`): `eyebrow: 'Free consultation'`, `title: 'Book a free consultation'`, `subtitle: 'Fill in your details — the Manna team will contact you within 1 business day.'`, `nameLabel: 'Full name'`, `phoneLabel: 'Phone number'`, `timeLabel: 'Best time to reach you'`, timeOptions `'Weekdays — business hours' / 'Weekdays — evening' / 'Weekend'`, `topicLabel: 'What would you like to discuss?'`, topics `'N-400 application review' / 'Interview preparation' / 'Writing coaching' / 'Speaking / interview coaching' / 'Something else'`, `submit: 'Send request'`, `submitting: 'Sending…'`, `errorRequired: 'Please check your name and phone number.'`, `errorGeneric: 'Could not send your request. Please try again.'`, `confirmTitle: 'We got your request!'`, `confirmBody: 'We will contact you within 1 business day. Want to pick a time right now?'`, `calendlyCta: 'Pick a slot on Calendly'`, `alreadyTitle: 'You already have a pending request'`, `alreadyBody: 'The Manna team will reach out soon. Need a specific time? Pick a slot below.'`, `backToDashboard: 'Back to dashboard'`.

- [ ] **Step 2: Build the page.** Client component, same visual family as `GrowthCtaCard` (white rounded-[24px] card, teal accent). Before writing JSX, skim an existing `(app)` page (e.g. `profile/edit/page.tsx`) for the shell/router conventions of this Next version.

```tsx
'use client';

// Consultation booking form (spec §5). One screen, three states:
// form → confirm (with Calendly link), or "already requested" if an open
// request exists. Flags off → bounce to the dashboard; the CTA that links
// here is flag-gated too, so this is only a deep-link guard.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import {
  getBookingContext, submitConsultationRequest, type BookingContext,
} from '@/lib/n400/growth/booking-actions';
import { ingestClientEvent } from '@/lib/n400/growth/ingest';
import {
  CONSULTATION_TOPICS, PREFERRED_TIMES,
  type ConsultationTopic, type PreferredTime,
} from '@/lib/n400/growth/booking';

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/mannaonesolution';

export default function ConsultationPage() {
  const { dict } = useN400Lang();
  const router = useRouter();
  const t = dict.growth.booking;

  const [ctx, setCtx] = useState<BookingContext | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState<PreferredTime>('weekday_evening');
  const [topic, setTopic] = useState<ConsultationTopic>('n400_review');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedLogged = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getBookingContext()
      .then((c) => {
        if (cancelled) return;
        if (!c.enabled) { router.replace('/n400ready'); return; }
        setCtx(c);
        setName(c.prefillName);
        setTopic(c.prefillTopic);
        if (!c.alreadyRequested && !openedLogged.current) {
          openedLogged.current = true;
          void ingestClientEvent('consultation_form_opened', { source_cta: c.sourceCta ?? 'none' });
        }
      })
      .catch(() => { router.replace('/n400ready'); });
    return () => { cancelled = true; };
  }, [router]);

  if (!ctx) return null;

  if (submitted || ctx.alreadyRequested) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-teal-600">{t.eyebrow}</div>
          <h1 className="mt-1.5 text-xl font-bold text-gray-800">
            {submitted ? t.confirmTitle : t.alreadyTitle}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {submitted ? t.confirmBody : t.alreadyBody}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={CALENDLY_URL} target="_blank" rel="noopener noreferrer"
              className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {t.calendlyCta}
            </a>
            <Link
              href="/n400ready"
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              {t.backToDashboard}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitConsultationRequest({ name, phone, preferredTime, topic });
      if (res.ok) setSubmitted(true);
      else setError(res.error?.startsWith('invalid_') ? t.errorRequired : t.errorGeneric);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wide text-teal-600">{t.eyebrow}</div>
        <h1 className="mt-1.5 text-xl font-bold text-gray-800">{t.title}</h1>
        <p className="mt-1 text-sm text-gray-600">{t.subtitle}</p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">{t.nameLabel}</span>
            <input
              value={name} onChange={(e) => setName(e.target.value)} required maxLength={120}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">{t.phoneLabel}</span>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)} required
              type="tel" inputMode="tel" placeholder="(713) 555-0100"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700">{t.timeLabel}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {PREFERRED_TIMES.map((v) => (
                <button
                  key={v} type="button" onClick={() => setPreferredTime(v)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    preferredTime === v
                      ? 'border-teal-600 bg-teal-50 font-semibold text-teal-700'
                      : 'border-slate-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t.timeOptions[v]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">{t.topicLabel}</span>
            <select
              value={topic} onChange={(e) => setTopic(e.target.value as ConsultationTopic)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              {CONSULTATION_TOPICS.map((v) => (
                <option key={v} value={v}>{t.topics[v]}</option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit" disabled={submitting}
            className="w-full rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
```

Adjust the redirect target if the dashboard route is `/n400ready` vs `/n400ready/dashboard` — check `ACTION_HREF` neighbors and the `(app)/page.tsx` location (the dashboard lives at the `(app)` index, so `/n400ready` is expected to be correct).

- [ ] **Step 3: Type + dict parity check** — `npx tsc --noEmit` (en.ts and vi.ts must have identical key shapes or the `N400Dict` type errors will say so).
- [ ] **Step 4: Run full tests** — `npx vitest run`. Green.
- [ ] **Step 5: Commit** — `feat(n400-growth): consultation booking page with confirm and Calendly handoff`

---

### Task 9: CTA gating — pending request suppresses the consultation group, honest log reasons

**Files:**
- Modify: `apps/website/src/lib/n400/growth/cta.ts`
- Modify: `apps/website/src/lib/n400/growth/cta-state.ts`
- Test: `apps/website/src/lib/n400/growth/cta.test.ts`

Spec rule 5 only retires the group on *booked*, but showing "book a free consultation" to someone whose request is sitting in the inbox is spam — the exact thing the engine exists to avoid. Pending (`new`/`contacted`) suppresses; `cancelled`/`no_show` lets CTAs return.

- [ ] **Step 1: Write failing tests**

```ts
it('suppresses consultation CTAs while a request is pending, with reason consultation_pending', () => {
  const d = selectActiveCta(makeInputs({ consultationPending: true })); // an otherwise-eligible S9-style def
  expect(d.def).toBeNull();
  expect(d.reason).toBe('consultation_pending');
});

it('reports converted (not no_eligible) when only booking retirement removed the CTAs', () => {
  const d = selectActiveCta(makeInputs({ consultationBookedAt: '2026-07-01T00:00:00Z' }));
  expect(d.def).toBeNull();
  expect(d.reason).toBe('converted');
});

it('still shows education CTAs while a consultation request is pending', () => {
  // inputs with consultationPending: true and an eligible education def (S7 shape)
  const d = selectActiveCta(makeInputsWithEducationDef({ consultationPending: true }));
  expect(d.def?.group_key).toBe('education');
});
```

(Adapt to the file's existing input builders; every field of `CtaInputs` must be present, `consultationPending: false` becomes part of the default builder.)

- [ ] **Step 2: Implement.** In `cta.ts`: add `consultationPending: boolean;` to `CtaInputs` (doc: "an open request — status new/contacted — parks the consultation group without burning cooldowns"). In `selectActiveCta`:

```ts
const consultationRetired = Boolean(inputs.consultationBookedAt);
const consultationParked = consultationRetired || inputs.consultationPending;
```

use `consultationParked` in the eligibility loop where `consultationRetired` was, and make the empty-eligible return honest:

```ts
if (eligible.length === 0) {
  // If the ONLY thing that removed consultation CTAs was conversion or a
  // pending request, say so — 'no_eligible' here would mislead the §1.5b
  // "why does this user see nothing?" query.
  const suppressed = consultationParked && definitions.some(
    (d) => d.group_key === 'consultation'
      && inputs.availableActions.has(d.action)
      && meetsConditions(d, inputs),
  );
  const reason = !suppressed ? 'no_eligible'
    : consultationRetired ? 'converted'
    : 'consultation_pending';
  return { def: null, reason, eligible: [] };
}
```

- [ ] **Step 3: Wire the loader.** In `cta-state.ts`, add the open-request read to the existing `Promise.all` and pass the flag:

```ts
const [defsRes, signals, pendingRes] = await Promise.all([
  /* definitions select — unchanged */,
  loadLearningSignals(supabase, ctx.userId, dict, ctx.gradedDays),
  supabase
    .from('n400_consultation_requests')
    .select('id')
    .eq('user_id', ctx.userId)
    .in('status', ['new', 'contacted'])
    .limit(1),
]);
// …
consultationPending: (pendingRes.data ?? []).length > 0,
```

(This read belongs to the CTA half alone, so per the growth-context guard rail it lives here, not in `loadGrowthContext`.)

- [ ] **Step 4: Run** — `npx vitest run src/lib/n400/growth/cta.test.ts` then the full suite + `npx tsc --noEmit`. Green.
- [ ] **Step 5: Commit** — `feat(n400-growth): pending consultation request parks the consultation CTA group`

---

### Task 10: Roadmap, full verification, flag checkpoint

**Files:**
- Modify: `docs/ROADMAP.md` (Phase 3E growth-engine line — mark G3b shipped, keep G3c/G4 unchecked)

- [ ] **Step 1: Full verification** — in `apps/website`: `npx tsc --noEmit && npx vitest run`. Both green, paste output in the task report.
- [ ] **Step 2: Update `docs/ROADMAP.md`** — change the G3b checkbox `[ ]` → `[x]` on the growth-engine Phase 3E line(s), matching how G3a was marked in commit 4de66fcb.
- [ ] **Step 3: Commit** — `docs: mark growth engine G3b shipped in roadmap`
- [ ] **Step 4: CHECKPOINT — ask the user (do not decide for them):**
  1. Flip `booking_form` flag to enabled on prod? (G3a precedent: user flipped `cta_engine` pre-deploy since the branch wasn't live yet.)
  2. Are `RESEND_API_KEY` / `RESEND_FROM_EMAIL` set in the website's production env (they exist for the contact form — confirm the same deployment serves `/n400ready`)?
  3. Is `NEXT_PUBLIC_CALENDLY_URL` set, or is the `calendly.com/mannaonesolution` fallback correct?
  4. Merge per finishing-a-development-branch (G2/G3a precedent: merge to main, delete branch, clean worktree).

---

## Self-review notes

- **Spec §5 coverage:** form in-app with prefilled name + topic (Tasks 5/7/8), insert with `source_cta` + touch snapshots (Task 7), score/event via existing n400_17 trigger (no-op here, documented), Resend notify (Task 6), confirm + Calendly (Task 8), CAPI `Lead` (Task 7), `consultation_form_opened` funnel event (Task 8). Status pipeline + inbox = G4, out of scope.
- **Not in this plan on purpose:** no new growth-event type (scoring reads the requests table); no changes to `growth-state.ts` (availableActions already keys off `booking_form`); no `GrowthCtaCard` change (`ACTION_HREF` already correct); Filing Checklist = G3c.
- **Type continuity:** `GradedDay` defined in Task 3 is the same type consumed in Tasks 4 and 9 (`ctx.gradedDays`); `consultationPending` added to `CtaInputs` in Task 9 is provided by `cta-state.ts` in the same task; `BookingContext`/`validateBookingInput` defined in Tasks 5/7 are what Task 8 imports.
