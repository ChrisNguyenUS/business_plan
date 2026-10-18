# G4 v2 — Convert to Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff turn an N400Ready lead into a `clients` row from the lead page, with the form prefilled, one client per lead, and lead ↔ client linked both ways.

**Architecture:** One nullable column `clients.source_lead_id` (FK `profiles`, partial unique index) records the source; it grants no access. `/clients/new?fromLead=<id>` reuses `ClientForm` with prefilled `defaultValues` and a hidden `source_lead_id`. A pure `buildLeadPrefill` shapes lead data; server actions do all Supabase access; pages only render.

**Tech Stack:** Next.js (App Router, the version in `apps/internal_app` — read `node_modules/next/dist/docs/` before touching pages, per `apps/internal_app/AGENTS.md`), Supabase (Postgres + RLS via `@supabase/ssr`), Jest + ts-jest via `next/jest`, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-17-g4-convert-to-client-design.md`

## Global Constraints

- All edits inside `apps/internal_app/` (plus this plan, the spec and `docs/ROADMAP.md`). Do **not** touch `apps/website/`.
- **Never** write `clients.user_id`. `source_lead_id` is a label only.
- No new or changed RLS policy. No change to `n400_leads_view`.
- Every query scoped to a lead uses an explicit `.eq('user_id' | 'source_lead_id', …)` — staff read policies are not scope filters.
- Migration file: `apps/internal_app/supabase/migrations/015_clients_source_lead.sql`. Before writing it, run `ls apps/internal_app/supabase/migrations` — if `015_` is taken, use the next free number and update every reference in this plan.
- UI copy is English (internal app convention). Status never by colour alone — icon + text.
- Unique index name is exactly `clients_source_lead_id_key` (the action matches on it).
- One logical change per commit; commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run from `apps/internal_app`: tests `npx jest`, types `npx tsc --noEmit`, lint `npx eslint <paths>`.

## Review Focus

1. `?fromLead=` with a non-UUID or unknown id → 404 page, not a 500 (Postgres would raise 22P02 on a bad uuid). Pinned in Task 4 via `isUuid` test.
2. Lead whose `profiles` has no first/last and only `full_name` (Google sign-ups) → name split sensibly; all-null → blank fields, form still submits once staff types a name. Pinned in Task 2.
3. Two staff convert the same lead, or one double-submits / goes Back and resubmits → no second client; the second submit lands on the existing client. Pinned in Task 1 probe + Task 3 code path.
4. Converting a non-client account (staff/admin row in `profiles`) → 404, since leads are `role = 'client'` only. Covered by `getLeadPrefill` reading `n400_leads_view` with `.eq('role','client')` (Task 3).
5. A lead converted, then their account deleted → client survives, Source line simply disappears (`ON DELETE SET NULL`). Pinned in Task 1 probe.

---

### Task 1: Migration 015 — `clients.source_lead_id`

**Files:**
- Create: `apps/internal_app/supabase/migrations/015_clients_source_lead.sql`

**Interfaces:**
- Produces: column `public.clients.source_lead_id uuid null` → `profiles(id)` `ON DELETE SET NULL`; unique partial index `clients_source_lead_id_key`.

- [ ] **Step 1: Check the number is free**

Run: `ls apps/internal_app/supabase/migrations`
Expected: highest is `014_advisor_cleanup.sql` (untracked, not ours — leave it). Use `015`.

- [ ] **Step 2: Write the migration**

```sql
-- 015_clients_source_lead.sql
-- G4 v2 Convert to Client: remember which N400Ready lead a client came from.
--
-- source_lead_id is a LABEL, not an access grant. It deliberately is NOT
-- clients.user_id: the "clients read" policy lets user_id = auth.uid() read
-- the whole row (ssn included), and portal access is only ever granted via
-- invite token (business progress tracker slice 3). No policy changes here.

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_lead_id uuid
  REFERENCES public.profiles(id) ON DELETE SET NULL;

-- One client per lead, enforced in the database so two staff converting the
-- same lead at once cannot both succeed. Also serves the FK lookup.
-- The name is matched by actions/clients.ts — do not rename.
CREATE UNIQUE INDEX IF NOT EXISTS clients_source_lead_id_key
  ON public.clients (source_lead_id)
  WHERE source_lead_id IS NOT NULL;

COMMIT;
```

- [ ] **Step 3: Apply to prod (controller only, not a subagent)**

Ask the owner first ("apply migration 015 to prod?"). On yes, apply with the Supabase MCP `apply_migration`, name `clients_source_lead`, body = the file without `BEGIN;`/`COMMIT;`. If the MCP call is declined, give the owner the file to run in the SQL editor.

- [ ] **Step 4: Verify the schema**

Run (MCP `execute_sql`):

```sql
select column_name, is_nullable, data_type from information_schema.columns
where table_name='clients' and column_name='source_lead_id';
select indexdef from pg_indexes where indexname='clients_source_lead_id_key';
select confdeltype from pg_constraint
where conrelid='public.clients'::regclass and contype='f'
  and conkey = array[(select attnum from pg_attribute where attrelid='public.clients'::regclass and attname='source_lead_id')];
```

Expected: one row `source_lead_id | YES | uuid`; indexdef contains `UNIQUE` and `WHERE (source_lead_id IS NOT NULL)`; `confdeltype = n` (SET NULL).

- [ ] **Step 5: Zero-residue access probe (rolled back)**

Lead under test: Test User `752015e5-1118-49d7-b9bf-b690eda90a2b`. Admin: `fb1d074c-d74a-4d78-ba0e-f0c6e0c61c66`.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"fb1d074c-d74a-4d78-ba0e-f0c6e0c61c66","role":"authenticated"}',true);
insert into clients (first_name,last_name,date_of_birth,source_lead_id)
  values ('Probe','One','1990-01-01','752015e5-1118-49d7-b9bf-b690eda90a2b');
select 'staff insert ok' as step;
-- second client for the same lead must fail with 23505
do $$ begin
  insert into clients (first_name,last_name,date_of_birth,source_lead_id)
    values ('Probe','Two','1990-01-01','752015e5-1118-49d7-b9bf-b690eda90a2b');
  raise exception 'DUPLICATE ALLOWED';
exception when unique_violation then raise notice 'dup blocked ok';
end $$;
-- the lead's own login must not see the client row
select set_config('request.jwt.claims','{"sub":"752015e5-1118-49d7-b9bf-b690eda90a2b","role":"authenticated"}',true);
select count(*) as lead_can_see from clients where source_lead_id='752015e5-1118-49d7-b9bf-b690eda90a2b';
rollback;
select count(*) as residue from clients where first_name='Probe';
```

Expected: no `DUPLICATE ALLOWED` error; `lead_can_see = 0`; `residue = 0`.

- [ ] **Step 6: Commit**

```bash
git add apps/internal_app/supabase/migrations/015_clients_source_lead.sql
git commit -m "feat(db): clients.source_lead_id — remember the N400Ready lead a client came from

Label only, never clients.user_id (that grants the login the whole row incl.
ssn). Partial unique index = one client per lead. Applied to prod; probe:
staff insert ok, duplicate 23505, lead cannot read the row, zero residue.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pure prefill — `buildLeadPrefill`

**Files:**
- Create: `apps/internal_app/src/lib/n400/lead-prefill.ts`
- Test: `apps/internal_app/__tests__/lib/n400/lead-prefill.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface LeadProfileNames {
    first_name: string | null; middle_name: string | null; last_name: string | null
    full_name: string | null; email: string | null
  }
  export interface LeadPrefill {
    first_name: string; middle_name: string; last_name: string
    email: string; phone: string
    address: { street: string; city: string; state: string; zip: string }
  }
  export function buildLeadPrefill(
    profile: LeadProfileNames, phone: string | null, addressPayload: Record<string, unknown> | null,
  ): LeadPrefill
  export function isUuid(value: string | undefined | null): value is string
  ```
  `LeadPrefill` keys match `ClientForm`'s `defaultValues` (`d.first_name`, `d.address.city`, …).

- [ ] **Step 1: Write the failing test**

```ts
import { buildLeadPrefill, isUuid } from '@/lib/n400/lead-prefill'

const names = (p: Partial<Parameters<typeof buildLeadPrefill>[0]>) => ({
  first_name: null, middle_name: null, last_name: null, full_name: null, email: null, ...p,
})

describe('buildLeadPrefill', () => {
  it('uses the split name columns when present', () => {
    const v = buildLeadPrefill(
      names({ first_name: 'Vu', middle_name: 'Van', last_name: 'Tran', full_name: 'ignored', email: 'v@x.com' }),
      '555-0100',
      { city: 'Sunnyside', state: 'NY' },
    )
    expect(v).toEqual({
      first_name: 'Vu', middle_name: 'Van', last_name: 'Tran', email: 'v@x.com', phone: '555-0100',
      address: { street: '', city: 'Sunnyside', state: 'NY', zip: '' },
    })
  })

  it('splits full_name when the columns are empty (Google sign-ups)', () => {
    expect(buildLeadPrefill(names({ full_name: 'Vu Tran' }), null, null)).toMatchObject({
      first_name: 'Vu', middle_name: '', last_name: 'Tran',
    })
    expect(buildLeadPrefill(names({ full_name: '  Nguyen   Van  Anh ' }), null, null)).toMatchObject({
      first_name: 'Nguyen', middle_name: 'Van', last_name: 'Anh',
    })
    expect(buildLeadPrefill(names({ full_name: 'Cher' }), null, null)).toMatchObject({
      first_name: 'Cher', last_name: '',
    })
  })

  it('leaves everything blank rather than guessing', () => {
    expect(buildLeadPrefill(names({}), null, null)).toEqual({
      first_name: '', middle_name: '', last_name: '', email: '', phone: '',
      address: { street: '', city: '', state: '', zip: '' },
    })
  })

  it('ignores wrong-typed address payload fields', () => {
    expect(buildLeadPrefill(names({}), null, { city: 42, state: 'TX' }).address).toEqual({
      street: '', city: '', state: 'TX', zip: '',
    })
  })
})

describe('isUuid', () => {
  it('accepts a uuid and rejects anything else', () => {
    expect(isUuid('752015e5-1118-49d7-b9bf-b690eda90a2b')).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('')).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/internal_app && npx jest __tests__/lib/n400/lead-prefill.test.ts`
Expected: FAIL — `Cannot find module '@/lib/n400/lead-prefill'`.

- [ ] **Step 3: Implement**

```ts
// Shape an N400Ready lead into ClientForm defaultValues for Convert to Client.
// Pure — actions/leads.ts loads the rows. Blank beats a wrong guess: staff
// review every field before saving.

export interface LeadProfileNames {
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
}

export interface LeadPrefill {
  first_name: string
  middle_name: string
  last_name: string
  email: string
  phone: string
  address: { street: string; city: string; state: string; zip: string }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Guard before a value reaches a uuid column — Postgres raises 22P02 otherwise. */
export function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID.test(value)
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

function splitFullName(full: string): { first: string; middle: string; last: string } {
  const parts = full.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: '', middle: '', last: '' }
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' }
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(' '),
    last: parts[parts.length - 1],
  }
}

export function buildLeadPrefill(
  profile: LeadProfileNames,
  phone: string | null,
  addressPayload: Record<string, unknown> | null,
): LeadPrefill {
  const hasSplit = text(profile.first_name) !== '' || text(profile.last_name) !== ''
  const name = hasSplit
    ? { first: text(profile.first_name), middle: text(profile.middle_name), last: text(profile.last_name) }
    : splitFullName(text(profile.full_name))

  return {
    first_name: name.first,
    middle_name: name.middle,
    last_name: name.last,
    email: text(profile.email),
    phone: text(phone),
    address: {
      street: '',
      city: text(addressPayload?.['city']),
      state: text(addressPayload?.['state']),
      zip: '',
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/internal_app && npx jest __tests__/lib/n400/lead-prefill.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/internal_app/src/lib/n400/lead-prefill.ts apps/internal_app/__tests__/lib/n400/lead-prefill.test.ts
git commit -m "feat(internal-app): pure lead → client form prefill

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Data access — lead conversion reads + `createClient_` writes `source_lead_id`

**Files:**
- Modify: `apps/internal_app/src/actions/leads.ts` (append two actions; extend `getLeads` return)
- Modify: `apps/internal_app/src/actions/clients.ts` (`createClient_`)

**Interfaces:**
- Consumes: `buildLeadPrefill`, `LeadPrefill`, `LeadProfileNames`, `isUuid` (Task 2); column + index (Task 1).
- Produces:
  ```ts
  // actions/leads.ts
  export async function getLeadConversion(userId: string): Promise<string | null> // client id
  export async function getLeadPrefill(userId: string): Promise<{ displayName: string; values: LeadPrefill } | null>
  // getLeads now returns { leads, total, page, pageSize, convertedClientIds: Record<string, string> }  (lead user_id → client id)
  // actions/clients.ts
  export async function createClient_(formData: FormData): Promise<string> // unchanged signature; on duplicate lead returns the EXISTING client id
  ```

There is no unit-test harness for server actions in this repo (ROADMAP: "chưa có test cho server actions"); Task 1's probe pins the DB behaviour, Task 6 the end-to-end path. This task is verified by `tsc` + the existing suite.

- [ ] **Step 1: Add the imports and two actions to `actions/leads.ts`**

Add to the import block at the top:

```ts
import { buildLeadPrefill, isUuid, type LeadPrefill } from '@/lib/n400/lead-prefill'
```

Append at the end of the file:

```ts
/** The client this lead was converted into, or null. */
export async function getLeadConversion(userId: string): Promise<string | null> {
  if (!isUuid(userId)) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('source_lead_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data?.id as string | undefined) ?? null
}

/**
 * Everything Convert to Client can prefill, or null when the id is not a
 * client-role lead staff can see (bad id, staff/admin account, RLS).
 */
export async function getLeadPrefill(
  userId: string,
): Promise<{ displayName: string; values: LeadPrefill } | null> {
  if (!isUuid(userId)) return null
  const supabase = await createClient()

  // n400_leads_view carries role, so a staff/admin profile is never converted.
  const { data: lead, error: leadError } = await supabase
    .from('n400_leads_view')
    .select('user_id, full_name, email')
    .eq('role', 'client')
    .eq('user_id', userId)
    .maybeSingle()
  if (leadError) throw leadError
  if (!lead) return null

  const [profile, consult, address] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, middle_name, last_name, full_name, email')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('n400_consultation_requests')
      .select('phone')
      .eq('user_id', userId)
      .not('phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('n400_growth_events')
      .select('payload')
      .eq('user_id', userId)
      .eq('event_type', 'address_entered')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (profile.error) throw profile.error
  if (consult.error) throw consult.error
  if (address.error) throw address.error

  const names = profile.data ?? {
    first_name: null,
    middle_name: null,
    last_name: null,
    full_name: lead.full_name,
    email: lead.email,
  }
  return {
    displayName: (lead.full_name as string | null) || (lead.email as string | null) || 'this lead',
    values: buildLeadPrefill(
      names,
      (consult.data?.phone as string | null) ?? null,
      (address.data?.payload as Record<string, unknown> | null) ?? null,
    ),
  }
}
```

- [ ] **Step 2: Extend `getLeads` with the converted map**

In `getLeads`, replace the final `return { … }` block (after `if (error) throw error`) with:

```ts
  const leads = (data ?? []) as unknown as LeadRow[]

  // Which of this page's leads are already clients. A second small query
  // instead of joining clients into n400_leads_view keeps the view unchanged.
  const convertedClientIds: Record<string, string> = {}
  if (leads.length > 0) {
    const { data: converted, error: convertedError } = await supabase
      .from('clients')
      .select('id, source_lead_id')
      .in('source_lead_id', leads.map((l) => l.user_id))
    if (convertedError) throw convertedError
    for (const c of converted ?? []) {
      if (c.source_lead_id) convertedClientIds[c.source_lead_id as string] = c.id as string
    }
  }

  return {
    leads,
    total: count ?? 0,
    page,
    pageSize: LEADS_PAGE_SIZE,
    convertedClientIds,
  }
```

and update the declared return type of `getLeads` to:

```ts
}): Promise<{
  leads: LeadRow[]
  total: number
  page: number
  pageSize: number
  convertedClientIds: Record<string, string>
}> {
```

- [ ] **Step 3: Make `createClient_` record the lead and survive a duplicate**

In `actions/clients.ts`, add at the top with the other imports:

```ts
import { isUuid } from '@/lib/n400/lead-prefill'
```

In `createClient_`, add as the last property of `payload` (after `notes`):

```ts
    // Set only by Convert to Client (hidden field). A label, never user_id.
    source_lead_id: isUuid(formData.get('source_lead_id') as string | null)
      ? (formData.get('source_lead_id') as string)
      : null,
```

Replace

```ts
  if (error) throw error
  revalidatePath('/clients')
  return data.id as string
```

with

```ts
  if (error) {
    // Lead already converted (double submit, Back + resubmit, two staff at
    // once). Land on the existing client instead of failing: Next hides
    // thrown messages in production, so an error here would be unreadable.
    if (
      error.code === '23505' &&
      error.message.includes('clients_source_lead_id_key') &&
      payload.source_lead_id
    ) {
      const { data: existing, error: lookupError } = await supabase
        .from('clients')
        .select('id')
        .eq('source_lead_id', payload.source_lead_id)
        .single()
      if (lookupError) throw lookupError
      return existing.id as string
    }
    throw error
  }
  revalidatePath('/clients')
  if (payload.source_lead_id) {
    revalidatePath('/leads')
    revalidatePath(`/leads/${payload.source_lead_id}`)
  }
  return data.id as string
```

- [ ] **Step 4: Type-check and run the suite**

Run: `cd apps/internal_app && npx tsc --noEmit && npx jest`
Expected: tsc exit 0; all suites pass (count = previous + 0 for this task).

- [ ] **Step 5: Commit**

```bash
git add apps/internal_app/src/actions/leads.ts apps/internal_app/src/actions/clients.ts
git commit -m "feat(internal-app): lead conversion reads and source_lead_id on client create

Duplicate conversion resolves to the existing client instead of throwing.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Convert flow — button, prefilled New Client page, hidden field

**Files:**
- Modify: `apps/internal_app/src/components/clients/ClientForm.tsx` (new optional prop)
- Modify: `apps/internal_app/src/app/(app)/clients/new/page.tsx`
- Modify: `apps/internal_app/src/app/(app)/leads/[userId]/page.tsx` (header button)

**Interfaces:**
- Consumes: `getLeadConversion`, `getLeadPrefill` (Task 3); `isUuid` (Task 2).
- Produces: route `/clients/new?fromLead=<uuid>`; `ClientForm` prop `sourceLeadId?: string`.

Before editing pages, read `apps/internal_app/node_modules/next/dist/docs/01-app` sections on `searchParams` and `redirect` (this Next version passes `searchParams` as a Promise — `leads/page.tsx` already does).

- [ ] **Step 1: `ClientForm` — accept and post `sourceLeadId`**

Change `Props` to:

```ts
interface Props {
  defaultValues?: Record<string, any>
  clientId?: string
  /** Convert to Client: posted as source_lead_id so the client remembers its lead. */
  sourceLeadId?: string
}
```

Change the signature to `export function ClientForm({ defaultValues, clientId, sourceLeadId }: Props) {` and add right after the opening `<form …>` tag:

```tsx
      {sourceLeadId && <input type="hidden" name="source_lead_id" value={sourceLeadId} />}
```

- [ ] **Step 2: `/clients/new` — handle `?fromLead=`**

Replace the whole file with:

```tsx
import { notFound, redirect } from 'next/navigation'
import { ClientForm } from '@/components/clients/ClientForm'
import { getLeadConversion, getLeadPrefill } from '@/actions/leads'

export const dynamic = 'force-dynamic'

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ fromLead?: string }>
}) {
  const { fromLead } = await searchParams

  let prefill: Awaited<ReturnType<typeof getLeadPrefill>> = null
  if (fromLead !== undefined) {
    // Already converted → go to that client instead of offering a duplicate.
    const existing = await getLeadConversion(fromLead)
    if (existing) redirect(`/clients/${existing}`)
    // Bad id, staff/admin account, or hidden by RLS.
    prefill = await getLeadPrefill(fromLead)
    if (!prefill) notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">New Client</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Create a client profile — enter once, reuse across all cases
        </p>
      </div>
      {prefill && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-[rgba(58,175,185,0.08)] text-sm text-[#006970]">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>
            Converting N400Ready lead <strong>{prefill.displayName}</strong> — check the details
            and enter date of birth to finish.
          </span>
        </div>
      )}
      <div
        className="bg-white rounded-xl p-8"
        style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
      >
        <ClientForm
          defaultValues={prefill?.values}
          sourceLeadId={prefill ? fromLead : undefined}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Lead page — Convert / View client button**

In `leads/[userId]/page.tsx`:

Add `getLeadConversion` to the `@/actions/leads` import.

Change the `Promise.all` to also fetch the conversion:

```ts
  const [timeline, weakSection, profiling, clientId] = await Promise.all([
    getLeadTimeline(userId),
    getLeadWeakSection(userId),
    getLeadProfiling(userId),
    getLeadConversion(userId),
  ])
```

Replace the header block — the `<div>` that contains the Back link, `<h2>` and email `<p>` — with:

```tsx
      <div className="flex items-end justify-between gap-4">
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
        {clientId ? (
          <Link
            href={`/clients/${clientId}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-[#006970] border border-[#3AAFB9]/40 hover:bg-[rgba(58,175,185,0.08)] transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-sm">badge</span>
            View client
          </Link>
        ) : (
          <Link
            href={`/clients/new?fromLead=${lead.user_id}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all shrink-0"
            style={{ backgroundColor: '#3AAFB9' }}
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Convert to Client
          </Link>
        )}
      </div>
```

- [ ] **Step 4: Verify**

Run: `cd apps/internal_app && npx tsc --noEmit && npx eslint src/components/clients/ClientForm.tsx "src/app/(app)/clients/new" "src/app/(app)/leads" && npx jest`
Expected: all exit 0 / pass. (ClientForm already has `any` lint warnings — no new ones.)

- [ ] **Step 5: Commit**

```bash
git add apps/internal_app/src/components/clients/ClientForm.tsx "apps/internal_app/src/app/(app)/clients/new/page.tsx" "apps/internal_app/src/app/(app)/leads/[userId]/page.tsx"
git commit -m "feat(internal-app): Convert to Client from the lead page

/clients/new?fromLead= prefills ClientForm and posts source_lead_id; an
already-converted lead redirects to its client; unknown/non-client ids 404.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Show the link — Client badge on the list, Source line on the client

**Files:**
- Modify: `apps/internal_app/src/app/(app)/leads/page.tsx`
- Modify: `apps/internal_app/src/app/(app)/clients/[id]/page.tsx`

**Interfaces:**
- Consumes: `getLeads(...).convertedClientIds` (Task 3); `client.source_lead_id` (Task 1 column, already in `select('*')`).

- [ ] **Step 1: Leads list badge**

In `leads/page.tsx`, change the destructure to `const { leads, total, page, convertedClientIds } = await getLeads({`.

Replace the name paragraph inside the row link:

```tsx
                        <p className="text-sm font-semibold text-slate-800">
                          {lead.full_name || 'Unnamed'}
                        </p>
```

with

```tsx
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          {lead.full_name || 'Unnamed'}
                          {convertedClientIds[lead.user_id] && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold bg-[rgba(58,175,185,0.1)] text-[#006970]">
                              <span className="material-symbols-outlined text-[12px]">badge</span>
                              Client
                            </span>
                          )}
                        </p>
```

- [ ] **Step 2: Client page Source line**

In `clients/[id]/page.tsx`, directly after the `{client.a_number && (…)}` block in the header, add:

```tsx
            {client.source_lead_id && (
              <Link
                href={`/leads/${client.source_lead_id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#006970] hover:underline mt-1"
              >
                <span className="material-symbols-outlined text-sm">trending_up</span>
                Source: N400Ready lead
              </Link>
            )}
```

- [ ] **Step 3: Verify**

Run: `cd apps/internal_app && npx tsc --noEmit && npx eslint "src/app/(app)/leads/page.tsx" "src/app/(app)/clients/[id]/page.tsx" && npx jest`
Expected: exit 0 / pass.

- [ ] **Step 4: Commit**

```bash
git add "apps/internal_app/src/app/(app)/leads/page.tsx" "apps/internal_app/src/app/(app)/clients/[id]/page.tsx"
git commit -m "feat(internal-app): Client badge on converted leads, Source link on the client

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Build, owner smoke test, ROADMAP

**Files:**
- Modify: `docs/ROADMAP.md` (G4 v2 line ~53 and Leads table row ~111)

- [ ] **Step 1: Production build**

Run: `cd apps/internal_app && npx next build`
Expected: build succeeds; route list includes `/clients/new` and `/leads/[userId]`.

- [ ] **Step 2: Owner smoke test (owner does this, controller waits)**

Ask the owner to run `npm run dev` in `apps/internal_app` (or use the Vercel preview) logged in as admin, then:
1. Leads → **Test User** → **Convert to Client**. Form shows the banner; name/email prefilled.
2. Enter any date of birth → Save → lands on the new client; header shows **Source: N400Ready lead** → link opens Test User's lead page, whose button now reads **View client**.
3. Leads list shows the **Client** badge next to Test User.
4. Browser Back to the form → Save again → lands on the **same** client (no second row).

Then the controller verifies and cleans up (MCP `execute_sql`, `DELETE` is allowed):

```sql
select id, first_name, last_name from clients where source_lead_id='752015e5-1118-49d7-b9bf-b690eda90a2b';
-- expect exactly 1 row; after owner OK:
delete from clients where source_lead_id='752015e5-1118-49d7-b9bf-b690eda90a2b';
```

- [ ] **Step 3: ROADMAP**

In `docs/ROADMAP.md` replace

```
- [ ] **Growth G4 v2** (`apps/internal_app/`): hộp yêu cầu tư vấn, Convert to Client, báo Sales-Ready.
```

with

```
- [ ] **Growth G4 v2** (`apps/internal_app/`): ~~Convert to Client~~ ✅ 2026-10-17 (migration 015 `clients.source_lead_id`, spec 2026-10-17-g4-convert-to-client-design.md); còn: hộp yêu cầu tư vấn, báo Sales-Ready.
```

and in the Leads table row change `v2 (hộp yêu cầu tư vấn, Convert to Client, Sales-Ready) còn mở` to `v2: Convert to Client ✅ 2026-10-17; hộp yêu cầu tư vấn + Sales-Ready còn mở`.

- [ ] **Step 4: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: ROADMAP — G4 v2 Convert to Client shipped

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
