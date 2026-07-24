# Growth Ignore → Soft-Skip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach the profiling evaluator to treat an *ignored* question (shown but never answered or skipped) differently from an *explicit skip*, so the growth engine advances to the next eligible question over time instead of re-asking the same question every session — while never permanently retiring a high-value gate question like `filed`.

**Architecture:** `selectActivePrompt` (pure decision logic in `profiling.ts`) currently reads only `answered_at` / `skipped_at` / `snooze_until`. The DB already records `shown_count` + `last_shown_at` (table `n400_profile_prompts`, populated by the `n400_mark_prompt_shown` RPC), but the evaluator ignores them. We wire those two columns through to the evaluator and add an **ignore cooldown**: a question that was shown but not interacted with yields to the next eligible candidate until a revisit window elapses. The window is **tier-aware** — a *gate* question (one that other questions `depends_on`) is re-offered on a short cadence (3 active days) because ignoring it freezes its whole dependent subtree; a *leaf* question waits longer (10 active days OR 30 calendar days). A chronic-ignore backoff stops eager gate re-asks after 4 impressions. Explicit skip keeps full precedence over ignore (checked first). No new prompt is stacked in one rest-moment because `assembleGrowthState` already returns at most one prompt.

**Tech Stack:** TypeScript, Vitest, Next.js (App Router), Supabase (Postgres). Pure-function core; **no migration** (columns and RPC already exist).

---

## File Structure

- `apps/website/src/lib/n400/growth/profiling.ts` — evaluator. Add `shown_count` + `last_shown_at` to `PromptState`; add tier constants, a gate-key helper, and the ignore-cooldown branch inside `selectActivePrompt`.
- `apps/website/src/lib/n400/growth/growth-context.ts` — read layer. Add the two columns to the `n400_profile_prompts` SELECT so the evaluator actually receives them.
- `apps/website/src/lib/n400/growth/profiling.test.ts` — tests. Update the two inline `PromptState` literals for the new required fields; add ignore-cooldown, tier, backoff, calendar, and precedence tests.

No other files change. `n400_mark_prompt_shown` (migration `n400_21` / `n400_22`) already increments `shown_count` and sets `last_shown_at` once per impression (guarded by a `useRef` in `GrowthPromptCard.tsx`, so it is one impression per time the card appears, not per re-render).

---

## Design reference (read before coding)

The five seeded questions (`n400_16_growth_config.sql`) and their dependency shape:

| question_key | depends_on | gate? |
|---|---|---|
| `filed` | — | **gate** (filing_timeline + interview_notice depend on it) |
| `filing_timeline` | `filed=not_yet` | leaf |
| `interview_notice` | `filed=yes` | **gate** (interview_date depends on it) |
| `interview_date` | `interview_notice=yes` | leaf |
| `wants_guidance` | — | leaf |

"Gate" is **derived**, not hardcoded: a question is a gate if any other definition's `depends_on.question_key` equals it. This stays correct if seeds change.

Behavior contract:

| Behavior | Meaning | Engine |
|---|---|---|
| Answer | has data | advance (existing) |
| Skip (explicit `skipped_at`) | "not now" | snooze that question, dashboard soft-card after snooze (existing) |
| Ignore (shown, no interaction) | lost the chance to interact | yield to next candidate this evaluation; re-offer after a tier-aware window; gate re-asked sooner; chronic ignore backs off |

---

## Task 1: Wire `shown_count` + `last_shown_at` through to the evaluator (no behavior change)

**Files:**
- Modify: `apps/website/src/lib/n400/growth/profiling.ts` (the `PromptState` interface, ~lines 40-45)
- Modify: `apps/website/src/lib/n400/growth/growth-context.ts` (the `n400_profile_prompts` SELECT, ~line 55)
- Test: `apps/website/src/lib/n400/growth/profiling.test.ts` (two inline `PromptState` literals, ~lines 124-129 and ~lines 140-145)

- [ ] **Step 1: Add the two fields to `PromptState`**

In `profiling.ts`, replace the `PromptState` interface:

```ts
export interface PromptState {
  question_key: string;
  answered_at: string | null;
  skipped_at: string | null;
  snooze_until: string | null;
  /** Impression counter — incremented once per time the card is shown
      (n400_mark_prompt_shown). Proxy for "how many times ignored". */
  shown_count: number;
  /** ISO timestamp of the most recent impression, or null if never shown. */
  last_shown_at: string | null;
}
```

- [ ] **Step 2: Select the two columns in the read layer**

In `growth-context.ts`, change the `n400_profile_prompts` query:

```ts
    supabase
      .from('n400_profile_prompts')
      .select('question_key, answered_at, skipped_at, snooze_until, shown_count, last_shown_at')
      .eq('user_id', userId),
```

- [ ] **Step 3: Update the two inline `PromptState` literals in the test to satisfy the new required fields**

In `profiling.test.ts`, the `skipped` literal inside `'routes a skipped question off results and onto dashboard only after snooze'`:

```ts
    const skipped: PromptState[] = [{
      question_key: 'filed',
      answered_at: null,
      skipped_at: '2026-07-18T00:00:00Z',
      snooze_until: '2026-07-24T00:00:00Z',
      shown_count: 1,
      last_shown_at: '2026-07-18T00:00:00Z',
    }];
```

And the `skipped` literal inside `'releases a snoozed question early after 3 distinct active days since skip'`:

```ts
    const skipped: PromptState[] = [{
      question_key: 'filed',
      answered_at: null,
      skipped_at: '2026-07-16T00:00:00Z',
      snooze_until: '2026-07-22T00:00:00Z',
      shown_count: 1,
      last_shown_at: '2026-07-16T00:00:00Z',
    }];
```

- [ ] **Step 4: Run the suite to confirm nothing broke**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/profiling.test.ts`
Expected: PASS (all existing tests green; type compiles with the new required fields).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/growth/profiling.ts apps/website/src/lib/n400/growth/growth-context.ts apps/website/src/lib/n400/growth/profiling.test.ts
git commit -m "feat(n400-growth): wire shown_count + last_shown_at into the profiling evaluator"
```

---

## Task 2: Gate-aware ignore cooldown (active-day cadence)

An ignored question yields to the next eligible candidate until enough distinct active study days have passed since it was last shown — 3 for a gate, 10 for a leaf.

**Files:**
- Modify: `apps/website/src/lib/n400/growth/profiling.ts` (add constants + `DAY_MS` + gate-key set + the ignore branch in `selectActivePrompt`)
- Test: `apps/website/src/lib/n400/growth/profiling.test.ts`

- [ ] **Step 1: Write the failing tests**

Add this block at the end of the `describe('selectActivePrompt', ...)` body in `profiling.test.ts` (before its closing `});`). It uses its own minimal definitions to isolate gate vs leaf:

```ts
  describe('ignore cooldown', () => {
    // g is a gate (child depends on it); l is a leaf. Empty trigger => always eligible.
    const gate = def({ question_key: 'g', sort_order: 1, trigger: {} });
    const child = def({
      question_key: 'c', sort_order: 2, trigger: {},
      depends_on: { question_key: 'g', answer: 'yes' },
    });
    const leaf = def({ question_key: 'l', sort_order: 3, trigger: {} });
    const DEFS = [gate, child, leaf];

    const shownState = (key: string, lastShownAt: string, shownCount = 1): PromptState => ({
      question_key: key,
      answered_at: null,
      skipped_at: null,
      snooze_until: null,
      shown_count: shownCount,
      last_shown_at: lastShownAt,
    });

    it('yields an ignored gate to the next candidate before 3 active days', () => {
      // g shown on the 17th; two active days since (18th, 19th) — under the gate window.
      const got = selectActivePrompt(
        inputs({
          definitions: DEFS,
          states: [shownState('g', '2026-07-17T00:00:00Z')],
          gradedDays: [gDay('2026-07-18'), gDay('2026-07-19')],
        }),
        'results',
      );
      // child gated off (g unanswered) -> falls through to the leaf.
      expect(got?.def.question_key).toBe('l');
    });

    it('re-offers an ignored gate after 3 active days', () => {
      const got = selectActivePrompt(
        inputs({
          definitions: DEFS,
          states: [shownState('g', '2026-07-16T00:00:00Z')],
          gradedDays: [gDay('2026-07-17'), gDay('2026-07-18'), gDay('2026-07-19')],
        }),
        'results',
      );
      expect(got?.def.question_key).toBe('g');
      expect(got?.reason).toContain('ignore_revisit_active>=3');
    });

    it('holds an ignored leaf until 10 active days', () => {
      const nineDays = Array.from({ length: 9 }, (_, i) =>
        gDay(`2026-07-${String(10 + i).padStart(2, '0')}`));
      const got = selectActivePrompt(
        inputs({
          definitions: [leaf],
          states: [shownState('l', '2026-07-09T00:00:00Z')],
          gradedDays: nineDays,
          now: new Date('2026-07-19T12:00:00Z'),
        }),
        'results',
      );
      expect(got).toBeNull();
    });

    it('re-offers an ignored leaf after 10 active days', () => {
      const tenDays = Array.from({ length: 10 }, (_, i) =>
        gDay(`2026-07-${String(10 + i).padStart(2, '0')}`));
      const got = selectActivePrompt(
        inputs({
          definitions: [leaf],
          states: [shownState('l', '2026-07-09T00:00:00Z')],
          gradedDays: tenDays,
          now: new Date('2026-07-20T12:00:00Z'),
        }),
        'results',
      );
      expect(got?.def.question_key).toBe('l');
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/profiling.test.ts -t "ignore cooldown"`
Expected: FAIL — the first test returns `g` (evaluator still re-offers immediately) instead of `l`, and the leaf test returns `l` instead of `null`.

- [ ] **Step 3: Add constants and `DAY_MS` near the top of `profiling.ts`**

Insert after the `import { fnv1a } from './flags';` line:

```ts
/** Milliseconds in a day — for calendar-based ignore revisit. */
const DAY_MS = 86_400_000;

/** Ignore-cooldown windows, measured in distinct active study days ("buổi")
 *  since the question was last shown. A gate (a question others depend_on)
 *  is re-offered sooner because ignoring it freezes its whole subtree. */
export const GATE_IGNORE_ACTIVE_DAYS = 3;
export const LEAF_IGNORE_ACTIVE_DAYS = 10;
```

- [ ] **Step 4: Build the gate-key set once, inside `selectActivePrompt`**

In `selectActivePrompt`, right after `candidates.sort((a, b) => a.sort_order - b.sort_order);`, add:

```ts
  // A question is a "gate" if any other definition depends on it.
  const gateKeys = new Set<string>();
  for (const d of definitions) if (d.depends_on) gateKeys.add(d.depends_on.question_key);
```

- [ ] **Step 5: Add the ignore branch to the results surface**

In the `if (surface === 'results') { ... }` block, replace:

```ts
    if (surface === 'results') {
      if (skipped) continue;
    } else {
```

with:

```ts
    if (surface === 'results') {
      if (skipped) continue;
      // Ignored (shown, never answered/skipped): yield to the next candidate
      // until the tier's revisit window elapses. Explicit skip above wins first.
      if (st?.last_shown_at) {
        const lastShownMs = new Date(st.last_shown_at).getTime();
        const activeDaysSinceShown = gradedDays.filter(
          (d) => new Date(d.lastAt).getTime() > lastShownMs,
        ).length;
        const needDays = gateKeys.has(def.question_key)
          ? GATE_IGNORE_ACTIVE_DAYS
          : LEAF_IGNORE_ACTIVE_DAYS;
        if (activeDaysSinceShown < needDays) continue;
        reasons.push(`ignore_revisit_active>=${needDays}`);
      }
    } else {
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/profiling.test.ts -t "ignore cooldown"`
Expected: PASS (all four).

- [ ] **Step 7: Run the full evaluator suite to confirm no regression**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/profiling.test.ts`
Expected: PASS (existing tests still green — none of them set `last_shown_at`, so the branch is inert for them).

- [ ] **Step 8: Commit**

```bash
git add apps/website/src/lib/n400/growth/profiling.ts apps/website/src/lib/n400/growth/profiling.test.ts
git commit -m "feat(n400-growth): tier-aware ignore cooldown for profiling questions"
```

---

## Task 3: Chronic-ignore backoff + calendar-day revisit safety net

Stop eager gate re-asks after 4 impressions (fall back to the leaf cadence), and re-offer any ignored question after 30 calendar days even for an inactive user whose situation may have changed.

**Files:**
- Modify: `apps/website/src/lib/n400/growth/profiling.ts` (constants + the ignore branch from Task 2)
- Test: `apps/website/src/lib/n400/growth/profiling.test.ts`

- [ ] **Step 1: Write the failing tests**

Add inside the `describe('ignore cooldown', ...)` block, after the last test:

```ts
    it('backs a chronically-ignored gate off to the leaf cadence after 4 impressions', () => {
      // 3 active days would satisfy the gate window, but shown_count=4 forces
      // the longer leaf window, so g stays suppressed and the leaf wins.
      const got = selectActivePrompt(
        inputs({
          definitions: DEFS,
          states: [shownState('g', '2026-07-16T00:00:00Z', 4)],
          gradedDays: [gDay('2026-07-17'), gDay('2026-07-18'), gDay('2026-07-19')],
        }),
        'results',
      );
      expect(got?.def.question_key).toBe('l');
    });

    it('re-offers an ignored question after 30 calendar days even with no active days', () => {
      const got = selectActivePrompt(
        inputs({
          definitions: [leaf],
          states: [shownState('l', '2026-06-01T00:00:00Z')],
          gradedDays: [], // user was inactive the whole time
          now: new Date('2026-07-02T12:00:00Z'), // 31 days later
        }),
        'results',
      );
      expect(got?.def.question_key).toBe('l');
      expect(got?.reason).toContain('ignore_revisit_calendar');
    });

    it('does not re-offer before 30 calendar days when inactive', () => {
      const got = selectActivePrompt(
        inputs({
          definitions: [leaf],
          states: [shownState('l', '2026-06-01T00:00:00Z')],
          gradedDays: [],
          now: new Date('2026-06-20T12:00:00Z'), // 19 days later
        }),
        'results',
      );
      expect(got).toBeNull();
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/profiling.test.ts -t "ignore cooldown"`
Expected: FAIL — chronic test returns `g` (window still 3), calendar test returns `null` (no calendar path yet).

- [ ] **Step 3: Add the new constants**

In `profiling.ts`, extend the ignore-window constants block:

```ts
export const GATE_IGNORE_ACTIVE_DAYS = 3;
export const LEAF_IGNORE_ACTIVE_DAYS = 10;
/** After this many impressions a gate stops being eager and uses the leaf
 *  cadence, so a chronic ignorer is not asked forever on the short window. */
export const CHRONIC_IGNORE_LIMIT = 4;
/** Absolute revisit ceiling: an inactive user is re-asked after this many
 *  calendar days regardless of active-day count — the situation may have moved. */
export const LEAF_IGNORE_CALENDAR_DAYS = 30;
```

- [ ] **Step 4: Replace the ignore branch with the chronic + calendar version**

In `selectActivePrompt`, replace the ignore block added in Task 2 with:

```ts
      // Ignored (shown, never answered/skipped): yield to the next candidate
      // until the tier's revisit window elapses. Explicit skip above wins first.
      if (st?.last_shown_at) {
        const lastShownMs = new Date(st.last_shown_at).getTime();
        const activeDaysSinceShown = gradedDays.filter(
          (d) => new Date(d.lastAt).getTime() > lastShownMs,
        ).length;
        const chronic = (st.shown_count ?? 0) >= CHRONIC_IGNORE_LIMIT;
        const needDays = gateKeys.has(def.question_key) && !chronic
          ? GATE_IGNORE_ACTIVE_DAYS
          : LEAF_IGNORE_ACTIVE_DAYS;
        const activeReached = activeDaysSinceShown >= needDays;
        const calendarReached =
          (now.getTime() - lastShownMs) / DAY_MS >= LEAF_IGNORE_CALENDAR_DAYS;
        if (!activeReached && !calendarReached) continue;
        reasons.push(activeReached ? `ignore_revisit_active>=${needDays}` : 'ignore_revisit_calendar');
      }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/profiling.test.ts -t "ignore cooldown"`
Expected: PASS (all seven ignore-cooldown tests).

- [ ] **Step 6: Commit**

```bash
git add apps/website/src/lib/n400/growth/profiling.ts apps/website/src/lib/n400/growth/profiling.test.ts
git commit -m "feat(n400-growth): chronic-ignore backoff + 30-day calendar revisit"
```

---

## Task 4: Precedence regression — explicit skip overrides ignore

Prove that once a question is explicitly skipped, skip semantics (snooze → dashboard) win and the ignore fields never divert it. This is a regression guard on branch ordering, not new logic.

**Files:**
- Test: `apps/website/src/lib/n400/growth/profiling.test.ts`

- [ ] **Step 1: Write the test**

Add inside `describe('ignore cooldown', ...)`, after the last test:

```ts
    it('lets an explicit skip take precedence over ignore state', () => {
      // Question was shown twice AND then explicitly skipped. On results it must
      // be suppressed by the skip (not surface via the ignore path); on
      // dashboard it returns only after the skip snooze, per existing rules.
      const state: PromptState[] = [{
        question_key: 'g',
        answered_at: null,
        skipped_at: '2026-07-16T00:00:00Z',
        snooze_until: '2026-07-22T00:00:00Z',
        shown_count: 2,
        last_shown_at: '2026-07-16T00:00:00Z',
      }];
      const base = inputs({
        definitions: [gate, child, leaf],
        states: state,
        gradedDays: [gDay('2026-07-17'), gDay('2026-07-18'), gDay('2026-07-19')],
      });
      // Results: g is skipped -> not g; child gated off -> leaf.
      expect(selectActivePrompt(base, 'results')?.def.question_key).toBe('l');
      // Dashboard: released early after 3 active days since skip (existing rule).
      expect(selectActivePrompt(base, 'dashboard')?.def.question_key).toBe('g');
    });
```

- [ ] **Step 2: Run the test to verify it passes immediately**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/profiling.test.ts -t "explicit skip take precedence"`
Expected: PASS (the `if (skipped) continue;` on results already runs before the ignore branch; the dashboard early-release rule already exists).

- [ ] **Step 3: Run the full growth test folder to confirm the whole engine is green**

Run: `cd apps/website && npx vitest run src/lib/n400/growth`
Expected: PASS (every growth test, including `growth-state`, `learning-signals`, `profiling`).

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/lib/n400/growth/profiling.test.ts
git commit -m "test(n400-growth): explicit skip precedence over ignore state"
```

---

## Task 5: Typecheck + roadmap note

**Files:**
- Modify: `docs/ROADMAP.md` (only if it has a matching checkbox for this growth work)

- [ ] **Step 1: Typecheck the app**

Run: `cd apps/website && npx tsc --noEmit`
Expected: no errors (the new required `PromptState` fields are satisfied everywhere — the only literals are in tests and the `as PromptState[]` cast in `growth-context.ts`).

- [ ] **Step 2: Update the roadmap if applicable**

Open `docs/ROADMAP.md`. If there is an unchecked item covering the growth/profiling ignore behavior, change its `[ ]` to `[x]`. If no such item exists, skip this step (do not invent one).

- [ ] **Step 3: Commit (only if the roadmap changed)**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark growth ignore soft-skip milestone done"
```

---

## Self-Review Notes

- **Spec coverage:** Answer/advance (existing, untouched) ✓; explicit Skip snooze (existing, guarded by Task 4) ✓; Ignore yields to next candidate (Task 2) ✓; gate re-asked sooner than leaf (Task 2) ✓; high-value gate never permanently retired — re-asked on the 3-active-day cadence and, for inactive users, after 30 calendar days (Tasks 2–3) ✓; chronic-ignore backoff (Task 3) ✓; one ask per rest-moment (already structural via `assembleGrowthState`, noted in Architecture — no code needed) ✓.
- **No migration:** `shown_count` / `last_shown_at` already exist (`n400_15`) and are populated by `n400_mark_prompt_shown` (`n400_21`/`n400_22`). Only the SELECT in `growth-context.ts` needed the columns added.
- **Type consistency:** `PromptState.shown_count: number`, `PromptState.last_shown_at: string | null`; constants `GATE_IGNORE_ACTIVE_DAYS`, `LEAF_IGNORE_ACTIVE_DAYS`, `CHRONIC_IGNORE_LIMIT`, `LEAF_IGNORE_CALENDAR_DAYS`; reason strings `ignore_revisit_active>=N` / `ignore_revisit_calendar` — all referenced identically across tasks.
- **Dashboard untouched:** the ignore branch lives only in the `results` arm; ignored-but-never-skipped questions do not leak onto the dashboard surface (which still requires `skipped`).
