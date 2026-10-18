# G4 follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) website treats `booked` consultation requests as open and the booked stamp clears when no booked/done request remains; (B) the seven policy-less internal_app tables get PRD-correct RLS and FKs to `profiles`; (C) a daily Sales-Ready digest email from internal_app.

**Architecture:** Three independent parts, each = one migration (controller applies after owner OK) + code where needed. Website change is a shared status constant. Internal-app digest = Vercel Cron → route guarded by `CRON_SECRET` → service-role read of `n400_leads_view` → pure planner → one Resend email → stamp `sales_ready_notified_at`.

**Tech Stack:** website: Next.js + vitest; internal_app: Next.js 16 App Router + Jest (`next/jest`); Supabase Postgres/RLS; Resend (existing `sendWithResend`); Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-10-18-g4-followups-design.md`

## Global Constraints

- Migrations are written by the controller and applied only after owner approval; subagents never touch the database.
- Website migration numbers: `n400_42`, `n400_43` in `apps/website/supabase/migrations/`. Internal app: `016_finance_audit_notification_policies.sql` in `apps/internal_app/supabase/migrations/`. `014_advisor_cleanup.sql` (untracked) is not ours — never stage it.
- `n400_trg_recompute_on_consultation` keeps SECURITY DEFINER, `SET search_path = public`, and its grant posture (EXECUTE only postgres + service_role; re-assert `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated`).
- RLS policies `TO authenticated`, helpers wrapped as `(SELECT public.is_staff_or_admin())` / `(SELECT public.is_admin())`.
- Sales-Ready = `n400_leads_view.effective_status = 'sales_ready'`; recipient exactly `Chris@mannaos.com`; cron `0 13 * * *`; route `/api/cron/sales-ready`; env `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (never committed, never `NEXT_PUBLIC_`).
- Every lead-scoped query uses explicit filters; never write `clients.user_id`.
- Commit trailers name the model that wrote the code (`Co-Authored-By: Claude <Model> 5.5 <noreply@anthropic.com>`).
- Untracked files not ours: `videos/`, `.claude/launch.json`, `apps/internal_app/supabase/migrations/014_advisor_cleanup.sql`.

## Review Focus

1. Staff moves a request Booked → Cancelled while another request of the same lead is Done → booked stamp must stay (EXISTS over all requests, not NEW only). Pinned in Task 2 probe.
2. A staff user inserting a payment/expense/audit row on behalf of someone else (`logged_by`/`user_id` ≠ self) → RLS refuses. Pinned in Task 3 probe.
3. Admin trying to UPDATE/DELETE an `audit_log` row → refused (append-only). Pinned in Task 3 probe.
4. Cron route called without/with wrong secret, or with env missing → 401/500, no DB or email work. Pinned in Task 6 tests.
5. Email send fails → leads are NOT stamped, so tomorrow retries; lead drops below threshold → stamp cleared so a later re-cross re-notifies. Pinned in Task 5 tests (planner) + Task 6 code path.

---

### Task 1: Website — `booked` counts as an open request

**Files:**
- Modify: `apps/website/src/lib/n400/growth/booking.ts` (add constant)
- Modify: `apps/website/src/lib/n400/growth/booking-actions.ts` (lines ~58 and ~104)
- Modify: `apps/website/src/lib/n400/growth/cta-state.ts` (line ~43)
- Test: `apps/website/src/lib/n400/growth/booking.test.ts` (append)

**Interfaces:**
- Produces: `export const OPEN_CONSULTATION_STATUSES = ['new', 'contacted', 'booked'] as const` in `booking.ts`.

- [ ] **Step 1: Write the failing test** — append to `booking.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OPEN_CONSULTATION_STATUSES } from './booking';

describe('OPEN_CONSULTATION_STATUSES', () => {
  it('treats a booked consultation as still open (no second request, CTA parked)', () => {
    expect(OPEN_CONSULTATION_STATUSES).toEqual(['new', 'contacted', 'booked']);
  });

  it('is the only open-status list the booking and CTA readers use', () => {
    for (const file of ['booking-actions.ts', 'cta-state.ts']) {
      const src = readFileSync(join(__dirname, file), 'utf8');
      expect(src).toContain('OPEN_CONSULTATION_STATUSES');
      expect(src).not.toMatch(/\.in\(\s*'status'\s*,\s*\[/);
    }
  });
});
```

(Merge the new imports into the file's existing import block; keep the existing `vitest` import.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/booking.test.ts`
Expected: FAIL — `OPEN_CONSULTATION_STATUSES` is not exported.

- [ ] **Step 3: Implement**

In `booking.ts`, after the `PREFERRED_TIMES` type line add:

```ts
/** A request in these states is still being handled: the customer cannot
 *  file another one and the consultation CTA stays parked. `booked` belongs
 *  here — before 2026-10-18 it didn't, so a booked customer could re-request. */
export const OPEN_CONSULTATION_STATUSES = ['new', 'contacted', 'booked'] as const;
```

In `booking-actions.ts` add `OPEN_CONSULTATION_STATUSES` to the existing `./booking` import, and replace both `.in('status', ['new', 'contacted'])` with `.in('status', [...OPEN_CONSULTATION_STATUSES])`.

In `cta-state.ts` add `import { OPEN_CONSULTATION_STATUSES } from './booking';` and replace its `.in('status', ['new', 'contacted'])` the same way. Update the adjacent comment "An open (new/contacted) request" → "An open (new/contacted/booked) request".

- [ ] **Step 4: Run to verify it passes, then the suite**

Run: `cd apps/website && npx vitest run src/lib/n400/growth/booking.test.ts` → PASS.
Run: `cd apps/website && npx tsc --noEmit && npx eslint src/lib/n400/growth && npx vitest run` → all green (CI lint gate).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/growth/booking.ts apps/website/src/lib/n400/growth/booking-actions.ts apps/website/src/lib/n400/growth/cta-state.ts apps/website/src/lib/n400/growth/booking.test.ts
git commit -m "fix(n400-growth): a booked consultation counts as open

Co-Authored-By: Claude <Model> 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migration n400_42 — booked stamp follows the requests (controller)

**Files:**
- Create: `apps/website/supabase/migrations/n400_42_consultation_booked_at_recompute.sql`

- [ ] **Step 1: Write**

```sql
-- n400_42_consultation_booked_at_recompute.sql
-- consultation_booked_at used to be stamped once and never cleared, and
-- cta.ts retires the consultation CTA forever once it is set. A staff
-- mis-click (Booked → Cancelled) therefore hid the CTA for good.
-- Now: the stamp exists only while the lead still has a booked or done
-- request. Score already derives from the requests table (n400_17).

BEGIN;

CREATE OR REPLACE FUNCTION public.n400_trg_recompute_on_consultation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE n400_lead_profiles
  SET consultation_requested_at = COALESCE(consultation_requested_at, NEW.created_at),
      consultation_booked_at = CASE
        WHEN EXISTS (SELECT 1 FROM n400_consultation_requests r
                     WHERE r.user_id = NEW.user_id AND r.status IN ('booked','done'))
        THEN COALESCE(consultation_booked_at, now())
        ELSE NULL END,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  PERFORM recompute_n400_lead_score(NEW.user_id);
  RETURN NEW;
END; $$;

-- Same posture as n400_35: trigger-only, never callable.
REVOKE EXECUTE ON FUNCTION public.n400_trg_recompute_on_consultation() FROM PUBLIC, anon, authenticated;

COMMIT;
```

- [ ] **Step 2: Apply (after owner OK)** via MCP `apply_migration` name `n400_42_consultation_booked_at_recompute` (body without BEGIN/COMMIT).

- [ ] **Step 3: Probe (rolled back)** — as postgres: insert request A for Test User `752015e5-1118-49d7-b9bf-b690eda90a2b`; set A booked → stamp not null; set A cancelled → stamp null; insert B, set B done, set A booked then cancelled → stamp not null; `proacl` of the function = `{postgres=X/postgres,service_role=X/postgres}`. Rollback; residue 0; Test User `consultation_booked_at` still null.

- [ ] **Step 4: Commit** `feat(db): consultation booked stamp follows the requests (n400_42)` with probe results in the body.

---

### Task 3: Migration 016 — internal_app finance/audit/notification policies (controller)

**Files:**
- Create: `apps/internal_app/supabase/migrations/016_finance_audit_notification_policies.sql`

- [ ] **Step 1: Pre-check** (MCP `execute_sql`): the 6 FK names exist (`audit_log_user_id_fkey`, `checklist_templates_updated_by_fkey`, `expenses_logged_by_fkey`, `fee_schedule_updated_by_fkey`, `notifications_staff_id_fkey`, `payments_logged_by_fkey`); all 7 tables still 0 rows; 0 policies; current grants for `authenticated`.

- [ ] **Step 2: Write**

```sql
-- 016_finance_audit_notification_policies.sql
-- Seven tables had RLS on and no policy (spec 2026-10-18-g4-followups §B),
-- and their author FKs pointed at the empty legacy public.users table, so
-- every insert would fail even with policies. All seven are empty.
-- Rights follow the PRD (2026-04-09): staff log payments/expenses and read
-- templates/fees; only the admin edits templates/fees and reads the audit
-- trail; the audit trail is append-only; staff see only their notifications.

BEGIN;

-- ── author FKs → profiles ─────────────────────────────────────────────────
ALTER TABLE public.audit_log
  DROP CONSTRAINT audit_log_user_id_fkey,
  ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.checklist_templates
  DROP CONSTRAINT checklist_templates_updated_by_fkey,
  ADD CONSTRAINT checklist_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.expenses
  DROP CONSTRAINT expenses_logged_by_fkey,
  ADD CONSTRAINT expenses_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.fee_schedule
  DROP CONSTRAINT fee_schedule_updated_by_fkey,
  ADD CONSTRAINT fee_schedule_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_staff_id_fkey,
  ADD CONSTRAINT notifications_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.payments
  DROP CONSTRAINT payments_logged_by_fkey,
  ADD CONSTRAINT payments_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- ── authors default to the caller; templates/fees seedable by migration ───
ALTER TABLE public.audit_log ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.expenses ALTER COLUMN logged_by SET DEFAULT auth.uid();
ALTER TABLE public.payments ALTER COLUMN logged_by SET DEFAULT auth.uid();
ALTER TABLE public.fee_schedule
  ALTER COLUMN updated_by SET DEFAULT auth.uid(), ALTER COLUMN updated_by DROP NOT NULL;
ALTER TABLE public.checklist_templates
  ALTER COLUMN updated_by SET DEFAULT auth.uid(), ALTER COLUMN updated_by DROP NOT NULL;

-- ── table privileges (RLS below decides rows) ─────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_templates, public.fee_schedule,
  public.payments, public.expenses TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated;
GRANT SELECT ON public.notifications TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM authenticated;
GRANT UPDATE (read) ON public.notifications TO authenticated;

-- ── checklist_templates / fee_schedule: staff read, admin write ───────────
CREATE POLICY "checklist templates staff read" ON public.checklist_templates
  FOR SELECT TO authenticated USING ((SELECT public.is_staff_or_admin()));
CREATE POLICY "checklist templates admin insert" ON public.checklist_templates
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "checklist templates admin update" ON public.checklist_templates
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "checklist templates admin delete" ON public.checklist_templates
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

CREATE POLICY "fee schedule staff read" ON public.fee_schedule
  FOR SELECT TO authenticated USING ((SELECT public.is_staff_or_admin()));
CREATE POLICY "fee schedule admin insert" ON public.fee_schedule
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "fee schedule admin update" ON public.fee_schedule
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "fee schedule admin delete" ON public.fee_schedule
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ── payments / expenses: staff read + log as themselves, admin corrects ───
CREATE POLICY "payments staff read" ON public.payments
  FOR SELECT TO authenticated USING ((SELECT public.is_staff_or_admin()));
CREATE POLICY "payments staff insert" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_staff_or_admin()) AND logged_by = (SELECT auth.uid()));
CREATE POLICY "payments admin update" ON public.payments
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "payments admin delete" ON public.payments
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

CREATE POLICY "expenses staff read" ON public.expenses
  FOR SELECT TO authenticated USING ((SELECT public.is_staff_or_admin()));
CREATE POLICY "expenses staff insert" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_staff_or_admin()) AND logged_by = (SELECT auth.uid()));
CREATE POLICY "expenses admin update" ON public.expenses
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "expenses admin delete" ON public.expenses
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ── audit_log: append-only, admin reads ───────────────────────────────────
CREATE POLICY "audit log admin read" ON public.audit_log
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "audit log staff append" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_staff_or_admin()) AND user_id = (SELECT auth.uid()));

-- ── notifications: own rows, may only flip `read` ─────────────────────────
CREATE POLICY "notifications own read" ON public.notifications
  FOR SELECT TO authenticated
  USING (staff_id = (SELECT auth.uid()) AND (SELECT public.is_staff_or_admin()));
CREATE POLICY "notifications own mark read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (staff_id = (SELECT auth.uid()) AND (SELECT public.is_staff_or_admin()))
  WITH CHECK (staff_id = (SELECT auth.uid()));

COMMIT;
```

- [ ] **Step 3: Apply (after owner OK)** via `apply_migration` name `finance_audit_notification_policies`.

- [ ] **Step 4: Access-matrix probe (rolled back, zero residue)** — inside one `begin … rollback` per role group; use a `pg_temp` helper that executes a statement and returns `ok:<rows>` / `denied` / `err:<sqlstate>` (grant it to authenticated/anon). Roles: anon; client (Test User claims); staff (Test User temporarily `role='staff'` — set admin claims first so `protect_profile_role` allows it, all inside the rolled-back transaction); admin (`fb1d074c-…`). Expected:
  - anon: every table select/insert → denied.
  - client: every table select → 0 rows; inserts → denied.
  - staff: templates/fees select ok, insert denied; payments/expenses insert with own `logged_by` ok, with admin's id → denied, update/delete → 0 rows; audit_log insert own ok, select → 0 rows; notifications own row (inserted as postgres) select 1, update `read` ok, update `message` → denied.
  - admin: templates/fees insert/update/delete ok; audit_log select ok, update/delete → denied; payments update ok.
  Then `get_advisors(security)`: no new findings for these 7 tables.

- [ ] **Step 5: Commit** `feat(db): policies + profile FKs for finance, audit and notification tables (016)` with the matrix summary in the body.

---

### Task 4: Migration n400_43 — `sales_ready_notified_at` (controller)

**Files:**
- Create: `apps/website/supabase/migrations/n400_43_sales_ready_notified.sql`

- [ ] **Step 1: Write**

```sql
-- n400_43_sales_ready_notified.sql
-- Daily Sales-Ready digest (spec 2026-10-18-g4-followups §C): remember who
-- was already announced so each crossing is emailed once. Cleared by the
-- digest when the lead falls back below the threshold.
ALTER TABLE public.n400_lead_profiles
  ADD COLUMN IF NOT EXISTS sales_ready_notified_at timestamptz;
```

- [ ] **Step 2: Apply (after owner OK)**; verify column exists, nullable. Commit `feat(db): n400_lead_profiles.sales_ready_notified_at (n400_43)`.

---

### Task 5: Pure digest planner + email body

**Files:**
- Create: `apps/internal_app/src/lib/n400/sales-ready.ts`
- Test: `apps/internal_app/__tests__/lib/n400/sales-ready.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SalesReadyLead {
    user_id: string; full_name: string | null; email: string | null
    effective_score: number; last_activity_date: string | null
  }
  export function planSalesReadyDigest(salesReady: SalesReadyLead[], notifiedIds: ReadonlySet<string>):
    { toNotify: SalesReadyLead[]; toReset: string[] }
  export function buildSalesReadyEmail(leads: SalesReadyLead[], siteUrl: string):
    { subject: string; html: string; text: string }
  ```

- [ ] **Step 1: Write the failing test**

```ts
import { buildSalesReadyEmail, planSalesReadyDigest, type SalesReadyLead } from '@/lib/n400/sales-ready'

const lead = (user_id: string, extra: Partial<SalesReadyLead> = {}): SalesReadyLead => ({
  user_id, full_name: `Lead ${user_id}`, email: `${user_id}@x.com`,
  effective_score: 210, last_activity_date: '2026-10-17', ...extra,
})

describe('planSalesReadyDigest', () => {
  it('announces only leads not announced before', () => {
    const plan = planSalesReadyDigest([lead('a'), lead('b')], new Set(['b']))
    expect(plan.toNotify.map((l) => l.user_id)).toEqual(['a'])
  })

  it('clears the stamp of leads that fell below the threshold so a re-cross re-notifies', () => {
    const plan = planSalesReadyDigest([lead('a')], new Set(['a', 'gone']))
    expect(plan.toNotify).toEqual([])
    expect(plan.toReset).toEqual(['gone'])
  })

  it('does nothing when nobody is sales-ready and nobody was announced', () => {
    expect(planSalesReadyDigest([], new Set())).toEqual({ toNotify: [], toReset: [] })
  })
})

describe('buildSalesReadyEmail', () => {
  it('links each lead to its internal page and escapes user text', () => {
    const mail = buildSalesReadyEmail(
      [lead('u1', { full_name: '<b>Eve</b> & co' })],
      'https://app.example.com/',
    )
    expect(mail.subject).toBe('N400Ready — 1 new Sales-Ready lead')
    expect(mail.html).toContain('https://app.example.com/leads/u1')
    expect(mail.html).toContain('&lt;b&gt;Eve&lt;/b&gt; &amp; co')
    expect(mail.html).not.toContain('<b>Eve</b>')
    expect(mail.text).toContain('https://app.example.com/leads/u1')
  })

  it('pluralises the subject', () => {
    expect(buildSalesReadyEmail([lead('a'), lead('b')], 'https://x').subject).toBe(
      'N400Ready — 2 new Sales-Ready leads',
    )
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/internal_app && npx jest __tests__/lib/n400/sales-ready.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
// Daily Sales-Ready digest (spec 2026-10-18-g4-followups §C). Pure: the cron
// route loads rows and sends mail; this decides who and what.

export interface SalesReadyLead {
  user_id: string
  full_name: string | null
  email: string | null
  effective_score: number
  last_activity_date: string | null
}

/**
 * toNotify: sales-ready now, never announced. toReset: announced before but
 * no longer sales-ready — clearing their stamp lets a later re-cross notify.
 */
export function planSalesReadyDigest(
  salesReady: SalesReadyLead[],
  notifiedIds: ReadonlySet<string>,
): { toNotify: SalesReadyLead[]; toReset: string[] } {
  const readyIds = new Set(salesReady.map((l) => l.user_id))
  return {
    toNotify: salesReady.filter((l) => !notifiedIds.has(l.user_id)),
    toReset: [...notifiedIds].filter((id) => !readyIds.has(id)),
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildSalesReadyEmail(
  leads: SalesReadyLead[],
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const base = siteUrl.replace(/\/+$/, '')
  const n = leads.length
  const subject = `N400Ready — ${n} new Sales-Ready ${n === 1 ? 'lead' : 'leads'}`
  const rows = leads.map((l) => {
    const url = `${base}/leads/${l.user_id}`
    return {
      url,
      html: `<li><a href="${escapeHtml(url)}">${escapeHtml(l.full_name || 'Unnamed')}</a> · ${escapeHtml(
        l.email ?? '—',
      )} · score ${l.effective_score} · last active ${escapeHtml(l.last_activity_date ?? '—')}</li>`,
      text: `- ${l.full_name || 'Unnamed'} (${l.email ?? '—'}) · score ${l.effective_score} · ${url}`,
    }
  })
  return {
    subject,
    html: [
      `<h2>${escapeHtml(subject)}</h2>`,
      '<p>These N400Ready leads crossed the Sales-Ready threshold since the last digest.</p>',
      `<ul>${rows.map((r) => r.html).join('')}</ul>`,
    ].join('\n'),
    text: [subject, '', ...rows.map((r) => r.text)].join('\n'),
  }
}
```

- [ ] **Step 4: Run → PASS (5 tests); full `npx jest`; `npx tsc --noEmit`.**

- [ ] **Step 5: Commit** `feat(internal-app): Sales-Ready digest planner and email body`.

---

### Task 6: Cron route, service-role client, middleware exclusion, vercel.json

**Files:**
- Create: `apps/internal_app/src/lib/supabase/admin.ts`
- Create: `apps/internal_app/src/app/api/cron/sales-ready/route.ts`
- Create: `apps/internal_app/vercel.json`
- Modify: `apps/internal_app/src/middleware.ts` (matcher)
- Test: `apps/internal_app/__tests__/app/api/cron/sales-ready.test.ts`

**Interfaces:**
- Consumes: `planSalesReadyDigest`, `buildSalesReadyEmail`, `SalesReadyLead` (Task 5); `sendWithResend` from `@/lib/jobs/mailer`; column from Task 4.
- Produces: `GET(request: Request): Promise<Response>`; `createAdminClient(): SupabaseClient | null`.

Before writing the route, read `apps/internal_app/node_modules/next/dist/docs/01-app` on Route Handlers (this Next version).

- [ ] **Step 1: Write the failing test**

```ts
/** @jest-environment node */
import { GET } from '@/app/api/cron/sales-ready/route'

const call = (auth?: string) =>
  GET(new Request('http://localhost/api/cron/sales-ready', auth ? { headers: { authorization: auth } } : {}))

describe('GET /api/cron/sales-ready', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it('500s without CRON_SECRET configured, before doing any work', async () => {
    delete process.env.CRON_SECRET
    expect((await call('Bearer anything')).status).toBe(500)
  })

  it('401s without or with a wrong bearer token', async () => {
    process.env.CRON_SECRET = 's3cret'
    expect((await call()).status).toBe(401)
    expect((await call('Bearer nope')).status).toBe(401)
  })

  it('500s when the service-role key is missing, even with the right secret', async () => {
    process.env.CRON_SECRET = 's3cret'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect((await call('Bearer s3cret')).status).toBe(500)
  })
})
```

- [ ] **Step 2: Run → FAIL** (`Cannot find module '@/app/api/cron/sales-ready/route'`).

- [ ] **Step 3: Implement**

`src/lib/supabase/admin.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role client — bypasses RLS. Server-only by construction: the key is
 * not NEXT_PUBLIC_, so it never reaches a browser bundle. Only the Sales-Ready
 * cron uses it; everything a person does goes through the cookie client.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
```

`src/app/api/cron/sales-ready/route.ts`:

```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWithResend } from '@/lib/jobs/mailer'
import {
  buildSalesReadyEmail,
  planSalesReadyDigest,
  type SalesReadyLead,
} from '@/lib/n400/sales-ready'

export const dynamic = 'force-dynamic'

const RECIPIENT = 'Chris@mannaos.com'

/**
 * Daily Sales-Ready digest, called by Vercel Cron (vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is refused before any
 * database or email work. Excluded from the auth middleware matcher.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/sales-ready] CRON_SECRET is not set')
    return Response.json({ error: 'not configured' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    console.error('[cron/sales-ready] SUPABASE_SERVICE_ROLE_KEY or URL missing')
    return Response.json({ error: 'not configured' }, { status: 500 })
  }

  const [ready, notified] = await Promise.all([
    supabase
      .from('n400_leads_view')
      .select('user_id, full_name, email, effective_score, last_activity_date')
      .eq('role', 'client')
      .eq('effective_status', 'sales_ready'),
    supabase
      .from('n400_lead_profiles')
      .select('user_id')
      .not('sales_ready_notified_at', 'is', null),
  ])
  if (ready.error || notified.error) {
    console.error('[cron/sales-ready] read failed', ready.error?.message, notified.error?.message)
    return Response.json({ error: 'read failed' }, { status: 500 })
  }

  const plan = planSalesReadyDigest(
    (ready.data ?? []) as SalesReadyLead[],
    new Set((notified.data ?? []).map((r) => r.user_id as string)),
  )

  let emailed = false
  if (plan.toNotify.length > 0) {
    const mail = buildSalesReadyEmail(plan.toNotify, process.env.NEXT_PUBLIC_SITE_URL ?? '')
    const sent = await sendWithResend({ to: RECIPIENT, ...mail })
    if (sent.ok) {
      emailed = true
      const { error } = await supabase
        .from('n400_lead_profiles')
        .update({ sales_ready_notified_at: new Date().toISOString() })
        .in('user_id', plan.toNotify.map((l) => l.user_id))
      if (error) console.error('[cron/sales-ready] stamp failed', error.message)
    } else {
      // Not stamped on purpose: tomorrow's run retries.
      console.error('[cron/sales-ready] email failed', sent.error)
    }
  }

  if (plan.toReset.length > 0) {
    const { error } = await supabase
      .from('n400_lead_profiles')
      .update({ sales_ready_notified_at: null })
      .in('user_id', plan.toReset)
    if (error) console.error('[cron/sales-ready] reset failed', error.message)
  }

  return Response.json({
    notified: emailed ? plan.toNotify.length : 0,
    reset: plan.toReset.length,
    emailed,
  })
}
```

(If `sendWithResend`'s error branch is not `sent.error`, read `src/lib/jobs/types.ts` `Result` and adapt the one log line.)

`apps/internal_app/vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/sales-ready", "schedule": "0 13 * * *" }]
}
```

`src/middleware.ts` — change the matcher string to exclude `api/cron`:

```ts
    '/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
```

and add one comment line above it: `// api/cron is called by Vercel Cron without a session; the route checks CRON_SECRET itself.`

- [ ] **Step 4: Verify** — `npx jest __tests__/app/api/cron/sales-ready.test.ts` → PASS (3); full `npx jest`; `npx tsc --noEmit`; `npx eslint src/app/api src/lib/supabase/admin.ts src/lib/n400/sales-ready.ts src/middleware.ts` (no new errors; note any pre-existing in middleware.ts).

- [ ] **Step 5: Commit** `feat(internal-app): daily Sales-Ready digest via Vercel Cron`.

---

### Task 7: Build, smoke, ROADMAP (controller)

- [ ] `cd apps/internal_app && npx next build` → route list includes `/api/cron/sales-ready`. `cd apps/website && npx vitest run && npx tsc --noEmit && npx eslint .` green.
- [ ] Smoke (needs owner's service key in `apps/internal_app/.env.local`, plus a local `CRON_SECRET`): dev server → `curl -s -H "Authorization: Bearer $CRON_SECRET" localhost:3005/api/cron/sales-ready` → `{"notified":0,"reset":0,"emailed":false}`; without header → 401. If the owner has not added the key yet, record "smoke pending owner env" in the ledger and the final message.
- [ ] ROADMAP (`docs/ROADMAP.md`):
  - G4 v2 line: `còn: báo Sales-Ready.` → `~~báo Sales-Ready~~ ✅ 2026-10-18 (email tóm tắt hằng sáng, Vercel Cron, n400_43) — **owner:** thêm SUPABASE_SERVICE_ROLE_KEY + CRON_SECRET vào Vercel project internal-app.`
  - Website booked item: change `- [ ]` to `- [x]` and append ` ✅ 2026-10-18 (OPEN_CONSULTATION_STATUSES + n400_42).`
  - Internal App "bảng thiếu policy + FK sai" item: prefix `✅ 2026-10-18 migration 016: policy + FK→profiles cho audit_log, checklist_templates, expenses, fee_schedule, notifications, payments (users legacy để nguyên).` and change `- [ ]` to `- [x]`.
  - "Current Phase" line: replace `**Next up:** G4 v2 — consultation inbox, Convert to Client, Sales-Ready notifications.` with `G4 v2 (Convert to Client, Consultation inbox, Sales-Ready digest) built 2026-10-17/18.`; `Last updated` → 2026-10-18.
  - Remove the duplicate stale `- [ ] **N400 Ready — bản sao câu hỏi trong DB:**` bullet (the `[x]` one above it is current).
- [ ] Commit `docs: ROADMAP — G4 follow-ups shipped`.
