# N400 RLS Hardening (R3 server-graded Civics mocks + R2 RLS performance) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Civics mock result — Thi thử Civics and the Civics part of Phỏng vấn đầy đủ — is graded and written by the server; learners can no longer write mock results or verdicts into the database; the Reset button really wipes progress; and every `n400_*` RLS policy is rewritten so auth checks run once per query, without changing who can read or write what.

**Architecture:**
- **One answer-key builder,** `civics-mock-slides.ts`, is shared by both mock pages and by `startMockAttempt`. `startMockAttempt` now inserts the attempt with the service role.
- **Phỏng vấn đầy đủ:**
  - registers its Civics attempt at Bắt đầu;
  - finalizes it through the existing standalone finalize actions (`kind: 'full'` only switches the CAPI pass event off);
  - a small save state machine retries once when the summary opens.
- **Three migrations, in this order:**
  1. `n400_36`: the wipe-all Reset RPC, applied before the code deploy;
  2. `n400_37`: the write lockdown, applied after the deploy;
  3. `n400_38`: the policy rewrite and foreign-key indexes, applied after `n400_37`.
- **Every database change is proven on prod first,** in a `DO` block that rolls itself back.

**Tech Stack:**
- Next.js 16: client components plus the existing server actions (read `apps/website/AGENTS.md` before touching Next APIs).
- TypeScript.
- Supabase Postgres: RLS, SECURITY DEFINER plpgsql.
- vitest in node: page wiring is pinned by source-reading tests; there are no DOM tests.
- Supabase MCP: `mcp__supabase__execute_sql`, `mcp__supabase__apply_migration`, `mcp__supabase__get_advisors`.

**Spec:** `docs/superpowers/specs/2026-10-08-n400-rls-hardening-design.md`, approved by the owner 2026-10-08. §2.2 was revised while writing this plan: `stateCode` is not checked against `STATES_BY_CODE`.

**Dry run (2026-10-08):** the file and code steps of Tasks 1–8, 10 and 11 were applied from this plan's text in a scratch worktree. A script took every code block from the plan and stopped if an anchor named by the plan was missing or not unique; none was.
- **Results:**
  - the 12 new or changed test files pass (95 tests);
  - full suite: 1418 pass, the only failure being the pre-existing `mobile-layout.test.ts`;
  - type-check: 0 errors;
  - eslint: 0 errors and 0 warnings on the 23 changed source files.
- **Found by the dry run:** one more wiring test had to change (`spoken-exam-wiring.test.ts:103`); it is now Task 7 Step 10.
- **Not covered:**
  - `npm run build`: Turbopack rejects a symlinked `node_modules`, so Task 9 runs the first build;
  - the database steps: each runs RED then GREEN on prod during execution, in blocks that roll themselves back.

## Global Constraints

- **Scope:** `apps/website/` and `docs/` only. Never touch `apps/internal_app/`, the `profiles` table, `is_ultimate_admin` or `rls_auto_enable`.
- **Commands** run from `apps/website/` unless a step says otherwise:
  - tests: `npx vitest run <path>`;
  - types: `npx tsc --noEmit -p .`;
  - lint: `npx eslint <files>`;
  - build: `npm run build`.
- **Known pre-existing failure:** `src/components/n400/mobile-layout.test.ts` reads the Tiến độ page source. Report it by name in every full-suite run; do not fix it here.
- **`react-hooks/set-state-in-effect` is an ESLint error.** Set state only in event handlers and callbacks. This plan adds no `useEffect`.
- **No DOM tests** (jsdom is a phantom dependency). Pin page wiring with source-reading tests; the pattern is `src/components/n400/navigation-ia.test.ts`.
- **Migrations** live in `apps/website/supabase/migrations/`. Apply each with `mcp__supabase__apply_migration`: `name` = the file name without `.sql`; `query` = the file's full text.
- **Every new SECURITY DEFINER function** ends with `REVOKE EXECUTE … FROM PUBLIC, anon`. Supabase grants anon EXECUTE directly, so revoking from PUBLIC alone is not enough.
- **Every policy that calls `is_admin()` or `is_staff_or_admin()` is `TO authenticated`.** anon has no EXECUTE on these helpers, so an anon evaluation would fail with 42501.
- **Fixed order:**
  1. Task 1 (`n400_36`);
  2. Tasks 2–8 (code);
  3. Task 9 (deploy gate);
  4. Task 10 (`n400_37`);
  5. Task 11 (`n400_38`).

  **Never apply `n400_37` before the R3a code is live in production.**
- **Copy, verbatim:**
  - VI `Chưa lưu được kết quả phần Civics, nên kết quả này sẽ không có trong lịch sử.`
  - EN `Your Civics result couldn't be saved, so it won't appear in your history.`
- **CAPI** `n400_mock_test_pass` fires only for `kind === 'civics'`.
- **Same seed → same questions and same correct options as before.** The golden keys in Task 2 pin this.
- **Prod verification:** one `DO` block that ends in `RAISE EXCEPTION` carrying the results, so nothing persists. After every real apply, confirm no residue.
- **Commits:** one logical change per commit, English messages, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Branch:** `feat/n400-rls-hardening`, in the root folder `/Users/anhnguyen/Obsidian/Business planning`.

## Review Focus

1. **The background start fails** (for example, offline at Bắt đầu). The Civics save retries the start once; if everything fails, the summary shows the unsaved note. Never a blank screen, never a throw during render. → Task 5 (save machine tests) and Task 7 (wiring: the start retry inside `save`).
2. **The learner restarts while a Civics save is in flight** (Trộn lại, Thi lại, exit). A save that finishes late must not overwrite the new run. → Task 7 (wiring: the `runToken` guard).
3. **A voice run mixes answer types:** spoken, typed fallback, multiple choice for questions without an oral config, and an item with neither. The submission keeps each kind and drops only the empty item. → Task 5.
4. **The summary opens before the save settles.** Wait for it; retry once only if it failed; never retry twice. → Task 5.
5. **A profile state code outside `STATES_BY_CODE`.** The server accepts it and builds the same key the client built. → Task 2 (unknown-state slides) and Task 3 (parsing keeps it).

## File Map

| File | Change | Responsibility |
|---|---|---|
| `supabase/migrations/n400_36_reset_my_progress.sql` | create | Wipe-all Reset RPC |
| `supabase/migrations/n400_37_civics_mock_lockdown.sql` | create | Owner write lockdown + finalize mode check + retire RPCs |
| `supabase/migrations/n400_38_rls_perf.sql` | create | Policy rewrite + FK indexes |
| `src/lib/n400/civics-mock-slides.ts` | create | Shared Civics mock questions/options + answer key |
| `src/lib/n400/civics-mock-input.ts` | create | Server-side parsing of mock action input |
| `src/lib/n400/full-civics-submit.ts` | create | Full interview Civics submission, server verdicts, save state machine |
| `src/app/n400ready/(app)/mock-test/civics/actions.ts` | modify | Service-role start, `kind`, CAPI gate |
| `src/app/n400ready/(app)/mock-test/civics/page.tsx` | modify | Uses the shared builder, `kind: 'civics'` |
| `src/lib/n400/full-interview.ts` | modify | `buildCivicsPhase` uses the shared builder |
| `src/app/n400ready/(app)/mock-test/full/page.tsx` | modify | Server-graded Civics part |
| `src/app/n400ready/(app)/mock-test/full/MockTestResult.tsx` | modify | Unsaved note |
| `src/lib/n400/i18n/vi.ts`, `en.ts` | modify | `mockTest.summary.civicsUnsaved` |
| `src/lib/n400/user-state.tsx` | modify | `noteMockResult`, Reset via RPC, no browser mock writes |
| `src/lib/n400/attempt-row.ts` (+ test) | modify | Drop the client mock row builders |
| `src/components/n400/navigation-ia.test.ts` | modify | Full interview records via `noteMockResult` |
| `docs/ROADMAP.md` | modify | RLS hardening entry |
| tests | create | `reset-progress-migration`, `civics-mock-slides`, `civics-mock-input`, `actions-wiring`, `full-civics-submit`, `user-state-wiring`, `civics-save-wiring`, `civics-mock-lockdown-migration`, `rls-perf-migration` |

---

### Task 1: `n400_36` — wipe-all Reset RPC

**Files:**
- Create: `apps/website/supabase/migrations/n400_36_reset_my_progress.sql`
- Test: `apps/website/src/lib/n400/reset-progress-migration.test.ts`

**Interfaces:**
- Produces: SQL function `public.n400_reset_my_progress() RETURNS void` (SECURITY DEFINER; `authenticated` may call it, `anon` may not). Task 6 calls it with `supabase.rpc('n400_reset_my_progress')`.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §3.1. The migration runs on the shared Supabase project;
// this pins what it does.
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/n400_36_reset_my_progress.sql'), 'utf8');

describe('n400_36_reset_my_progress', () => {
  it('is a SECURITY DEFINER function of the caller only', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.n400_reset_my_progress()');
    expect(sql).toContain('SECURITY DEFINER SET search_path = public');
    expect(sql).toContain("IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;");
  });

  it('wipes every progress table of the caller and keeps badges and growth history', () => {
    for (const t of ['n400_quiz_attempts', 'n400_section_attempts', 'n400_section_mock_results', 'n400_bookmarks']) {
      expect(sql).toMatch(new RegExp(`DELETE FROM ${t}\\s+WHERE user_id = v_user;`));
    }
    expect(sql).not.toMatch(/DELETE FROM n400_(user_badges|growth_events|lead_profiles|consultation_requests|profile_prompts|user_profile)/);
    expect(sql).toContain('SET current_streak = 0, longest_streak = 0, last_activity_date = NULL, updated_at = now()');
    expect(sql).toContain('PERFORM recompute_n400_lead_score(v_user);');
  });

  it('anon cannot call it; signed-in users can', () => {
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.n400_reset_my_progress() FROM PUBLIC, anon;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.n400_reset_my_progress() TO authenticated;');
  });
});
```

- [ ] **Step 2: Create the migration with its header only, run the test, see it fail**

Create `apps/website/supabase/migrations/n400_36_reset_my_progress.sql`:

```sql
-- Wipe the caller's own study progress in one server-side call (RLS hardening
-- spec §3.1). The Reset button on Tài khoản deleted table by table from the
-- browser, but n400_quiz_attempts has no owner DELETE policy, so the Civics
-- history silently survived every reset. An owner DELETE policy would let a
-- learner drop single failed mocks (lead score, "latest mock" readiness); this
-- function only ever deletes everything at once.
--
-- Kept on purpose: earned badges (trigger_attempt_id goes NULL by FK), growth
-- events (staff history), the lead profile (recomputed below), consultation
-- requests, profiling prompts, and the rest of n400_user_profile (address,
-- settings).
```

Run: `npx vitest run src/lib/n400/reset-progress-migration.test.ts`
Expected: FAIL. The 3 tests fail on `toContain` / `toMatch`.

- [ ] **Step 3: Append the SQL**

Append to the same file:

```sql

CREATE OR REPLACE FUNCTION public.n400_reset_my_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  DELETE FROM n400_quiz_attempts        WHERE user_id = v_user;  -- question rows cascade
  DELETE FROM n400_section_attempts     WHERE user_id = v_user;
  DELETE FROM n400_section_mock_results WHERE user_id = v_user;
  DELETE FROM n400_bookmarks            WHERE user_id = v_user;
  UPDATE n400_user_profile
     SET current_streak = 0, longest_streak = 0, last_activity_date = NULL, updated_at = now()
   WHERE user_id = v_user;
  PERFORM recompute_n400_lead_score(v_user);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.n400_reset_my_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.n400_reset_my_progress() TO authenticated;
```

- [ ] **Step 4: Run the test, see it pass**

Run: `npx vitest run src/lib/n400/reset-progress-migration.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Prove it on prod in a self-rolling-back block**

Run with `mcp__supabase__execute_sql`. The block ends in `RAISE EXCEPTION`, so the whole transaction rolls back:

```sql
do $pre$
declare
  v_uid uuid := (select a.user_id from n400_quiz_attempts a join profiles p on p.id = a.user_id
                 where p.role = 'client' group by a.user_id order by count(*) desc limit 1);
  v_badges int;
  r_before text; r_after text; r_anon text; r_streak text; r_badges text;
begin
  CREATE OR REPLACE FUNCTION public.n400_reset_my_progress()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public
  AS $$
  DECLARE
    v_user uuid := auth.uid();
  BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
    DELETE FROM n400_quiz_attempts        WHERE user_id = v_user;
    DELETE FROM n400_section_attempts     WHERE user_id = v_user;
    DELETE FROM n400_section_mock_results WHERE user_id = v_user;
    DELETE FROM n400_bookmarks            WHERE user_id = v_user;
    UPDATE n400_user_profile
       SET current_streak = 0, longest_streak = 0, last_activity_date = NULL, updated_at = now()
     WHERE user_id = v_user;
    PERFORM recompute_n400_lead_score(v_user);
  END;
  $$;
  REVOKE EXECUTE ON FUNCTION public.n400_reset_my_progress() FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.n400_reset_my_progress() TO authenticated;

  -- give every table something to wipe
  insert into n400_bookmarks (user_id, question_id) values (v_uid, 1) on conflict do nothing;
  insert into n400_section_mock_results (user_id, section, passed, score, total) values (v_uid, 'speaking', true, 8, 10);
  insert into n400_user_profile (user_id, current_streak, longest_streak, last_activity_date)
  values (v_uid, 3, 5, current_date)
  on conflict (user_id) do update set current_streak = 3, longest_streak = 5, last_activity_date = current_date;
  select count(*) into v_badges from n400_user_badges where user_id = v_uid;
  r_before := format('quiz=%s answers=%s section=%s mocks=%s bookmarks=%s',
    (select count(*) from n400_quiz_attempts where user_id = v_uid),
    (select count(*) from n400_question_attempts qa join n400_quiz_attempts a on a.id = qa.attempt_id where a.user_id = v_uid),
    (select count(*) from n400_section_attempts where user_id = v_uid),
    (select count(*) from n400_section_mock_results where user_id = v_uid),
    (select count(*) from n400_bookmarks where user_id = v_uid));

  perform set_config('role', 'anon', true);
  begin
    perform public.n400_reset_my_progress();
    r_anon := 'CALLABLE';
  exception when insufficient_privilege then r_anon := 'denied';
  end;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  perform public.n400_reset_my_progress();
  perform set_config('role', 'postgres', true);

  r_after := format('quiz=%s answers=%s section=%s mocks=%s bookmarks=%s',
    (select count(*) from n400_quiz_attempts where user_id = v_uid),
    (select count(*) from n400_question_attempts qa join n400_quiz_attempts a on a.id = qa.attempt_id where a.user_id = v_uid),
    (select count(*) from n400_section_attempts where user_id = v_uid),
    (select count(*) from n400_section_mock_results where user_id = v_uid),
    (select count(*) from n400_bookmarks where user_id = v_uid));
  select format('%s/%s/%s', current_streak, longest_streak, coalesce(last_activity_date::text, 'null'))
    into r_streak from n400_user_profile where user_id = v_uid;
  r_badges := format('%s->%s', v_badges, (select count(*) from n400_user_badges where user_id = v_uid));
  raise exception 'PREFLIGHT before[%] after[%] streak=% badges=% anon=%', r_before, r_after, r_streak, r_badges, r_anon;
end $pre$;
```

Expected error text: `PREFLIGHT before[quiz=N answers=M section=K mocks=J bookmarks=B] after[quiz=0 answers=0 section=0 mocks=0 bookmarks=0] streak=0/0/null badges=X->X anon=denied`, where N, J, B ≥ 1 and the badge count is unchanged.

If anything else appears, STOP and fix the migration before applying.

- [ ] **Step 6: Apply the migration**

Call `mcp__supabase__apply_migration` with `name: n400_36_reset_my_progress` and `query`: the full text of the file.
Expected: `{"success":true}`.

- [ ] **Step 7: Post-check**

Run with `mcp__supabase__execute_sql`:

```sql
select has_function_privilege('anon', 'public.n400_reset_my_progress()', 'EXECUTE') as anon_can,
       has_function_privilege('authenticated', 'public.n400_reset_my_progress()', 'EXECUTE') as auth_can,
       (select max(name) from supabase_migrations.schema_migrations where name like 'n400_36%') as recorded;
```

Expected: `anon_can=false`, `auth_can=true`, `recorded=n400_36_reset_my_progress`.

Re-run the Step 5 block unchanged. Expected: the same `PREFLIGHT …` text. The DDL inside it is idempotent, and the block still rolls back.

Rollback, only if ever needed and only while no deployed code calls the RPC: `DROP FUNCTION IF EXISTS public.n400_reset_my_progress();`

- [ ] **Step 8: Commit**

```bash
git add apps/website/supabase/migrations/n400_36_reset_my_progress.sql apps/website/src/lib/n400/reset-progress-migration.test.ts
git commit -m "feat(n400app): n400_36 — wipe-all Reset RPC (Civics history survived Reset)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared Civics mock answer-key builder

**Files:**
- Create: `apps/website/src/lib/n400/civics-mock-slides.ts`
- Test: `apps/website/src/lib/n400/civics-mock-slides.test.ts`
- Modify: `apps/website/src/lib/n400/full-interview.ts`, function `buildCivicsPhase` and the quiz-engine import
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx`, function `startNew` and the quiz-engine import

**Interfaces:**
- Produces:
  - `type CivicsMockKind = 'civics' | 'full'`
  - `interface CivicsMockSlide { question: N400Question; options: QuizOption[] }`
  - `interface CivicsMockKeyItem { qid: number; correct: QuizOption['id'] }`
  - `civicsMockSlides(kind, seed: string, stateCode: StateCode, districtNumber: number | null): CivicsMockSlide[]`
  - `civicsMockAnswerKey(slides: readonly CivicsMockSlide[]): CivicsMockKeyItem[]`

- [ ] **Step 1: Write the failing test**

The golden keys below were captured on 2026-10-08 from the pre-refactor builders: `civics/page.tsx` `startNew` for `'civics'`, `buildCivicsPhase` for `'full'`. Each entry is `${qid}${correct option id}`.

```ts
import { describe, expect, it } from 'vitest';
import { civicsMockAnswerKey, civicsMockSlides, type CivicsMockKind } from './civics-mock-slides';
import type { StateCode } from './state-data';

// Golden answer keys captured on 2026-10-08 from the pre-refactor builders
// (civics/page.tsx startNew for 'civics', buildCivicsPhase for 'full'):
// `${qid}${correct option id}` per slide, in order. Same seed → same questions
// and the same correct option as before (RLS hardening spec §2.1).
const GOLDEN: { kind: CivicsMockKind; seed: string; state: StateCode; district: number | null; key: string[] }[] = [
  {
    kind: 'civics', seed: 'golden-1', state: 'TX', district: null,
    key: ['55D', '42B', '57B', '53B', '47A', '49B', '3D', '59D', '87B', '56D', '128A', '111D', '46C', '78D', '100C', '17B', '83B', '8A', '15A', '16C'],
  },
  {
    kind: 'civics', seed: 'golden-2', state: 'CA', district: 12,
    key: ['73A', '76B', '33B', '90A', '69A', '86A', '111B', '7B', '71D', '46A', '105A', '39C', '16A', '54D', '70D', '37D', '22C', '77C', '59C', '80B'],
  },
  {
    kind: 'civics', seed: 'golden-q29-2', state: 'TX', district: null,
    key: ['114C', '11D', '25A', '59D', '78C', '76C', '61D', '45B', '49C', '69A', '115D', '44B', '9C', '81B', '80C', '43C', '22B', '38D', '88D'],
  },
  {
    kind: 'full', seed: 'full-101', state: 'TX', district: null,
    key: ['68D', '34A', '57A', '121B', '26B', '86C', '23C', '89D', '113B', '93C', '29D', '90D', '65C', '75C', '95C', '94A', '55D', '16C', '27A', '74C'],
  },
  {
    kind: 'full', seed: 'full-202', state: 'CA', district: 12,
    key: ['128D', '60B', '63D', '109D', '51C', '103B', '87B', '12D', '90C', '17B', '108B', '9C', '45B', '126C', '79B', '27C', '48B', '36A', '65C', '95C'],
  },
  {
    kind: 'full', seed: 'full-1', state: 'TX', district: null,
    key: ['86C', '36C', '56C', '65C', '29C', '99C', '57B', '28B', '7D', '3D', '69B', '2B', '67D', '80D', '100B', '87C', '116C', '42B', '6D', '122B'],
  },
];

function flatKey(kind: CivicsMockKind, seed: string, state: StateCode, district: number | null): string[] {
  return civicsMockAnswerKey(civicsMockSlides(kind, seed, state, district)).map((k) => `${k.qid}${k.correct}`);
}

describe('civicsMockSlides + civicsMockAnswerKey (RLS hardening spec §2.1)', () => {
  it.each(GOLDEN)('$kind $seed $state/$district keeps the pre-refactor answer key', ({ kind, seed, state, district, key }) => {
    expect(flatKey(kind, seed, state, district)).toEqual(key);
  });

  it("'civics' drops Q29 without a district; 'full' keeps it", () => {
    expect(flatKey('civics', 'golden-q29-2', 'TX', null).some((k) => k.startsWith('29'))).toBe(false);
    expect(flatKey('full', 'full-1', 'TX', null)).toContain('29C');
  });

  it('builds four options with exactly one correct even for a state code outside the list', () => {
    for (const kind of ['civics', 'full'] as const) {
      for (const s of civicsMockSlides(kind, 'odd-state', 'ZZ' as StateCode, null)) {
        expect(s.options).toHaveLength(4);
        expect(s.options.filter((o) => o.isCorrect)).toHaveLength(1);
      }
    }
  });

  it('the answer key holds only question ids and option ids', () => {
    const [first] = civicsMockAnswerKey(civicsMockSlides('full', 'full-101', 'TX', null));
    expect(Object.keys(first).sort()).toEqual(['correct', 'qid']);
  });
});
```

- [ ] **Step 2: Run it, see it fail**

Run: `npx vitest run src/lib/n400/civics-mock-slides.test.ts`
Expected: FAIL, `Failed to resolve import "./civics-mock-slides"`.

- [ ] **Step 3: Implement the builder**

Create `apps/website/src/lib/n400/civics-mock-slides.ts`:

```ts
// One builder for every Civics mock's questions and answer key (RLS hardening
// spec §2.1). The client renders the slides and startMockAttempt stores the key,
// so both sides always agree on what the learner was dealt.

import { buildOptions, selectMockTestQuestions, type QuizOption } from './quiz-engine';
import type { N400Question } from './questions-data';
import type { StateCode } from './state-data';

/** 'civics' = Thi thử Civics; 'full' = the Civics part of Phỏng vấn đầy đủ. */
export type CivicsMockKind = 'civics' | 'full';

export interface CivicsMockSlide {
  question: N400Question;
  options: QuizOption[];
}

export interface CivicsMockKeyItem {
  qid: number;
  correct: QuizOption['id'];
}

/** The option seeds are the ones each mock used before this module existed, so a
 *  seed deals exactly the questions and options it always did. 'civics' skips Q29
 *  (your Representative) when the district is unknown; 'full' keeps it and then
 *  accepts any Representative of the state. */
export function civicsMockSlides(
  kind: CivicsMockKind,
  seed: string,
  stateCode: StateCode,
  districtNumber: number | null,
): CivicsMockSlide[] {
  const questions = selectMockTestQuestions(seed);
  if (kind === 'full') {
    return questions.map((question, i) => ({
      question,
      options: buildOptions(question, stateCode, `full-${seed}-${i}`, districtNumber),
    }));
  }
  return questions
    .filter((q) => q.id !== 29 || districtNumber !== null)
    .map((question) => ({
      question,
      options: buildOptions(question, stateCode, `mock-${seed}-${question.id}`, districtNumber),
    }));
}

export function civicsMockAnswerKey(slides: readonly CivicsMockSlide[]): CivicsMockKeyItem[] {
  return slides.map(({ question, options }) => {
    const correct = options.find((o) => o.isCorrect);
    // buildOptions always shuffles the correct answer in; guard anyway.
    if (!correct) throw new Error(`quiz-engine: no correct option built for q${question.id}`);
    return { qid: question.id, correct: correct.id };
  });
}
```

- [ ] **Step 4: Run it, see it pass**

Run: `npx vitest run src/lib/n400/civics-mock-slides.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Use it in `buildCivicsPhase`**

In `apps/website/src/lib/n400/full-interview.ts`:

1. Remove `buildOptions,` and `selectMockTestQuestions,` from the `./quiz-engine` import. `correctAnswersFor`, `shuffle` and the audio helpers stay.
2. Add `import { civicsMockSlides } from './civics-mock-slides';` below it.
3. Replace the body of `buildCivicsPhase` with:

```ts
export function buildCivicsPhase(
  seed: string,
  stateCode: StateCode,
  districtNumber: number | null,
  dict: N400Dict,
): MCQuestion[] {
  return civicsMockSlides('full', seed, stateCode, districtNumber).map(({ question: q, options }) => {
    const located = correctAnswersFor(q, stateCode, districtNumber);
    const accepted =
      located.length > 0 ? located : q.answersEn.map((en, j) => ({ en, vi: q.answersVi[j] ?? en }));
    return {
      itemId: `civ-${q.id}`,
      badge: tFormat(dict.mockTest.badges.civics, { id: q.id }),
      headerEn: q.questionEn,
      headerVi: q.questionVi,
      questionAudioSrc: questionAudioUrl(q.id),
      answerAudioSrc: null,
      options,
      accepted,
    };
  });
}
```

- [ ] **Step 6: Use it in the standalone mock's `startNew`**

In `apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx`:

1. Remove `buildOptions,` and `selectMockTestQuestions,` from the `@/lib/n400/quiz-engine` import.
2. Add `import { civicsMockSlides } from '@/lib/n400/civics-mock-slides';` below it.
3. Inside `startNew`, replace everything from `// Skip Q29 (your U.S. Representative) when district is unresolved —` through the end of the `const built: PublicSlide[] = questions.map(…);` statement with:

```tsx
    // Q29 is skipped without a district inside the shared builder (spec §2.1).
    const built: PublicSlide[] = civicsMockSlides('civics', seed, stateCode, districtNumber).map(
      ({ question, options }) => ({
        questionId: question.id,
        options: options.map((o) => ({ id: o.id, en: o.en, vi: o.vi })),
      }),
    );
```

- [ ] **Step 7: Run the affected tests, type-check and lint**

Run: `npx vitest run src/lib/n400/civics-mock-slides.test.ts src/lib/n400/full-interview.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit -p .`
Expected: exit 0.

Run: `npx eslint src/lib/n400/civics-mock-slides.ts src/lib/n400/full-interview.ts "src/app/n400ready/(app)/mock-test/civics/page.tsx"`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add apps/website/src/lib/n400/civics-mock-slides.ts apps/website/src/lib/n400/civics-mock-slides.test.ts apps/website/src/lib/n400/full-interview.ts "apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx"
git commit -m "refactor(n400app): one Civics mock answer-key builder for both mocks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Server-side parsing of mock action input

**Files:**
- Create: `apps/website/src/lib/n400/civics-mock-input.ts`
- Test: `apps/website/src/lib/n400/civics-mock-input.test.ts`

**Interfaces:**
- Consumes: `CivicsMockKind` (Task 2).
- Produces:
  - `parseMockKind(kind: unknown): CivicsMockKind`; throws `'invalid kind'`.
  - `interface StartMockInput { kind; seed: string; stateCode: StateCode; districtNumber: number | null }`
  - `parseStartMockInput(input: unknown): StartMockInput`; throws one of `'invalid input'`, `'invalid seed'`, `'invalid state'`, `'invalid district'`, `'invalid kind'`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { parseMockKind, parseStartMockInput } from './civics-mock-input';

describe('parseMockKind', () => {
  it('accepts the two mock kinds', () => {
    expect(parseMockKind('civics')).toBe('civics');
    expect(parseMockKind('full')).toBe('full');
  });

  it.each([undefined, null, '', 'Civics', 'speaking', 1])('rejects %s', (kind) => {
    expect(() => parseMockKind(kind)).toThrow('invalid kind');
  });
});

describe('parseStartMockInput (RLS hardening spec §2.2)', () => {
  const ok = { kind: 'full', seed: 'full-123', stateCode: 'TX', districtNumber: null };

  it('passes valid input through unchanged', () => {
    expect(parseStartMockInput(ok)).toEqual(ok);
    expect(parseStartMockInput({ ...ok, kind: 'civics', districtNumber: 7 })).toEqual({ ...ok, kind: 'civics', districtNumber: 7 });
  });

  it('keeps a state code outside the list: the client built its slides with it', () => {
    expect(parseStartMockInput({ ...ok, stateCode: 'ZZ' }).stateCode).toBe('ZZ');
  });

  it.each([
    [{ ...ok, seed: '' }, 'invalid seed'],
    [{ ...ok, seed: 'x'.repeat(65) }, 'invalid seed'],
    [{ ...ok, seed: 42 }, 'invalid seed'],
    [{ ...ok, stateCode: '' }, 'invalid state'],
    [{ ...ok, stateCode: 'TOO-LONG-1' }, 'invalid state'],
    [{ ...ok, districtNumber: 1.5 }, 'invalid district'],
    [{ ...ok, districtNumber: undefined }, 'invalid district'],
    [{ ...ok, kind: 'speaking' }, 'invalid kind'],
    [null, 'invalid input'],
  ])('rejects %j', (input, message) => {
    expect(() => parseStartMockInput(input)).toThrow(message);
  });
});
```

- [ ] **Step 2: Run it, see it fail**

Run: `npx vitest run src/lib/n400/civics-mock-input.test.ts`
Expected: FAIL, `Failed to resolve import "./civics-mock-input"`.

- [ ] **Step 3: Implement**

Create `apps/website/src/lib/n400/civics-mock-input.ts`:

```ts
// Server-side checks on what the browser sends to the Civics mock actions (RLS
// hardening spec §2.2–2.3). Untrusted input: never assume its shape.

import type { CivicsMockKind } from './civics-mock-slides';
import type { StateCode } from './state-data';

export interface StartMockInput {
  kind: CivicsMockKind;
  seed: string;
  stateCode: StateCode;
  districtNumber: number | null;
}

export function parseMockKind(kind: unknown): CivicsMockKind {
  if (kind === 'civics' || kind === 'full') return kind;
  throw new Error('invalid kind');
}

/** stateCode is NOT checked against STATES_BY_CODE: profiles.state_code comes
 *  straight from Geoapify, and the client built its options with whatever it
 *  holds, so the key must be built from the same value (spec §2.2). */
export function parseStartMockInput(input: unknown): StartMockInput {
  if (typeof input !== 'object' || input === null) throw new Error('invalid input');
  const { kind, seed, stateCode, districtNumber } = input as Record<string, unknown>;
  if (typeof seed !== 'string' || seed.length === 0 || seed.length > 64) throw new Error('invalid seed');
  if (typeof stateCode !== 'string' || stateCode.length === 0 || stateCode.length > 8) {
    throw new Error('invalid state');
  }
  if (districtNumber !== null && !Number.isInteger(districtNumber)) throw new Error('invalid district');
  return {
    kind: parseMockKind(kind),
    seed,
    stateCode: stateCode as StateCode,
    districtNumber: districtNumber as number | null,
  };
}
```

- [ ] **Step 4: Run it, see it pass**

Run: `npx vitest run src/lib/n400/civics-mock-input.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/civics-mock-input.ts apps/website/src/lib/n400/civics-mock-input.test.ts
git commit -m "feat(n400app): parse Civics mock action input on the server

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Mock actions — service-role start, `kind`, CAPI gate

**Files:**
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/civics/actions.ts`
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx`, the `startMockAttempt` args in `startNew`
- Test: `apps/website/src/app/n400ready/(app)/mock-test/civics/actions-wiring.test.ts`

**Interfaces:**
- Consumes:
  - `civicsMockSlides`, `civicsMockAnswerKey`, `CivicsMockKind` (Task 2);
  - `parseStartMockInput`, `parseMockKind` (Task 3).
- Produces (Task 7 calls these):
  - `startMockAttempt(input: { kind: CivicsMockKind; seed: string; stateCode: StateCode; districtNumber: number | null }): Promise<StartMockAttemptResult>`
  - `finalizeMockAttempt(attemptId: string, picks: MockPick[], kind: CivicsMockKind = 'civics'): Promise<FinalizeMockAttemptResult>`
  - `finalizeVoiceMockAttempt(attemptId: string, answers: VoiceMockAnswer[], kind: CivicsMockKind = 'civics'): Promise<FinalizeVoiceMockAttemptResult>`

- [ ] **Step 1: Write the failing wiring test**

Create `apps/website/src/app/n400ready/(app)/mock-test/civics/actions-wiring.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §2.2–2.3. Server actions import next/headers, so their
// wiring is pinned by source, like navigation-ia.test.ts.
const source = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const actions = source('src/app/n400ready/(app)/mock-test/civics/actions.ts');
const page = source('src/app/n400ready/(app)/mock-test/civics/page.tsx');

describe('Civics mock actions (RLS hardening spec §2.2–2.3)', () => {
  it('builds the answer key with the shared builder from parsed input', () => {
    expect(actions).toContain('parseStartMockInput(input)');
    expect(actions).toContain('civicsMockAnswerKey(civicsMockSlides(kind, seed, stateCode, districtNumber))');
  });

  it('inserts the attempt with the service role, never with the session client', () => {
    expect(actions).toMatch(/createServerSupabaseClient\(\)\s*\.from\('n400_quiz_attempts'\)\s*\.insert\(/);
    expect(actions).not.toMatch(/supabase\s*\.from\('n400_quiz_attempts'\)\s*\.insert\(/);
  });

  it('fires the pass CAPI only for the standalone Civics mock', () => {
    expect(actions.match(/const capi = parseMockKind\(kind\) === 'civics'/g)).toHaveLength(2);
    expect(actions).toContain('if (passed && capi) {');
  });

  it('the standalone page registers its attempt as the civics kind', () => {
    expect(page).toContain("const args = { kind: 'civics' as const, seed, stateCode, districtNumber };");
  });
});
```

- [ ] **Step 2: Run it, see it fail**

Run: `npx vitest run "src/app/n400ready/(app)/mock-test/civics/actions-wiring.test.ts"`
Expected: FAIL (4 tests).

- [ ] **Step 3: Rewrite `startMockAttempt`**

In `actions.ts`:

1. Remove `buildOptions,` and `selectMockTestQuestions,` from the `@/lib/n400/quiz-engine` import. `MOCK_TEST_QUESTION_COUNT` and `type QuizOption` stay.
2. Add after the quiz-engine import:

```ts
import { civicsMockAnswerKey, civicsMockSlides, type CivicsMockKind } from '@/lib/n400/civics-mock-slides'
import { parseMockKind, parseStartMockInput } from '@/lib/n400/civics-mock-input'
```

3. Replace the whole `startMockAttempt` function with:

```ts
export async function startMockAttempt(input: {
  kind: CivicsMockKind
  seed: string
  stateCode: StateCode
  districtNumber: number | null
}): Promise<StartMockAttemptResult> {
  const supabase = await getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')

  // The client built its slides from these inputs; the shared builder gives the
  // answer key it was dealt (spec §2.1). Untrusted input, so parse it first.
  const { kind, seed, stateCode, districtNumber } = parseStartMockInput(input)
  const manifest = civicsMockAnswerKey(civicsMockSlides(kind, seed, stateCode, districtNumber))

  // Service role: since n400_37 the owner cannot insert mock_test rows, so an
  // answer key can only come from this builder (spec §2.2).
  const startedAt = new Date().toISOString()
  const { data: attempt, error } = await createServerSupabaseClient()
    .from('n400_quiz_attempts')
    .insert({
      user_id: user.id,
      mode: 'mock_test',
      total_questions: manifest.length,
      slide_manifest: manifest,
      started_at: startedAt,
    })
    .select('id')
    .single()
  if (error || !attempt) {
    throw new Error(`failed to start attempt: ${error?.message ?? 'unknown error'}`)
  }

  return { attemptId: attempt.id, startedAt }
}
```

4. In the header comment, replace the `startMockAttempt` paragraph (the lines starting `//   - startMockAttempt    replays the client's seed through the SAME`) with:

```ts
//   - startMockAttempt    replays the client's seed through the shared builder
//                         (civics-mock-slides.ts, kind 'civics' or 'full') and
//                         stores the answer key as the slide_manifest, inserting
//                         with the service role: the owner cannot insert
//                         mock_test rows (n400_37). The client builds its slides
//                         from the same seed for an instant start and registers
//                         the attempt here in the background.
```

- [ ] **Step 4: Add `kind` to both finalize actions and gate CAPI**

1. Change the signature `export async function finalizeMockAttempt(` to take a third parameter, and make `capi` its first statement:

```ts
export async function finalizeMockAttempt(
  attemptId: string,
  picks: MockPick[],
  kind: CivicsMockKind = 'civics',
): Promise<FinalizeMockAttemptResult> {
  const capi = parseMockKind(kind) === 'civics'
  const supabase = await getSupabase()
```

   In its return object, change the `unlockedBadges:` line to end with `, capi),` instead of `),`. That is:

```ts
    unlockedBadges: await evaluateMockUnlocks(attemptId, r?.milestone ?? null, Number(r?.current_streak ?? 0), Boolean(r?.passed), Number(r?.score ?? 0), Number(r?.total ?? MOCK_TEST_QUESTION_COUNT), capi),
```

2. Same for the voice action:

```ts
export async function finalizeVoiceMockAttempt(
  attemptId: string,
  answers: VoiceMockAnswer[],
  kind: CivicsMockKind = 'civics',
): Promise<FinalizeVoiceMockAttemptResult> {
  const capi = parseMockKind(kind) === 'civics'
  const supabase = await getSupabase()
```

   In its `evaluateMockUnlocks(` call, add `capi,` as the last argument, after `Number(r.total ?? MOCK_TEST_QUESTION_COUNT),`.

3. In `evaluateMockUnlocks`, add the parameter and the gate:

```ts
async function evaluateMockUnlocks(
  attemptId: string,
  milestone: number | null,
  currentStreak: number,
  passed: boolean,
  score: number,
  total: number,
  capi: boolean,
): Promise<string[]> {
```

   Replace `  if (passed) {` with `  if (passed && capi) {`. In the comment above the function, replace `// The n400_mock_test_pass Meta CAPI event (fired on pass) is scheduled` with `// The n400_mock_test_pass Meta CAPI event (fired on a standalone pass only — the Full interview's Civics part sends kind 'full', spec §0) is scheduled`.

- [ ] **Step 5: Standalone page sends `kind: 'civics'`**

In `civics/page.tsx` `startNew`, replace `const args = { seed, stateCode, districtNumber };` with:

```tsx
    const args = { kind: 'civics' as const, seed, stateCode, districtNumber };
```

- [ ] **Step 6: Run the wiring test, then the suite pieces, type-check and lint**

Run: `npx vitest run "src/app/n400ready/(app)/mock-test/civics/actions-wiring.test.ts" src/lib/n400/oral/finalize-voice-mock.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit -p .`
Expected: exit 0.

Run: `npx eslint "src/app/n400ready/(app)/mock-test/civics/actions.ts" "src/app/n400ready/(app)/mock-test/civics/page.tsx"`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add "apps/website/src/app/n400ready/(app)/mock-test/civics/actions.ts" "apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx" "apps/website/src/app/n400ready/(app)/mock-test/civics/actions-wiring.test.ts"
git commit -m "feat(n400app): mock attempts start with the service role; kind gates the pass CAPI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Full interview Civics submission, verdicts and save state machine

**Files:**
- Create: `apps/website/src/lib/n400/full-civics-submit.ts`
- Test: `apps/website/src/lib/n400/full-civics-submit.test.ts`

**Interfaces:**
- Consumes:
  - `QuizOption` from `./quiz-engine`;
  - `SpokenMockAnswer` from `./oral/spoken-mock` (the exam answer: `transcript`, `retried`, `input`, `confirmed`, `reask`, with **no** `qid`);
  - `VoiceMockAnswer` from `./oral/grade-voice-mock` (what the server grades).
- Produces (Task 7 uses these):
  - `interface FullCivicsInput { questionId: number; selectedId?: QuizOption['id']; spoken?: SpokenMockAnswer }`
  - `type FullCivicsSubmission = { mode: 'voice'; answers: VoiceMockAnswer[] } | { mode: 'choice'; picks: { questionId: number; selectedOption: QuizOption['id'] }[] }`
  - `fullCivicsSubmission(runMode: 'voice' | 'choice', inputs: readonly FullCivicsInput[]): FullCivicsSubmission`
  - `serverVerdicts(submission, result: { manifest: readonly { qid: number; correct: QuizOption['id'] }[]; answers?: readonly { qid: number; wasCorrect: boolean }[] }): Map<number, boolean>`
  - `type CivicsSaveStatus = 'saving' | 'saved' | 'failed' | 'unsaved'`
  - `interface CivicsSave { retryIfFailed(): void }`
  - `startCivicsSave<T>(save: () => Promise<T>, onChange: (status: CivicsSaveStatus, result?: T) => void): CivicsSave`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  fullCivicsSubmission,
  serverVerdicts,
  startCivicsSave,
  type FullCivicsInput,
} from './full-civics-submit';
import type { SpokenMockAnswer } from './oral/spoken-mock';

const spoken = (transcript: string, input: 'mic' | 'typed' = 'mic'): SpokenMockAnswer => ({
  transcript,
  retried: false,
  input,
  confirmed: true,
  reask: false,
});

describe('fullCivicsSubmission (RLS hardening spec §2.4, Review Focus 3)', () => {
  it('a voice run sends words by question id, multiple choice as a pick, and skips an empty item', () => {
    const inputs: FullCivicsInput[] = [
      { questionId: 12, spoken: spoken('freedom of speech') },
      { questionId: 29, selectedId: 'B' },
      { questionId: 3, spoken: spoken('the constitution', 'typed') },
      { questionId: 7 },
    ];
    expect(fullCivicsSubmission('voice', inputs)).toEqual({
      mode: 'voice',
      answers: [
        { qid: 12, transcript: 'freedom of speech', retried: false, input: 'mic' },
        { qid: 29, selected: 'B' },
        { qid: 3, transcript: 'the constitution', retried: false, input: 'typed' },
      ],
    });
  });

  it('a choice run sends the answered picks only (Review Focus 4)', () => {
    expect(
      fullCivicsSubmission('choice', [
        { questionId: 1, selectedId: 'A' },
        { questionId: 2 },
        { questionId: 3, selectedId: 'C' },
      ]),
    ).toEqual({
      mode: 'choice',
      picks: [
        { questionId: 1, selectedOption: 'A' },
        { questionId: 3, selectedOption: 'C' },
      ],
    });
  });
});

describe('serverVerdicts', () => {
  it('a choice run is graded against the server answer key', () => {
    const submission = fullCivicsSubmission('choice', [
      { questionId: 1, selectedId: 'A' },
      { questionId: 3, selectedId: 'C' },
    ]);
    const verdicts = serverVerdicts(submission, { manifest: [{ qid: 1, correct: 'A' }, { qid: 3, correct: 'D' }] });
    expect([...verdicts]).toEqual([[1, true], [3, false]]);
  });

  it('a voice run takes the server verdict per question', () => {
    const submission = fullCivicsSubmission('voice', [{ questionId: 12, spoken: spoken('x') }]);
    const verdicts = serverVerdicts(submission, {
      manifest: [{ qid: 12, correct: 'A' }, { qid: 29, correct: 'B' }],
      answers: [{ qid: 12, wasCorrect: true }, { qid: 29, wasCorrect: false }],
    });
    expect([...verdicts]).toEqual([[12, true], [29, false]]);
  });
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

function harness() {
  const calls: ReturnType<typeof deferred<string>>[] = [];
  const statuses: string[] = [];
  const saver = startCivicsSave(
    () => {
      const d = deferred<string>();
      calls.push(d);
      return d.promise;
    },
    (status, result) => statuses.push(result === undefined ? status : `${status}:${result}`),
  );
  return { calls, statuses, saver };
}

describe('startCivicsSave (Review Focus 1, 4)', () => {
  it('saves once in the background; a summary after success does nothing', async () => {
    const h = harness();
    expect(h.statuses).toEqual(['saving']);
    h.calls[0].resolve('ok');
    await flush();
    h.saver.retryIfFailed();
    await flush();
    expect(h.statuses).toEqual(['saving', 'saved:ok']);
    expect(h.calls).toHaveLength(1);
  });

  it('a failure before the summary waits; opening the summary retries once', async () => {
    const h = harness();
    h.calls[0].reject(new Error('offline'));
    await flush();
    expect(h.statuses).toEqual(['saving', 'failed']);
    h.saver.retryIfFailed();
    expect(h.calls).toHaveLength(2);
    h.calls[1].resolve('ok');
    await flush();
    expect(h.statuses).toEqual(['saving', 'failed', 'saving', 'saved:ok']);
  });

  it('a second failure leaves the part unsaved and never tries a third time', async () => {
    const h = harness();
    h.calls[0].reject(new Error('x'));
    await flush();
    h.saver.retryIfFailed();
    h.calls[1].reject(new Error('y'));
    await flush();
    h.saver.retryIfFailed();
    await flush();
    expect(h.calls).toHaveLength(2);
    expect(h.statuses.at(-1)).toBe('unsaved');
  });

  it('a save still running when the summary opens is awaited, then retried once if it fails', async () => {
    const h = harness();
    h.saver.retryIfFailed();
    expect(h.calls).toHaveLength(1);
    h.calls[0].reject(new Error('x'));
    await flush();
    expect(h.calls).toHaveLength(2);
    h.calls[1].resolve('ok');
    await flush();
    expect(h.statuses.at(-1)).toBe('saved:ok');
  });
});
```

- [ ] **Step 2: Run it, see it fail**

Run: `npx vitest run src/lib/n400/full-civics-submit.test.ts`
Expected: FAIL, `Failed to resolve import "./full-civics-submit"`.

- [ ] **Step 3: Implement**

Create `apps/website/src/lib/n400/full-civics-submit.ts`:

```ts
// The Civics part of Phỏng vấn đầy đủ is graded by the server (RLS hardening
// spec §2.4): what to send, how to read the server's verdicts, and the one-retry
// save that runs in the background while the learner moves on.

import type { QuizOption } from './quiz-engine';
import type { SpokenMockAnswer } from './oral/spoken-mock';
import type { VoiceMockAnswer } from './oral/grade-voice-mock';

/** One answered Civics item as the exam reported it. */
export interface FullCivicsInput {
  questionId: number;
  selectedId?: QuizOption['id'];
  spoken?: SpokenMockAnswer;
}

export type FullCivicsSubmission =
  | { mode: 'voice'; answers: VoiceMockAnswer[] }
  | { mode: 'choice'; picks: { questionId: number; selectedOption: QuizOption['id'] }[] };

/** A voice run sends words (or a pick for questions without an oral config) to
 *  the voice finalize; a choice run sends picks. An item with neither is left
 *  out, so the server grades it wrong, like the standalone mock. */
export function fullCivicsSubmission(
  runMode: 'voice' | 'choice',
  inputs: readonly FullCivicsInput[],
): FullCivicsSubmission {
  if (runMode === 'voice') {
    const answers: VoiceMockAnswer[] = [];
    for (const { questionId, selectedId, spoken } of inputs) {
      if (spoken) {
        answers.push({ qid: questionId, transcript: spoken.transcript, retried: spoken.retried, input: spoken.input });
      } else if (selectedId) {
        answers.push({ qid: questionId, selected: selectedId });
      }
    }
    return { mode: 'voice', answers };
  }
  return {
    mode: 'choice',
    picks: inputs.flatMap(({ questionId, selectedId }) =>
      selectedId ? [{ questionId, selectedOption: selectedId }] : [],
    ),
  };
}

/** Right/wrong per question from the finalize result: the voice finalize returns
 *  its verdicts; a choice run compares each pick with the server's answer key. */
export function serverVerdicts(
  submission: FullCivicsSubmission,
  result: {
    manifest: readonly { qid: number; correct: QuizOption['id'] }[];
    answers?: readonly { qid: number; wasCorrect: boolean }[];
  },
): Map<number, boolean> {
  if (submission.mode === 'voice') {
    return new Map((result.answers ?? []).map((a) => [a.qid, a.wasCorrect]));
  }
  const correct = new Map(result.manifest.map((m) => [m.qid, m.correct]));
  return new Map(submission.picks.map((p) => [p.questionId, correct.get(p.questionId) === p.selectedOption]));
}

export type CivicsSaveStatus = 'saving' | 'saved' | 'failed' | 'unsaved';

export interface CivicsSave {
  /** The summary opened: a save that failed — now or later — gets exactly one retry. */
  retryIfFailed(): void;
}

/** Runs `save` at once. A failure waits for the summary; the summary triggers one
 *  retry; a failed retry ends as 'unsaved'. */
export function startCivicsSave<T>(
  save: () => Promise<T>,
  onChange: (status: CivicsSaveStatus, result?: T) => void,
): CivicsSave {
  let status: CivicsSaveStatus = 'saving';
  let retried = false;
  let summaryOpen = false;
  const set = (next: CivicsSaveStatus, result?: T) => {
    status = next;
    onChange(next, result);
  };
  const attempt = () => {
    set('saving');
    save().then(
      (result) => set('saved', result),
      () => {
        if (retried) {
          set('unsaved');
        } else if (summaryOpen) {
          retried = true;
          attempt();
        } else {
          set('failed');
        }
      },
    );
  };
  attempt();
  return {
    retryIfFailed() {
      summaryOpen = true;
      if (status === 'failed' && !retried) {
        retried = true;
        attempt();
      }
    },
  };
}
```

- [ ] **Step 4: Run it, see it pass**

Run: `npx vitest run src/lib/n400/full-civics-submit.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Type-check, lint, commit**

Run: `npx tsc --noEmit -p .`
Expected: exit 0.

Run: `npx eslint src/lib/n400/full-civics-submit.ts src/lib/n400/full-civics-submit.test.ts`
Expected: 0 errors.

```bash
git add apps/website/src/lib/n400/full-civics-submit.ts apps/website/src/lib/n400/full-civics-submit.test.ts
git commit -m "feat(n400app): Full interview Civics submission, server verdicts, one-retry save

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `user-state` — `noteMockResult` and Reset through the RPC

**Files:**
- Modify: `apps/website/src/lib/n400/user-state.tsx`: add `noteMockResult`, delete the unused `applyStreak`, rewrite `resetAll`, export `noteMockResult`
- Test: `apps/website/src/lib/n400/user-state-wiring.test.ts`

**Interfaces:**
- Consumes: `public.n400_reset_my_progress()` (Task 1, already applied).
- Produces: `noteMockResult(result: MockResult, streak: { current: number; longest: number }): void` on `useN400UserState()`. Task 7 calls it.

- [ ] **Step 1: Write the failing wiring test**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §2.4, §2.6. user-state is a React context with no DOM test
// harness here, so its write paths are pinned by source.
const src = readFileSync(join(process.cwd(), 'src/lib/n400/user-state.tsx'), 'utf8');

/** The body of one `const name = useCallback(…)`: it ends at `  }, [deps]);` or at
 *  `  );` (the multi-line style), whichever comes first. */
function callback(name: string): string {
  const start = src.indexOf(`const ${name} = useCallback(`);
  expect(start, name).toBeGreaterThan(-1);
  const ends = ['\n  }, [', '\n  );'].map((s) => src.indexOf(s, start)).filter((i) => i > -1);
  return src.slice(start, Math.min(...ends));
}

describe('user-state writes (RLS hardening spec §2.4, §2.6)', () => {
  it('noteMockResult only updates local state: the finalize RPC already wrote the attempt', () => {
    const body = callback('noteMockResult');
    expect(body).toContain('mockResults: [...s.mockResults, result].slice(-100)');
    expect(body).not.toContain('supabase');
  });

  it('Reset goes through the wipe-all RPC, not table-by-table deletes', () => {
    const body = callback('resetAll');
    expect(body).toContain("supabase.rpc('n400_reset_my_progress')");
    expect(body).not.toContain('.delete()');
  });

  it('exposes noteMockResult', () => {
    expect(src).toMatch(/\n {4}noteMockResult,\n/);
  });
});
```

- [ ] **Step 2: Run it, see it fail**

Run: `npx vitest run src/lib/n400/user-state-wiring.test.ts`
Expected: FAIL. `noteMockResult` is not found, and `resetAll` still contains `.delete()`.

- [ ] **Step 3: Add `noteMockResult`, delete `applyStreak`**

In `user-state.tsx`, replace the whole `applyStreak` block — from the comment line `// Civics mock test finalizes server-side (finalize_mock_attempt_batch RPC` through the closing `}, []);` of `applyStreak` — with:

```tsx
  // A Civics mock finalized server-side (the Full interview's Civics part, RLS
  // hardening spec §2.4): the RPC already wrote the attempt and stamped the
  // streak, so this only brings local state in line until the next full load.
  // lastActivityDate takes the client-local today, as nextStreak would.
  const noteMockResult = useCallback(
    (result: MockResult, streak: { current: number; longest: number }) => {
      const today = TODAY_LOCAL();
      setState((s) => ({
        ...s,
        mockResults: [...s.mockResults, result].slice(-100),
        streak:
          streak.current > 0
            ? { current: streak.current, longest: Math.max(streak.longest, streak.current), lastActivityDate: today }
            : s.streak,
      }));
    },
    []
  );
```

- [ ] **Step 4: Reset through the RPC**

Replace the whole `resetAll` callback with:

```tsx
  const resetAll = useCallback(async () => {
    if (!user) return;
    setState(DEFAULT_STATE);
    // One server-side wipe (n400_36): quiz attempts have no owner DELETE policy,
    // so the old table-by-table deletes silently kept the Civics history.
    const { error } = await supabase.rpc('n400_reset_my_progress');
    if (error) console.error('n400: resetAll failed', error);
  }, [user]);
```

- [ ] **Step 5: Export it**

In the object returned by `useN400UserStateInternal`, add `    noteMockResult,` on the line after `    recordMockResult,`.

- [ ] **Step 6: Run the test, type-check, lint**

Run: `npx vitest run src/lib/n400/user-state-wiring.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit -p .`
Expected: exit 0.

Run: `npx eslint src/lib/n400/user-state.tsx src/lib/n400/user-state-wiring.test.ts`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add apps/website/src/lib/n400/user-state.tsx apps/website/src/lib/n400/user-state-wiring.test.ts
git commit -m "feat(n400app): noteMockResult for server-finalized mocks; Reset wipes via RPC

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Phỏng vấn đầy đủ — server-graded Civics part and the unsaved note

**Files:**
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/full/page.tsx`
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/full/MockTestResult.tsx`
- Modify: `apps/website/src/lib/n400/i18n/vi.ts`, `apps/website/src/lib/n400/i18n/en.ts`: add `mockTest.summary.civicsUnsaved`
- Modify: `apps/website/src/components/n400/navigation-ia.test.ts:175`
- Modify: `apps/website/src/components/n400/oral/spoken-exam-wiring.test.ts:103`
- Test: `apps/website/src/app/n400ready/(app)/mock-test/full/civics-save-wiring.test.ts`

**Interfaces:**
- Consumes:
  - `startMockAttempt`, `finalizeMockAttempt`, `finalizeVoiceMockAttempt` (Task 4);
  - `fullCivicsSubmission`, `serverVerdicts`, `startCivicsSave`, `CivicsSave`, `CivicsSaveStatus`, `FullCivicsInput` (Task 5);
  - `noteMockResult` (Task 6).
- Produces: `MockTestResult` prop `civicsUnsaved?: boolean`.

- [ ] **Step 1: Write the failing wiring test**

Create `apps/website/src/app/n400ready/(app)/mock-test/full/civics-save-wiring.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §2.4. No DOM harness in this app: wiring is pinned by source.
const source = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = source('src/app/n400ready/(app)/mock-test/full/page.tsx');
const result = source('src/app/n400ready/(app)/mock-test/full/MockTestResult.tsx');

describe('Full interview Civics part is graded by the server (spec §2.4)', () => {
  it('registers the attempt with the seed the quiz builds from', () => {
    expect(page).toContain("const args = { kind: 'full' as const, seed: `full-${next}`, stateCode, districtNumber };");
    expect(page).toContain('buildCivicsPhase(`full-${seed}`, stateCode, districtNumber, dict)');
  });

  it('finalizes as the full kind, by voice or by picks', () => {
    expect(page).toContain('fullCivicsSubmission(runMode, civicsInputs.current)');
    expect(page).toContain("finalizeVoiceMockAttempt(id, submission.answers, 'full')");
    expect(page).toContain("finalizeMockAttempt(id, submission.picks, 'full')");
  });

  it('retries a failed background start once inside the save (Review Focus 1)', () => {
    expect(page).toContain('(await startMockAttempt(pendingStart.current)).attemptId');
  });

  it('ignores a save that settles after a newer run started (Review Focus 2)', () => {
    expect(page).toContain('if (runToken.current !== run) return;');
  });

  it('opening the summary gives a failed save its one retry, and the note shows when unsaved', () => {
    expect(page).toContain('civicsSave.current?.retryIfFailed();');
    expect(page).toContain("civicsUnsaved={civicsSaveStatus === 'unsaved'}");
  });

  it('records the server result locally, never with a browser insert', () => {
    expect(page).toContain('noteMockResult(');
    expect(page).not.toContain('recordMockResult(');
  });

  it('the result screen shows the note under Civics only', () => {
    expect(result).toContain("key === 'civics' && civicsUnsaved");
    expect(result).toContain('dict.mockTest.summary.civicsUnsaved');
  });

  it('copy is the owner-approved wording', () => {
    expect(source('src/lib/n400/i18n/vi.ts')).toContain(
      "civicsUnsaved: 'Chưa lưu được kết quả phần Civics, nên kết quả này sẽ không có trong lịch sử.',",
    );
    expect(source('src/lib/n400/i18n/en.ts')).toContain(
      `civicsUnsaved: "Your Civics result couldn't be saved, so it won't appear in your history.",`,
    );
  });
});
```

- [ ] **Step 2: Run it, see it fail**

Run: `npx vitest run "src/app/n400ready/(app)/mock-test/full/civics-save-wiring.test.ts"`
Expected: FAIL (8 tests). The first test fails on its `const args` line; its `buildCivicsPhase` line already holds.

- [ ] **Step 3: Copy**

In `src/lib/n400/i18n/vi.ts`, inside `mockTest.summary`, add after the `sectionRemaining:` line:

```ts
      civicsUnsaved: 'Chưa lưu được kết quả phần Civics, nên kết quả này sẽ không có trong lịch sử.',
```

In `src/lib/n400/i18n/en.ts`, inside `mockTest.summary`, add after the `sectionRemaining:` line:

```ts
      civicsUnsaved: "Your Civics result couldn't be saved, so it won't appear in your history.",
```

- [ ] **Step 4: Result screen note**

In `MockTestResult.tsx`:

1. In `interface MockTestResultProps`, add after `civicsAnswers: CivicsAnswer[];`:

```tsx
  /** The server could not save the Civics part (RLS hardening spec §2.4). */
  civicsUnsaved?: boolean;
```

2. In the component's destructured props, add `  civicsUnsaved = false,` after `  civicsAnswers,`.
3. In the per-section card, directly after the `<p className="mt-2 text-xs text-gray-500">` element (the one that renders `sectionPassed` / `sectionRemaining`) and before the card's closing `</div>`, add:

```tsx
                {key === 'civics' && civicsUnsaved ? (
                  <p className="mt-1.5 text-xs font-medium text-orange-600">{dict.mockTest.summary.civicsUnsaved}</p>
                ) : null}
```

- [ ] **Step 5: Page imports, hook and refs**

In `full/page.tsx`:

1. After `import { InterludeScreen } from './interview-chrome';` add:

```tsx
import { finalizeMockAttempt, finalizeVoiceMockAttempt, startMockAttempt } from '../civics/actions';
```

2. After `import { useN400UserState } from '@/lib/n400/user-state';` add:

```tsx
import {
  fullCivicsSubmission,
  serverVerdicts,
  startCivicsSave,
  type CivicsSave,
  type CivicsSaveStatus,
  type FullCivicsInput,
} from '@/lib/n400/full-civics-submit';
```

3. Delete the function `generateAttemptId` together with its 3-line comment above it (`// Guarded id (same pattern as analytics' generateEventId): …`). The server's attempt id replaces it.
4. Change `const { state, hydrated, recordMockResult, recordSectionMockResult } = useN400UserState();` to:

```tsx
  const { state, hydrated, noteMockResult, recordSectionMockResult } = useN400UserState();
```

5. After `const startedAt = useRef<string>('');` add:

```tsx
  // Server-graded Civics part (RLS hardening spec §2.4): the attempt registers
  // at Bắt đầu and finalizes when the part ends. runToken tells a late save
  // from an older run apart from the current one.
  const civicsInputs = useRef<FullCivicsInput[]>([]);
  const runToken = useRef(0);
  const attemptIdPromise = useRef<Promise<string> | null>(null);
  const pendingStart = useRef<Parameters<typeof startMockAttempt>[0] | null>(null);
  const civicsSave = useRef<CivicsSave | null>(null);
  const [civicsSaveStatus, setCivicsSaveStatus] = useState<CivicsSaveStatus | null>(null);
```

- [ ] **Step 6: `begin` registers the attempt**

Replace the whole `begin` function with the version below. The long comment is kept; one paragraph is added.

```tsx
  const begin = () => {
    // Bump the seed FIRST: quiz keys derive from it, so a mid-part restart
    // ("Trộn lại") remounts the quiz with fresh questions instead of silently
    // wiping the refs under a still-mounted session.
    //
    // The bump is randomized (not just +1): seed starts at 0 and resets on every
    // page load, so a plain +1 would always land on `full-1` for a fresh visit —
    // making every "Bắt đầu thi" serve the exact same questions. Adding a random
    // amount keeps the seed strictly increasing (guarantees a remount) while
    // making the question set unpredictable across page loads. Randomizing only
    // here (in a client-side handler), not in useState, avoids SSR hydration
    // mismatch since the initial render stays deterministic at seed 0.
    //
    // The new value is computed here, not in a setSeed updater, because the
    // Civics attempt registers with the same `full-${seed}` the quiz builds from.
    const next = seed + 1 + Math.floor(Math.random() * 1_000_000);
    setSeed(next);
    runToken.current = next;
    civicsAnswers.current = [];
    civicsInputs.current = [];
    setCivicsAnswerList([]);
    speakingAnswers.current = [];
    setSpeakingAnswerList([]);
    setWritingAnswerList([]);
    startedAt.current = new Date().toISOString();
    setRunMode(answerMode === 'voice' && voiceAvailable ? 'voice' : 'choice');
    setMicLatched(false);
    setCivics(null);
    setSpeaking(null);
    setWriting(null);
    civicsSave.current = null;
    setCivicsSaveStatus(null);
    // Register the Civics attempt in the background; finishCivics awaits it and
    // retries once if this call failed.
    const args = { kind: 'full' as const, seed: `full-${next}`, stateCode, districtNumber };
    pendingStart.current = args;
    const p = startMockAttempt(args).then((r) => r.attemptId);
    p.catch(() => {}); // surfaced when the part finalizes
    attemptIdPromise.current = p;
    setPhase({ kind: 'civics' });
  };
```

- [ ] **Step 7: `finishCivics`**

Add this function directly before `if (phase.kind === 'civics') {`:

```tsx
  // The part's result shows at once from the quiz; the server's verdicts replace
  // it when the finalize lands, normally long before the summary (spec §2.4).
  const finishCivics = () => {
    const run = runToken.current;
    const answers = [...civicsAnswers.current];
    const submission = fullCivicsSubmission(runMode, civicsInputs.current);
    const startedAtIso = startedAt.current;
    let attemptId: string | null = null;
    const save = async () => {
      if (!attemptId) {
        attemptId = attemptIdPromise.current ? await attemptIdPromise.current.catch(() => null) : null;
        if (!attemptId && pendingStart.current) attemptId = (await startMockAttempt(pendingStart.current)).attemptId;
        if (!attemptId) throw new Error('n400: Full interview Civics attempt never registered');
      }
      const id = attemptId;
      const r =
        submission.mode === 'voice'
          ? await finalizeVoiceMockAttempt(id, submission.answers, 'full')
          : await finalizeMockAttempt(id, submission.picks, 'full');
      return { id, r };
    };
    civicsSave.current = startCivicsSave(save, (status, saved) => {
      if (runToken.current !== run) return; // a newer run started
      setCivicsSaveStatus(status);
      if (status !== 'saved' || !saved) return;
      const { id, r } = saved;
      const verdicts = serverVerdicts(submission, r);
      const reviewed = answers.map((a) => ({ ...a, wasCorrect: verdicts.get(a.questionId) ?? false }));
      setCivics({ correct: r.score, total: r.total, passed: r.passed });
      setCivicsAnswerList(reviewed);
      noteMockResult(
        {
          id,
          startedAt: startedAtIso,
          completedAt: new Date().toISOString(),
          score: r.score,
          total: r.total,
          passed: r.passed,
          questionResults: reviewed.map(({ questionId, wasCorrect, transcript }) => ({
            questionId,
            wasCorrect,
            ...(transcript !== undefined ? { transcript } : {}),
          })),
        },
        { current: r.currentStreak, longest: r.longestStreak },
      );
    });
  };
```

- [ ] **Step 8: Civics quiz callbacks**

In the Civics `<SectionMCQuiz key={`civ-${seed}`} …>`:

1. Replace its `onAnswer` prop with:

```tsx
        onAnswer={(itemId, ok, selected, _via, spoken) => {
          const questionId = Number(itemId.slice(4));
          civicsAnswers.current.push({
            questionId,
            wasCorrect: ok,
            selectedEn: selected?.en,
            ...(spoken ? { transcript: spoken.transcript, input: spoken.input } : {}),
          });
          civicsInputs.current.push({
            questionId,
            ...(selected ? { selectedId: selected.id } : {}),
            ...(spoken ? { spoken } : {}),
          });
        }}
```

2. Replace its `onComplete` prop with:

```tsx
        onComplete={({ correct }) => {
          const passed = correct >= FULL_CIVICS_PASS;
          setCivics({ correct, total: FULL_CIVICS_COUNT, passed });
          setCivicsAnswerList([...civicsAnswers.current]);
          // Advance first; the server save runs in the background (spec §2.4).
          setPhase({ kind: 'interlude', next: 'speaking' });
          finishCivics();
        }}
```

- [ ] **Step 9: Summary retry and the note**

1. In the Writing `<DictationQuiz … onSessionEnd={…}>`, add `civicsSave.current?.retryIfFailed();` on the line after `setPhase({ kind: 'summary' });`.
2. In the `if (phase.kind === 'summary')` branch, add this prop to `<MockTestResult …>` after `civicsAnswers={civicsAnswerList}`:

```tsx
        civicsUnsaved={civicsSaveStatus === 'unsaved'}
```

- [ ] **Step 10: Two older wiring tests follow the new wiring**

1. In `src/components/n400/navigation-ia.test.ts`, inside `test('full interview chains the three parts and records results', …)`, replace `expect(page).toContain('recordMockResult');` with:

```ts
    expect(page).toContain('noteMockResult(');
```

2. In `src/components/n400/oral/spoken-exam-wiring.test.ts`, inside `it('records how each part was answered, and the Civics words (Review Focus 4)', …)`, replace `expect(page).toContain('answerModeOf(civicsAnswers.current.map((a) => a.input))');` with:

```ts
    // The Civics part's answer_mode is now set by the voice finalize on the server
    // (RLS hardening spec §2.4); the page sends the run's submission.
    expect(page).toContain('fullCivicsSubmission(runMode, civicsInputs.current)');
```

   The Speaking line and the `...(transcript !== undefined ? { transcript } : {})` line of that test stay as they are; both still hold.

- [ ] **Step 11: Run the tests, type-check, lint**

Run: `npx vitest run "src/app/n400ready/(app)/mock-test/full/civics-save-wiring.test.ts" src/components/n400/navigation-ia.test.ts src/components/n400/oral/spoken-exam-wiring.test.ts src/lib/n400/full-interview.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit -p .`
Expected: exit 0.

Run: `npx eslint "src/app/n400ready/(app)/mock-test/full/page.tsx" "src/app/n400ready/(app)/mock-test/full/MockTestResult.tsx" src/lib/n400/i18n/vi.ts src/lib/n400/i18n/en.ts`
Expected: 0 errors.

- [ ] **Step 12: Commit**

```bash
git add "apps/website/src/app/n400ready/(app)/mock-test/full/page.tsx" "apps/website/src/app/n400ready/(app)/mock-test/full/MockTestResult.tsx" "apps/website/src/app/n400ready/(app)/mock-test/full/civics-save-wiring.test.ts" apps/website/src/lib/n400/i18n/vi.ts apps/website/src/lib/n400/i18n/en.ts apps/website/src/components/n400/navigation-ia.test.ts apps/website/src/components/n400/oral/spoken-exam-wiring.test.ts
git commit -m "feat(n400app): Full interview Civics part graded by the server, unsaved note

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Remove the browser's mock_test writes

**Files:**
- Modify: `apps/website/src/lib/n400/user-state.tsx`: delete `recordMockResult` and its export; drop two imports
- Modify: `apps/website/src/lib/n400/attempt-row.ts`: delete `MockQuizAttemptRow`, `mockQuizAttemptRow`, `MockQuestionAttemptRow`, `mockQuestionAttemptRows`, and the `MAX_TRANSCRIPT` import
- Modify: `apps/website/src/lib/n400/attempt-row.test.ts`
- Modify: `apps/website/src/lib/n400/user-state-wiring.test.ts`

**Interfaces:**
- Consumes: nothing new. After Task 7 nothing calls `recordMockResult`.
- Produces: no browser code path inserts a `mock_test` row. `n400_37` relies on this.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/n400/user-state-wiring.test.ts`, inside its `describe`:

```ts
  it('never writes a mock_test attempt from the browser (n400_37 relies on it)', () => {
    expect(src).not.toContain('recordMockResult');
    expect(src).not.toContain('mockQuizAttemptRow');
    expect(src).not.toContain('mockQuestionAttemptRows');
  });
```

In `src/lib/n400/attempt-row.test.ts`:

1. Remove `mockQuestionAttemptRows,` and `mockQuizAttemptRow,` from the import list.
2. Delete the whole `describe('Full interview Civics rows (speaking spec §5.2, Review Focus 1, 4)', …)` block.
3. Replace the whole `describe('attempt-row stays light (S4 final review)', …)` block with:

```ts
describe('attempt-row stays light (S4 final review)', () => {
  // user-state (on every N400Ready page) imports these builders: nothing from the
  // oral modules may come along.
  it('imports nothing from the oral modules', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/n400/attempt-row.ts'), 'utf8');
    expect(src).not.toMatch(/from '\.\/oral\//);
  });
});
```

- [ ] **Step 2: Run them, see them fail**

Run: `npx vitest run src/lib/n400/user-state-wiring.test.ts src/lib/n400/attempt-row.test.ts`
Expected: FAIL. `user-state.tsx` still contains `recordMockResult`, and `attempt-row.ts` still imports `./oral/transcript-limit`.

- [ ] **Step 3: Delete the code**

In `user-state.tsx`:

1. Delete the whole `recordMockResult` callback, from `  const recordMockResult = useCallback(` through its closing `  );`.
2. Delete `    recordMockResult,` from the returned object.
3. In `import { mockQuestionAttemptRows, mockQuizAttemptRow, practiceAttemptRow, sectionAttemptRow, sectionMockResultRow, type AnswerMode } from './attempt-row';`, remove `mockQuestionAttemptRows, mockQuizAttemptRow, `.
4. In `recordAnswer`, replace the comment line `      // Mock test uses recordMockResult below, which writes a single attempt row.` with `      // Civics mock results are written by the server (the finalize RPCs).`

In `attempt-row.ts`:

1. Delete the line `import { MAX_TRANSCRIPT } from './oral/transcript-limit';`.
2. Delete everything from the doc comment `/** The n400_quiz_attempts row of a client-recorded Civics mock (the Full interview's` to the end of the file (`mockQuestionAttemptRows` is the last export).

- [ ] **Step 4: Run them, see them pass; type-check, lint**

Run: `npx vitest run src/lib/n400/user-state-wiring.test.ts src/lib/n400/attempt-row.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit -p .`
Expected: exit 0. If `AnswerMode` is reported unused in `user-state.tsx`, keep it: `recordAnswer` and `recordSectionAnswer` still use it.

Run: `npx eslint src/lib/n400/user-state.tsx src/lib/n400/attempt-row.ts src/lib/n400/attempt-row.test.ts src/lib/n400/user-state-wiring.test.ts`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/user-state.tsx apps/website/src/lib/n400/attempt-row.ts apps/website/src/lib/n400/attempt-row.test.ts apps/website/src/lib/n400/user-state-wiring.test.ts
git commit -m "refactor(n400app): the browser no longer writes mock_test attempts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: R3a gate — verify, merge, deploy, owner run

**Files:**
- Modify: `docs/superpowers/spikes/2026-09-26-n400-full-interview-voice-gate4.md`, row 10 (Step 7)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: everything passes except the pre-existing `src/components/n400/mobile-layout.test.ts`. Report it by name.

- [ ] **Step 2: Types, lint, build**

Run: `npx tsc --noEmit -p .`
Expected: exit 0.

Run, from `apps/website/`, on every source file the branch changed:

```bash
npx eslint $(git diff --name-only main...HEAD -- 'apps/website/src/**/*.ts' 'apps/website/src/**/*.tsx' | sed 's#^apps/website/##')
```

Expected: 0 errors.

Run: `npm run build`
Expected: the build completes.

- [ ] **Step 3: Ask the owner to approve merge + push of R3a**

Show the commit list (`git log --oneline main..HEAD`) and say plainly that pushing to `main` deploys to production on Vercel. Wait for an explicit yes.

- [ ] **Step 4: Merge and push (after the yes)**

Run from the root folder:

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git switch main && git merge --ff-only feat/n400-rls-hardening && git push origin main && git switch feat/n400-rls-hardening
```

Expected: fast-forward, push accepted, back on the feature branch.

- [ ] **Step 5: Wait for the production deploy**

```bash
gh api "repos/ChrisNguyenUS/business_plan/deployments?sha=$(git rev-parse HEAD)" --jq '.[] | {id, environment}'
```

Then, for the Production deployment id:

```bash
gh api "repos/ChrisNguyenUS/business_plan/deployments/<id>/statuses" --jq '.[0].state'
```

Expected: `success`. If `gh` cannot see deployments, ask the owner to confirm in Vercel that the deploy of this commit is Ready.

- [ ] **Step 6: Owner device run**

Ask the owner to:
1. run one Phỏng vấn đầy đủ with **Trắc nghiệm**;
2. run one Phỏng vấn đầy đủ with **Toàn bộ bằng giọng**;
3. run one Thi thử Civics;
4. on a **test account only**, press Reset on Tài khoản and reload: the Civics history must be gone.

- [ ] **Step 7: DB check, which is also Gate S4 row 10**

Run with `mcp__supabase__execute_sql`:

```sql
select a.id, a.answer_mode, a.score, a.total_questions, a.passed,
       jsonb_array_length(a.slide_manifest) as key_len, a.started_at, a.completed_at,
       (select count(*) from n400_question_attempts q where q.attempt_id = a.id) as answer_rows,
       (select count(*) from n400_question_attempts q where q.attempt_id = a.id and q.transcript is not null) as with_words
from n400_quiz_attempts a
where a.mode = 'mock_test' and a.started_at > now() - interval '3 hours'
order by a.started_at desc;
```

Expected:
- every row has `key_len` (not null), so every attempt was created by the server;
- the three finished runs have `completed_at` and `answer_rows > 0`;
- the voice run has `answer_mode = 'voice'` and `with_words > 0`;
- the choice runs have `answer_mode = 'choice'` and `with_words = 0`.

Fill Gate S4 row 10 in `docs/superpowers/spikes/2026-09-26-n400-full-interview-voice-gate4.md` with the result and today's date.

- [ ] **Step 8: Commit the gate doc**

```bash
git add docs/superpowers/spikes/2026-09-26-n400-full-interview-voice-gate4.md
git commit -m "docs(n400app): Gate S4 row 10 — server-created Full interview attempts verified

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Gate:** wait for the owner's "R3a OK" before Task 10.

---

### Task 10: `n400_37` — write lockdown

**Files:**
- Create: `apps/website/supabase/migrations/n400_37_civics_mock_lockdown.sql`
- Test: `apps/website/src/lib/n400/civics-mock-lockdown-migration.test.ts`

**Interfaces:**
- Consumes: Task 9 gate passed, so no deployed code inserts `mock_test` rows or mock answers from the browser.
- Produces:
  - policies `"n400 attempts own practice insert"`, `"n400 question attempts own select"`, `"n400 question attempts own practice insert"`;
  - both owner finalize RPCs require `mode = 'mock_test'`;
  - three RPCs are retired from `authenticated`.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §3.2. Pins what the migration does on the shared project.
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/n400_37_civics_mock_lockdown.sql'), 'utf8');
const code = sql.replace(/--.*$/gm, '');

describe('n400_37_civics_mock_lockdown', () => {
  it('the owner inserts practice envelopes only, never an answer key', () => {
    expect(code).toContain('DROP POLICY IF EXISTS "n400 attempts own insert" ON public.n400_quiz_attempts;');
    expect(code).toMatch(
      /CREATE POLICY "n400 attempts own practice insert" ON public\.n400_quiz_attempts\s+FOR INSERT TO authenticated\s+WITH CHECK \(user_id = \(select auth\.uid\(\)\)\s+AND mode IN \('practice', 'flashcard'\)\s+AND slide_manifest IS NULL\);/,
    );
  });

  it('the owner reads own answers and writes word-free answers under own practice attempts only', () => {
    expect(code).toContain('DROP POLICY IF EXISTS "n400 question attempts own" ON public.n400_question_attempts;');
    expect(code).toContain('CREATE POLICY "n400 question attempts own select" ON public.n400_question_attempts');
    expect(code).toContain('CREATE POLICY "n400 question attempts own practice insert" ON public.n400_question_attempts');
    expect(code).toContain('WITH CHECK (transcript IS NULL');
    expect(code).toContain("AND a.mode IN ('practice', 'flashcard')));");
    expect(code).not.toMatch(/FOR (ALL|UPDATE|DELETE)/);
  });

  it('both owner finalize RPCs refuse anything but a mock_test attempt, and grading is unchanged', () => {
    expect(code.match(/IF v_user_id IS DISTINCT FROM auth\.uid\(\) OR v_mode IS DISTINCT FROM 'mock_test' THEN/g)).toHaveLength(2);
    expect(code).toContain("(pick->>'selected') = (slide->>'correct')");
  });

  it('retires the RPCs the app no longer calls', () => {
    for (const fn of ['finalize_mock_attempt(uuid)', 'submit_mock_answer(uuid, integer, text)', 'finalize_practice_attempt(uuid)']) {
      expect(code).toContain(`REVOKE EXECUTE ON FUNCTION public.${fn} FROM PUBLIC, anon, authenticated;`);
    }
  });
});
```

- [ ] **Step 2: Run it, see it fail**

Run: `npx vitest run src/lib/n400/civics-mock-lockdown-migration.test.ts`
Expected: FAIL, `ENOENT` (the migration does not exist yet).

- [ ] **Step 3: Save the live definitions for rollback**

Run with `mcp__supabase__execute_sql`:

```sql
select pg_get_functiondef('public.finalize_mock_attempt_batch(uuid, jsonb)'::regprocedure) as batch_def,
       pg_get_functiondef('public.finalize_mock_attempt(uuid)'::regprocedure) as single_def;
```

Save the two outputs to `n400_37_rollback_functions.sql` in the session scratchpad directory. They are the rollback bodies.

Expected: the bodies match the ones copied below, apart from the added mode check. If they differ, STOP: someone changed them since 2026-10-08, and the migration below must be rebased onto the live text.

- [ ] **Step 4: Write the migration**

Create `apps/website/supabase/migrations/n400_37_civics_mock_lockdown.sql`:

```sql
-- Every Civics mock result comes from the server (RLS hardening spec §3.2).
--
-- Before this migration a learner could write a "passed" Civics mock with
-- their own session over PostgREST: (a) insert a passed mock_test row,
-- (b) start a real mock and insert was_correct = true answers before
-- finalizing (the batch keeps rows it finds), (c) insert an attempt with a
-- self-made slide_manifest, (d) finalize a practice attempt as a mock (no
-- mode check). (b)–(d) also fired the Meta CAPI pass event.
--
-- After it: mock_test rows are created only by startMockAttempt with the
-- service role (this ships after that code is live), answers under a mock
-- attempt are written only by the finalize RPCs, and both owner-callable
-- finalize paths require mode = 'mock_test'. Practice, Speaking and Writing
-- stay self-reported. Practice answers carry no words (Privacy Policy §8).

-- (1) n400_quiz_attempts: the owner writes practice envelopes only.
DROP POLICY IF EXISTS "n400 attempts own insert" ON public.n400_quiz_attempts;
CREATE POLICY "n400 attempts own practice insert" ON public.n400_quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid())
              AND mode IN ('practice', 'flashcard')
              AND slide_manifest IS NULL);

-- (2) n400_question_attempts: read your own; write only under your own practice
--     attempts, never words. Replaces the owner policy that allowed everything.
DROP POLICY IF EXISTS "n400 question attempts own" ON public.n400_question_attempts;
CREATE POLICY "n400 question attempts own select" ON public.n400_question_attempts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.n400_quiz_attempts a
                 WHERE a.id = n400_question_attempts.attempt_id
                   AND a.user_id = (select auth.uid())));
CREATE POLICY "n400 question attempts own practice insert" ON public.n400_question_attempts
  FOR INSERT TO authenticated
  WITH CHECK (transcript IS NULL
              AND EXISTS (SELECT 1 FROM public.n400_quiz_attempts a
                          WHERE a.id = n400_question_attempts.attempt_id
                            AND a.user_id = (select auth.uid())
                            AND a.mode IN ('practice', 'flashcard')));

-- (3) Both owner-callable finalize paths require a mock_test attempt. Bodies
--     are the live ones (pg_get_functiondef, 2026-10-08) plus the mode check.
CREATE OR REPLACE FUNCTION public.finalize_mock_attempt(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_mode    text;
BEGIN
  SELECT user_id, mode INTO v_user_id, v_mode FROM n400_quiz_attempts WHERE id = p_attempt_id;
  IF v_user_id IS DISTINCT FROM auth.uid() OR v_mode IS DISTINCT FROM 'mock_test' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN public.n400_finalize_mock_core(p_attempt_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_mock_attempt_batch(p_attempt_id uuid, p_picks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   uuid;
  v_mode      text;
  v_completed timestamptz;
  v_manifest  jsonb;
  v_bad_qid   int;
  v_result    jsonb;
BEGIN
  SELECT user_id, mode, completed_at, slide_manifest
  INTO v_user_id, v_mode, v_completed, v_manifest
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS DISTINCT FROM auth.uid() OR v_mode IS DISTINCT FROM 'mock_test' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF v_completed IS NULL THEN
    -- Reject picks for questions the server never dealt this attempt.
    SELECT (pick->>'qid')::int INTO v_bad_qid
    FROM jsonb_array_elements(COALESCE(p_picks, '[]'::jsonb)) AS pick
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(v_manifest, '[]'::jsonb)) AS slide
      WHERE (slide->>'qid')::int = (pick->>'qid')::int
    )
    LIMIT 1;
    IF v_bad_qid IS NOT NULL THEN
      RAISE EXCEPTION 'question % not in attempt manifest', v_bad_qid;
    END IF;

    -- Replay every pick against the answer key in one statement.
    -- DISTINCT ON guards against duplicate qids inside the payload;
    -- NOT EXISTS skips rows already written by a partial v1 submit.
    INSERT INTO n400_question_attempts (attempt_id, question_id, was_correct)
    SELECT DISTINCT ON ((pick->>'qid')::int)
      p_attempt_id,
      (pick->>'qid')::int,
      (pick->>'selected') = (slide->>'correct')
    FROM jsonb_array_elements(COALESCE(p_picks, '[]'::jsonb)) AS pick
    JOIN jsonb_array_elements(v_manifest) AS slide
      ON (slide->>'qid')::int = (pick->>'qid')::int
    WHERE NOT EXISTS (
      SELECT 1 FROM n400_question_attempts qa
      WHERE qa.attempt_id = p_attempt_id
        AND qa.question_id = (pick->>'qid')::int
    )
    ORDER BY (pick->>'qid')::int;
  END IF;

  v_result := public.finalize_mock_attempt(p_attempt_id);
  RETURN v_result || jsonb_build_object('manifest', COALESCE(v_manifest, '[]'::jsonb));
END;
$function$;

-- (4) RPCs the app no longer calls directly. finalize_mock_attempt is still
--     called inside finalize_mock_attempt_batch, which runs as the owner.
REVOKE EXECUTE ON FUNCTION public.finalize_mock_attempt(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_mock_answer(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_practice_attempt(uuid) FROM PUBLIC, anon, authenticated;
```

- [ ] **Step 5: Run the test, see it pass**

Run: `npx vitest run src/lib/n400/civics-mock-lockdown-migration.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: RED on prod — the four forge routes are open today**

Run the probe block below with `mcp__supabase__execute_sql` **without** pasting the migration at the marker.
Expected: the error text starts with `PROBE a=OPEN b=OPEN c=OPEN d=OPEN e=OPEN f1=OPEN f2=OPEN f3=OPEN`. The later fields do not matter for this run.

```sql
do $probe$
declare
  v_uid uuid := (select id from profiles where role = 'client' order by created_at limit 1);
  v_mock uuid; v_mock2 uuid; v_practice uuid;
  r text := '';
  n int;
  v jsonb;
begin
  -- ▼ GREEN run only: paste the full text of n400_37_civics_mock_lockdown.sql here
  -- ▲

  -- what the service role does in startMockAttempt
  insert into n400_quiz_attempts (user_id, mode, total_questions, slide_manifest, started_at)
  values (v_uid, 'mock_test', 2, '[{"qid":1,"correct":"A"},{"qid":2,"correct":"B"}]', now()) returning id into v_mock;
  insert into n400_quiz_attempts (user_id, mode, total_questions, slide_manifest, started_at)
  values (v_uid, 'mock_test', 2, '[{"qid":1,"correct":"A"},{"qid":2,"correct":"B"}]', now()) returning id into v_mock2;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  begin -- (a) a passed mock row from the browser
    insert into n400_quiz_attempts (user_id, mode, score, total_questions, passed, started_at, completed_at)
    values (v_uid, 'mock_test', 20, 20, true, now(), now());
    r := r || ' a=OPEN';
  exception when insufficient_privilege then r := r || ' a=denied';
  end;
  begin -- (b) a verdict under a real mock attempt
    insert into n400_question_attempts (attempt_id, question_id, was_correct) values (v_mock, 1, true);
    r := r || ' b=OPEN';
  exception when insufficient_privilege then r := r || ' b=denied';
  end;
  begin -- (c) a self-made answer key
    insert into n400_quiz_attempts (user_id, mode, slide_manifest, started_at)
    values (v_uid, 'practice', '[{"qid":1,"correct":"A"}]', now());
    r := r || ' c=OPEN';
  exception when insufficient_privilege then r := r || ' c=denied';
  end;
  -- (d) a practice attempt finalized as a mock
  insert into n400_quiz_attempts (user_id, mode, score, total_questions)
  values (v_uid, 'practice', 0, 0) returning id into v_practice;
  insert into n400_question_attempts (attempt_id, question_id, was_correct)
  select v_practice, g, true from generate_series(1, 12) g;
  begin
    v := public.finalize_mock_attempt_batch(v_practice, '[]'::jsonb);
    r := r || ' d=OPEN';
  exception when raise_exception then r := r || ' d=' || sqlerrm;
  end;
  begin -- (e) words on a practice answer
    insert into n400_question_attempts (attempt_id, question_id, was_correct, transcript)
    values (v_practice, 13, true, 'x');
    r := r || ' e=OPEN';
  exception when insufficient_privilege then r := r || ' e=denied';
  end;
  begin perform public.finalize_mock_attempt(v_mock2); r := r || ' f1=OPEN';
  exception when insufficient_privilege then r := r || ' f1=denied'; end;
  begin perform public.submit_mock_answer(v_mock2, 1, 'A'); r := r || ' f2=OPEN';
  exception when insufficient_privilege then r := r || ' f2=denied'; end;
  begin perform public.finalize_practice_attempt(v_practice); r := r || ' f3=OPEN';
  exception when insufficient_privilege then r := r || ' f3=denied'; end;

  -- legit: a practice envelope and its answer
  insert into n400_quiz_attempts (user_id, mode, score, total_questions, completed_at)
  values (v_uid, 'practice', 1, 1, now()) returning id into v_practice;
  insert into n400_question_attempts (attempt_id, question_id, was_correct) values (v_practice, 5, true);
  r := r || ' practice=ok';
  -- legit: picks graded against the server key
  v := public.finalize_mock_attempt_batch(v_mock, '[{"qid":1,"selected":"A"},{"qid":2,"selected":"C"}]');
  r := r || format(' batch=%s/%s passed=%s', v->>'score', v->>'total', v->>'passed');
  select count(*) into n from n400_question_attempts where attempt_id = v_mock;
  r := r || ' own_rows=' || n;

  -- legit: the voice batch, as the service role
  perform set_config('role', 'service_role', true);
  v := public.finalize_mock_attempt_voice_batch(v_mock2, v_uid, 'voice',
    '[{"qid":1,"was_correct":true,"transcript":"x"},{"qid":2,"was_correct":false,"transcript":"y"}]');
  r := r || format(' voice=%s/%s', v->>'score', v->>'total');

  -- legit: Reset
  perform set_config('role', 'authenticated', true);
  perform public.n400_reset_my_progress();
  r := r || ' reset=ok';

  raise exception 'PROBE%', r;
end $probe$;
```

- [ ] **Step 7: GREEN on prod**

Paste the full text of `n400_37_civics_mock_lockdown.sql` at the marker and run the block again.

Expected error text: `PROBE a=denied b=denied c=denied d=unauthorized e=denied f1=denied f2=denied f3=denied practice=ok batch=1/2 passed=false own_rows=2 voice=1/2 reset=ok`.

If `set_config('role', 'service_role', true)` is rejected, replace that line with `perform set_config('role', 'postgres', true);`. The voice batch's grants are not touched by this migration; the call only proves it still works. Any other difference: STOP and fix the migration.

- [ ] **Step 8: Apply**

Call `mcp__supabase__apply_migration` with `name: n400_37_civics_mock_lockdown` and the file's full text.
Expected: `{"success":true}`.

- [ ] **Step 9: Post-check**

1. Run the Step 6 block again **without** the migration text. Expected: the same line as Step 7, because the rules are now live.
2. Then run:

```sql
select (select count(*) from n400_quiz_attempts where started_at > now() - interval '10 minutes' and total_questions = 2 and mode = 'mock_test') as probe_residue,
       has_function_privilege('authenticated', 'public.finalize_mock_attempt_batch(uuid, jsonb)'::regprocedure, 'EXECUTE') as batch_open,
       has_function_privilege('authenticated', 'public.finalize_mock_attempt(uuid)'::regprocedure, 'EXECUTE') as single_open;
```

   Expected: `probe_residue=0`, `batch_open=true`, `single_open=false`.
3. Call `mcp__supabase__get_advisors` with `type: security`. Expected: no new finding about these policies or functions.

Rollback, if ever needed:

```sql
DROP POLICY IF EXISTS "n400 attempts own practice insert" ON public.n400_quiz_attempts;
CREATE POLICY "n400 attempts own insert" ON public.n400_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "n400 question attempts own select" ON public.n400_question_attempts;
DROP POLICY IF EXISTS "n400 question attempts own practice insert" ON public.n400_question_attempts;
CREATE POLICY "n400 question attempts own" ON public.n400_question_attempts FOR ALL
  USING (EXISTS (SELECT 1 FROM n400_quiz_attempts WHERE n400_quiz_attempts.id = n400_question_attempts.attempt_id AND n400_quiz_attempts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM n400_quiz_attempts WHERE n400_quiz_attempts.id = n400_question_attempts.attempt_id AND n400_quiz_attempts.user_id = auth.uid()));
GRANT EXECUTE ON FUNCTION public.finalize_mock_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mock_answer(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_practice_attempt(uuid) TO authenticated;
```

Then run the two saved function definitions from `n400_37_rollback_functions.sql` in the session scratchpad directory.

- [ ] **Step 10: Commit**

```bash
git add apps/website/supabase/migrations/n400_37_civics_mock_lockdown.sql apps/website/src/lib/n400/civics-mock-lockdown-migration.test.ts
git commit -m "fix(n400app): n400_37 — only the server writes Civics mock results

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: `n400_38` — RLS performance rewrite + FK indexes

**Files:**
- Create: `apps/website/supabase/migrations/n400_38_rls_perf.sql`
- Test: `apps/website/src/lib/n400/rls-perf-migration.test.ts`

**Interfaces:**
- Consumes: the policy set after `n400_37`: 49 policies on 22 tables (48 before `n400_37`, which replaced 2 with 3), listed by `select tablename, policyname from pg_policies where tablename like 'n400%'`.
- Produces: 65 policies replacing 43. The 4 `USING (true)` public reads and the 2 `n400_37` insert policies stay.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §3.3. Pins the shape of the rewrite; the before/after access
// matrix on prod (plan Task 11) proves nobody's access changed.
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/n400_38_rls_perf.sql'), 'utf8');
const code = sql.replace(/--.*$/gm, '');
const policies = code.match(/CREATE POLICY [\s\S]*?;/g) ?? [];

describe('n400_38_rls_perf', () => {
  it('runs every auth check once per query', () => {
    expect(code).not.toMatch(/(?<!select )auth\.uid\(\)/);
    expect(code).not.toMatch(/(?<!select public\.)is_admin\(\)/);
    expect(code).not.toMatch(/(?<!select public\.)is_staff_or_admin\(\)/);
    expect(code).not.toContain('auth.role()');
    expect(code).not.toMatch(/FROM profiles/i);
  });

  it('replaces 43 policies with 65 and never uses FOR ALL', () => {
    expect(code.match(/^DROP POLICY IF EXISTS /gm)).toHaveLength(43);
    expect(policies).toHaveLength(65);
    expect(code).not.toMatch(/FOR ALL/);
  });

  it('one permissive policy per table, role and action', () => {
    const seen = new Set<string>();
    for (const p of policies) {
      const m = p.match(/ON public\.(\w+)\s+FOR (SELECT|INSERT|UPDATE|DELETE) TO (anon|authenticated)\b/);
      expect(m, p).not.toBeNull();
      const key = `${m![1]} ${m![2]} ${m![3]}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it('helper-calling policies are for authenticated only', () => {
    for (const p of policies) {
      if (/is_(staff_or_)?admin\(\)/.test(p)) expect(p, p).toMatch(/ TO authenticated\b/);
    }
  });

  it('keeps the public lookup reads and the n400_37 insert policies', () => {
    for (const name of ['n400 location answers public read', 'n400 state data public read', 'n400 reps public read', 'n400_badges_read_all', 'n400 attempts own practice insert', 'n400 question attempts own practice insert']) {
      expect(code).not.toContain(`"${name}"`);
    }
  });

  it('indexes the four unindexed foreign keys', () => {
    for (const idx of [
      'n400_bookmarks_question_id_idx ON public.n400_bookmarks (question_id)',
      'n400_consultation_requests_user_id_idx ON public.n400_consultation_requests (user_id)',
      'n400_user_badges_slug_idx ON public.n400_user_badges (slug)',
      'n400_user_badges_trigger_attempt_id_idx ON public.n400_user_badges (trigger_attempt_id)',
    ]) {
      expect(code).toContain(`CREATE INDEX IF NOT EXISTS ${idx};`);
    }
  });
});
```

- [ ] **Step 2: Run it, see it fail**

Run: `npx vitest run src/lib/n400/rls-perf-migration.test.ts`
Expected: FAIL, `ENOENT`.

- [ ] **Step 3: Write the migration**

Create `apps/website/supabase/migrations/n400_38_rls_perf.sql`:

```sql
-- One auth evaluation per query and one permissive policy per (table, role,
-- action) on every n400_* table (RLS hardening spec §3.3). A pure rewrite: who
-- can read or write what does not change, which the before/after access matrix
-- in plan Task 11 proved on prod before this was applied.
--
-- Rules: auth.uid() becomes (select auth.uid()); the helpers become
-- (select public.is_admin()) / (select public.is_staff_or_admin()); the inline
-- admin EXISTS over profiles becomes (select public.is_admin()), which has the
-- same definition; auth.role() = 'authenticated' becomes TO authenticated
-- USING (true); own-read and admin/staff-read merge into one SELECT; admin
-- FOR ALL splits into INSERT / UPDATE / DELETE. Policies that call a helper are
-- TO authenticated: anon has no EXECUTE on the helpers. The four public lookup
-- tables keep their USING (true) read untouched, and the two n400_37 insert
-- policies stay. Plus covering indexes for four foreign keys.

-- n400_questions: soft-deleted rows stay visible to admins only.
DROP POLICY IF EXISTS "n400 questions admin write" ON public.n400_questions;
DROP POLICY IF EXISTS "n400 questions public read" ON public.n400_questions;
CREATE POLICY "n400 questions anon read" ON public.n400_questions
  FOR SELECT TO anon USING (deleted_at IS NULL);
CREATE POLICY "n400 questions read" ON public.n400_questions
  FOR SELECT TO authenticated USING (deleted_at IS NULL OR (select public.is_admin()));
CREATE POLICY "n400 questions admin insert" ON public.n400_questions
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 questions admin update" ON public.n400_questions
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 questions admin delete" ON public.n400_questions
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_answers: same as n400_questions.
DROP POLICY IF EXISTS "n400 answers admin write" ON public.n400_answers;
DROP POLICY IF EXISTS "n400 answers public read" ON public.n400_answers;
CREATE POLICY "n400 answers anon read" ON public.n400_answers
  FOR SELECT TO anon USING (deleted_at IS NULL);
CREATE POLICY "n400 answers read" ON public.n400_answers
  FOR SELECT TO authenticated USING (deleted_at IS NULL OR (select public.is_admin()));
CREATE POLICY "n400 answers admin insert" ON public.n400_answers
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 answers admin update" ON public.n400_answers
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 answers admin delete" ON public.n400_answers
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_location_answers: the public read stays.
DROP POLICY IF EXISTS "n400 location answers admin write" ON public.n400_location_answers;
CREATE POLICY "n400 location answers admin insert" ON public.n400_location_answers
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 location answers admin update" ON public.n400_location_answers
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 location answers admin delete" ON public.n400_location_answers
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_state_data: the public read stays.
DROP POLICY IF EXISTS "n400 state data admin write" ON public.n400_state_data;
CREATE POLICY "n400 state data admin insert" ON public.n400_state_data
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 state data admin update" ON public.n400_state_data
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 state data admin delete" ON public.n400_state_data
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_representatives: the public read stays.
DROP POLICY IF EXISTS "n400 reps admin write" ON public.n400_representatives;
CREATE POLICY "n400 reps admin insert" ON public.n400_representatives
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 reps admin update" ON public.n400_representatives
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 reps admin delete" ON public.n400_representatives
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_badges: the public read stays.
DROP POLICY IF EXISTS "n400_badges_admin_write" ON public.n400_badges;
CREATE POLICY "n400 badges admin insert" ON public.n400_badges
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 badges admin update" ON public.n400_badges
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 badges admin delete" ON public.n400_badges
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_feature_flags: signed-in read, admin write.
DROP POLICY IF EXISTS "n400 feature flags admin" ON public.n400_feature_flags;
DROP POLICY IF EXISTS "n400 feature flags read" ON public.n400_feature_flags;
CREATE POLICY "n400 feature flags read" ON public.n400_feature_flags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "n400 feature flags admin insert" ON public.n400_feature_flags
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 feature flags admin update" ON public.n400_feature_flags
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 feature flags admin delete" ON public.n400_feature_flags
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_growth_rules: signed-in read, admin write.
DROP POLICY IF EXISTS "n400 growth rules admin" ON public.n400_growth_rules;
DROP POLICY IF EXISTS "n400 growth rules read" ON public.n400_growth_rules;
CREATE POLICY "n400 growth rules read" ON public.n400_growth_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "n400 growth rules admin insert" ON public.n400_growth_rules
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 growth rules admin update" ON public.n400_growth_rules
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 growth rules admin delete" ON public.n400_growth_rules
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_cta_definitions: signed-in read, admin write.
DROP POLICY IF EXISTS "n400 cta defs admin" ON public.n400_cta_definitions;
DROP POLICY IF EXISTS "n400 cta defs read" ON public.n400_cta_definitions;
CREATE POLICY "n400 cta defs read" ON public.n400_cta_definitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "n400 cta defs admin insert" ON public.n400_cta_definitions
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 cta defs admin update" ON public.n400_cta_definitions
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 cta defs admin delete" ON public.n400_cta_definitions
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_prompt_definitions: signed-in read, admin write.
DROP POLICY IF EXISTS "n400 prompt defs admin" ON public.n400_prompt_definitions;
DROP POLICY IF EXISTS "n400 prompt defs read" ON public.n400_prompt_definitions;
CREATE POLICY "n400 prompt defs read" ON public.n400_prompt_definitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "n400 prompt defs admin insert" ON public.n400_prompt_definitions
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 prompt defs admin update" ON public.n400_prompt_definitions
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 prompt defs admin delete" ON public.n400_prompt_definitions
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_bookmarks: own rows; admins read all.
DROP POLICY IF EXISTS "n400 bookmarks own" ON public.n400_bookmarks;
DROP POLICY IF EXISTS "n400 bookmarks admin read" ON public.n400_bookmarks;
CREATE POLICY "n400 bookmarks read" ON public.n400_bookmarks
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_admin()));
CREATE POLICY "n400 bookmarks own insert" ON public.n400_bookmarks
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 bookmarks own update" ON public.n400_bookmarks
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 bookmarks own delete" ON public.n400_bookmarks
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- n400_section_attempts: own rows; admins read all.
DROP POLICY IF EXISTS "n400 section attempts own" ON public.n400_section_attempts;
DROP POLICY IF EXISTS "n400 section attempts admin read" ON public.n400_section_attempts;
CREATE POLICY "n400 section attempts read" ON public.n400_section_attempts
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_admin()));
CREATE POLICY "n400 section attempts own insert" ON public.n400_section_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 section attempts own update" ON public.n400_section_attempts
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 section attempts own delete" ON public.n400_section_attempts
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- n400_section_mock_results: own rows; admins read all.
DROP POLICY IF EXISTS "n400 section mock results own" ON public.n400_section_mock_results;
DROP POLICY IF EXISTS "n400 section mock results admin read" ON public.n400_section_mock_results;
CREATE POLICY "n400 section mock results read" ON public.n400_section_mock_results
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_admin()));
CREATE POLICY "n400 section mock results own insert" ON public.n400_section_mock_results
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 section mock results own update" ON public.n400_section_mock_results
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 section mock results own delete" ON public.n400_section_mock_results
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- n400_user_profile: own row; staff and admins read all.
DROP POLICY IF EXISTS "n400 user profile own write" ON public.n400_user_profile;
DROP POLICY IF EXISTS "n400 user profile own read" ON public.n400_user_profile;
DROP POLICY IF EXISTS "n400 user profile staff read" ON public.n400_user_profile;
CREATE POLICY "n400 user profile read" ON public.n400_user_profile
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_staff_or_admin()));
CREATE POLICY "n400 user profile own insert" ON public.n400_user_profile
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 user profile own update" ON public.n400_user_profile
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 user profile own delete" ON public.n400_user_profile
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- n400_user_badges: read-only for owners and admins (awards are server-side).
DROP POLICY IF EXISTS "n400_user_badges_read_own" ON public.n400_user_badges;
DROP POLICY IF EXISTS "n400_user_badges_admin_read" ON public.n400_user_badges;
CREATE POLICY "n400 user badges read" ON public.n400_user_badges
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_admin()));

-- n400_quiz_attempts: "n400 attempts own practice insert" (n400_37) stays.
DROP POLICY IF EXISTS "n400 attempts own select" ON public.n400_quiz_attempts;
DROP POLICY IF EXISTS "n400 attempts admin read" ON public.n400_quiz_attempts;
CREATE POLICY "n400 attempts read" ON public.n400_quiz_attempts
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_admin()));

-- n400_question_attempts: "n400 question attempts own practice insert" (n400_37) stays.
DROP POLICY IF EXISTS "n400 question attempts own select" ON public.n400_question_attempts;
DROP POLICY IF EXISTS "n400 question attempts admin read" ON public.n400_question_attempts;
CREATE POLICY "n400 question attempts read" ON public.n400_question_attempts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.n400_quiz_attempts a
                 WHERE a.id = n400_question_attempts.attempt_id
                   AND a.user_id = (select auth.uid()))
         OR (select public.is_admin()));

-- n400_growth_events: own rows; staff and admins read all.
DROP POLICY IF EXISTS "n400 growth events own insert client types" ON public.n400_growth_events;
DROP POLICY IF EXISTS "n400 growth events own read" ON public.n400_growth_events;
DROP POLICY IF EXISTS "n400 growth events staff read" ON public.n400_growth_events;
CREATE POLICY "n400 growth events read" ON public.n400_growth_events
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_staff_or_admin()));
CREATE POLICY "n400 growth events own insert client types" ON public.n400_growth_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid())
              AND event_type = ANY (ARRAY['checklist_viewed', 'consultation_form_opened']));

-- n400_lead_profiles: own row; staff and admins read all.
DROP POLICY IF EXISTS "n400 lead profiles own read" ON public.n400_lead_profiles;
DROP POLICY IF EXISTS "n400 lead profiles staff read" ON public.n400_lead_profiles;
CREATE POLICY "n400 lead profiles read" ON public.n400_lead_profiles
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_staff_or_admin()));

-- n400_profile_prompts: own row; staff and admins read all.
DROP POLICY IF EXISTS "n400 profile prompts own read" ON public.n400_profile_prompts;
DROP POLICY IF EXISTS "n400 profile prompts staff read" ON public.n400_profile_prompts;
CREATE POLICY "n400 profile prompts read" ON public.n400_profile_prompts
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_staff_or_admin()));

-- n400_consultation_requests: own insert/read; staff and admins read; admins update.
DROP POLICY IF EXISTS "n400 consultation own insert" ON public.n400_consultation_requests;
DROP POLICY IF EXISTS "n400 consultation own read" ON public.n400_consultation_requests;
DROP POLICY IF EXISTS "n400 consultation staff read" ON public.n400_consultation_requests;
DROP POLICY IF EXISTS "n400 consultation admin update" ON public.n400_consultation_requests;
CREATE POLICY "n400 consultation read" ON public.n400_consultation_requests
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_staff_or_admin()));
CREATE POLICY "n400 consultation own insert" ON public.n400_consultation_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 consultation admin update" ON public.n400_consultation_requests
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));

-- n400_cta_decision_log: staff and admins read.
DROP POLICY IF EXISTS "n400 cta decision log staff read" ON public.n400_cta_decision_log;
CREATE POLICY "n400 cta decision log staff read" ON public.n400_cta_decision_log
  FOR SELECT TO authenticated USING ((select public.is_staff_or_admin()));

-- Covering indexes for foreign keys (small tables: no CONCURRENTLY).
CREATE INDEX IF NOT EXISTS n400_bookmarks_question_id_idx ON public.n400_bookmarks (question_id);
CREATE INDEX IF NOT EXISTS n400_consultation_requests_user_id_idx ON public.n400_consultation_requests (user_id);
CREATE INDEX IF NOT EXISTS n400_user_badges_slug_idx ON public.n400_user_badges (slug);
CREATE INDEX IF NOT EXISTS n400_user_badges_trigger_attempt_id_idx ON public.n400_user_badges (trigger_attempt_id);
```

- [ ] **Step 4: Run the test, see it pass**

Run: `npx vitest run src/lib/n400/rls-perf-migration.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Save a rollback script**

Run with `mcp__supabase__execute_sql`:

```sql
select string_agg(format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
         policyname, tablename, permissive, cmd, array_to_string(roles, ', '),
         case when qual is not null then ' USING (' || qual || ')' else '' end,
         case when with_check is not null then ' WITH CHECK (' || with_check || ')' else '' end),
       E'\n' order by tablename, policyname) as recreate_all
from pg_policies where schemaname = 'public' and tablename like 'n400%';
```

Save the output to `n400_38_rollback_policies.sql` in the session scratchpad directory. To roll back: drop the 65 new policies (their names are in the migration), then run this file.

- [ ] **Step 6: Equivalence matrix on prod (the proof)**

Run with `mcp__supabase__execute_sql`, after pasting the full text of `n400_38_rls_perf.sql` at the marker. The block measures every persona × table × action under the current policies, applies the new ones, measures again, and reports.

```sql
do $eq$
declare
  v_admin uuid := (select id from profiles where role = 'admin' order by created_at limit 1);
  v_a uuid := (select a.user_id from n400_quiz_attempts a join profiles p on p.id = a.user_id
               where p.role = 'client' group by a.user_id order by count(*) desc limit 1);
  v_b uuid := (select id from profiles where role = 'client' and id <> v_a order by created_at limit 1);
  v_staff uuid := (select id from profiles where role = 'client' and id not in (v_a, v_b) order by created_at limit 1);
  personas text[] := array['anon', 'client_a', 'client_b', 'staff', 'admin'];
  tables text[] := array['n400_answers', 'n400_badges', 'n400_bookmarks', 'n400_consultation_requests',
    'n400_cta_decision_log', 'n400_cta_definitions', 'n400_feature_flags', 'n400_growth_events',
    'n400_growth_rules', 'n400_lead_profiles', 'n400_location_answers', 'n400_profile_prompts',
    'n400_prompt_definitions', 'n400_question_attempts', 'n400_questions', 'n400_quiz_attempts',
    'n400_representatives', 'n400_section_attempts', 'n400_section_mock_results', 'n400_state_data',
    'n400_user_badges', 'n400_user_profile'];
  inserts jsonb := jsonb_build_object(
    'n400_bookmarks', 'insert into public.n400_bookmarks (user_id, question_id) values ($1, 127)',
    'n400_section_attempts', 'insert into public.n400_section_attempts (user_id, section, item_id, mode, was_correct) values ($1, ''whatmean'', ''wm-1'', ''practice'', true)',
    'n400_section_mock_results', 'insert into public.n400_section_mock_results (user_id, section, passed, score, total) values ($1, ''speaking'', true, 8, 10)',
    'n400_quiz_attempts', 'insert into public.n400_quiz_attempts (user_id, mode, score, total_questions, completed_at) values ($1, ''practice'', 1, 1, now())',
    'n400_question_attempts', 'insert into public.n400_question_attempts (attempt_id, question_id, was_correct) select a.id, 1, true from public.n400_quiz_attempts a where a.user_id = $1 and a.mode = ''practice'' limit 1',
    'n400_growth_events', 'insert into public.n400_growth_events (user_id, event_type) values ($1, ''consultation_form_opened'')',
    'n400_user_profile', 'insert into public.n400_user_profile (user_id) values ($1)',
    'n400_consultation_requests', 'insert into public.n400_consultation_requests (user_id, name, phone) values ($1, ''probe'', ''0'')',
    'n400_feature_flags', 'insert into public.n400_feature_flags (flag_key) values (''zz_probe'')',
    'n400_user_badges', 'insert into public.n400_user_badges (user_id, slug) select $1, slug from public.n400_badges limit 1',
    'n400_lead_profiles', 'insert into public.n400_lead_profiles (user_id) values ($1)');
  pk jsonb;
  m jsonb; before_m jsonb; diff jsonb;
  who text; t text; k text; uid uuid; n int;
begin
  if v_admin is null or v_a is null or v_b is null or v_staff is null then
    raise exception 'need 1 admin + 3 clients';
  end if;
  update profiles set role = 'staff' where id = v_staff;  -- rolled back with the block
  select jsonb_object_agg(c.relname, a.attname) into pk
  from pg_index i
  join pg_class c on c.oid = i.indrelid
  join pg_namespace ns on ns.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
  where i.indisprimary and ns.nspname = 'public' and c.relname = any (tables);

  for phase in 1..2 loop
    if phase = 2 then
      perform set_config('role', 'postgres', true);
      -- ▼ paste the full text of n400_38_rls_perf.sql here
      -- ▲
    end if;
    m := '{}'::jsonb;
    foreach who in array personas loop
      uid := case who when 'client_b' then v_b when 'staff' then v_staff when 'admin' then v_admin else v_a end;
      if who = 'anon' then
        perform set_config('role', 'anon', true);
        perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      else
        perform set_config('role', 'authenticated', true);
        perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
      end if;
      foreach t in array tables loop
        k := who || '.' || t;
        begin
          execute format('select count(*) from public.%I', t) into n;
          m := m || jsonb_build_object(k || '.select', n);
        exception when others then
          m := m || jsonb_build_object(k || '.select', 'err:' || sqlstate);
        end;
        begin
          execute format('with u as (update public.%I set %I = %I returning 1) select count(*) from u', t, pk->>t, pk->>t) into n;
          raise exception 'undo';
        exception when others then
          m := m || jsonb_build_object(k || '.update', case when sqlerrm = 'undo' then to_jsonb(n) else to_jsonb('err:' || sqlstate) end);
        end;
        begin
          execute format('with d as (delete from public.%I returning 1) select count(*) from d', t) into n;
          raise exception 'undo';
        exception when others then
          m := m || jsonb_build_object(k || '.delete', case when sqlerrm = 'undo' then to_jsonb(n) else to_jsonb('err:' || sqlstate) end);
        end;
        if inserts ? t then
          begin
            execute inserts->>t using uid;
            get diagnostics n = row_count;
            raise exception 'undo';
          exception when others then
            m := m || jsonb_build_object(k || '.insert', case when sqlerrm = 'undo' then to_jsonb(n) else to_jsonb('err:' || sqlstate) end);
          end;
        end if;
      end loop;
    end loop;
    if phase = 1 then before_m := m; end if;
  end loop;

  select jsonb_object_agg(key, jsonb_build_array(before_m->key, m->key)) into diff
  from jsonb_object_keys(before_m || m) as key
  where before_m->key is distinct from m->key;
  if diff is null then
    raise exception 'EQUIVALENT % cells', (select count(*) from jsonb_object_keys(m));
  end if;
  raise exception 'DIFF %', diff;
end $eq$;
```

Expected error text: `EQUIVALENT 385 cells`. That is 5 personas × (22 tables × 3 actions + 11 insert probes) = 5 × 77.

A `DIFF {…}` lists every cell that changed as `[before, after]`. STOP and fix the migration until the block reports `EQUIVALENT`. Do not apply on a DIFF.

- [ ] **Step 7: Apply**

Call `mcp__supabase__apply_migration` with `name: n400_38_rls_perf` and the file's full text.
Expected: `{"success":true}`.

- [ ] **Step 8: Post-check**

1. Call `mcp__supabase__get_advisors` with `type: performance`. Expected: no `auth_rls_initplan`, no `multiple_permissive_policies` and no `unindexed_foreign_keys` entry whose table starts with `n400_`. Entries for internal_app tables and `profiles` are out of scope and stay.
2. Call `mcp__supabase__get_advisors` with `type: security`. Expected: nothing new about `n400_*`.
3. Run with `mcp__supabase__execute_sql`:

```sql
select (select count(*) from pg_policies where schemaname = 'public' and tablename like 'n400%') as policies,
       (select count(*) from n400_feature_flags where flag_key = 'zz_probe') as probe_residue;
```

   Expected: `policies=71` (49 − 43 + 65) and `probe_residue=0`.

- [ ] **Step 9: Commit**

```bash
git add apps/website/supabase/migrations/n400_38_rls_perf.sql apps/website/src/lib/n400/rls-perf-migration.test.ts
git commit -m "perf(n400app): n400_38 — RLS auth checks once per query, one policy per action, FK indexes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: ROADMAP, review, merge

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: ROADMAP**

In `docs/ROADMAP.md`:

1. In the `**Current Phase:**` line, replace `RLS hardening (initplan + duplicate policies + FK indexes) and OAuth-gated features pending credentials.` with `OAuth-gated features pending credentials.`
2. Set `**Last updated:**` to today's date.
3. Add this line directly after the `- [x] N400 Civics oral answers — …` line:

```markdown
- [x] N400 RLS hardening — R1 `n400_35` (internal SECURITY DEFINER functions no longer callable by anon/clients: `n400_emit_growth_event` let anyone write growth events for any user), R3 every Civics mock graded and written by the server (standalone + the Full interview's Civics part via `startMockAttempt(kind)` with the service role; `n400_37` write lockdown closed four ways to forge a pass + CAPI; CAPI stays standalone-only), Reset really wipes progress (`n400_36` RPC), R2 `n400_38` every `n400_*` policy rewritten for one auth evaluation per query and one policy per action, FK indexes; access proven unchanged by a before/after matrix (specs/2026-10-08-n400-rls-hardening-design.md)
```

- [ ] **Step 2: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: ROADMAP — N400 RLS hardening shipped

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Final whole-branch review**

Use superpowers:requesting-code-review on `main..feat/n400-rls-hardening`. The commits after Task 9 are migrations, their tests and docs. Fix every Critical or Important finding in its own commit, with a test, before merging.

- [ ] **Step 4: Merge + push (ask the owner first)**

Run from the root folder:

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git switch main && git merge --ff-only feat/n400-rls-hardening && git push origin main && git branch -d feat/n400-rls-hardening
```

The root folder is the working checkout, so it is already in sync.
