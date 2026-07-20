# N400 Growth Engine — G2 (Conversation Model) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the 3-level progressive-profiling conversation — Level 2 card under Practice/Mock results, Level 1 soft card on the Dashboard, Level 3 immediate Dashboard reaction (hero intent tier) — plus the `n400_answer_profile_prompt` RPC family, all gated behind the `profiling` + `growth_engine` feature flags (currently OFF).

**Architecture:** Copy/triggers/snooze params live in `n400_prompt_definitions` (seeded in G1). A **pure evaluator** `selectActivePrompt()` in `src/lib/n400/growth/profiling.ts` returns the one active question for a surface (`results` | `dashboard`) **plus the `reason` it won**; server actions in `prompt-actions.ts` load inputs and call it. All writes to `n400_lead_profiles` / `n400_profile_prompts` go through SECURITY DEFINER RPCs (the tables have no user write policies — G1 design). Answering fires a `prompt_answered` event whose AFTER INSERT trigger recomputes the lead score, so the RPC updates profile columns **before** inserting the event. Every funnel event (`prompt_shown` → `prompt_answered` / `prompt_skipped`) carries `question_key`, `variant` and `surface`, so per-level and per-variant conversion is a single query on `n400_growth_events`. The dashboard hero gets a **priority-ordered growth intent tier** (`GROWTH_INTENT_TIERS`, one row today: `interview_scheduled` → interview mode) sitting above the existing behavior ladder in `hero-recommendation.ts` — G3 appends rows instead of editing control flow.

**Tech Stack:** Next.js 16 App Router (⚠️ read `node_modules/next/dist/docs/` per `apps/website/AGENTS.md` before writing route/server-action code), Supabase (Postgres + RLS), vitest (pure modules only — no component test rig). Monorepo isolation: **all edits confined to `apps/website/`** (+ this docs folder + `docs/ROADMAP.md`). Migrations applied to remote project `ffsrlmtqzlidnuitkdvw` via `mcp__supabase__apply_migration`. Branch: `feat/n400-growth-g2` (one branch per phase, per spec §8).

**Spec:** `docs/superpowers/specs/2026-07-19-n400-growth-engine-design.md` §3 (v3, commit `1f9d1b85`). G1 plan (shipped): `2026-07-19-n400-growth-g1-data-engine.md`, migrations `n400_15`–`n400_19`.

**G2 scope guards (YAGNI):**
- No CTA engine, no `getGrowthState`, no booking form, no checklist page, no notify — G3.
- Level 3 reaction for `filed = not_yet` ("Recommended: Filing Checklist") is **deferred to G3** — the checklist page doesn't exist yet and its `filing_checklist` flag is OFF. G2's Level 3 = the `interview_scheduled` hero mode. `filed = yes` "emphasize the practice path" needs no hero change (the behavior ladder already is the practice path); its real effect is unlocking question ③ via `depends_on` — which this plan implements.
- `wants_guidance = yes` "unlock free Q&A channel" is a consultation CTA — G3. The answer is stored now; the reaction ships with the CTA engine.
- Prompts are governed by their own snooze mechanic (spec §3.3). The 7-day CTA cap / `last_growth_prompt_at` belongs to the G3 CTA engine — do not touch it here.

**Two G1 facts this plan corrects/locks:**
1. **Bug (Task 1):** G1's attempt emitter fires only on UPDATE (`completed_at` NULL→NOT NULL, the finalize-RPC path used by the civics mock). The practice path (`user-state.tsx` `recordAnswer`) INSERTs one already-completed envelope row per graded answer, so **no live `practice_completed` event has ever been emitted** (verified: zero events newer than the n400_19 backfill; the backfill itself counted these same envelope rows). G2's `filed` prompt triggers on `practice_completed` ≥ 1, so this must be fixed first.
2. **Semantics decision:** one `practice_completed` event = one graded **answer** (envelope row), not one sitting. Where the spec says "session"/"buổi", this codebase already equates a session with an **active day** ([[n400-readiness-pace-engine]]: buổi = active day). So: `wants_guidance` trigger is reseeded from `after_event min_count 5` → `distinct_practice_days: 5`, and `snooze_sessions` is evaluated as **distinct active days since skip**. (G1's scoring rules `practice_sessions_5` etc. keep their seeded semantics — recalibration is a marketing config edit, out of scope.)

---

### Task 1: Migration `n400_20_growth_emitter_insert_fix.sql` — emit events on the INSERT path + reseed `wants_guidance` trigger

**Files:**
- Create: `apps/website/supabase/migrations/n400_20_growth_emitter_insert_fix.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Growth Engine G2 prep (spec §3 depends on live practice_completed events).
--
-- G1's emitter (n400_18) fires only AFTER UPDATE when completed_at goes
-- NULL → NOT NULL — the finalize-RPC path used by the civics mock test.
-- The practice path (user-state.tsx recordAnswer / recordMockResult) INSERTs
-- one already-completed envelope row per graded answer, which never UPDATEs,
-- so no live practice_completed event was ever emitted (the n400_19 backfill
-- counted these same envelope rows, masking the gap). Cover the INSERT path.
--
-- No double-emit is possible: the finalize path inserts with completed_at
-- NULL (this trigger no-ops) and later updates (n400_18 trigger fires); the
-- direct path inserts completed (this trigger fires) and never updates.

CREATE OR REPLACE FUNCTION public.n400_trg_attempt_inserted_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.mode IN ('practice','mock_test') THEN
    PERFORM n400_emit_growth_event(
      NEW.user_id,
      CASE NEW.mode WHEN 'mock_test' THEN 'mock_completed' ELSE 'practice_completed' END,
      jsonb_build_object('attempt_id', NEW.id, 'score', NEW.score,
                         'total', NEW.total_questions, 'passed', NEW.passed));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_n400_growth_attempt_inserted ON public.n400_quiz_attempts;
CREATE TRIGGER trg_n400_growth_attempt_inserted
AFTER INSERT ON public.n400_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_attempt_inserted_completed();

-- Reseed wants_guidance trigger: practice_completed = one event per graded
-- ANSWER (envelope row), so "after 5 study sessions" as min_count 5 would trip
-- inside the first sitting. A "session/buổi" is an active day everywhere else
-- in this app (pace engine), so use 5 distinct practice days instead.
UPDATE public.n400_prompt_definitions
SET trigger = '{"distinct_practice_days": 5}'::jsonb, updated_at = now()
WHERE question_key = 'wants_guidance' AND variant = 'a';
```

- [ ] **Step 2: Apply the migration**

Run `mcp__supabase__apply_migration` with name `n400_20_growth_emitter_insert_fix` and the file content.

- [ ] **Step 3: Verify with a rolled-back live test**

Run via `mcp__supabase__execute_sql`:

```sql
DO $$
DECLARE v_user uuid; v_attempt uuid; v_n int;
BEGIN
  SELECT user_id INTO v_user FROM n400_user_profile LIMIT 1;
  INSERT INTO n400_quiz_attempts (user_id, mode, score, total_questions, passed, completed_at)
  VALUES (v_user, 'practice', 1, 1, NULL, now()) RETURNING id INTO v_attempt;
  SELECT count(*) INTO v_n FROM n400_growth_events
  WHERE user_id = v_user AND event_type = 'practice_completed'
    AND payload->>'attempt_id' = v_attempt::text;
  IF v_n = 1 THEN RAISE EXCEPTION 'TEST_OK (rolled back)';
  ELSE RAISE EXCEPTION 'TEST_FAIL: emitted % events', v_n; END IF;
END $$;
```

Expected: error message `TEST_OK (rolled back)` — the RAISE rolls back the test insert, nothing persists. Also verify the reseed: `SELECT trigger FROM n400_prompt_definitions WHERE question_key = 'wants_guidance';` → `{"distinct_practice_days": 5}`.

- [ ] **Step 4: Commit**

```bash
git add apps/website/supabase/migrations/n400_20_growth_emitter_insert_fix.sql
git commit -m "fix(n400-growth): emit practice/mock events on the insert path, session=active-day trigger for wants_guidance"
```

---

### Task 2: Migration `n400_21_growth_profiling_rpcs.sql` — answer / skip / mark-shown RPCs

**Files:**
- Create: `apps/website/supabase/migrations/n400_21_growth_profiling_rpcs.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Growth Engine G2: progressive-profiling RPCs (spec §3).
-- n400_lead_profiles / n400_profile_prompts have NO user write policies (G1
-- design) — all writes go through these SECURITY DEFINER functions.
--
-- Ordering inside n400_answer_profile_prompt is deliberate: profile columns
-- update BEFORE the prompt_answered event is inserted, so the AFTER INSERT
-- recompute trigger (trg_n400_growth_recompute) reads the fresh answers
-- (interview_scheduled +60 / filing_timeline '30d' +40) in the same
-- transaction.

CREATE OR REPLACE FUNCTION public.n400_answer_profile_prompt(
  p_question_key text,
  p_answer       text,
  p_variant      text DEFAULT 'a',
  p_surface      text DEFAULT NULL   -- 'results' (L2) | 'dashboard' (L1); in every
                                     -- event payload so per-level conversion is one query
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_def  n400_prompt_definitions%ROWTYPE;
  v_date date;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;

  SELECT * INTO v_def FROM n400_prompt_definitions
  WHERE question_key = p_question_key AND variant = p_variant AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown prompt %/%', p_question_key, p_variant;
  END IF;

  -- Validate the answer against the definition (interview_date is the one
  -- free-form question: a date, not an option value).
  IF p_question_key = 'interview_date' THEN
    v_date := p_answer::date;  -- raises on garbage
  ELSIF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_def.options) AS o
    WHERE o->>'value' = p_answer
  ) THEN
    RAISE EXCEPTION 'invalid answer % for %', p_answer, p_question_key;
  END IF;

  INSERT INTO n400_lead_profiles (user_id) VALUES (v_user)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE n400_lead_profiles SET
    n400_filed          = CASE WHEN p_question_key = 'filed'
                               THEN (p_answer = 'yes') ELSE n400_filed END,
    filing_timeline     = CASE WHEN p_question_key = 'filing_timeline'
                               THEN p_answer ELSE filing_timeline END,
    interview_scheduled = CASE WHEN p_question_key = 'interview_notice'
                               THEN (p_answer = 'yes') ELSE interview_scheduled END,
    interview_date      = CASE WHEN p_question_key = 'interview_date'
                               THEN v_date ELSE interview_date END,
    wants_guidance      = CASE WHEN p_question_key = 'wants_guidance'
                               THEN p_answer ELSE wants_guidance END,
    updated_at = now()
  WHERE user_id = v_user;

  -- journey_stage is a pure function of the profiling answers and ONLY of
  -- them (spec §1.2: journey axis never derives from lead_status/score).
  UPDATE n400_lead_profiles SET journey_stage = CASE
      WHEN interview_scheduled IS TRUE  THEN 'interview_scheduled'
      WHEN n400_filed IS TRUE AND interview_scheduled IS FALSE THEN 'waiting_interview'
      WHEN n400_filed IS TRUE  THEN 'filed'
      WHEN n400_filed IS FALSE THEN 'preparing'
      ELSE 'exploring' END
  WHERE user_id = v_user;

  INSERT INTO n400_profile_prompts (user_id, question_key, answered_at, snooze_until)
  VALUES (v_user, p_question_key, now(), NULL)
  ON CONFLICT (user_id, question_key) DO UPDATE
  SET answered_at = now(), snooze_until = NULL;

  -- Last on purpose — fires the score recompute, which must see the columns
  -- written above.
  PERFORM n400_emit_growth_event(v_user, 'prompt_answered',
    jsonb_build_object('question_key', p_question_key, 'answer', p_answer,
                       'variant', p_variant, 'surface', p_surface));
END; $$;

CREATE OR REPLACE FUNCTION public.n400_skip_profile_prompt(
  p_question_key text,
  p_variant      text DEFAULT 'a',
  p_surface      text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_days int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;

  SELECT snooze_days INTO v_days FROM n400_prompt_definitions
  WHERE question_key = p_question_key AND variant = p_variant AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown prompt %/%', p_question_key, p_variant;
  END IF;

  INSERT INTO n400_profile_prompts (user_id, question_key, skipped_at, snooze_until)
  VALUES (v_user, p_question_key, now(), now() + make_interval(days => v_days))
  ON CONFLICT (user_id, question_key) DO UPDATE
  SET skipped_at = now(), snooze_until = now() + make_interval(days => v_days);

  PERFORM n400_emit_growth_event(v_user, 'prompt_skipped',
    jsonb_build_object('question_key', p_question_key, 'variant', p_variant,
                       'surface', p_surface));
END; $$;

CREATE OR REPLACE FUNCTION public.n400_mark_prompt_shown(
  p_question_key text,
  p_variant      text DEFAULT 'a',
  p_surface      text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;
  INSERT INTO n400_profile_prompts (user_id, question_key, shown_count, last_shown_at)
  VALUES (v_user, p_question_key, 1, now())
  ON CONFLICT (user_id, question_key) DO UPDATE
  SET shown_count = n400_profile_prompts.shown_count + 1, last_shown_at = now();

  -- Impression event: the funnel shown → answered / skipped reads from ONE
  -- table, per question × variant × surface (spec §7 wants answer rate per
  -- variant — shown_count alone carries neither variant nor surface).
  -- shown_count stays as cheap per-question resume state.
  PERFORM n400_emit_growth_event(v_user, 'prompt_shown',
    jsonb_build_object('question_key', p_question_key, 'variant', p_variant,
                       'surface', p_surface));
END; $$;

REVOKE EXECUTE ON FUNCTION public.n400_answer_profile_prompt(text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_skip_profile_prompt(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_mark_prompt_shown(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.n400_answer_profile_prompt(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_skip_profile_prompt(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_mark_prompt_shown(text, text, text) TO authenticated;
```

- [ ] **Step 2: Apply the migration**

Run `mcp__supabase__apply_migration` with name `n400_21_growth_profiling_rpcs` and the file content.

- [ ] **Step 3: Verify with rolled-back live tests**

Run via `mcp__supabase__execute_sql` (simulates an authenticated user via the JWT claims GUC, which `auth.uid()` reads):

```sql
DO $$
DECLARE v_user uuid; v_lp n400_lead_profiles%ROWTYPE; v_n int;
BEGIN
  SELECT user_id INTO v_user FROM n400_user_profile LIMIT 1;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

  -- ① answer filed=yes → column + stage + prompt state + event (with surface)
  PERFORM n400_answer_profile_prompt('filed', 'yes', 'a', 'results');
  SELECT * INTO v_lp FROM n400_lead_profiles WHERE user_id = v_user;
  IF v_lp.n400_filed IS NOT TRUE OR v_lp.journey_stage <> 'filed' THEN
    RAISE EXCEPTION 'TEST_FAIL: filed=% stage=%', v_lp.n400_filed, v_lp.journey_stage;
  END IF;
  SELECT count(*) INTO v_n FROM n400_growth_events
  WHERE user_id = v_user AND event_type = 'prompt_answered'
    AND payload->>'question_key' = 'filed' AND payload->>'surface' = 'results';
  IF v_n <> 1 THEN RAISE EXCEPTION 'TEST_FAIL: % prompt_answered events', v_n; END IF;

  -- ①b impression funnel: mark-shown emits prompt_shown with variant + surface
  PERFORM n400_mark_prompt_shown('wants_guidance', 'a', 'dashboard');
  IF NOT EXISTS (SELECT 1 FROM n400_growth_events
                 WHERE user_id = v_user AND event_type = 'prompt_shown'
                   AND payload->>'question_key' = 'wants_guidance'
                   AND payload->>'surface' = 'dashboard') THEN
    RAISE EXCEPTION 'TEST_FAIL: no prompt_shown event';
  END IF;

  -- ② interview_notice=yes flips stage + the +60 scoring input
  PERFORM n400_answer_profile_prompt('interview_notice', 'yes');
  SELECT * INTO v_lp FROM n400_lead_profiles WHERE user_id = v_user;
  IF v_lp.journey_stage <> 'interview_scheduled' OR v_lp.interview_scheduled IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST_FAIL: stage=% after interview_notice', v_lp.journey_stage;
  END IF;

  -- ③ skip sets snooze ≈ 6 days out
  PERFORM n400_skip_profile_prompt('wants_guidance');
  IF NOT EXISTS (SELECT 1 FROM n400_profile_prompts
                 WHERE user_id = v_user AND question_key = 'wants_guidance'
                   AND skipped_at IS NOT NULL
                   AND snooze_until > now() + interval '5 days') THEN
    RAISE EXCEPTION 'TEST_FAIL: skip did not snooze';
  END IF;

  -- ④ invalid answer must raise (checked by absence: reaching here is fine
  --    because we never call it — negative case tested manually below)
  RAISE EXCEPTION 'TEST_OK (rolled back)';
END $$;
```

Expected: `TEST_OK (rolled back)`. Then the negative case (must FAIL):

```sql
DO $$
DECLARE v_user uuid;
BEGIN
  SELECT user_id INTO v_user FROM n400_user_profile LIMIT 1;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  PERFORM n400_answer_profile_prompt('filed', 'banana');
END $$;
```

Expected: error `invalid answer banana for filed`.

- [ ] **Step 4: Add `prompt_shown` to the event taxonomy**

In `apps/website/src/lib/n400/growth/events.ts`, add `'prompt_shown'` to `SERVER_EVENT_TYPES` (it is emitted only by the SECURITY DEFINER RPC — clients cannot insert it; the RLS whitelist is untouched), and update the header comment's first line to read "SERVER_EVENT_TYPES are emitted by DB triggers or SECURITY DEFINER RPCs only".

- [ ] **Step 5: Commit**

```bash
git add apps/website/supabase/migrations/n400_21_growth_profiling_rpcs.sql apps/website/src/lib/n400/growth/events.ts
git commit -m "feat(n400-growth): answer/skip/mark-shown profiling RPCs with journey-stage derivation and surface-tagged funnel events"
```

---

### Task 3: Pure evaluator `profiling.ts` (TDD)

**Files:**
- Modify: `apps/website/src/lib/n400/growth/flags.ts` (export `fnv1a`)
- Create: `apps/website/src/lib/n400/growth/profiling.ts`
- Test: `apps/website/src/lib/n400/growth/profiling.test.ts`

- [ ] **Step 1: Export the hash from flags.ts**

In `flags.ts`, change `function fnv1a` to `export function fnv1a` (variant assignment reuses the same stable hash — DRY).

- [ ] **Step 2: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  answersFromLeadProfile,
  assignVariant,
  selectActivePrompt,
  type GradedEvent,
  type ProfilingInputs,
  type PromptDefinition,
  type PromptState,
} from './profiling';

const USER = '11111111-1111-4111-8111-111111111111';

function def(partial: Partial<PromptDefinition> & Pick<PromptDefinition, 'question_key' | 'sort_order'>): PromptDefinition {
  return {
    variant: 'a',
    text_en: 'q?',
    text_vi: 'hỏi?',
    options: [
      { value: 'yes', label_en: 'Yes', label_vi: 'Rồi' },
      { value: 'not_yet', label_en: 'Not yet', label_vi: 'Chưa' },
    ],
    trigger: {},
    depends_on: null,
    snooze_days: 6,
    snooze_sessions: 3,
    ...partial,
  };
}

// Mirrors the n400_16 seeds.
const SEEDS: PromptDefinition[] = [
  def({ question_key: 'filed', sort_order: 1, trigger: { after_event: 'practice_completed', min_count: 1 } }),
  def({
    question_key: 'filing_timeline', sort_order: 2,
    trigger: { after_event: 'mock_completed', min_count: 1 },
    depends_on: { question_key: 'filed', answer: 'not_yet' },
  }),
  def({
    question_key: 'interview_notice', sort_order: 3,
    trigger: { distinct_practice_days: 3 },
    depends_on: { question_key: 'filed', answer: 'yes' },
  }),
  def({
    question_key: 'interview_date', sort_order: 4,
    trigger: { immediately_after: 'interview_notice' },
    depends_on: { question_key: 'interview_notice', answer: 'yes' },
  }),
  def({ question_key: 'wants_guidance', sort_order: 5, trigger: { distinct_practice_days: 5 } }),
];

const NOW = new Date('2026-07-19T12:00:00Z');

function practiceOn(day: string): GradedEvent {
  return { type: 'practice_completed', at: `${day}T10:00:00Z` };
}

function inputs(partial: Partial<ProfilingInputs> = {}): ProfilingInputs {
  return {
    userId: USER,
    definitions: SEEDS,
    states: [],
    answers: {},
    gradedEvents: [],
    now: NOW,
    ...partial,
  };
}

describe('selectActivePrompt', () => {
  it('returns null for a brand-new user (filed needs one practice event)', () => {
    expect(selectActivePrompt(inputs(), 'results')).toBeNull();
  });

  it('offers filed on the results surface after the first practice event, with a debug reason', () => {
    const got = selectActivePrompt(inputs({ gradedEvents: [practiceOn('2026-07-19')] }), 'results');
    expect(got?.def.question_key).toBe('filed');
    expect(got?.reason).toBe('practice_completed>=1');
  });

  it('never re-offers an answered question', () => {
    const got = selectActivePrompt(
      inputs({ answers: { filed: 'yes' }, gradedEvents: [practiceOn('2026-07-19')] }),
      'results',
    );
    expect(got?.def.question_key).not.toBe('filed');
  });

  it('hides filing_timeline when filed=yes, shows it when filed=not_yet after a mock', () => {
    const events: GradedEvent[] = [practiceOn('2026-07-19'), { type: 'mock_completed', at: '2026-07-19T11:00:00Z' }];
    expect(
      selectActivePrompt(inputs({ answers: { filed: 'yes' }, gradedEvents: events }), 'results')?.def.question_key,
    ).not.toBe('filing_timeline');
    expect(
      selectActivePrompt(inputs({ answers: { filed: 'not_yet' }, gradedEvents: events }), 'results')?.def.question_key,
    ).toBe('filing_timeline');
  });

  it('gates interview_notice behind 3 distinct practice days', () => {
    const twoDays = [practiceOn('2026-07-17'), practiceOn('2026-07-18')];
    const threeDays = [...twoDays, practiceOn('2026-07-19')];
    expect(
      selectActivePrompt(inputs({ answers: { filed: 'yes' }, gradedEvents: twoDays }), 'results'),
    ).toBeNull();
    expect(
      selectActivePrompt(inputs({ answers: { filed: 'yes' }, gradedEvents: threeDays }), 'results')?.def.question_key,
    ).toBe('interview_notice');
  });

  it('offers interview_date immediately after interview_notice=yes', () => {
    const got = selectActivePrompt(
      inputs({ answers: { filed: 'yes', interview_notice: 'yes' }, gradedEvents: [practiceOn('2026-07-19')] }),
      'results',
    );
    expect(got?.def.question_key).toBe('interview_date');
  });

  it('routes a skipped question off results and onto dashboard only after snooze', () => {
    const skipped: PromptState[] = [{
      question_key: 'filed',
      answered_at: null,
      skipped_at: '2026-07-18T00:00:00Z',
      snooze_until: '2026-07-24T00:00:00Z',
    }];
    const base = inputs({ states: skipped, gradedEvents: [practiceOn('2026-07-19')] });
    expect(selectActivePrompt(base, 'results')).toBeNull();
    expect(selectActivePrompt(base, 'dashboard')).toBeNull(); // snooze not over, 1 active day since skip
    // 6 days later the snooze expired:
    expect(
      selectActivePrompt({ ...base, now: new Date('2026-07-25T00:00:00Z') }, 'dashboard')?.def.question_key,
    ).toBe('filed');
  });

  it('releases a snoozed question early after 3 distinct active days since skip', () => {
    const skipped: PromptState[] = [{
      question_key: 'filed',
      answered_at: null,
      skipped_at: '2026-07-16T00:00:00Z',
      snooze_until: '2026-07-22T00:00:00Z',
    }];
    const got = selectActivePrompt(
      inputs({
        states: skipped,
        gradedEvents: [practiceOn('2026-07-17'), practiceOn('2026-07-18'), practiceOn('2026-07-19')],
      }),
      'dashboard',
    );
    expect(got?.def.question_key).toBe('filed');
  });

  it('returns a single question — lowest sort_order wins', () => {
    const manyDays = ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'].map(practiceOn);
    // filed and wants_guidance are both eligible; filed (sort 1) wins.
    expect(selectActivePrompt(inputs({ gradedEvents: manyDays }), 'results')?.def.question_key).toBe('filed');
  });
});

describe('assignVariant', () => {
  it('is deterministic and returns a listed variant', () => {
    const v1 = assignVariant(USER, 'filed', ['a', 'b']);
    const v2 = assignVariant(USER, 'filed', ['b', 'a']);
    expect(v1).toBe(v2);
    expect(['a', 'b']).toContain(v1);
    expect(assignVariant(USER, 'filed', ['a'])).toBe('a');
  });
});

describe('answersFromLeadProfile', () => {
  it('maps profile columns back to question answers', () => {
    expect(answersFromLeadProfile(null)).toEqual({});
    expect(answersFromLeadProfile({
      n400_filed: true,
      filing_timeline: null,
      interview_scheduled: false,
      interview_date: null,
      wants_guidance: 'maybe',
    })).toEqual({ filed: 'yes', interview_notice: 'no', wants_guidance: 'maybe' });
    expect(answersFromLeadProfile({
      n400_filed: false,
      filing_timeline: '30d',
      interview_scheduled: null,
      interview_date: '2026-08-10',
      wants_guidance: null,
    })).toEqual({ filed: 'not_yet', filing_timeline: '30d', interview_date: '2026-08-10' });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/profiling.test.ts`
Expected: FAIL — `Cannot find module './profiling'` (or equivalent resolve error).

- [ ] **Step 4: Write the implementation**

```ts
// Progressive-profiling evaluator (spec §3). Pure decision logic: which single
// question is active on a surface, honoring triggers, depends_on chains, and
// the skip → snooze → dashboard fallback. Server actions load the inputs; UI
// only renders the result.
//
// Surface routing (spec §3.2–3.3): 'results' shows never-skipped questions
// (Level 2, the main asking point). A skipped question moves to 'dashboard'
// (Level 1 soft card) once its snooze expires — snooze_days OR
// snooze_sessions distinct active days since the skip, whichever comes first.
// A "session" is an active day, the same currency as the pace engine's buổi.

import { fnv1a } from './flags';

export type PromptSurface = 'results' | 'dashboard';

export interface PromptOption {
  value: string;
  label_en: string;
  label_vi: string;
}

export interface PromptDefinition {
  question_key: string;
  variant: string;
  text_en: string;
  text_vi: string;
  options: PromptOption[];
  trigger: {
    after_event?: 'practice_completed' | 'mock_completed';
    min_count?: number;
    distinct_practice_days?: number;
    immediately_after?: string;
  };
  depends_on: { question_key: string; answer: string } | null;
  snooze_days: number;
  snooze_sessions: number;
  sort_order: number;
}

export interface PromptState {
  question_key: string;
  answered_at: string | null;
  skipped_at: string | null;
  snooze_until: string | null;
}

export interface GradedEvent {
  type: 'practice_completed' | 'mock_completed';
  at: string;
}

export interface ProfilingInputs {
  userId: string;
  definitions: PromptDefinition[];
  states: PromptState[];
  /** question_key → answered value, reconstructed from n400_lead_profiles. */
  answers: Record<string, string>;
  gradedEvents: GradedEvent[];
  now: Date;
}

/** Shape of the n400_lead_profiles columns the profiling questions write. */
export interface LeadProfileAnswers {
  n400_filed: boolean | null;
  filing_timeline: string | null;
  interview_scheduled: boolean | null;
  interview_date: string | null;
  wants_guidance: string | null;
}

export function answersFromLeadProfile(lp: LeadProfileAnswers | null): Record<string, string> {
  const a: Record<string, string> = {};
  if (!lp) return a;
  if (lp.n400_filed !== null) a.filed = lp.n400_filed ? 'yes' : 'not_yet';
  if (lp.filing_timeline) a.filing_timeline = lp.filing_timeline;
  if (lp.interview_scheduled !== null) a.interview_notice = lp.interview_scheduled ? 'yes' : 'no';
  if (lp.interview_date) a.interview_date = lp.interview_date;
  if (lp.wants_guidance) a.wants_guidance = lp.wants_guidance;
  return a;
}

/** Deterministic A/B assignment — same recipe as flag rollout bucketing. */
export function assignVariant(userId: string, questionKey: string, variants: string[]): string {
  if (variants.length <= 1) return variants[0] ?? 'a';
  const sorted = [...variants].sort();
  return sorted[fnv1a(`${questionKey}:${userId}`) % sorted.length];
}

// Events carry UTC timestamps; "active day" uses the UTC date, matching the
// created_at::date grouping the SQL scoring already uses.
function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

export interface ActivePromptDecision {
  def: PromptDefinition;
  /** Which conditions the winner satisfied — for logs/debug (the profiling
      cousin of the G3 CTA decision log; nothing persists it in G2). */
  reason: string;
}

export function selectActivePrompt(
  inputs: ProfilingInputs,
  surface: PromptSurface,
): ActivePromptDecision | null {
  const { userId, definitions, states, answers, gradedEvents, now } = inputs;
  const stateByKey = new Map(states.map((s) => [s.question_key, s]));

  // One deterministic variant per (user, question); other variants invisible.
  const byKey = new Map<string, PromptDefinition[]>();
  for (const d of definitions) {
    const list = byKey.get(d.question_key) ?? [];
    list.push(d);
    byKey.set(d.question_key, list);
  }
  const candidates: PromptDefinition[] = [];
  for (const [key, variants] of byKey) {
    const pick = assignVariant(userId, key, variants.map((v) => v.variant));
    const chosen = variants.find((v) => v.variant === pick);
    if (chosen) candidates.push(chosen);
  }
  candidates.sort((a, b) => a.sort_order - b.sort_order);

  const eventCount = (type: string) => gradedEvents.filter((e) => e.type === type).length;
  const distinctDays = new Set(gradedEvents.map((e) => utcDay(e.at))).size;

  for (const def of candidates) {
    if (answers[def.question_key] !== undefined) continue;
    const st = stateByKey.get(def.question_key);
    if (st?.answered_at) continue;

    if (def.depends_on && answers[def.depends_on.question_key] !== def.depends_on.answer) continue;

    const trg = def.trigger;
    if (trg.after_event && eventCount(trg.after_event) < (trg.min_count ?? 1)) continue;
    if (trg.distinct_practice_days && distinctDays < trg.distinct_practice_days) continue;
    if (trg.immediately_after && answers[trg.immediately_after] === undefined) continue;

    const reasons: string[] = [];
    if (trg.after_event) reasons.push(`${trg.after_event}>=${trg.min_count ?? 1}`);
    if (trg.distinct_practice_days) reasons.push(`distinct_practice_days>=${trg.distinct_practice_days}`);
    if (trg.immediately_after) reasons.push(`immediately_after:${trg.immediately_after}`);

    const skipped = Boolean(st?.skipped_at);
    if (surface === 'results') {
      if (skipped) continue;
    } else {
      if (!skipped) continue;
      const snoozeOver =
        !st?.snooze_until || new Date(st.snooze_until).getTime() <= now.getTime();
      const skippedAtMs = new Date(st!.skipped_at!).getTime();
      const activeDaysSinceSkip = new Set(
        gradedEvents
          .filter((e) => new Date(e.at).getTime() > skippedAtMs)
          .map((e) => utcDay(e.at)),
      ).size;
      if (!snoozeOver && activeDaysSinceSkip < def.snooze_sessions) continue;
      reasons.push(snoozeOver ? 'snooze_expired' : `active_days_since_skip>=${def.snooze_sessions}`);
    }
    return { def, reason: reasons.join('+') || 'unconditional' };
  }
  return null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/profiling.test.ts`
Expected: PASS (all tests). Also run the full suite to catch the `fnv1a` export change: `npx vitest run` → all green.

- [ ] **Step 6: Commit**

```bash
git add apps/website/src/lib/n400/growth/profiling.ts apps/website/src/lib/n400/growth/profiling.test.ts apps/website/src/lib/n400/growth/flags.ts
git commit -m "feat(n400-growth): pure profiling evaluator with surface routing, snooze, deterministic variants, debug reason"
```

---

### Task 4: Server-client helper + prompt server actions

**Files:**
- Create: `apps/website/src/lib/n400/growth/server-client.ts`
- Modify: `apps/website/src/lib/n400/growth/ingest.ts` (use the helper)
- Create: `apps/website/src/lib/n400/growth/prompt-actions.ts`

- [ ] **Step 1: Extract the authed server client (Rule of Three: ingest + 4 new actions)**

`server-client.ts`:

```ts
// Server-only Supabase client bound to the caller's session cookies.
// Read-only cookie usage — session refresh happens in middleware.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getAuthedServerClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only usage; session refresh happens in middleware.
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
```

- [ ] **Step 2: Refactor `ingest.ts` to use it (no behavior change)**

Replace the inline `createServerClient` block + `getUser()` in `ingestClientEvent` with:

```ts
import { getAuthedServerClient } from './server-client';
```

```ts
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false, error: 'unauthorized' };
```

Delete the now-unused `createServerClient`/`cookies` imports from `ingest.ts`.

- [ ] **Step 3: Write `prompt-actions.ts`**

```ts
'use server';

// Profiling server actions (spec §3): getActivePrompt is the ONE read the UI
// calls; answers/skips go through the SECURITY DEFINER RPCs (n400_21). Flags
// off → getActivePrompt returns null and the whole conversation is silent.

import { getAuthedServerClient } from './server-client';
import { isFeatureOn, type FeatureFlag } from './flags';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  answersFromLeadProfile,
  selectActivePrompt,
  type ActivePromptDecision,
  type GradedEvent,
  type LeadProfileAnswers,
  type ProfilingInputs,
  type PromptDefinition,
  type PromptOption,
  type PromptState,
  type PromptSurface,
} from './profiling';

export interface ActivePrompt {
  questionKey: string;
  variant: string;
  /** The surface this question was selected for — echoed back on answer/skip
      so every funnel event is tagged without the card re-stating it. */
  surface: PromptSurface;
  textEn: string;
  textVi: string;
  options: PromptOption[];
  /** interview_date renders a date input instead of option pills. */
  isDate: boolean;
  /** Why this question won — debug only, never rendered. */
  reason: string;
}

function toActive(decision: ActivePromptDecision, surface: PromptSurface): ActivePrompt {
  const { def, reason } = decision;
  return {
    questionKey: def.question_key,
    variant: def.variant,
    surface,
    textEn: def.text_en,
    textVi: def.text_vi,
    options: def.options,
    isDate: def.question_key === 'interview_date',
    reason,
  };
}

async function profilingEnabled(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('n400_feature_flags')
    .select('flag_key, enabled, rollout_pct')
    .in('flag_key', ['growth_engine', 'profiling']);
  const flags = new Map((data ?? []).map((f: FeatureFlag) => [f.flag_key, f]));
  return (
    isFeatureOn(flags.get('growth_engine'), userId) &&
    isFeatureOn(flags.get('profiling'), userId)
  );
}

async function loadInputs(supabase: SupabaseClient, user: User): Promise<ProfilingInputs> {
  const [defsRes, statesRes, leadRes, eventsRes] = await Promise.all([
    supabase
      .from('n400_prompt_definitions')
      .select('question_key, variant, text_en, text_vi, options, trigger, depends_on, snooze_days, snooze_sessions, sort_order')
      .eq('enabled', true),
    supabase
      .from('n400_profile_prompts')
      .select('question_key, answered_at, skipped_at, snooze_until'),
    supabase
      .from('n400_lead_profiles')
      .select('n400_filed, filing_timeline, interview_scheduled, interview_date, wants_guidance')
      .maybeSingle(),
    // TODO(scale): per-answer envelope events grow with usage; switch to a
    // count RPC if this fetch gets heavy.
    supabase
      .from('n400_growth_events')
      .select('event_type, created_at')
      .in('event_type', ['practice_completed', 'mock_completed']),
  ]);
  return {
    userId: user.id,
    definitions: (defsRes.data ?? []) as PromptDefinition[],
    states: (statesRes.data ?? []) as PromptState[],
    answers: answersFromLeadProfile((leadRes.data ?? null) as LeadProfileAnswers | null),
    gradedEvents: ((eventsRes.data ?? []) as { event_type: string; created_at: string }[]).map(
      (e) => ({ type: e.event_type as GradedEvent['type'], at: e.created_at }),
    ),
    now: new Date(),
  };
}

export async function getActivePrompt(surface: PromptSurface): Promise<ActivePrompt | null> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return null;
  if (!(await profilingEnabled(supabase, user.id))) return null;
  const decision = selectActivePrompt(await loadInputs(supabase, user), surface);
  return decision ? toActive(decision, surface) : null;
}

export async function answerProfilePrompt(
  questionKey: string,
  variant: string,
  answer: string,
  surface: PromptSurface,
): Promise<{ ok: boolean; next: ActivePrompt | null }> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false, next: null };
  const { error } = await supabase.rpc('n400_answer_profile_prompt', {
    p_question_key: questionKey,
    p_answer: answer,
    p_variant: variant,
    p_surface: surface,
  });
  if (error) return { ok: false, next: null };
  // Chain ONLY the spec's "ask ④ right after ③ = yes" case — one question at
  // a time everywhere else (conversation, not interrogation). The follow-up
  // inherits the surface the user is standing on.
  const decision = selectActivePrompt(await loadInputs(supabase, user), surface);
  const next =
    decision && decision.def.trigger.immediately_after === questionKey
      ? toActive(decision, surface)
      : null;
  return { ok: true, next };
}

export async function skipProfilePrompt(
  questionKey: string,
  variant: string,
  surface: PromptSurface,
): Promise<{ ok: boolean }> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false };
  const { error } = await supabase.rpc('n400_skip_profile_prompt', {
    p_question_key: questionKey,
    p_variant: variant,
    p_surface: surface,
  });
  return { ok: !error };
}

export async function markPromptShown(
  questionKey: string,
  variant: string,
  surface: PromptSurface,
): Promise<void> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return;
  await supabase.rpc('n400_mark_prompt_shown', {
    p_question_key: questionKey,
    p_variant: variant,
    p_surface: surface,
  });
}
```

- [ ] **Step 4: Typecheck + run the suite**

Run: `cd apps/website && npx tsc --noEmit && npx vitest run`
Expected: clean typecheck, all tests pass (ingest refactor is behavior-neutral).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/growth/server-client.ts apps/website/src/lib/n400/growth/ingest.ts apps/website/src/lib/n400/growth/prompt-actions.ts
git commit -m "feat(n400-growth): profiling server actions + shared authed server client"
```

---

### Task 5: i18n copy for the cards + interview-mode hero

**Files:**
- Modify: `apps/website/src/lib/n400/i18n/vi.ts`
- Modify: `apps/website/src/lib/n400/i18n/en.ts`

Question text/options come from the DB (`text_vi`/`text_en`, `label_vi`/`label_en`) — the dict only carries the card chrome and the new hero intent. `en.ts` is typed `N400Dict = typeof vi`, so both files must change together or the build fails.

- [ ] **Step 1: Add to `vi.ts`**

Add a top-level `growth` key (place it after `heroRec`):

```ts
  growth: {
    oneQuickQuestion: 'Một câu hỏi nhỏ',
    personalizeTitle: 'Giúp chúng tôi cá nhân hoá lộ trình của bạn',
    skip: 'Bỏ qua',
    dismiss: 'Ẩn câu hỏi này',
    thanks: 'Cảm ơn bạn! Lộ trình của bạn đã được cập nhật.',
    saveDate: 'Lưu',
  },
```

Inside `heroRec.intent`, add:

```ts
    interviewMode: {
      title: '🔥 Chế độ luyện phỏng vấn',
      titleWithDays: 'Còn {days} ngày đến phỏng vấn',
      subtitle: 'Ưu tiên hôm nay: Thi thử, Speaking và Viết.',
      secondary: 'Luyện Speaking',
    },
```

- [ ] **Step 2: Mirror in `en.ts`**

```ts
  growth: {
    oneQuickQuestion: 'One quick question',
    personalizeTitle: 'Help us personalize your journey',
    skip: 'Skip',
    dismiss: 'Hide this question',
    thanks: 'Thank you! Your journey has been updated.',
    saveDate: 'Save',
  },
```

```ts
    interviewMode: {
      title: '🔥 Interview prep mode',
      titleWithDays: '{days} days until your interview',
      subtitle: "Today's priority: Mock Test, Speaking and Writing.",
      secondary: 'Practice Speaking',
    },
```

(The interview-mode primary CTA reuses the existing `heroRec.cta.takeMockTest` label — "thi thử = Bắt đầu" per the CTA verb system; no new label needed.)

- [ ] **Step 3: Typecheck + i18n test**

Run: `cd apps/website && npx tsc --noEmit && npx vitest run src/lib/n400/i18n/i18n.test.ts`
Expected: PASS — a missing mirror key fails compile.

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/lib/n400/i18n/vi.ts apps/website/src/lib/n400/i18n/en.ts
git commit -m "feat(n400-growth): dict entries for profiling cards and interview-mode hero"
```

---

### Task 6: Level 3 — hero intent tier (TDD)

**Files:**
- Modify: `apps/website/src/lib/n400/hero-recommendation.ts`
- Test: `apps/website/src/lib/n400/hero-recommendation.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `hero-recommendation.test.ts` (reuse the file's existing signal-builder helper if one exists; otherwise build signals inline as below). ⚠️ Import the dict aliased — `vi` collides with vitest's mock utility: `import { vi as viDict } from './i18n/vi';` — and match however the existing tests in this file already import the dict.

```ts
describe('interview_mode intent tier (G2 growth)', () => {
  const baseSignals = {
    now: new Date('2026-07-19T12:00:00Z'),
    civicsSeen: 40,
    civicsTotal: 128,
    attempts: [
      { questionId: 1, wasCorrect: true, mode: 'practice' as const, at: '2026-07-18T10:00:00Z' },
    ],
    mockResults: [],
    sectionAttempts: [],
    goalsDone: 0,
    goalsTotal: 4,
  };

  it('overrides the behavior ladder when journey_stage is interview_scheduled', () => {
    const got = recommendDailyHero(
      { ...baseSignals, journeyStage: 'interview_scheduled', interviewDate: null },
      viDict,
    );
    expect(got.intent).toBe('interview_mode');
    expect(got.cta.href).toBe('/mock-test');
  });

  it('shows a countdown when interview_date is known', () => {
    const got = recommendDailyHero(
      { ...baseSignals, journeyStage: 'interview_scheduled', interviewDate: '2026-07-29' },
      viDict,
    );
    expect(got.intent).toBe('interview_mode');
    expect(got.title).toContain('10');
  });

  it('leaves the ladder unchanged for other stages and when absent', () => {
    expect(recommendDailyHero({ ...baseSignals, journeyStage: 'preparing' }, viDict).intent).not.toBe('interview_mode');
    expect(recommendDailyHero(baseSignals, viDict).intent).not.toBe('interview_mode');
  });

  // Locks the contract G3 depends on: adding a tier means appending a row,
  // and evaluation order is priority-descending regardless of array order.
  it('keeps the growth intent tiers ordered by descending priority', () => {
    const priorities = GROWTH_INTENT_TIERS.map((t) => t.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
  });
});
```

Add `GROWTH_INTENT_TIERS` to the file's existing import from `./hero-recommendation`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/website && npx vitest run src/lib/n400/hero-recommendation.test.ts`
Expected: FAIL — `journeyStage` not in `HeroSignals` (type error) / intent never `interview_mode`.

- [ ] **Step 3: Implement**

In `hero-recommendation.ts`:

1. Extend the intent union:

```ts
export type HeroIntent =
  | 'interview_mode'
  | 'start_civics'
  | 'review_mistakes'
  | 'goal_complete'
  | 'first_mock'
  | 'stale_section'
  | 'finish_civics'
  | 'continue_civics';
```

2. Extend `HeroSignals`:

```ts
  /** G2 growth intent tier — journey stage from profiling answers. Pass only
      when the growth_engine flag is on for this user; undefined/null leaves
      the behavior ladder untouched. */
  journeyStage?: 'exploring' | 'preparing' | 'filed' | 'waiting_interview' | 'interview_scheduled' | null;
  /** ISO date (yyyy-mm-dd) when known. */
  interviewDate?: string | null;
```

3. Add the growth intent tier as an **explicitly ordered table**, above the behavior ladder. G3 adds consultation / filing-checklist / passport intents by appending a row — never by editing control flow. Priority numbers mirror the `n400_cta_definitions.priority` scale already seeded in G1 (S9=100, S4=90, S1=80…) so the two systems rank the same way; when G3 makes these DB-driven, the numbers move over unchanged.

Place this above `recommendDailyHero`:

```ts
/**
 * Growth intent tier (spec §3.4) — sits ABOVE the behavior ladder: what the
 * user TOLD us about their journey outranks what their practice data implies.
 * Ordered by `priority` descending, first match wins. Lazy by construction:
 * `match` runs only until one returns non-null.
 *
 * Priority scale is shared with n400_cta_definitions.priority (100 = final
 * review, 90 = interview imminent, 80 = mock-ready…). G3 appends rows here —
 * do not reintroduce inline if-branches.
 */
export interface GrowthIntentTier {
  priority: number;
  match: (
    signals: HeroSignals,
    dict: N400Dict,
  ) => HeroRecommendation | null;
}

export const GROWTH_INTENT_TIERS: GrowthIntentTier[] = [
  {
    // 90 — the user told us the interview is scheduled. The dashboard flips to
    // interview-priority mode immediately: this is the visible reward for
    // answering the profiling question.
    priority: 90,
    match: (signals, dict) => {
      if (signals.journeyStage !== 'interview_scheduled') return null;
      const t = dict.heroRec;
      const days = signals.interviewDate
        ? Math.max(
            0,
            Math.ceil(
              (new Date(signals.interviewDate).getTime() - signals.now.getTime()) / DAY_MS,
            ),
          )
        : null;
      return {
        intent: 'interview_mode',
        emoji: '🔥',
        title:
          days !== null
            ? tFormat(t.intent.interviewMode.titleWithDays, { days })
            : t.intent.interviewMode.title,
        subtitle: t.intent.interviewMode.subtitle,
        cta: { label: t.cta.takeMockTest, href: '/mock-test' },
        secondary: { label: t.intent.interviewMode.secondary, href: '/speaking/yes-no' },
      };
    },
  },
].sort((a, b) => b.priority - a.priority);
```

Then, as the first statement inside `recommendDailyHero` (before the existing destructuring and the step-1 ladder comment):

```ts
  for (const tier of GROWTH_INTENT_TIERS) {
    const hit = tier.match(signals, dict);
    if (hit) return hit;
  }
```

(No destructuring changes needed — each `match` reads `signals` directly, so `now` staying where it is in the current file is fine.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/website && npx vitest run src/lib/n400/hero-recommendation.test.ts`
Expected: PASS, including all pre-existing ladder tests (back-compat: signals without `journeyStage` behave exactly as before).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/hero-recommendation.ts apps/website/src/lib/n400/hero-recommendation.test.ts
git commit -m "feat(n400-growth): interview-mode intent tier above the hero behavior ladder"
```

---

### Task 7: Level 1 + 2 UI — `GrowthPromptCard` and `GrowthPromptSlot`

**Files:**
- Create: `apps/website/src/components/n400/GrowthPromptCard.tsx`
- Create: `apps/website/src/components/n400/GrowthPromptSlot.tsx`

No component test rig exists (vitest, pure modules only) — these are verified by typecheck now and visually in Task 9.

- [ ] **Step 1: Write `GrowthPromptCard.tsx`**

```tsx
'use client';

// Levels 1+2 of the conversation model (spec §3.2–3.3). One small card, never
// a modal: option pills, a quiet Skip, a one-line thanks. The dashboard
// variant adds the 🎯 eyebrow and a dismiss (re-snooze) control instead of an
// inline Skip. interview_date renders a date input.

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import {
  answerProfilePrompt,
  markPromptShown,
  skipProfilePrompt,
  type ActivePrompt,
} from '@/lib/n400/growth/prompt-actions';

const THANKS_MS = 2500;

// `surface` rides on the prompt itself (set by the evaluator), so there is one
// source of truth for it — the card cannot disagree with what got logged.
export function GrowthPromptCard({
  prompt: initial,
  onDone,
}: {
  prompt: ActivePrompt;
  onDone: () => void;
}) {
  const { dict, lang } = useN400Lang();
  const [prompt, setPrompt] = useState(initial);
  const surface = prompt.surface;
  const [phase, setPhase] = useState<'asking' | 'thanks'>('asking');
  const [dateValue, setDateValue] = useState('');
  const [busy, setBusy] = useState(false);
  const shownFor = useRef<string | null>(null);

  // One impression per question shown, even across re-renders. This is the
  // top of the funnel (prompt_shown → prompt_answered / prompt_skipped, all
  // tagged with variant + surface).
  useEffect(() => {
    if (shownFor.current === prompt.questionKey) return;
    shownFor.current = prompt.questionKey;
    void markPromptShown(prompt.questionKey, prompt.variant, prompt.surface);
  }, [prompt.questionKey, prompt.variant, prompt.surface]);

  const text = lang === 'en' ? prompt.textEn : prompt.textVi;

  const submit = async (answer: string) => {
    if (busy) return;
    setBusy(true);
    const res = await answerProfilePrompt(prompt.questionKey, prompt.variant, answer, prompt.surface);
    setBusy(false);
    if (!res.ok) {
      onDone();
      return;
    }
    setPhase('thanks');
    setTimeout(() => {
      if (res.next) {
        // Spec §3.1: interview_date follows interview_notice=yes immediately.
        setPrompt(res.next);
        setDateValue('');
        setPhase('asking');
      } else {
        onDone();
      }
    }, THANKS_MS);
  };

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    await skipProfilePrompt(prompt.questionKey, prompt.variant, prompt.surface);
    setBusy(false);
    onDone();
  };

  if (phase === 'thanks') {
    return (
      <div className="rounded-[24px] border border-teal-100 bg-teal-50/60 px-5 py-4 text-sm font-medium text-teal-700 animate-in fade-in duration-300">
        {dict.growth.thanks}
      </div>
    );
  }

  return (
    <div className="relative rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      {surface === 'dashboard' ? (
        <button
          type="button"
          onClick={skip}
          aria-label={dict.growth.dismiss}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50"
        >
          <X size={16} />
        </button>
      ) : null}

      <div className="text-xs font-bold uppercase tracking-wide text-teal-600">
        {surface === 'dashboard' ? `🎯 ${dict.growth.personalizeTitle}` : dict.growth.oneQuickQuestion}
      </div>
      <div className="mt-1.5 font-bold text-gray-800">{text}</div>

      {prompt.isDate ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 focus:border-teal-400 focus:outline-none"
          />
          <button
            type="button"
            disabled={!dateValue || busy}
            onClick={() => submit(dateValue)}
            className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {dict.growth.saveDate}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {prompt.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={busy}
              onClick={() => submit(opt.value)}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-40"
            >
              {lang === 'en' ? opt.label_en : opt.label_vi}
            </button>
          ))}
        </div>
      )}

      {surface === 'results' ? (
        <button
          type="button"
          disabled={busy}
          onClick={skip}
          className="mt-3 text-xs font-medium text-gray-400 hover:text-gray-600"
        >
          {dict.growth.skip}
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Write `GrowthPromptSlot.tsx`**

```tsx
'use client';

// Self-contained mount point: fetches the active question for its surface and
// renders the card or nothing. Host screens add one line; flags off (or no
// eligible question) → renders null, zero layout impact.

import { useEffect, useState } from 'react';
import { getActivePrompt, type ActivePrompt } from '@/lib/n400/growth/prompt-actions';
import type { PromptSurface } from '@/lib/n400/growth/profiling';
import { GrowthPromptCard } from './GrowthPromptCard';

export function GrowthPromptSlot({ surface }: { surface: PromptSurface }) {
  const [prompt, setPrompt] = useState<ActivePrompt | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActivePrompt(surface)
      .then((p) => {
        if (!cancelled) setPrompt(p);
      })
      .catch(() => {
        // Growth UI is best-effort — never break a learning screen over it.
      });
    return () => {
      cancelled = true;
    };
  }, [surface]);

  if (!prompt) return null;
  return <GrowthPromptCard prompt={prompt} onDone={() => setPrompt(null)} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/website && npx tsc --noEmit`
Expected: clean. (Verify the `useN400Lang` import path against `src/lib/n400/i18n/provider.tsx` — adjust if the hook is exported elsewhere.)

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/components/n400/GrowthPromptCard.tsx apps/website/src/components/n400/GrowthPromptSlot.tsx
git commit -m "feat(n400-growth): profiling prompt card + self-fetching slot component"
```

---

### Task 8: Wire the three surfaces (practice summary, mock result, dashboard)

**Files:**
- Create: `apps/website/src/lib/n400/growth/use-growth-profile.ts`
- Modify: `apps/website/src/components/n400/PracticeSessionSummary.tsx` (add `footer` prop)
- Modify: `apps/website/src/app/n400ready/(app)/practice/page.tsx` (~line 483, the `completed` branch)
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx` (~line 857, inside `Result`)
- Modify: `apps/website/src/app/n400ready/(app)/dashboard-client.tsx` (hero signals + soft card)

- [ ] **Step 1: Write the client hook for hero signals**

`use-growth-profile.ts`:

```ts
'use client';

// Journey data for the dashboard hero intent tier (Level 3). Reads the user's
// own n400_lead_profiles row + the growth_engine flag (both readable under
// RLS). enabled=false → callers must leave the behavior ladder untouched.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { isFeatureOn, type FeatureFlag } from './flags';

export interface GrowthProfile {
  enabled: boolean;
  journeyStage: 'exploring' | 'preparing' | 'filed' | 'waiting_interview' | 'interview_scheduled' | null;
  interviewDate: string | null;
}

const OFF: GrowthProfile = { enabled: false, journeyStage: null, interviewDate: null };

export function useGrowthProfile(): GrowthProfile {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GrowthProfile>(OFF);

  useEffect(() => {
    if (!user) {
      setProfile(OFF);
      return;
    }
    let cancelled = false;
    (async () => {
      const [flagRes, leadRes] = await Promise.all([
        supabase
          .from('n400_feature_flags')
          .select('flag_key, enabled, rollout_pct')
          .eq('flag_key', 'growth_engine')
          .maybeSingle(),
        supabase
          .from('n400_lead_profiles')
          .select('journey_stage, interview_date')
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (!isFeatureOn((flagRes.data ?? null) as FeatureFlag | null, user.id)) {
        setProfile(OFF);
        return;
      }
      setProfile({
        enabled: true,
        journeyStage: (leadRes.data?.journey_stage ?? null) as GrowthProfile['journeyStage'],
        interviewDate: leadRes.data?.interview_date ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return profile;
}
```

- [ ] **Step 2: Practice summary (Level 2)**

`PracticeSessionSummary` owns the scrollable region (`overflow-y-auto` root), so the card must render **inside** it, not after it. In `PracticeSessionSummary.tsx`: add `footer?: ReactNode` to the props interface and render `{footer}` as the **last child** of the inner `max-w-[880px]` column div (the `mx-auto flex min-h-full ... flex-col` element).

Then in `practice/page.tsx`, in the `completed` branch:

```tsx
import { GrowthPromptSlot } from '@/components/n400/GrowthPromptSlot';
```

```tsx
        <PracticeSessionSummary
          correct={correctCount}
          total={order.length}
          wrongCount={wrongIds.length}
          onReviewWrong={onReviewWrong}
          onRetry={onRestart}
          onChangeMode={onChangeMode}
          elapsedSec={elapsedSec}
          topCategory={topCategory ? N400_CATEGORY_LABELS[topCategory] : null}
          sessionsToday={{ done: sessionsToday, goal: DAILY_SESSIONS_GOAL }}
          footer={<GrowthPromptSlot surface="results" />}
        />
```

- [ ] **Step 3: Mock civics result (Level 2)**

In `mock-test/civics/page.tsx`, in the `Result` component's return (the `space-y-6` wrapper), add after `<MockResultScreen ... />`:

```tsx
      <GrowthPromptSlot surface="results" />
```

with the import at the top of the file:

```tsx
import { GrowthPromptSlot } from '@/components/n400/GrowthPromptSlot';
```

- [ ] **Step 4: Dashboard (Level 1 soft card + Level 3 hero signals)**

In `dashboard-client.tsx`:

```tsx
import { GrowthPromptSlot } from '@/components/n400/GrowthPromptSlot';
import { useGrowthProfile } from '@/lib/n400/growth/use-growth-profile';
```

Inside `DashboardPage`, next to the other hooks (~line 52):

```tsx
  const growth = useGrowthProfile();
```

Extend the `recommendDailyHero` call's signals object:

```tsx
      journeyStage: growth.enabled ? growth.journeyStage : null,
      interviewDate: growth.enabled ? growth.interviewDate : null,
```

Insert the soft card between the hero wrapper (`{/* 1. HERO ... */}` block's closing `</div>`) and the next section:

```tsx
      {/* 1b. Growth soft card (Level 1) — only appears for a skipped question
          whose snooze expired; flags off → renders nothing. */}
      <GrowthPromptSlot surface="dashboard" />
```

- [ ] **Step 5: Typecheck + full suite**

Run: `cd apps/website && npx tsc --noEmit && npx vitest run`
Expected: clean typecheck, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/website/src/lib/n400/growth/use-growth-profile.ts apps/website/src/components/n400/PracticeSessionSummary.tsx "apps/website/src/app/n400ready/(app)/practice/page.tsx" "apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx" "apps/website/src/app/n400ready/(app)/dashboard-client.tsx"
git commit -m "feat(n400-growth): wire profiling cards into practice/mock results and dashboard, hero intent signals"
```

---

### Task 9: Flag flip + visual verification (CHECKPOINT — ask the user first)

Flags are live production config. **Stop and confirm with the user before flipping** (few real users exist pre-ads, but it's their call).

- [ ] **Step 1: Enable the two flags** (after user confirms)

Run via `mcp__supabase__execute_sql`:

```sql
UPDATE n400_feature_flags
SET enabled = TRUE, updated_at = now(), note = note || ' | G2 enabled ' || current_date
WHERE flag_key IN ('growth_engine', 'profiling');
```

- [ ] **Step 2: Visual verification** (per the visual-verification recipe: run the real app; auth never hydrates offline; the scroll container is `<main>`)

Run: `cd apps/website && npm run dev`, sign in with a test account, then check:

1. Finish a short practice session → the summary shows "Một câu hỏi nhỏ / Bạn đã nộp đơn N-400 chưa?" **below the result content, inside the scroll area** — no layout squeeze, no modal.
2. Answer "Rồi" → one-line thanks appears, card resolves; `n400_lead_profiles` row shows `n400_filed = true`, `journey_stage = 'filed'`; a `prompt_answered` event exists; `lead_score` increased.
3. Take a mock, then answer `interview_notice` = "Rồi" → the **interview_date question chains immediately**; the Dashboard hero flips to 🔥 interview mode on next load.
4. Skip a question on a results screen → it does NOT reappear on results; `n400_profile_prompts.snooze_until` ≈ +6 days. (Snooze release itself is covered by unit tests — don't wait 6 days.)
5. Turn `profiling` off in the DB → all cards disappear; learning screens unaffected.
6. Funnel sanity check — the per-level conversion query works end to end:

```sql
SELECT payload->>'question_key' AS question,
       payload->>'surface'      AS surface,
       payload->>'variant'      AS variant,
       count(*) FILTER (WHERE event_type = 'prompt_shown')    AS shown,
       count(*) FILTER (WHERE event_type = 'prompt_answered') AS answered,
       count(*) FILTER (WHERE event_type = 'prompt_skipped')  AS skipped
FROM n400_growth_events
WHERE event_type IN ('prompt_shown','prompt_answered','prompt_skipped')
GROUP BY 1, 2, 3 ORDER BY 1, 2;
```

Expected: rows for the questions you exercised, with `surface = 'results'` for the ones answered on a result screen — i.e. Level 2 vs Level 1 conversion is readable from this one table.

- [ ] **Step 3: Decide flag end-state with the user**

Keep ON (G2 is live) or revert to OFF until G3 — user's call. Record the decision.

---

### Task 10: Roadmap + docs closeout

**Files:**
- Modify: `docs/ROADMAP.md` (Track 2, after the G1 line — currently line 43)

- [ ] **Step 1: Add the shipped G2 line**

Insert directly after the G1 `[x]` line, matching its format:

```markdown
- [x] **Website Phase 3E — N400 Growth Engine G2 (conversation model)** — Progressive profiling live behind `profiling`+`growth_engine` flags: pure evaluator (`growth/profiling.ts`, surface routing + snooze-as-active-days + deterministic variants + debug reason), answer/skip/mark-shown SECURITY DEFINER RPCs with journey-stage derivation (n400_21), insert-path event emitter fix (n400_20), full `prompt_shown → answered/skipped` funnel tagged by question × variant × surface, Level 2 card under Practice/Mock results, Level 1 dashboard soft card, Level 3 interview-mode hero intent via the priority-ordered `GROWTH_INTENT_TIERS` table. Spec §3. G3 (CTA+booking), G4 (internal_app Leads) pending.
```

Remove the trailing "G2 (conversation model), " from the G1 line's pending list so it reads "G3 (CTA+booking), G4 (internal_app Leads) pending."

- [ ] **Step 2: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark growth engine G2 shipped in roadmap"
```

---

## Self-review notes (already applied)

- **Spec §3 coverage:** §3.1 queue + conditional opens → seeds (G1) + `depends_on`/trigger evaluation (Task 3) + reseeded ⑤ (Task 1); §3.2 Level 2 card → Tasks 7–8; §3.3 skip → snooze 6d/3-sessions-as-active-days → Tasks 2–3, soft card Task 8; §3.4 Level 3 → Task 6 (interview mode) with checklist/guidance reactions explicitly deferred to G3 (scope guards); RPC `answer_profile_prompt` → Task 2; copy/trigger from `n400_prompt_definitions` → Tasks 3–4 read the DB rows, dict carries chrome only.
- **Type consistency:** `ActivePrompt`/`ActivePromptDecision`/`PromptSurface`/`PromptDefinition` defined once (Tasks 3–4) and imported everywhere; RPC arg names `p_question_key/p_answer/p_variant/p_surface` match between Task 2 SQL and Task 4 `.rpc()` calls; `footer` prop name consistent between Tasks 8's two steps; `selectActivePrompt` returns a decision (`{ def, reason }`) — every call site reads `.def`.
- **Known judgment calls (locked here, don't re-litigate mid-execution):** session ≡ active day (pace-engine precedent); dashboard dismiss = re-skip (re-snooze); answered-question chaining only for `immediately_after`; UTC dates for day-distinctness (matches SQL scoring).
- **Review round 2 (user, 2026-07-19) — applied:** `surface` on every prompt event (`prompt_answered`/`prompt_skipped`), so Level 2 vs Level 1 conversion is one query; new `prompt_shown` event from `n400_mark_prompt_shown` carrying variant + surface (`shown_count` alone carries neither) so the whole shown→answered→skipped funnel lives in `n400_growth_events`; evaluator returns a `reason` string for debugging; hero growth intents are a priority-ordered table (`GROWTH_INTENT_TIERS`) rather than an if-branch.
- **Review round 2 — scoped down deliberately:** the priority table covers the **growth intent tier only**. The 7-tier behavior ladder keeps its implicit code-order priority: converting it to numeric priorities means wrapping each tier in a thunk (they compute different things — stale-section lookup, mock-review ids) for zero behavior change on shipped, tested code, which is speculative generality. G3 grows the growth tier, not the behavior ladder, and its CTA priorities already live in `n400_cta_definitions.priority`.
