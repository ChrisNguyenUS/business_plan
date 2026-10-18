# G4 v2 — Consultation inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff work N400Ready consultation requests from one internal_app page: see who is waiting, move status, record outcome and notes, and jump to Convert to Client on a win.

**Architecture:** Migration `n400_40` widens the UPDATE policy to staff and pins UPDATE to five pipeline columns by column grant. A pure module holds the status/outcome rules and tab sorting; one server-action file reads all recent requests and writes one row; a server page partitions rows into tabs and renders a small client component per request.

**Tech Stack:** Next.js 16 App Router (`apps/internal_app` — read `node_modules/next/dist/docs/` before touching pages, per `AGENTS.md`), Supabase (Postgres + RLS, `@supabase/ssr`), Jest via `next/jest`, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-17-g4-consultation-inbox-design.md`

## Global Constraints

- UI/actions only in `apps/internal_app/`. The migration file goes in `apps/website/supabase/migrations/` (convention for `n400_*` tables, like `n400_29`); no website **code** changes.
- Staff may UPDATE only `status, outcome, outcome_note, note, updated_at`. Never write `name, phone, topic, preferred_time, source_cta, user_id, first_touch, last_touch`.
- `outcome` is non-null only when `status = 'done'`; any other status clears it (no error).
- Server actions return `{ ok: false, error }` instead of throwing for expected failures (Next hides thrown messages in production).
- Every query scoped to a lead uses an explicit `.eq(...)`.
- English UI copy. Status/outcome shown with text, never colour alone.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. One logical change per commit.
- Run from `apps/internal_app`: `npx jest`, `npx tsc --noEmit`, `npx eslint <paths>`.
- Spec ruling carried into this plan: a `done` request with no outcome yet stays in **Open** (labelled "needs outcome") — otherwise it would vanish into Closed before staff record the result. Spec §4 updated to match.

## Review Focus

1. Status moved away from `done` while an outcome is set → outcome cleared, row moves back to Open. Pinned in Task 2 (`validateConsultationUpdate` test).
2. A forged form posting `phone` or `name` → the DB refuses it (column grant), the action never sends it. Pinned in Task 1 probe step 2 and Task 3 payload.
3. A lead editing their own request directly via the anon/authenticated API → 0 rows / permission denied. Pinned in Task 1 probe steps 3–4.
4. A bad or unknown request id → `{ ok: false }`, no 500. Pinned in Task 3 (`isUuid` + `maybeSingle` null branch).
5. More than 500 requests → page states it shows the 500 most recent, tab counts labelled accordingly. Pinned in Task 4 (`capped` banner).

---

### Task 1: Migration n400_40 — staff update, column-pinned

**Files:**
- Create: `apps/website/supabase/migrations/n400_40_consultation_staff_update.sql`

**Interfaces:**
- Produces: policy `n400 consultation staff update` (UPDATE, authenticated, `is_staff_or_admin()`); `authenticated` UPDATE privilege on exactly `status, outcome, outcome_note, note, updated_at`; no UPDATE for `anon`.

- [ ] **Step 1: Confirm the live policy name and the next number**

Run (MCP `execute_sql`): `select policyname from pg_policies where tablename='n400_consultation_requests' and cmd='UPDATE';`
Expected: `n400 consultation admin update`.
Run: `ls apps/website/supabase/migrations | grep n400_ | sort -V | tail -1`
Expected: `n400_39_resync_question_bank.sql` → use `n400_40`.

- [ ] **Step 2: Write the migration**

```sql
-- n400_40_consultation_staff_update.sql
-- G4 v2 Consultation inbox (spec 2026-10-17-g4-consultation-inbox-design.md):
-- staff work the pipeline, not just admins. n400_29 kept every UPDATE at
-- admin because G4 v1 was read-only; this is the first staff write.
--
-- Column grant: staff move status/outcome and write notes. They never
-- rewrite what the customer submitted (name, phone, topic, time, attribution).
-- The grant applies to admins too — anything else goes through the SQL editor.
-- The website never UPDATEs this table (booking-actions.ts only INSERTs), so
-- the narrower grant costs it nothing.

BEGIN;

DROP POLICY IF EXISTS "n400 consultation admin update" ON public.n400_consultation_requests;
CREATE POLICY "n400 consultation staff update" ON public.n400_consultation_requests
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_staff_or_admin()))
  WITH CHECK ((SELECT public.is_staff_or_admin()));

REVOKE UPDATE ON public.n400_consultation_requests FROM anon, authenticated;
GRANT UPDATE (status, outcome, outcome_note, note, updated_at)
  ON public.n400_consultation_requests TO authenticated;

COMMIT;
```

- [ ] **Step 3: Apply to prod (controller only)**

Ask the owner first. On yes: MCP `apply_migration`, name `n400_40_consultation_staff_update`, body without `BEGIN;`/`COMMIT;`. If declined, owner runs the file in the SQL editor.

- [ ] **Step 4: Verify**

```sql
select policyname, cmd, roles, qual from pg_policies
where tablename='n400_consultation_requests' and cmd='UPDATE';
select grantee, string_agg(column_name, ',' order by column_name) cols
from information_schema.column_privileges
where table_name='n400_consultation_requests' and privilege_type='UPDATE'
  and grantee in ('anon','authenticated') group by 1;
select grantee from information_schema.role_table_grants
where table_name='n400_consultation_requests' and privilege_type='UPDATE'
  and grantee in ('anon','authenticated');
```

Expected: one policy `n400 consultation staff update`, roles `{authenticated}`; column grants only for `authenticated` = `note,outcome,outcome_note,status,updated_at`; last query 0 rows (no table-level UPDATE left for anon/authenticated).

- [ ] **Step 5: Zero-residue probe (rolled back)**

Lead: Test User `752015e5-1118-49d7-b9bf-b690eda90a2b`. Admin: `fb1d074c-d74a-4d78-ba0e-f0c6e0c61c66`. Run as one statement batch:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"752015e5-1118-49d7-b9bf-b690eda90a2b","role":"authenticated"}',true);
insert into n400_consultation_requests (user_id,name,phone,topic) values
  ('752015e5-1118-49d7-b9bf-b690eda90a2b','Probe','555-0100','other');
-- 3. the lead cannot move their own request
with u as (update n400_consultation_requests set status='done' where name='Probe' returning 1)
select 'lead_update_rows' k, count(*)::text v from u
union all
select 'x','x' where false;
select set_config('request.jwt.claims','{"sub":"fb1d074c-d74a-4d78-ba0e-f0c6e0c61c66","role":"authenticated"}',true);
-- 1. staff/admin moves status; trigger stamps booked_at
with u as (update n400_consultation_requests set status='booked', updated_at=now() where name='Probe' returning 1)
select 'staff_update_rows' k, count(*)::text v from u;
select 'booked_at_set' k, (consultation_booked_at is not null)::text v from n400_lead_profiles
  where user_id='752015e5-1118-49d7-b9bf-b690eda90a2b';
-- 2. staff cannot rewrite customer fields
do $$ begin
  update n400_consultation_requests set phone='999' where name='Probe';
  raise exception 'PHONE UPDATE ALLOWED';
exception when insufficient_privilege then null;
end $$;
-- 4. anon cannot update at all
set local role anon;
do $$ begin
  update n400_consultation_requests set status='done' where name='Probe';
  raise exception 'ANON UPDATE ALLOWED';
exception when insufficient_privilege then null;
end $$;
rollback;
```

Then: `select count(*) residue from n400_consultation_requests where name='Probe';`

Expected: `lead_update_rows = 0`, `staff_update_rows = 1`, `booked_at_set = true`, no `… ALLOWED` exception, `residue = 0`. (If the MCP returns only the last result set, split the batch into one `begin…rollback` per check.)

- [ ] **Step 6: Commit**

```bash
git add apps/website/supabase/migrations/n400_40_consultation_staff_update.sql
git commit -m "feat(db): staff can work consultation requests (n400_40)

UPDATE policy admin → staff-or-admin; UPDATE pinned by column grant to
status/outcome/outcome_note/note/updated_at, anon UPDATE revoked. Applied to
prod; probe: lead 0 rows, staff 1 row + booked_at stamped, phone 42501,
anon 42501, zero residue.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pure rules — `consultation.ts`

**Files:**
- Create: `apps/internal_app/src/lib/n400/consultation.ts`
- Test: `apps/internal_app/__tests__/lib/n400/consultation.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const CONSULTATION_STATUSES: readonly ['new','contacted','booked','done','no_show','cancelled']
  export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number]
  export const CONSULTATION_OUTCOMES: readonly ['won','lost','follow_up']
  export type ConsultationOutcome = (typeof CONSULTATION_OUTCOMES)[number]
  export const STATUS_LABELS: Record<ConsultationStatus, string>
  export const OUTCOME_LABELS: Record<ConsultationOutcome, string>
  export function topicLabel(topic: string | null): string
  export type InboxTab = 'open' | 'follow_up' | 'closed'
  export const INBOX_TABS: readonly InboxTab[]
  export interface ConsultationRow {
    id: string; user_id: string; name: string | null; phone: string | null
    preferred_time: string | null; topic: string | null; source_cta: string | null
    status: string; outcome: string | null; outcome_note: string | null; note: string | null
    created_at: string; updated_at: string
  }
  export function validateConsultationUpdate(input: { status: string; outcome: string | null }):
    | { ok: true; value: { status: ConsultationStatus; outcome: ConsultationOutcome | null } }
    | { ok: false; error: string }
  export function inboxTab(row: { status: string; outcome: string | null }): InboxTab
  export function sortForTab(rows: ConsultationRow[], tab: InboxTab): ConsultationRow[]
  export function daysSince(iso: string, now?: Date): number
  ```

- [ ] **Step 1: Write the failing test**

```ts
import {
  daysSince,
  inboxTab,
  sortForTab,
  topicLabel,
  validateConsultationUpdate,
  type ConsultationRow,
} from '@/lib/n400/consultation'

describe('validateConsultationUpdate', () => {
  it('accepts an outcome only when the consultation is done', () => {
    expect(validateConsultationUpdate({ status: 'done', outcome: 'won' })).toEqual({
      ok: true,
      value: { status: 'done', outcome: 'won' },
    })
  })

  it('clears the outcome when status is not done (moving back from done)', () => {
    expect(validateConsultationUpdate({ status: 'contacted', outcome: 'won' })).toEqual({
      ok: true,
      value: { status: 'contacted', outcome: null },
    })
  })

  it('treats an empty outcome as none', () => {
    expect(validateConsultationUpdate({ status: 'done', outcome: '' })).toEqual({
      ok: true,
      value: { status: 'done', outcome: null },
    })
  })

  it('rejects an unknown status or outcome', () => {
    expect(validateConsultationUpdate({ status: 'archived', outcome: null })).toEqual({
      ok: false,
      error: 'Unknown status',
    })
    expect(validateConsultationUpdate({ status: 'done', outcome: 'maybe' })).toEqual({
      ok: false,
      error: 'Unknown outcome',
    })
  })
})

describe('inboxTab', () => {
  it('puts work still to do in open — including done without an outcome', () => {
    expect(inboxTab({ status: 'new', outcome: null })).toBe('open')
    expect(inboxTab({ status: 'contacted', outcome: null })).toBe('open')
    expect(inboxTab({ status: 'booked', outcome: null })).toBe('open')
    expect(inboxTab({ status: 'done', outcome: null })).toBe('open')
  })

  it('separates follow-ups from closed', () => {
    expect(inboxTab({ status: 'done', outcome: 'follow_up' })).toBe('follow_up')
    expect(inboxTab({ status: 'done', outcome: 'won' })).toBe('closed')
    expect(inboxTab({ status: 'done', outcome: 'lost' })).toBe('closed')
    expect(inboxTab({ status: 'no_show', outcome: null })).toBe('closed')
    expect(inboxTab({ status: 'cancelled', outcome: null })).toBe('closed')
  })
})

describe('sortForTab', () => {
  const row = (id: string, created_at: string, updated_at: string): ConsultationRow => ({
    id, user_id: 'u', name: null, phone: null, preferred_time: null, topic: null, source_cta: null,
    status: 'new', outcome: null, outcome_note: null, note: null, created_at, updated_at,
  })
  const a = row('a', '2026-10-01T00:00:00Z', '2026-10-10T00:00:00Z')
  const b = row('b', '2026-10-05T00:00:00Z', '2026-10-06T00:00:00Z')

  it('open: newest request first', () => {
    expect(sortForTab([a, b], 'open').map((r) => r.id)).toEqual(['b', 'a'])
  })
  it('follow_up: longest untouched first', () => {
    expect(sortForTab([a, b], 'follow_up').map((r) => r.id)).toEqual(['b', 'a'])
  })
  it('closed: most recently closed first', () => {
    expect(sortForTab([b, a], 'closed').map((r) => r.id)).toEqual(['a', 'b'])
  })
})

describe('daysSince / topicLabel', () => {
  it('counts whole days and never goes negative', () => {
    const now = new Date('2026-10-17T12:00:00Z')
    expect(daysSince('2026-10-14T13:00:00Z', now)).toBe(2)
    expect(daysSince('2026-10-18T00:00:00Z', now)).toBe(0)
  })
  it('labels known topics and passes through unknown ones', () => {
    expect(topicLabel('document_prep')).toBe('Document prep')
    expect(topicLabel('mystery')).toBe('mystery')
    expect(topicLabel(null)).toBe('—')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/internal_app && npx jest __tests__/lib/n400/consultation.test.ts`
Expected: FAIL — `Cannot find module '@/lib/n400/consultation'`.

- [ ] **Step 3: Implement**

```ts
// Consultation inbox rules (spec 2026-10-17-g4-consultation-inbox-design.md §4).
// Values mirror the CHECK constraints on n400_consultation_requests.

export const CONSULTATION_STATUSES = [
  'new',
  'contacted',
  'booked',
  'done',
  'no_show',
  'cancelled',
] as const
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number]

export const CONSULTATION_OUTCOMES = ['won', 'lost', 'follow_up'] as const
export type ConsultationOutcome = (typeof CONSULTATION_OUTCOMES)[number]

export const STATUS_LABELS: Record<ConsultationStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  booked: 'Booked',
  done: 'Done',
  no_show: 'No show',
  cancelled: 'Cancelled',
}

export const OUTCOME_LABELS: Record<ConsultationOutcome, string> = {
  won: 'Won',
  lost: 'Lost',
  follow_up: 'Follow up',
}

const TOPIC_LABELS: Record<string, string> = {
  document_prep: 'Document prep',
  n400_review: 'N-400 review',
  interview_prep: 'Interview prep',
  writing: 'Writing',
  speaking: 'Speaking',
  other: 'Other',
}

export function topicLabel(topic: string | null): string {
  if (!topic) return '—'
  return TOPIC_LABELS[topic] ?? topic
}

export type InboxTab = 'open' | 'follow_up' | 'closed'
export const INBOX_TABS: readonly InboxTab[] = ['open', 'follow_up', 'closed']

export interface ConsultationRow {
  id: string
  user_id: string
  name: string | null
  phone: string | null
  preferred_time: string | null
  topic: string | null
  source_cta: string | null
  status: string
  outcome: string | null
  outcome_note: string | null
  note: string | null
  created_at: string
  updated_at: string
}

const isStatus = (v: string): v is ConsultationStatus =>
  (CONSULTATION_STATUSES as readonly string[]).includes(v)
const isOutcome = (v: string): v is ConsultationOutcome =>
  (CONSULTATION_OUTCOMES as readonly string[]).includes(v)

/**
 * Status says whether the call happened; outcome says whether it became
 * business. An outcome only exists once the call is done — moving status
 * away from done clears it rather than erroring.
 */
export function validateConsultationUpdate(input: {
  status: string
  outcome: string | null
}):
  | { ok: true; value: { status: ConsultationStatus; outcome: ConsultationOutcome | null } }
  | { ok: false; error: string } {
  if (!isStatus(input.status)) return { ok: false, error: 'Unknown status' }
  const raw = input.outcome && input.outcome.length > 0 ? input.outcome : null
  if (raw !== null && !isOutcome(raw)) return { ok: false, error: 'Unknown outcome' }
  return {
    ok: true,
    value: { status: input.status, outcome: input.status === 'done' ? raw : null },
  }
}

/** done-without-outcome stays open: the result still has to be recorded. */
export function inboxTab(row: { status: string; outcome: string | null }): InboxTab {
  if (row.outcome === 'follow_up') return 'follow_up'
  if (row.outcome === null && ['new', 'contacted', 'booked', 'done'].includes(row.status)) {
    return 'open'
  }
  return 'closed'
}

export function sortForTab(rows: ConsultationRow[], tab: InboxTab): ConsultationRow[] {
  const copy = [...rows]
  if (tab === 'open') return copy.sort((x, y) => y.created_at.localeCompare(x.created_at))
  if (tab === 'follow_up') return copy.sort((x, y) => x.updated_at.localeCompare(y.updated_at))
  return copy.sort((x, y) => y.updated_at.localeCompare(x.updated_at))
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/internal_app && npx jest __tests__/lib/n400/consultation.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/internal_app/src/lib/n400/consultation.ts apps/internal_app/__tests__/lib/n400/consultation.test.ts
git commit -m "feat(internal-app): consultation inbox rules (status/outcome, tabs, sort)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Server actions — `actions/consultations.ts`

**Files:**
- Create: `apps/internal_app/src/actions/consultations.ts`

**Interfaces:**
- Consumes: `ConsultationRow`, `validateConsultationUpdate` (Task 2); `isUuid` from `@/lib/n400/lead-prefill` (convert-to-client branch); column grant (Task 1).
- Produces:
  ```ts
  export async function getConsultations(): Promise<{
    rows: ConsultationRow[]; capped: boolean; convertedClientIds: Record<string, string>
  }>
  export async function updateConsultation(id: string, formData: FormData):
    Promise<{ ok: true } | { ok: false; error: string }>
  ```
  `formData` fields: `status`, `outcome` (may be empty), `note`, `outcome_note`.

No server-action test harness exists in this repo; behaviour is pinned by Task 1's probe (DB) and Task 2's tests (rules). Verify with `tsc` + suite.

- [ ] **Step 1: Write the file**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/n400/lead-prefill'
import { validateConsultationUpdate, type ConsultationRow } from '@/lib/n400/consultation'

const INBOX_LIMIT = 500

const COLUMNS =
  'id, user_id, name, phone, preferred_time, topic, source_cta, status, outcome, outcome_note, note, created_at, updated_at'

/**
 * The most recent requests across every tab — the page partitions them with
 * inboxTab(), so the tab rules live in one (tested) place, not in SQL too.
 */
export async function getConsultations(): Promise<{
  rows: ConsultationRow[]
  capped: boolean
  convertedClientIds: Record<string, string>
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('n400_consultation_requests')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(INBOX_LIMIT)
  if (error) throw error
  const rows = (data ?? []) as unknown as ConsultationRow[]

  const convertedClientIds: Record<string, string> = {}
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  if (userIds.length > 0) {
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, source_lead_id')
      .in('source_lead_id', userIds)
    if (clientsError) throw clientsError
    for (const c of clients ?? []) {
      if (c.source_lead_id) convertedClientIds[c.source_lead_id as string] = c.id as string
    }
  }

  return { rows, capped: rows.length === INBOX_LIMIT, convertedClientIds }
}

const textOrNull = (v: FormDataEntryValue | null): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s.length > 0 ? s : null
}

/**
 * Move one request along the pipeline. Only the five staff columns are sent;
 * the column grant (n400_40) would refuse anything else anyway.
 */
export async function updateConsultation(
  id: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(id)) return { ok: false, error: 'Unknown request' }

  const checked = validateConsultationUpdate({
    status: String(formData.get('status') ?? ''),
    outcome: textOrNull(formData.get('outcome')),
  })
  if (!checked.ok) return checked

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('n400_consultation_requests')
    .update({
      status: checked.value.status,
      outcome: checked.value.outcome,
      // An outcome note without an outcome is meaningless — drop it with the outcome.
      outcome_note: checked.value.outcome ? textOrNull(formData.get('outcome_note')) : null,
      note: textOrNull(formData.get('note')),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('user_id')
    .maybeSingle()
  if (error) return { ok: false, error: 'Could not save — try again' }
  if (!data) return { ok: false, error: 'Request not found or not allowed' }

  revalidatePath('/consultations')
  revalidatePath(`/leads/${data.user_id}`)
  return { ok: true }
}
```

- [ ] **Step 2: Verify**

Run: `cd apps/internal_app && npx tsc --noEmit && npx eslint src/actions/consultations.ts && npx jest`
Expected: all exit 0 / pass.

- [ ] **Step 3: Commit**

```bash
git add apps/internal_app/src/actions/consultations.ts
git commit -m "feat(internal-app): consultation inbox read + update actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: UI — `/consultations` page, request card, nav, lead link

**Files:**
- Create: `apps/internal_app/src/components/consultations/ConsultationCard.tsx`
- Create: `apps/internal_app/src/app/(app)/consultations/page.tsx`
- Modify: `apps/internal_app/src/app/(app)/layout.tsx` (`NAV_ITEMS`)
- Modify: `apps/internal_app/src/components/leads/LeadSummaryPanel.tsx` (Consultation card)

**Interfaces:**
- Consumes: `getConsultations`, `updateConsultation` (Task 3); `inboxTab`, `sortForTab`, `daysSince`, `topicLabel`, `STATUS_LABELS`, `OUTCOME_LABELS`, `CONSULTATION_STATUSES`, `CONSULTATION_OUTCOMES`, `INBOX_TABS`, `ConsultationRow`, `InboxTab` (Task 2).

Before writing the page, read `node_modules/next/dist/docs/01-app` on `searchParams` (a Promise in this version; `leads/page.tsx` already uses it).

- [ ] **Step 1: Request card (client component)**

```tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateConsultation } from '@/actions/consultations'
import {
  CONSULTATION_OUTCOMES,
  CONSULTATION_STATUSES,
  OUTCOME_LABELS,
  STATUS_LABELS,
  daysSince,
  topicLabel,
  type ConsultationOutcome,
  type ConsultationRow,
  type ConsultationStatus,
} from '@/lib/n400/consultation'

const fieldClass =
  'w-full px-3 py-2 bg-[#f7f9ff] border border-[#bcc9ca]/30 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 disabled:opacity-50'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ConsultationCard({
  row,
  clientId,
  showAge,
}: {
  row: ConsultationRow
  /** Set when this lead has already been converted. */
  clientId: string | null
  /** Follow-up tab: show how long the request has gone untouched. */
  showAge: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState(row.status)
  const [outcome, setOutcome] = useState(row.outcome ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const result = await updateConsultation(row.id, new FormData(e.currentTarget))
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  const isDone = status === 'done'
  const needsOutcome = row.status === 'done' && !row.outcome

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl p-5 space-y-4"
      style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/leads/${row.user_id}`}
            className="text-sm font-semibold text-slate-800 hover:underline"
          >
            {row.name || 'Unnamed'}
          </Link>
          <p className="text-xs text-slate-500 mt-0.5">
            {row.phone ? (
              <a href={`tel:${row.phone}`} className="text-[#006970] font-semibold">
                {row.phone}
              </a>
            ) : (
              'No phone'
            )}
            {' · '}
            {topicLabel(row.topic)}
            {row.preferred_time ? ` · prefers ${row.preferred_time}` : ''}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Requested {formatDate(row.created_at)}
            {showAge && ` · updated ${daysSince(row.updated_at)} days ago`}
            {needsOutcome && (
              <span className="ml-1 font-semibold text-amber-700">· needs outcome</span>
            )}
          </p>
        </div>
        {row.outcome === 'won' &&
          (clientId ? (
            <Link
              href={`/clients/${clientId}`}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#006970] border border-[#3AAFB9]/40"
            >
              <span className="material-symbols-outlined text-sm">badge</span>
              View client
            </Link>
          ) : (
            <Link
              href={`/clients/new?fromLead=${row.user_id}`}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: '#3AAFB9' }}
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Convert to Client
            </Link>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Status
          <select
            name="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              if (e.target.value !== 'done') setOutcome('')
            }}
            className={`${fieldClass} mt-1 normal-case tracking-normal`}
          >
            {CONSULTATION_STATUSES.map((s: ConsultationStatus) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Outcome {!isDone && <span className="normal-case">(after Done)</span>}
          <select
            name="outcome"
            value={outcome}
            disabled={!isDone}
            onChange={(e) => setOutcome(e.target.value)}
            className={`${fieldClass} mt-1 normal-case tracking-normal`}
          >
            <option value="">—</option>
            {CONSULTATION_OUTCOMES.map((o: ConsultationOutcome) => (
              <option key={o} value={o}>
                {OUTCOME_LABELS[o]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <textarea
        name="note"
        defaultValue={row.note ?? ''}
        rows={2}
        placeholder="Note (what was discussed, when to call back…)"
        className={fieldClass}
      />
      {isDone && outcome && (
        <textarea
          name="outcome_note"
          defaultValue={row.outcome_note ?? ''}
          rows={2}
          placeholder="Outcome note"
          className={fieldClass}
        />
      )}

      <div className="flex items-center justify-end gap-3">
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: '#3AAFB9' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
```

Note: a disabled `<select>` is not posted, so `outcome` is absent when status ≠ done — `textOrNull(null)` → null, which is what Task 2's rule wants.

- [ ] **Step 2: Page**

```tsx
import Link from 'next/link'
import { getConsultations } from '@/actions/consultations'
import ConsultationCard from '@/components/consultations/ConsultationCard'
import { INBOX_TABS, inboxTab, sortForTab, type InboxTab } from '@/lib/n400/consultation'

export const dynamic = 'force-dynamic'

const TAB_LABELS: Record<InboxTab, string> = {
  open: 'Open',
  follow_up: 'Follow-up',
  closed: 'Closed',
}

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab: InboxTab = INBOX_TABS.includes(params.tab as InboxTab)
    ? (params.tab as InboxTab)
    : 'open'

  const { rows, capped, convertedClientIds } = await getConsultations()
  const byTab: Record<InboxTab, typeof rows> = { open: [], follow_up: [], closed: [] }
  for (const row of rows) byTab[inboxTab(row)].push(row)
  const waiting = rows.filter((r) => r.status === 'new').length
  const visible = sortForTab(byTab[tab], tab)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Consultations</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {waiting === 0
            ? 'Nobody waiting for a call'
            : `${waiting} waiting for a call`}
          {capped && ' · showing the 500 most recent requests'}
        </p>
      </div>

      <div className="flex gap-2">
        {INBOX_TABS.map((t) => (
          <Link
            key={t}
            href={t === 'open' ? '/consultations' : `/consultations?tab=${t}`}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              t === tab
                ? 'bg-[rgba(58,175,185,0.12)] text-[#006970]'
                : 'text-slate-500 hover:bg-[#f1f4f9]'
            }`}
          >
            {TAB_LABELS[t]} · {byTab[t].length}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <div
          className="bg-white rounded-xl p-12 text-center"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <span className="material-symbols-outlined text-4xl text-slate-200">support_agent</span>
          <p className="mt-3 text-slate-500 font-medium">No {TAB_LABELS[tab].toLowerCase()} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((row) => (
            <ConsultationCard
              key={row.id}
              row={row}
              clientId={convertedClientIds[row.user_id] ?? null}
              showAge={tab === 'follow_up'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Nav item**

In `src/app/(app)/layout.tsx`, in `NAV_ITEMS` after the Leads line add:

```ts
  { href: '/consultations', label: 'Consultations', icon: 'support_agent' },
```

(Staff see it: the existing filter only hides `/jobs`.)

- [ ] **Step 4: Lead panel link**

In `src/components/leads/LeadSummaryPanel.tsx` add `import Link from 'next/link'` at the top, and replace

```tsx
      <Card title="Consultation">
        <Row label="Requested" value={formatDate(lead.consultation_requested_at)} />
        <Row label="Booked" value={formatDate(lead.consultation_booked_at)} />
      </Card>
```

with

```tsx
      <Card title="Consultation">
        <Row label="Requested" value={formatDate(lead.consultation_requested_at)} />
        <Row label="Booked" value={formatDate(lead.consultation_booked_at)} />
        {lead.consultation_requested_at && (
          <Link
            href="/consultations"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#006970] hover:underline mt-2"
          >
            Open in inbox
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        )}
      </Card>
```

- [ ] **Step 5: Verify**

Run: `cd apps/internal_app && npx tsc --noEmit && npx eslint src/components/consultations "src/app/(app)/consultations" "src/app/(app)/layout.tsx" src/components/leads/LeadSummaryPanel.tsx && npx jest`
Expected: exit 0 / pass (no new lint errors; `layout.tsx` pre-existing issues, if any, unchanged).

- [ ] **Step 6: Commit**

```bash
git add apps/internal_app/src/components/consultations "apps/internal_app/src/app/(app)/consultations" "apps/internal_app/src/app/(app)/layout.tsx" apps/internal_app/src/components/leads/LeadSummaryPanel.tsx
git commit -m "feat(internal-app): Consultations inbox page

Open / Follow-up / Closed tabs, per-request status + outcome + notes, Convert
to Client on a win, nav entry, and an inbox link from the lead panel.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Build, owner smoke test, ROADMAP

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Production build**

Run: `cd apps/internal_app && npx next build`
Expected: success; route list includes `/consultations`.

- [ ] **Step 2: Owner smoke test (owner acts, controller waits)**

Controller starts `npx next dev -p 3005` in `apps/internal_app` (background). Owner:
1. On N400Ready (prod or local website) signed in as **Test User**, book a consultation (any topic/time, phone `555-0100`).
2. internal_app → **Consultations**: the request is in **Open**, header says "1 waiting for a call".
3. Status Contacted → Save; Booked → Save (Test User's lead page now shows a Booked date and higher score); Done → Outcome **Won** + outcome note → Save → card moves to **Closed** with **Convert to Client**.
4. Set Status back to Contacted → Save: outcome cleared, card back in Open.

Controller then cleans up (MCP `execute_sql`; if it errors "Invalid or expired requestState", hand the SQL to the owner):

```sql
select id, status, outcome from n400_consultation_requests
where user_id='752015e5-1118-49d7-b9bf-b690eda90a2b';
delete from n400_consultation_requests where user_id='752015e5-1118-49d7-b9bf-b690eda90a2b';
```

(The DELETE runs as the SQL editor/service role — there is no app DELETE policy, by design.)

- [ ] **Step 3: ROADMAP**

In `docs/ROADMAP.md` replace

```
còn: hộp yêu cầu tư vấn, báo Sales-Ready.
```

with

```
~~hộp yêu cầu tư vấn~~ ✅ 2026-10-17 (`/consultations`, migration n400_40 staff update + column grant); còn: báo Sales-Ready.
```

and replace `v2: Convert to Client ✅ 2026-10-17; hộp yêu cầu tư vấn + Sales-Ready còn mở` with `v2: Convert to Client + Consultation inbox ✅ 2026-10-17; Sales-Ready còn mở`.

- [ ] **Step 4: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: ROADMAP — G4 v2 Consultation inbox shipped

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
