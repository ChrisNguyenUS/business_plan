# Internal App — Case Delete + Admin-Approved Deletion Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins can delete cases; staff can ask for a case/client to be deleted or a lead to be hidden, and an admin approves or rejects it, with email both ways.

**Architecture:** One new table `deletion_requests` (migration 018, RLS: staff insert/read own, admin read/decide, nobody deletes). All DB work lives in `src/lib/deletion/` and takes a Supabase client, so the admin's direct Delete/Hide buttons and the Approve button run the same code (`perform.ts`), and the request lifecycle (`flow.ts`) is testable with a fake client. Server actions are thin wrappers that check admin, call the lib, and revalidate.

**Tech Stack:** Next.js (app router, server actions — read `node_modules/next/dist/docs/` before using an API you are unsure of), Supabase (`@supabase/supabase-js`, RLS), Resend via `src/lib/jobs/mailer.ts`, Jest (jsdom default env), Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-21-internal-app-deletion-requests-design.md`

## Global Constraints

- Work only inside `apps/internal_app/` (plus `docs/ROADMAP.md` in the last task). Do not touch `apps/website/`.
- Run commands from `apps/internal_app/`: tests `npx jest <path>`, types `npx tsc --noEmit`, lint `npx eslint <files>` (the app has ~82 pre-existing lint errors; only the files you touch must be clean of NEW errors).
- "Delete" a lead always means **hide** (`hidden_leads`, migration 017). Never delete an auth user or profile.
- Client delete stays blocked while the client has cases or jobs (`clientDeleteBlocker` in `src/lib/clients/delete-guard.ts`). No cascade beyond what the DB already does.
- Case delete relies on the existing DB cascade: `case_forms`, `documents`, `status_history` go; `jobs.case_id`, `payments.case_id`, `expenses.case_id` become NULL.
- `requested_by` / `decided_by` FKs are `ON DELETE SET NULL` (never `RESTRICT`).
- Admin inbox email address: `Chris@mannaos.com`.
- A failed email never rolls back a saved request or decision; it is returned as `emailError` and logged.
- `reason` and `decision_note`: trimmed, max 500 chars; `reason` required. `entity_label` max 200 chars.
- Every policy: `TO authenticated`, `(select public.is_admin())` / `(select public.is_staff_or_admin())`, one policy per action. `anon` gets nothing. No DELETE grant on `deletion_requests`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. One logical change per commit. Do not push.
- UI copy is English (the internal app is English).

## Review Focus

1. Two admins press Approve on the same request at once → exactly one deletion runs; the other sees "This request was already handled." (Task 5 claim test.)
2. A client gains a case after a staff request was filed, then admin approves → nothing is deleted, the request goes back to `pending`, admin sees the blocker message. (Task 5 revert test.)
3. Admin deletes/hides an item directly while a staff request for it is pending → that request becomes `approved` and the requester is emailed, instead of hanging forever. (Task 5 `closePendingFor` test.)
4. A reason or item name containing `<script>`, quotes or newlines → escaped in the HTML body, subject stays one line. (Task 4 test.)
5. `RESEND_API_KEY` missing → the request is still saved and the action returns ok with `emailError`. (Task 5 test.)

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/html.ts` (new) | `escapeHtml` shared by all email builders |
| `supabase/migrations/018_deletion_requests.sql` (new) | table, indexes, grants, RLS |
| `src/lib/deletion/requests.ts` (new) | types, input parsing, labels, hrefs — pure |
| `src/lib/deletion/email.ts` (new) | request + decision email builders — pure |
| `src/lib/deletion/perform.ts` (new) | the three destructive operations, shared by direct buttons and Approve |
| `src/lib/deletion/flow.ts` (new) | submit / approve / reject / close-pending lifecycle, entity labels, email sending |
| `src/lib/auth/is-admin.ts` (modify) | add `getCurrentAdminId()` |
| `src/actions/deletion-requests.ts` (new) | server actions + reads for pages |
| `src/actions/cases.ts`, `clients.ts`, `leads.ts` (modify) | admin direct delete/hide via `perform.ts` + close pending requests |
| `src/components/deletion/*` (new) | `RequestDeletionButton`, `PendingRequestBanner`, `DecisionButtons` |
| `src/components/cases/DeleteCaseButton.tsx` (new) | admin Delete on the case page |
| `src/app/(app)/deletion-requests/page.tsx` (new) | inbox (admin) / my requests (staff) |
| `src/app/(app)/layout.tsx`, `src/components/layout/PageTitle.tsx` (modify) | nav item + admin badge, title |
| `__tests__/lib/...` (new) | tests; `__tests__/lib/deletion/fake-supabase.ts` is a helper, not a test |

---

### Task 1: Shared `escapeHtml`

**Files:**
- Create: `src/lib/html.ts`
- Modify: `src/lib/n400/sales-ready.ts` (delete local `escapeHtml`, ~lines 21-28), `src/lib/jobs/email.ts` (delete local `escapeHtml`, ~lines 32-39)
- Test: `__tests__/lib/html.test.ts`

**Interfaces:**
- Produces: `export function escapeHtml(value: unknown): string`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/html.test.ts
import { escapeHtml } from '@/lib/html'

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;',
    )
  })

  it('turns null and undefined into an empty string and stringifies numbers', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml(42)).toBe('42')
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (`Cannot find module '@/lib/html'`)

Run: `npx jest __tests__/lib/html.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/html.ts
/** Escape a value for interpolation into an HTML email body or attribute. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
```

In `src/lib/n400/sales-ready.ts` and `src/lib/jobs/email.ts`: delete the local `function escapeHtml(...) {...}` block and add `import { escapeHtml } from '@/lib/html'` with the other imports.

- [ ] **Step 4: Run the new test and the two existing suites — expect PASS**

Run: `npx jest __tests__/lib/html.test.ts __tests__/lib/n400/sales-ready.test.ts __tests__/lib/jobs`

- [ ] **Step 5: Commit**

```bash
git add src/lib/html.ts __tests__/lib/html.test.ts src/lib/n400/sales-ready.ts src/lib/jobs/email.ts
git commit -m "refactor(internal-app): one shared escapeHtml for email builders

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migration 018 `deletion_requests` (+ prod apply + RLS matrix)

**Files:**
- Create: `supabase/migrations/018_deletion_requests.sql`

**Interfaces:**
- Produces: table `public.deletion_requests` with columns `id, entity_type, entity_id, entity_label, reason, status, requested_by, decided_by, decided_at, decision_note, created_at`; partial unique index `deletion_requests_one_pending` (insert of a 2nd pending row for the same entity → error code `23505`).

- [ ] **Step 1: Check the number is free**

Run: `ls supabase/migrations/` — expect `017_hidden_leads.sql` to be the highest. If `018_*` exists, use the next free number everywhere below.

- [ ] **Step 2: Write the migration**

```sql
-- 018_deletion_requests.sql
--
-- Staff cannot delete. They ask: delete a case, delete a client, or hide a
-- lead, with a reason. An admin approves (the same code as the admin's own
-- Delete/Hide button runs) or rejects. Spec:
-- docs/superpowers/specs/2026-10-21-internal-app-deletion-requests-design.md
--
--   admin          SELECT all; UPDATE only the decision columns
--   staff          INSERT own pending request (request columns only);
--                  SELECT own requests
--   anyone else    nothing; nobody can DELETE (the table is the history)
--
-- entity_id has no FK on purpose: it points at cases, clients or profiles,
-- and the row must outlive the thing it deleted. entity_label keeps the name.

BEGIN;

CREATE TABLE public.deletion_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   text NOT NULL CHECK (entity_type IN ('case', 'client', 'lead')),
  entity_id     uuid NOT NULL,
  entity_label  text NOT NULL CHECK (char_length(entity_label) BETWEEN 1 AND 200),
  reason        text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 500),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by  uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at    timestamptz,
  decision_note text CHECK (decision_note IS NULL OR char_length(decision_note) <= 500),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One pending request per item: two staff pressing at once → one gets 23505.
CREATE UNIQUE INDEX deletion_requests_one_pending
  ON public.deletion_requests (entity_type, entity_id) WHERE status = 'pending';
CREATE INDEX deletion_requests_requested_by_idx ON public.deletion_requests (requested_by);
CREATE INDEX deletion_requests_decided_by_idx  ON public.deletion_requests (decided_by);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.deletion_requests FROM anon, PUBLIC, authenticated;
GRANT SELECT ON TABLE public.deletion_requests TO authenticated;
GRANT INSERT (entity_type, entity_id, entity_label, reason) ON TABLE public.deletion_requests TO authenticated;
GRANT UPDATE (status, decided_by, decided_at, decision_note) ON TABLE public.deletion_requests TO authenticated;

CREATE POLICY "deletion_requests read" ON public.deletion_requests
  FOR SELECT TO authenticated
  USING (
    (select public.is_admin())
    OR ((select public.is_staff_or_admin()) AND requested_by = (select auth.uid()))
  );
CREATE POLICY "deletion_requests staff insert" ON public.deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.is_staff_or_admin())
    AND requested_by = (select auth.uid())
    AND status = 'pending'
  );
CREATE POLICY "deletion_requests admin decide" ON public.deletion_requests
  FOR UPDATE TO authenticated
  USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));

COMMIT;
```

- [ ] **Step 3: Apply to prod**

Use the Supabase MCP `apply_migration` with name `deletion_requests` and the SQL between `BEGIN;` and `COMMIT;` (exclusive). If the tool call is declined, stop and ask the owner to run the file in the Supabase SQL editor; continue once they confirm.

- [ ] **Step 4: RLS matrix in a rollback transaction** (MCP `execute_sql`)

```sql
begin;
create temp table r(k text, v text) on commit drop;
grant all on r to authenticated, anon;
-- temporary staff profile (rolled back with everything else)
update profiles set role = 'staff' where id = (select id from profiles where role = 'client' order by created_at limit 1);
-- staff
select set_config('request.jwt.claims', json_build_object('sub',(select id from profiles where role='staff' limit 1),'role','authenticated')::text, true);
set local role authenticated;
insert into deletion_requests(entity_type, entity_id, entity_label, reason) values ('case', gen_random_uuid(), 'Probe', 'probe');
insert into r select 'staff sees own', count(*)::text from deletion_requests;
do $$ begin update deletion_requests set status='approved'; insert into r values ('staff update', 'ran'); exception when others then insert into r values ('staff update', sqlstate); end $$;
insert into r select 'still pending', count(*)::text from deletion_requests where status = 'pending';
do $$ begin insert into deletion_requests(entity_type, entity_id, entity_label, reason, status) values ('case', gen_random_uuid(), 'X', 'x', 'approved'); insert into r values ('staff insert status', 'ALLOWED'); exception when others then insert into r values ('staff insert status', sqlstate); end $$;
do $$ begin insert into deletion_requests(entity_type, entity_id, entity_label, reason) select entity_type, entity_id, 'dup', 'dup' from deletion_requests limit 1; insert into r values ('dup pending', 'ALLOWED'); exception when others then insert into r values ('dup pending', sqlstate); end $$;
do $$ begin delete from deletion_requests; insert into r values ('staff delete', 'ran'); exception when others then insert into r values ('staff delete', sqlstate); end $$;
reset role;
-- plain client user
select set_config('request.jwt.claims', json_build_object('sub',(select id from profiles where role='client' limit 1),'role','authenticated')::text, true);
set local role authenticated;
insert into r select 'client sees', count(*)::text from deletion_requests;
do $$ begin insert into deletion_requests(entity_type, entity_id, entity_label, reason) values ('case', gen_random_uuid(), 'X', 'x'); insert into r values ('client insert', 'ALLOWED'); exception when others then insert into r values ('client insert', sqlstate); end $$;
reset role;
-- admin
select set_config('request.jwt.claims', json_build_object('sub',(select id from profiles where role='admin' limit 1),'role','authenticated')::text, true);
set local role authenticated;
insert into r select 'admin sees', count(*)::text from deletion_requests;
with u as (update deletion_requests set status='approved', decided_by=auth.uid(), decided_at=now() returning 1) insert into r select 'admin decided', count(*)::text from u;
reset role;
set local role anon;
do $$ begin perform count(*) from deletion_requests; insert into r values ('anon select', 'ALLOWED'); exception when others then insert into r values ('anon select', sqlstate); end $$;
reset role;
select * from r;
```

Expected: `staff sees own`=1, `staff update`=`42501`, `still pending`=1, `staff insert status`=`42501`, `dup pending`=`23505`, `staff delete`=`42501`, `client sees`=0, `client insert`=`42501`, `admin sees`=1, `admin decided`=1, `anon select`=`42501`.

Then: `select count(*) from deletion_requests;` → 0 and `select count(*) from profiles where role='staff';` → 0 (zero residue). If any expectation differs, fix the migration with a follow-up migration before continuing.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/018_deletion_requests.sql
git commit -m "feat(internal-app): deletion_requests table (staff ask, admin decides)

Migration 018, applied on prod; RLS matrix checked in a rollback transaction.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Request types, parsing, labels

**Files:**
- Create: `src/lib/deletion/requests.ts`
- Test: `__tests__/lib/deletion/requests.test.ts`

**Interfaces:**
- Consumes: `isUuid(value: unknown): value is string` from `@/lib/jobs/validation`; `Result<T>` from `@/lib/jobs/types`
- Produces:
  - `type EntityType = 'case' | 'client' | 'lead'`, `const ENTITY_TYPES`
  - `type RequestStatus = 'pending' | 'approved' | 'rejected'`
  - `interface DeletionRequestRow { id; entity_type: EntityType; entity_id; entity_label; reason; status: RequestStatus; requested_by: string | null; decided_by: string | null; decided_at: string | null; decision_note: string | null; created_at: string }`
  - `const REQUEST_COLUMNS: string`
  - `interface NewDeletionRequest { entityType: EntityType; entityId: string; reason: string }`
  - `parseDeletionRequest(input: { entityType?: unknown; entityId?: unknown; reason?: unknown }): Result<NewDeletionRequest>`
  - `parseDecisionNote(note: unknown): Result<string | null>`
  - `actionLabel(t: EntityType): string`, `entityHref(t: EntityType, id: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/deletion/requests.test.ts
import {
  actionLabel,
  entityHref,
  parseDecisionNote,
  parseDeletionRequest,
} from '@/lib/deletion/requests'

const ID = '11111111-1111-4111-8111-111111111111'

describe('parseDeletionRequest', () => {
  it('accepts a known type, a uuid and a trimmed reason', () => {
    expect(parseDeletionRequest({ entityType: 'case', entityId: ID, reason: '  duplicate  ' })).toEqual({
      ok: true,
      value: { entityType: 'case', entityId: ID, reason: 'duplicate' },
    })
  })

  it('rejects an unknown type, a bad id, an empty or a too-long reason', () => {
    expect(parseDeletionRequest({ entityType: 'job', entityId: ID, reason: 'x' })).toEqual({
      ok: false,
      error: 'Unknown item type.',
    })
    expect(parseDeletionRequest({ entityType: 'client', entityId: 'nope', reason: 'x' })).toEqual({
      ok: false,
      error: 'Unknown item.',
    })
    expect(parseDeletionRequest({ entityType: 'lead', entityId: ID, reason: '   ' })).toEqual({
      ok: false,
      error: 'Say why this should be deleted.',
    })
    expect(parseDeletionRequest({ entityType: 'lead', entityId: ID, reason: 'a'.repeat(501) })).toEqual({
      ok: false,
      error: 'Keep the reason under 500 characters.',
    })
  })
})

describe('parseDecisionNote', () => {
  it('treats blank or missing as no note, trims, and caps length', () => {
    expect(parseDecisionNote(undefined)).toEqual({ ok: true, value: null })
    expect(parseDecisionNote('   ')).toEqual({ ok: true, value: null })
    expect(parseDecisionNote(' keep it ')).toEqual({ ok: true, value: 'keep it' })
    expect(parseDecisionNote('a'.repeat(501))).toEqual({
      ok: false,
      error: 'Keep the note under 500 characters.',
    })
  })
})

describe('labels', () => {
  it('names the action and links each type', () => {
    expect(actionLabel('case')).toBe('Delete case')
    expect(actionLabel('client')).toBe('Delete client')
    expect(actionLabel('lead')).toBe('Hide lead')
    expect(entityHref('case', ID)).toBe(`/cases/${ID}`)
    expect(entityHref('client', ID)).toBe(`/clients/${ID}`)
    expect(entityHref('lead', ID)).toBe(`/leads/${ID}`)
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (module not found)

Run: `npx jest __tests__/lib/deletion/requests.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/deletion/requests.ts
import { isUuid } from '@/lib/jobs/validation'
import type { Result } from '@/lib/jobs/types'

// Rows of deletion_requests (migration 018). Pure: no Supabase here.

export const ENTITY_TYPES = ['case', 'client', 'lead'] as const
export type EntityType = (typeof ENTITY_TYPES)[number]
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface DeletionRequestRow {
  id: string
  entity_type: EntityType
  entity_id: string
  entity_label: string
  reason: string
  status: RequestStatus
  requested_by: string | null
  decided_by: string | null
  decided_at: string | null
  decision_note: string | null
  created_at: string
}

export const REQUEST_COLUMNS =
  'id, entity_type, entity_id, entity_label, reason, status, requested_by, decided_by, decided_at, decision_note, created_at'

const TEXT_MAX = 500

export interface NewDeletionRequest {
  entityType: EntityType
  entityId: string
  reason: string
}

export function parseDeletionRequest(input: {
  entityType?: unknown
  entityId?: unknown
  reason?: unknown
}): Result<NewDeletionRequest> {
  if (!ENTITY_TYPES.includes(input.entityType as EntityType)) {
    return { ok: false, error: 'Unknown item type.' }
  }
  if (!isUuid(input.entityId)) return { ok: false, error: 'Unknown item.' }
  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
  if (!reason) return { ok: false, error: 'Say why this should be deleted.' }
  if (reason.length > TEXT_MAX) {
    return { ok: false, error: `Keep the reason under ${TEXT_MAX} characters.` }
  }
  return {
    ok: true,
    value: { entityType: input.entityType as EntityType, entityId: input.entityId, reason },
  }
}

/** Optional note an admin adds when deciding. Blank means no note. */
export function parseDecisionNote(note: unknown): Result<string | null> {
  const value = typeof note === 'string' ? note.trim() : ''
  if (!value) return { ok: true, value: null }
  if (value.length > TEXT_MAX) {
    return { ok: false, error: `Keep the note under ${TEXT_MAX} characters.` }
  }
  return { ok: true, value }
}

const ACTION_LABELS: Record<EntityType, string> = {
  case: 'Delete case',
  client: 'Delete client',
  // A lead is a live N400Ready account: approving hides it, never deletes it.
  lead: 'Hide lead',
}

export function actionLabel(type: EntityType): string {
  return ACTION_LABELS[type]
}

export function entityHref(type: EntityType, id: string): string {
  return type === 'case' ? `/cases/${id}` : type === 'client' ? `/clients/${id}` : `/leads/${id}`
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest __tests__/lib/deletion/requests.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/deletion/requests.ts __tests__/lib/deletion/requests.test.ts
git commit -m "feat(internal-app): deletion request parsing and labels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Email builders

**Files:**
- Create: `src/lib/deletion/email.ts`
- Test: `__tests__/lib/deletion/email.test.ts`

**Interfaces:**
- Consumes: `escapeHtml` (Task 1); `actionLabel`, `DeletionRequestRow` (Task 3); `OutgoingEmail` from `@/lib/jobs/mailer`
- Produces:
  - `const ADMIN_INBOX = 'Chris@mannaos.com'`
  - `type DeletionEmail = Omit<OutgoingEmail, 'to'>` (= `{ subject; html; text }`)
  - `buildRequestEmail(req: Pick<DeletionRequestRow, 'entity_type' | 'entity_label' | 'reason'>, requesterName: string, siteUrl?: string): DeletionEmail`
  - `buildDecisionEmail(req: Pick<DeletionRequestRow, 'entity_type' | 'entity_label' | 'status' | 'decision_note'>, siteUrl?: string): DeletionEmail`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/deletion/email.test.ts
import { buildDecisionEmail, buildRequestEmail } from '@/lib/deletion/email'

describe('buildRequestEmail', () => {
  const req = { entity_type: 'client' as const, entity_label: 'John Doe', reason: 'Duplicate of Jon Doe' }

  it('says who asked for what, why, and links the inbox', () => {
    const mail = buildRequestEmail(req, 'Lan Tran', 'https://app.example.com/')
    expect(mail.subject).toBe('Deletion request: Delete client — John Doe')
    expect(mail.text).toContain('Lan Tran asked to delete client: John Doe')
    expect(mail.text).toContain('Reason: Duplicate of Jon Doe')
    expect(mail.text).toContain('https://app.example.com/deletion-requests')
    expect(mail.html).toContain('href="https://app.example.com/deletion-requests"')
  })

  it('works without a site URL', () => {
    const mail = buildRequestEmail(req, 'Lan Tran')
    expect(mail.text).toContain('Deletion requests page of the internal app')
    expect(mail.html).not.toContain('href=')
  })

  it('escapes HTML and keeps the subject on one line', () => {
    const mail = buildRequestEmail(
      { entity_type: 'case', entity_label: 'A\nB <i>', reason: '<script>alert(1)</script>' },
      'Eve "x"',
    )
    expect(mail.subject).toBe('Deletion request: Delete case — A B <i>')
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('Eve &quot;x&quot;')
  })
})

describe('buildDecisionEmail', () => {
  it('reports an approval', () => {
    const mail = buildDecisionEmail(
      { entity_type: 'lead', entity_label: 'Mai', status: 'approved', decision_note: null },
      'https://app.example.com',
    )
    expect(mail.subject).toBe('Approved: Hide lead — Mai')
    expect(mail.text).toContain('An admin approved your request to hide lead: Mai.')
    expect(mail.text).not.toContain('Note:')
  })

  it('reports a rejection with the escaped note', () => {
    const mail = buildDecisionEmail({
      entity_type: 'case',
      entity_label: 'MOS-1A2B',
      status: 'rejected',
      decision_note: 'Still <active>',
    })
    expect(mail.subject).toBe('Rejected: Delete case — MOS-1A2B')
    expect(mail.text).toContain('Note: Still <active>')
    expect(mail.html).toContain('Still &lt;active&gt;')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest __tests__/lib/deletion/email.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/deletion/email.ts
import { escapeHtml } from '@/lib/html'
import type { OutgoingEmail } from '@/lib/jobs/mailer'
import { actionLabel, type DeletionRequestRow } from './requests'

/** Where new deletion requests are announced (same inbox as Sales-Ready). */
export const ADMIN_INBOX = 'Chris@mannaos.com'

export type DeletionEmail = Omit<OutgoingEmail, 'to'>

const INBOX_PATH = '/deletion-requests'

/** A header value must stay on one line. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function inboxUrl(siteUrl: string | undefined): string | null {
  return siteUrl ? siteUrl.replace(/\/+$/, '') + INBOX_PATH : null
}

function footer(url: string | null): { text: string; html: string } {
  return url
    ? { text: `Open: ${url}`, html: `<p><a href="${escapeHtml(url)}">Open Deletion requests</a></p>` }
    : {
        text: 'Open the Deletion requests page of the internal app.',
        html: '<p>Open the Deletion requests page of the internal app.</p>',
      }
}

export function buildRequestEmail(
  req: Pick<DeletionRequestRow, 'entity_type' | 'entity_label' | 'reason'>,
  requesterName: string,
  siteUrl?: string,
): DeletionEmail {
  const action = actionLabel(req.entity_type)
  const end = footer(inboxUrl(siteUrl))
  return {
    subject: oneLine(`Deletion request: ${action} — ${req.entity_label}`),
    text: [
      `${requesterName} asked to ${action.toLowerCase()}: ${req.entity_label}`,
      `Reason: ${req.reason}`,
      end.text,
    ].join('\n\n'),
    html: [
      `<p>${escapeHtml(requesterName)} asked to <strong>${escapeHtml(action.toLowerCase())}</strong>: ${escapeHtml(req.entity_label)}</p>`,
      `<p><em>Reason:</em> ${escapeHtml(req.reason)}</p>`,
      end.html,
    ].join(''),
  }
}

export function buildDecisionEmail(
  req: Pick<DeletionRequestRow, 'entity_type' | 'entity_label' | 'status' | 'decision_note'>,
  siteUrl?: string,
): DeletionEmail {
  const action = actionLabel(req.entity_type)
  const verb = req.status === 'approved' ? 'approved' : 'rejected'
  const end = footer(inboxUrl(siteUrl))
  const line = `An admin ${verb} your request to ${action.toLowerCase()}: ${req.entity_label}.`
  return {
    subject: oneLine(`${verb === 'approved' ? 'Approved' : 'Rejected'}: ${action} — ${req.entity_label}`),
    text: [line, req.decision_note ? `Note: ${req.decision_note}` : null, end.text]
      .filter(Boolean)
      .join('\n\n'),
    html: [
      `<p>${escapeHtml(line)}</p>`,
      req.decision_note ? `<p><em>Note:</em> ${escapeHtml(req.decision_note)}</p>` : '',
      end.html,
    ].join(''),
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest __tests__/lib/deletion/email.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/deletion/email.ts __tests__/lib/deletion/email.test.ts
git commit -m "feat(internal-app): deletion request and decision emails

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Shared destructive ops + request lifecycle (`perform.ts`, `flow.ts`)

**Files:**
- Create: `src/lib/deletion/perform.ts`, `src/lib/deletion/flow.ts`
- Create (test helper, not a test): `__tests__/lib/deletion/fake-supabase.ts`
- Test: `__tests__/lib/deletion/perform.test.ts`, `__tests__/lib/deletion/flow.test.ts`

**Interfaces:**
- Consumes: Task 3 (`EntityType`, `DeletionRequestRow`, `REQUEST_COLUMNS`, `NewDeletionRequest`), Task 4 (`ADMIN_INBOX`, `buildRequestEmail`, `buildDecisionEmail`), `clientDeleteBlocker`, `SendEmail` + `sendWithResend` from `@/lib/jobs/mailer`, `Result`.
- Produces (`perform.ts`) — each returns the paths to revalidate:
  - `deleteCaseRow(supabase: SupabaseClient, id: string): Promise<Result<string[]>>`
  - `deleteClientRow(supabase: SupabaseClient, id: string): Promise<Result<string[]>>`
  - `hideLeadRow(supabase: SupabaseClient, userId: string): Promise<Result<string[]>>`
  - `performDeletion(supabase: SupabaseClient, type: EntityType, id: string): Promise<Result<string[]>>`
- Produces (`flow.ts`):
  - `interface FlowDeps { supabase: SupabaseClient; send: SendEmail; siteUrl?: string }`
  - `deletionDeps(supabase: SupabaseClient): FlowDeps` (real Resend + `NEXT_PUBLIC_SITE_URL`)
  - `submitRequest(deps, input: NewDeletionRequest): Promise<Result<{ emailError: string | null }>>`
  - `approveRequest(deps, requestId: string, adminId: string): Promise<Result<{ paths: string[]; emailError: string | null }>>`
  - `rejectRequest(deps, requestId: string, adminId: string, note: string | null): Promise<Result<{ emailError: string | null }>>`
  - `closePendingFor(deps, type: EntityType, entityId: string, adminId: string): Promise<void>` (never throws; logs)

- [ ] **Step 1: Write the fake client helper**

```ts
// __tests__/lib/deletion/fake-supabase.ts
import type { SupabaseClient } from '@supabase/supabase-js'

/** One `supabase.from(table)…` chain, as recorded by the fake. */
export interface Op {
  table: string
  action: 'select' | 'insert' | 'update' | 'delete'
  payload?: unknown
  calls: [string, ...unknown[]][]
}

export interface Reply {
  data?: unknown
  error?: { message: string; code?: string } | null
  count?: number | null
}

/**
 * Minimal chainable stand-in: records every call and resolves each chain with
 * whatever `reply(op)` returns for it. Not a test file (no .test suffix).
 */
export function fakeSupabase(reply: (op: Op) => Reply = () => ({})) {
  const ops: Op[] = []
  const client = {
    from(table: string) {
      const op: Op = { table, action: 'select', calls: [] }
      ops.push(op)
      const chain: Record<string, unknown> = {}
      const record = (name: string) => (...args: unknown[]) => {
        op.calls.push([name, ...args])
        return chain
      }
      for (const m of ['select', 'eq', 'or', 'in', 'is', 'not', 'order', 'limit', 'maybeSingle', 'single']) {
        chain[m] = record(m)
      }
      for (const a of ['insert', 'update', 'delete'] as const) {
        chain[a] = (payload?: unknown) => {
          op.action = a
          op.payload = payload
          return chain
        }
      }
      chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve()
          .then(() => {
            const r = reply(op)
            return { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null }
          })
          .then(resolve, reject)
      return chain
    },
  }
  return { client: client as unknown as SupabaseClient, ops }
}

/** True when the op recorded exactly this call, e.g. has(op, 'eq', 'id', 'x'). */
export function has(op: Op | undefined, ...call: unknown[]): boolean {
  return !!op && op.calls.some((c) => JSON.stringify(c) === JSON.stringify(call))
}
```

- [ ] **Step 2: Write the failing `perform` test**

```ts
// __tests__/lib/deletion/perform.test.ts
import { deleteCaseRow, deleteClientRow, hideLeadRow, performDeletion } from '@/lib/deletion/perform'
import { fakeSupabase, has } from './fake-supabase'

const ID = '11111111-1111-4111-8111-111111111111'

describe('deleteCaseRow', () => {
  it('fails readably when nothing was deleted (missing, or RLS refused)', async () => {
    const { client } = fakeSupabase(() => ({ data: [] }))
    expect(await deleteCaseRow(client, ID)).toEqual({ ok: false, error: 'Case not found or not deletable.' })
  })

  it('returns the case list and both client pages to revalidate', async () => {
    const { client } = fakeSupabase(() => ({ data: [{ primary_client_id: 'p1', secondary_client_id: 's1' }] }))
    expect(await deleteCaseRow(client, ID)).toEqual({
      ok: true,
      value: ['/cases', `/cases/${ID}`, '/clients/p1', '/clients/s1'],
    })
  })
})

describe('deleteClientRow', () => {
  it('refuses while cases remain and never deletes', async () => {
    const { client, ops } = fakeSupabase((op) => (op.table === 'cases' ? { count: 1 } : { count: 0 }))
    expect(await deleteClientRow(client, ID)).toEqual({
      ok: false,
      error: 'This client still has 1 case. Delete it first.',
    })
    expect(ops.some((o) => o.action === 'delete' || o.action === 'update')).toBe(false)
  })

  it('unlinks spouses, deletes, and adds lead pages when converted from a lead', async () => {
    const { client, ops } = fakeSupabase((op) =>
      op.action === 'delete' ? { data: [{ source_lead_id: 'L1' }] } : { count: 0, data: [] },
    )
    expect(await deleteClientRow(client, ID)).toEqual({
      ok: true,
      value: ['/clients', `/clients/${ID}`, '/leads', '/leads/L1'],
    })
    const unlink = ops.find((o) => o.action === 'update')
    expect(unlink?.payload).toEqual({ spouse_id: null })
    expect(has(unlink, 'eq', 'spouse_id', ID)).toBe(true)
  })
})

describe('hideLeadRow / performDeletion', () => {
  it('treats an already-hidden lead (23505) as done', async () => {
    const { client } = fakeSupabase(() => ({ error: { message: 'dup', code: '23505' } }))
    expect(await hideLeadRow(client, ID)).toEqual({ ok: true, value: ['/leads', `/leads/${ID}`] })
  })

  it('routes a lead to hidden_leads, never to a delete', async () => {
    const { client, ops } = fakeSupabase()
    await performDeletion(client, 'lead', ID)
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ table: 'hidden_leads', action: 'insert', payload: { user_id: ID } })
  })
})
```

- [ ] **Step 3: Run — expect FAIL** (module not found)

Run: `npx jest __tests__/lib/deletion/perform.test.ts`

- [ ] **Step 4: Implement `perform.ts`**

```ts
// src/lib/deletion/perform.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Result } from '@/lib/jobs/types'
import { clientDeleteBlocker } from '@/lib/clients/delete-guard'
import type { EntityType } from './requests'

// The three destructive operations. The admin's own Delete/Hide buttons and
// Approve on a staff request both run these, so the rules cannot drift.
// Each returns the paths to revalidate. RLS (009, 017) is the real gate.

/** Cascades case_forms, documents, status_history; jobs/payments/expenses keep their row. */
export async function deleteCaseRow(supabase: SupabaseClient, id: string): Promise<Result<string[]>> {
  const { data, error } = await supabase
    .from('cases')
    .delete()
    .eq('id', id)
    .select('primary_client_id, secondary_client_id')
  if (error) return { ok: false, error: error.message }
  const rows = (data ?? []) as { primary_client_id: string | null; secondary_client_id: string | null }[]
  // RLS filters a refused delete to zero rows instead of raising.
  if (rows.length === 0) return { ok: false, error: 'Case not found or not deletable.' }
  const clientIds = [rows[0].primary_client_id, rows[0].secondary_client_id].filter(
    (c): c is string => Boolean(c),
  )
  return { ok: true, value: ['/cases', `/cases/${id}`, ...clientIds.map((c) => `/clients/${c}`)] }
}

/** Blocked while the client has cases or jobs (owner decision 2026-10-20). */
export async function deleteClientRow(supabase: SupabaseClient, id: string): Promise<Result<string[]>> {
  const [cases, jobs] = await Promise.all([
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .or(`primary_client_id.eq.${id},secondary_client_id.eq.${id}`),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('client_id', id),
  ])
  if (cases.error) return { ok: false, error: cases.error.message }
  if (jobs.error) return { ok: false, error: jobs.error.message }
  const blocker = clientDeleteBlocker({ cases: cases.count ?? 0, jobs: jobs.count ?? 0 })
  if (blocker) return { ok: false, error: blocker }

  // A spouse link is only a pointer, and its FK would block the delete.
  const unlink = await supabase.from('clients').update({ spouse_id: null }).eq('spouse_id', id)
  if (unlink.error) return { ok: false, error: unlink.error.message }

  const { data, error } = await supabase.from('clients').delete().eq('id', id).select('source_lead_id')
  if (error) return { ok: false, error: error.message }
  const rows = (data ?? []) as { source_lead_id: string | null }[]
  if (rows.length === 0) return { ok: false, error: 'Client not found or not deletable.' }

  const leadId = rows[0].source_lead_id
  return {
    ok: true,
    value: ['/clients', `/clients/${id}`, ...(leadId ? ['/leads', `/leads/${leadId}`] : [])],
  }
}

/** A lead is a live N400Ready account: "delete" means hide (migration 017). */
export async function hideLeadRow(supabase: SupabaseClient, userId: string): Promise<Result<string[]>> {
  const { error } = await supabase.from('hidden_leads').insert({ user_id: userId })
  // 23505: already hidden (double click, two tabs) — the outcome is the same.
  if (error && error.code !== '23505') return { ok: false, error: error.message }
  return { ok: true, value: ['/leads', `/leads/${userId}`] }
}

export function performDeletion(
  supabase: SupabaseClient,
  type: EntityType,
  id: string,
): Promise<Result<string[]>> {
  if (type === 'case') return deleteCaseRow(supabase, id)
  if (type === 'client') return deleteClientRow(supabase, id)
  return hideLeadRow(supabase, id)
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `npx jest __tests__/lib/deletion/perform.test.ts`

- [ ] **Step 6: Write the failing `flow` test**

```ts
// __tests__/lib/deletion/flow.test.ts
import { approveRequest, closePendingFor, rejectRequest, submitRequest, type FlowDeps } from '@/lib/deletion/flow'
import type { SendEmail } from '@/lib/jobs/mailer'
import { fakeSupabase, has, type Op, type Reply } from './fake-supabase'

const ID = '11111111-1111-4111-8111-111111111111'
const REQ = '22222222-2222-4222-8222-222222222222'
const ADMIN = '33333333-3333-4333-8333-333333333333'
const STAFF = '44444444-4444-4444-8444-444444444444'

const row = (over: Record<string, unknown> = {}) => ({
  id: REQ, entity_type: 'case', entity_id: ID, entity_label: 'MOS-11111111 (John Doe)', reason: 'dup',
  status: 'approved', requested_by: STAFF, decided_by: ADMIN, decided_at: 'now', decision_note: null,
  created_at: 'then', ...over,
})

function setup(reply: (op: Op) => Reply, sendOk = true) {
  const { client, ops } = fakeSupabase(reply)
  const send = jest.fn<ReturnType<SendEmail>, Parameters<SendEmail>>(async () =>
    sendOk ? { ok: true, value: { id: 'm1' } } : { ok: false, error: 'Email is not configured' },
  )
  const deps: FlowDeps = { supabase: client, send, siteUrl: 'https://app.example.com' }
  return { deps, ops, send }
}

const profiles: Reply = { data: { full_name: 'Lan Tran', email: 'lan@x.com' } }

describe('submitRequest', () => {
  it('saves a case request with its label and emails the admin inbox', async () => {
    const { deps, ops, send } = setup((op) => {
      if (op.table === 'cases') return { data: { id: ID, primary_client: { first_name: 'John', last_name: 'Doe' } } }
      if (op.table === 'deletion_requests') return { data: row({ status: 'pending' }) }
      return profiles
    })
    expect(await submitRequest(deps, { entityType: 'case', entityId: ID, reason: 'dup' })).toEqual({
      ok: true,
      value: { emailError: null },
    })
    const insert = ops.find((o) => o.action === 'insert')!
    expect(insert.payload).toEqual({
      entity_type: 'case', entity_id: ID, entity_label: 'MOS-11111111 (John Doe)', reason: 'dup',
    })
    expect(send.mock.calls[0][0].to).toBe('Chris@mannaos.com')
    expect(send.mock.calls[0][0].text).toContain('Lan Tran asked to delete case')
  })

  it('still succeeds when the email fails (request is saved)', async () => {
    const { deps } = setup((op) => {
      if (op.table === 'clients') return { data: { first_name: 'John', last_name: 'Doe' } }
      if (op.table === 'cases') return { count: 0 }
      if (op.table === 'deletion_requests') return { data: row({ entity_type: 'client', status: 'pending' }) }
      return profiles
    }, false)
    expect(await submitRequest(deps, { entityType: 'client', entityId: ID, reason: 'dup' })).toEqual({
      ok: true,
      value: { emailError: 'Email is not configured' },
    })
  })

  it('refuses a client that still has cases, before inserting', async () => {
    const { deps, ops } = setup((op) => {
      if (op.table === 'clients') return { data: { first_name: 'John', last_name: 'Doe' } }
      if (op.table === 'cases') return { count: 2 }
      return {}
    })
    expect(await submitRequest(deps, { entityType: 'client', entityId: ID, reason: 'dup' })).toEqual({
      ok: false,
      error: 'This client still has 2 cases. Delete them first.',
    })
    expect(ops.some((o) => o.action === 'insert')).toBe(false)
  })

  it('refuses a lead that is already hidden', async () => {
    const { deps } = setup((op) => {
      if (op.table === 'n400_leads_view') return { data: { full_name: 'Mai', email: 'mai@x.com' } }
      if (op.table === 'hidden_leads') return { data: { user_id: ID } }
      return {}
    })
    expect(await submitRequest(deps, { entityType: 'lead', entityId: ID, reason: 'spam' })).toEqual({
      ok: false,
      error: 'This lead is already hidden.',
    })
  })

  it('explains a duplicate pending request (23505)', async () => {
    const { deps } = setup((op) => {
      if (op.table === 'cases') return { data: { id: ID, primary_client: null } }
      if (op.table === 'deletion_requests') return { error: { message: 'dup', code: '23505' } }
      return {}
    })
    expect(await submitRequest(deps, { entityType: 'case', entityId: ID, reason: 'dup' })).toEqual({
      ok: false,
      error: 'A request for this is already pending.',
    })
  })

  it('refuses an item that no longer exists', async () => {
    const { deps } = setup(() => ({ data: null }))
    expect(await submitRequest(deps, { entityType: 'case', entityId: ID, reason: 'dup' })).toEqual({
      ok: false,
      error: 'That item no longer exists.',
    })
  })
})

describe('approveRequest', () => {
  it('reports a request someone already handled and deletes nothing', async () => {
    const { deps, ops } = setup(() => ({ data: [] }))
    expect(await approveRequest(deps, REQ, ADMIN)).toEqual({
      ok: false,
      error: 'This request was already handled.',
    })
    expect(ops.some((o) => o.action === 'delete')).toBe(false)
    const claim = ops[0]
    expect(has(claim, 'eq', 'status', 'pending')).toBe(true)
  })

  it('puts the request back to pending when the deletion is refused', async () => {
    const { deps, ops, send } = setup((op) => {
      if (op.table === 'deletion_requests' && op.action === 'update') {
        return { data: [row({ entity_type: 'client' })] }
      }
      if (op.table === 'cases') return { count: 1 }
      return { count: 0 }
    })
    expect(await approveRequest(deps, REQ, ADMIN)).toEqual({
      ok: false,
      error: 'This client still has 1 case. Delete it first.',
    })
    const updates = ops.filter((o) => o.table === 'deletion_requests' && o.action === 'update')
    expect(updates[1].payload).toEqual({ status: 'pending', decided_by: null, decided_at: null })
    expect(send).not.toHaveBeenCalled()
  })

  it('deletes, emails the requester and returns the paths', async () => {
    const { deps, send } = setup((op) => {
      if (op.table === 'deletion_requests') return { data: [row()] }
      if (op.table === 'cases') return { data: [{ primary_client_id: 'p1', secondary_client_id: null }] }
      return profiles
    })
    expect(await approveRequest(deps, REQ, ADMIN)).toEqual({
      ok: true,
      value: { paths: ['/cases', `/cases/${ID}`, '/clients/p1', '/deletion-requests'], emailError: null },
    })
    expect(send.mock.calls[0][0].to).toBe('lan@x.com')
    expect(send.mock.calls[0][0].subject).toContain('Approved: Delete case')
  })
})

describe('rejectRequest', () => {
  it('stores the note and emails the requester', async () => {
    const { deps, ops, send } = setup((op) =>
      op.table === 'deletion_requests' ? { data: [row({ status: 'rejected', decision_note: 'active' })] } : profiles,
    )
    expect(await rejectRequest(deps, REQ, ADMIN, 'active')).toEqual({ ok: true, value: { emailError: null } })
    expect(ops[0].payload).toMatchObject({ status: 'rejected', decided_by: ADMIN, decision_note: 'active' })
    expect(send.mock.calls[0][0].text).toContain('Note: active')
  })

  it('reports a request someone already handled', async () => {
    const { deps } = setup(() => ({ data: [] }))
    expect(await rejectRequest(deps, REQ, ADMIN, null)).toEqual({
      ok: false,
      error: 'This request was already handled.',
    })
  })
})

describe('closePendingFor', () => {
  it('marks the pending request approved and emails its requester', async () => {
    const { deps, ops, send } = setup((op) => (op.table === 'deletion_requests' ? { data: [row()] } : profiles))
    await closePendingFor(deps, 'case', ID, ADMIN)
    const close = ops[0]
    expect(close.payload).toMatchObject({ status: 'approved', decided_by: ADMIN })
    expect(has(close, 'eq', 'entity_id', ID)).toBe(true)
    expect(has(close, 'eq', 'status', 'pending')).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('never throws on a database error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const { deps } = setup(() => ({ error: { message: 'down' } }))
    await expect(closePendingFor(deps, 'case', ID, ADMIN)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 7: Run — expect FAIL**

Run: `npx jest __tests__/lib/deletion/flow.test.ts`

- [ ] **Step 8: Implement `flow.ts`**

```ts
// src/lib/deletion/flow.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Result } from '@/lib/jobs/types'
import { sendWithResend, type SendEmail } from '@/lib/jobs/mailer'
import { clientDeleteBlocker } from '@/lib/clients/delete-guard'
import { ADMIN_INBOX, buildDecisionEmail, buildRequestEmail } from './email'
import { performDeletion } from './perform'
import {
  REQUEST_COLUMNS,
  type DeletionRequestRow,
  type EntityType,
  type NewDeletionRequest,
} from './requests'

// Lifecycle of a deletion_requests row (migration 018). Takes its client and
// mailer as arguments so tests can pass fakes; actions pass deletionDeps().

export interface FlowDeps {
  supabase: SupabaseClient
  send: SendEmail
  siteUrl?: string
}

export function deletionDeps(supabase: SupabaseClient): FlowDeps {
  return { supabase, send: sendWithResend, siteUrl: process.env.NEXT_PUBLIC_SITE_URL }
}

const GONE = 'That item no longer exists.'
const HANDLED = 'This request was already handled.'

function fullName(p: { first_name?: string | null; last_name?: string | null } | null): string {
  return [p?.first_name, p?.last_name].filter(Boolean).join(' ')
}

/** The name the request keeps after the item is gone, read as the requester sees it. */
async function lookupEntityLabel(
  supabase: SupabaseClient,
  type: EntityType,
  id: string,
): Promise<Result<string>> {
  if (type === 'case') {
    const { data, error } = await supabase
      .from('cases')
      .select('id, primary_client:clients!cases_primary_client_id_fkey(first_name, last_name)')
      .eq('id', id)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: GONE }
    const name = fullName(data.primary_client as { first_name: string; last_name: string } | null)
    const code = `MOS-${id.split('-')[0].toUpperCase()}`
    return { ok: true, value: (name ? `${code} (${name})` : code).slice(0, 200) }
  }
  if (type === 'client') {
    const { data, error } = await supabase
      .from('clients')
      .select('first_name, last_name')
      .eq('id', id)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: GONE }
    return { ok: true, value: (fullName(data) || 'Unnamed client').slice(0, 200) }
  }
  const { data, error } = await supabase
    .from('n400_leads_view')
    .select('full_name, email')
    .eq('role', 'client')
    .eq('user_id', id)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: GONE }
  const label = (data.full_name as string | null) || (data.email as string | null) || 'Unnamed lead'
  return { ok: true, value: label.slice(0, 200) }
}

async function profileOf(
  supabase: SupabaseClient,
  id: string,
): Promise<{ name: string; email: string | null }> {
  const { data } = await supabase.from('profiles').select('full_name, email').eq('id', id).maybeSingle()
  const email = (data?.email as string | null | undefined) ?? null
  return { name: (data?.full_name as string | null | undefined) || email || 'A staff member', email }
}

/** Tell the requester what was decided. Returns the email error, never throws. */
async function notifyRequester(deps: FlowDeps, row: DeletionRequestRow): Promise<string | null> {
  if (!row.requested_by) return null
  const { email } = await profileOf(deps.supabase, row.requested_by)
  if (!email) return 'The requester has no email address.'
  const sent = await deps.send({ to: email, ...buildDecisionEmail(row, deps.siteUrl) })
  if (!sent.ok) {
    console.error('[deletion-requests] decision email failed', sent.error)
    return sent.error
  }
  return null
}

export async function submitRequest(
  deps: FlowDeps,
  input: NewDeletionRequest,
): Promise<Result<{ emailError: string | null }>> {
  const { supabase } = deps
  const label = await lookupEntityLabel(supabase, input.entityType, input.entityId)
  if (!label.ok) return label

  if (input.entityType === 'client') {
    // Staff cannot read jobs (admin-only), so jobs are only checked at Approve.
    const cases = await supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .or(`primary_client_id.eq.${input.entityId},secondary_client_id.eq.${input.entityId}`)
    if (cases.error) return { ok: false, error: cases.error.message }
    const blocker = clientDeleteBlocker({ cases: cases.count ?? 0, jobs: 0 })
    if (blocker) return { ok: false, error: blocker }
  }
  if (input.entityType === 'lead') {
    const hidden = await supabase
      .from('hidden_leads')
      .select('user_id')
      .eq('user_id', input.entityId)
      .maybeSingle()
    if (hidden.error) return { ok: false, error: hidden.error.message }
    if (hidden.data) return { ok: false, error: 'This lead is already hidden.' }
  }

  const { data, error } = await supabase
    .from('deletion_requests')
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_label: label.value,
      reason: input.reason,
    })
    .select(REQUEST_COLUMNS)
    .single()
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'A request for this is already pending.' }
    return { ok: false, error: error.message }
  }
  const row = data as unknown as DeletionRequestRow

  const requester = row.requested_by
    ? await profileOf(supabase, row.requested_by)
    : { name: 'A staff member', email: null }
  const sent = await deps.send({ to: ADMIN_INBOX, ...buildRequestEmail(row, requester.name, deps.siteUrl) })
  if (!sent.ok) console.error('[deletion-requests] request email failed', sent.error)
  return { ok: true, value: { emailError: sent.ok ? null : sent.error } }
}

export async function approveRequest(
  deps: FlowDeps,
  requestId: string,
  adminId: string,
): Promise<Result<{ paths: string[]; emailError: string | null }>> {
  const { supabase } = deps
  // Claim first (only while still pending) so two admins cannot both run it.
  const claim = await supabase
    .from('deletion_requests')
    .update({ status: 'approved', decided_by: adminId, decided_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select(REQUEST_COLUMNS)
  if (claim.error) return { ok: false, error: claim.error.message }
  const row = ((claim.data ?? []) as unknown as DeletionRequestRow[])[0]
  if (!row) return { ok: false, error: HANDLED }

  const done = await performDeletion(supabase, row.entity_type, row.entity_id)
  if (!done.ok) {
    const back = await supabase
      .from('deletion_requests')
      .update({ status: 'pending', decided_by: null, decided_at: null })
      .eq('id', requestId)
    if (back.error) console.error('[deletion-requests] un-claim failed', back.error.message)
    return done
  }

  const emailError = await notifyRequester(deps, row)
  return { ok: true, value: { paths: [...done.value, '/deletion-requests'], emailError } }
}

export async function rejectRequest(
  deps: FlowDeps,
  requestId: string,
  adminId: string,
  note: string | null,
): Promise<Result<{ emailError: string | null }>> {
  const { data, error } = await deps.supabase
    .from('deletion_requests')
    .update({
      status: 'rejected',
      decided_by: adminId,
      decided_at: new Date().toISOString(),
      decision_note: note,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select(REQUEST_COLUMNS)
  if (error) return { ok: false, error: error.message }
  const row = ((data ?? []) as unknown as DeletionRequestRow[])[0]
  if (!row) return { ok: false, error: HANDLED }
  return { ok: true, value: { emailError: await notifyRequester(deps, row) } }
}

/**
 * After an admin deleted or hid an item directly: close any pending staff
 * request for it as approved and tell the requester. The deletion already
 * happened, so this only logs on failure.
 */
export async function closePendingFor(
  deps: FlowDeps,
  type: EntityType,
  entityId: string,
  adminId: string,
): Promise<void> {
  const { data, error } = await deps.supabase
    .from('deletion_requests')
    .update({ status: 'approved', decided_by: adminId, decided_at: new Date().toISOString() })
    .eq('entity_type', type)
    .eq('entity_id', entityId)
    .eq('status', 'pending')
    .select(REQUEST_COLUMNS)
  if (error) {
    console.error('[deletion-requests] close pending failed', error.message)
    return
  }
  for (const row of (data ?? []) as unknown as DeletionRequestRow[]) {
    await notifyRequester(deps, row)
  }
}
```

- [ ] **Step 9: Run both suites — expect PASS**

Run: `npx jest __tests__/lib/deletion`

- [ ] **Step 10: Commit**

```bash
git add src/lib/deletion/perform.ts src/lib/deletion/flow.ts __tests__/lib/deletion/fake-supabase.ts __tests__/lib/deletion/perform.test.ts __tests__/lib/deletion/flow.test.ts
git commit -m "feat(internal-app): shared delete/hide ops and deletion request lifecycle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Admin direct actions use the shared ops + `deleteCase`

**Files:**
- Modify: `src/lib/auth/is-admin.ts` (add `getCurrentAdminId`)
- Modify: `src/actions/clients.ts` (`deleteClient` body), `src/actions/leads.ts` (`setLeadHidden`), `src/actions/cases.ts` (add `deleteCase`)
- Create: `src/components/cases/DeleteCaseButton.tsx`
- Modify: `src/app/(app)/cases/[id]/page.tsx` (header actions, ~lines 46-51)

**Interfaces:**
- Consumes: `deleteCaseRow`, `deleteClientRow`, `hideLeadRow` (Task 5); `closePendingFor`, `deletionDeps` (Task 5)
- Produces: `getCurrentAdminId(): Promise<string | null>`; server action `deleteCase(id: string): Promise<Result<never>>` (redirects to `/cases` on success)

- [ ] **Step 1: Add `getCurrentAdminId`** — append to `src/lib/auth/is-admin.ts`:

```ts
/** The signed-in admin's id, or null for staff / signed-out. Server-only. */
export async function getCurrentAdminId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user.id : null
}
```

- [ ] **Step 2: Rewrite `deleteClient`** in `src/actions/clients.ts` — replace the whole function and fix imports:

Imports: remove `import { isCurrentUserAdmin } from '@/lib/auth/is-admin'` and `import { clientDeleteBlocker } from '@/lib/clients/delete-guard'`; add:
```ts
import { getCurrentAdminId } from '@/lib/auth/is-admin'
import { deleteClientRow } from '@/lib/deletion/perform'
import { closePendingFor, deletionDeps } from '@/lib/deletion/flow'
```

```ts
/**
 * Admin only: permanently delete a client that has no cases and no jobs, then
 * go back to the list. Same code as approving a staff request
 * (lib/deletion/perform.ts); RLS "clients admin delete" (009) is the real gate.
 */
export async function deleteClient(id: string): Promise<Result<never>> {
  if (!isUuid(id)) return { ok: false, error: 'Unknown client.' }
  const adminId = await getCurrentAdminId()
  if (!adminId) return { ok: false, error: 'Only an admin can delete clients.' }

  const supabase = await createClient()
  const result = await deleteClientRow(supabase, id)
  if (!result.ok) return result
  for (const path of result.value) revalidatePath(path)
  await closePendingFor(deletionDeps(supabase), 'client', id, adminId)
  revalidatePath('/deletion-requests')
  redirect('/clients')
}
```

- [ ] **Step 3: Rewrite `setLeadHidden`** in `src/actions/leads.ts`:

Imports: replace `import { isCurrentUserAdmin } from '@/lib/auth/is-admin'` with `import { getCurrentAdminId } from '@/lib/auth/is-admin'`; add `import { hideLeadRow } from '@/lib/deletion/perform'` and `import { closePendingFor, deletionDeps } from '@/lib/deletion/flow'`.

```ts
export async function setLeadHidden(userId: string, hidden: boolean): Promise<Result<null>> {
  if (!isUuid(userId)) return { ok: false, error: 'Unknown lead.' }
  const adminId = await getCurrentAdminId()
  if (!adminId) return { ok: false, error: 'Only an admin can hide leads.' }

  const supabase = await createClient()
  if (hidden) {
    const result = await hideLeadRow(supabase, userId)
    if (!result.ok) return result
    await closePendingFor(deletionDeps(supabase), 'lead', userId, adminId)
    revalidatePath('/deletion-requests')
  } else {
    const { error } = await supabase.from('hidden_leads').delete().eq('user_id', userId)
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${userId}`)
  return { ok: true, value: null }
}
```
Keep the existing doc comment above it.

- [ ] **Step 4: Add `deleteCase`** to the end of `src/actions/cases.ts`; add imports `import { redirect } from 'next/navigation'`, `import { getCurrentAdminId } from '@/lib/auth/is-admin'`, `import { isUuid } from '@/lib/jobs/validation'`, `import type { Result } from '@/lib/jobs/types'`, `import { deleteCaseRow } from '@/lib/deletion/perform'`, `import { closePendingFor, deletionDeps } from '@/lib/deletion/flow'`.

```ts
/**
 * Admin only: permanently delete a case. The database cascades its forms,
 * documents and status history; jobs, payments and expenses keep their row
 * with case_id cleared. RLS "cases admin delete" (009) is the real gate.
 */
export async function deleteCase(id: string): Promise<Result<never>> {
  if (!isUuid(id)) return { ok: false, error: 'Unknown case.' }
  const adminId = await getCurrentAdminId()
  if (!adminId) return { ok: false, error: 'Only an admin can delete cases.' }

  const supabase = await createClient()
  const result = await deleteCaseRow(supabase, id)
  if (!result.ok) return result
  for (const path of result.value) revalidatePath(path)
  await closePendingFor(deletionDeps(supabase), 'case', id, adminId)
  revalidatePath('/deletion-requests')
  redirect('/cases')
}
```

- [ ] **Step 5: Create `DeleteCaseButton`**

```tsx
// src/components/cases/DeleteCaseButton.tsx
'use client'

import { useState, useTransition } from 'react'
import { deleteCase } from '@/actions/cases'

/** Admin-only. Deleting a case also deletes its forms, documents and status history. */
export default function DeleteCaseButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function remove() {
    if (
      !window.confirm(
        'Permanently delete this case and its forms, documents and status history? This cannot be undone.'
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      // On success the action redirects to /cases and never returns.
      const result = await deleteCase(id)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">delete</span>
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 6: Show it on the case page (admin only)** — in `src/app/(app)/cases/[id]/page.tsx` add imports `import DeleteCaseButton from '@/components/cases/DeleteCaseButton'` and `import { isCurrentUserAdmin } from '@/lib/auth/is-admin'`; after `if (!caseData) notFound()` add `const isAdmin = await isCurrentUserAdmin()`; in the header actions `<div className="flex items-center space-x-3">` add `{isAdmin && <DeleteCaseButton id={id} />}` as the last child (after the existing "Archive Case" button, which stays untouched).

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` → no output. `npx jest` → all pass. `npx eslint src/lib/auth/is-admin.ts src/actions/clients.ts src/actions/leads.ts src/actions/cases.ts src/components/cases/DeleteCaseButton.tsx "src/app/(app)/cases/[id]/page.tsx"` → only errors that already existed before this task (`no-explicit-any` in the case page and cases.ts); none on lines you added.

- [ ] **Step 8: Prod check of case delete cascade** (MCP `execute_sql`, rollback):

```sql
begin;
select set_config('request.jwt.claims', json_build_object('sub',(select id from profiles where role='admin' limit 1),'role','authenticated')::text, true);
set local role authenticated;
create temp table before as select id, (select count(*) from case_forms f where f.case_id = c.id) forms from cases c limit 1;
delete from cases where id = (select id from before);
select (select forms from before) as forms_before,
       (select count(*) from case_forms where case_id = (select id from before)) as forms_after,
       (select count(*) from cases where id = (select id from before)) as case_after;
```
Expected: `case_after` = 0, `forms_after` = 0. The transaction is never committed, so nothing changes; confirm with `select count(*) from cases;` → 3 (prod count on 2026-10-21).

- [ ] **Step 9: Commit**

```bash
git add src/lib/auth/is-admin.ts src/actions/clients.ts src/actions/leads.ts src/actions/cases.ts src/components/cases/DeleteCaseButton.tsx "src/app/(app)/cases/[id]/page.tsx"
git commit -m "feat(internal-app): admin can delete cases; direct delete/hide share one code path

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Staff request actions + request button and pending banner on case/client/lead

**Files:**
- Create: `src/actions/deletion-requests.ts`
- Create: `src/components/deletion/RequestDeletionButton.tsx`, `src/components/deletion/PendingRequestBanner.tsx`
- Modify: `src/app/(app)/cases/[id]/page.tsx`, `src/app/(app)/clients/[id]/page.tsx`, `src/app/(app)/leads/[userId]/page.tsx`

**Interfaces:**
- Consumes: Task 3 (`parseDeletionRequest`, `parseDecisionNote`, `actionLabel`, `EntityType`, `DeletionRequestRow`, `REQUEST_COLUMNS`), Task 5 (`submitRequest`, `approveRequest`, `rejectRequest`, `deletionDeps`), Task 6 (`getCurrentAdminId`)
- Produces (server actions, used by Task 8 too):
  - `requestDeletion(input: { entityType: string; entityId: string; reason: string }): Promise<Result<{ emailError: string | null }>>`
  - `approveDeletionRequest(id: string): Promise<Result<{ emailError: string | null }>>`
  - `rejectDeletionRequest(id: string, note: string): Promise<Result<{ emailError: string | null }>>`
  - `getPendingRequestFor(type: EntityType, id: string): Promise<{ requesterName: string; createdAt: string } | null>`
  - `getDeletionRequests(): Promise<{ pending: DeletionRequestRow[]; decided: DeletionRequestRow[]; names: Record<string, string> }>`
  - `getPendingDeletionCount(): Promise<number>`

- [ ] **Step 1: Create the actions file**

```ts
// src/actions/deletion-requests.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdminId } from '@/lib/auth/is-admin'
import { isUuid } from '@/lib/jobs/validation'
import type { Result } from '@/lib/jobs/types'
import { approveRequest, deletionDeps, rejectRequest, submitRequest } from '@/lib/deletion/flow'
import {
  entityHref,
  parseDecisionNote,
  parseDeletionRequest,
  REQUEST_COLUMNS,
  type DeletionRequestRow,
  type EntityType,
} from '@/lib/deletion/requests'

// Thin boundary over lib/deletion/flow.ts. RLS (migration 018) decides who
// sees and changes what; the admin checks here only give readable errors.

export async function requestDeletion(input: {
  entityType: string
  entityId: string
  reason: string
}): Promise<Result<{ emailError: string | null }>> {
  const parsed = parseDeletionRequest(input)
  if (!parsed.ok) return parsed
  const result = await submitRequest(deletionDeps(await createClient()), parsed.value)
  if (result.ok) {
    revalidatePath(entityHref(parsed.value.entityType, parsed.value.entityId))
    revalidatePath('/deletion-requests')
  }
  return result
}

export async function approveDeletionRequest(
  id: string,
): Promise<Result<{ emailError: string | null }>> {
  if (!isUuid(id)) return { ok: false, error: 'Unknown request.' }
  const adminId = await getCurrentAdminId()
  if (!adminId) return { ok: false, error: 'Only an admin can approve requests.' }
  const result = await approveRequest(deletionDeps(await createClient()), id, adminId)
  if (!result.ok) {
    revalidatePath('/deletion-requests')
    return result
  }
  for (const path of result.value.paths) revalidatePath(path)
  return { ok: true, value: { emailError: result.value.emailError } }
}

export async function rejectDeletionRequest(
  id: string,
  note: string,
): Promise<Result<{ emailError: string | null }>> {
  if (!isUuid(id)) return { ok: false, error: 'Unknown request.' }
  const parsedNote = parseDecisionNote(note)
  if (!parsedNote.ok) return parsedNote
  const adminId = await getCurrentAdminId()
  if (!adminId) return { ok: false, error: 'Only an admin can reject requests.' }
  const result = await rejectRequest(deletionDeps(await createClient()), id, adminId, parsedNote.value)
  if (result.ok) revalidatePath('/deletion-requests')
  return result
}

async function namesFor(ids: (string | null)[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((i): i is string => Boolean(i)))]
  if (unique.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('id, full_name, email').in('id', unique)
  if (error) throw error
  const names: Record<string, string> = {}
  for (const p of data ?? []) {
    names[p.id as string] = (p.full_name as string | null) || (p.email as string | null) || 'Unknown'
  }
  return names
}

/**
 * The pending request for one item, for the yellow banner. Staff only see
 * their own requests (RLS), so another staff member's request shows up as
 * "already pending" when they try to file a second one.
 */
export async function getPendingRequestFor(
  type: EntityType,
  id: string,
): Promise<{ requesterName: string; createdAt: string } | null> {
  if (!isUuid(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deletion_requests')
    .select('requested_by, created_at')
    .eq('entity_type', type)
    .eq('entity_id', id)
    .eq('status', 'pending')
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const names = await namesFor([data.requested_by as string | null])
  return {
    requesterName: names[data.requested_by as string] ?? 'A staff member',
    createdAt: data.created_at as string,
  }
}

/** Admin: every pending request plus the 50 most recent decisions. Staff: their own (RLS). */
export async function getDeletionRequests(): Promise<{
  pending: DeletionRequestRow[]
  decided: DeletionRequestRow[]
  names: Record<string, string>
}> {
  const supabase = await createClient()
  const [pending, decided] = await Promise.all([
    supabase
      .from('deletion_requests')
      .select(REQUEST_COLUMNS)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('deletion_requests')
      .select(REQUEST_COLUMNS)
      .neq('status', 'pending')
      .order('decided_at', { ascending: false })
      .limit(50),
  ])
  if (pending.error) throw pending.error
  if (decided.error) throw decided.error
  const p = (pending.data ?? []) as unknown as DeletionRequestRow[]
  const d = (decided.data ?? []) as unknown as DeletionRequestRow[]
  const names = await namesFor([...p, ...d].flatMap((r) => [r.requested_by, r.decided_by]))
  return { pending: p, decided: d, names }
}

export async function getPendingDeletionCount(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('deletion_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (error) throw error
  return count ?? 0
}
```

Note: `.neq` is not in the Task 5 fake; it is only used here (not unit-tested).

- [ ] **Step 2: Create `PendingRequestBanner`**

```tsx
// src/components/deletion/PendingRequestBanner.tsx
import { actionLabel, type EntityType } from '@/lib/deletion/requests'

export default function PendingRequestBanner({
  entityType,
  requesterName,
  createdAt,
}: {
  entityType: EntityType
  requesterName: string
  createdAt: string
}) {
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return (
    <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 text-sm text-amber-800">
      <span className="material-symbols-outlined text-[18px]">pending_actions</span>
      <span>
        {actionLabel(entityType)} requested by {requesterName} on {date} — waiting for an admin.
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Create `RequestDeletionButton`**

```tsx
// src/components/deletion/RequestDeletionButton.tsx
'use client'

import { useState, useTransition } from 'react'
import { requestDeletion } from '@/actions/deletion-requests'
import { actionLabel, type EntityType } from '@/lib/deletion/requests'

/** Staff: ask an admin to delete (or, for a lead, hide) this item. */
export default function RequestDeletionButton({
  entityType,
  entityId,
}: {
  entityType: EntityType
  entityId: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const label = entityType === 'lead' ? 'Request hide' : 'Request deletion'

  function submit() {
    setMessage(null)
    startTransition(async () => {
      const result = await requestDeletion({ entityType, entityId, reason })
      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error })
        return
      }
      setOpen(false)
      setReason('')
      setMessage({
        kind: 'ok',
        text: result.value.emailError
          ? `Request saved. The admin email was not sent: ${result.value.emailError}`
          : 'Request sent to an admin.',
      })
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">
            {entityType === 'lead' ? 'visibility_off' : 'delete'}
          </span>
          {label}
        </button>
      ) : (
        <div className="w-80 bg-white rounded-lg border border-[#bcc9ca]/40 p-3 space-y-2 shadow-sm">
          <p className="text-xs font-semibold text-slate-600">
            {actionLabel(entityType)} — why? An admin will review it.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full text-sm border border-[#bcc9ca]/40 rounded-lg p-2 outline-none focus:ring-2"
            style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
            placeholder="e.g. Duplicate of another record"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !reason.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#006970' }}
            >
              {pending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className={`text-xs max-w-xs text-right ${message.kind === 'error' ? 'text-red-600' : 'text-[#006970]'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Case page** (`src/app/(app)/cases/[id]/page.tsx`) — add imports `RequestDeletionButton`, `PendingRequestBanner`, `getPendingRequestFor` (`@/actions/deletion-requests`). Replace `const isAdmin = await isCurrentUserAdmin()` (Task 6) with:

```tsx
  const [isAdmin, pendingRequest] = await Promise.all([
    isCurrentUserAdmin(),
    getPendingRequestFor('case', id),
  ])
```
Directly after the breadcrumbs `</nav>` add:
```tsx
      {pendingRequest && (
        <PendingRequestBanner
          entityType="case"
          requesterName={pendingRequest.requesterName}
          createdAt={pendingRequest.createdAt}
        />
      )}
```
Replace `{isAdmin && <DeleteCaseButton id={id} />}` with:
```tsx
          {isAdmin ? (
            <DeleteCaseButton id={id} />
          ) : (
            !pendingRequest && <RequestDeletionButton entityType="case" entityId={id} />
          )}
```

- [ ] **Step 5: Client page** (`src/app/(app)/clients/[id]/page.tsx`) — add the same three imports. Replace `const isAdmin = await isCurrentUserAdmin()` with:
```tsx
  const [isAdmin, pendingRequest] = await Promise.all([
    isCurrentUserAdmin(),
    getPendingRequestFor('client', id),
  ])
```
Right after the `{already === '1' && (...)}` block add the `PendingRequestBanner` block with `entityType="client"`. Replace
```tsx
          {isAdmin && (
            <DeleteClientButton
              id={client.id}
              name={`${client.first_name} ${client.last_name}`}
            />
          )}
```
with
```tsx
          {isAdmin ? (
            <DeleteClientButton
              id={client.id}
              name={`${client.first_name} ${client.last_name}`}
            />
          ) : (
            !pendingRequest && <RequestDeletionButton entityType="client" entityId={client.id} />
          )}
```

- [ ] **Step 6: Lead page** (`src/app/(app)/leads/[userId]/page.tsx`) — add the three imports; extend the `Promise.all` to also load `getPendingRequestFor('lead', userId)` as `pendingRequest` (last element). After the `{hiddenAt && (...)}` banner add the `PendingRequestBanner` block with `entityType="lead"`. Replace
```tsx
        {isAdmin && <HideLeadButton userId={lead.user_id} hidden={hiddenAt !== null} />}
```
with
```tsx
        {isAdmin ? (
          <HideLeadButton userId={lead.user_id} hidden={hiddenAt !== null} />
        ) : (
          !hiddenAt &&
          !pendingRequest && <RequestDeletionButton entityType="lead" entityId={lead.user_id} />
        )}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` → no output; `npx jest` → all pass; `npx eslint src/actions/deletion-requests.ts src/components/deletion "src/app/(app)/cases/[id]/page.tsx" "src/app/(app)/clients/[id]/page.tsx" "src/app/(app)/leads/[userId]/page.tsx"` → no errors on lines you added.

- [ ] **Step 8: Commit**

```bash
git add src/actions/deletion-requests.ts src/components/deletion "src/app/(app)/cases/[id]/page.tsx" "src/app/(app)/clients/[id]/page.tsx" "src/app/(app)/leads/[userId]/page.tsx"
git commit -m "feat(internal-app): staff can request case/client deletion or lead hide

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Deletion requests page, decision buttons, nav badge

**Files:**
- Create: `src/components/deletion/DecisionButtons.tsx`, `src/app/(app)/deletion-requests/page.tsx`
- Modify: `src/app/(app)/layout.tsx` (NavItem + NAV_ITEMS + NavLink + admin count), `src/components/layout/PageTitle.tsx` (TITLE_MAP)

**Interfaces:**
- Consumes: Task 7 actions (`approveDeletionRequest`, `rejectDeletionRequest`, `getDeletionRequests`, `getPendingDeletionCount`), Task 3 (`actionLabel`, `entityHref`, `DeletionRequestRow`), `isCurrentUserAdmin`

- [ ] **Step 1: Create `DecisionButtons`**

```tsx
// src/components/deletion/DecisionButtons.tsx
'use client'

import { useState, useTransition } from 'react'
import { approveDeletionRequest, rejectDeletionRequest } from '@/actions/deletion-requests'

/** Admin: approve (runs the delete/hide) or reject a pending request. */
export default function DecisionButtons({ requestId, action }: { requestId: string; action: string }) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function run(fn: () => ReturnType<typeof approveDeletionRequest>) {
    setMessage(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error })
        return
      }
      // The row moves to History on revalidate; this note covers the email only.
      if (result.value.emailError) {
        setMessage({ kind: 'error', text: `Done. Staff email not sent: ${result.value.emailError}` })
      }
    })
  }

  function approve() {
    if (!window.confirm(`${action}? This cannot be undone.`)) return
    run(() => approveDeletionRequest(requestId))
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!rejecting ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRejecting(true)}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-[#bcc9ca]/40 hover:bg-[#f1f4f9] disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? 'Working…' : 'Approve'}
          </button>
        </div>
      ) : (
        <div className="w-72 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Optional note for the staff member"
            className="w-full text-sm border border-[#bcc9ca]/40 rounded-lg p-2 outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              disabled={pending}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => run(() => rejectDeletionRequest(requestId, note))}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#006970' }}
            >
              {pending ? 'Working…' : 'Reject request'}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className={`text-xs max-w-xs text-right ${message.kind === 'error' ? 'text-red-600' : 'text-[#006970]'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the page**

```tsx
// src/app/(app)/deletion-requests/page.tsx
import Link from 'next/link'
import { getDeletionRequests } from '@/actions/deletion-requests'
import { isCurrentUserAdmin } from '@/lib/auth/is-admin'
import { actionLabel, entityHref, type DeletionRequestRow } from '@/lib/deletion/requests'
import DecisionButtons from '@/components/deletion/DecisionButtons'

export const dynamic = 'force-dynamic'

const CARD = { boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }

const STATUS_STYLE: Record<DeletionRequestRow['status'], string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-[rgba(58,175,185,0.1)] text-[#006970]',
  rejected: 'bg-slate-100 text-slate-600',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ItemCell({ row }: { row: DeletionRequestRow }) {
  // Approved case/client rows point at something that no longer exists.
  const gone = row.status === 'approved' && row.entity_type !== 'lead'
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {actionLabel(row.entity_type)}
      </p>
      {gone ? (
        <p className="text-sm font-semibold text-slate-500">{row.entity_label}</p>
      ) : (
        <Link
          href={entityHref(row.entity_type, row.entity_id)}
          className="text-sm font-semibold text-slate-800 hover:underline"
        >
          {row.entity_label}
        </Link>
      )}
    </div>
  )
}

export default async function DeletionRequestsPage() {
  const [isAdmin, { pending, decided, names }] = await Promise.all([
    isCurrentUserAdmin(),
    getDeletionRequests(),
  ])
  const who = (id: string | null) => (id ? names[id] ?? 'Unknown' : '—')

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Deletion requests</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {isAdmin
            ? `${pending.length} waiting for you`
            : 'Your requests to delete a case or client, or hide a lead'}
        </p>
      </div>

      <section className="bg-white rounded-xl p-6 space-y-4" style={CARD}>
        <h3 className="text-base font-semibold text-slate-800">Pending</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Nothing waiting.</p>
        ) : (
          <ul className="divide-y divide-[#f1f4f9]">
            {pending.map((row) => (
              <li key={row.id} className="py-4 flex items-start justify-between gap-6">
                <div className="space-y-1 min-w-0">
                  <ItemCell row={row} />
                  <p className="text-sm text-slate-600 break-words">“{row.reason}”</p>
                  <p className="text-[11px] text-slate-400">
                    {who(row.requested_by)} · {formatDate(row.created_at)}
                  </p>
                </div>
                {isAdmin && <DecisionButtons requestId={row.id} action={actionLabel(row.entity_type)} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl p-6 space-y-4" style={CARD}>
        <h3 className="text-base font-semibold text-slate-800">History</h3>
        {decided.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No decisions yet.</p>
        ) : (
          <ul className="divide-y divide-[#f1f4f9]">
            {decided.map((row) => (
              <li key={row.id} className="py-4 flex items-start justify-between gap-6">
                <div className="space-y-1 min-w-0">
                  <ItemCell row={row} />
                  <p className="text-sm text-slate-600 break-words">“{row.reason}”</p>
                  <p className="text-[11px] text-slate-400">
                    Asked by {who(row.requested_by)} · {formatDate(row.created_at)} · decided by{' '}
                    {who(row.decided_by)} · {formatDate(row.decided_at)}
                  </p>
                  {row.decision_note && (
                    <p className="text-xs text-slate-500">Note: {row.decision_note}</p>
                  )}
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold capitalize shrink-0 ${STATUS_STYLE[row.status]}`}
                >
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Nav item + admin badge** in `src/app/(app)/layout.tsx`:

  - `interface NavItem` gains `badge?: number`.
  - In `NAV_ITEMS`, after the Consultations entry add `{ href: '/deletion-requests', label: 'Deletion requests', icon: 'delete_sweep' },`.
  - Add `import { getPendingDeletionCount } from '@/actions/deletion-requests'`.
  - Replace the `visibleNav` block with:

```tsx
  // Admins see how many deletion requests wait for them.
  const pendingDeletions = isAdmin ? await getPendingDeletionCount() : 0
  const visibleNav = (isAdmin ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.href !== '/jobs')).map(
    (item) =>
      item.href === '/deletion-requests' && pendingDeletions > 0
        ? { ...item, badge: pendingDeletions }
        : item
  )
```

  - In `NavLink`, after the label `<span>` add:

```tsx
      {item.badge ? (
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
          {item.badge}
        </span>
      ) : null}
```

- [ ] **Step 4: Page title** — in `src/components/layout/PageTitle.tsx` add `'/deletion-requests': 'Deletion requests',` to `TITLE_MAP`.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → no output; `npx jest` → all pass; `npx eslint src/components/deletion "src/app/(app)/deletion-requests" "src/app/(app)/layout.tsx" src/components/layout/PageTitle.tsx` → no errors on lines you added.

- [ ] **Step 6: Commit**

```bash
git add src/components/deletion/DecisionButtons.tsx "src/app/(app)/deletion-requests" "src/app/(app)/layout.tsx" src/components/layout/PageTitle.tsx
git commit -m "feat(internal-app): Deletion requests inbox with approve/reject and admin nav badge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: End-to-end data check, ROADMAP

**Files:**
- Modify: `docs/ROADMAP.md` (repo root)

- [ ] **Step 1: Full verification**

Run from `apps/internal_app/`: `npx jest` (all pass, note the count), `npx tsc --noEmit` (no output).

- [ ] **Step 2: Lifecycle check on prod in a rollback transaction** (MCP `execute_sql`): as a temporary staff profile, insert a `case` request for an existing case; as admin, run the claim update (`status='approved' … where status='pending'`) and `delete from cases where id = …`; select that the request is `approved` and the case is gone; never commit. Then confirm zero residue: `select count(*) from deletion_requests;` → 0, `select count(*) from cases;` → unchanged, `select count(*) from profiles where role='staff';` → 0.

- [ ] **Step 3: ROADMAP** — in `docs/ROADMAP.md`, directly under the line that starts with `- [x] **Internal App — admin ẩn lead + xóa client — 2026-10-20.**`, add:

```markdown
- [x] **Internal App — xóa case + yêu cầu xóa có admin duyệt — 2026-10-21** (spec `specs/2026-10-21-internal-app-deletion-requests-design.md`, plan `plans/2026-10-21-internal-app-deletion-requests.md`). Admin xóa được case (DB tự xóa forms/documents/status history; jobs/payments/expenses giữ dòng, `case_id` về NULL). Staff không xóa: bấm **Request deletion** (case, client) / **Request hide** (lead) kèm lý do → bảng `deletion_requests` (migration 018 trên prod; staff thêm + đọc của mình, admin đọc + duyệt, không ai xóa dòng) → admin nhận email Chris@mannaos.com + badge menu **Deletion requests** → Approve (chạy đúng code của nút Delete/Hide của admin; client còn case/job thì yêu cầu quay về chờ) / Reject (ghi chú tùy chọn) → staff nhận email kết quả. Admin tự xóa/ẩn khi đang có yêu cầu chờ → yêu cầu tự đóng approved. **Owner:** bấm thử bằng tài khoản admin; thử phía staff khi có tài khoản staff đầu tiên (prod hiện 0 staff).
```

- [ ] **Step 4: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs(roadmap): internal app case delete + deletion requests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
