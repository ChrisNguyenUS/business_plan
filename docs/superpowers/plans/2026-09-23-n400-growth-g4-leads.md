# N400 Growth Engine G4 — Leads (internal_app) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Manna staff a Leads page in `apps/internal_app/` that lists N400 leads by score and shows one lead's full growth history — read-only, no writes.

**Architecture:** internal_app already shares the same Supabase project, anon key and cookie session as the website, so it queries the growth tables directly and lets RLS do the authorization. One migration widens the existing admin-only read policies to `staff` and adds name/email to `n400_leads_view`; one SECURITY DEFINER RPC exposes the weakest-section aggregate without opening the quiz tables. A new workspace package `@mannaos/n400-growth` holds the event taxonomy and payload types so both apps read events through one contract.

**Tech Stack:** Next.js 16 App Router (server components), Supabase (`@supabase/ssr`, PostgREST, RLS), TypeScript, Tailwind, jest + `next/jest` (internal_app), vitest (website), pnpm workspaces + turbo.

**Spec:** `docs/superpowers/specs/2026-09-23-n400-growth-g4-leads-design.md`

---

## Before you start

Read the spec. Then read these three files — every task below assumes you have seen them:

- `apps/internal_app/src/app/(app)/clients/page.tsx` — the list-page pattern this feature copies (card, table, search form, empty state, colours).
- `apps/internal_app/src/actions/clients.ts` — the server-action pattern (`'use server'`, `createClient()`, `if (error) throw error`).
- `apps/internal_app/src/app/(app)/layout.tsx` — `NAV_ITEMS`, and how `isAdmin` hides `/jobs`.

**Two rules that have already caused real bugs in this codebase:**

1. **Always filter `user_id` explicitly.** These tables have staff-wide read policies. RLS is not a scope filter. A previous bug (`267d3184`) shipped because `.maybeSingle()` was called without `.eq('user_id', …)` and matched many rows once an admin was signed in.
2. **Verify column names against the database, not against this plan.** Draft plans in this repo have had wrong column names before. Every name in this plan was read from the live database on 2026-09-23, but re-check if a step surprises you.

**Database facts verified 2026-09-23** (you do not need to re-derive these):

- `n400_leads_view` has 21 columns, in this order: `user_id, journey_stage, n400_filed, filing_timeline, interview_scheduled, interview_date, wants_guidance, service_interest, lead_score, lead_status, consultation_requested_at, consultation_booked_at, last_growth_prompt_at, first_touch, last_touch, created_at, updated_at, last_activity_date, current_streak, effective_score, effective_status`.
- `n400_section_attempts` columns: `id, user_id, section, item_id, mode, was_correct, answered_at`.
- `n400_growth_events` columns: `id, user_id, event_type, event_version, payload, created_at`.
- `profiles` has `full_name`, `email`, `role` (`'admin' | 'staff' | 'client'`).

---

## File structure

**New package** — `packages/n400-growth/`
| File | Responsibility |
|---|---|
| `package.json` | Workspace manifest, TS source entry (no build step) |
| `tsconfig.json` | Standalone typecheck, extends `@mannaos/tsconfig/base.json` |
| `src/events.ts` | Event taxonomy — moved verbatim from website |
| `src/event-payloads.ts` | Typed payload per event type |
| `src/lead.ts` | Union types mirroring DB CHECK constraints |
| `src/index.ts` | Public surface |

**Website** — one file changes (`src/lib/n400/growth/events.ts` becomes a re-export). No behaviour change.

**internal_app**
| File | Responsibility |
|---|---|
| `src/lib/n400/timeline.ts` | PURE: one event → `{ icon, title, detail }`. No I/O. |
| `src/actions/leads.ts` | All Supabase reads for the feature |
| `src/app/(app)/leads/page.tsx` | List |
| `src/app/(app)/leads/[userId]/page.tsx` | Detail |
| `src/components/leads/LeadStatusBadge.tsx` | Status pill, used by both pages |
| `src/components/leads/LeadTimeline.tsx` | Renders the event list |
| `src/components/leads/LeadSummaryPanel.tsx` | Right column of the detail page |
| `__tests__/lib/n400/timeline.test.ts` | jest, covers every event type |

**Migrations** — `apps/website/supabase/migrations/`: `n400_29_growth_staff_read.sql`, `n400_30_weak_section_rpc.sql`.

> `n400_28` is already taken by the `document_prep` CHECK-constraint fix committed on 2026-09-23.

---

## Task 1: Create the `@mannaos/n400-growth` package

**Files:**
- Create: `packages/n400-growth/package.json`
- Create: `packages/n400-growth/tsconfig.json`
- Create: `packages/n400-growth/src/events.ts`
- Create: `packages/n400-growth/src/event-payloads.ts`
- Create: `packages/n400-growth/src/lead.ts`
- Create: `packages/n400-growth/src/index.ts`

No test file. This package is constants and types only; its correctness is enforced by `tsc` and by the timeline test in Task 6.

- [ ] **Step 1: Create the manifest**

`packages/n400-growth/package.json`:

```json
{
  "name": "@mannaos/n400-growth",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@mannaos/tsconfig": "workspace:*",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create the tsconfig**

`packages/n400-growth/tsconfig.json`:

```json
{
  "extends": "@mannaos/tsconfig/base.json",
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `src/events.ts`**

This is the current contents of `apps/website/src/lib/n400/growth/events.ts`, moved verbatim. Do not edit the lists — they must stay identical to what the RLS INSERT policy allows.

```ts
//
// Growth event taxonomy (spec §1.5). event_version bumps when a type's payload
// shape changes — consumers read by version.
//
// SERVER_EVENT_TYPES are emitted by DB triggers or SECURITY DEFINER RPCs only;
// the RLS INSERT policy on n400_growth_events rejects them from clients.
// CLIENT_EVENT_TYPES may be inserted by the signed-in user for themself —
// pure UI telemetry that touches neither score nor funnel (see n400_24).

export const CLIENT_EVENT_TYPES = [
  'consultation_form_opened',
] as const;

export const SERVER_EVENT_TYPES = [
  'account_created',
  'onboarding_completed',
  'address_entered',
  'practice_completed',
  'mock_completed',
  // The whole prompt funnel is RPC-only (n400_21 / n400_22), so the G3
  // conversion analytics built on it cannot be forged — see n400_23.
  'prompt_shown',
  'prompt_answered',
  'prompt_skipped',
  // RPC-only since n400_24 (mark_cta_shown / dismiss_cta / click_cta):
  // cta_dismissed feeds the dismissed_consultation_cta_3 scoring penalty and
  // all three feed G4's funnel view, so none may be client-forgeable.
  'cta_shown',
  'cta_dismissed',
  'cta_clicked',
  // reserved, not emitted in G1:
  'section_completed',
  'readiness_snapshot',
  'app_shared',
  'review_left',
  'friend_invited',
  'push_disabled',
] as const;

export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];
export type ServerEventType = (typeof SERVER_EVENT_TYPES)[number];
export type GrowthEventType = ClientEventType | ServerEventType;

export const EVENT_VERSION = 1;

export function isClientEventType(type: string): type is ClientEventType {
  return (CLIENT_EVENT_TYPES as readonly string[]).includes(type);
}

/** Every event type, in no particular order. Consumers that must handle all
 *  of them (G4's timeline) iterate this so a new type cannot be forgotten. */
export const ALL_EVENT_TYPES: readonly GrowthEventType[] = [
  ...CLIENT_EVENT_TYPES,
  ...SERVER_EVENT_TYPES,
];
```

- [ ] **Step 4: Create `src/event-payloads.ts`**

Each shape was read from the emitter that writes it. The file paths in the comments are in `apps/website/supabase/migrations/`.

```ts
// Payload shapes for n400_growth_events.payload, read from the emitters that
// write them. payload is jsonb, so nothing guarantees these at runtime — they
// describe what the database writes today. A consumer that reads a field not
// listed here is reading something that is never written.

/** n400_18_growth_emitters.sql — address_entered */
export interface AddressEnteredPayload {
  state: string | null;
  city: string | null;
}

/** n400_18_growth_emitters.sql — practice_completed / mock_completed.
 *  One practice event = one graded question (the envelope row), not one
 *  session. Mock events are one per finished mock test. */
export interface AttemptCompletedPayload {
  attempt_id: string;
  score: number;
  total: number;
  passed: boolean;
}

/** n400_21_growth_profiling_rpcs.sql — prompt_shown / prompt_skipped */
export interface PromptPayload {
  question_key: string;
  variant: string | null;
  surface: string | null;
}

/** n400_21_growth_profiling_rpcs.sql — prompt_answered */
export interface PromptAnsweredPayload extends PromptPayload {
  answer: string;
}

/** n400_24_growth_cta_rpcs.sql — cta_shown / cta_dismissed / cta_clicked */
export interface CtaPayload {
  cta_id: string;
  variant: string | null;
  surface: string | null;
  group: string | null;
}

/** account_created, onboarding_completed and every reserved type write `{}`. */
export type EmptyPayload = Record<string, never>;
```

- [ ] **Step 5: Create `src/lead.ts`**

```ts
// Union types mirroring the CHECK constraints on the growth tables
// (n400_15_growth_tables.sql), so app code and database agree on the
// allowed values.

export type JourneyStage =
  | 'exploring'
  | 'preparing'
  | 'filed'
  | 'waiting_interview'
  | 'interview_scheduled';

export type FilingTimeline = '30d' | '3m' | '6m' | 'exploring';

export type WantsGuidance = 'yes' | 'maybe' | 'no';

export type LeadStatus = 'cold' | 'warm' | 'hot' | 'sales_ready';

export type ConsultationStatus =
  | 'new'
  | 'contacted'
  | 'booked'
  | 'done'
  | 'no_show'
  | 'cancelled';

export type ConsultationOutcome = 'won' | 'lost' | 'follow_up';

// Mirrors booking.ts CONSULTATION_TOPICS, including 'document_prep' which the
// database only started accepting in n400_28.
export type ConsultationTopic =
  | 'document_prep'
  | 'n400_review'
  | 'interview_prep'
  | 'writing'
  | 'speaking'
  | 'other';

/** Section keys used by the Speaking/Writing study sections. Mirrors
 *  apps/website/src/lib/n400/section-progress.ts SECTION_KEYS, in the same
 *  order — the order is the documented tie-break for "weakest section". */
export const SECTION_KEYS = ['whatmean', 'yesno', 'writing'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
```

- [ ] **Step 6: Create `src/index.ts`**

```ts
export * from './events';
export * from './event-payloads';
export * from './lead';
```

- [ ] **Step 7: Install so pnpm links the new workspace package**

Run: `pnpm install`
Expected: completes without error; `packages/n400-growth` appears in the workspace list.

- [ ] **Step 8: Typecheck the package**

Run: `pnpm --filter @mannaos/n400-growth type-check`
Expected: no output, exit code 0.

- [ ] **Step 9: Commit**

```bash
git add packages/n400-growth pnpm-lock.yaml
git commit -m "feat(n400-growth): shared package for the growth event contract"
```

---

## Task 2: Wire the package into the website

The website keeps behaving exactly as before. `events.ts` becomes a re-export so the roughly ten existing import sites do not change.

**Files:**
- Modify: `apps/website/package.json` (dependencies)
- Modify: `apps/website/next.config.ts`
- Modify: `apps/website/src/lib/n400/growth/events.ts` (replace contents)

- [ ] **Step 1: Add the dependency**

In `apps/website/package.json`, add to `"dependencies"` (keep alphabetical position near the other `@` scoped entries):

```json
"@mannaos/n400-growth": "workspace:*",
```

- [ ] **Step 2: Add `transpilePackages`**

In `apps/website/next.config.ts`, inside the `nextConfig` object, add this property (alongside `images`):

```ts
  transpilePackages: ["@mannaos/n400-growth"],
```

- [ ] **Step 3: Replace the website's `events.ts` with a re-export**

Replace the entire contents of `apps/website/src/lib/n400/growth/events.ts` with:

```ts
// The growth event taxonomy moved to @mannaos/n400-growth so internal_app's
// Leads timeline (G4) reads events through the same contract. Re-exported
// here so existing import sites keep working.
export * from '@mannaos/n400-growth';
```

- [ ] **Step 4: Install**

Run: `pnpm install`
Expected: completes; `apps/website/node_modules/@mannaos/n400-growth` is a symlink into `packages/`.

- [ ] **Step 5: Typecheck and test the website**

Run: `pnpm --filter website type-check && pnpm --filter website test`
Expected: typecheck silent; vitest reports all tests passing (74 in `src/lib/n400/growth` alone, more across the suite). If any test fails, the re-export dropped an export — compare `src/index.ts` against the old file.

- [ ] **Step 6: Commit**

```bash
git add apps/website/package.json apps/website/next.config.ts apps/website/src/lib/n400/growth/events.ts pnpm-lock.yaml
git commit -m "refactor(n400-growth): read the event taxonomy from the shared package"
```

---

## Task 3: Wire the package into internal_app

**Files:**
- Modify: `apps/internal_app/package.json` (dependencies + a `type-check` script)
- Modify: `apps/internal_app/next.config.ts`
- Modify: `apps/internal_app/jest.config.ts`

- [ ] **Step 1: Add the dependency and a `type-check` script**

In `apps/internal_app/package.json`, add to `"dependencies"`:

```json
"@mannaos/n400-growth": "workspace:*",
```

and add to `"scripts"`:

```json
"type-check": "tsc --noEmit",
```

> The root `turbo.json` already declares a `type-check` task, but internal_app had no such script, so `turbo type-check` silently skipped this app. Adding it means the new code is actually typechecked.

- [ ] **Step 2: Add `transpilePackages`**

In `apps/internal_app/next.config.ts`, add to `nextConfig`:

```ts
  transpilePackages: ["@mannaos/n400-growth"],
```

The final file:

```ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  transpilePackages: ["@mannaos/n400-growth"],
  turbopack: {
    root: path.join(process.cwd(), "../../"),
  },
};

export default nextConfig;
```

- [ ] **Step 3: Map the package in jest**

`next/jest` reads `transpilePackages`, but map it explicitly so the test run does not depend on that behaviour. In `apps/internal_app/jest.config.ts`, extend `moduleNameMapper`:

```ts
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@mannaos/n400-growth$': '<rootDir>/../../packages/n400-growth/src/index.ts',
  },
```

- [ ] **Step 4: Install**

Run: `pnpm install`
Expected: completes; `apps/internal_app/node_modules/@mannaos/n400-growth` exists as a symlink into `packages/`.

Verify the symlink:

Run: `ls -l apps/internal_app/node_modules/@mannaos/`
Expected: an `n400-growth` entry pointing at `../../../../packages/n400-growth`.

> Resolution from application code is proven properly in Task 6, whose test imports the package.

- [ ] **Step 5: Typecheck and run the existing tests**

Run: `pnpm --filter internal_app type-check && pnpm --filter internal_app test`

> If `internal_app` is not the package name, check `apps/internal_app/package.json`'s `"name"` field and use that.

Expected: typecheck silent; the six existing test suites in `__tests__/` still pass.

- [ ] **Step 6: Commit**

```bash
git add apps/internal_app/package.json apps/internal_app/next.config.ts apps/internal_app/jest.config.ts pnpm-lock.yaml
git commit -m "chore(internal-app): consume the shared growth package, add type-check"
```

---

## Task 4: Migration — staff read access and lead names

**Files:**
- Create: `apps/website/supabase/migrations/n400_29_growth_staff_read.sql`

This migration does three things: adds an `is_staff_or_admin()` helper, widens six read policies plus `profiles` from admin-only to staff-or-admin, and adds `full_name`/`email`/`role` to `n400_leads_view`.

The view body below is the current definition read from the database, unchanged except for the added join and the three appended columns. Do not try to simplify the repeated decay expression — `CREATE OR REPLACE VIEW` requires the existing columns to keep identical names, types and order, and a rewrite risks changing `effective_score` from `integer`.

- [ ] **Step 1: Write the migration**

```sql
-- G4 (spec §3): the Leads page is staff-visible, but every growth read policy
-- was written as role = 'admin', and profiles is readable only by its owner or
-- an admin. A staff user would therefore open /leads and see an empty list —
-- filtered away by RLS, with no error to explain it.
--
-- Widens SELECT only. Every UPDATE policy stays at admin: G4 v1 is read-only.
-- is_admin() is left untouched — it still gates protect_profile_role and the
-- admin update policies.

-- ── helper ───────────────────────────────────────────────────────────────────
-- Mirrors is_admin() (006_profiles_identity.sql) including its grant posture
-- (008_identity_hardening.sql): SECURITY DEFINER so the policy's own lookup on
-- profiles does not recurse through RLS.
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;

-- ── growth tables: admin read → staff-or-admin read ──────────────────────────
DROP POLICY IF EXISTS "n400 growth events admin read" ON public.n400_growth_events;
CREATE POLICY "n400 growth events staff read" ON public.n400_growth_events
  FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 lead profiles admin read" ON public.n400_lead_profiles;
CREATE POLICY "n400 lead profiles staff read" ON public.n400_lead_profiles
  FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 profile prompts admin read" ON public.n400_profile_prompts;
CREATE POLICY "n400 profile prompts staff read" ON public.n400_profile_prompts
  FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 consultation admin read" ON public.n400_consultation_requests;
CREATE POLICY "n400 consultation staff read" ON public.n400_consultation_requests
  FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 cta decision log admin read" ON public.n400_cta_decision_log;
CREATE POLICY "n400 cta decision log staff read" ON public.n400_cta_decision_log
  FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 user profile admin read" ON public.n400_user_profile;
CREATE POLICY "n400 user profile staff read" ON public.n400_user_profile
  FOR SELECT USING (public.is_staff_or_admin());

-- ── profiles: staff need the lead's name and email ───────────────────────────
-- Additive. users_read_own_profile and admins_read_all_profiles stay as they
-- are; RLS SELECT policies are OR-ed.
DROP POLICY IF EXISTS "staff_read_all_profiles" ON public.profiles;
CREATE POLICY "staff_read_all_profiles" ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_staff_or_admin());

-- ── n400_leads_view: carry name, email and role ──────────────────────────────
-- The view is security_invoker, so the join reads profiles under the caller's
-- own policies — which is exactly why the policy above is required.
--
-- role travels with the row so the Leads page can filter to role = 'client'.
-- Without that filter every staff and admin account shows up as a cold lead:
-- the account_created trigger fires on every profiles INSERT, and the scoring
-- trigger creates an n400_lead_profiles row for everyone.
--
-- Body below is unchanged from n400_17 except for the added LEFT JOIN and the
-- three appended columns.
CREATE OR REPLACE VIEW public.n400_leads_view
WITH (security_invoker = true) AS
SELECT
  lp.user_id,
  lp.journey_stage,
  lp.n400_filed,
  lp.filing_timeline,
  lp.interview_scheduled,
  lp.interview_date,
  lp.wants_guidance,
  lp.service_interest,
  lp.lead_score,
  lp.lead_status,
  lp.consultation_requested_at,
  lp.consultation_booked_at,
  lp.last_growth_prompt_at,
  lp.first_touch,
  lp.last_touch,
  lp.created_at,
  lp.updated_at,
  up.last_activity_date,
  up.current_streak,
  GREATEST(0, LEAST(300, lp.lead_score + CASE
    WHEN up.last_activity_date IS NULL THEN 0
    WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
      THEN n400_rule_points('inactive_30d')
    WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
      THEN n400_rule_points('inactive_14d')
    ELSE 0 END)) AS effective_score,
  CASE
    WHEN GREATEST(0, LEAST(300, lp.lead_score + CASE
      WHEN up.last_activity_date IS NULL THEN 0
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
        THEN n400_rule_points('inactive_30d')
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
        THEN n400_rule_points('inactive_14d')
      ELSE 0 END)) <= 50  THEN 'cold'
    WHEN GREATEST(0, LEAST(300, lp.lead_score + CASE
      WHEN up.last_activity_date IS NULL THEN 0
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
        THEN n400_rule_points('inactive_30d')
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
        THEN n400_rule_points('inactive_14d')
      ELSE 0 END)) <= 120 THEN 'warm'
    WHEN GREATEST(0, LEAST(300, lp.lead_score + CASE
      WHEN up.last_activity_date IS NULL THEN 0
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
        THEN n400_rule_points('inactive_30d')
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
        THEN n400_rule_points('inactive_14d')
      ELSE 0 END)) <= 200 THEN 'hot'
    ELSE 'sales_ready'
  END AS effective_status,
  p.full_name,
  p.email,
  p.role
FROM n400_lead_profiles lp
LEFT JOIN n400_user_profile up ON up.user_id = lp.user_id
LEFT JOIN public.profiles     p  ON p.id      = lp.user_id;
```

- [ ] **Step 2: Apply the migration**

Apply it to the Supabase project (`ffsrlmtqzlidnuitkdvw`) using the `apply_migration` tool with name `n400_29_growth_staff_read` and the SQL above.

Expected: `{"success": true}`. If it fails on the view with "cannot change name of view column", the body drifted from what this plan recorded — read `pg_get_viewdef('public.n400_leads_view'::regclass, true)` and re-apply with the current body plus the three new columns.

- [ ] **Step 3: Verify the helper, the policies and the view**

Run this query:

```sql
SELECT
  (SELECT count(*) FROM pg_proc WHERE proname = 'is_staff_or_admin') AS helper,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE '%staff read%')   AS staff_policies,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND policyname = 'staff_read_all_profiles') AS profiles_policy,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'n400_leads_view')  AS view_columns;
```

Expected: `helper = 1`, `staff_policies = 6`, `profiles_policy = 1`, `view_columns = 24`.

- [ ] **Step 4: Verify no UPDATE policy was widened**

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'n400_consultation_requests'
  AND cmd = 'UPDATE';
```

Expected: one row, `n400 consultation admin update`, whose `qual` still references `role = 'admin'` — not `is_staff_or_admin`.

- [ ] **Step 5: Commit**

```bash
git add apps/website/supabase/migrations/n400_29_growth_staff_read.sql
git commit -m "feat(n400-growth): let staff read leads, carry name and email on the view"
```

---

## Task 5: Migration — weakest-section RPC

**Files:**
- Create: `apps/website/supabase/migrations/n400_30_weak_section_rpc.sql`

Task 4 did not open the quiz tables to staff, and it should not. This RPC exposes one aggregate instead, guarding itself because SECURITY DEFINER bypasses RLS.

- [ ] **Step 1: Write the migration**

```sql
-- G4 (spec §5): the weakest study section for one lead, for the Leads detail
-- page.
--
-- SECURITY DEFINER because computing it requires n400_section_attempts, which
-- staff cannot read and should not be able to read — exposing one aggregate is
-- the point. A definer function bypasses RLS entirely, so it guards itself.
--
-- The rule must match deriveSectionGradedTally + the weakest-section loop in
-- apps/website/src/lib/n400/growth/learning-signals.ts:
--   * graded only — mode 'flashcard' never counts
--   * lowest correct/total among sections that have at least one graded attempt
--   * ties break in SECTION_KEYS order (whatmean, yesno, writing), because the
--     TypeScript loop uses a strict < and walks that array in order
--
-- KNOWN DRIFT RISK: this is a second implementation of that rule. It could not
-- reuse the first — n400_learning_rollup and n400_graded_day_rollup (n400_25)
-- filter on auth.uid(), so they cannot answer for another user. If you change
-- the rule in either place, change it in both.
CREATE OR REPLACE FUNCTION public.n400_weak_section_for(p_user_id uuid)
RETURNS TABLE (section text, graded_total int, correct_pct numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  WITH tally AS (
    SELECT
      sa.section                                        AS sec,
      count(*)::int                                     AS total,
      count(*) FILTER (WHERE sa.was_correct)::int       AS correct
    FROM n400_section_attempts sa
    WHERE sa.user_id = p_user_id
      AND sa.mode <> 'flashcard'
      AND sa.section IN ('whatmean', 'yesno', 'writing')
    GROUP BY sa.section
  )
  SELECT
    t.sec,
    t.total,
    round(100.0 * t.correct / t.total, 1)
  FROM tally t
  ORDER BY
    (t.correct::numeric / t.total) ASC,
    array_position(ARRAY['whatmean', 'yesno', 'writing'], t.sec) ASC
  LIMIT 1;
END; $$;

REVOKE EXECUTE ON FUNCTION public.n400_weak_section_for(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.n400_weak_section_for(uuid) TO authenticated;
```

- [ ] **Step 2: Apply the migration**

Apply with `apply_migration`, name `n400_30_weak_section_rpc`.
Expected: `{"success": true}`.

- [ ] **Step 3: Verify it runs and returns no rows for a user with no graded attempts**

```sql
SELECT * FROM public.n400_weak_section_for(
  (SELECT id FROM auth.users LIMIT 1)
);
```

Expected: either zero rows (that user has no graded section attempts) or exactly one row whose `section` is one of `whatmean`/`yesno`/`writing`. Zero rows is a valid, expected result — the UI handles it.

> Running this as the service role will raise `unauthorized` because `auth.uid()` is NULL in that context. The guard must be exercised with a simulated staff session instead; this is verified in Task 9 Step 5 with a real staff account.

- [ ] **Step 4: Commit**

```bash
git add apps/website/supabase/migrations/n400_30_weak_section_rpc.sql
git commit -m "feat(n400-growth): weakest-section RPC for the Leads detail page"
```

---

## Task 6: The timeline formatter (TDD)

This is the only piece of real logic in the feature, and it is pure, so it is tested properly.

**Files:**
- Create: `apps/internal_app/src/lib/n400/timeline.ts`
- Test: `apps/internal_app/__tests__/lib/n400/timeline.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/internal_app/__tests__/lib/n400/timeline.test.ts`:

```ts
import { ALL_EVENT_TYPES } from '@mannaos/n400-growth'
import { describeEvent } from '@/lib/n400/timeline'

describe('describeEvent', () => {
  it('produces a non-empty title for every known event type', () => {
    for (const type of ALL_EVENT_TYPES) {
      const entry = describeEvent(type, {})
      expect(entry.title.length).toBeGreaterThan(0)
      expect(entry.icon.length).toBeGreaterThan(0)
    }
  })

  it('reads the city and state out of an address_entered payload', () => {
    const entry = describeEvent('address_entered', { city: 'Austin', state: 'TX' })
    expect(entry.detail).toBe('Austin, TX')
  })

  it('falls back to whichever half of the address exists', () => {
    expect(describeEvent('address_entered', { state: 'TX' }).detail).toBe('TX')
    expect(describeEvent('address_entered', { city: 'Austin' }).detail).toBe('Austin')
    expect(describeEvent('address_entered', {}).detail).toBeNull()
  })

  it('reports a mock score with its pass state', () => {
    const entry = describeEvent('mock_completed', {
      attempt_id: 'a', score: 18, total: 20, passed: true,
    })
    expect(entry.title).toBe('Mock test completed')
    expect(entry.detail).toBe('18/20 · passed')
  })

  it('reports a failed mock as failed', () => {
    const entry = describeEvent('mock_completed', {
      attempt_id: 'a', score: 9, total: 20, passed: false,
    })
    expect(entry.detail).toBe('9/20 · failed')
  })

  it('shows the answer on prompt_answered', () => {
    const entry = describeEvent('prompt_answered', {
      question_key: 'n400_filed', answer: 'not_yet', variant: 'a', surface: 'results',
    })
    expect(entry.title).toBe('Answered: n400_filed')
    expect(entry.detail).toBe('not_yet · results')
  })

  it('names the CTA on cta_clicked', () => {
    const entry = describeEvent('cta_clicked', {
      cta_id: 's10_document_prep', variant: 'a', surface: 'dashboard', group: 'consultation',
    })
    expect(entry.title).toBe('CTA clicked: s10_document_prep')
    expect(entry.detail).toBe('dashboard')
  })

  it('degrades to the raw type for an event type it has never seen', () => {
    const entry = describeEvent('something_new' as never, {})
    expect(entry.title).toBe('something_new')
    expect(entry.icon).toBe('circle')
  })

  it('does not throw when a payload is missing the fields it expects', () => {
    expect(() => describeEvent('cta_clicked', {})).not.toThrow()
    expect(describeEvent('cta_clicked', {}).title).toBe('CTA clicked: unknown')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter internal_app test -- timeline`
Expected: FAIL — `Cannot find module '@/lib/n400/timeline'`.

- [ ] **Step 3: Write the implementation**

`apps/internal_app/src/lib/n400/timeline.ts`:

```ts
import type { GrowthEventType } from '@mannaos/n400-growth'

/** One rendered row of the lead timeline. */
export interface TimelineEntry {
  /** Material Symbols icon name. */
  icon: string
  title: string
  /** Secondary line; null renders nothing. */
  detail: string | null
}

/** payload is jsonb — every read has to tolerate a missing or wrong-typed
 *  field rather than throwing inside a server component render. */
function str(payload: Record<string, unknown>, key: string): string | null {
  const v = payload[key]
  return typeof v === 'string' && v.length > 0 ? v : null
}

function num(payload: Record<string, unknown>, key: string): number | null {
  const v = payload[key]
  return typeof v === 'number' ? v : null
}

function joinDot(parts: (string | null)[]): string | null {
  const kept = parts.filter((p): p is string => p !== null && p.length > 0)
  return kept.length > 0 ? kept.join(' · ') : null
}

function attemptDetail(payload: Record<string, unknown>): string | null {
  const score = num(payload, 'score')
  const total = num(payload, 'total')
  if (score === null || total === null) return null
  const passed = payload['passed']
  const verdict = typeof passed === 'boolean' ? (passed ? 'passed' : 'failed') : null
  return joinDot([`${score}/${total}`, verdict])
}

/**
 * Turn one n400_growth_events row into a renderable timeline entry.
 *
 * Every branch here corresponds to an event type in @mannaos/n400-growth, and
 * the test iterates ALL_EVENT_TYPES — if the website adds a type and nobody
 * maps it, that test fails rather than the page quietly rendering "undefined".
 */
export function describeEvent(
  type: GrowthEventType,
  payload: Record<string, unknown>,
): TimelineEntry {
  switch (type) {
    case 'account_created':
      return { icon: 'person_add', title: 'Signed up', detail: null }

    case 'onboarding_completed':
      return { icon: 'task_alt', title: 'Completed onboarding', detail: null }

    case 'address_entered':
      return {
        icon: 'home_pin',
        title: 'Entered address',
        detail: joinDot([str(payload, 'city'), str(payload, 'state')])?.replace(' · ', ', ') ?? null,
      }

    // One practice event is one graded question, not one session.
    case 'practice_completed':
      return {
        icon: 'school',
        title: 'Practice question graded',
        detail: attemptDetail(payload),
      }

    case 'mock_completed':
      return {
        icon: 'quiz',
        title: 'Mock test completed',
        detail: attemptDetail(payload),
      }

    case 'prompt_shown':
      return {
        icon: 'help',
        title: `Asked: ${str(payload, 'question_key') ?? 'unknown'}`,
        detail: str(payload, 'surface'),
      }

    case 'prompt_answered':
      return {
        icon: 'check_circle',
        title: `Answered: ${str(payload, 'question_key') ?? 'unknown'}`,
        detail: joinDot([str(payload, 'answer'), str(payload, 'surface')]),
      }

    case 'prompt_skipped':
      return {
        icon: 'cancel',
        title: `Skipped: ${str(payload, 'question_key') ?? 'unknown'}`,
        detail: str(payload, 'surface'),
      }

    case 'cta_shown':
      return {
        icon: 'campaign',
        title: `CTA shown: ${str(payload, 'cta_id') ?? 'unknown'}`,
        detail: str(payload, 'surface'),
      }

    case 'cta_clicked':
      return {
        icon: 'ads_click',
        title: `CTA clicked: ${str(payload, 'cta_id') ?? 'unknown'}`,
        detail: str(payload, 'surface'),
      }

    case 'cta_dismissed':
      return {
        icon: 'do_not_disturb_on',
        title: `CTA dismissed: ${str(payload, 'cta_id') ?? 'unknown'}`,
        detail: str(payload, 'surface'),
      }

    case 'consultation_form_opened':
      return { icon: 'event', title: 'Opened the consultation form', detail: null }

    // Reserved in the taxonomy, not emitted yet. Mapped so the exhaustiveness
    // test passes and so they render sensibly if they ever start firing.
    case 'section_completed':
      return { icon: 'done_all', title: 'Section completed', detail: null }
    case 'readiness_snapshot':
      return { icon: 'insights', title: 'Readiness snapshot', detail: null }
    case 'app_shared':
      return { icon: 'share', title: 'Shared the app', detail: null }
    case 'review_left':
      return { icon: 'star', title: 'Left a review', detail: null }
    case 'friend_invited':
      return { icon: 'group_add', title: 'Invited a friend', detail: null }
    case 'push_disabled':
      return { icon: 'notifications_off', title: 'Disabled push', detail: null }

    default:
      return { icon: 'circle', title: String(type), detail: null }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter internal_app test -- timeline`
Expected: PASS, 9 tests.

> If the `address_entered` case fails, note the `.replace(' · ', ', ')` — addresses read as "Austin, TX", not "Austin · TX". Adjust the helper rather than the expectation.

- [ ] **Step 5: Commit**

```bash
git add apps/internal_app/src/lib/n400/timeline.ts apps/internal_app/__tests__/lib/n400/timeline.test.ts
git commit -m "feat(internal-app): growth event timeline formatter"
```

---

## Task 7: Server actions

**Files:**
- Create: `apps/internal_app/src/lib/n400/leads-shape.ts`
- Create: `apps/internal_app/src/actions/leads.ts`

No test — these are thin I/O wrappers with no branching logic worth pinning, matching how `actions/clients.ts` is (not) tested.

> **Why two files:** a `'use server'` module may only export async functions. Page-size constants and row types therefore cannot live in `actions/leads.ts` — the build fails on them. The website hit exactly this and split `growth-state-shape.ts` out of `growth-state.ts` for the same reason; this mirrors that. Type-only exports would be erased and allowed, but keeping the constants and the types together is clearer than splitting them by what the compiler happens to tolerate.

- [ ] **Step 1: Write the shape module**

`apps/internal_app/src/lib/n400/leads-shape.ts`:

```ts
// Row shapes and tuning constants for the Leads feature. Deliberately NOT in
// actions/leads.ts: that file is 'use server', and every export of a
// 'use server' module must be an async function.

import type { GrowthEventType, JourneyStage, LeadStatus } from '@mannaos/n400-growth'

export const LEADS_PAGE_SIZE = 50
export const TIMELINE_LIMIT = 100

export interface LeadRow {
  user_id: string
  full_name: string | null
  email: string | null
  journey_stage: JourneyStage | null
  interview_date: string | null
  effective_score: number
  effective_status: LeadStatus
  current_streak: number | null
  last_activity_date: string | null
}

export interface LeadDetail extends LeadRow {
  n400_filed: boolean | null
  filing_timeline: string | null
  interview_scheduled: boolean | null
  wants_guidance: string | null
  service_interest: string[]
  lead_score: number
  consultation_requested_at: string | null
  consultation_booked_at: string | null
  first_touch: Record<string, unknown> | null
  last_touch: Record<string, unknown> | null
  created_at: string
}

export interface TimelineRow {
  id: string
  event_type: GrowthEventType
  payload: Record<string, unknown>
  created_at: string
}

export interface WeakSection {
  section: string
  graded_total: number
  correct_pct: number
}

export const LEADS_LIST_COLUMNS =
  'user_id, full_name, email, journey_stage, interview_date, effective_score, effective_status, current_streak, last_activity_date'
```

- [ ] **Step 2: Write the actions**

`apps/internal_app/src/actions/leads.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import {
  LEADS_LIST_COLUMNS,
  LEADS_PAGE_SIZE,
  TIMELINE_LIMIT,
  type LeadDetail,
  type LeadRow,
  type TimelineRow,
  type WeakSection,
} from '@/lib/n400/leads-shape'

/**
 * One page of leads, highest effective score first.
 *
 * role = 'client' is not optional. The account_created trigger fires on every
 * profiles INSERT and the scoring trigger gives everyone an n400_lead_profiles
 * row, so without this filter every staff and admin account appears as a cold
 * lead.
 */
export async function getLeads(params: {
  q?: string
  status?: string
  page?: number
}): Promise<{ leads: LeadRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1)
  const supabase = await createClient()

  let query = supabase
    .from('n400_leads_view')
    .select(LEADS_LIST_COLUMNS, { count: 'exact' })
    .eq('role', 'client')
    .order('effective_score', { ascending: false })
    // Secondary key so paging is stable when scores tie.
    .order('user_id', { ascending: true })

  if (params.status) query = query.eq('effective_status', params.status)
  if (params.q) {
    const term = params.q.replace(/[%,()]/g, '')
    if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
  }

  const from = (page - 1) * LEADS_PAGE_SIZE
  const { data, error, count } = await query.range(from, from + LEADS_PAGE_SIZE - 1)
  // Throw rather than returning []: an RLS-filtered result and a genuinely
  // empty list look identical, and that ambiguity is what makes this feature
  // hard to debug.
  if (error) throw error

  return {
    leads: (data ?? []) as unknown as LeadRow[],
    total: count ?? 0,
    page,
    pageSize: LEADS_PAGE_SIZE,
  }
}

/** One lead, or null when the id does not exist or RLS hides it. */
export async function getLead(userId: string): Promise<LeadDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('n400_leads_view')
    .select('*')
    .eq('role', 'client')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as LeadDetail) ?? null
}

/** Most recent events first, capped. Also returns the true total. */
export async function getLeadTimeline(
  userId: string,
): Promise<{ events: TimelineRow[]; total: number }> {
  const supabase = await createClient()
  const { data, error, count } = await supabase
    .from('n400_growth_events')
    .select('id, event_type, payload, created_at', { count: 'exact' })
    // Explicit user filter — the staff read policy is not a scope filter.
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(TIMELINE_LIMIT)
  if (error) throw error
  return { events: (data ?? []) as unknown as TimelineRow[], total: count ?? 0 }
}

/** Weakest graded section, or null when the lead has no graded attempts. */
export async function getLeadWeakSection(userId: string): Promise<WeakSection | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('n400_weak_section_for', {
    p_user_id: userId,
  })
  if (error) throw error
  const rows = (data ?? []) as WeakSection[]
  return rows[0] ?? null
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter internal_app type-check`
Expected: silent. If it complains that a `'use server'` module exports a non-async value, a constant is still sitting in `actions/leads.ts` — move it to `leads-shape.ts`.

- [ ] **Step 4: Commit**

```bash
git add apps/internal_app/src/lib/n400/leads-shape.ts apps/internal_app/src/actions/leads.ts
git commit -m "feat(internal-app): server actions for the Leads page"
```

---

## Task 8: Status badge, list page, navigation

**Files:**
- Create: `apps/internal_app/src/components/leads/LeadStatusBadge.tsx`
- Create: `apps/internal_app/src/app/(app)/leads/page.tsx`
- Modify: `apps/internal_app/src/app/(app)/layout.tsx` (`NAV_ITEMS`)

- [ ] **Step 1: Write the status badge**

`apps/internal_app/src/components/leads/LeadStatusBadge.tsx`:

```tsx
import type { LeadStatus } from '@mannaos/n400-growth'

const STATUS_STYLES: Record<LeadStatus, string> = {
  cold: 'bg-slate-100 text-slate-600',
  warm: 'bg-amber-50 text-amber-700',
  hot: 'bg-orange-50 text-orange-700',
  sales_ready: 'bg-[rgba(58,175,185,0.1)] text-[#006970]',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  cold: 'Cold',
  warm: 'Warm',
  hot: 'Hot',
  sales_ready: 'Sales Ready',
}

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${
        STATUS_STYLES[status] ?? STATUS_STYLES.cold
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
```

- [ ] **Step 2: Write the list page**

`apps/internal_app/src/app/(app)/leads/page.tsx`:

```tsx
import Link from 'next/link'
import { getLeads } from '@/actions/leads'
import { LEADS_PAGE_SIZE } from '@/lib/n400/leads-shape'
import LeadStatusBadge from '@/components/leads/LeadStatusBadge'

export const dynamic = 'force-dynamic'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'sales_ready', label: 'Sales Ready' },
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
]

function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split('@')[0] || '?'
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page ?? '1') || 1
  const { leads, total } = await getLeads({
    q: params.q,
    status: params.status,
    page,
  })

  const totalPages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE))
  const hasFilters = Boolean(params.q || params.status)

  const linkFor = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    const merged = { q: params.q, status: params.status, ...overrides }
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value)
    }
    const qs = next.toString()
    return qs ? `/leads?${qs}` : '/leads'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Leads</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {total} N400Ready {total === 1 ? 'lead' : 'leads'}, highest score first
        </p>
      </div>

      {/* Search */}
      <form method="GET" className="relative max-w-lg">
        {params.status && <input type="hidden" name="status" value={params.status} />}
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">
          search
        </span>
        <input
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Search by name or email..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-[#bcc9ca]/30 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 shadow-sm placeholder:text-slate-400 transition-all"
          style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
        />
        {params.q && (
          <Link
            href={linkFor({ q: undefined, page: undefined })}
            className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg hover:text-slate-600"
          >
            close
          </Link>
        )}
      </form>

      {/* Status filter */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = (params.status ?? '') === filter.value
          return (
            <Link
              key={filter.label}
              href={linkFor({ status: filter.value || undefined, page: undefined })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? 'text-white'
                  : 'text-slate-600 bg-white border border-[#bcc9ca]/40 hover:bg-[#f1f4f9]'
              }`}
              style={active ? { backgroundColor: '#006970' } : undefined}
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      {/* List */}
      {leads.length === 0 ? (
        <div
          className="bg-white rounded-xl p-16 text-center"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <span className="material-symbols-outlined text-5xl text-slate-200">trending_up</span>
          <p className="mt-4 text-slate-500 font-medium">
            {hasFilters ? 'No leads match these filters' : 'No leads yet'}
          </p>
          {hasFilters && (
            <Link
              href="/leads"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
              style={{ color: '#3AAFB9' }}
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <table className="w-full text-left">
            <thead className="bg-[#f7f9ff]/60 border-b border-[#ebeef3]">
              <tr>
                {['Lead', 'Score', 'Stage', 'Streak', 'Last active', 'Interview'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f4f9]">
              {leads.map((lead) => (
                <tr key={lead.user_id} className="hover:bg-[#f7f9ff]/60 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/leads/${lead.user_id}`} className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: '#3AAFB9' }}
                      >
                        {initialsOf(lead.full_name, lead.email)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {lead.full_name || 'Unnamed'}
                        </p>
                        <p className="text-[11px] text-slate-400">{lead.email ?? '—'}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {lead.effective_score}
                      </span>
                      <LeadStatusBadge status={lead.effective_status} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                    {lead.journey_stage?.replace(/_/g, ' ') ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {lead.current_streak ?? 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(lead.last_activity_date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(lead.interview_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={linkFor({ page: String(page - 1) })}
                className="px-4 py-2 rounded-lg bg-white border border-[#bcc9ca]/40 font-semibold hover:bg-[#f1f4f9]"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={linkFor({ page: String(page + 1) })}
                className="px-4 py-2 rounded-lg bg-white border border-[#bcc9ca]/40 font-semibold hover:bg-[#f1f4f9]"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add the nav item**

In `apps/internal_app/src/app/(app)/layout.tsx`, add one entry to `NAV_ITEMS`, after `Clients`:

```ts
  { href: '/leads', label: 'Leads', icon: 'trending_up' },
```

Change nothing else in that file. `visibleNav` only filters `/jobs`, so staff see Leads — which is the intent. Do **not** add `/leads` to `STAFF_BLOCKED` in `src/middleware.ts`.

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm --filter internal_app type-check && pnpm --filter internal_app lint`
Expected: both silent.

- [ ] **Step 5: Commit**

```bash
git add apps/internal_app/src/components/leads/LeadStatusBadge.tsx "apps/internal_app/src/app/(app)/leads/page.tsx" "apps/internal_app/src/app/(app)/layout.tsx"
git commit -m "feat(internal-app): Leads list page"
```

---

## Task 9: Detail page — timeline and summary panel

**Files:**
- Create: `apps/internal_app/src/components/leads/LeadTimeline.tsx`
- Create: `apps/internal_app/src/components/leads/LeadSummaryPanel.tsx`
- Create: `apps/internal_app/src/app/(app)/leads/[userId]/page.tsx`

- [ ] **Step 1: Write the timeline component**

`apps/internal_app/src/components/leads/LeadTimeline.tsx`:

```tsx
import { describeEvent } from '@/lib/n400/timeline'
import type { TimelineRow } from '@/lib/n400/leads-shape'

function formatStamp(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function LeadTimeline({
  events,
  total,
}: {
  events: TimelineRow[]
  total: number
}) {
  if (events.length === 0) {
    return (
      <div
        className="bg-white rounded-xl p-12 text-center"
        style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
      >
        <span className="material-symbols-outlined text-4xl text-slate-200">history</span>
        <p className="mt-3 text-slate-500 font-medium">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-xl p-6"
      style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
    >
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Activity</h3>
        <span className="text-[11px] text-slate-400">
          {events.length < total
            ? `${events.length} most recent of ${total}`
            : `${total} ${total === 1 ? 'event' : 'events'}`}
        </span>
      </div>

      <ol className="space-y-0">
        {events.map((event, index) => {
          const entry = describeEvent(event.event_type, event.payload ?? {})
          const isLast = index === events.length - 1
          return (
            <li key={event.id} className="flex gap-4">
              {/* Rail */}
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(58,175,185,0.1)' }}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ color: '#006970' }}
                  >
                    {entry.icon}
                  </span>
                </div>
                {!isLast && <div className="w-px flex-1 bg-[#ebeef3] my-1" />}
              </div>

              {/* Body */}
              <div className={isLast ? 'pb-0' : 'pb-6'}>
                <p className="text-sm font-semibold text-slate-800">{entry.title}</p>
                {entry.detail && (
                  <p className="text-[12px] text-slate-500 mt-0.5">{entry.detail}</p>
                )}
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {formatStamp(event.created_at)}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
```

- [ ] **Step 2: Write the summary panel**

`apps/internal_app/src/components/leads/LeadSummaryPanel.tsx`:

```tsx
import LeadStatusBadge from '@/components/leads/LeadStatusBadge'
import type { LeadDetail, WeakSection } from '@/lib/n400/leads-shape'

const SECTION_LABELS: Record<string, string> = {
  whatmean: 'Speaking — What does this mean',
  yesno: 'Speaking — Yes/No questions',
  writing: 'Writing',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-[#f1f4f9] last:border-0">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span className="text-sm text-slate-700 text-right">{value}</span>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-xl p-6"
      style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
    >
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  )
}

function touchLine(touch: Record<string, unknown> | null): string {
  if (!touch) return '—'
  const parts = ['utm_source', 'utm_medium', 'utm_campaign']
    .map((key) => touch[key])
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
  if (parts.length > 0) return parts.join(' / ')
  const referrer = touch['referrer']
  if (typeof referrer === 'string' && referrer.length > 0) return referrer
  const landing = touch['landing_page']
  return typeof landing === 'string' && landing.length > 0 ? landing : 'direct'
}

export default function LeadSummaryPanel({
  lead,
  weakSection,
}: {
  lead: LeadDetail
  weakSection: WeakSection | null
}) {
  return (
    <div className="space-y-4">
      <Card title="Lead">
        <Row
          label="Score"
          value={
            <span className="flex items-center gap-2 justify-end">
              <span className="font-bold text-slate-800">{lead.effective_score}</span>
              <LeadStatusBadge status={lead.effective_status} />
            </span>
          }
        />
        <Row label="Stage" value={lead.journey_stage?.replace(/_/g, ' ') ?? '—'} />
        <Row label="Filed" value={lead.n400_filed === null ? '—' : lead.n400_filed ? 'Yes' : 'Not yet'} />
        <Row label="Timeline" value={lead.filing_timeline ?? '—'} />
        <Row label="Wants guidance" value={lead.wants_guidance ?? '—'} />
        <Row label="Interview" value={formatDate(lead.interview_date)} />
        <Row
          label="Interests"
          value={lead.service_interest?.length ? lead.service_interest.join(', ') : '—'}
        />
      </Card>

      <Card title="Study">
        <Row label="Streak" value={`${lead.current_streak ?? 0} days`} />
        <Row label="Last active" value={formatDate(lead.last_activity_date)} />
        <Row
          label="Weakest area"
          value={
            weakSection
              ? `${SECTION_LABELS[weakSection.section] ?? weakSection.section} · ${weakSection.correct_pct}% of ${weakSection.graded_total}`
              : 'No graded attempts'
          }
        />
      </Card>

      <Card title="Consultation">
        <Row label="Requested" value={formatDate(lead.consultation_requested_at)} />
        <Row label="Booked" value={formatDate(lead.consultation_booked_at)} />
      </Card>

      <Card title="Attribution">
        <Row label="First touch" value={touchLine(lead.first_touch)} />
        <Row label="Last touch" value={touchLine(lead.last_touch)} />
        <Row label="Joined" value={formatDate(lead.created_at)} />
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Write the detail page**

`apps/internal_app/src/app/(app)/leads/[userId]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLead, getLeadTimeline, getLeadWeakSection } from '@/actions/leads'
import LeadTimeline from '@/components/leads/LeadTimeline'
import LeadSummaryPanel from '@/components/leads/LeadSummaryPanel'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  const lead = await getLead(userId)
  // Missing row and RLS-filtered row are the same thing from here.
  if (!lead) notFound()

  const [timeline, weakSection] = await Promise.all([
    getLeadTimeline(userId),
    getLeadWeakSection(userId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Leads
        </Link>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight mt-1">
          {lead.full_name || 'Unnamed lead'}
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">{lead.email ?? '—'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <LeadTimeline events={timeline.events} total={timeline.total} />
        </div>
        <LeadSummaryPanel lead={lead} weakSection={weakSection} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck, lint, and run the whole internal_app test suite**

Run: `pnpm --filter internal_app type-check && pnpm --filter internal_app lint && pnpm --filter internal_app test`
Expected: typecheck passes; the feature introduces no NEW lint problems in the files it touches (verify by grepping the lint output for new file names; pre-existing lint debt is out of scope); the timeline suite plus the six pre-existing suites pass.

- [ ] **Step 5: Verify in the running app with a real staff account**

This step is the point of the whole plan — do not skip it.

```bash
pnpm --filter internal_app dev
```

Then, signed in as a user whose `profiles.role = 'staff'` (not admin):

1. `/leads` renders, and the sidebar shows the Leads item.
2. Rows show a name and an email, not blanks. Blanks mean the `profiles` policy from Task 4 did not apply.
3. No row is a staff or admin account. If one is, the `role = 'client'` filter is missing.
4. Sorting is score-descending; a status filter and a search both narrow the list.
5. Clicking a row opens the detail page with a timeline and the summary panel.
6. The weakest-area row shows either a section or "No graded attempts" — never an error.

If you have no staff account handy, create one by setting `role = 'staff'` on a test profile, and set it back afterwards.

- [ ] **Step 6: Commit**

```bash
git add apps/internal_app/src/components/leads "apps/internal_app/src/app/(app)/leads"
git commit -m "feat(internal-app): Leads detail page with activity timeline"
```

---

## Task 10: Update the roadmap

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Tick the G4 line**

In `docs/ROADMAP.md`, find the line starting `- [ ] **Website Phase 3E — N400 Growth Engine G4 (internal_app Leads)**` and change `- [ ]` to `- [x]`, then rewrite the description to describe what actually shipped — v1 read-only — and name what is deferred:

```markdown
- [x] **Website Phase 3E — N400 Growth Engine G4 v1 (internal_app Leads, read-only)** — Staff-visible Leads page in `apps/internal_app/`: lead list from `n400_leads_view` (score desc, status filter, name/email search, 50/page) and a lead detail page with a newest-first activity timeline rendered from `n400_growth_events` plus a summary panel (stage, score, streak, weakest section, consultation dates, attribution). New `is_staff_or_admin()` helper widens six growth read policies and `profiles` SELECT from admin-only to staff (`n400_29`); `n400_leads_view` now carries `full_name`/`email`/`role`; `n400_weak_section_for(p_user_id)` definer RPC exposes the weakest graded section without opening the quiz tables (`n400_30`). Event taxonomy and payload types extracted to `packages/n400-growth`, consumed by both apps. **Deferred to v2:** consultation inbox, Convert to Client, Sales-Ready email notify. Spec: specs/2026-09-23-n400-growth-g4-leads-design.md
```

- [ ] **Step 2: Update the header**

Change the `**Current Phase:**` line so it no longer says G4 is next, and set `**Last updated:**` to the date you finish.

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark growth engine G4 v1 shipped"
```

---

## Done when

- [ ] A `staff` user (not admin) sees `/leads` populated with names and emails
- [ ] No staff or admin account appears in the list
- [ ] Score sort, status filter, search and pagination all work
- [ ] A lead detail page shows the timeline, the summary panel and the weakest section
- [ ] `pnpm build` and `pnpm type-check` pass at the repo root; the feature introduces no NEW lint problems in the files it touches (pre-existing lint debt is out of scope)
- [ ] internal_app jest and website vitest both pass
- [ ] The website behaves exactly as before — the only change there is `events.ts` becoming a re-export
