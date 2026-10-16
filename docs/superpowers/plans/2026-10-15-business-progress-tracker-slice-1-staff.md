# Business Progress Tracker — Slice 1 (Staff Tracking) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin create a job from a template (Texas LLC, business bank account, business website), see its steps and progress, and update each step, in `apps/internal_app`.

**Architecture:** `jobs` is repaired and extended with `job_templates`, `job_template_steps` and `job_steps`; the steps are copied from the template when the job is created. `jobs.status` follows the steps through a database trigger that mirrors a pure TypeScript function. Access is admin-only through RLS. Next.js server actions are thin wrappers over a database-access module (`lib/jobs/jobs-db.ts`) that receives the Supabase client as an argument, so it can be unit tested.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, TypeScript strict, Tailwind v4, Supabase (Postgres, RLS, PostgREST) driven through the Supabase MCP tools, Jest with ts-jest via `next/jest`.

**Spec:** `docs/superpowers/specs/2026-10-15-business-progress-tracker-design.md`, approved by the owner on 2026-10-15. This plan is slice 1 only; slices 0 (deploy), 2 (email) and 3 (portal) get their own plans.

## Global Constraints

- Migrations live in `apps/internal_app/supabase/migrations/`. This slice is `010_job_templates_and_steps.sql`, applied to prod with `apply_migration` under the name `job_templates_and_steps`.
- RLS is admin only. Every policy is `TO authenticated`, checks are written `(select public.is_admin())`, there is one policy per (table, action), and each table gets `REVOKE ALL ON TABLE … FROM anon, PUBLIC`.
- SECURITY DEFINER functions use `SET search_path = public` and `REVOKE EXECUTE … FROM PUBLIC, anon` (plus `authenticated` when only triggers call them).
- All three templates use `service_type = 'tax'` (the "Tax & Business" category of the website).
- The staff UI is English; step titles show English with Vietnamese below.
- `jobs.status` follows the steps: every step `done` or `skipped` → `complete`; any step `in_progress`, `waiting_client` or `done` → `in_progress`; otherwise `open`; a job with no steps keeps its status. `deriveJobStatus` and the trigger must agree.
- `percent` is `floor(done / total * 100)` over steps that are not skipped; no steps → 0; every step skipped → 100.
- v1 is admin-only: do not change `src/middleware.ts` or the menu filter in `src/app/(app)/layout.tsx`.
- New files must be ESLint-clean (the app has 91 pre-existing problems elsewhere; none may be added).
- Unit tests only (CLAUDE.md, Phase 2 scope). No integration tests, no E2E.
- Next.js 16: read the relevant pages under `apps/internal_app/node_modules/next/dist/docs/` before writing page or action code (`apps/internal_app/AGENTS.md`).
- The SQL tool (`execute_sql`) refuses any text containing the word `drop`, comments included. Real `DROP` statements go through `apply_migration` only. Do not hide the word to get past the tool.
- Commits: one task, one commit, `type(scope): message`, ending with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Work on `main` in the repo root (project convention, no worktree). Do not push without the owner's explicit go-ahead.

## Review Focus

The spec says what the feature must do; these are the inputs it implies but no obvious test would cover, most likely first.

1. **Reopening finished work.** A step moved from `done` back to `todo` must clear `completed_at`, and a `complete` job must fall back to `in_progress` (or `open`). Pinned by the reopen tests of `deriveJobStatus` (Task 1) and the probe lines `STEP1 reopened to todo` and `REOPEN finished job` (Tasks 2 and 3).
2. **A fee typed the way people type it.** `1,500`, `$1,500.50`, blank, and the Vietnamese `1.500` (one thousand five hundred), which must be refused rather than stored as $1.50. Pinned by the `parseFee` tests (Task 4).
3. **A deadline shown one day early.** `new Date('2026-10-20')` is UTC midnight and displays as Oct 19 in Texas. Pages format date-only values with `formatDate` (a string split). Pinned by the `formatDate` tests and a grep (Task 9).
4. **A bad id in the URL.** `/jobs/not-a-uuid` and `/jobs/new?client_id=garbage` must give a 404 or an empty picker, never a crash. Pinned by the `isUuid` tests (Task 4); `getJob` and `getClientBrief` guard with it (Task 5); the detail page calls `notFound()` (Task 6) and the New Job page ignores a bad prefill (Task 8).
5. **A job without steps** (hand-made, or created by the cross-sell flow). It must show a dash instead of "0/0", the detail page must say it has no steps, and the trigger must leave its status alone. Pinned by the `formatProgressLabel` and `deriveProgress([])` tests (Task 1), the probe line `MANUAL job` (Tasks 2 and 3) and the empty-steps card (Task 6).

Also covered: a double click on "Create job" (the button stays disabled while pending and after success, Task 8); deleting a job that has steps (probe line `DELETE job`); notes capped at 5000 characters (Task 4).

## Conventions for every task

- Repo root: `/Users/anhnguyen/Obsidian/Business planning`. Run commands from there. Quote paths: several contain parentheses and brackets.
- `SP` below means your session scratchpad directory. Put temporary files there, never in the repo.
- Baselines measured on 2026-10-15 before this plan: `pnpm --filter internal_app test` → 7 suites, 35 tests; ESLint over the whole app → `✖ 91 problems (82 errors, 9 warnings)`; `pnpm --filter internal_app build` passes and lists `/jobs` but not `/jobs/[id]` or `/jobs/new`.
- Prod facts the probes rely on: exactly one `admin` profile (the owner) and six `client` profiles; the `clients` table has two test rows; `jobs` is empty; `job_templates`, `job_template_steps` and `job_steps` do not exist yet.

---

### Task 1: Pure progress logic

**Files:**
- Create: `apps/internal_app/src/lib/jobs/progress.ts`
- Test: `apps/internal_app/__tests__/lib/jobs/progress.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (all from `@/lib/jobs/progress`): `STEP_STATUSES`, `StepStatus`, `STEP_OWNERS`, `StepOwner`, `JobStatus`, `ProgressStep`, `Progress`, `deriveJobStatus(steps): JobStatus | null`, `deriveProgress(steps): Progress`, `formatProgressLabel(progress, stepCount): string`, `STEP_STATUS_LABELS`, `STEP_OWNER_LABELS`.

- [ ] **Step 1: Write the failing test**

Create `apps/internal_app/__tests__/lib/jobs/progress.test.ts`:

```ts
import {
  STEP_OWNERS,
  STEP_OWNER_LABELS,
  STEP_STATUSES,
  STEP_STATUS_LABELS,
  deriveJobStatus,
  deriveProgress,
  formatProgressLabel,
  type StepStatus,
} from '@/lib/jobs/progress'

const steps = (...statuses: StepStatus[]) => statuses.map((status) => ({ status }))
const repeat = (status: StepStatus, count: number) =>
  Array.from({ length: count }, () => ({ status }))

describe('deriveJobStatus', () => {
  it('has no opinion about a job without steps, so a hand-set status stays', () => {
    expect(deriveJobStatus([])).toBeNull()
  })

  it('is open while every step is still todo', () => {
    expect(deriveJobStatus(steps('todo', 'todo', 'todo'))).toBe('open')
  })

  it.each<StepStatus>(['in_progress', 'waiting_client', 'done'])(
    'is in_progress as soon as one step is %s',
    (started) => {
      expect(deriveJobStatus(steps('todo', started, 'todo'))).toBe('in_progress')
    }
  )

  it('is complete when every step is done or skipped', () => {
    expect(deriveJobStatus(steps('done', 'skipped', 'done'))).toBe('complete')
  })

  it('is complete when every step is skipped', () => {
    expect(deriveJobStatus(steps('skipped', 'skipped'))).toBe('complete')
  })

  it('reopens: a finished job goes back to in_progress when one step returns to todo', () => {
    expect(deriveJobStatus(steps('done', 'done', 'done'))).toBe('complete')
    expect(deriveJobStatus(steps('done', 'done', 'todo'))).toBe('in_progress')
  })

  it('reopens all the way to open once nothing has been started again', () => {
    expect(deriveJobStatus(steps('done', 'todo', 'todo'))).toBe('in_progress')
    expect(deriveJobStatus(steps('todo', 'todo', 'todo'))).toBe('open')
  })

  it('a skipped step alone does not start the job', () => {
    expect(deriveJobStatus(steps('skipped', 'todo'))).toBe('open')
  })
})

describe('deriveProgress', () => {
  it('is 0 of 0 for a job without steps', () => {
    expect(deriveProgress([])).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it('counts done steps over the steps that are not skipped', () => {
    const eight = steps('done', 'done', 'done', 'todo', 'todo', 'todo', 'todo', 'todo')
    expect(deriveProgress(eight)).toEqual({ done: 3, total: 8, percent: 37 })
  })

  it('leaves skipped steps out of the total', () => {
    expect(deriveProgress(steps('done', 'skipped', 'todo'))).toEqual({
      done: 1,
      total: 2,
      percent: 50,
    })
  })

  it('is 100 percent when every step is skipped, because nothing is left to do', () => {
    expect(deriveProgress(steps('skipped', 'skipped'))).toEqual({ done: 0, total: 0, percent: 100 })
  })

  it('never rounds up to 100 while a step is left', () => {
    const almost = [...repeat('done', 199), ...repeat('todo', 1)]
    expect(deriveProgress(almost).percent).toBe(99)
  })

  it('is 100 when every counted step is done', () => {
    expect(deriveProgress(steps('done', 'done'))).toEqual({ done: 2, total: 2, percent: 100 })
  })
})

describe('formatProgressLabel', () => {
  it('shows a dash for a job without steps instead of 0/0', () => {
    expect(formatProgressLabel(deriveProgress([]), 0)).toBe('—')
  })

  it('says so when every step was skipped', () => {
    const skipped = steps('skipped', 'skipped')
    expect(formatProgressLabel(deriveProgress(skipped), skipped.length)).toBe('All skipped')
  })

  it('shows done over total', () => {
    const three = steps('done', 'in_progress', 'todo')
    expect(formatProgressLabel(deriveProgress(three), three.length)).toBe('1/3')
  })
})

describe('labels', () => {
  it.each(STEP_STATUSES)('has English and Vietnamese text for status %s', (status) => {
    expect(STEP_STATUS_LABELS[status].en).not.toBe('')
    expect(STEP_STATUS_LABELS[status].vi).not.toBe('')
  })

  it.each(STEP_OWNERS)('has English and Vietnamese text for owner %s', (owner) => {
    expect(STEP_OWNER_LABELS[owner].en).not.toBe('')
    expect(STEP_OWNER_LABELS[owner].vi).not.toBe('')
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/progress.test.ts`
Expected: FAIL, `Cannot find module '@/lib/jobs/progress'`.

- [ ] **Step 3: Write the implementation**

Create `apps/internal_app/src/lib/jobs/progress.ts`:

```ts
/**
 * Pure progress logic for templated jobs. No Supabase, no React.
 *
 * deriveJobStatus MUST mirror the job_steps_sync_job() trigger in
 * supabase/migrations/010_job_templates_and_steps.sql. Change both together.
 */

export const STEP_STATUSES = ['todo', 'in_progress', 'waiting_client', 'done', 'skipped'] as const
export type StepStatus = (typeof STEP_STATUSES)[number]

export const STEP_OWNERS = ['manna', 'client', 'third_party'] as const
export type StepOwner = (typeof STEP_OWNERS)[number]

export type JobStatus = 'open' | 'in_progress' | 'complete'

export interface ProgressStep {
  status: StepStatus
}

export interface Progress {
  done: number
  total: number
  percent: number
}

/**
 * The status a job follows from its steps, or null when it has none: a job
 * without steps keeps the status someone set by hand.
 */
export function deriveJobStatus(steps: ReadonlyArray<ProgressStep>): JobStatus | null {
  if (steps.length === 0) return null
  if (steps.every((s) => s.status === 'done' || s.status === 'skipped')) return 'complete'
  if (
    steps.some(
      (s) => s.status === 'in_progress' || s.status === 'waiting_client' || s.status === 'done'
    )
  ) {
    return 'in_progress'
  }
  return 'open'
}

/**
 * Done steps over the steps that are not skipped. floor, not round, so 199 of
 * 200 never shows 100% while a step is left; 100% means the job is complete.
 */
export function deriveProgress(steps: ReadonlyArray<ProgressStep>): Progress {
  if (steps.length === 0) return { done: 0, total: 0, percent: 0 }
  const total = steps.filter((s) => s.status !== 'skipped').length
  const done = steps.filter((s) => s.status === 'done').length
  // Every step skipped: nothing is left to do, which is what 'complete' means.
  if (total === 0) return { done: 0, total: 0, percent: 100 }
  return { done, total, percent: Math.floor((done / total) * 100) }
}

/** "3/8", or a dash for a job without steps, so it never reads "0/0". */
export function formatProgressLabel(progress: Progress, stepCount: number): string {
  if (stepCount === 0) return '—'
  if (progress.total === 0) return 'All skipped'
  return `${progress.done}/${progress.total}`
}

export const STEP_STATUS_LABELS: Record<StepStatus, { en: string; vi: string }> = {
  todo: { en: 'To do', vi: 'Chưa làm' },
  in_progress: { en: 'In progress', vi: 'Đang làm' },
  waiting_client: { en: 'Waiting on client', vi: 'Chờ khách' },
  done: { en: 'Done', vi: 'Xong' },
  skipped: { en: 'Skipped', vi: 'Bỏ qua' },
}

export const STEP_OWNER_LABELS: Record<StepOwner, { en: string; vi: string }> = {
  manna: { en: 'Manna', vi: 'Manna' },
  client: { en: 'Client', vi: 'Khách' },
  third_party: { en: 'Third party', vi: 'Bên thứ ba' },
}
```

- [ ] **Step 4: Run it to see it pass, then the whole suite**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/progress.test.ts`
Expected: PASS, `Tests: 27 passed`.

Run: `pnpm --filter internal_app test`
Expected: `Test Suites: 8 passed`, `Tests: 62 passed` (35 existing + 27).

Run: `pnpm --filter internal_app exec eslint src/lib/jobs __tests__/lib/jobs`
Expected: no output (0 problems).

- [ ] **Step 5: Commit**

```bash
git add apps/internal_app/src/lib/jobs/progress.ts apps/internal_app/__tests__/lib/jobs/progress.test.ts
git commit -m "$(cat <<'EOF'
feat(internal-app): pure progress logic for templated jobs

deriveJobStatus, deriveProgress and formatProgressLabel, with the step status
and owner labels. deriveJobStatus mirrors the trigger that migration 010 adds;
a job without steps has no derived status and shows a dash, not 0/0.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Migration 010: write it and dry-run it on prod (nothing is applied)

**Files:**
- Create: `apps/internal_app/supabase/migrations/010_job_templates_and_steps.sql`
- Temporary (in `SP`, not committed): `plan-parts/probe_H.sql`, `plan-parts/probe_S.sql`, `plan-parts/probe_P.sql`, `plan-parts/assemble_probe.py`, the assembled `assembled/dryrun.sql` and `assembled/live.sql`

**Interfaces:**
- Consumes: existing `public.jobs`, `public.clients`, `public.cases`, `public.profiles`, and `public.is_admin()`.
- Produces (SQL objects other tasks rely on):
  - Tables `job_templates(key, service_type, title_en, title_vi, description_en, description_vi, active, created_at, updated_at)`, `job_template_steps(id, template_key, position, title_en, title_vi, description_en, description_vi, owner, client_visible)`, `job_steps(id, job_id, position, title_en, title_vi, description_en, description_vi, owner, client_visible, status, client_note, internal_note, started_at, completed_at, updated_by, created_at, updated_at)`.
  - New columns on `jobs`: `updated_at`, `template_key`, `case_id`; `jobs.created_by` now references `profiles(id)`.
  - Function `public.create_job_from_template(p_client_id uuid, p_template_key text, p_fee numeric default 0, p_deadline date default null, p_notes text default null) returns uuid`; it raises SQLSTATE `P0002` for an unknown or inactive template.
  - Trigger functions `set_updated_at`, `job_steps_before_write`, `job_steps_sync_job`.
  - 16 policies named `"<table> admin read|insert|update|delete"` on `jobs`, `job_steps`, `job_templates`, `job_template_steps`.
  - Seed: templates `tx_llc` (9 steps), `business_bank_account` (6), `business_website` (7).

This task works against the real production database but only inside transactions that always roll back. It uses the Supabase MCP tool `mcp__supabase__execute_sql`.

- [ ] **Step 1: Confirm the prod baseline**

Run through `execute_sql`:

```sql
select to_regclass('public.job_templates') as job_templates,
       to_regclass('public.job_steps') as job_steps,
       (select string_agg(policyname, ', ') from pg_policies where schemaname = 'public' and tablename = 'jobs') as jobs_policies,
       (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'jobs' and column_name in ('updated_at', 'template_key', 'case_id')) as new_jobs_columns,
       (select count(*) from public.jobs) as jobs_rows;
```

Expected: `job_templates` null, `job_steps` null, `jobs_policies` = `Client can read own jobs`, `new_jobs_columns` 0, `jobs_rows` 0. If anything differs, stop and report: the migration was applied or the schema moved.

- [ ] **Step 2: Write the probe parts and the assembler**

```bash
# SP is your session scratchpad directory (see "Conventions for every task"); set it in your shell first.
mkdir -p "$SP/plan-parts" "$SP/assembled"

cat > "$SP/plan-parts/probe_H.sql" <<'SQL'
do $outer$
declare
  admin_uid uuid; plain_uid uuid; staff_uid uuid; lnk_uid uuid;
  doe_id uuid;
  r record; t text; jr public.jobs%rowtype;
  n int; n2 int; line text; out text := '';
  probe_job uuid; v_job uuid; v_job2 uuid; v_job3 uuid; v_manual uuid;
  v_status text; v_status2 text; v_status3 text;
  v_flag boolean; v_flag2 boolean; v_flag3 boolean; v_err text;
begin
  select id into admin_uid from public.profiles where role = 'admin' order by created_at limit 1;
  select id into plain_uid from public.profiles where role = 'client' order by created_at limit 1 offset 0;
  select id into staff_uid from public.profiles where role = 'client' order by created_at limit 1 offset 1;
  select id into lnk_uid   from public.profiles where role = 'client' order by created_at limit 1 offset 2;
  update public.profiles set role = 'staff' where id = staff_uid;      -- simulated staff, rolled back
  select id into doe_id from public.clients order by created_at limit 1;
  update public.clients set user_id = lnk_uid where id = doe_id;        -- simulated linked client, rolled back
SQL

cat > "$SP/plan-parts/probe_S.sql" <<'SQL'

  -- Dry run only: stand-ins for the two statements the SQL tool will not carry.
  -- Both are rolled back with everything else.
  alter table public.jobs alter constraint jobs_created_by_fkey deferrable initially deferred;
  alter policy "Client can read own jobs" on public.jobs using (false);

  execute $mig$
@@MIGRATION@@
  $mig$;
SQL

cat > "$SP/plan-parts/probe_P.sql" <<'SQL'

  -- A. Seeds.
  out := out || 'SEED templates=' || (select count(*) from public.job_templates)
    || ' tx_llc=' || (select count(*) from public.job_template_steps where template_key = 'tx_llc')
    || ' business_bank_account=' || (select count(*) from public.job_template_steps where template_key = 'business_bank_account')
    || ' business_website=' || (select count(*) from public.job_template_steps where template_key = 'business_website')
    || ' blank_vi=' || (select count(*) from public.job_template_steps where coalesce(title_vi, '') = '' or coalesce(description_vi, '') = '') || E'\n';

  -- B. Access matrix: five roles against the four tables.
  for r in select * from (values ('anon', null::uuid), ('client', plain_uid), ('client+linked', lnk_uid), ('staff', staff_uid), ('admin', admin_uid)) as v(label, uid) loop
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    delete from public.jobs where description = 'zz probe';
    delete from public.job_templates where key = 'zz_probe';
    insert into public.jobs (created_by, client_id, service_type, description) values (admin_uid, doe_id, 'tax', 'zz probe') returning id into probe_job;

    if r.label = 'anon' then
      perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      execute 'set local role anon';
    else
      perform set_config('request.jwt.claims', json_build_object('sub', r.uid, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
    end if;

    line := 'MATRIX ' || rpad(r.label, 13) || ' read:';
    foreach t in array array['job_templates','job_template_steps','job_steps','jobs'] loop
      begin
        execute format('select count(*) from public.%I', t) into n;
        line := line || ' ' || t || '=' || n;
      exception when others then
        line := line || ' ' || t || '=ERR' || sqlstate;
      end;
    end loop;

    line := line || ' | write:';
    begin
      insert into public.job_templates (key, service_type, title_en, title_vi) values ('zz_probe', 'tax', 'zz', 'zz');
      line := line || ' ins_template=ok';
    exception when others then line := line || ' ins_template=ERR' || sqlstate; end;
    begin
      update public.job_templates set active = active; get diagnostics n = row_count;
      line := line || ' upd_template=' || n;
    exception when others then line := line || ' upd_template=ERR' || sqlstate; end;
    begin
      insert into public.jobs (created_by, client_id, service_type, description) values (coalesce(r.uid, admin_uid), doe_id, 'tax', 'zz probe');
      line := line || ' ins_job=ok';
    exception when others then line := line || ' ins_job=ERR' || sqlstate; end;
    begin
      update public.jobs set notes = notes; get diagnostics n = row_count;
      line := line || ' upd_job=' || n;
    exception when others then line := line || ' upd_job=ERR' || sqlstate; end;
    begin
      insert into public.job_steps (job_id, position, title_en, title_vi, owner, client_visible) values (probe_job, 1, 'zz probe', 'zz', 'manna', true);
      line := line || ' ins_step=ok';
    exception when others then line := line || ' ins_step=ERR' || sqlstate; end;
    begin
      delete from public.jobs where id = probe_job; get diagnostics n = row_count;
      line := line || ' del_job=' || n;
    exception when others then line := line || ' del_job=ERR' || sqlstate; end;

    out := out || line || E'\n';
    execute 'reset role';
  end loop;

  -- C. Functional checks as the admin.
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  delete from public.jobs where description = 'zz probe';
  delete from public.job_templates where key = 'zz_probe';
  perform set_config('request.jwt.claims', json_build_object('sub', admin_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  v_job  := public.create_job_from_template(doe_id, 'tx_llc', 1500, date '2026-12-31', 'probe note');
  v_job2 := public.create_job_from_template(doe_id, 'business_bank_account');
  v_job3 := public.create_job_from_template(doe_id, 'business_website', 0, null, null);

  select * into jr from public.jobs where id = v_job;
  select count(*) into n from public.job_steps where job_id = v_job;
  out := out || 'CREATE tx_llc: steps=' || n || ' status=' || jr.status || ' created_by_admin=' || (jr.created_by = admin_uid)
    || ' fee=' || jr.fee || ' deadline=' || coalesce(jr.deadline::text, 'null') || ' template=' || jr.template_key
    || ' service=' || jr.service_type || ' description=' || jr.description || E'\n';
  select count(*) into n from public.job_steps where job_id = v_job2;
  select count(*) into n2 from public.job_steps where job_id = v_job3;
  out := out || 'CREATE others: bank_steps=' || n || ' website_steps=' || n2 || E'\n';

  update public.job_steps set status = 'in_progress' where job_id = v_job and position = 1;
  select status into v_status from public.jobs where id = v_job;
  select (started_at is not null), (completed_at is null), (updated_by = admin_uid) into v_flag, v_flag2, v_flag3
    from public.job_steps where job_id = v_job and position = 1;
  out := out || 'STEP1 in_progress: job=' || v_status || ' started=' || v_flag || ' completed_null=' || v_flag2 || ' updated_by_admin=' || v_flag3 || E'\n';

  update public.job_steps set status = 'done' where job_id = v_job and position = 1;
  select status into v_status from public.jobs where id = v_job;
  select (completed_at is not null) into v_flag from public.job_steps where job_id = v_job and position = 1;
  out := out || 'STEP1 done: job=' || v_status || ' completed_set=' || v_flag || E'\n';

  update public.job_steps set status = 'todo' where job_id = v_job and position = 1;
  select status into v_status from public.jobs where id = v_job;
  select (completed_at is null) into v_flag from public.job_steps where job_id = v_job and position = 1;
  out := out || 'STEP1 reopened to todo: job=' || v_status || ' completed_null=' || v_flag || E'\n';

  update public.job_steps set status = 'done' where job_id = v_job;
  select status into v_status from public.jobs where id = v_job;
  select (count(*) = count(completed_at)) into v_flag from public.job_steps where job_id = v_job;
  out := out || 'ALL done: job=' || v_status || ' all_completed_set=' || v_flag || E'\n';

  update public.job_steps set status = 'todo' where job_id = v_job and position = 9;
  select status into v_status from public.jobs where id = v_job;
  select (completed_at is null) into v_flag from public.job_steps where job_id = v_job and position = 9;
  out := out || 'REOPEN finished job (step 9 to todo): job=' || v_status || ' step9_completed_null=' || v_flag || E'\n';

  update public.job_steps set status = 'skipped' where job_id = v_job2;
  select status into v_status from public.jobs where id = v_job2;
  update public.job_steps set status = 'waiting_client' where job_id = v_job3 and position = 1;
  select status into v_status2 from public.jobs where id = v_job3;
  out := out || 'SKIP/WAIT: all_skipped_job=' || v_status || ' waiting_client_job=' || v_status2 || E'\n';

  begin perform public.create_job_from_template(doe_id, 'does_not_exist'); v_err := 'no error';
  exception when others then v_err := sqlstate; end;
  out := out || 'ERR unknown_template=' || v_err;
  update public.job_templates set active = false where key = 'business_website';
  begin perform public.create_job_from_template(doe_id, 'business_website'); v_err := 'no error';
  exception when others then v_err := sqlstate; end;
  out := out || ' inactive_template=' || v_err;
  begin insert into public.job_steps (job_id, position, title_en, title_vi, owner, client_visible) values (v_job2, 1, 'dup', 'dup', 'manna', true); v_err := 'no error';
  exception when others then v_err := sqlstate; end;
  out := out || ' duplicate_position=' || v_err;
  begin update public.job_steps set status = 'bogus' where job_id = v_job2 and position = 1; v_err := 'no error';
  exception when others then v_err := sqlstate; end;
  out := out || ' bogus_status=' || v_err || E'\n';

  -- A hand-made job without steps keeps its status until it gets one.
  insert into public.jobs (created_by, client_id, service_type, description, status) values (admin_uid, doe_id, 'tax', 'zz manual', 'in_progress') returning id into v_manual;
  select status into v_status from public.jobs where id = v_manual;
  insert into public.job_steps (job_id, position, title_en, title_vi, owner, client_visible) values (v_manual, 1, 'zz', 'zz', 'manna', true);
  select status into v_status2 from public.jobs where id = v_manual;
  update public.job_steps set status = 'done' where job_id = v_manual;
  delete from public.job_steps where job_id = v_manual;
  select status into v_status3 from public.jobs where id = v_manual;
  out := out || 'MANUAL job: before=' || v_status || ' with_step=' || v_status2 || ' after_last_step_deleted=' || v_status3 || E'\n';

  -- Deleting a job removes its steps without error.
  delete from public.jobs where id = v_job; get diagnostics n = row_count;
  select count(*) into n2 from public.job_steps where job_id = v_job;
  out := out || 'DELETE job: rows=' || n || ' steps_left=' || n2 || E'\n';

  execute 'reset role';
  raise exception E'RESULT\n%', out;
end $outer$;
SQL

cat > "$SP/plan-parts/assemble_probe.py" <<'PY'
import pathlib
import re
import sys

# Usage: python3 -I assemble_probe.py <migration.sql> <parts-dir> <out-dir>
# Writes <out-dir>/dryrun.sql (migration minus the two statements the SQL tool
# refuses, run inside the rolled-back block) and <out-dir>/live.sql (probe only).
migration_path, parts_dir, out_dir = (pathlib.Path(a) for a in sys.argv[1:4])
migration = migration_path.read_text()

drop_fk = 'ALTER TABLE public.jobs DROP CONSTRAINT jobs_created_by_fkey;\n'
drop_policy = 'DROP POLICY IF EXISTS "Client can read own jobs" ON public.jobs;\n'
for needle in (drop_fk, drop_policy):
    assert migration.count(needle) == 1, 'expected exactly one: ' + needle.strip()

dry = migration.replace(drop_fk, '').replace(drop_policy, '')
add_fk = 'ALTER TABLE public.jobs ADD CONSTRAINT jobs_created_by_fkey\n'
assert dry.count(add_fk) == 1
dry = dry.replace(add_fk, 'ALTER TABLE public.jobs ADD CONSTRAINT jobs_created_by_profiles_dryrun_fkey\n')

# The SQL tool rejects any text containing the blocked keyword, comments included.
assert not re.search('drop', dry, re.IGNORECASE), 'the keyword is still in the dry-run text'

head = (parts_dir / 'probe_H.sql').read_text()
standins = (parts_dir / 'probe_S.sql').read_text().replace('@@MIGRATION@@', dry.rstrip('\n'))
body = (parts_dir / 'probe_P.sql').read_text()

out_dir.mkdir(parents=True, exist_ok=True)
(out_dir / 'dryrun.sql').write_text(head + standins + body)
(out_dir / 'live.sql').write_text(head + body)
print('wrote', out_dir / 'dryrun.sql', 'and', out_dir / 'live.sql')
PY
```

`probe_H` opens the block and picks the five test identities (a simulated staff user and a simulated linked client are made by editing rows inside the transaction). `probe_S` is used only for the dry run. `probe_P` holds the three groups of checks: A seeds, B the access matrix, C functional behaviour as the admin. Everything ends in `raise exception`, which rolls the whole transaction back and carries the results in the error message.

- [ ] **Step 3: Run the probe before the migration exists (it must fail)**

```bash
cat "$SP/plan-parts/probe_H.sql" "$SP/plan-parts/probe_P.sql" > "$SP/assembled/red.sql"
cat "$SP/assembled/red.sql"
```

Paste the printed script into `execute_sql`.
Expected: an error, SQLSTATE `42P01`, `relation "public.job_templates" does not exist`. Any other result means the tables already exist: stop.

- [ ] **Step 4: Write the migration**

Create `apps/internal_app/supabase/migrations/010_job_templates_and_steps.sql`:

```sql
-- 010_job_templates_and_steps.sql
--
-- Business progress tracker, slice 1 (spec 2026-10-15-business-progress-tracker-design.md).
-- A job (a client's service such as a Texas LLC, a website or a bank account)
-- gets an ordered list of steps copied from a template, a status that follows
-- those steps, and an admin-only access model.
--
-- It also repairs `jobs`, which nobody could use on prod:
--   created_by pointed at the empty legacy `users` table, so every insert failed
--   the foreign key; there was no updated_at (the portal queries it) and no
--   case_id (createCrossSellJob writes it); and the only policy let a client
--   read their own rows, with no staff or admin policy at all.
--
-- Access is admin only for now, matching the 2026-04-16 rule that staff do not
-- see Jobs. To open Jobs to staff later, change is_admin() to
-- is_staff_or_admin() in the policies below and lift the middleware and menu
-- rules; no schema change is needed.
--
-- Clients get no direct access. A row holds fee, notes and internal_note next
-- to columns a client may see, and RLS filters rows, not columns. The portal
-- will read through a function that returns only safe columns (slice 3).
--
-- Shape follows 009 and n400_38: one policy per (table, action), every policy
-- TO authenticated, auth checks wrapped in (select ...) so they run once per
-- query.

-- 1. Shared updated_at trigger function.
CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 2. Templates.
CREATE TABLE public.job_templates (
  key            text PRIMARY KEY,
  service_type   text NOT NULL CHECK (service_type IN ('immigration','tax','insurance','ai')),
  title_en       text NOT NULL,
  title_vi       text NOT NULL,
  description_en text,
  description_vi text,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER job_templates_set_updated_at_trg
  BEFORE UPDATE ON public.job_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.job_template_steps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key   text NOT NULL REFERENCES public.job_templates(key) ON DELETE CASCADE,
  position       int  NOT NULL CHECK (position > 0),
  title_en       text NOT NULL,
  title_vi       text NOT NULL,
  description_en text,
  description_vi text,
  owner          text NOT NULL DEFAULT 'manna' CHECK (owner IN ('manna','client','third_party')),
  client_visible boolean NOT NULL DEFAULT true,
  UNIQUE (template_key, position)
);

-- 3. Repair jobs.
ALTER TABLE public.jobs
  ADD COLUMN updated_at   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN template_key text REFERENCES public.job_templates(key),
  ADD COLUMN case_id      uuid REFERENCES public.cases(id) ON DELETE SET NULL;

ALTER TABLE public.jobs DROP CONSTRAINT jobs_created_by_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

CREATE INDEX jobs_created_by_idx   ON public.jobs (created_by);
CREATE INDEX jobs_template_key_idx ON public.jobs (template_key);
CREATE INDEX jobs_case_id_idx      ON public.jobs (case_id);

CREATE TRIGGER jobs_set_updated_at_trg
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Steps copied from a template into a job.
CREATE TABLE public.job_steps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  position       int  NOT NULL CHECK (position > 0),
  title_en       text NOT NULL,
  title_vi       text NOT NULL,
  description_en text,
  description_vi text,
  owner          text NOT NULL CHECK (owner IN ('manna','client','third_party')),
  client_visible boolean NOT NULL,
  status         text NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo','in_progress','waiting_client','done','skipped')),
  client_note    text,
  internal_note  text,
  started_at     timestamptz,
  completed_at   timestamptz,
  updated_by     uuid REFERENCES public.profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, position)
);
CREATE INDEX job_steps_updated_by_idx ON public.job_steps (updated_by);

-- started_at / completed_at / updated_by follow the status. Reopening a step
-- (done -> anything else) clears completed_at.
CREATE FUNCTION public.job_steps_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'todo' AND NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;
  IF NEW.status = 'done' THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.job_steps_before_write() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER job_steps_before_write_trg
  BEFORE INSERT OR UPDATE ON public.job_steps
  FOR EACH ROW EXECUTE FUNCTION public.job_steps_before_write();
CREATE TRIGGER job_steps_set_updated_at_trg
  BEFORE UPDATE ON public.job_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- jobs.status follows the steps. Keep in step with deriveJobStatus() in
-- apps/internal_app/src/lib/jobs/progress.ts. A job with no steps (hand-made,
-- or every step removed) keeps its status; only updated_at moves.
-- SECURITY DEFINER so the update works whoever edits the step.
CREATE FUNCTION public.job_steps_sync_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job             uuid;
  v_total           int;
  v_done_or_skipped int;
  v_started         int;
  v_status          text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_job := OLD.job_id;
  ELSE
    v_job := NEW.job_id;
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE status IN ('done', 'skipped')),
         count(*) FILTER (WHERE status IN ('in_progress', 'waiting_client', 'done'))
    INTO v_total, v_done_or_skipped, v_started
    FROM public.job_steps
   WHERE job_id = v_job;

  IF v_total = 0 THEN
    UPDATE public.jobs SET updated_at = now() WHERE id = v_job;
  ELSE
    v_status := CASE
      WHEN v_done_or_skipped = v_total THEN 'complete'
      WHEN v_started > 0 THEN 'in_progress'
      ELSE 'open'
    END;
    UPDATE public.jobs SET status = v_status, updated_at = now() WHERE id = v_job;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.job_steps_sync_job() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER job_steps_sync_job_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.job_steps
  FOR EACH ROW EXECUTE FUNCTION public.job_steps_sync_job();

-- 5. Create a job and copy the template's steps in one transaction.
-- SECURITY INVOKER: RLS decides who may call it, there is no hidden privilege.
CREATE FUNCTION public.create_job_from_template(
  p_client_id    uuid,
  p_template_key text,
  p_fee          numeric DEFAULT 0,
  p_deadline     date    DEFAULT NULL,
  p_notes        text    DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  t     public.job_templates;
  v_job uuid;
BEGIN
  SELECT * INTO t FROM public.job_templates WHERE key = p_template_key AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown or inactive template %', p_template_key USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.jobs (created_by, client_id, service_type, description, fee, deadline, notes, template_key)
  VALUES (auth.uid(), p_client_id, t.service_type, t.title_en, coalesce(p_fee, 0), p_deadline, p_notes, t.key)
  RETURNING id INTO v_job;

  INSERT INTO public.job_steps (job_id, position, title_en, title_vi, description_en, description_vi, owner, client_visible)
  SELECT v_job, s.position, s.title_en, s.title_vi, s.description_en, s.description_vi, s.owner, s.client_visible
    FROM public.job_template_steps s
   WHERE s.template_key = t.key
   ORDER BY s.position;

  RETURN v_job;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_job_from_template(uuid, text, numeric, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_job_from_template(uuid, text, numeric, date, text) TO authenticated;

-- 6. Row level security: admin only.
ALTER TABLE public.job_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_steps          ENABLE ROW LEVEL SECURITY;

-- The old policy let a client read their own jobs, fee and notes included.
DROP POLICY IF EXISTS "Client can read own jobs" ON public.jobs;
CREATE POLICY "jobs admin read" ON public.jobs
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "jobs admin insert" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "jobs admin update" ON public.jobs
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "jobs admin delete" ON public.jobs
  FOR DELETE TO authenticated USING ((select public.is_admin()));

CREATE POLICY "job_steps admin read" ON public.job_steps
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "job_steps admin insert" ON public.job_steps
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_steps admin update" ON public.job_steps
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_steps admin delete" ON public.job_steps
  FOR DELETE TO authenticated USING ((select public.is_admin()));

CREATE POLICY "job_templates admin read" ON public.job_templates
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "job_templates admin insert" ON public.job_templates
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_templates admin update" ON public.job_templates
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_templates admin delete" ON public.job_templates
  FOR DELETE TO authenticated USING ((select public.is_admin()));

CREATE POLICY "job_template_steps admin read" ON public.job_template_steps
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "job_template_steps admin insert" ON public.job_template_steps
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_template_steps admin update" ON public.job_template_steps
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_template_steps admin delete" ON public.job_template_steps
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- Defence in depth, as in 009: nothing anonymous touches these tables.
REVOKE ALL ON TABLE public.jobs, public.job_steps, public.job_templates,
  public.job_template_steps FROM anon, PUBLIC;

-- 7. Seed: three templates, bilingual. Wording is the owner-approved draft
-- from the spec (section 8); the template descriptions are new copy.
INSERT INTO public.job_templates (key, service_type, title_en, title_vi, description_en, description_vi) VALUES
  ('tx_llc', 'tax', 'Texas LLC formation', 'Thành lập LLC tại Texas',
   'We form your Texas LLC with the Secretary of State and prepare the paperwork you need to start operating.',
   'Manna thành lập LLC của bạn tại Texas với Secretary of State và chuẩn bị các giấy tờ cần có để bắt đầu hoạt động.'),
  ('business_bank_account', 'tax', 'Business bank account', 'Mở tài khoản ngân hàng cho doanh nghiệp',
   'We help you choose a bank and open a business checking account.',
   'Manna giúp bạn chọn ngân hàng và mở tài khoản thanh toán cho doanh nghiệp.'),
  ('business_website', 'tax', 'Business website', 'Làm website cho doanh nghiệp',
   'We design, build and launch a website for your business.',
   'Manna thiết kế, xây dựng và đưa website của doanh nghiệp bạn lên mạng.');

INSERT INTO public.job_template_steps (template_key, position, title_en, title_vi, description_en, description_vi, owner) VALUES
  ('tx_llc', 1, 'Provide your company details', 'Cung cấp thông tin công ty',
   'Name options, owners and ownership shares, business address, contact email.',
   'Vài tên công ty dự kiến, danh sách chủ sở hữu và tỷ lệ sở hữu, địa chỉ kinh doanh, email liên hệ.', 'client'),
  ('tx_llc', 2, 'Check name availability', 'Kiểm tra tên công ty',
   'We check the name is available with the Texas Secretary of State.',
   'Manna kiểm tra tên còn dùng được tại Texas Secretary of State.', 'manna'),
  ('tx_llc', 3, 'Set up registered agent', 'Chọn registered agent',
   'Every Texas LLC needs a registered agent with a Texas address.',
   'Mỗi LLC tại Texas cần một registered agent có địa chỉ ở Texas.', 'manna'),
  ('tx_llc', 4, 'File Certificate of Formation', 'Nộp Certificate of Formation',
   'We file Form 205 with the Texas Secretary of State.',
   'Manna nộp Form 205 lên Texas Secretary of State.', 'manna'),
  ('tx_llc', 5, 'Texas Secretary of State review', 'Texas Secretary of State xét duyệt',
   'The state reviews the filing; standard processing is typically 1–3 business days.',
   'Tiểu bang xét duyệt hồ sơ; xử lý thông thường khoảng 1–3 ngày làm việc.', 'third_party'),
  ('tx_llc', 6, 'Get your EIN', 'Xin mã số thuế EIN',
   'We apply for your Employer Identification Number with the IRS.',
   'Manna xin EIN (mã số thuế doanh nghiệp) từ IRS.', 'manna'),
  ('tx_llc', 7, 'Prepare Operating Agreement', 'Soạn Operating Agreement',
   'We draft the agreement between the owners.',
   'Manna soạn thỏa thuận giữa các chủ sở hữu.', 'manna'),
  ('tx_llc', 8, 'Review and sign Operating Agreement', 'Đọc và ký Operating Agreement',
   'Please read and sign.',
   'Bạn đọc và ký giúp.', 'client'),
  ('tx_llc', 9, 'Hand over your documents', 'Bàn giao hồ sơ',
   'You receive the Certificate of Filing, EIN letter and Operating Agreement.',
   'Bạn nhận Certificate of Filing, thư EIN và Operating Agreement.', 'manna'),

  ('business_bank_account', 1, 'Choose a bank and account type', 'Chọn ngân hàng và loại tài khoản',
   'We recommend options that fit your business.',
   'Manna gợi ý lựa chọn phù hợp với doanh nghiệp của bạn.', 'manna'),
  ('business_bank_account', 2, 'Prepare your documents', 'Chuẩn bị giấy tờ',
   'Certificate of Filing, EIN letter, Operating Agreement and your ID.',
   'Certificate of Filing, thư EIN, Operating Agreement và giấy tờ tùy thân của bạn.', 'client'),
  ('business_bank_account', 3, 'Submit the application or book the appointment', 'Nộp hồ sơ hoặc đặt lịch hẹn tại ngân hàng',
   'Apply online or visit the branch.',
   'Nộp trực tuyến hoặc đến chi nhánh.', 'client'),
  ('business_bank_account', 4, 'Bank review', 'Ngân hàng xét duyệt',
   'The bank verifies your business and your identity.',
   'Ngân hàng xác minh doanh nghiệp và danh tính của bạn.', 'third_party'),
  ('business_bank_account', 5, 'Activate your account', 'Kích hoạt tài khoản',
   'Make the opening deposit; set up online banking and your debit card.',
   'Nạp tiền mở tài khoản, cài đặt online banking và nhận thẻ debit.', 'client'),
  ('business_bank_account', 6, 'Confirm everything works', 'Xác nhận hoàn tất',
   'We check you can receive and send payments.',
   'Manna kiểm tra bạn nhận và chuyển tiền được.', 'manna'),

  ('business_website', 1, 'Kickoff: goals and content', 'Khởi động: mục tiêu và nội dung',
   'Your goals, logo, brand colors, text and photos.',
   'Mục tiêu, logo, màu thương hiệu, nội dung chữ và hình ảnh của bạn.', 'client'),
  ('business_website', 2, 'Domain and hosting', 'Tên miền và hosting',
   'We register or connect your domain and set up hosting.',
   'Manna đăng ký hoặc kết nối tên miền và cài hosting.', 'manna'),
  ('business_website', 3, 'First design draft', 'Bản thiết kế đầu tiên',
   'We send the first design for your review.',
   'Manna gửi bản thiết kế đầu tiên cho bạn xem.', 'manna'),
  ('business_website', 4, 'Your review and feedback', 'Bạn xem và góp ý',
   'Tell us what to change.',
   'Cho Manna biết cần chỉnh gì.', 'client'),
  ('business_website', 5, 'Build and revisions', 'Hoàn thiện và chỉnh sửa',
   'We build the pages and apply your feedback.',
   'Manna dựng các trang và chỉnh theo góp ý.', 'manna'),
  ('business_website', 6, 'Go live', 'Đưa website lên mạng',
   'Connect the domain, enable HTTPS and set up business email.',
   'Trỏ tên miền, bật HTTPS và cài email doanh nghiệp.', 'manna'),
  ('business_website', 7, 'Handover and walkthrough', 'Bàn giao và hướng dẫn sử dụng',
   'We show you how to manage the site.',
   'Manna hướng dẫn bạn quản lý website.', 'manna');
```

- [ ] **Step 5: Check the migration text and assemble the dry run**

```bash
M="apps/internal_app/supabase/migrations/010_job_templates_and_steps.sql"
grep -ni drop "$M"
```

Expected: exactly two lines, `ALTER TABLE public.jobs DROP CONSTRAINT jobs_created_by_fkey;` and `DROP POLICY IF EXISTS "Client can read own jobs" ON public.jobs;`. No comment may contain that word.

```bash
python3 -I "$SP/plan-parts/assemble_probe.py" "$M" "$SP/plan-parts" "$SP/assembled"
grep -ci drop "$SP/assembled/dryrun.sql"
```

Expected: the script prints `wrote …dryrun.sql and …live.sql`, then `0`. The assembler removes the two statements above, renames the replacement foreign key to `jobs_created_by_profiles_dryrun_fkey`, and adds two stand-ins to `probe_S` (`alter constraint … deferrable initially deferred` for the old foreign key, `alter policy … using (false)` for the old policy). The real statements are exercised for the first time by `apply_migration` in Task 3, and the live probe there covers their effect.

- [ ] **Step 6: Run the dry run**

```bash
cat "$SP/assembled/dryrun.sql"
```

Paste the printed script into `execute_sql`. It runs the migration and every probe inside one transaction and always ends in an error that carries the results.

Expected: `ERROR: P0001: RESULT` followed by exactly these lines (this is the output of the same files on 2026-10-15):

```
SEED templates=3 tx_llc=9 business_bank_account=6 business_website=7 blank_vi=0
MATRIX anon          read: job_templates=ERR42501 job_template_steps=ERR42501 job_steps=ERR42501 jobs=ERR42501 | write: ins_template=ERR42501 upd_template=ERR42501 ins_job=ERR42501 upd_job=ERR42501 ins_step=ERR42501 del_job=ERR42501
MATRIX client        read: job_templates=0 job_template_steps=0 job_steps=0 jobs=0 | write: ins_template=ERR42501 upd_template=0 ins_job=ERR42501 upd_job=0 ins_step=ERR42501 del_job=0
MATRIX client+linked read: job_templates=0 job_template_steps=0 job_steps=0 jobs=0 | write: ins_template=ERR42501 upd_template=0 ins_job=ERR42501 upd_job=0 ins_step=ERR42501 del_job=0
MATRIX staff         read: job_templates=0 job_template_steps=0 job_steps=0 jobs=0 | write: ins_template=ERR42501 upd_template=0 ins_job=ERR42501 upd_job=0 ins_step=ERR42501 del_job=0
MATRIX admin         read: job_templates=3 job_template_steps=22 job_steps=0 jobs=1 | write: ins_template=ok upd_template=4 ins_job=ok upd_job=2 ins_step=ok del_job=1
CREATE tx_llc: steps=9 status=open created_by_admin=true fee=1500.00 deadline=2026-12-31 template=tx_llc service=tax description=Texas LLC formation
CREATE others: bank_steps=6 website_steps=7
STEP1 in_progress: job=in_progress started=true completed_null=true updated_by_admin=true
STEP1 done: job=in_progress completed_set=true
STEP1 reopened to todo: job=open completed_null=true
ALL done: job=complete all_completed_set=true
REOPEN finished job (step 9 to todo): job=in_progress step9_completed_null=true
SKIP/WAIT: all_skipped_job=complete waiting_client_job=in_progress
ERR unknown_template=P0002 inactive_template=P0002 duplicate_position=23505 bogus_status=23514
MANUAL job: before=in_progress with_step=open after_last_step_deleted=complete
DELETE job: rows=1 steps_left=0
```

If a line differs, read it against the Review Focus list: lines `STEP1 reopened to todo` and `REOPEN finished job` are review focus 1, `MANUAL job` is review focus 5. Fix the migration, not the expectation.

- [ ] **Step 7: Confirm the dry run left nothing behind**

Run the query from Step 1 again.
Expected: the same result as Step 1 (tables absent, one old policy, 0 new columns, 0 jobs). Also run:

```sql
select (select string_agg(role || '=' || c, ', ' order by role) from (select role, count(*) c from public.profiles group by role) x) as profile_roles,
       (select count(*) from public.clients where user_id is not null) as clients_linked_to_a_login;
```

Expected: `admin=1, client=6` and `0`.

- [ ] **Step 8: Commit the migration file**

```bash
git add apps/internal_app/supabase/migrations/010_job_templates_and_steps.sql
git commit -m "$(cat <<'EOF'
feat(internal-app): 010 — job templates, steps and admin-only jobs access

Templates and per-job steps (copied from the template when a job is created),
a trigger that keeps jobs.status in step with them, create_job_from_template,
three seeded templates (Texas LLC, business bank account, business website),
and admin-only RLS. Also repairs jobs: created_by now references profiles
instead of the empty legacy users table, plus updated_at and case_id, and the
client read policy is gone (a client row holds fee and notes).

Dry-run on prod inside a rolled-back transaction: access matrix over anon,
plain user, linked client, staff and admin, plus create, reopen, skip, manual
job and cascade-delete checks. Not applied yet.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Apply migration 010 to prod and verify it live

**Files:**
- No repository files change in this task.

**Interfaces:**
- Consumes: the committed `010_job_templates_and_steps.sql` and `SP/assembled/live.sql` from Task 2.
- Produces: the live schema that Tasks 5 to 10 query.

- [ ] **Step 1: Checkpoint: ask the owner**

Stop. Tell the owner in plain words what applying does: it creates three tables, repairs `jobs` (which is empty), removes the client read policy on `jobs`, and seeds three templates; nothing existing is read or changed besides `jobs`. Ask for an explicit yes (for example with `AskUserQuestion`). Do not continue without it.

- [ ] **Step 2: Apply**

Call `mcp__supabase__apply_migration` with `name` = `job_templates_and_steps` and `query` = the full contents of `apps/internal_app/supabase/migrations/010_job_templates_and_steps.sql`, unchanged.
Expected: `{"success":true}`.

- [ ] **Step 3: Run the live probe**

```bash
cat "$SP/assembled/live.sql"
```

Paste it into `execute_sql` (no stand-ins, no migration: it runs against the real tables and rolls back).
Expected: the same lines as the dry run in Task 2 Step 6, character for character.

- [ ] **Step 4: Check policies, grants and migration history**

```sql
select tablename, count(*) as policies, string_agg(cmd, ',' order by cmd) as actions
from pg_policies
where schemaname = 'public' and tablename in ('jobs', 'job_steps', 'job_templates', 'job_template_steps')
group by tablename order by tablename;
```

Expected: four rows, each with `policies` 4 and `actions` `DELETE,INSERT,SELECT,UPDATE`. And:

```sql
select policyname from pg_policies where schemaname = 'public' and tablename = 'jobs' order by 1;
```

Expected: exactly `jobs admin delete`, `jobs admin insert`, `jobs admin read`, `jobs admin update` (no `Client can read own jobs`). And:

```sql
select p.proname,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_run,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_run
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('set_updated_at', 'job_steps_before_write', 'job_steps_sync_job', 'create_job_from_template')
order by 1;
```

Expected: `create_job_from_template` → anon false, authenticated true; the three trigger functions → both false. Then call `mcp__supabase__list_migrations`: the last entry is named `job_templates_and_steps`.

- [ ] **Step 5: Advisors**

Call `mcp__supabase__get_advisors` for `security` and for `performance`.
Expected: no finding mentions `job_templates`, `job_template_steps` or `job_steps`. Compared with the numbers before this slice (performance: `auth_rls_initplan` 3, `unindexed_foreign_keys` 16, `multiple_permissive_policies` 2), `auth_rls_initplan` loses its `jobs` entry (now 2) and `unindexed_foreign_keys` loses `jobs_created_by_fkey` (now 15). New `unused_index` INFO entries for the new indexes are normal. Security findings are unchanged.

- [ ] **Step 6: Confirm nothing was left behind by the probes**

```sql
select (select count(*) from public.jobs) as jobs,
       (select count(*) from public.job_steps) as job_steps,
       (select count(*) from public.job_templates) as templates,
       (select count(*) from public.job_template_steps) as template_steps,
       (select count(*) from public.clients where first_name = 'zz') as zz_clients,
       (select count(*) from public.clients where user_id is not null) as clients_linked_to_a_login,
       (select string_agg(role || '=' || c, ', ' order by role) from (select role, count(*) c from public.profiles group by role) x) as profile_roles;
```

Expected: `0, 0, 3, 22, 0, 0` and `admin=1, client=6`.

No commit: the repository did not change. Report the live probe output and the advisor comparison to the owner.

---

### Task 4: Job types and input validation

**Files:**
- Create: `apps/internal_app/src/lib/jobs/types.ts`
- Create: `apps/internal_app/src/lib/jobs/validation.ts`
- Test: `apps/internal_app/__tests__/lib/jobs/validation.test.ts`

**Interfaces:**
- Consumes: `STEP_STATUSES`, `StepStatus`, `JobStatus`, `StepOwner` from `@/lib/jobs/progress` (Task 1).
- Produces: from `@/lib/jobs/types`: `Result<T>`, `JobServiceType`, `ClientBrief`, `JobTemplateSummary`, `JobStepRow`, `JobListRow`, `JobDetail`. From `@/lib/jobs/validation`: `MAX_FEE`, `MAX_NOTE_LENGTH`, `FieldReader`, `NewJobInput`, `StepPatch`, `isUuid`, `parseFee`, `parseDeadline`, `parseNewJobInput`, `parseStepPatch`.

- [ ] **Step 1: Write the failing test**

Create `apps/internal_app/__tests__/lib/jobs/validation.test.ts`:

```ts
import {
  MAX_NOTE_LENGTH,
  isUuid,
  parseDeadline,
  parseFee,
  parseNewJobInput,
  parseStepPatch,
} from '@/lib/jobs/validation'

const CLIENT_ID = '9c3d87fc-eeac-4f05-bafa-cda522c33549'

function form(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

describe('isUuid', () => {
  it('accepts a uuid in either case', () => {
    expect(isUuid(CLIENT_ID)).toBe(true)
    expect(isUuid(CLIENT_ID.toUpperCase())).toBe(true)
  })

  it.each(['not-a-uuid', '', ' ', `${CLIENT_ID} `, '9c3d87fc-eeac-4f05-bafa', 'DROP TABLE jobs'])(
    'rejects %p',
    (value) => {
      expect(isUuid(value)).toBe(false)
    }
  )

  it.each([undefined, null, 42, {}])('rejects the non-string %p', (value) => {
    expect(isUuid(value)).toBe(false)
  })
})

describe('parseFee', () => {
  it.each([
    ['', 0],
    ['   ', 0],
    ['0', 0],
    ['1500', 1500],
    [' 250 ', 250],
    ['1,500', 1500],
    ['$1,500.50', 1500.5],
    ['$ 250', 250],
    ['1500.5', 1500.5],
    ['1,234,567.89', 1234567.89],
    ['99999999.99', 99999999.99],
  ])('reads %p as %p', (raw, expected) => {
    expect(parseFee(raw)).toEqual({ ok: true, value: expected })
  })

  it.each([
    ['1.500', 'three decimals, probably a Vietnamese thousands dot'],
    ['-5', 'negative'],
    ['abc', 'not a number'],
    ['1e3', 'exponent'],
    ['12,34,56', 'broken thousands groups'],
    [',500', 'leading comma'],
    ['1,5', 'short group'],
    ['15 00', 'inner space'],
  ])('refuses %p (%s)', (raw) => {
    const result = parseFee(raw)
    expect(result.ok).toBe(false)
  })

  it('refuses an amount that would overflow numeric(10,2)', () => {
    expect(parseFee('100000000')).toEqual({ ok: false, error: 'Fee is too large.' })
  })
})

describe('parseDeadline', () => {
  it('treats blank as no deadline', () => {
    expect(parseDeadline('')).toEqual({ ok: true, value: null })
    expect(parseDeadline('  ')).toEqual({ ok: true, value: null })
  })

  it('accepts a real date, including a leap day', () => {
    expect(parseDeadline('2026-12-31')).toEqual({ ok: true, value: '2026-12-31' })
    expect(parseDeadline('2028-02-29')).toEqual({ ok: true, value: '2028-02-29' })
  })

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '12/31/2026', '2026-1-5', 'tomorrow'])(
    'refuses %p',
    (raw) => {
      expect(parseDeadline(raw).ok).toBe(false)
    }
  )
})

describe('parseNewJobInput', () => {
  const valid = {
    client_id: CLIENT_ID,
    template_key: 'tx_llc',
    fee: '$1,500',
    deadline: '2026-12-31',
    notes: '  Needs it before January  ',
  }

  it('reads a complete form', () => {
    expect(parseNewJobInput(form(valid))).toEqual({
      ok: true,
      value: {
        clientId: CLIENT_ID,
        templateKey: 'tx_llc',
        fee: 1500,
        deadline: '2026-12-31',
        notes: 'Needs it before January',
      },
    })
  })

  it('defaults a blank fee, deadline and notes', () => {
    const result = parseNewJobInput(form({ client_id: CLIENT_ID, template_key: 'tx_llc' }))
    expect(result).toEqual({
      ok: true,
      value: { clientId: CLIENT_ID, templateKey: 'tx_llc', fee: 0, deadline: null, notes: null },
    })
  })

  it('asks for a client when the id is missing or malformed', () => {
    expect(parseNewJobInput(form({ ...valid, client_id: '' }))).toEqual({
      ok: false,
      error: 'Choose a client.',
    })
    expect(parseNewJobInput(form({ ...valid, client_id: 'garbage' }))).toEqual({
      ok: false,
      error: 'Choose a client.',
    })
  })

  it('asks for a template when the key is missing or not a plain key', () => {
    expect(parseNewJobInput(form({ ...valid, template_key: '' }))).toEqual({
      ok: false,
      error: 'Choose a service template.',
    })
    expect(parseNewJobInput(form({ ...valid, template_key: "x'; select 1; --" })).ok).toBe(false)
  })

  it('passes a bad fee, deadline or note on as the error', () => {
    expect(parseNewJobInput(form({ ...valid, fee: '1.500' })).ok).toBe(false)
    expect(parseNewJobInput(form({ ...valid, deadline: '2026-02-30' })).ok).toBe(false)
    expect(parseNewJobInput(form({ ...valid, notes: 'x'.repeat(MAX_NOTE_LENGTH + 1) })).ok).toBe(false)
  })
})

describe('parseStepPatch', () => {
  it('accepts a known status', () => {
    expect(parseStepPatch({ status: 'done' })).toEqual({ ok: true, value: { status: 'done' } })
  })

  it('refuses an unknown or non-string status', () => {
    expect(parseStepPatch({ status: 'finished' })).toEqual({ ok: false, error: 'Unknown step status.' })
    expect(parseStepPatch({ status: 3 })).toEqual({ ok: false, error: 'Unknown step status.' })
  })

  it('trims notes and turns blank ones into null so a note can be cleared', () => {
    expect(parseStepPatch({ client_note: '  Please sign  ', internal_note: '   ' })).toEqual({
      ok: true,
      value: { client_note: 'Please sign', internal_note: null },
    })
  })

  it('refuses a note that is not text or is too long', () => {
    expect(parseStepPatch({ client_note: 12 }).ok).toBe(false)
    expect(parseStepPatch({ internal_note: 'x'.repeat(MAX_NOTE_LENGTH + 1) }).ok).toBe(false)
  })

  it('refuses an empty patch', () => {
    expect(parseStepPatch({})).toEqual({ ok: false, error: 'Nothing to update.' })
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/validation.test.ts`
Expected: FAIL, `Cannot find module '@/lib/jobs/validation'`.

- [ ] **Step 3: Write the types and the implementation**

Create `apps/internal_app/src/lib/jobs/types.ts`:

```ts
import type { JobStatus, StepOwner, StepStatus } from './progress'

/** Outcome of an operation that can fail on user input or at the database. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export type JobServiceType = 'immigration' | 'tax' | 'insurance' | 'ai'

export interface ClientBrief {
  id: string
  first_name: string
  last_name: string
}

export interface JobTemplateSummary {
  key: string
  service_type: JobServiceType
  title_en: string
  title_vi: string
  description_en: string | null
  description_vi: string | null
  step_count: number
}

export interface JobStepRow {
  id: string
  job_id: string
  position: number
  title_en: string
  title_vi: string
  description_en: string | null
  description_vi: string | null
  owner: StepOwner
  client_visible: boolean
  status: StepStatus
  client_note: string | null
  internal_note: string | null
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

export interface JobListRow {
  id: string
  service_type: JobServiceType
  description: string
  status: JobStatus
  fee: number
  deadline: string | null
  template_key: string | null
  updated_at: string
  client: ClientBrief | null
  steps: Array<{ status: StepStatus }>
}

export interface JobDetail {
  id: string
  service_type: JobServiceType
  description: string
  status: JobStatus
  fee: number
  deadline: string | null
  notes: string | null
  template_key: string | null
  created_at: string
  updated_at: string
  client: ClientBrief | null
  steps: JobStepRow[]
}
```

Create `apps/internal_app/src/lib/jobs/validation.ts`:

```ts
import { STEP_STATUSES, type StepStatus } from './progress'
import type { Result } from './types'

export const MAX_FEE = 99_999_999.99 // jobs.fee is numeric(10,2)
export const MAX_NOTE_LENGTH = 5000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TEMPLATE_KEY_RE = /^[a-z][a-z0-9_]{0,63}$/
const FEE_PLAIN_RE = /^\d+(\.\d{1,2})?$/
const FEE_GROUPED_RE = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** FormData satisfies this, and so does a plain object with a get method. */
export interface FieldReader {
  get(name: string): FormDataEntryValue | null
}

export interface NewJobInput {
  clientId: string
  templateKey: string
  fee: number
  deadline: string | null
  notes: string | null
}

export interface StepPatch {
  status?: StepStatus
  client_note?: string | null
  internal_note?: string | null
}

/**
 * Guards ids that come from a URL or a form before they reach Postgres: a
 * malformed uuid makes PostgREST answer 22P02 and the page would crash.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * A dollar amount the way people type it: 1500, 1,500, $1,500.50. Blank is 0.
 * At most two decimals and exact thousands groups, so "1.500" (one thousand
 * five hundred in Vietnamese notation) is refused instead of silently
 * becoming $1.50.
 */
export function parseFee(raw: string): Result<number> {
  const text = raw.trim().replace(/^\$\s*/, '')
  if (text === '') return { ok: true, value: 0 }
  if (!FEE_PLAIN_RE.test(text) && !FEE_GROUPED_RE.test(text)) {
    return {
      ok: false,
      error: 'Fee must be a dollar amount with at most 2 decimals, for example 1500 or 1,500.50.',
    }
  }
  const value = Number(text.replace(/,/g, ''))
  if (value > MAX_FEE) return { ok: false, error: 'Fee is too large.' }
  return { ok: true, value }
}

/** A real calendar date as YYYY-MM-DD, or blank for no deadline. */
export function parseDeadline(raw: string): Result<string | null> {
  const text = raw.trim()
  if (text === '') return { ok: true, value: null }
  const match = DATE_ONLY_RE.exec(text)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return { ok: true, value: text }
    }
  }
  return { ok: false, error: 'Deadline must be a real date (YYYY-MM-DD).' }
}

function parseNote(raw: unknown, label: string): Result<string | null> {
  if (raw === null || raw === undefined) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, error: `${label} must be text.` }
  const text = raw.trim()
  if (text === '') return { ok: true, value: null }
  if (text.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `${label} is too long (at most ${MAX_NOTE_LENGTH} characters).` }
  }
  return { ok: true, value: text }
}

export function parseNewJobInput(form: FieldReader): Result<NewJobInput> {
  const clientId = String(form.get('client_id') ?? '').trim()
  if (!isUuid(clientId)) return { ok: false, error: 'Choose a client.' }

  const templateKey = String(form.get('template_key') ?? '').trim()
  if (!TEMPLATE_KEY_RE.test(templateKey)) {
    return { ok: false, error: 'Choose a service template.' }
  }

  const fee = parseFee(String(form.get('fee') ?? ''))
  if (!fee.ok) return fee

  const deadline = parseDeadline(String(form.get('deadline') ?? ''))
  if (!deadline.ok) return deadline

  const notes = parseNote(String(form.get('notes') ?? ''), 'Notes')
  if (!notes.ok) return notes

  return {
    ok: true,
    value: {
      clientId,
      templateKey,
      fee: fee.value,
      deadline: deadline.value,
      notes: notes.value,
    },
  }
}

export function parseStepPatch(input: {
  status?: unknown
  client_note?: unknown
  internal_note?: unknown
}): Result<StepPatch> {
  const patch: StepPatch = {}

  if (input.status !== undefined) {
    if (
      typeof input.status !== 'string' ||
      !(STEP_STATUSES as readonly string[]).includes(input.status)
    ) {
      return { ok: false, error: 'Unknown step status.' }
    }
    patch.status = input.status as StepStatus
  }
  if (input.client_note !== undefined) {
    const note = parseNote(input.client_note, 'Client note')
    if (!note.ok) return note
    patch.client_note = note.value
  }
  if (input.internal_note !== undefined) {
    const note = parseNote(input.internal_note, 'Internal note')
    if (!note.ok) return note
    patch.internal_note = note.value
  }

  if (Object.keys(patch).length === 0) return { ok: false, error: 'Nothing to update.' }
  return { ok: true, value: patch }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/validation.test.ts`
Expected: PASS, `Tests: 50 passed`.

Run: `pnpm --filter internal_app exec eslint src/lib/jobs __tests__/lib/jobs` and `pnpm --filter internal_app type-check`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add apps/internal_app/src/lib/jobs/types.ts apps/internal_app/src/lib/jobs/validation.ts apps/internal_app/__tests__/lib/jobs/validation.test.ts
git commit -m "$(cat <<'EOF'
feat(internal-app): job types and input validation

isUuid, parseFee ("1,500" and "$1,500.50" are fine, "1.500" is refused rather
than stored as $1.50), parseDeadline, parseNewJobInput and parseStepPatch, and
the row types the jobs data layer returns.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Jobs data access and server actions

**Files:**
- Create: `apps/internal_app/src/lib/jobs/jobs-db.ts`
- Create: `apps/internal_app/src/actions/jobs.ts`
- Test: `apps/internal_app/__tests__/lib/jobs/jobs-db.test.ts`

**Interfaces:**
- Consumes: Task 4 types and validation; the live schema from Task 3 (table and column names, the `create_job_from_template` function and its parameter names, SQLSTATE `P0002`); `createClient` from `@/lib/supabase/server`.
- Produces: from `@/lib/jobs/jobs-db`: `Db`, `JOBS_LIST_LIMIT`, `listJobs(db, opts?)`, `findJob(db, id)`, `toJobTemplateSummary(row)`, `listJobTemplates(db)`, `findClientBrief(db, id)`, `createJobFromTemplateRpc(db, input)`, `updateStep(db, stepId, patch)`. From `@/actions/jobs`: `getJobs()`, `getJobsForClient(clientId)`, `getJob(id)`, `getJobTemplates()`, `getClientBrief(id)`, `createJobFromTemplate(formData): Promise<Result<{ id: string }>>`, `updateJobStep(stepId, patch): Promise<Result<JobStepRow>>`.

- [ ] **Step 1: Write the failing test**

Create `apps/internal_app/__tests__/lib/jobs/jobs-db.test.ts`:

```ts
import {
  createJobFromTemplateRpc,
  toJobTemplateSummary,
  updateStep,
  type Db,
} from '@/lib/jobs/jobs-db'

const CLIENT_ID = '9c3d87fc-eeac-4f05-bafa-cda522c33549'
const STEP_ID = '5f1c2b6e-1d64-4b8e-9d57-3c0f3b6d2a11'

const input = {
  clientId: CLIENT_ID,
  templateKey: 'tx_llc',
  fee: 1500,
  deadline: '2026-12-31',
  notes: null,
}

function rpcDb(result: { data: unknown; error: { code?: string; message: string } | null }) {
  const rpc = jest.fn().mockResolvedValue(result)
  return { db: { rpc } as unknown as Db, rpc }
}

function updateDb(result: { data: unknown; error: { code?: string; message: string } | null }) {
  const single = jest.fn().mockResolvedValue(result)
  const select = jest.fn(() => ({ single }))
  const eq = jest.fn(() => ({ select }))
  const update = jest.fn(() => ({ eq }))
  const from = jest.fn(() => ({ update }))
  return { db: { from } as unknown as Db, from, update, eq, select }
}

describe('createJobFromTemplateRpc', () => {
  it('calls the SQL function with the parsed input and returns the new id', async () => {
    const { db, rpc } = rpcDb({ data: 'new-job-id', error: null })
    const result = await createJobFromTemplateRpc(db, input)
    expect(rpc).toHaveBeenCalledWith('create_job_from_template', {
      p_client_id: CLIENT_ID,
      p_template_key: 'tx_llc',
      p_fee: 1500,
      p_deadline: '2026-12-31',
      p_notes: null,
    })
    expect(result).toEqual({ ok: true, value: { id: 'new-job-id' } })
  })

  it('explains an unknown or inactive template (SQLSTATE P0002) in plain words', async () => {
    const { db } = rpcDb({
      data: null,
      error: { code: 'P0002', message: 'unknown or inactive template nope' },
    })
    expect(await createJobFromTemplateRpc(db, input)).toEqual({
      ok: false,
      error: 'That service template is not available.',
    })
  })

  it('passes any other database error on with its message', async () => {
    const { db } = rpcDb({ data: null, error: { code: '42501', message: 'permission denied' } })
    expect(await createJobFromTemplateRpc(db, input)).toEqual({
      ok: false,
      error: 'Could not create the job: permission denied',
    })
  })
})

describe('updateStep', () => {
  it('updates the step by id, selects it back and returns it', async () => {
    const row = { id: STEP_ID, job_id: 'job-1', status: 'done' }
    const { db, from, update, eq, select } = updateDb({ data: row, error: null })
    const result = await updateStep(db, STEP_ID, { status: 'done' })
    expect(from).toHaveBeenCalledWith('job_steps')
    expect(update).toHaveBeenCalledWith({ status: 'done' })
    expect(eq).toHaveBeenCalledWith('id', STEP_ID)
    expect(select).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, value: row })
  })

  it('says the step is gone or hidden when no row comes back (PGRST116)', async () => {
    const { db } = updateDb({ data: null, error: { code: 'PGRST116', message: '0 rows' } })
    expect(await updateStep(db, STEP_ID, { status: 'done' })).toEqual({
      ok: false,
      error: 'That step no longer exists, or you do not have access to it.',
    })
  })

  it('passes any other database error on with its message', async () => {
    const { db } = updateDb({ data: null, error: { code: '23514', message: 'check violation' } })
    expect(await updateStep(db, STEP_ID, { status: 'done' })).toEqual({
      ok: false,
      error: 'Could not save the step: check violation',
    })
  })
})

describe('toJobTemplateSummary', () => {
  const base = {
    key: 'tx_llc',
    service_type: 'tax' as const,
    title_en: 'Texas LLC formation',
    title_vi: 'Thành lập LLC tại Texas',
    description_en: null,
    description_vi: null,
  }

  it('reads the embedded step count', () => {
    expect(toJobTemplateSummary({ ...base, steps: [{ count: 9 }] })).toEqual({
      ...base,
      step_count: 9,
    })
  })

  it('treats a missing count as zero steps', () => {
    expect(toJobTemplateSummary({ ...base, steps: null }).step_count).toBe(0)
    expect(toJobTemplateSummary({ ...base, steps: [] }).step_count).toBe(0)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/jobs-db.test.ts`
Expected: FAIL, `Cannot find module '@/lib/jobs/jobs-db'`.

- [ ] **Step 3: Write the data access module**

Create `apps/internal_app/src/lib/jobs/jobs-db.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NewJobInput, StepPatch } from './validation'
import type {
  ClientBrief,
  JobDetail,
  JobListRow,
  JobStepRow,
  JobTemplateSummary,
  Result,
} from './types'

/**
 * Database access for jobs. Every function takes the Supabase client as an
 * argument, so the Next.js server actions stay thin and this file can be
 * tested with a stand-in client.
 */
export type Db = Pick<SupabaseClient, 'from' | 'rpc'>

export const JOBS_LIST_LIMIT = 50

const STEP_COLUMNS =
  'id, job_id, position, title_en, title_vi, description_en, description_vi, owner, client_visible, status, client_note, internal_note, started_at, completed_at, updated_at'

const JOB_LIST_COLUMNS =
  'id, service_type, description, status, fee, deadline, template_key, updated_at, client:clients(id, first_name, last_name), steps:job_steps(status)'

const JOB_DETAIL_COLUMNS = `id, service_type, description, status, fee, deadline, notes, template_key, created_at, updated_at, client:clients(id, first_name, last_name), steps:job_steps(${STEP_COLUMNS})`

/** PostgREST may return numeric columns as numbers or strings; the UI wants a number. */
function withNumericFee<T extends { fee: unknown }>(row: T): Omit<T, 'fee'> & { fee: number } {
  return { ...row, fee: Number(row.fee) }
}

/** Most recently touched first. Pass clientId to see one client's jobs. */
export async function listJobs(
  db: Db,
  opts: { clientId?: string; limit?: number } = {}
): Promise<JobListRow[]> {
  let query = db
    .from('jobs')
    .select(JOB_LIST_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(opts.limit ?? JOBS_LIST_LIMIT)
  if (opts.clientId) query = query.eq('client_id', opts.clientId)

  const { data, error } = await query
  // Throw rather than return []: an RLS-filtered result and a genuinely empty
  // list look the same, and that ambiguity is what makes this hard to debug.
  if (error) throw error
  return ((data ?? []) as unknown as Array<JobListRow & { fee: unknown }>).map(
    (row) => withNumericFee(row) as JobListRow
  )
}

/** One job with its steps in order, or null when the id does not exist or RLS hides it. */
export async function findJob(db: Db, id: string): Promise<JobDetail | null> {
  const { data, error } = await db
    .from('jobs')
    .select(JOB_DETAIL_COLUMNS)
    .eq('id', id)
    .order('position', { referencedTable: 'job_steps', ascending: true })
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return withNumericFee(data as unknown as JobDetail & { fee: unknown }) as JobDetail
}

type TemplateRow = Omit<JobTemplateSummary, 'step_count'> & {
  steps: Array<{ count: number }> | null
}

/** PostgREST returns an embedded count as [{ count: n }]. */
export function toJobTemplateSummary(row: TemplateRow): JobTemplateSummary {
  const { steps, ...rest } = row
  return { ...rest, step_count: steps?.[0]?.count ?? 0 }
}

export async function listJobTemplates(db: Db): Promise<JobTemplateSummary[]> {
  const { data, error } = await db
    .from('job_templates')
    .select(
      'key, service_type, title_en, title_vi, description_en, description_vi, steps:job_template_steps(count)'
    )
    .eq('active', true)
    .order('title_en', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as TemplateRow[]).map(toJobTemplateSummary)
}

export async function findClientBrief(db: Db, id: string): Promise<ClientBrief | null> {
  const { data, error } = await db
    .from('clients')
    .select('id, first_name, last_name')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as ClientBrief | null) ?? null
}

/** Creates the job and copies the template's steps in one transaction (a SQL function). */
export async function createJobFromTemplateRpc(
  db: Db,
  input: NewJobInput
): Promise<Result<{ id: string }>> {
  const { data, error } = await db.rpc('create_job_from_template', {
    p_client_id: input.clientId,
    p_template_key: input.templateKey,
    p_fee: input.fee,
    p_deadline: input.deadline,
    p_notes: input.notes,
  })
  if (error) {
    if (error.code === 'P0002') {
      return { ok: false, error: 'That service template is not available.' }
    }
    return { ok: false, error: `Could not create the job: ${error.message}` }
  }
  return { ok: true, value: { id: data as string } }
}

export async function updateStep(
  db: Db,
  stepId: string,
  patch: StepPatch
): Promise<Result<JobStepRow>> {
  const { data, error } = await db
    .from('job_steps')
    .update(patch)
    .eq('id', stepId)
    .select(STEP_COLUMNS)
    .single()
  if (error) {
    // PGRST116: no row came back, because the step is gone or RLS hides it.
    if (error.code === 'PGRST116') {
      return { ok: false, error: 'That step no longer exists, or you do not have access to it.' }
    }
    return { ok: false, error: `Could not save the step: ${error.message}` }
  }
  return { ok: true, value: data as unknown as JobStepRow }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/jobs-db.test.ts`
Expected: PASS, `Tests: 8 passed`.

- [ ] **Step 5: Read the Next.js 16 pages that apply, then write the server actions**

Read these files (they are short) and confirm: server functions live in a file marked `'use server'` that exports only async functions; `revalidatePath(path)` takes a literal path for a page; `params` and `searchParams` are Promises.

- `apps/internal_app/node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`
- `apps/internal_app/node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`
- `apps/internal_app/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`

Create `apps/internal_app/src/actions/jobs.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createJobFromTemplateRpc,
  findClientBrief,
  findJob,
  listJobTemplates,
  listJobs,
  updateStep,
} from '@/lib/jobs/jobs-db'
import { isUuid, parseNewJobInput, parseStepPatch } from '@/lib/jobs/validation'
import type {
  ClientBrief,
  JobDetail,
  JobListRow,
  JobStepRow,
  JobTemplateSummary,
  Result,
} from '@/lib/jobs/types'

// Thin Next.js boundary over src/lib/jobs/jobs-db.ts: build the Supabase
// client, validate, call, revalidate. Access is decided by RLS (admin-only).

export async function getJobs(): Promise<JobListRow[]> {
  return listJobs(await createClient())
}

export async function getJobsForClient(clientId: string): Promise<JobListRow[]> {
  if (!isUuid(clientId)) return []
  return listJobs(await createClient(), { clientId })
}

/** null for an unknown or malformed id, so the page can call notFound(). */
export async function getJob(id: string): Promise<JobDetail | null> {
  if (!isUuid(id)) return null
  return findJob(await createClient(), id)
}

export async function getJobTemplates(): Promise<JobTemplateSummary[]> {
  return listJobTemplates(await createClient())
}

export async function getClientBrief(id: string): Promise<ClientBrief | null> {
  if (!isUuid(id)) return null
  return findClientBrief(await createClient(), id)
}

export async function createJobFromTemplate(formData: FormData): Promise<Result<{ id: string }>> {
  const parsed = parseNewJobInput(formData)
  if (!parsed.ok) return parsed

  const result = await createJobFromTemplateRpc(await createClient(), parsed.value)
  if (result.ok) {
    revalidatePath('/jobs')
    revalidatePath(`/clients/${parsed.value.clientId}`)
  }
  return result
}

export async function updateJobStep(
  stepId: string,
  patch: { status?: unknown; client_note?: unknown; internal_note?: unknown }
): Promise<Result<JobStepRow>> {
  if (!isUuid(stepId)) return { ok: false, error: 'Unknown step.' }
  const parsed = parseStepPatch(patch)
  if (!parsed.ok) return parsed

  const result = await updateStep(await createClient(), stepId, parsed.value)
  if (result.ok) {
    revalidatePath(`/jobs/${result.value.job_id}`)
    revalidatePath('/jobs')
  }
  return result
}
```

- [ ] **Step 6: Type-check and lint**

Run: `pnpm --filter internal_app type-check`, then `pnpm --filter internal_app exec eslint src/lib/jobs src/actions/jobs.ts __tests__/lib/jobs`
Expected: both clean.

Run: `pnpm --filter internal_app test`
Expected: `Test Suites: 10 passed`, `Tests: 120 passed`.

- [ ] **Step 7: Commit**

```bash
git add apps/internal_app/src/lib/jobs/jobs-db.ts apps/internal_app/src/actions/jobs.ts apps/internal_app/__tests__/lib/jobs/jobs-db.test.ts
git commit -m "$(cat <<'EOF'
feat(internal-app): jobs data access and server actions

lib/jobs/jobs-db.ts holds the queries and mutations and takes the Supabase
client as an argument, so it is unit tested with a stand-in client; the
server actions only build the client, validate, call and revalidate. Reads
throw on error instead of returning an empty list, so an RLS refusal cannot
pass for "no jobs".

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Job detail page and its components

**Files:**
- Create: `apps/internal_app/src/components/jobs/JobProgressBar.tsx`
- Create: `apps/internal_app/src/components/jobs/JobStatusBadge.tsx`
- Create: `apps/internal_app/src/components/jobs/JobStepList.tsx`
- Create: `apps/internal_app/src/app/(app)/jobs/[id]/page.tsx`

**Interfaces:**
- Consumes: `getJob`, `updateJobStep` (Task 5); `deriveProgress`, `formatProgressLabel`, `STEP_STATUSES`, `STEP_STATUS_LABELS`, `STEP_OWNER_LABELS`, `StepStatus`, `Progress`, `JobStatus` (Task 1); `JobStepRow` (Task 4); `formatCurrency`, `formatDate` from `@/lib/utils` (existing).
- Produces: `JobProgressBar({ progress, stepCount })`, `JobStatusBadge({ status })`, `JobStepList({ steps })`, and the route `/jobs/[id]`.

These are views, so the cycle here is type-check, lint and the owner smoke test in Task 11 rather than a unit test; the logic they show is already covered by Tasks 1, 4 and 5.

- [ ] **Step 1: Read the page conventions**

Read `apps/internal_app/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md` and `.../04-functions/not-found.md`, and the existing `apps/internal_app/src/app/(app)/leads/[userId]/page.tsx` (same shape: `params` is a Promise, `notFound()` for a missing row, `export const dynamic = 'force-dynamic'`).

- [ ] **Step 2: Create the shared display components**

Create `apps/internal_app/src/components/jobs/JobProgressBar.tsx`:

```tsx
import { formatProgressLabel, type Progress } from '@/lib/jobs/progress'

export default function JobProgressBar({
  progress,
  stepCount,
}: {
  progress: Progress
  stepCount: number
}) {
  return (
    <div className="flex items-center gap-3 min-w-[150px]">
      <div
        className="h-2 flex-1 rounded-full bg-[#ebeef3] overflow-hidden"
        role="progressbar"
        aria-label="Job progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${progress.percent}%`, backgroundColor: '#3AAFB9' }}
        />
      </div>
      <span className="w-16 text-right text-xs font-semibold text-slate-500 tabular-nums">
        {formatProgressLabel(progress, stepCount)}
      </span>
    </div>
  )
}
```

Create `apps/internal_app/src/components/jobs/JobStatusBadge.tsx`:

```tsx
import type { JobStatus } from '@/lib/jobs/progress'

const STYLES: Record<JobStatus, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  complete: 'bg-green-50 text-green-700',
}

export default function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${STYLES[status]}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
```

- [ ] **Step 3: Create the step editor**

Create `apps/internal_app/src/components/jobs/JobStepList.tsx`. Each step keeps its own draft; Save is explicit so a later slice can send an email only on purpose, and the dot follows what is saved, not what is typed:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateJobStep } from '@/actions/jobs'
import {
  STEP_OWNER_LABELS,
  STEP_STATUSES,
  STEP_STATUS_LABELS,
  type StepStatus,
} from '@/lib/jobs/progress'
import type { JobStepRow } from '@/lib/jobs/types'

const STATUS_DOT: Record<StepStatus, string> = {
  todo: 'bg-slate-300',
  in_progress: 'bg-blue-500',
  waiting_client: 'bg-amber-500',
  done: 'bg-green-500',
  skipped: 'bg-slate-200',
}

const OWNER_STYLE: Record<JobStepRow['owner'], string> = {
  manna: 'bg-[rgba(58,175,185,0.1)] text-[#006970]',
  client: 'bg-amber-50 text-amber-700',
  third_party: 'bg-slate-100 text-slate-600',
}

type Message = { kind: 'ok' | 'error'; text: string } | null

function StepRow({ step }: { step: JobStepRow }) {
  const [status, setStatus] = useState<StepStatus>(step.status)
  const [clientNote, setClientNote] = useState(step.client_note ?? '')
  const [internalNote, setInternalNote] = useState(step.internal_note ?? '')
  // What the database holds now; the dot and the Save button compare against it.
  const [saved, setSaved] = useState({
    status: step.status,
    clientNote: step.client_note ?? '',
    internalNote: step.internal_note ?? '',
  })
  const [message, setMessage] = useState<Message>(null)
  const [pending, startTransition] = useTransition()

  const dirty =
    status !== saved.status ||
    clientNote !== saved.clientNote ||
    internalNote !== saved.internalNote

  function save() {
    setMessage(null)
    startTransition(async () => {
      const result = await updateJobStep(step.id, {
        status,
        client_note: clientNote,
        internal_note: internalNote,
      })
      if (result.ok) {
        setSaved({ status, clientNote, internalNote })
        setMessage({ kind: 'ok', text: 'Saved' })
      } else {
        setMessage({ kind: 'error', text: result.error })
      }
    })
  }

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-4">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[saved.status]}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {step.position}. {step.title_en}{' '}
                <span
                  className={`align-middle text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${OWNER_STYLE[step.owner]}`}
                >
                  {STEP_OWNER_LABELS[step.owner].en}
                </span>
              </p>
              <p className="text-xs text-slate-400">{step.title_vi}</p>
              {step.description_en && (
                <p className="mt-1 text-xs text-slate-500">{step.description_en}</p>
              )}
              {step.description_vi && (
                <p className="text-xs text-slate-400">{step.description_vi}</p>
              )}
            </div>
            <select
              aria-label={`Status of step ${step.position}`}
              value={status}
              onChange={(e) => setStatus(e.target.value as StepStatus)}
              disabled={pending}
              className="rounded-lg border border-[#bcc9ca]/60 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              {STEP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STEP_STATUS_LABELS[s].en}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Client note (the client sees this)
              </span>
              <textarea
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                rows={2}
                disabled={pending}
                className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Internal note (staff only)
              </span>
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={2}
                disabled={pending}
                className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending}
              className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: '#3AAFB9' }}
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
            {message && (
              <span
                role="status"
                className={`text-xs font-semibold ${
                  message.kind === 'ok' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {message.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function JobStepList({ steps }: { steps: JobStepRow[] }) {
  return (
    <ul className="divide-y divide-[#ebeef3]">
      {steps.map((step) => (
        <StepRow key={step.id} step={step} />
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Create the page**

Create `apps/internal_app/src/app/(app)/jobs/[id]/page.tsx`. A malformed id, a missing job and a job hidden by RLS all reach `notFound()`; a job with no steps gets an explanatory card:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJob } from '@/actions/jobs'
import JobProgressBar from '@/components/jobs/JobProgressBar'
import JobStatusBadge from '@/components/jobs/JobStatusBadge'
import JobStepList from '@/components/jobs/JobStepList'
import { deriveProgress } from '@/lib/jobs/progress'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const CARD_SHADOW = { boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const job = await getJob(id)
  // A malformed id, a missing row and an RLS-hidden row are the same thing here.
  if (!job) notFound()

  const progress = deriveProgress(job.steps)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Jobs
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
            {job.description || 'Untitled job'}
          </h2>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="text-sm text-slate-400 mt-0.5">
          {job.client ? (
            <Link href={`/clients/${job.client.id}`} className="hover:underline">
              {job.client.last_name}, {job.client.first_name}
            </Link>
          ) : (
            '—'
          )}
          {' · '}
          {formatCurrency(job.fee)}
          {job.deadline && ` · due ${formatDate(job.deadline)}`}
        </p>
      </div>

      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <JobProgressBar progress={progress} stepCount={job.steps.length} />
      </div>

      {job.notes && (
        <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Job notes (staff only)
          </p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
          Steps
        </h3>
        {job.steps.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            This job has no steps. It was created without a template, so its status is set by hand.
          </p>
        ) : (
          <JobStepList steps={job.steps} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Type-check and lint**

Run: `pnpm --filter internal_app type-check`
Expected: clean.

Run: `pnpm --filter internal_app exec eslint src/components/jobs "src/app/(app)/jobs/[id]"`
Expected: no output (0 problems).

- [ ] **Step 6: Commit**

```bash
git add apps/internal_app/src/components/jobs "apps/internal_app/src/app/(app)/jobs/[id]"
git commit -m "$(cat <<'EOF'
feat(internal-app): job detail page with a step editor

/jobs/[id] shows the client, status, fee, deadline and progress, then each step
with its owner, a status select, a client note and an internal note, saved one
step at a time. A job with no steps says so; a bad or hidden id is a 404.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Extract `ClientLookup` into a shared component

**Files:**
- Create: `apps/internal_app/src/components/clients/ClientLookup.tsx`
- Modify: `apps/internal_app/src/app/(app)/cases/new/page.tsx`

**Interfaces:**
- Consumes: `getClients` from `@/actions/clients` (existing).
- Produces: `ClientLookup({ value, onChange, initialName? })` from `@/components/clients/ClientLookup` (default export); `onChange(id, name)`.

This is a refactor with no change of behaviour for `/cases/new`. The New Job form becomes its third user, which is why it is extracted now (rule of three). The extraction also removes the original's lint problems (an `any[]`, a synchronous `setState` inside an effect, and two props the component never read).

- [ ] **Step 1: Record the lint baseline of the page being edited**

Run: `pnpm --filter internal_app exec eslint "src/app/(app)/cases/new/page.tsx"`
Expected: `✖ 5 problems (3 errors, 2 warnings)`.

- [ ] **Step 2: Create the shared component**

Create `apps/internal_app/src/components/clients/ClientLookup.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { getClients } from '@/actions/clients'

interface ClientSearchResult {
  id: string
  first_name: string
  last_name: string
  a_number: string | null
}

/**
 * Search box that picks one existing client. Extracted unchanged from
 * cases/new/page.tsx when New Job became its third user.
 */
export default function ClientLookup({
  value,
  onChange,
  initialName = '',
}: {
  value: string
  onChange: (id: string, name: string) => void
  /** Shown while `value` is already set on first render, for example from a URL. */
  initialName?: string
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ClientSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedName, setSelectedName] = useState(initialName)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!search.trim()) return
    const delay = setTimeout(async () => {
      setResults(await getClients(search))
    }, 300)
    return () => clearTimeout(delay)
  }, [search])

  // Old results stay hidden while the box is empty, as clearing them did before.
  const visibleResults = search.trim() ? results : []

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Identify the Client</h2>
      <p className="text-sm text-slate-500 mb-8">Search for an existing client in the MOS database or create a new profile to continue.</p>

      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
        <span>Client Name or A-Number</span>
        {value && <span className="text-[#3AAFB9] cursor-pointer hover:underline" onClick={() => { onChange('', ''); setSelectedName(''); setSearch('') }}>Clear</span>}
      </label>

      {value ? (
        <div className="w-full px-4 py-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-green-200/50 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-green-700 text-sm">person</span>
            </div>
            <div>
              <p className="font-semibold">{selectedName}</p>
              <p className="text-xs text-green-700 mt-0.5">Selected from database</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-green-600 text-[28px]">check_circle</span>
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setIsOpen(true) }}
              onFocus={() => setIsOpen(true)}
              placeholder="e.g. Maria"
              className="w-full pl-4 pr-10 py-3 border-b-2 border-[#3AAFB9] bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-300 font-sans font-medium transition-colors focus:bg-slate-50 rounded-t-lg"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#3AAFB9]">search</span>
          </div>

          {isOpen && search.trim() && (
            <div className="absolute z-20 w-full mt-2 bg-white border border-[#ebeef3] rounded-xl shadow-[0_12px_40px_-12px_rgba(0,105,112,0.15)] overflow-hidden">
              <div className="bg-[#f7f9ff] px-4 py-2 border-b border-[#ebeef3]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matching Results ({visibleResults.length})</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {visibleResults.length > 0 ? (
                  visibleResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onChange(c.id, `${c.first_name} ${c.last_name}`)
                        setSelectedName(`${c.first_name} ${c.last_name}`)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-[#f7f9ff] border-b border-[#ebeef3] last:border-0 flex items-center gap-4 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#e7f6f7] text-[#006970] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">person</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold text-slate-800 truncate">{c.first_name} {c.last_name}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5 truncate tracking-wide">
                          {c.a_number ? `A# ${c.a_number}` : 'No A-Number'}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-5 py-6 text-sm text-center text-slate-500 font-medium">No matching clients found.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Check that the markup did not change**

```bash
git show HEAD:"apps/internal_app/src/app/(app)/cases/new/page.tsx" | sed -n '/^function ClientLookup/,/^const FORM_OPTIONS/p' > "$SP/old-lookup.txt"
diff "$SP/old-lookup.txt" apps/internal_app/src/components/clients/ClientLookup.tsx
```

Read the diff. Every difference must be one of: the `'use client'` line and imports; the `ClientSearchResult` type instead of `any[]`; `initialName` and the doc comments; the second effect no longer resets `results` (a `visibleResults` constant does that); the removed `label` and `placeholder` props; `visibleResults` used instead of `results` in the dropdown. The JSX tree and every class name are identical. If anything else differs, fix the component.

- [ ] **Step 4: Point `cases/new` at it**

Save this script as `$SP/edit_cases_new.py`:

```python
import pathlib
import sys

# Run from apps/internal_app. Moves ClientLookup out of cases/new/page.tsx.
path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'src/app/(app)/cases/new/page.tsx')
text = path.read_text()

# 1. Cut the local ClientLookup component (it ends right before FORM_OPTIONS).
start = text.index('function ClientLookup(')
end = text.index('const FORM_OPTIONS')
text = text[:start] + text[end:]

# 2. Import the extracted component instead of the getClients action it used.
old_import = "import { getClients } from '@/actions/clients'\n"
assert old_import in text, 'getClients import not found'
text = text.replace(old_import, "import ClientLookup from '@/components/clients/ClientLookup'\n")

# 3. Drop the two props the component never read.
for old in (
    "              label={caseType === 'package' ? 'Primary Client (Petitioner) *' : 'Client *'}\n"
    '              placeholder="Search for an existing client in the MOS database..."\n',
    '                label="Secondary Client (Beneficiary)"\n'
    '                placeholder="Search beneficiary in the MOS database..."\n',
):
    assert old in text, 'call-site props not found: ' + old[:40]
    text = text.replace(old, '')

# 4. Keep the React import honest: only the removed component used these hooks.
react_import = "import { useState, useEffect, useRef } from 'react'\n"
assert react_import in text, 'react import not found'
body = text.replace(react_import, '')
hooks = ['useState']
for hook in ('useEffect', 'useRef'):
    if hook + '(' in body or hook + '<' in body:
        hooks.append(hook)
text = text.replace(react_import, "import { " + ', '.join(hooks) + " } from 'react'\n")

path.write_text(text)
print('react hooks still imported:', ', '.join(hooks))
```

Run it from `apps/internal_app`:

```bash
(cd apps/internal_app && python3 -I "$SP/edit_cases_new.py")
```

Expected output: `react hooks still imported: useState`.

- [ ] **Step 5: Type-check, lint, run the tests**

Run: `pnpm --filter internal_app type-check`
Expected: clean.

Run: `pnpm --filter internal_app exec eslint "src/app/(app)/cases/new/page.tsx" src/components/clients/ClientLookup.tsx`
Expected: `✖ 1 problem (1 error, 0 warnings)`: a `no-explicit-any` that was already in the page's own code. The four problems that came from the old inline component are gone, and the new component adds none.

Run: `pnpm --filter internal_app test`
Expected: all suites still pass (`Tests: 120 passed`).

- [ ] **Step 6: Commit**

```bash
git add "apps/internal_app/src/components/clients/ClientLookup.tsx" "apps/internal_app/src/app/(app)/cases/new/page.tsx"
git commit -m "$(cat <<'EOF'
refactor(internal-app): ClientLookup becomes a shared component

Moved out of cases/new/page.tsx unchanged in behaviour because New Job is its
third user. Typed instead of any[], no setState inside an effect, the two props
it never read are gone, and an optional initialName shows a pre-selected
client. cases/new/page.tsx drops from 5 lint problems to 1 (the remaining one is its own).

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: New Job page

**Files:**
- Create: `apps/internal_app/src/components/jobs/NewJobForm.tsx`
- Create: `apps/internal_app/src/app/(app)/jobs/new/page.tsx`

**Interfaces:**
- Consumes: `createJobFromTemplate`, `getJobTemplates`, `getClientBrief` (Task 5); `ClientLookup` (Task 7); `JobTemplateSummary` (Task 4).
- Produces: `NewJobForm({ templates, initialClient })` and the route `/jobs/new` (accepts `?client_id=`).

- [ ] **Step 1: Create the form**

Create `apps/internal_app/src/components/jobs/NewJobForm.tsx`. The button stays disabled while the request runs and after it succeeds, because `router.push` is still in flight when the transition ends and a second click would create a second job:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createJobFromTemplate } from '@/actions/jobs'
import ClientLookup from '@/components/clients/ClientLookup'
import type { JobTemplateSummary } from '@/lib/jobs/types'

const CARD_SHADOW = { boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }

export default function NewJobForm({
  templates,
  initialClient,
}: {
  templates: JobTemplateSummary[]
  initialClient: { id: string; name: string } | null
}) {
  const router = useRouter()
  const [clientId, setClientId] = useState(initialClient?.id ?? '')
  const [templateKey, setTemplateKey] = useState('')
  const [fee, setFee] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Stays true after a successful create: router.push is still in flight when
  // the transition ends, and a second click would make a second job.
  const [created, setCreated] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!clientId) {
      setError('Choose a client.')
      return
    }
    if (!templateKey) {
      setError('Choose a service template.')
      return
    }
    startTransition(async () => {
      const data = new FormData()
      data.set('client_id', clientId)
      data.set('template_key', templateKey)
      data.set('fee', fee)
      data.set('deadline', deadline)
      data.set('notes', notes)
      const result = await createJobFromTemplate(data)
      if (result.ok) {
        setCreated(true)
        router.push(`/jobs/${result.value.id}`)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-8 max-w-3xl">
      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
          Client
        </h3>
        <ClientLookup
          value={clientId}
          onChange={(id) => setClientId(id)}
          initialName={initialClient?.name ?? ''}
        />
      </div>

      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
          Service
        </h3>
        {templates.length === 0 ? (
          <p className="text-sm text-slate-400">No service templates are available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3" role="radiogroup" aria-label="Service template">
            {templates.map((t) => {
              const selected = templateKey === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTemplateKey(t.key)}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    selected
                      ? 'border-[#3AAFB9] bg-[rgba(58,175,185,0.06)]'
                      : 'border-[#ebeef3] hover:bg-[#f7f9ff]'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">{t.title_en}</p>
                  <p className="text-xs text-slate-400">{t.title_vi}</p>
                  <p className="mt-2 text-xs text-slate-500">{t.description_en}</p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-400">{t.step_count} steps</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
          Details
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Fee (USD, optional)
            </span>
            <input
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              inputMode="decimal"
              placeholder="1,500"
              className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Deadline (optional)
            </span>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Notes (staff only, optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
            />
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || created}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: '#3AAFB9' }}
        >
          {pending || created ? 'Creating…' : 'Create job'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold text-slate-600 border border-[#bcc9ca]/40 hover:bg-[#f1f4f9]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create the page**

Create `apps/internal_app/src/app/(app)/jobs/new/page.tsx`. `getClientBrief` returns null for anything that is not a real uuid, so a mangled `?client_id=` leaves an empty picker:

```tsx
import { getClientBrief, getJobTemplates } from '@/actions/jobs'
import NewJobForm from '@/components/jobs/NewJobForm'

export const dynamic = 'force-dynamic'

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const { client_id } = await searchParams
  const templates = await getJobTemplates()

  // ?client_id= pre-selects a client (the "New Job" link on a client's page).
  // getClientBrief ignores anything that is not a real uuid, so a mangled link
  // just shows an empty picker.
  const client = client_id ? await getClientBrief(client_id) : null
  const initialClient = client
    ? { id: client.id, name: `${client.first_name} ${client.last_name}` }
    : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">New Job</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Pick a client and a service. The steps are copied from the template.
        </p>
      </div>
      <NewJobForm templates={templates} initialClient={initialClient} />
    </div>
  )
}
```

- [ ] **Step 3: Type-check and lint**

Run: `pnpm --filter internal_app type-check`
Expected: clean.

Run: `pnpm --filter internal_app exec eslint src/components/jobs "src/app/(app)/jobs/new"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/internal_app/src/components/jobs/NewJobForm.tsx "apps/internal_app/src/app/(app)/jobs/new"
git commit -m "$(cat <<'EOF'
feat(internal-app): New Job page

Pick a client (or arrive with ?client_id=), pick a template, optionally set a
fee and deadline, and create the job with its steps copied from the template.
The Create button stays disabled after a success so a double click cannot make
two jobs. The "New Job" button on /jobs used to point at a page that did not
exist.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Jobs list shows the service and progress

**Files:**
- Modify (rewrite): `apps/internal_app/src/app/(app)/jobs/page.tsx`
- Test: `apps/internal_app/__tests__/lib/utils.test.ts`

**Interfaces:**
- Consumes: `getJobs` (Task 5); `JobProgressBar`, `JobStatusBadge` (Task 6); `deriveProgress` (Task 1); `formatCurrency`, `formatDate` from `@/lib/utils` (existing).
- Produces: the updated `/jobs` list; a regression test that pins `formatDate`.

- [ ] **Step 1: Pin `formatDate` before relying on it**

The old list formatted the deadline with `new Date(job.deadline).toLocaleDateString(...)`, which shows Oct 19 for a 2026-10-20 deadline in US time zones. `formatDate` splits the string instead. Create `apps/internal_app/__tests__/lib/utils.test.ts`:

```ts
import { formatDate } from '@/lib/utils'

describe('formatDate', () => {
  // Date-only strings such as a job deadline must never go through new Date():
  // '2026-10-20' parses as UTC midnight and shows as Oct 19 in US time zones.
  it('formats a date-only string by splitting it, with no time zone shift', () => {
    expect(formatDate('2026-10-20')).toBe('10/20/2026')
    expect(formatDate('2026-01-01')).toBe('01/01/2026')
    expect(formatDate('2026-12-31')).toBe('12/31/2026')
  })

  it('returns an empty string for a missing date', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
  })
})
```

Run: `pnpm --filter internal_app exec jest __tests__/lib/utils.test.ts`
Expected: PASS, `Tests: 2 passed` (a characterisation test: the helper already behaves this way).

- [ ] **Step 2: Rewrite the list page**

Replace the whole of `apps/internal_app/src/app/(app)/jobs/page.tsx` with:

```tsx
import Link from 'next/link'
import { getJobs } from '@/actions/jobs'
import JobProgressBar from '@/components/jobs/JobProgressBar'
import JobStatusBadge from '@/components/jobs/JobStatusBadge'
import { deriveProgress } from '@/lib/jobs/progress'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const jobs = await getJobs()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Jobs</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Business services, tax, insurance and AI: steps and progress per client
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div
          className="bg-white rounded-xl p-16 text-center"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <span className="material-symbols-outlined text-5xl text-slate-200">work</span>
          <p className="mt-4 text-slate-500 font-medium">No jobs yet</p>
        </div>
      ) : (
        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <table className="w-full text-left">
            <thead className="bg-[#f7f9ff]/60 border-b border-[#ebeef3]">
              <tr>
                {['Client', 'Job', 'Progress', 'Fee', 'Status', 'Deadline'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-t border-[#f1f4f9] hover:bg-[#f7f9ff]/40 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-700">
                      {job.client ? `${job.client.last_name}, ${job.client.first_name}` : '—'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-sm font-semibold text-slate-700 hover:underline"
                    >
                      {job.description || 'Untitled job'}
                    </Link>
                    <p className="mt-0.5">
                      <span className="text-[10px] font-bold capitalize px-2 py-0.5 rounded bg-[#f1f4f9] text-slate-600">
                        {job.service_type}
                      </span>
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <JobProgressBar
                      progress={deriveProgress(job.steps)}
                      stepCount={job.steps.length}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-700">
                      {formatCurrency(job.fee)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500">{formatDate(job.deadline) || '—'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Check that no date-only value goes through `new Date`**

Run: `grep -rn "new Date(job" apps/internal_app/src`
Expected: no output.

- [ ] **Step 4: Type-check, lint, test**

Run: `pnpm --filter internal_app type-check`, `pnpm --filter internal_app exec eslint "src/app/(app)/jobs" __tests__/lib/utils.test.ts`, `pnpm --filter internal_app test`
Expected: type-check clean; ESLint prints nothing (the old page had one `no-explicit-any` in `items.map((job: any) => …)`; the rewrite has none); `Test Suites: 11 passed`, `Tests: 122 passed`.

- [ ] **Step 5: Commit**

```bash
git add "apps/internal_app/src/app/(app)/jobs/page.tsx" apps/internal_app/__tests__/lib/utils.test.ts
git commit -m "$(cat <<'EOF'
feat(internal-app): jobs list shows the job, its progress and status

Each row links to the job; a job without steps shows a dash instead of 0/0.
Deadlines go through formatDate, so a 2026-10-20 deadline no longer reads Oct 19
in US time zones; a test pins that helper.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Business services on the client page

**Files:**
- Create: `apps/internal_app/src/lib/auth/is-admin.ts`
- Modify: `apps/internal_app/src/app/(app)/clients/[id]/page.tsx`

**Interfaces:**
- Consumes: `getJobsForClient` (Task 5); `JobProgressBar`, `JobStatusBadge` (Task 6); `deriveProgress` (Task 1); `timeAgo` from `@/lib/utils` (existing).
- Produces: `isCurrentUserAdmin(): Promise<boolean>` from `@/lib/auth/is-admin`; a "Business services" card on `/clients/[id]`, shown to admins only (staff never see Jobs in v1).

- [ ] **Step 1: Record the lint baseline**

Run: `pnpm --filter internal_app exec eslint "src/app/(app)/clients/[id]/page.tsx"`
Expected: `✖ 1 problem (1 error, 0 warnings)`: a `no-explicit-any` at `cases.map((c: any) => …)`, already in the page. Fixing it is outside this task; the section you add must not add a second one.

- [ ] **Step 2: Create the admin check**

Create `apps/internal_app/src/lib/auth/is-admin.ts`:

```ts
import { createClient } from '@/lib/supabase/server'

/**
 * True when the signed-in account's profile role is 'admin'. Server-only.
 *
 * Jobs are admin-only in v1 (the 2026-04-16 roles plan keeps staff out of
 * them), so pages that mention jobs use this to decide what to show staff.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}
```

- [ ] **Step 3: Add the section to the client page**

Save this script as `$SP/edit_client_page.py`:

```python
import pathlib
import sys

# Run from apps/internal_app. Adds the "Business services" card to the client page.
path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'src/app/(app)/clients/[id]/page.tsx')
text = path.read_text()

# 1. Imports.
anchor = "import type { ServiceTag } from '@/types'\n"
assert anchor in text, 'ServiceTag import not found'
text = text.replace(
    anchor,
    anchor
    + "import { getJobsForClient } from '@/actions/jobs'\n"
    + "import JobProgressBar from '@/components/jobs/JobProgressBar'\n"
    + "import JobStatusBadge from '@/components/jobs/JobStatusBadge'\n"
    + "import { isCurrentUserAdmin } from '@/lib/auth/is-admin'\n"
    + "import { deriveProgress } from '@/lib/jobs/progress'\n",
)
text = text.replace(
    "import { getInitials, formatDate } from '@/lib/utils'",
    "import { getInitials, formatDate, timeAgo } from '@/lib/utils'",
)

# 2. Data: jobs are admin-only in v1, so staff get an empty list and no section.
anchor = "  const addr = client.address as Record<string, string> | null\n"
assert anchor in text, 'address line not found'
text = text.replace(
    anchor,
    "  // Jobs are admin-only in v1 (2026-04-16 roles plan): staff never see this section.\n"
    "  const isAdmin = await isCurrentUserAdmin()\n"
    "  const jobs = isAdmin ? await getJobsForClient(id) : []\n\n" + anchor,
)

# 3. The card, as the last child of the page's root div.
card = """
      {/* Business services (admin only) */}
      {isAdmin && (
        <div
          className="bg-white rounded-xl p-6"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#ebeef3]">
            <h3 className="text-base font-semibold text-slate-800">Business services</h3>
            <Link
              href={`/jobs/new?client_id=${client.id}`}
              className="text-xs font-semibold flex items-center gap-1"
              style={{ color: '#3AAFB9' }}
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Job
            </Link>
          </div>

          {jobs.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No business services yet.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg hover:bg-[#f7f9ff] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {job.description || 'Untitled job'}
                    </p>
                    <p className="text-[11px] text-slate-400">Updated {timeAgo(job.updated_at)}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <JobProgressBar
                      progress={deriveProgress(job.steps)}
                      stepCount={job.steps.length}
                    />
                    <JobStatusBadge status={job.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
"""
tail = '    </div>\n  )\n}'
idx = text.rindex(tail)
text = text[:idx] + '\n' + card.lstrip('\n') + tail + text[idx + len(tail):]

path.write_text(text)
print('client page updated')
```

Run it from `apps/internal_app`:

```bash
(cd apps/internal_app && python3 -I "$SP/edit_client_page.py")
```

Expected output: `client page updated`. Then review the change: `git diff -- "apps/internal_app/src/app/(app)/clients/[id]/page.tsx"` shows new imports, three lines that read `isAdmin` and `jobs`, and one card added as the last child of the page.

- [ ] **Step 4: Type-check, lint, test**

Run: `pnpm --filter internal_app type-check`, `pnpm --filter internal_app exec eslint src/lib/auth "src/app/(app)/clients/[id]/page.tsx"`, `pnpm --filter internal_app test`
Expected: type-check clean; ESLint reports the same single `no-explicit-any` as in Step 1 (its line number moves down) and nothing else; `Tests: 122 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/internal_app/src/lib/auth/is-admin.ts "apps/internal_app/src/app/(app)/clients/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(internal-app): Business services section on the client page

Lists the client's jobs with progress and status, and a New Job link that
arrives with the client selected. Admin only, like the Jobs pages: staff get no
section.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Whole-slice verification, owner smoke test, ROADMAP and memory

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify (memory, outside the repo): `/Users/anhnguyen/.claude/projects/-Users-anhnguyen-Obsidian-Business-planning/memory/business-progress-tracker.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the finished slice, recorded.

- [ ] **Step 1: Full automated checks**

Run each and compare:

| Command | Expected |
|---|---|
| `pnpm --filter internal_app test` | `Test Suites: 11 passed`, `Tests: 122 passed` |
| `pnpm --filter internal_app type-check` | no output |
| `pnpm --filter internal_app exec eslint` | `✖ 86 problems (79 errors, 7 warnings)` (down from 91: the extraction removed 4 from `cases/new`, the rewritten jobs page removed 1; nothing was added) |
| `pnpm --filter internal_app exec eslint src/lib/jobs src/lib/auth src/actions/jobs.ts src/components/jobs src/components/clients/ClientLookup.tsx "src/app/(app)/jobs" __tests__/lib/jobs __tests__/lib/utils.test.ts` | no output (every new or rewritten file is clean) |
| `pnpm --filter internal_app exec eslint "src/app/(app)/clients/[id]/page.tsx" "src/app/(app)/cases/new/page.tsx"` | `✖ 2 problems (2 errors, 0 warnings)`: one `no-explicit-any` in each page, both already there before this slice |
| `pnpm --filter internal_app build` | succeeds; the route table now lists `/jobs`, `/jobs/[id]` and `/jobs/new` |

- [ ] **Step 2: Owner smoke test (needs the admin login, so the owner does it)**

Run `select now() as smoke_started_at;` through `execute_sql` and write the value down. Start the app with `pnpm --filter internal_app dev` and ask the owner to sign in as the admin and go through this list. The dev server talks to the real database, so this creates real rows; Step 3 removes them.

1. `/jobs` shows "No jobs yet" and a New Job button.
2. New Job: search `test`, pick the client "test 1 test 2", choose "Texas LLC formation", fee `1,500`, Create. You land on `/jobs/<id>` with 9 steps, progress `0/9`, status OPEN.
3. Set step 1 to In progress, Save: "Saved" appears and the header status becomes IN PROGRESS. Reload: it stays.
4. Set step 1 to Done with a client note, Save. Progress reads `1/9`.
5. Set step 1 back to To do, Save. Status returns to OPEN and progress to `0/9` (reopening).
6. Open `/jobs/not-a-uuid`: a 404 page, no crash. Open `/jobs/new?client_id=garbage`: the page loads with an empty client picker.
7. Open the test client's page: a "Business services" card lists the job with its progress bar.
8. Open `/cases/new`, search for a client and select one: it behaves as before (this is the extracted component).
9. On New Job, double click Create job quickly: `/jobs` lists exactly one new job.
10. Type `1.500` in the fee field and Create: the form shows "Fee must be a dollar amount with at most 2 decimals…" and creates nothing.

Stop the dev server afterwards. If any step fails, fix it with a new commit before continuing.

- [ ] **Step 3: Remove the smoke-test rows**

After the owner confirms the list passed, delete what it created (use the timestamp from Step 2):

```sql
delete from public.jobs where created_at >= '<smoke_started_at value>';
select (select count(*) from public.jobs) as jobs, (select count(*) from public.job_steps) as job_steps;
```

Expected: `0, 0` (steps go with their jobs).

- [ ] **Step 4: Update the ROADMAP**

In `docs/ROADMAP.md`:

1. Directly after the "Độ phủ PRD V1 của Internal App" table (before `## Track 2`), add:

```markdown
### Business Progress Tracker (Internal App + portal)
> Spec: `docs/superpowers/specs/2026-10-15-business-progress-tracker-design.md`. Plan lát 1: `docs/superpowers/plans/2026-10-15-business-progress-tracker-slice-1-staff.md`. v1 chỉ admin dùng Jobs (giữ quy tắc phân quyền 2026-04-16).
- [ ] **Lát 0 — Deploy internal app:** project Vercel cho `apps/internal_app`, domain `app.mannaos.com` (đề xuất, owner chốt), biến môi trường, URL trong Supabase Auth, `noindex`. Owner tạo project Vercel và DNS.
- [x] **Lát 1 — Nhân viên theo dõi tiến độ:** migration `010_job_templates_and_steps.sql` (3 mẫu `tx_llc`, `business_bank_account`, `business_website`; sửa `jobs`: khóa ngoại `created_by`, `updated_at`, `case_id`; RLS admin-only), trang `/jobs`, `/jobs/new`, `/jobs/[id]`, mục "Business services" trên `/clients/[id]`.
- [ ] **Lát 2 — Email cho khách:** Resend từ internal app, bảng `job_notifications`, email song ngữ.
- [ ] **Lát 3 — Mời khách vào portal:** `client_portal_invites`, RPC `claim_portal_invite` và `portal_my_services`, tab My Services có dòng thời gian.
```

2. In the PRD coverage table, replace the status cell and text of row `| 10 | Jobs (Tax/Insurance/AI) |` with: `🟡 | Business Progress Tracker lát 1 (ngày hoàn thành): tạo job từ mẫu, các bước, tiến độ, admin-only. Còn thiếu: email cho khách (lát 2), portal (lát 3), staff dùng Jobs` (use the real date).
3. In the 📌 bullet `Internal App — bảng thiếu policy + FK sai`, append: `Riêng `jobs` đã sửa ở migration 010 (FK `created_by` → `profiles`, `updated_at`, `case_id`, policy admin-only).`
4. Update the `Last updated` line to today's date if it is earlier.

Commit:

```bash
git add docs/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: ROADMAP — business progress tracker slice 1

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Update memory**

In `business-progress-tracker.md` (memory directory above) record: slice 1 done (date, commit range), migration `010` applied to prod as `job_templates_and_steps`, the data shapes now live (`job_steps.status` values, `create_job_from_template`), that jobs are admin-only, and that slices 0, 2 and 3 are next with their own plans. Keep the memory index line in `MEMORY.md` accurate.

- [ ] **Step 6: Report and ask about pushing**

Summarise for the owner: what shipped, the live probe result, the lint and test numbers, anything that deviated from this plan. Ask whether to push the commits (the spec commit `e2c4ecbf` and this plan's commits are local). Do not push without a yes.

