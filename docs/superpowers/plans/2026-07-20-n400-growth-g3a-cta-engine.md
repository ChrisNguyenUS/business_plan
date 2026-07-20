# N400 Growth Engine — G3a (CTA Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the behavior-driven CTA engine — a pure `selectActiveCta()` evaluator over the 8 scenarios already seeded in G1, the 7 hard rules (7-day cap, per-CTA cooldown, dismiss→snooze, 3-dismiss→30-day group mute, converted→consultation off forever, escalation ladder, priority), the `n400_cta_decision_log` debug trail, and a single `getGrowthState()` endpoint that serves both the CTA and the G2 prompt in one round trip — all gated behind the `cta_engine` + `growth_engine` flags (currently OFF).

**Architecture:** Mirrors the G2 profiling shape exactly. A **pure evaluator** `src/lib/n400/growth/cta.ts` takes fully-loaded inputs and returns `{ def, reason, eligible }` or `null` with a reason — no I/O, fully unit-tested.

The read path is deliberately split four ways so `getGrowthState` stays an **orchestrator, not a God Service** — G3b (booking), G3c (checklist) and G4 (recommendation, lead status) all add loaders here, and a single file accumulating them would be unmaintainable within two phases:

```
growth-context.ts  loadGrowthContext()  → the rows BOTH halves need, fetched ONCE
       │                                  (lead profile, growth events, prompt states)
       ├── prompt-state.ts  loadPromptState(ctx)  → ActivePrompt | null
       ├── cta-state.ts     loadCtaState(ctx)     → ActiveCta | null
       ▼
growth-state.ts    getGrowthState() = flags → context → both loaders in parallel
                                      → assembleGrowthState() (pure, unit-tested)
```

The shared context layer is what actually retires the G2 perf debt: `n400_lead_profiles` and the graded `n400_growth_events` log are each read **once per page**, not once per evaluator. Precedence between a question and a CTA lives in the pure `assembleGrowthState()` rather than buried in a return statement, so it is testable. Each new phase adds one loader file and one line in the orchestrator.

All CTA writes go through SECURITY DEFINER RPCs (`n400_mark_cta_shown` / `n400_dismiss_cta` / `n400_click_cta`), and the same migration moves the `cta_*` event types off the client RLS whitelist — the same treatment `prompt_*` got in `n400_23`. **No new tables:** dismiss counts, group mutes and cooldowns are all derived from the `cta_*` events already in `n400_growth_events`; the 7-day cap reads `n400_lead_profiles.last_growth_prompt_at`, which already exists.

**Tech Stack:** Next.js 16 App Router (⚠️ read `node_modules/next/dist/docs/` per `apps/website/AGENTS.md` before writing route/server-action code), Supabase (Postgres + RLS), vitest (pure modules only — no component test rig). Monorepo isolation: **all edits confined to `apps/website/`** (+ this docs folder + `docs/ROADMAP.md`). Migrations applied to remote project `ffsrlmtqzlidnuitkdvw` via `mcp__supabase__apply_migration`. Branch: `feat/n400-growth-g3a` (one branch per phase, per spec §8).

**Spec:** `docs/superpowers/specs/2026-07-19-n400-growth-engine-design.md` §4 (CTA Engine), §1.5b (decision log), §1.6 (config tables), §1.7 (engine boundary). Prior phases: G1 plan `2026-07-19-n400-growth-g1-data-engine.md` (migrations `n400_15`–`n400_19`), G2 plan `2026-07-19-n400-growth-g2-conversation-model.md` (migrations `n400_20`–`n400_23`).

**G3a scope guards (YAGNI):**
- **No booking form, no consultation request table writes, no Resend, no Meta CAPI** — that is G3b. This plan only *decides* that a `book_consultation` CTA should be shown.
- **No Filing Checklist page and no `open_checklist` CTA seed** — that is G3c, and its content is coming from the user.
- Because of the two guards above, the evaluator takes an **`availableActions`** set and drops any CTA whose `action` has no destination yet. In G3a only `start_mock` is available, so S7 is the only scenario that can actually render; the other seven are exercised by unit tests and light up for free when G3b/G3c flip their flags. This is what makes G3a shippable on its own.
- **No internal_app work, no `n400_cta_funnel` view, no analytics screens** — G4.
- **No rules editor UI** — G4. Copy/params keep coming from `n400_cta_definitions`.
- The `n400_cta_definitions` rows are **already seeded** (G1 `n400_16`, 8 rows S1–S7 + S9 with bilingual copy, `conditions`, `priority`, `cooldown_days`). Do **not** re-seed them. Recalibrating numbers is a DB edit, out of scope.

**Three facts from prior phases this plan builds on (do not re-derive):**
1. **Learning state is fully DB-backed.** `useN400UserState` hydrates from `n400_user_profile`, `n400_quiz_attempts`, `n400_question_attempts`, `n400_section_attempts`, `n400_section_mock_results`. So the server can compute readiness and weakest-section itself — the CTA engine never trusts client-supplied signals, per spec §1.7 ("UI chỉ render, không quyết định").
2. **The derivations are pure and must be reused, not reimplemented.** `deriveReadiness` (`readiness.ts`), `deriveSectionGradedTally` / `deriveSectionMastered` (`section-progress.ts`). Task 2 feeds them from the server and Task 3's drift-lock test pins the result against the client assembly. Re-implementing readiness server-side is the single biggest correctness hazard in this plan: [[n400-known-metric-asymmetry]] — "thuộc" is the **last GRADED attempt correct**; flashcard self-grades never count, and deck state (`deriveSectionKnown`) is a different thing from mastery (`deriveSectionMastered`). Swapping them silently makes S9 fire for users whose own Tiến độ screen says they are not ready.
3. **Event types are the RLS boundary.** `n400_23` made the whole `prompt_*` funnel server-only. `cta_*` is still client-insertable and `cta_dismissed` feeds the `dismissed_consultation_cta_3` scoring penalty — Task 1 closes that at the same time it adds the CTA RPCs.

---

### Task 1: Migration `n400_24_growth_cta_rpcs.sql` — CTA RPCs, decision log, and server-only `cta_*` events

**Files:**
- Create: `apps/website/supabase/migrations/n400_24_growth_cta_rpcs.sql`
- Modify: `apps/website/src/lib/n400/growth/events.ts`
- Modify: `apps/website/src/lib/n400/growth/flags.test.ts`

- [ ] **Step 1: Write the migration file**

```sql
-- Growth Engine G3a: CTA impression / dismiss / click RPCs (spec §4).
--
-- Like the G2 prompt funnel, every CTA write goes through a SECURITY DEFINER
-- function so the event log that feeds both scoring and the G4 funnel view
-- cannot be forged. This migration also finishes what n400_23 started: the
-- cta_* types come OFF the client INSERT whitelist. That matters more here
-- than it did for prompts, because cta_dismissed actually feeds a scoring
-- rule (dismissed_consultation_cta_3).
--
-- No new state table on purpose: dismiss counts, group mutes and per-CTA
-- cooldowns are all derivable from the cta_* events themselves, and the
-- 7-day global cap reads n400_lead_profiles.last_growth_prompt_at, which has
-- existed since n400_15.

-- ── evaluation: log every run, shown or not (spec §1.5b) ───────────────────
-- Deliberately SEPARATE from the impression RPC below. The whole point of
-- this table is answering "why did this user see nothing?", so it must be
-- written when the answer is "nothing" — which is precisely when no
-- impression happens. Coupling the two would make the log record only the
-- cases that need no explaining.
CREATE OR REPLACE FUNCTION public.n400_log_cta_decision(
  p_eligible_ctas text[] DEFAULT '{}',
  p_selected_cta  text   DEFAULT NULL,
  p_reason        text   DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  INSERT INTO n400_cta_decision_log (user_id, eligible_ctas, selected_cta, reason)
  VALUES (v_user, p_eligible_ctas, p_selected_cta, p_reason);
END; $$;

-- ── impression: stamps the 7-day cap and emits the event ───────────────────
CREATE OR REPLACE FUNCTION public.n400_mark_cta_shown(
  p_cta_id        text,
  p_variant       text DEFAULT 'a',
  p_surface       text DEFAULT NULL    -- 'results' | 'dashboard'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_group text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;

  SELECT group_key INTO v_group FROM n400_cta_definitions
  WHERE cta_id = p_cta_id AND variant = p_variant AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown cta %/%', p_cta_id, p_variant;
  END IF;

  -- The 7-day cap (spec §4.1 rule 1) is stamped ONLY here, on a real
  -- impression. The evaluator selecting a CTA is not enough: a decision the
  -- user never actually saw — tab closed mid-load, card unmounted before
  -- paint, flag flipped between decision and render — must not consume the
  -- week. Callers must invoke this from the rendered card, never from the
  -- evaluation path.
  INSERT INTO n400_lead_profiles (user_id) VALUES (v_user)
  ON CONFLICT (user_id) DO NOTHING;
  UPDATE n400_lead_profiles
  SET last_growth_prompt_at = now(), updated_at = now()
  WHERE user_id = v_user;

  -- group_key rides in the payload because the scoring rule
  -- dismissed_consultation_cta_3 already reads payload->>'group', and the G4
  -- funnel groups by cta_id × variant × surface.
  PERFORM n400_emit_growth_event(v_user, 'cta_shown',
    jsonb_build_object('cta_id', p_cta_id, 'variant', p_variant,
                       'surface', p_surface, 'group', v_group));
END; $$;

-- ── dismiss ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.n400_dismiss_cta(
  p_cta_id  text,
  p_variant text DEFAULT 'a',
  p_surface text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_group text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;
  SELECT group_key INTO v_group FROM n400_cta_definitions
  WHERE cta_id = p_cta_id AND variant = p_variant AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown cta %/%', p_cta_id, p_variant;
  END IF;

  PERFORM n400_emit_growth_event(v_user, 'cta_dismissed',
    jsonb_build_object('cta_id', p_cta_id, 'variant', p_variant,
                       'surface', p_surface, 'group', v_group));
END; $$;

-- ── click ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.n400_click_cta(
  p_cta_id  text,
  p_variant text DEFAULT 'a',
  p_surface text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_group text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;
  SELECT group_key INTO v_group FROM n400_cta_definitions
  WHERE cta_id = p_cta_id AND variant = p_variant AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown cta %/%', p_cta_id, p_variant;
  END IF;

  -- G3b reads the newest cta_clicked to fill source_cta on the consultation
  -- request (spec §7: conversion attribution = last CTA click before submit).
  PERFORM n400_emit_growth_event(v_user, 'cta_clicked',
    jsonb_build_object('cta_id', p_cta_id, 'variant', p_variant,
                       'surface', p_surface, 'group', v_group));
END; $$;

-- ── decision-log retention (spec §1.5b: 30 days, no cron) ───────────────────
-- Probabilistic cleanup: ~1 in 50 writes trims the table. Cheap, self-healing,
-- and keeps this debug table from growing without bound at one row per
-- dashboard load.
CREATE OR REPLACE FUNCTION public.n400_trg_cta_decision_log_gc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF random() < 0.02 THEN
    DELETE FROM n400_cta_decision_log WHERE evaluated_at < now() - interval '30 days';
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_n400_cta_decision_log_gc ON public.n400_cta_decision_log;
CREATE TRIGGER trg_n400_cta_decision_log_gc
AFTER INSERT ON public.n400_cta_decision_log
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_cta_decision_log_gc();

-- ── close the last client-writable growth events (finishes n400_23) ─────────
-- cta_shown/dismissed/clicked are now RPC-only. cta_dismissed feeds the
-- dismissed_consultation_cta_3 penalty, and G4's funnel view is built on all
-- three, so none of them may be client-forgeable. That leaves only
-- checklist_viewed / consultation_form_opened on the whitelist — pure UI
-- telemetry that touches neither score nor funnel.
DROP POLICY IF EXISTS "n400 growth events own insert client types" ON public.n400_growth_events;

CREATE POLICY "n400 growth events own insert client types" ON public.n400_growth_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND event_type IN ('checklist_viewed','consultation_form_opened')
  );

REVOKE EXECUTE ON FUNCTION public.n400_log_cta_decision(text[], text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_mark_cta_shown(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_dismiss_cta(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_click_cta(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.n400_log_cta_decision(text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_mark_cta_shown(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_dismiss_cta(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_click_cta(text, text, text) TO authenticated;
```

- [ ] **Step 2: Apply the migration**

Run `mcp__supabase__apply_migration` with name `n400_24_growth_cta_rpcs` and the file content.

- [ ] **Step 3: Verify with rolled-back live tests**

Run via `mcp__supabase__execute_sql`:

```sql
DO $$
DECLARE v_user uuid; v_n int; v_stamp timestamptz; v_blocked boolean := false;
BEGIN
  SELECT user_id INTO v_user FROM n400_user_profile LIMIT 1;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

  -- ① the log records a NO-SHOW run. This is the case the table exists for,
  --    and the one an impression-coupled log would silently miss.
  PERFORM n400_log_cta_decision(ARRAY['s9_final_review'], NULL, 'cap_7d_active');
  IF NOT EXISTS (SELECT 1 FROM n400_cta_decision_log
                 WHERE user_id = v_user AND selected_cta IS NULL
                   AND reason = 'cap_7d_active'
                   AND 's9_final_review' = ANY(eligible_ctas)) THEN
    RAISE EXCEPTION 'TEST_FAIL: no-show decision not logged';
  END IF;

  -- ①b logging must NOT stamp the cap — only a real impression does.
  SELECT last_growth_prompt_at INTO v_stamp FROM n400_lead_profiles WHERE user_id = v_user;
  IF v_stamp IS NOT NULL THEN
    RAISE EXCEPTION 'TEST_FAIL: logging a decision consumed the 7-day cap';
  END IF;

  -- ② mark_shown: stamps the cap and emits with group_key
  PERFORM n400_mark_cta_shown('s7_civics_done', 'a', 'dashboard');
  SELECT last_growth_prompt_at INTO v_stamp FROM n400_lead_profiles WHERE user_id = v_user;
  IF v_stamp IS NULL THEN RAISE EXCEPTION 'TEST_FAIL: cap not stamped on impression'; END IF;

  SELECT count(*) INTO v_n FROM n400_growth_events
  WHERE user_id = v_user AND event_type = 'cta_shown'
    AND payload->>'cta_id' = 's7_civics_done'
    AND payload->>'group'  = 'education'
    AND payload->>'surface' = 'dashboard';
  IF v_n <> 1 THEN RAISE EXCEPTION 'TEST_FAIL: % cta_shown events', v_n; END IF;

  -- ③ dismiss + click emit with the group the scoring rule reads
  PERFORM n400_dismiss_cta('s1_mock_ready', 'a', 'results');
  IF NOT EXISTS (SELECT 1 FROM n400_growth_events
                 WHERE user_id = v_user AND event_type = 'cta_dismissed'
                   AND payload->>'group' = 'consultation') THEN
    RAISE EXCEPTION 'TEST_FAIL: dismiss did not tag group';
  END IF;
  PERFORM n400_click_cta('s1_mock_ready', 'a', 'results');
  IF NOT EXISTS (SELECT 1 FROM n400_growth_events
                 WHERE user_id = v_user AND event_type = 'cta_clicked') THEN
    RAISE EXCEPTION 'TEST_FAIL: no cta_clicked event';
  END IF;

  -- ④ unknown cta must raise
  BEGIN
    PERFORM n400_mark_cta_shown('does_not_exist', 'a', 'dashboard');
  EXCEPTION WHEN others THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'TEST_FAIL: unknown cta accepted'; END IF;

  RAISE EXCEPTION 'TEST_OK (rolled back)';
END $$;
```

Expected: `TEST_OK (rolled back)`.

Then verify the RLS tightening actually bites (must also end in `TEST_OK`):

```sql
DO $$
DECLARE v_user uuid; v_blocked boolean;
BEGIN
  SELECT user_id INTO v_user FROM n400_user_profile LIMIT 1;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  v_blocked := false;
  BEGIN
    INSERT INTO n400_growth_events (user_id, event_type, payload)
    VALUES (v_user, 'cta_dismissed', '{"group":"consultation"}'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'TEST_FAIL: cta_dismissed still client-insertable'; END IF;

  -- still allowed: pure UI telemetry
  INSERT INTO n400_growth_events (user_id, event_type, payload)
  VALUES (v_user, 'checklist_viewed', '{}'::jsonb);

  RAISE EXCEPTION 'TEST_OK (rolled back)';
END $$;
```

- [ ] **Step 4: Move the `cta_*` types to the server taxonomy**

In `apps/website/src/lib/n400/growth/events.ts`, `CLIENT_EVENT_TYPES` must end up as exactly:

```ts
export const CLIENT_EVENT_TYPES = [
  'checklist_viewed',
  'consultation_form_opened',
] as const;
```

and the three `cta_*` types move into `SERVER_EVENT_TYPES`, directly under the existing `prompt_*` block, with this comment above them:

```ts
  // RPC-only since n400_24 (mark_cta_shown / dismiss_cta / click_cta):
  // cta_dismissed feeds the dismissed_consultation_cta_3 scoring penalty and
  // all three feed G4's funnel view, so none may be client-forgeable.
  'cta_shown',
  'cta_dismissed',
  'cta_clicked',
```

- [ ] **Step 5: Update the taxonomy test**

In `apps/website/src/lib/n400/growth/flags.test.ts`, the `isClientEventType` describe block currently asserts `cta_dismissed` is a client type. Replace that whole block with:

```ts
describe('isClientEventType', () => {
  it('accepts whitelisted client events', () => {
    expect(isClientEventType('checklist_viewed')).toBe(true);
    expect(isClientEventType('consultation_form_opened')).toBe(true);
  });

  it('rejects server-authoritative and unknown types', () => {
    expect(isClientEventType('mock_completed')).toBe(false);
    expect(isClientEventType('practice_completed')).toBe(false);
    expect(isClientEventType('drop table')).toBe(false);
  });

  // The prompt funnel is RPC-only (n400_21/n400_22) and the RLS whitelist was
  // narrowed to match (n400_23) — G3 reads conversion rates off these events,
  // so a client must never be able to forge them.
  it('rejects the whole prompt funnel', () => {
    expect(isClientEventType('prompt_shown')).toBe(false);
    expect(isClientEventType('prompt_answered')).toBe(false);
    expect(isClientEventType('prompt_skipped')).toBe(false);
  });

  // Same reasoning for the CTA funnel (n400_24) — plus cta_dismissed is the
  // one client-facing event that actually moves the lead score.
  it('rejects the whole CTA funnel', () => {
    expect(isClientEventType('cta_shown')).toBe(false);
    expect(isClientEventType('cta_dismissed')).toBe(false);
    expect(isClientEventType('cta_clicked')).toBe(false);
  });
});
```

- [ ] **Step 6: Run the suite**

Run: `cd apps/website && npx tsc --noEmit && npx vitest run`
Expected: clean typecheck, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/website/supabase/migrations/n400_24_growth_cta_rpcs.sql apps/website/src/lib/n400/growth/events.ts apps/website/src/lib/n400/growth/flags.test.ts
git commit -m "feat(n400-growth): CTA shown/dismiss/click RPCs, decision log with retention, server-only cta_* events"
```

---

### Task 2: Server-side learning signals loader

**Files:**
- Create: `apps/website/src/lib/n400/growth/learning-signals.ts`

The CTA evaluator needs readiness (S9), weakest section (S5/S6), and mock stats (S1) — all of which the client derives today from `useN400UserState`. Spec §1.7 requires the decision to be server-side, so this module loads the same tables and calls the **same pure functions**. It must never re-implement a derivation. Task 3 pins it against the client assembly.

- [ ] **Step 1: Read the client assembly first**

Read `apps/website/src/lib/n400/user-state.tsx` around the hydration block (the `Promise.all` near line 75) and the `stats` memo, plus `apps/website/src/app/n400ready/(app)/progress/page.tsx` around line 63 where `deriveReadiness` is called. Note exactly which fields feed `ReadinessSignals`. Do not guess — the known-vs-mastered distinction is the trap ([[n400-known-metric-asymmetry]]).

- [ ] **Step 2: Write the module**

```ts
// Server-side learning signals for the CTA evaluator (spec §4.2 conditions).
//
// Everything here is loaded from the same tables useN400UserState hydrates
// from, then handed to the SAME pure derivations the client screens use.
// Reimplementing any of them would let the CTA engine disagree with the
// user's own Tiến độ screen — S9 firing for someone the app tells "chưa sẵn
// sàng" is the exact failure this module exists to prevent.

import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveReadiness, type ReadinessSignals } from '../readiness';
import { deriveSectionGradedTally, deriveSectionMastered, type SectionAttempt, type SectionKey } from '../section-progress';
import type { MockResult, SectionMockResult } from '../storage';
import type { N400Dict } from '../i18n/vi';
import type { GradedEvent } from './profiling';

export interface LearningSignals {
  /** readiness.ready — the S9 condition. */
  readinessReady: boolean;
  /** Completed civics mocks, and their average percent (S1). */
  mockCount: number;
  mockAvgPct: number | null;
  /** Weakest graded section and how many graded attempts it has (S5/S6). */
  weakestSection: SectionKey | null;
  weakestSectionAttempts: number;
  /** Distinct days with a graded practice/mock event (S2). */
  practiceDays: number;
  /** Every civics category has been seen (S7). */
  allCivicsSectionsDone: boolean;
}

/**
 * `gradedEvents` comes from the shared growth context — this module must NOT
 * re-read n400_growth_events. Both halves of the growth state need that log,
 * and reading it per-evaluator is exactly the duplication the context layer
 * exists to remove.
 */
export async function loadLearningSignals(
  supabase: SupabaseClient,
  userId: string,
  dict: N400Dict,
  gradedEvents: readonly GradedEvent[],
): Promise<LearningSignals> {
  const [profileRes, attemptsRes, sectionRes, sectionMockRes] = await Promise.all([
    supabase
      .from('n400_user_profile')
      .select('mastered_question_ids, seen_question_ids')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('n400_quiz_attempts')
      .select('mode, score, total_questions, passed, completed_at, question_results')
      .eq('user_id', userId)
      .eq('mode', 'mock_test')
      .not('completed_at', 'is', null),
    supabase
      .from('n400_section_attempts')
      .select('section, mode, was_correct, item_id, at')
      .eq('user_id', userId),
    supabase
      .from('n400_section_mock_results')
      .select('section, score, total, passed, completed_at')
      .eq('user_id', userId),
  ]);

  const sectionAttempts = (sectionRes.data ?? []) as SectionAttempt[];
  const mockResults = (attemptsRes.data ?? []) as unknown as MockResult[];
  const sectionMockResults = (sectionMockRes.data ?? []) as unknown as SectionMockResult[];

  const mastered = deriveSectionMastered(sectionAttempts);
  const signals: ReadinessSignals = {
    civicsKnown: (profileRes.data?.mastered_question_ids ?? []).length,
    civicsTotal: CIVICS_TOTAL,
    whatmeanKnown: mastered.whatmean.size,
    whatmeanTotal: WHATMEAN_TOTAL,
    yesnoKnown: mastered.yesno.size,
    yesnoTotal: YESNO_TOTAL,
    writingKnown: mastered.writing.size,
    writingTotal: WRITING_TOTAL,
    mockResults,
    sectionMockResults,
  };
  const readiness = deriveReadiness(signals, dict);

  const pcts = mockResults
    .filter((m) => m.totalQuestions > 0)
    .map((m) => (m.score / m.totalQuestions) * 100);
  const mockAvgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;

  // Weakest = lowest graded accuracy among sections that have graded attempts.
  // Ties break in SECTION_ORDER, matching the Study page.
  const tally = deriveSectionGradedTally(sectionAttempts);
  let weakestSection: SectionKey | null = null;
  let weakestRate = Infinity;
  for (const key of SECTION_ORDER) {
    const t = tally[key];
    if (t.total === 0) continue;
    const rate = t.correct / t.total;
    if (rate < weakestRate) {
      weakestRate = rate;
      weakestSection = key;
    }
  }

  // UTC day, the same currency G2's evaluator and the SQL scoring both use.
  const practiceDays = new Set(gradedEvents.map((e) => e.at.slice(0, 10))).size;

  return {
    readinessReady: readiness.ready,
    mockCount: mockResults.length,
    mockAvgPct,
    weakestSection,
    weakestSectionAttempts: weakestSection ? tally[weakestSection].total : 0,
    practiceDays,
    allCivicsSectionsDone:
      (profileRes.data?.seen_question_ids ?? []).length >= CIVICS_TOTAL,
  };
}
```

⚠️ `CIVICS_TOTAL`, `WHATMEAN_TOTAL`, `YESNO_TOTAL`, `WRITING_TOTAL` and `SECTION_ORDER` are **not invented here** — import the existing constants. Before writing, run `grep -rn "civicsTotal\|whatmeanTotal\|writingTotal" apps/website/src/app/n400ready/\(app\)/progress/page.tsx` to see exactly which constants that page passes in, and import those same ones. If the progress page derives a total from a data array (e.g. `N400_QUESTIONS.length`), import the array and do the same — one source of truth, no new numbers.

Likewise verify the real column names on `n400_user_profile` / `n400_section_attempts` / `n400_section_mock_results` with `mcp__supabase__list_tables` before finalizing the `.select()` strings; the field names above follow the app's TS shapes, and Supabase columns are snake_case. Fix any mismatch and map to the TS shape explicitly rather than casting through `unknown`.

- [ ] **Step 3: Typecheck**

Run: `cd apps/website && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/lib/n400/growth/learning-signals.ts
git commit -m "feat(n400-growth): server-side learning signals loader reusing the client's pure derivations"
```

---

### Task 3: Drift-lock test — server signals must agree with the client screens

**Files:**
- Test: `apps/website/src/lib/n400/growth/learning-signals.test.ts`

This is the guard rail for Task 2. It does not hit the network: it feeds one fixture through both the client-shaped assembly and the loader's derivation helpers and asserts they agree.

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import { deriveReadiness, type ReadinessSignals } from '../readiness';
import { deriveSectionGradedTally, deriveSectionMastered, deriveSectionKnown } from '../section-progress';
import type { SectionAttempt } from '../section-progress';
import { vi as viDict } from '../i18n/vi';

// A learner who self-graded everything on flashcards but has poor GRADED
// accuracy. If the CTA engine ever swaps mastery for deck state, this learner
// reads as ready — the exact bug [[n400-known-metric-asymmetry]] warns about.
const attempts: SectionAttempt[] = [
  { section: 'writing', mode: 'flashcard', itemId: 'w1', wasCorrect: true, at: '2026-07-01T10:00:00Z' },
  { section: 'writing', mode: 'flashcard', itemId: 'w2', wasCorrect: true, at: '2026-07-01T10:01:00Z' },
  { section: 'writing', mode: 'practice', itemId: 'w1', wasCorrect: false, at: '2026-07-02T10:00:00Z' },
  { section: 'yesno', mode: 'practice', itemId: 'y1', wasCorrect: true, at: '2026-07-02T10:05:00Z' },
];

describe('learning-signals derivations', () => {
  it('uses mastery, never deck state, for readiness inputs', () => {
    const mastered = deriveSectionMastered(attempts);
    const known = deriveSectionKnown(attempts);
    // The two genuinely disagree for this learner — that is the point.
    expect(known.writing.size).toBeGreaterThan(mastered.writing.size);
    expect(mastered.writing.size).toBe(0); // last graded attempt on w1 was wrong
  });

  it('excludes flashcard self-grades from the weakest-section tally', () => {
    const tally = deriveSectionGradedTally(attempts);
    expect(tally.writing).toEqual({ total: 1, correct: 0 });
    expect(tally.yesno).toEqual({ total: 1, correct: 1 });
    // Writing is weakest on graded evidence, despite looking perfect on the deck.
    expect(tally.writing.correct / tally.writing.total)
      .toBeLessThan(tally.yesno.correct / tally.yesno.total);
  });

  it('readiness is not ready for a learner with no mastery and no mocks', () => {
    const signals: ReadinessSignals = {
      civicsKnown: 0, civicsTotal: 128,
      whatmeanKnown: 0, whatmeanTotal: 10,
      yesnoKnown: 0, yesnoTotal: 10,
      writingKnown: 0, writingTotal: 10,
      mockResults: [],
      sectionMockResults: [],
    };
    expect(deriveReadiness(signals, viDict).ready).toBe(false);
  });
});
```

⚠️ Match the real `SectionAttempt` field names and the real `vi` dict import style used by the neighbouring tests — check `apps/website/src/lib/n400/section-progress.test.ts` and `hero-recommendation.test.ts` first. `vi` collides with vitest's mock utility, hence the `viDict` alias. Adjust the fixture's totals to the real constants if `deriveReadiness` asserts on them.

- [ ] **Step 2: Run the test**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/learning-signals.test.ts`
Expected: PASS. If `mastered.writing.size` is not 0, stop and re-read `deriveSectionMastered` — do not adjust the assertion to match the code.

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/n400/growth/learning-signals.test.ts
git commit -m "test(n400-growth): lock CTA learning signals to mastery-not-deck-state semantics"
```

---

### Task 4: Pure evaluator `cta.ts` (TDD)

**Files:**
- Create: `apps/website/src/lib/n400/growth/cta.ts`
- Test: `apps/website/src/lib/n400/growth/cta.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  selectActiveCta,
  type CtaDefinition,
  type CtaEvent,
  type CtaInputs,
} from './cta';
import type { LearningSignals } from './learning-signals';

const USER = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-07-20T12:00:00Z');

function def(partial: Partial<CtaDefinition> & Pick<CtaDefinition, 'cta_id' | 'priority'>): CtaDefinition {
  return {
    variant: 'a',
    group_key: 'consultation',
    title_en: 't', title_vi: 't',
    body_en: 'b', body_vi: 'b',
    cta_label_en: 'go', cta_label_vi: 'đi',
    action: 'book_consultation',
    conditions: {},
    cooldown_days: 7,
    ...partial,
  };
}

// Mirrors the n400_16 seeds.
const SEEDS: CtaDefinition[] = [
  def({ cta_id: 's9_final_review',   priority: 100, conditions: { readiness_ready: true } }),
  def({ cta_id: 's4_interview_soon', priority: 90,  conditions: { interview_within_days: 30 } }),
  def({ cta_id: 's1_mock_ready',     priority: 80,  conditions: { min_mocks: 3, min_avg_pct: 90 } }),
  def({ cta_id: 's5_writing_help',   priority: 70,  conditions: { weakest_section: 'writing', min_sessions: 10 } }),
  def({ cta_id: 's6_speaking_help',  priority: 70,  conditions: { weakest_section: 'speaking', min_sessions: 10 } }),
  def({ cta_id: 's2_consistency',    priority: 60,  conditions: { min_practice_days: 20 } }),
  def({ cta_id: 's3_filing_stalled', priority: 50,  conditions: { journey_stage: 'preparing', stalled_days: 60 } }),
  def({ cta_id: 's7_civics_done',    priority: 40,  group_key: 'education', action: 'start_mock',
        conditions: { all_civics_sections_done: true } }),
];

const NO_SIGNALS: LearningSignals = {
  readinessReady: false,
  mockCount: 0,
  mockAvgPct: null,
  weakestSection: null,
  weakestSectionAttempts: 0,
  practiceDays: 0,
  allCivicsSectionsDone: false,
};

function inputs(partial: Partial<CtaInputs> = {}): CtaInputs {
  return {
    userId: USER,
    definitions: SEEDS,
    signals: NO_SIGNALS,
    events: [],
    journeyStage: null,
    interviewDate: null,
    journeyConfirmedAt: null,
    lastGrowthPromptAt: null,
    consultationBookedAt: null,
    availableActions: new Set(['book_consultation', 'start_mock', 'open_checklist']),
    now: NOW,
  };
}

function shown(ctaId: string, at: string): CtaEvent { return { type: 'cta_shown', ctaId, group: 'consultation', at }; }
function dismissed(ctaId: string, at: string, group: 'consultation' | 'education' = 'consultation'): CtaEvent {
  return { type: 'cta_dismissed', ctaId, group, at };
}

describe('selectActiveCta — eligibility', () => {
  it('returns null with reason no_eligible when nothing matches', () => {
    const got = selectActiveCta(inputs());
    expect(got.def).toBeNull();
    expect(got.reason).toBe('no_eligible');
    expect(got.eligible).toEqual([]);
  });

  it('matches S9 on readiness and reports it as the winner', () => {
    const got = selectActiveCta(inputs({ signals: { ...NO_SIGNALS, readinessReady: true } }));
    expect(got.def?.cta_id).toBe('s9_final_review');
    expect(got.reason).toBe('priority_s9_final_review');
    expect(got.eligible).toContain('s9_final_review');
  });

  it('matches S4 only when the interview is inside the window', () => {
    expect(selectActiveCta(inputs({ interviewDate: '2026-08-01' })).def?.cta_id).toBe('s4_interview_soon');
    expect(selectActiveCta(inputs({ interviewDate: '2026-12-01' })).def).toBeNull();
  });

  it('matches S1 only when both mock count and average clear the bar', () => {
    const twoGood = { ...NO_SIGNALS, mockCount: 2, mockAvgPct: 95 };
    const threeGood = { ...NO_SIGNALS, mockCount: 3, mockAvgPct: 95 };
    const threeWeak = { ...NO_SIGNALS, mockCount: 3, mockAvgPct: 80 };
    expect(selectActiveCta(inputs({ signals: twoGood })).def).toBeNull();
    expect(selectActiveCta(inputs({ signals: threeWeak })).def).toBeNull();
    expect(selectActiveCta(inputs({ signals: threeGood })).def?.cta_id).toBe('s1_mock_ready');
  });

  it('maps the speaking sections onto the S6 weakest_section condition', () => {
    const yesno = { ...NO_SIGNALS, weakestSection: 'yesno' as const, weakestSectionAttempts: 12 };
    const writing = { ...NO_SIGNALS, weakestSection: 'writing' as const, weakestSectionAttempts: 12 };
    expect(selectActiveCta(inputs({ signals: yesno })).def?.cta_id).toBe('s6_speaking_help');
    expect(selectActiveCta(inputs({ signals: writing })).def?.cta_id).toBe('s5_writing_help');
  });

  it('holds S5 back until the section has enough graded sessions', () => {
    const few = { ...NO_SIGNALS, weakestSection: 'writing' as const, weakestSectionAttempts: 9 };
    expect(selectActiveCta(inputs({ signals: few })).def).toBeNull();
  });

  it('matches S3 only for a preparing stage that has been stale long enough', () => {
    const stale = { journeyStage: 'preparing' as const, journeyConfirmedAt: '2026-04-01T00:00:00Z' };
    const fresh = { journeyStage: 'preparing' as const, journeyConfirmedAt: '2026-07-01T00:00:00Z' };
    expect(selectActiveCta(inputs(stale)).def?.cta_id).toBe('s3_filing_stalled');
    expect(selectActiveCta(inputs(fresh)).def).toBeNull();
  });
});

describe('selectActiveCta — hard rules (spec §4.1)', () => {
  it('rule 1: at most one growth CTA per 7 days', () => {
    const eligible = { signals: { ...NO_SIGNALS, readinessReady: true } };
    const capped = selectActiveCta(inputs({ ...eligible, lastGrowthPromptAt: '2026-07-18T12:00:00Z' }));
    expect(capped.def).toBeNull();
    expect(capped.reason).toBe('cap_7d_active');
    // The cap does not hide what WAS eligible — the decision log still needs it.
    expect(capped.eligible).toContain('s9_final_review');

    const expired = selectActiveCta(inputs({ ...eligible, lastGrowthPromptAt: '2026-07-01T12:00:00Z' }));
    expect(expired.def?.cta_id).toBe('s9_final_review');
  });

  it('rule 4a: one dismiss snoozes that CTA for its cooldown', () => {
    const eligible = { signals: { ...NO_SIGNALS, readinessReady: true } };
    const justDismissed = selectActiveCta(inputs({
      ...eligible,
      events: [dismissed('s9_final_review', '2026-07-18T12:00:00Z')],
    }));
    expect(justDismissed.def).toBeNull();

    const cooledOff = selectActiveCta(inputs({
      ...eligible,
      events: [dismissed('s9_final_review', '2026-07-01T12:00:00Z')],
    }));
    expect(cooledOff.def?.cta_id).toBe('s9_final_review');
  });

  it('rule 4b: three dismisses mute the whole group for 30 days', () => {
    const events = [
      dismissed('s9_final_review', '2026-07-01T12:00:00Z'),
      dismissed('s1_mock_ready',   '2026-07-05T12:00:00Z'),
      dismissed('s2_consistency',  '2026-07-10T12:00:00Z'),
    ];
    const muted = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, readinessReady: true },
      events,
    }));
    expect(muted.def).toBeNull();
    expect(muted.reason).toBe('group_muted:consultation');

    // The education group is untouched by consultation dismisses.
    const education = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, allCivicsSectionsDone: true },
      events,
    }));
    expect(education.def?.cta_id).toBe('s7_civics_done');
  });

  it('rule 5: a booked consultation retires the consultation group for good', () => {
    const converted = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, readinessReady: true, allCivicsSectionsDone: true },
      consultationBookedAt: '2026-01-01T00:00:00Z',
    }));
    // S9 is gone despite being eligible and highest priority; education remains.
    expect(converted.def?.cta_id).toBe('s7_civics_done');
    expect(converted.eligible).not.toContain('s9_final_review');
  });

  it('rule 7: highest priority wins when several scenarios match', () => {
    const many = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, readinessReady: true, mockCount: 5, mockAvgPct: 95, practiceDays: 30 },
    }));
    expect(many.def?.cta_id).toBe('s9_final_review');
    expect(many.eligible).toEqual(
      expect.arrayContaining(['s9_final_review', 's1_mock_ready', 's2_consistency']),
    );
  });

  it('drops CTAs whose action has no destination yet (G3a: booking not built)', () => {
    const g3a = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, readinessReady: true, allCivicsSectionsDone: true },
      availableActions: new Set(['start_mock']),
    }));
    expect(g3a.def?.cta_id).toBe('s7_civics_done');
    expect(g3a.eligible).not.toContain('s9_final_review');
  });

  it('ignores an earlier impression of the same CTA once its cooldown passed', () => {
    const got = selectActiveCta(inputs({
      signals: { ...NO_SIGNALS, readinessReady: true },
      events: [shown('s9_final_review', '2026-06-01T12:00:00Z')],
    }));
    expect(got.def?.cta_id).toBe('s9_final_review');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/cta.test.ts`
Expected: FAIL — `Cannot find module './cta'`.

- [ ] **Step 3: Write the implementation**

```ts
// CTA engine evaluator (spec §4). Pure decision logic: which single CTA — if
// any — a user should see right now, plus the reason and the full eligible
// set, both of which go straight into n400_cta_decision_log so "why did this
// user see nothing?" is one query (spec §1.5b).
//
// The seven hard rules of §4.1 are deliberately evaluated in a fixed order:
// global gates first (converted → group mute → 7-day cap), then per-CTA
// eligibility, then per-CTA cooldown, then priority. Order matters for the
// REASON string more than for the outcome — a capped user and a muted user
// look identical from the outside, and telling them apart is the whole point
// of the log.
//
// Escalation ladder (§4.1 rule 6) is not separate code: it is encoded in the
// seeded `priority` column plus each scenario's conditions, exactly as §4.1
// rule 7 describes. Do not add a second ordering mechanism.

import type { LearningSignals } from './learning-signals';
import type { SectionKey } from '../section-progress';

export type CtaAction = 'book_consultation' | 'open_checklist' | 'start_mock';
export type CtaGroup = 'consultation' | 'education';

export interface CtaDefinition {
  cta_id: string;
  variant: string;
  group_key: CtaGroup;
  title_en: string; title_vi: string;
  body_en: string;  body_vi: string;
  cta_label_en: string; cta_label_vi: string;
  action: CtaAction;
  conditions: {
    readiness_ready?: boolean;
    interview_within_days?: number;
    min_mocks?: number;
    min_avg_pct?: number;
    weakest_section?: 'writing' | 'speaking';
    min_sessions?: number;
    min_practice_days?: number;
    journey_stage?: string;
    stalled_days?: number;
    all_civics_sections_done?: boolean;
  };
  priority: number;
  cooldown_days: number;
}

export interface CtaEvent {
  type: 'cta_shown' | 'cta_dismissed' | 'cta_clicked';
  ctaId: string;
  group: CtaGroup;
  at: string;
}

export interface CtaInputs {
  userId: string;
  definitions: CtaDefinition[];
  signals: LearningSignals;
  events: CtaEvent[];
  journeyStage: string | null;
  /** ISO date (yyyy-mm-dd). */
  interviewDate: string | null;
  /** When the user last confirmed anything about their journey — the clock
      S3's `stalled_days` runs against. */
  journeyConfirmedAt: string | null;
  lastGrowthPromptAt: string | null;
  consultationBookedAt: string | null;
  /** Actions with a destination that exists in this build. G3a ships only
      `start_mock`; G3b adds `book_consultation`, G3c adds `open_checklist`. */
  availableActions: Set<CtaAction>;
  now: Date;
}

export interface CtaDecision {
  def: CtaDefinition | null;
  /** Mirrors n400_cta_decision_log.reason. */
  reason: string;
  /** Everything that passed scenario conditions, before the global gates —
      this is what makes the log answer "eligible but suppressed". */
  eligible: string[];
}

const DAY_MS = 86_400_000;

/** §4.1 rule 1. Seeded value; a param only in the sense that the cap is the
    same for every CTA, so it does not belong in per-row conditions. */
export const GLOBAL_CAP_DAYS = 7;
/** §4.1 rule 4: dismiss this many times → mute the group. */
export const GROUP_MUTE_DISMISSALS = 3;
/** §4.1 rule 4: for this many days. */
export const GROUP_MUTE_DAYS = 30;

function daysBetween(from: string, now: Date): number {
  return (now.getTime() - new Date(from).getTime()) / DAY_MS;
}

/** The seeds say "speaking", the app has two speaking sections. */
function sectionMatches(condition: 'writing' | 'speaking', section: SectionKey): boolean {
  return condition === 'writing' ? section === 'writing' : section === 'yesno' || section === 'whatmean';
}

function meetsConditions(def: CtaDefinition, i: CtaInputs): boolean {
  const c = def.conditions;
  const s = i.signals;

  if (c.readiness_ready === true && !s.readinessReady) return false;

  if (c.interview_within_days !== undefined) {
    if (!i.interviewDate) return false;
    const days = (new Date(i.interviewDate).getTime() - i.now.getTime()) / DAY_MS;
    if (days < 0 || days > c.interview_within_days) return false;
  }

  if (c.min_mocks !== undefined && s.mockCount < c.min_mocks) return false;
  if (c.min_avg_pct !== undefined && (s.mockAvgPct === null || s.mockAvgPct <= c.min_avg_pct)) return false;

  if (c.weakest_section !== undefined) {
    if (!s.weakestSection || !sectionMatches(c.weakest_section, s.weakestSection)) return false;
    if (s.weakestSectionAttempts < (c.min_sessions ?? 0)) return false;
  }

  if (c.min_practice_days !== undefined && s.practiceDays < c.min_practice_days) return false;

  if (c.journey_stage !== undefined) {
    if (i.journeyStage !== c.journey_stage) return false;
    if (c.stalled_days !== undefined) {
      if (!i.journeyConfirmedAt) return false;
      if (daysBetween(i.journeyConfirmedAt, i.now) < c.stalled_days) return false;
    }
  }

  if (c.all_civics_sections_done === true && !s.allCivicsSectionsDone) return false;

  return true;
}

export function selectActiveCta(inputs: CtaInputs): CtaDecision {
  const { definitions, events, now } = inputs;

  // §4.1 rule 5 — a converted lead never sees a consultation CTA again.
  const consultationRetired = Boolean(inputs.consultationBookedAt);

  // §4.1 rule 4b — group mute. Counted over the mute window, so the mute
  // eventually lifts on its own rather than being permanent.
  const mutedGroups = new Set<CtaGroup>();
  for (const group of ['consultation', 'education'] as const) {
    const recent = events.filter(
      (e) => e.type === 'cta_dismissed' && e.group === group && daysBetween(e.at, now) <= GROUP_MUTE_DAYS,
    );
    if (recent.length >= GROUP_MUTE_DISMISSALS) mutedGroups.add(group);
  }

  const eligible: CtaDefinition[] = [];
  for (const def of definitions) {
    if (!inputs.availableActions.has(def.action)) continue;
    if (consultationRetired && def.group_key === 'consultation') continue;
    if (!meetsConditions(def, inputs)) continue;
    eligible.push(def);
  }
  eligible.sort((a, b) => b.priority - a.priority);
  const eligibleIds = eligible.map((d) => d.cta_id);

  if (eligible.length === 0) return { def: null, reason: 'no_eligible', eligible: [] };

  // §4.1 rule 1 — the global cap. Checked AFTER eligibility so the log can say
  // "these were ready, the cap held them".
  if (
    inputs.lastGrowthPromptAt &&
    daysBetween(inputs.lastGrowthPromptAt, now) < GLOBAL_CAP_DAYS
  ) {
    return { def: null, reason: 'cap_7d_active', eligible: eligibleIds };
  }

  const survivors = eligible.filter((def) => {
    if (mutedGroups.has(def.group_key)) return false;
    // §4.1 rule 4a — one dismiss snoozes that CTA for its own cooldown.
    const lastDismiss = events
      .filter((e) => e.type === 'cta_dismissed' && e.ctaId === def.cta_id)
      .map((e) => e.at)
      .sort()
      .pop();
    if (lastDismiss && daysBetween(lastDismiss, now) < def.cooldown_days) return false;
    return true;
  });

  if (survivors.length === 0) {
    const muted = eligible.find((d) => mutedGroups.has(d.group_key));
    return {
      def: null,
      reason: muted ? `group_muted:${muted.group_key}` : 'cooldown_active',
      eligible: eligibleIds,
    };
  }

  // §4.1 rule 7 — priority order (already sorted).
  const winner = survivors[0];
  return { def: winner, reason: `priority_${winner.cta_id}`, eligible: eligibleIds };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/cta.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/growth/cta.ts apps/website/src/lib/n400/growth/cta.test.ts
git commit -m "feat(n400-growth): pure CTA evaluator with the seven hard rules and decision reasons"
```

---

### Task 5: The read path — shared context, two loaders, one orchestrator

**Files:**
- Create: `apps/website/src/lib/n400/growth/growth-context.ts`
- Create: `apps/website/src/lib/n400/growth/profiling-inputs.ts`
- Create: `apps/website/src/lib/n400/growth/prompt-state.ts`
- Create: `apps/website/src/lib/n400/growth/cta-state.ts`
- Create: `apps/website/src/lib/n400/growth/growth-state.ts`
- Test: `apps/website/src/lib/n400/growth/growth-state.test.ts`
- Modify: `apps/website/src/lib/n400/growth/prompt-actions.ts`

Spec §1.7: "Dashboard/result screen gọi 1 endpoint duy nhất (`getGrowthState`)". One endpoint, but **not** one function — the loaders are separate modules so G3b/G3c/G4 add files instead of growing this one. `getGrowthState` only orchestrates: flags → context → loaders → assemble.

The shared context is what makes the "one read" claim true. Without it, `loadProfilingInputs` and `loadLearningSignals` each fetch `n400_growth_events`, and both halves fetch `n400_lead_profiles` — the exact duplication this phase is supposed to remove.

- [ ] **Step 1: Write `growth-context.ts` — the rows both halves need**

```ts
// Shared read layer for the growth state. Every table BOTH the prompt half and
// the CTA half touch is fetched here, exactly once per page.
//
// Adding a phase means adding a loader that consumes this context — not
// another round of the same queries. If a new loader needs a table nothing
// else reads, it fetches that table itself; only genuinely shared rows belong
// here.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GradedEvent, PromptState } from './profiling';
import type { CtaEvent } from './cta';
import type { LeadProfileAnswers } from './profiling';

export interface GrowthContext {
  userId: string;
  /** The profiling answer columns + the CTA gating columns, one row, one read. */
  leadProfile:
    | (LeadProfileAnswers & {
        journey_stage: string | null;
        last_growth_prompt_at: string | null;
        consultation_booked_at: string | null;
      })
    | null;
  /** practice_completed / mock_completed — prompt triggers AND S2 practice days. */
  gradedEvents: GradedEvent[];
  /** cta_shown / cta_dismissed / cta_clicked — cooldowns, mutes, funnel. */
  ctaEvents: CtaEvent[];
  /** Per-question prompt state; also carries S3's "journey last confirmed" clock. */
  promptStates: PromptState[];
  now: Date;
}

export async function loadGrowthContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<GrowthContext> {
  // Explicit user_id filters everywhere — RLS is not a scope on these tables:
  // admins can read every row, which silently breaks maybeSingle() and
  // inflates event counts. (Learned the hard way in the G2 post-review fix.)
  const [leadRes, eventsRes, statesRes] = await Promise.all([
    supabase
      .from('n400_lead_profiles')
      .select('n400_filed, filing_timeline, interview_scheduled, interview_date, wants_guidance, journey_stage, last_growth_prompt_at, consultation_booked_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('n400_growth_events')
      .select('event_type, payload, created_at')
      .eq('user_id', userId)
      .in('event_type', [
        'practice_completed', 'mock_completed',
        'cta_shown', 'cta_dismissed', 'cta_clicked',
      ]),
    supabase
      .from('n400_profile_prompts')
      .select('question_key, answered_at, skipped_at, snooze_until')
      .eq('user_id', userId),
  ]);

  const rows = (eventsRes.data ?? []) as {
    event_type: string;
    payload: { cta_id?: string; group?: string } | null;
    created_at: string;
  }[];

  const gradedEvents: GradedEvent[] = rows
    .filter((e) => e.event_type === 'practice_completed' || e.event_type === 'mock_completed')
    .map((e) => ({ type: e.event_type as GradedEvent['type'], at: e.created_at }));

  const ctaEvents: CtaEvent[] = rows
    .filter((e) => e.event_type.startsWith('cta_'))
    .map((e) => ({
      type: e.event_type as CtaEvent['type'],
      ctaId: e.payload?.cta_id ?? '',
      group: (e.payload?.group ?? 'consultation') as CtaEvent['group'],
      at: e.created_at,
    }));

  return {
    userId,
    leadProfile: (leadRes.data ?? null) as GrowthContext['leadProfile'],
    gradedEvents,
    ctaEvents,
    promptStates: (statesRes.data ?? []) as PromptState[],
    now: new Date(),
  };
}
```

- [ ] **Step 2: Extract `profiling-inputs.ts` out of `prompt-actions.ts`**

`prompt-actions.ts` currently keeps `loadInputs` and `toActive` private, and it starts with `'use server'` — which means **every export must be an async function**, so the synchronous `toActive` cannot simply be exported from there. Move both into a new non-`'use server'` module `profiling-inputs.ts`:

- move `loadInputs` → export it as `loadProfilingInputs`, but change its signature to build from the context instead of re-querying:

```ts
export async function loadProfilingInputs(
  supabase: SupabaseClient,
  ctx: GrowthContext,
): Promise<ProfilingInputs> {
  const { data } = await supabase
    .from('n400_prompt_definitions')
    .select('question_key, variant, text_en, text_vi, options, trigger, depends_on, snooze_days, snooze_sessions, sort_order')
    .eq('enabled', true);
  return {
    userId: ctx.userId,
    definitions: (data ?? []) as PromptDefinition[],
    states: ctx.promptStates,
    answers: answersFromLeadProfile(ctx.leadProfile),
    gradedEvents: ctx.gradedEvents,
    now: ctx.now,
  };
}
```

- move `toActive` → export it as `toActivePrompt` (unchanged body)
- move the `ActivePrompt` interface here too
- in `prompt-actions.ts`, import both from `./profiling-inputs`, update the call sites in `answerProfilePrompt` (which must now call `loadGrowthContext` first), and re-export the type so existing importers keep compiling:

```ts
export type { ActivePrompt } from './profiling-inputs';
```

- [ ] **Step 3: Write `prompt-state.ts`**

```ts
// Prompt half of the growth state. Owns exactly one decision: which profiling
// question, if any, this surface should show.

import type { SupabaseClient } from '@supabase/supabase-js';
import { selectActivePrompt, type PromptSurface } from './profiling';
import { loadProfilingInputs, toActivePrompt, type ActivePrompt } from './profiling-inputs';
import type { GrowthContext } from './growth-context';

export async function loadPromptState(
  supabase: SupabaseClient,
  ctx: GrowthContext,
  surface: PromptSurface,
): Promise<ActivePrompt | null> {
  const decision = selectActivePrompt(await loadProfilingInputs(supabase, ctx), surface);
  return decision ? toActivePrompt(decision, surface) : null;
}
```

- [ ] **Step 4: Write `cta-state.ts`**

```ts
// CTA half of the growth state. Owns exactly one decision: which CTA, if any,
// this surface should show — and carries the decision trail the impression RPC
// needs for n400_cta_decision_log.

import type { SupabaseClient } from '@supabase/supabase-js';
import { selectActiveCta, type CtaAction, type CtaDefinition, type CtaGroup } from './cta';
import { loadLearningSignals } from './learning-signals';
import type { PromptSurface } from './profiling';
import type { GrowthContext } from './growth-context';
import type { N400Dict } from '../i18n/vi';

export interface ActiveCta {
  ctaId: string;
  variant: string;
  surface: PromptSurface;
  groupKey: CtaGroup;
  titleEn: string; titleVi: string;
  bodyEn: string;  bodyVi: string;
  labelEn: string; labelVi: string;
  action: CtaAction;
}

export async function loadCtaState(
  supabase: SupabaseClient,
  ctx: GrowthContext,
  surface: PromptSurface,
  availableActions: Set<CtaAction>,
  dict: N400Dict,
): Promise<ActiveCta | null> {
  const [defsRes, signals] = await Promise.all([
    supabase
      .from('n400_cta_definitions')
      .select('cta_id, variant, group_key, title_en, title_vi, body_en, body_vi, cta_label_en, cta_label_vi, action, conditions, priority, cooldown_days')
      .eq('enabled', true),
    loadLearningSignals(supabase, ctx.userId, dict, ctx.gradedEvents),
  ]);

  // S3 asks "how long has this stage been stale?" — the newest profiling
  // answer is when the user last confirmed anything about their journey.
  const journeyConfirmedAt = ctx.promptStates
    .map((s) => s.answered_at)
    .filter((a): a is string => Boolean(a))
    .sort()
    .pop() ?? null;

  const decision = selectActiveCta({
    userId: ctx.userId,
    definitions: (defsRes.data ?? []) as CtaDefinition[],
    signals,
    events: ctx.ctaEvents,
    journeyStage: ctx.leadProfile?.journey_stage ?? null,
    interviewDate: ctx.leadProfile?.interview_date ?? null,
    journeyConfirmedAt,
    lastGrowthPromptAt: ctx.leadProfile?.last_growth_prompt_at ?? null,
    consultationBookedAt: ctx.leadProfile?.consultation_booked_at ?? null,
    availableActions,
    now: ctx.now,
  });

  // Spec §1.5b: log EVERY evaluation, including the ones that show nothing —
  // "why did this user see nothing?" is the question this table exists to
  // answer, so the no-show runs are the valuable rows. Awaited rather than
  // fired-and-forgotten: a serverless function can freeze the moment the
  // response is returned, and a debug trail with holes in it is worse than
  // none. One insert; the n400_24 GC trigger keeps the table bounded.
  await supabase.rpc('n400_log_cta_decision', {
    p_eligible_ctas: decision.eligible,
    p_selected_cta: decision.def?.cta_id ?? null,
    p_reason: decision.reason,
  });

  if (!decision.def) return null;
  const d = decision.def;
  return {
    ctaId: d.cta_id, variant: d.variant, surface,
    groupKey: d.group_key,
    titleEn: d.title_en, titleVi: d.title_vi,
    bodyEn: d.body_en,  bodyVi: d.body_vi,
    labelEn: d.cta_label_en, labelVi: d.cta_label_vi,
    action: d.action,
  };
}
```

- [ ] **Step 5: Write `growth-state.ts` — orchestration only**

```ts
'use server';

// The one growth read the UI makes (spec §1.7) — and nothing more. This file
// orchestrates: check flags, load the shared context, run each half's loader,
// assemble. It must NOT grow query logic.
//
// Adding a phase = adding a loader module + one line here. G3b (booking),
// G3c (checklist) and G4 (recommendation, lead status) all land this way. If
// this file starts holding .from(...) calls again, the decomposition has been
// undone — put the query in a loader.

import { getAuthedServerClient } from './server-client';
import { isFeatureOn, type FeatureFlag } from './flags';
import { loadGrowthContext } from './growth-context';
import { loadPromptState } from './prompt-state';
import { loadCtaState, type ActiveCta } from './cta-state';
import type { CtaAction } from './cta';
import type { PromptSurface } from './profiling';
import type { ActivePrompt } from './profiling-inputs';
import type { N400Dict } from '../i18n/vi';

export interface GrowthState {
  prompt: ActivePrompt | null;
  cta: ActiveCta | null;
}

const EMPTY: GrowthState = { prompt: null, cta: null };

/** Actions with a real destination in this build. G3b appends
    'book_consultation', G3c appends 'open_checklist'. */
function availableActions(flags: Map<string, FeatureFlag>, userId: string): Set<CtaAction> {
  const actions = new Set<CtaAction>(['start_mock']);
  if (isFeatureOn(flags.get('booking_form'), userId)) actions.add('book_consultation');
  if (isFeatureOn(flags.get('filing_checklist'), userId)) actions.add('open_checklist');
  return actions;
}

/**
 * One question OR one CTA, never both (spec §4.1 rule 2 in spirit: one ask per
 * screen). The question wins — a profiling answer makes every later CTA
 * decision better, so asking first compounds.
 *
 * Pure on purpose: this is the precedence rule, and it is the thing most
 * likely to change when G3b/G3c add surfaces. Keeping it out of the I/O path
 * is what makes it testable.
 */
export function assembleGrowthState(
  prompt: ActivePrompt | null,
  cta: ActiveCta | null,
): GrowthState {
  return prompt ? { prompt, cta: null } : { prompt: null, cta };
}

export async function getGrowthState(
  surface: PromptSurface,
  dict: N400Dict,
): Promise<GrowthState> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return EMPTY;

  const { data: flagRows } = await supabase
    .from('n400_feature_flags')
    .select('flag_key, enabled, rollout_pct')
    .in('flag_key', ['growth_engine', 'profiling', 'cta_engine', 'booking_form', 'filing_checklist']);
  const flags = new Map((flagRows ?? []).map((f: FeatureFlag) => [f.flag_key, f]));

  if (!isFeatureOn(flags.get('growth_engine'), user.id)) return EMPTY;
  const profilingOn = isFeatureOn(flags.get('profiling'), user.id);
  const ctaOn = isFeatureOn(flags.get('cta_engine'), user.id);
  if (!profilingOn && !ctaOn) return EMPTY;

  const ctx = await loadGrowthContext(supabase, user.id);

  // The two halves are independent once the context exists — run them together.
  const [prompt, cta] = await Promise.all([
    profilingOn ? loadPromptState(supabase, ctx, surface) : Promise.resolve(null),
    ctaOn
      ? loadCtaState(supabase, ctx, surface, availableActions(flags, user.id), dict)
      : Promise.resolve(null),
  ]);

  return assembleGrowthState(prompt, cta);
}
```

⚠️ `'use server'` requires **every export to be an async function**. `assembleGrowthState` is synchronous, so if this file keeps the `'use server'` directive the export will fail to compile. Two ways out — pick the first: move `assembleGrowthState` (and `GrowthState`) into `growth-context.ts` or a small `growth-state-shape.ts` and re-export the *type* only, keeping `growth-state.ts` as a pure action module. Whichever you choose, the pure function must live somewhere importable by the test in Step 6.

- [ ] **Step 6: Test the precedence rule**

`growth-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assembleGrowthState } from './growth-state-shape';
import type { ActivePrompt } from './profiling-inputs';
import type { ActiveCta } from './cta-state';

const PROMPT = { questionKey: 'filed', variant: 'a', surface: 'results' } as ActivePrompt;
const CTA = { ctaId: 's7_civics_done', variant: 'a', surface: 'results' } as ActiveCta;

describe('assembleGrowthState', () => {
  it('shows the question when both are available — asking first compounds', () => {
    expect(assembleGrowthState(PROMPT, CTA)).toEqual({ prompt: PROMPT, cta: null });
  });

  it('falls through to the CTA when there is no question', () => {
    expect(assembleGrowthState(null, CTA)).toEqual({ prompt: null, cta: CTA });
  });

  it('renders nothing when neither half has anything', () => {
    expect(assembleGrowthState(null, null)).toEqual({ prompt: null, cta: null });
  });
});
```

⚠️ Import `assembleGrowthState` from wherever Step 5's `'use server'` note put it. The `as ActivePrompt` / `as ActiveCta` casts are deliberate — this function only ever passes the objects through, so the test should not have to construct full fixtures.

- [ ] **Step 7: Delete `getActivePrompt`**

It is superseded by `getGrowthState`. Task 7 updates its only caller (`GrowthPromptSlot`). Removing it now keeps the "one growth read" invariant real rather than aspirational.

- [ ] **Step 8: Typecheck + run the new test**

Run: `cd apps/website && npx tsc --noEmit && npx vitest run src/lib/n400/growth/growth-state.test.ts`
Expected: the new test passes, and typecheck reports **exactly one** error — `GrowthPromptSlot.tsx` still importing `getActivePrompt`. That is Task 7's job; leave it. Any other error means the decomposition is wired wrong.

- [ ] **Step 9: Commit**

```bash
git add apps/website/src/lib/n400/growth/growth-context.ts apps/website/src/lib/n400/growth/profiling-inputs.ts apps/website/src/lib/n400/growth/prompt-state.ts apps/website/src/lib/n400/growth/cta-state.ts apps/website/src/lib/n400/growth/growth-state.ts apps/website/src/lib/n400/growth/growth-state-shape.ts apps/website/src/lib/n400/growth/growth-state.test.ts apps/website/src/lib/n400/growth/prompt-actions.ts
git commit -m "feat(n400-growth): split the growth read path into shared context, two loaders and an orchestrator"
```

---

### Task 6: CTA server actions + i18n chrome

**Files:**
- Create: `apps/website/src/lib/n400/growth/cta-actions.ts`
- Modify: `apps/website/src/lib/n400/i18n/vi.ts`
- Modify: `apps/website/src/lib/n400/i18n/en.ts`

- [ ] **Step 1: Write `cta-actions.ts`**

```ts
'use server';

// CTA funnel writes (spec §4). Thin wrappers over the n400_24 RPCs — all the
// deciding happened in cta.ts; these only record what the user did.

import { getAuthedServerClient } from './server-client';
import type { PromptSurface } from './profiling';

/**
 * Call ONLY from a rendered card. This stamps the 7-day cap, so invoking it
 * from the evaluation path would let a CTA the user never saw consume the
 * week. The decision itself was already logged at evaluation time by
 * loadCtaState — this records the impression, not the decision.
 */
export async function markCtaShown(
  ctaId: string,
  variant: string,
  surface: PromptSurface,
): Promise<void> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return;
  await supabase.rpc('n400_mark_cta_shown', {
    p_cta_id: ctaId,
    p_variant: variant,
    p_surface: surface,
  });
}

export async function dismissCta(
  ctaId: string,
  variant: string,
  surface: PromptSurface,
): Promise<{ ok: boolean }> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false };
  const { error } = await supabase.rpc('n400_dismiss_cta', {
    p_cta_id: ctaId, p_variant: variant, p_surface: surface,
  });
  return { ok: !error };
}

export async function clickCta(
  ctaId: string,
  variant: string,
  surface: PromptSurface,
): Promise<{ ok: boolean }> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false };
  const { error } = await supabase.rpc('n400_click_cta', {
    p_cta_id: ctaId, p_variant: variant, p_surface: surface,
  });
  return { ok: !error };
}
```

- [ ] **Step 2: Add the card chrome to `vi.ts`**

Title/body/label all come from `n400_cta_definitions`; the dict only carries chrome. Extend the existing top-level `growth` key (added in G2) with:

```ts
    ctaEyebrow: 'Dành cho bạn',
    ctaDismiss: 'Ẩn gợi ý này',
```

- [ ] **Step 3: Mirror in `en.ts`**

```ts
    ctaEyebrow: 'For you',
    ctaDismiss: 'Hide this suggestion',
```

`en.ts` is typed `N400Dict = typeof vi`, so a missing mirror key fails the build.

- [ ] **Step 4: Typecheck + i18n test**

Run: `cd apps/website && npx tsc --noEmit && npx vitest run src/lib/n400/i18n/i18n.test.ts`
Expected: PASS (the `GrowthPromptSlot` error from Task 5 is still open — that is expected until Task 7).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/growth/cta-actions.ts apps/website/src/lib/n400/i18n/vi.ts apps/website/src/lib/n400/i18n/en.ts
git commit -m "feat(n400-growth): CTA funnel server actions and card chrome copy"
```

---

### Task 7: `GrowthCtaCard` + rework `GrowthPromptSlot` into `GrowthSlot`

**Files:**
- Create: `apps/website/src/components/n400/GrowthCtaCard.tsx`
- Modify: `apps/website/src/components/n400/GrowthPromptSlot.tsx` → renders either half
- Modify: `apps/website/src/app/n400ready/(app)/practice/page.tsx`
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx`
- Modify: `apps/website/src/app/n400ready/(app)/dashboard-client.tsx`

No component test rig exists (vitest, pure modules only) — verified by typecheck now and visually in Task 8.

- [ ] **Step 1: Write `GrowthCtaCard.tsx`**

```tsx
'use client';

// The CTA card (spec §4). Visually a sibling of GrowthPromptCard — same
// rounded-[24px] white card, same quiet dismiss — because they occupy the same
// slot and must not feel like two different systems bolted on.

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { clickCta, dismissCta, markCtaShown } from '@/lib/n400/growth/cta-actions';
import type { ActiveCta } from '@/lib/n400/growth/cta-state';

const ACTION_HREF: Record<ActiveCta['action'], string> = {
  // G3b replaces this with the real booking route; until booking_form is on,
  // the evaluator never returns a book_consultation CTA, so this is unreachable.
  book_consultation: '/n400ready/consultation',
  open_checklist: '/n400ready/filing-checklist',
  start_mock: '/n400ready/mock-test',
};

export function GrowthCtaCard({ cta, onDone }: { cta: ActiveCta; onDone: () => void }) {
  const { dict, lang } = useN400Lang();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const shownFor = useRef<string | null>(null);

  // One impression per CTA, fired from the mounted card — this is the moment
  // the 7-day cap gets stamped, so it must happen here and nowhere earlier.
  // A CTA the evaluator picked but the user never actually saw leaves the cap
  // untouched and simply gets picked again next time.
  useEffect(() => {
    if (shownFor.current === cta.ctaId) return;
    shownFor.current = cta.ctaId;
    void markCtaShown(cta.ctaId, cta.variant, cta.surface).catch(() => {
      // Best-effort funnel logging — never break a learning screen over it.
    });
  }, [cta.ctaId, cta.variant, cta.surface]);

  const title = lang === 'en' ? cta.titleEn : cta.titleVi;
  const body = lang === 'en' ? cta.bodyEn : cta.bodyVi;
  const label = lang === 'en' ? cta.labelEn : cta.labelVi;

  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clickCta(cta.ctaId, cta.variant, cta.surface);
    } catch {
      // Navigate regardless — a lost click event must not cost the user the CTA.
    }
    router.push(ACTION_HREF[cta.action]);
  };

  const dismiss = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await dismissCta(cta.ctaId, cta.variant, cta.surface);
    } catch {
      // Best-effort; still close the card.
    }
    setBusy(false);
    onDone();
  };

  return (
    <div className="relative rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      <button
        type="button"
        onClick={dismiss}
        aria-label={dict.growth.ctaDismiss}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50"
      >
        <X size={16} />
      </button>

      <div className="text-xs font-bold uppercase tracking-wide text-teal-600">
        {dict.growth.ctaEyebrow}
      </div>
      <div className="mt-1.5 pr-8 font-bold text-gray-800">{title}</div>
      <p className="mt-1 text-sm text-gray-600">{body}</p>

      <button
        type="button"
        disabled={busy}
        onClick={go}
        className="mt-3 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40"
      >
        {label}
      </button>
    </div>
  );
}
```

⚠️ Verify the three hrefs against the real routes before committing — list `apps/website/src/app/n400ready/(app)/` and match the mock-test entry path exactly (G2's hero tier uses `/mock-test`, i.e. relative to the n400ready base; `router.push` needs the full path). Fix `ACTION_HREF` to whatever the app actually uses; do not leave a guess in.

- [ ] **Step 2: Rewrite `GrowthPromptSlot.tsx` as the shared slot**

```tsx
'use client';

// Self-contained mount point for the whole growth surface: one server read
// (getGrowthState) returns at most one thing to render — a profiling question
// or a CTA. Host screens add one line; flags off → renders null, zero layout
// impact.

import { useEffect, useState } from 'react';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { getGrowthState } from '@/lib/n400/growth/growth-state';
import type { GrowthState } from '@/lib/n400/growth/growth-state-shape';
import type { PromptSurface } from '@/lib/n400/growth/profiling';
import { GrowthPromptCard } from './GrowthPromptCard';
import { GrowthCtaCard } from './GrowthCtaCard';

export function GrowthSlot({ surface }: { surface: PromptSurface }) {
  const { dict } = useN400Lang();
  const [state, setState] = useState<GrowthState | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGrowthState(surface, dict)
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(() => {
        // Growth UI is best-effort — never break a learning screen over it.
      });
    return () => {
      cancelled = true;
    };
  }, [surface, dict]);

  if (state?.prompt) {
    return (
      <GrowthPromptCard
        prompt={state.prompt}
        onDone={() => setState({ prompt: null, cta: null })}
      />
    );
  }
  if (state?.cta) {
    return (
      <GrowthCtaCard
        cta={state.cta}
        onDone={() => setState({ prompt: null, cta: null })}
      />
    );
  }
  return null;
}
```

Rename the file to `GrowthSlot.tsx` and delete `GrowthPromptSlot.tsx`.

⚠️ Passing `dict` from a client component into a `'use server'` action means the whole dict is serialized over the wire on every mount. If `N400Dict` is large, that is a real payload cost. Check its size first (`wc -c apps/website/src/lib/n400/i18n/vi.ts`); if it is more than a few KB, change `getGrowthState(surface)` to import the `vi` dict directly on the server instead — `deriveReadiness` only uses it for criterion labels, which nothing in the CTA path renders. Prefer the server-side import unless a test proves otherwise.

- [ ] **Step 3: Update the three host screens**

In all three files, change the import and the JSX tag from `GrowthPromptSlot` to `GrowthSlot`:

- `practice/page.tsx`: the `footer={<GrowthPromptSlot surface="results" />}` prop on `PracticeSessionSummary`
- `mock-test/civics/page.tsx`: the `<GrowthPromptSlot surface="results" />` inside `Result`
- `dashboard-client.tsx`: the `<GrowthPromptSlot surface="dashboard" />` under the hero block

Import path becomes `@/components/n400/GrowthSlot`.

- [ ] **Step 4: Typecheck + full suite**

Run: `cd apps/website && npx tsc --noEmit && npx vitest run`
Expected: clean typecheck (the Task 5 error is now resolved), all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/components/n400/GrowthCtaCard.tsx apps/website/src/components/n400/GrowthSlot.tsx "apps/website/src/app/n400ready/(app)/practice/page.tsx" "apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx" "apps/website/src/app/n400ready/(app)/dashboard-client.tsx"
git rm apps/website/src/components/n400/GrowthPromptSlot.tsx
git commit -m "feat(n400-growth): CTA card and unified growth slot on dashboard and result screens"
```

---

### Task 8: Flag flip + visual verification (CHECKPOINT — ask the user first)

Flags are live production config. **Stop and confirm with the user before flipping** — G2's flags were deliberately left OFF, so this decision covers both phases at once.

- [ ] **Step 1: Enable the flags** (after the user confirms)

Run via `mcp__supabase__execute_sql`:

```sql
UPDATE n400_feature_flags
SET enabled = TRUE, updated_at = now(), note = note || ' | G3a enabled ' || current_date
WHERE flag_key IN ('growth_engine', 'cta_engine');
```

Leave `booking_form` and `filing_checklist` OFF — their destinations do not exist until G3b/G3c, and `availableActions` depends on that being true.

- [ ] **Step 2: Visual verification**

Per [[n400-visual-verification-recipe]]: run the real app, auth never hydrates offline, the scroll container is `<main>` not `document`.

Run `cd apps/website && npm run dev`, sign in with a **non-admin** test account (the admin read policies broaden RLS — see the G2 post-review fix), then check:

1. Dashboard with `cta_engine` on and no eligible scenario → **nothing renders**, layout unchanged — but `n400_cta_decision_log` still gets a row with `selected_cta IS NULL` and `reason = 'no_eligible'`. Confirm that row exists; a silent no-show is the failure mode this table is meant to prevent. Confirm `last_growth_prompt_at` is still NULL: evaluating must never consume the cap.
2. Force S7 eligible (a test account that has seen all civics) → the CTA card appears under the hero with "Chúc mừng bạn!" and a "Bắt đầu Phỏng vấn thử" button; clicking navigates to the mock test and writes one `cta_clicked`.
3. `n400_lead_profiles.last_growth_prompt_at` is stamped **only after the card actually rendered**, never on a page load where the evaluator picked a CTA but nothing reached the screen. Cross-check against the decision log: a run logged with a non-null `selected_cta` whose card never mounted must leave the timestamp untouched.
4. Dismiss the card → it disappears; a `cta_dismissed` event exists with `payload->>'group' = 'education'`; reloading does not bring it back (cooldown).
5. With both `profiling` and `cta_engine` on and a question due → the **question** renders, not the CTA (one ask per screen).
6. Turn `cta_engine` off → CTA gone, profiling card unaffected.
7. Decision-log sanity — the "why did this user see nothing?" query works:

```sql
SELECT evaluated_at, selected_cta, eligible_ctas, reason
FROM n400_cta_decision_log
WHERE user_id = '<test-user-uuid>'
ORDER BY evaluated_at DESC LIMIT 20;
```

- [ ] **Step 3: Decide flag end-state with the user**

Keep ON or revert to OFF until G3b — the user's call. Record the decision.

---

### Task 9: Roadmap + docs closeout

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Add the shipped G3a line**

Insert directly after the G2 `[x]` line, matching its format:

```markdown
- [x] **Website Phase 3E — N400 Growth Engine G3a (CTA engine)** — Behavior-driven CTA live behind `cta_engine`+`growth_engine` flags: pure evaluator (`growth/cta.ts`) over the 8 G1-seeded scenarios with all seven §4.1 hard rules (7-day cap, per-CTA cooldown, dismiss→snooze, 3-dismiss→30-day group mute, converted→consultation retired, priority order, action availability), server-side learning signals reusing the client's own `deriveReadiness`/`deriveSectionGradedTally` (drift-locked by test), shown/dismiss/click RPCs + `n400_cta_decision_log` with 30-day probabilistic retention (n400_24), `cta_*` events moved server-only, and `getGrowthState` collapsing prompt+CTA into one read. Spec §4. G3b (booking flow), G3c (filing checklist), G4 (internal_app Leads) pending.
```

Update the G2 line's trailing pending list to read "G3b (booking flow), G3c (filing checklist), G4 (internal_app Leads) pending."

- [ ] **Step 2: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark growth engine G3a shipped in roadmap"
```

---

## Self-review notes (already applied)

- **Spec coverage:** §4.1 rules 1–7 → Task 4 (rule 6's escalation ladder is the seeded `priority` column plus per-scenario conditions, not separate code — called out in the evaluator header so no one adds a second ordering mechanism); §4.2 scenarios S1–S7+S9 → Task 4 conditions + Task 2 signals; §1.5b decision log → Task 1 (write + retention) and Task 4 (`eligible`/`reason` are evaluator outputs, so the log is never a second source of truth); §1.6 config-driven copy → Tasks 5–7 read `n400_cta_definitions`, dict carries chrome only; §1.7 one endpoint → Task 5. **Deferred by scope guard:** §4.3 checklist page (G3c), §5 booking (G3b), §6–7 internal_app + funnel view (G4).
- **Type consistency:** `CtaDefinition`/`CtaEvent`/`CtaInputs`/`CtaDecision`/`CtaAction`/`CtaGroup` defined once in Task 4 and imported everywhere; `LearningSignals` defined in Task 2 and consumed by Tasks 4–5; `GrowthContext` defined in Task 5 Step 1 and consumed by both loaders; `ActiveCta` lives in `cta-state.ts` and is imported by Task 7's card; `GrowthState`/`assembleGrowthState` live in `growth-state-shape.ts` so the `'use server'` module can export only async functions; RPC arg names match their call sites — `p_eligible_ctas/p_selected_cta/p_reason` on `n400_log_cta_decision` (Task 1 SQL ↔ Task 5 `cta-state.ts`), and `p_cta_id/p_variant/p_surface` on the three funnel RPCs (Task 1 SQL ↔ Task 6 `cta-actions.ts`); `ActiveCta` deliberately carries **no** `eligible`/`reason`, since the decision is logged server-side at evaluation time and the card only reports an impression; `PromptSurface`/`GradedEvent`/`PromptState`/`LeadProfileAnswers` reused from G2 rather than redeclared.
- **Decomposition (added after review, 2026-07-20):** the read path is four modules — `growth-context.ts` (shared rows, fetched once), `prompt-state.ts`, `cta-state.ts`, `growth-state.ts` (orchestration only). This was originally one file, and writing it that way hid a real defect: `loadProfilingInputs` and `loadLearningSignals` each fetched `n400_growth_events`, and both halves fetched `n400_lead_profiles`, so the "one load, two decisions" claim was false. The context layer makes it true and gives G3b/G3c/G4 a place to add loaders without growing the orchestrator. Guard rail: **if `growth-state.ts` ever contains a `.from(...)` call again, the decomposition has been undone.**
- **Known judgment calls (locked here, don't re-litigate mid-execution):** the CTA decision is **server-side** and never trusts client signals (spec §1.7) — the cost is Task 2's loader, and the drift risk that buys is contained by Task 3's test; group mute is a **rolling 30-day window** rather than a permanent flag, so it self-heals without a state table; the 7-day cap is stamped **only after a CTA is actually rendered (impression), never when the evaluator merely selects it**, so a decision that never reaches the user's screen does not consume the cooldown — and, kept deliberately separate from that, `n400_cta_decision_log` is written on **every** evaluation including the no-shows, because "why did this user see nothing?" is the question that table exists to answer and an impression-coupled log would record only the cases needing no explanation; when both a question and a CTA are available the **question wins**, because a profiling answer improves every later CTA decision.
- **Two hazards flagged inline rather than assumed away:** Task 2 must import the app's existing totals/constants rather than inventing numbers, and must verify column names against the live schema; Task 7 must verify the three route hrefs and reconsider passing the whole dict across the server boundary.
- **Carried debt this plan pays down:** G2's double fetch of the graded-event log (Task 5 loads once for both evaluators), and the last client-writable scoring-relevant event type, `cta_dismissed` (Task 1 finishes what `n400_23` started).
