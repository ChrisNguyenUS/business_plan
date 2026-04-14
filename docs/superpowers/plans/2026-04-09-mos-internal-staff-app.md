# MOS Internal Staff App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal web app for Manna One Solution staff to manage immigration client profiles, generate filing documents, and track USCIS case statuses.

**Architecture:** Next.js 14 App Router + Supabase (auth, PostgreSQL, storage) deployed on Vercel. Four phases: CRM → Case Management → Filing Assistant → Case Tracker. Each phase produces working, testable software.

**Tech Stack:** Next.js 14 (TypeScript, App Router), Tailwind CSS, Supabase, pdf-lib, Jest + Testing Library

---

## File Map

```
apps/internal_app/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # redirect to /dashboard
│   │   ├── (auth)/login/page.tsx
│   │   └── (app)/
│   │       ├── layout.tsx                    # protected layout + nav
│   │       ├── dashboard/page.tsx
│   │       ├── clients/
│   │       │   ├── page.tsx                  # list + search
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/
│   │       │       ├── page.tsx              # profile view
│   │       │       └── edit/page.tsx
│   │       ├── cases/
│   │       │   ├── page.tsx                  # all cases
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/
│   │       │       ├── page.tsx              # case overview
│   │       │       ├── documents/page.tsx
│   │       │       └── filing/[formId]/page.tsx   # copy-paste screen
│   │       └── tracker/page.tsx
│   ├── components/
│   │   ├── ui/                               # Button, Input, Badge, Card
│   │   ├── clients/
│   │   │   ├── ClientForm.tsx
│   │   │   └── ClientSearch.tsx
│   │   ├── cases/
│   │   │   ├── CaseForm.tsx
│   │   │   ├── DocumentChecklist.tsx
│   │   │   └── DocumentUpload.tsx
│   │   └── filing/
│   │       ├── CopyPasteScreen.tsx
│   │       └── CopyField.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                     # browser client
│   │   │   ├── server.ts                     # server client (SSR)
│   │   │   └── types.ts                      # generated DB types
│   │   ├── forms/
│   │   │   ├── index.ts                      # form registry
│   │   │   ├── types.ts                      # FormDefinition type
│   │   │   ├── n400.ts
│   │   │   ├── i485.ts
│   │   │   ├── i130.ts
│   │   │   ├── i765.ts
│   │   │   ├── i131.ts                       # mail form — PDF mapping
│   │   │   └── packages.ts                   # package templates
│   │   ├── pdf/
│   │   │   └── fill.ts                       # pdf-lib fill logic
│   │   └── uscis/
│   │       └── status.ts                     # USCIS status fetch + parse
│   ├── actions/
│   │   ├── clients.ts                        # server actions
│   │   ├── cases.ts
│   │   ├── documents.ts
│   │   └── tracker.ts
│   └── types/index.ts                        # shared app types
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql
│       └── 002_rls.sql
├── public/forms/                             # USCIS PDF templates (I-131, I-864)
└── __tests__/
    ├── lib/forms/n400.test.ts
    ├── lib/uscis/status.test.ts
    └── components/filing/CopyField.test.tsx
```

---

## Task 1: Scaffold project + install dependencies

**Files:**
- Create: `apps/internal_app/` (entire project)
- Create: `src/types/index.ts`
- Create: `.env.local`

- [ ] **Scaffold Next.js app**

```bash
npx create-next-app@latest apps/internal_app \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-git
cd apps/internal_app
```

- [ ] **Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr pdf-lib jszip
npm install -D jest jest-environment-jsdom \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event ts-jest
```

- [ ] **Create Jest config** at `jest.config.ts`

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

- [ ] **Create `jest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Create shared types** at `src/types/index.ts`

```typescript
export type CaseStatus =
  | 'documents_pending'
  | 'ready_to_file'
  | 'submitted'
  | 'receipt_received'
  | 'in_progress'
  | 'rfe_issued'
  | 'approved'
  | 'denied'

export type CaseType = 'simple' | 'package'

export type PackageType =
  | 'marriage_greencard'
  | 'parent_greencard'
  | null

export type FormType =
  | 'n400' | 'i485' | 'i130' | 'i765'
  | 'i131' | 'i864' | 'i693'

export type FilingMode = 'online' | 'mail'

export type ServiceTag =
  | 'immigration' | 'tax' | 'insurance' | 'ai'

export type UserRole = 'admin' | 'staff'
```

- [ ] **Create `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

- [ ] **Commit**

```bash
git init && git add -A
git commit -m "feat: scaffold Next.js app with dependencies"
```

---

## Task 2: Supabase project + database schema

**Files:**
- Create: `packages/database/supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_rls.sql`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

- [ ] **Create Supabase project** at supabase.com → new project → copy URL + keys into `.env.local`

- [ ] **Write migration** at `packages/database/supabase/migrations/001_schema.sql`

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clients
create table clients (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  first_name text not null,
  middle_name text,
  last_name text not null,
  other_names text[] default '{}',
  date_of_birth date not null,
  country_of_birth text,
  a_number text,
  ssn text,
  address jsonb default '{}',
  mailing_address jsonb default '{}',
  phone text,
  email text,
  marital_status text,
  spouse_id uuid references clients(id),
  children jsonb default '[]',
  immigration_history jsonb default '[]',
  travel_history jsonb default '[]',
  employment_history jsonb default '[]',
  services_used text[] default '{}',
  notes text
);

-- Cases
create table cases (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  case_type text not null check (case_type in ('simple', 'package')),
  package_type text check (package_type in ('marriage_greencard', 'parent_greencard')),
  primary_client_id uuid not null references clients(id),
  secondary_client_id uuid references clients(id),
  status text not null default 'documents_pending'
    check (status in (
      'documents_pending','ready_to_file','submitted',
      'receipt_received','in_progress','rfe_issued','approved','denied'
    )),
  notes text
);

-- Forms within a case
create table case_forms (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid not null references cases(id) on delete cascade,
  form_type text not null,
  filing_mode text not null check (filing_mode in ('online', 'mail')),
  receipt_number text,
  current_uscis_status text,
  last_checked_at timestamptz
);

-- Documents
create table documents (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  case_id uuid not null references cases(id) on delete cascade,
  case_form_id uuid references case_forms(id),
  label text not null,
  required boolean default true,
  received boolean default false,
  file_path text,
  notes text
);

-- USCIS status history
create table status_history (
  id uuid primary key default uuid_generate_v4(),
  checked_at timestamptz default now(),
  case_form_id uuid not null references case_forms(id) on delete cascade,
  status text not null,
  description text,
  source text default 'uscis_api'
);
```

- [ ] **Write RLS policies** at `supabase/migrations/002_rls.sql`

```sql
-- Enable RLS
alter table clients enable row level security;
alter table cases enable row level security;
alter table case_forms enable row level security;
alter table documents enable row level security;
alter table status_history enable row level security;

-- Allow authenticated users (staff) full access to all tables
create policy "staff_all" on clients for all using (auth.role() = 'authenticated');
create policy "staff_all" on cases for all using (auth.role() = 'authenticated');
create policy "staff_all" on case_forms for all using (auth.role() = 'authenticated');
create policy "staff_all" on documents for all using (auth.role() = 'authenticated');
create policy "staff_all" on status_history for all using (auth.role() = 'authenticated');
```

- [ ] **Run migrations** in Supabase SQL editor (paste and run each file)

- [ ] **Create browser Supabase client** at `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Create server Supabase client** at `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add Supabase schema and client utilities"
```

---

## Task 3: Auth — login page + protected middleware

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/middleware.ts`
- Create: `src/app/(app)/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Create login page** at `src/app/(auth)/login/page.tsx`

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-xl w-full max-w-sm space-y-4">
        <h1 className="text-white text-2xl font-bold">MOS Internal</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
          required
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
          required
        />
        <button type="submit"
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">
          Sign In
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Create middleware** at `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')

  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Create protected app layout** at `src/app/(app)/layout.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-blue-400">MOS Internal</span>
        <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white">Dashboard</Link>
        <Link href="/clients" className="text-sm text-gray-300 hover:text-white">Clients</Link>
        <Link href="/cases" className="text-sm text-gray-300 hover:text-white">Cases</Link>
        <Link href="/tracker" className="text-sm text-gray-300 hover:text-white">Tracker</Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Update root page** at `src/app/page.tsx`

```typescript
import { redirect } from 'next/navigation'
export default function Home() { redirect('/dashboard') }
```

- [ ] **Test auth manually**: `npm run dev` → visit `localhost:3000` → redirects to `/login` ✓

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add auth login page and protected route middleware"
```

---

## Task 4: Client list + search page

**Files:**
- Create: `src/actions/clients.ts`
- Create: `src/components/clients/ClientSearch.tsx`
- Create: `src/app/(app)/clients/page.tsx`

- [ ] **Create client server actions** at `src/actions/clients.ts`

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients(query?: string) {
  const supabase = createClient()
  let q = supabase
    .from('clients')
    .select('id, first_name, middle_name, last_name, phone, email, a_number, services_used, created_at')
    .order('last_name')

  if (query) {
    q = q.or(
      `last_name.ilike.%${query}%,first_name.ilike.%${query}%,a_number.ilike.%${query}%,phone.ilike.%${query}%`
    )
  }
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getClient(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function deleteClient(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/clients')
}
```

- [ ] **Create client search component** at `src/components/clients/ClientSearch.tsx`

```typescript
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export function ClientSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams)
    if (e.target.value) { params.set('q', e.target.value) }
    else { params.delete('q') }
    startTransition(() => router.replace(`/clients?${params.toString()}`))
  }

  return (
    <input
      defaultValue={searchParams.get('q') ?? ''}
      onChange={handleSearch}
      placeholder="Search by name, A-Number, or phone..."
      className="w-full max-w-md px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
    />
  )
}
```

- [ ] **Create clients list page** at `src/app/(app)/clients/page.tsx`

```typescript
import { getClients } from '@/actions/clients'
import { ClientSearch } from '@/components/clients/ClientSearch'
import Link from 'next/link'

export default async function ClientsPage({
  searchParams
}: {
  searchParams: { q?: string }
}) {
  const clients = await getClients(searchParams.q)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link href="/clients/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium">
          + New Client
        </Link>
      </div>
      <ClientSearch />
      <div className="space-y-2">
        {clients.length === 0 && (
          <p className="text-gray-400">No clients found.</p>
        )}
        {clients.map(client => (
          <Link key={client.id} href={`/clients/${client.id}`}
            className="flex items-center justify-between p-4 bg-gray-900 rounded-lg hover:bg-gray-800 border border-gray-800">
            <div>
              <p className="font-medium">
                {client.last_name}, {client.first_name} {client.middle_name ?? ''}
              </p>
              <p className="text-sm text-gray-400">
                {client.a_number && `A# ${client.a_number} · `}
                {client.phone}
              </p>
            </div>
            <div className="flex gap-1">
              {(client.services_used as string[]).map(s => (
                <span key={s} className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded">
                  {s}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add client list page with search"
```

---

## Task 5: Create + edit client form

**Files:**
- Create: `src/components/clients/ClientForm.tsx`
- Create: `src/app/(app)/clients/new/page.tsx`
- Create: `src/app/(app)/clients/[id]/edit/page.tsx`
- Modify: `src/actions/clients.ts`

- [ ] **Add createClient and updateClient to `src/actions/clients.ts`**

```typescript
// Add to existing actions/clients.ts

export async function createClient(formData: FormData) {
  const supabase = createClient()
  const payload = {
    first_name: formData.get('first_name') as string,
    middle_name: formData.get('middle_name') as string || null,
    last_name: formData.get('last_name') as string,
    date_of_birth: formData.get('date_of_birth') as string,
    country_of_birth: formData.get('country_of_birth') as string || null,
    a_number: formData.get('a_number') as string || null,
    ssn: formData.get('ssn') as string || null,
    phone: formData.get('phone') as string || null,
    email: formData.get('email') as string || null,
    marital_status: formData.get('marital_status') as string || null,
    address: {
      street: formData.get('address_street'),
      city: formData.get('address_city'),
      state: formData.get('address_state'),
      zip: formData.get('address_zip'),
    },
    services_used: [],
  }
  const { data, error } = await supabase.from('clients').insert(payload).select('id').single()
  if (error) throw error
  revalidatePath('/clients')
  return data.id
}

export async function updateClient(id: string, formData: FormData) {
  const supabase = createClient()
  const payload = {
    first_name: formData.get('first_name') as string,
    middle_name: formData.get('middle_name') as string || null,
    last_name: formData.get('last_name') as string,
    date_of_birth: formData.get('date_of_birth') as string,
    country_of_birth: formData.get('country_of_birth') as string || null,
    a_number: formData.get('a_number') as string || null,
    ssn: formData.get('ssn') as string || null,
    phone: formData.get('phone') as string || null,
    email: formData.get('email') as string || null,
    marital_status: formData.get('marital_status') as string || null,
    address: {
      street: formData.get('address_street'),
      city: formData.get('address_city'),
      state: formData.get('address_state'),
      zip: formData.get('address_zip'),
    },
  }
  const { error } = await supabase.from('clients').update(payload).eq('id', id)
  if (error) throw error
  revalidatePath(`/clients/${id}`)
  revalidatePath('/clients')
}
```

- [ ] **Create ClientForm component** at `src/components/clients/ClientForm.tsx`

```typescript
'use client'
import { useRouter } from 'next/navigation'
import { createClient, updateClient } from '@/actions/clients'

type Props = {
  defaultValues?: Record<string, any>
  clientId?: string
}

export function ClientForm({ defaultValues, clientId }: Props) {
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    if (clientId) {
      await updateClient(clientId, formData)
      router.push(`/clients/${clientId}`)
    } else {
      const id = await createClient(formData)
      router.push(`/clients/${id}`)
    }
  }

  const d = defaultValues ?? {}

  return (
    <form action={handleSubmit} className="space-y-6 max-w-2xl">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-gray-700 pb-2">Personal Information</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="First Name *" name="first_name" defaultValue={d.first_name} required />
          <Field label="Middle Name" name="middle_name" defaultValue={d.middle_name} />
          <Field label="Last Name *" name="last_name" defaultValue={d.last_name} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of Birth *" name="date_of_birth" type="date" defaultValue={d.date_of_birth} required />
          <Field label="Country of Birth" name="country_of_birth" defaultValue={d.country_of_birth} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="A-Number" name="a_number" defaultValue={d.a_number} placeholder="A000000000" />
          <Field label="SSN" name="ssn" defaultValue={d.ssn} placeholder="XXX-XX-XXXX" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone" name="phone" type="tel" defaultValue={d.phone} />
          <Field label="Email" name="email" type="email" defaultValue={d.email} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Marital Status</label>
          <select name="marital_status" defaultValue={d.marital_status ?? ''}
            className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700">
            <option value="">— Select —</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
            <option value="separated">Separated</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-gray-700 pb-2">Current Address</h2>
        <Field label="Street" name="address_street" defaultValue={d.address?.street} />
        <div className="grid grid-cols-3 gap-4">
          <Field label="City" name="address_city" defaultValue={d.address?.city} />
          <Field label="State" name="address_state" defaultValue={d.address?.state} placeholder="TX" />
          <Field label="ZIP" name="address_zip" defaultValue={d.address?.zip} />
        </div>
      </section>

      <div className="flex gap-3">
        <button type="submit"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium">
          {clientId ? 'Save Changes' : 'Create Client'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium">
          Cancel
        </button>
      </div>
    </form>
  )
}

function Field({ label, name, type = 'text', defaultValue, required, placeholder }: {
  label: string; name: string; type?: string
  defaultValue?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue ?? ''} required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" />
    </div>
  )
}
```

- [ ] **Create new client page** at `src/app/(app)/clients/new/page.tsx`

```typescript
import { ClientForm } from '@/components/clients/ClientForm'

export default function NewClientPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Client</h1>
      <ClientForm />
    </div>
  )
}
```

- [ ] **Create edit client page** at `src/app/(app)/clients/[id]/edit/page.tsx`

```typescript
import { getClient } from '@/actions/clients'
import { ClientForm } from '@/components/clients/ClientForm'
import { notFound } from 'next/navigation'

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id).catch(() => null)
  if (!client) notFound()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        Edit — {client.last_name}, {client.first_name}
      </h1>
      <ClientForm defaultValues={client} clientId={client.id} />
    </div>
  )
}
```

- [ ] **Create client profile view** at `src/app/(app)/clients/[id]/page.tsx`

```typescript
import { getClient } from '@/actions/clients'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ClientProfilePage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id).catch(() => null)
  if (!client) notFound()

  const addr = client.address as any

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {client.last_name}, {client.first_name} {client.middle_name ?? ''}
        </h1>
        <div className="flex gap-2">
          <Link href={`/clients/${client.id}/edit`}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">Edit</Link>
          <Link href={`/cases/new?clientId=${client.id}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm">+ New Case</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoBlock label="A-Number" value={client.a_number} />
        <InfoBlock label="Date of Birth" value={client.date_of_birth} />
        <InfoBlock label="Country of Birth" value={client.country_of_birth} />
        <InfoBlock label="Marital Status" value={client.marital_status} />
        <InfoBlock label="Phone" value={client.phone} />
        <InfoBlock label="Email" value={client.email} />
        <InfoBlock label="Address"
          value={addr ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}` : undefined} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Services Used</h2>
        <div className="flex gap-2">
          {(client.services_used as string[]).length === 0 && (
            <span className="text-gray-400 text-sm">None recorded</span>
          )}
          {(client.services_used as string[]).map(s => (
            <span key={s} className="px-2 py-1 bg-blue-900 text-blue-300 text-sm rounded">{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-gray-900 p-3 rounded">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm mt-1">{value ?? '—'}</p>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add client create, edit, and profile pages"
```

---

## Task 6: Form field definitions + tests

**Files:**
- Create: `src/lib/forms/types.ts`
- Create: `src/lib/forms/n400.ts`
- Create: `src/lib/forms/i765.ts`
- Create: `src/lib/forms/i130.ts`
- Create: `src/lib/forms/i131.ts`
- Create: `src/lib/forms/packages.ts`
- Create: `src/lib/forms/index.ts`
- Create: `__tests__/lib/forms/n400.test.ts`

- [ ] **Write failing test** at `__tests__/lib/forms/n400.test.ts`

```typescript
import { n400 } from '@/lib/forms/n400'

const mockClient = {
  first_name: 'Van A',
  last_name: 'Nguyen',
  middle_name: null,
  date_of_birth: '1985-01-15',
  a_number: 'A123456789',
  address: { street: '1234 Main St', city: 'Houston', state: 'TX', zip: '77001' },
  marital_status: 'married',
  phone: '713-555-1234',
  ssn: '123-45-6789',
}

describe('n400 form definition', () => {
  it('has online filing mode', () => {
    expect(n400.filingMode).toBe('online')
  })

  it('returns last name from client', () => {
    const part2 = n400.sections.find(s => s.id === 'part2')!
    const lastNameField = part2.fields.find(f => f.id === 'family_name')!
    expect(lastNameField.getValue(mockClient as any)).toBe('Nguyen')
  })

  it('returns formatted date of birth', () => {
    const part2 = n400.sections.find(s => s.id === 'part2')!
    const dobField = part2.fields.find(f => f.id === 'date_of_birth')!
    expect(dobField.getValue(mockClient as any)).toBe('01/15/1985')
  })

  it('returns N/A for missing middle name', () => {
    const part2 = n400.sections.find(s => s.id === 'part2')!
    const midField = part2.fields.find(f => f.id === 'middle_name')!
    expect(midField.getValue(mockClient as any)).toBe('N/A')
  })
})
```

- [ ] **Run test, confirm it fails**

```bash
npx jest __tests__/lib/forms/n400.test.ts
# Expected: FAIL — cannot find module '@/lib/forms/n400'
```

- [ ] **Create form types** at `src/lib/forms/types.ts`

```typescript
import type { FilingMode } from '@/types'

export type Client = Record<string, any>

export type FormField = {
  id: string
  label: string
  getValue: (client: Client) => string
}

export type FormSection = {
  id: string
  label: string
  fields: FormField[]
}

export type FormDefinition = {
  id: string
  name: string
  filingMode: FilingMode
  sections: FormSection[]
  /** For mail forms: path to USCIS PDF template in /public/forms/ */
  pdfTemplate?: string
  /** For mail forms: maps field id to PDF field name */
  pdfFieldMap?: Record<string, string>
}

export type PackageDefinition = {
  id: string
  name: string
  formIds: string[]
}
```

- [ ] **Create date formatter utility** at `src/lib/utils.ts`

```typescript
/** Formats ISO date string (YYYY-MM-DD) to MM/DD/YYYY for USCIS forms */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${month}/${day}/${year}`
}
```

- [ ] **Create N-400 form definition** at `src/lib/forms/n400.ts`

```typescript
import { formatDate } from '@/lib/utils'
import type { FormDefinition } from './types'

export const n400: FormDefinition = {
  id: 'n400',
  name: 'N-400 Application for Naturalization',
  filingMode: 'online',
  sections: [
    {
      id: 'part2',
      label: 'Part 2 — Information About You',
      fields: [
        { id: 'family_name', label: 'Family Name (Last Name)', getValue: c => c.last_name ?? '' },
        { id: 'given_name', label: 'Given Name (First Name)', getValue: c => c.first_name ?? '' },
        { id: 'middle_name', label: 'Middle Name', getValue: c => c.middle_name ?? 'N/A' },
        { id: 'date_of_birth', label: 'Date of Birth (MM/DD/YYYY)', getValue: c => formatDate(c.date_of_birth) },
        { id: 'a_number', label: 'Alien Registration Number', getValue: c => c.a_number ?? '' },
        { id: 'ssn', label: 'US Social Security Number', getValue: c => c.ssn ?? '' },
        { id: 'marital_status', label: 'Marital Status', getValue: c => c.marital_status ?? '' },
      ],
    },
    {
      id: 'part2_address',
      label: 'Part 2 — Address',
      fields: [
        { id: 'street', label: 'Street Number and Name', getValue: c => c.address?.street ?? '' },
        { id: 'city', label: 'City or Town', getValue: c => c.address?.city ?? '' },
        { id: 'state', label: 'State', getValue: c => c.address?.state ?? '' },
        { id: 'zip', label: 'ZIP Code', getValue: c => c.address?.zip ?? '' },
      ],
    },
    {
      id: 'part2_contact',
      label: 'Part 2 — Contact Information',
      fields: [
        { id: 'phone', label: 'Daytime Phone Number', getValue: c => c.phone ?? '' },
        { id: 'email', label: 'Email Address', getValue: c => c.email ?? '' },
      ],
    },
    {
      id: 'part3',
      label: 'Part 3 — Accomodation Needed',
      fields: [
        { id: 'accommodation', label: 'Do you need accommodation?', getValue: () => 'No' },
      ],
    },
  ],
}
```

- [ ] **Create I-765 form definition** at `src/lib/forms/i765.ts`

```typescript
import { formatDate } from '@/lib/utils'
import type { FormDefinition } from './types'

export const i765: FormDefinition = {
  id: 'i765',
  name: 'I-765 Application for Employment Authorization',
  filingMode: 'online',
  sections: [
    {
      id: 'part1',
      label: 'Part 1 — Reason for Applying',
      fields: [
        { id: 'eligibility_category', label: 'Eligibility Category', getValue: () => '' },
      ],
    },
    {
      id: 'part2',
      label: 'Part 2 — Information About You',
      fields: [
        { id: 'family_name', label: 'Family Name (Last Name)', getValue: c => c.last_name ?? '' },
        { id: 'given_name', label: 'Given Name (First Name)', getValue: c => c.first_name ?? '' },
        { id: 'middle_name', label: 'Middle Name', getValue: c => c.middle_name ?? 'N/A' },
        { id: 'date_of_birth', label: 'Date of Birth (MM/DD/YYYY)', getValue: c => formatDate(c.date_of_birth) },
        { id: 'country_of_birth', label: 'Country of Birth', getValue: c => c.country_of_birth ?? '' },
        { id: 'a_number', label: 'Alien Registration Number', getValue: c => c.a_number ?? '' },
        { id: 'ssn', label: 'Social Security Number (if any)', getValue: c => c.ssn ?? 'None' },
      ],
    },
    {
      id: 'part2_address',
      label: 'Part 2 — Mailing Address',
      fields: [
        { id: 'street', label: 'Street Number and Name', getValue: c => c.address?.street ?? '' },
        { id: 'city', label: 'City or Town', getValue: c => c.address?.city ?? '' },
        { id: 'state', label: 'State', getValue: c => c.address?.state ?? '' },
        { id: 'zip', label: 'ZIP Code', getValue: c => c.address?.zip ?? '' },
      ],
    },
  ],
}
```

- [ ] **Create I-130 form definition** at `src/lib/forms/i130.ts`

```typescript
import { formatDate } from '@/lib/utils'
import type { FormDefinition } from './types'

export const i130: FormDefinition = {
  id: 'i130',
  name: 'I-130 Petition for Alien Relative',
  filingMode: 'online',
  sections: [
    {
      id: 'part1',
      label: 'Part 1 — Relationship',
      fields: [
        { id: 'relationship', label: 'Relationship to Beneficiary', getValue: () => '' },
      ],
    },
    {
      id: 'part2',
      label: 'Part 2 — Information About You (Petitioner)',
      fields: [
        { id: 'family_name', label: 'Family Name (Last Name)', getValue: c => c.last_name ?? '' },
        { id: 'given_name', label: 'Given Name (First Name)', getValue: c => c.first_name ?? '' },
        { id: 'middle_name', label: 'Middle Name', getValue: c => c.middle_name ?? 'N/A' },
        { id: 'date_of_birth', label: 'Date of Birth', getValue: c => formatDate(c.date_of_birth) },
        { id: 'a_number', label: 'A-Number (if any)', getValue: c => c.a_number ?? 'None' },
        { id: 'ssn', label: 'US Social Security Number', getValue: c => c.ssn ?? '' },
        { id: 'address', label: 'Current Address', getValue: c => {
          const a = c.address
          return a ? `${a.street}, ${a.city}, ${a.state} ${a.zip}` : ''
        }},
        { id: 'phone', label: 'Daytime Phone Number', getValue: c => c.phone ?? '' },
      ],
    },
  ],
}
```

- [ ] **Create I-131 mail form definition** at `src/lib/forms/i131.ts`

```typescript
import { formatDate } from '@/lib/utils'
import type { FormDefinition } from './types'

export const i131: FormDefinition = {
  id: 'i131',
  name: 'I-131 Application for Travel Document',
  filingMode: 'mail',
  pdfTemplate: 'i131.pdf',
  pdfFieldMap: {
    'family_name': 'Pt1Line1_FamilyName',
    'given_name': 'Pt1Line2_GivenName',
    'middle_name': 'Pt1Line3_MiddleName',
    'date_of_birth': 'Pt1Line6_DateofBirth',
    'a_number': 'Pt1Line8a_AlienNumber',
    'street': 'Pt2Line1a_StreetNumberName',
    'city': 'Pt2Line1b_CityOrTown',
    'state': 'Pt2Line1c_State',
    'zip': 'Pt2Line1d_ZipCode',
  },
  sections: [
    {
      id: 'part1',
      label: 'Part 1 — Information About You',
      fields: [
        { id: 'family_name', label: 'Family Name (Last Name)', getValue: c => c.last_name ?? '' },
        { id: 'given_name', label: 'Given Name (First Name)', getValue: c => c.first_name ?? '' },
        { id: 'middle_name', label: 'Middle Name', getValue: c => c.middle_name ?? '' },
        { id: 'date_of_birth', label: 'Date of Birth (MM/DD/YYYY)', getValue: c => formatDate(c.date_of_birth) },
        { id: 'a_number', label: 'Alien Registration Number', getValue: c => c.a_number ?? '' },
        { id: 'street', label: 'Street Address', getValue: c => c.address?.street ?? '' },
        { id: 'city', label: 'City', getValue: c => c.address?.city ?? '' },
        { id: 'state', label: 'State', getValue: c => c.address?.state ?? '' },
        { id: 'zip', label: 'ZIP Code', getValue: c => c.address?.zip ?? '' },
      ],
    },
  ],
}
```

- [ ] **Create package definitions** at `src/lib/forms/packages.ts`

```typescript
import type { PackageDefinition } from './types'

export const PACKAGES: PackageDefinition[] = [
  {
    id: 'marriage_greencard',
    name: 'Marriage-Based Green Card',
    formIds: ['i130', 'i485', 'i765', 'i131', 'i864', 'i693'],
  },
  {
    id: 'parent_greencard',
    name: 'Parent-Sponsored Green Card',
    formIds: ['i130', 'i485', 'i765', 'i131', 'i864', 'i693'],
  },
]
```

- [ ] **Create form registry** at `src/lib/forms/index.ts`

```typescript
import { n400 } from './n400'
import { i765 } from './i765'
import { i130 } from './i130'
import { i131 } from './i131'
import type { FormDefinition } from './types'

export const FORMS: Record<string, FormDefinition> = {
  n400,
  i765,
  i130,
  i131,
}

export function getForm(id: string): FormDefinition {
  const form = FORMS[id]
  if (!form) throw new Error(`Unknown form type: ${id}`)
  return form
}

export { n400, i765, i130, i131 }
export type { FormDefinition, FormSection, FormField } from './types'
```

- [ ] **Run tests, confirm they pass**

```bash
npx jest __tests__/lib/forms/n400.test.ts
# Expected: PASS — 4 tests
```

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add form field definitions with tests"
```

---

## Task 7: Case creation (simple + package)

**Files:**
- Create: `src/actions/cases.ts`
- Create: `src/lib/forms/checklists.ts`
- Create: `src/app/(app)/cases/new/page.tsx`
- Create: `src/app/(app)/cases/page.tsx`

- [ ] **Create document checklist definitions** at `src/lib/forms/checklists.ts`

```typescript
/** Required documents per form type */
export const CHECKLISTS: Record<string, string[]> = {
  n400: [
    'Green Card (front and back copy)',
    'Passport (all pages)',
    'Driver\'s License or State ID',
    'Tax Returns (last 3 years)',
    'Travel History (last 5 years — list of trips)',
    'Marriage Certificate (if married)',
    'Divorce Decree (if previously married)',
  ],
  i485: [
    'Passport (all pages)',
    'Birth Certificate (with certified translation)',
    'I-94 Arrival/Departure Record',
    'Two passport-style photos',
    'Medical Exam (I-693, sealed envelope from civil surgeon)',
    'Affidavit of Support (I-864)',
    'Police Clearance (if lived outside US 6+ months after age 16)',
  ],
  i130: [
    'Petitioner\'s US Passport or Naturalization Certificate or Green Card',
    'Petitioner\'s Birth Certificate',
    'Beneficiary\'s Birth Certificate',
    'Marriage Certificate (if filing for spouse)',
    'Proof of Termination of Prior Marriages (if applicable)',
    'Two passport-style photos (beneficiary)',
  ],
  i765: [
    'Two passport-style photos',
    'Copy of any prior EAD cards',
    'Copy of I-94 or visa stamp',
    'I-485 Receipt Notice (if concurrently filed)',
  ],
  i131: [
    'Two passport-style photos',
    'Copy of Green Card or EAD',
    'Passport copy',
    'Copy of I-485 Receipt Notice (if pending)',
  ],
  i864: [
    'Sponsor\'s most recent Federal Tax Return (IRS transcript or complete copy)',
    'Sponsor\'s W-2s or 1099s',
    'Proof of current employment (offer letter or pay stubs)',
    'Sponsor\'s Passport or US Citizenship documents',
  ],
  i693: [
    '(Completed by USCIS-designated civil surgeon — bring sealed envelope)',
    'Vaccination records',
    'Two passport-style photos for civil surgeon',
  ],
}
```

- [ ] **Create case server actions** at `src/actions/cases.ts`

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CHECKLISTS } from '@/lib/forms/checklists'
import { PACKAGES } from '@/lib/forms/packages'
import { FORMS } from '@/lib/forms'

export async function getCases() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cases')
    .select(`
      id, case_type, package_type, status, created_at,
      primary_client:clients!cases_primary_client_id_fkey(first_name, last_name),
      secondary_client:clients!cases_secondary_client_id_fkey(first_name, last_name),
      case_forms(id, form_type, receipt_number, current_uscis_status)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getCase(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cases')
    .select(`
      *,
      primary_client:clients!cases_primary_client_id_fkey(*),
      secondary_client:clients!cases_secondary_client_id_fkey(*),
      case_forms(*),
      documents(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createSimpleCase(formData: FormData) {
  const supabase = createClient()
  const clientId = formData.get('client_id') as string
  const formType = formData.get('form_type') as string
  const formDef = FORMS[formType]
  if (!formDef) throw new Error(`Unknown form type: ${formType}`)

  // Create case
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .insert({
      case_type: 'simple',
      primary_client_id: clientId,
      status: 'documents_pending',
    })
    .select('id')
    .single()
  if (caseError) throw caseError

  // Create case form
  const { data: formData2, error: formError } = await supabase
    .from('case_forms')
    .insert({
      case_id: caseData.id,
      form_type: formType,
      filing_mode: formDef.filingMode,
    })
    .select('id')
    .single()
  if (formError) throw formError

  // Create checklist documents
  const checklist = CHECKLISTS[formType] ?? []
  if (checklist.length > 0) {
    await supabase.from('documents').insert(
      checklist.map(label => ({
        case_id: caseData.id,
        case_form_id: formData2.id,
        label,
        required: true,
        received: false,
      }))
    )
  }

  revalidatePath('/cases')
  return caseData.id
}

export async function createPackageCase(formData: FormData) {
  const supabase = createClient()
  const primaryClientId = formData.get('primary_client_id') as string
  const secondaryClientId = formData.get('secondary_client_id') as string
  const packageType = formData.get('package_type') as string
  const pkg = PACKAGES.find(p => p.id === packageType)
  if (!pkg) throw new Error(`Unknown package type: ${packageType}`)

  // Create case
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .insert({
      case_type: 'package',
      package_type: packageType,
      primary_client_id: primaryClientId,
      secondary_client_id: secondaryClientId,
      status: 'documents_pending',
    })
    .select('id')
    .single()
  if (caseError) throw caseError

  // Create one case_form per form in the package
  const allDocs: any[] = []
  for (const formType of pkg.formIds) {
    const formDef = FORMS[formType]
    const filingMode = formDef?.filingMode ?? 'mail'

    const { data: cf, error: cfError } = await supabase
      .from('case_forms')
      .insert({ case_id: caseData.id, form_type: formType, filing_mode: filingMode })
      .select('id')
      .single()
    if (cfError) throw cfError

    const checklist = CHECKLISTS[formType] ?? []
    checklist.forEach(label => {
      allDocs.push({ case_id: caseData.id, case_form_id: cf.id, label, required: true, received: false })
    })
  }

  if (allDocs.length > 0) await supabase.from('documents').insert(allDocs)

  revalidatePath('/cases')
  return caseData.id
}
```

- [ ] **Create cases list page** at `src/app/(app)/cases/page.tsx`

```typescript
import { getCases } from '@/actions/cases'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  documents_pending: 'bg-yellow-900 text-yellow-300',
  ready_to_file: 'bg-blue-900 text-blue-300',
  submitted: 'bg-purple-900 text-purple-300',
  receipt_received: 'bg-indigo-900 text-indigo-300',
  in_progress: 'bg-cyan-900 text-cyan-300',
  rfe_issued: 'bg-orange-900 text-orange-300',
  approved: 'bg-green-900 text-green-300',
  denied: 'bg-red-900 text-red-300',
}

export default async function CasesPage() {
  const cases = await getCases()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cases</h1>
        <Link href="/cases/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium">
          + New Case
        </Link>
      </div>
      <div className="space-y-2">
        {cases.map((c: any) => (
          <Link key={c.id} href={`/cases/${c.id}`}
            className="flex items-center justify-between p-4 bg-gray-900 rounded-lg hover:bg-gray-800 border border-gray-800">
            <div>
              <p className="font-medium">
                {(c.primary_client as any)?.last_name}, {(c.primary_client as any)?.first_name}
                {c.secondary_client && ` + ${(c.secondary_client as any).last_name}, ${(c.secondary_client as any).first_name}`}
              </p>
              <p className="text-sm text-gray-400">
                {c.case_forms.map((f: any) => f.form_type.toUpperCase()).join(' + ')}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[c.status] ?? ''}`}>
              {c.status.replace(/_/g, ' ')}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Create new case page** at `src/app/(app)/cases/new/page.tsx`

```typescript
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSimpleCase, createPackageCase } from '@/actions/cases'
import { PACKAGES } from '@/lib/forms/packages'

const SIMPLE_FORMS = [
  { id: 'n400', name: 'N-400 — Naturalization' },
  { id: 'i765', name: 'I-765 — EAD / Employment Authorization' },
  { id: 'i131', name: 'I-131 — Travel Document' },
  { id: 'i130', name: 'I-130 — Petition for Relative (standalone)' },
]

export default function NewCasePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultClientId = searchParams.get('clientId') ?? ''
  const [caseType, setCaseType] = useState<'simple' | 'package'>('simple')

  async function handleSimple(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const id = await createSimpleCase(new FormData(e.currentTarget))
    router.push(`/cases/${id}`)
  }

  async function handlePackage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const id = await createPackageCase(new FormData(e.currentTarget))
    router.push(`/cases/${id}`)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">New Case</h1>

      <div className="flex gap-2">
        <button onClick={() => setCaseType('simple')}
          className={`px-4 py-2 rounded text-sm ${caseType === 'simple' ? 'bg-blue-600' : 'bg-gray-800'}`}>
          Simple Case
        </button>
        <button onClick={() => setCaseType('package')}
          className={`px-4 py-2 rounded text-sm ${caseType === 'package' ? 'bg-blue-600' : 'bg-gray-800'}`}>
          Package Case
        </button>
      </div>

      {caseType === 'simple' && (
        <form onSubmit={handleSimple} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Client A-Number or Name</label>
            <input name="client_id" defaultValue={defaultClientId} required placeholder="Client UUID"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" />
            <p className="text-xs text-gray-500 mt-1">Paste client ID from the Clients page</p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Form Type</label>
            <select name="form_type" required
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700">
              {SIMPLE_FORMS.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <button type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium">
            Create Case
          </button>
        </form>
      )}

      {caseType === 'package' && (
        <form onSubmit={handlePackage} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Package Type</label>
            <select name="package_type" required
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700">
              {PACKAGES.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Petitioner (US Citizen / Sponsor)</label>
            <input name="primary_client_id" required placeholder="Client ID"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Beneficiary (Applicant)</label>
            <input name="secondary_client_id" required placeholder="Client ID"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" />
          </div>
          <button type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium">
            Create Package Case
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add simple and package case creation with auto-checklists"
```

---

## Task 8: Document checklist + file upload

**Files:**
- Create: `src/actions/documents.ts`
- Create: `src/components/cases/DocumentChecklist.tsx`
- Create: `src/app/(app)/cases/[id]/page.tsx`
- Create: `src/app/(app)/cases/[id]/documents/page.tsx`

- [ ] **Create document server actions** at `src/actions/documents.ts`

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markDocumentReceived(docId: string, caseId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('documents')
    .update({ received: true })
    .eq('id', docId)
  if (error) throw error
  revalidatePath(`/cases/${caseId}/documents`)
}

export async function uploadDocument(docId: string, caseId: string, file: File) {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `cases/${caseId}/${docId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { error: updateError } = await supabase
    .from('documents')
    .update({ received: true, file_path: path })
    .eq('id', docId)
  if (updateError) throw updateError

  revalidatePath(`/cases/${caseId}/documents`)
}

export async function getDocumentUrl(filePath: string) {
  const supabase = createClient()
  const { data } = supabase.storage.from('documents').getPublicUrl(filePath)
  return data.publicUrl
}

export async function addCustomDocument(caseId: string, label: string) {
  const supabase = createClient()
  await supabase.from('documents').insert({
    case_id: caseId,
    label,
    required: false,
    received: false,
  })
  revalidatePath(`/cases/${caseId}/documents`)
}
```

- [ ] **Create DocumentChecklist component** at `src/components/cases/DocumentChecklist.tsx`

```typescript
'use client'
import { useState } from 'react'
import { markDocumentReceived, uploadDocument, addCustomDocument } from '@/actions/documents'

type Doc = {
  id: string
  label: string
  required: boolean
  received: boolean
  file_path: string | null
}

export function DocumentChecklist({ docs, caseId }: { docs: Doc[]; caseId: string }) {
  const [newLabel, setNewLabel] = useState('')
  const received = docs.filter(d => d.received).length

  async function handleUpload(docId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadDocument(docId, caseId, file)
  }

  async function handleAddCustom() {
    if (!newLabel.trim()) return
    await addCustomDocument(caseId, newLabel.trim())
    setNewLabel('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{received} / {docs.length} documents received</p>
        <div className="w-48 bg-gray-800 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${docs.length ? (received / docs.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {docs.map(doc => (
          <div key={doc.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              doc.received ? 'border-green-800 bg-green-900/20' : 'border-gray-700 bg-gray-900'
            }`}>
            <div className="flex items-center gap-3">
              <span className="text-lg">{doc.received ? '✅' : '⬜'}</span>
              <div>
                <p className="text-sm">{doc.label}</p>
                {doc.required && !doc.received && (
                  <p className="text-xs text-red-400">Required</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {doc.file_path && (
                <span className="text-xs text-green-400">Uploaded</span>
              )}
              {!doc.received && (
                <label className="cursor-pointer text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                  Upload
                  <input type="file" className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => handleUpload(doc.id, e)} />
                </label>
              )}
              {!doc.received && (
                <button onClick={() => markDocumentReceived(doc.id, caseId)}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                  Mark received
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-800">
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
          placeholder="Add custom document..."
          className="flex-1 px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 text-sm" />
        <button onClick={handleAddCustom}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">Add</button>
      </div>
    </div>
  )
}
```

- [ ] **Create case overview page** at `src/app/(app)/cases/[id]/page.tsx`

```typescript
import { getCase } from '@/actions/cases'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function CasePage({ params }: { params: { id: string } }) {
  const c = await getCase(params.id).catch(() => null)
  if (!c) notFound()

  const primary = c.primary_client as any
  const secondary = c.secondary_client as any

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {primary?.last_name}, {primary?.first_name}
          {secondary && ` + ${secondary.last_name}, ${secondary.first_name}`}
        </h1>
        <span className="px-3 py-1 bg-yellow-900 text-yellow-300 text-sm rounded">
          {(c.status as string).replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="font-semibold mb-3">Forms in this case</h2>
          {(c.case_forms as any[]).map(form => (
            <div key={form.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <span className="text-sm">{form.form_type.toUpperCase()}</span>
              <Link href={`/cases/${c.id}/filing/${form.id}`}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded">
                {form.filing_mode === 'online' ? 'Open Filing Screen' : 'Download PDF'}
              </Link>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Quick Links</h2>
          <div className="space-y-2">
            <Link href={`/cases/${c.id}/documents`}
              className="block text-sm text-blue-400 hover:text-blue-300">→ Document Checklist</Link>
            <Link href={`/clients/${primary?.id}`}
              className="block text-sm text-blue-400 hover:text-blue-300">→ Primary Client Profile</Link>
            {secondary && (
              <Link href={`/clients/${secondary.id}`}
                className="block text-sm text-blue-400 hover:text-blue-300">→ Secondary Client Profile</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Create documents page** at `src/app/(app)/cases/[id]/documents/page.tsx`

```typescript
import { getCase } from '@/actions/cases'
import { DocumentChecklist } from '@/components/cases/DocumentChecklist'
import { notFound } from 'next/navigation'

export default async function DocumentsPage({ params }: { params: { id: string } }) {
  const c = await getCase(params.id).catch(() => null)
  if (!c) notFound()

  const primary = c.primary_client as any

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">
        Documents — {primary?.last_name}, {primary?.first_name}
      </h1>
      <DocumentChecklist docs={c.documents as any[]} caseId={c.id} />
    </div>
  )
}
```

- [ ] **Create `documents` storage bucket in Supabase**: Dashboard → Storage → New bucket → Name: `documents` → Public: false

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add document checklist with upload and mark-received"
```

---

## Task 9: Copy-paste filing screen + tests

**Files:**
- Create: `src/components/filing/CopyField.tsx`
- Create: `src/components/filing/CopyPasteScreen.tsx`
- Create: `src/app/(app)/cases/[id]/filing/[formId]/page.tsx`
- Create: `__tests__/components/filing/CopyField.test.tsx`

- [ ] **Write failing test** at `__tests__/components/filing/CopyField.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { CopyField } from '@/components/filing/CopyField'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
})

describe('CopyField', () => {
  it('renders label and value', () => {
    render(<CopyField id="last_name" label="Family Name" value="Nguyen" onCopy={jest.fn()} copied={false} />)
    expect(screen.getByText('Family Name')).toBeInTheDocument()
    expect(screen.getByText('Nguyen')).toBeInTheDocument()
  })

  it('shows Copy button when not copied', () => {
    render(<CopyField id="last_name" label="Family Name" value="Nguyen" onCopy={jest.fn()} copied={false} />)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('calls onCopy and writes to clipboard on click', async () => {
    const onCopy = jest.fn()
    render(<CopyField id="last_name" label="Family Name" value="Nguyen" onCopy={onCopy} copied={false} />)
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Nguyen')
    expect(onCopy).toHaveBeenCalledWith('last_name')
  })

  it('shows Copied ✓ when copied is true', () => {
    render(<CopyField id="last_name" label="Family Name" value="Nguyen" onCopy={jest.fn()} copied={true} />)
    expect(screen.getByText(/copied/i)).toBeInTheDocument()
  })
})
```

- [ ] **Run test, confirm it fails**

```bash
npx jest __tests__/components/filing/CopyField.test.tsx
# Expected: FAIL — cannot find module '@/components/filing/CopyField'
```

- [ ] **Create CopyField component** at `src/components/filing/CopyField.tsx`

```typescript
'use client'

type Props = {
  id: string
  label: string
  value: string
  copied: boolean
  onCopy: (id: string) => void
}

export function CopyField({ id, label, value, copied, onCopy }: Props) {
  function handleCopy() {
    navigator.clipboard.writeText(value)
    onCopy(id)
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      copied ? 'border-green-700 bg-green-900/20' : 'border-gray-700 bg-gray-900'
    }`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-sm font-mono mt-0.5 truncate ${copied ? 'text-green-400' : 'text-white'}`}>
          {value || '—'}
        </p>
      </div>
      <button onClick={handleCopy} disabled={!value}
        className={`ml-3 flex-shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors ${
          copied
            ? 'bg-green-800 text-green-300 cursor-default'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}>
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}
```

- [ ] **Run test, confirm it passes**

```bash
npx jest __tests__/components/filing/CopyField.test.tsx
# Expected: PASS — 4 tests
```

- [ ] **Create CopyPasteScreen component** at `src/components/filing/CopyPasteScreen.tsx`

```typescript
'use client'
import { useState } from 'react'
import { CopyField } from './CopyField'
import type { FormDefinition } from '@/lib/forms/types'

type Client = Record<string, any>

type Props = {
  form: FormDefinition
  client: Client
}

export function CopyPasteScreen({ form, client }: Props) {
  const [activeSection, setActiveSection] = useState(form.sections[0]?.id ?? '')
  const [copiedFields, setCopiedFields] = useState<Set<string>>(new Set())

  function handleCopy(fieldId: string) {
    setCopiedFields(prev => new Set([...prev, fieldId]))
  }

  function handleReset(sectionId: string) {
    const section = form.sections.find(s => s.id === sectionId)
    if (!section) return
    const fieldIds = section.fields.map(f => f.id)
    setCopiedFields(prev => {
      const next = new Set(prev)
      fieldIds.forEach(id => next.delete(id))
      return next
    })
  }

  function isSectionComplete(sectionId: string) {
    const section = form.sections.find(s => s.id === sectionId)
    if (!section) return false
    return section.fields.every(f => copiedFields.has(f.id))
  }

  const currentSection = form.sections.find(s => s.id === activeSection)
  const totalFields = form.sections.flatMap(s => s.fields).length
  const totalCopied = copiedFields.size

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Progress: {totalCopied} / {totalFields} fields copied
        </p>
        <div className="w-48 bg-gray-800 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${totalFields ? (totalCopied / totalFields) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3">
        {form.sections.map(section => (
          <button key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`text-sm px-3 py-1.5 rounded transition-colors ${
              activeSection === section.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}>
            {isSectionComplete(section.id) ? '✓ ' : ''}{section.label}
          </button>
        ))}
      </div>

      {/* Fields */}
      {currentSection && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{currentSection.label}</h3>
            <button onClick={() => handleReset(currentSection.id)}
              className="text-xs text-gray-400 hover:text-white">
              Reset section
            </button>
          </div>
          {currentSection.fields.map(field => (
            <CopyField
              key={field.id}
              id={field.id}
              label={field.label}
              value={field.getValue(client)}
              copied={copiedFields.has(field.id)}
              onCopy={handleCopy}
            />
          ))}
          <button
            onClick={() => {
              currentSection.fields.forEach(f => {
                navigator.clipboard.writeText(f.getValue(client))
                handleCopy(f.id)
              })
            }}
            className="w-full mt-2 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">
            Copy All in Section
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Create filing screen page** at `src/app/(app)/cases/[id]/filing/[formId]/page.tsx`

```typescript
import { getCase } from '@/actions/cases'
import { getForm } from '@/lib/forms'
import { CopyPasteScreen } from '@/components/filing/CopyPasteScreen'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function FilingPage({
  params,
}: {
  params: { id: string; formId: string }
}) {
  const c = await getCase(params.id).catch(() => null)
  if (!c) notFound()

  const caseForm = (c.case_forms as any[]).find(f => f.id === params.formId)
  if (!caseForm) notFound()

  // For package cases, determine which client is the applicant for this form
  // I-130 uses primary client (petitioner); I-485/I-765/I-131 use secondary (beneficiary)
  const BENEFICIARY_FORMS = ['i485', 'i765', 'i131', 'i693']
  const client = BENEFICIARY_FORMS.includes(caseForm.form_type) && c.secondary_client
    ? c.secondary_client
    : c.primary_client

  const form = getForm(caseForm.form_type)
  const primary = c.primary_client as any

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/cases/${c.id}`} className="text-sm text-gray-400 hover:text-white">
            ← Back to case
          </Link>
          <h1 className="text-2xl font-bold mt-1">{form.name}</h1>
          <p className="text-sm text-gray-400">
            {primary?.last_name}, {primary?.first_name}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${
          form.filingMode === 'online' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'
        }`}>
          {form.filingMode === 'online' ? 'Online Filing' : 'Mail Filing'}
        </span>
      </div>

      {form.filingMode === 'online' ? (
        <CopyPasteScreen form={form} client={client as Record<string, any>} />
      ) : (
        <div className="bg-gray-900 p-6 rounded-lg text-center space-y-3">
          <p className="text-gray-300">This form is filed by mail.</p>
          <Link href={`/cases/${params.id}/filing/${params.formId}/pdf`}
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded font-medium">
            Download Filled PDF
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add copy-paste filing screen with copied field tracking"
```

---

## Task 10: PDF generation for mail forms

**Files:**
- Create: `src/lib/pdf/fill.ts`
- Create: `src/app/(app)/cases/[id]/filing/[formId]/pdf/route.ts`

- [ ] **Download I-131 PDF from USCIS**, save to `public/forms/i131.pdf`

```
https://www.uscis.gov/sites/default/files/document/forms/i-131.pdf
```

- [ ] **Inspect I-131 PDF field names**

```typescript
// Run this one-time script to dump field names:
// scripts/inspect-pdf.ts
import { PDFDocument } from 'pdf-lib'
import * as fs from 'fs'

async function main() {
  const pdfBytes = fs.readFileSync('public/forms/i131.pdf')
  const pdf = await PDFDocument.load(pdfBytes)
  const form = pdf.getForm()
  const fields = form.getFields()
  fields.forEach(f => console.log(f.getName(), '—', f.constructor.name))
}
main()
```

```bash
npx ts-node --esm scripts/inspect-pdf.ts > i131-fields.txt
# Review i131-fields.txt and update pdfFieldMap in src/lib/forms/i131.ts to match actual field names
```

- [ ] **Create PDF fill utility** at `src/lib/pdf/fill.ts`

```typescript
import { PDFDocument } from 'pdf-lib'
import type { FormDefinition } from '@/lib/forms/types'

export async function fillPdf(
  form: FormDefinition,
  client: Record<string, any>
): Promise<Uint8Array> {
  if (!form.pdfTemplate || !form.pdfFieldMap) {
    throw new Error(`Form ${form.id} has no PDF template configured`)
  }

  // Load PDF template from /public/forms/
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/forms/${form.pdfTemplate}`
  )
  if (!response.ok) throw new Error(`Could not load PDF template: ${form.pdfTemplate}`)
  const pdfBytes = await response.arrayBuffer()

  const pdf = await PDFDocument.load(pdfBytes)
  const pdfForm = pdf.getForm()

  // Fill each field defined in pdfFieldMap
  for (const section of form.sections) {
    for (const field of section.fields) {
      const pdfFieldName = form.pdfFieldMap[field.id]
      if (!pdfFieldName) continue
      const value = field.getValue(client)
      try {
        const pdfField = pdfForm.getTextField(pdfFieldName)
        pdfField.setText(value)
      } catch {
        // Field may not exist in this version of the PDF — skip silently
      }
    }
  }

  return pdf.save()
}
```

- [ ] **Create PDF download route** at `src/app/(app)/cases/[id]/filing/[formId]/pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getForm } from '@/lib/forms'
import { fillPdf } from '@/lib/pdf/fill'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; formId: string } }
) {
  const supabase = createClient()

  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select(`
      *,
      primary_client:clients!cases_primary_client_id_fkey(*),
      secondary_client:clients!cases_secondary_client_id_fkey(*),
      case_forms(*)
    `)
    .eq('id', params.id)
    .single()

  if (caseError || !caseData) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  const caseForm = (caseData.case_forms as any[]).find(f => f.id === params.formId)
  if (!caseForm) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  const form = getForm(caseForm.form_type)
  const client = caseData.primary_client as Record<string, any>

  const pdfBytes = await fillPdf(form, client)

  const primary = caseData.primary_client as any
  const filename = `${form.id}-${primary.last_name}-${primary.first_name}.pdf`

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add PDF generation for mail filing forms"
```

---

## Task 11: USCIS case tracker + tests

**Files:**
- Create: `src/lib/uscis/status.ts`
- Create: `src/actions/tracker.ts`
- Create: `src/app/(app)/tracker/page.tsx`
- Create: `__tests__/lib/uscis/status.test.ts`
- Modify: `src/actions/cases.ts`

- [ ] **Write failing test** at `__tests__/lib/uscis/status.test.ts`

```typescript
import { parseUscisStatus } from '@/lib/uscis/status'

describe('parseUscisStatus', () => {
  it('returns status and description from USCIS HTML response', () => {
    const html = `
      <div class="rows text-center">
        <h4>Case Was Approved</h4>
        <p>On April 5, 2026, we approved your Form N-400.</p>
      </div>
    `
    const result = parseUscisStatus(html)
    expect(result.status).toBe('Case Was Approved')
    expect(result.description).toContain('we approved your Form N-400')
  })

  it('returns unknown status if HTML is unrecognized', () => {
    const result = parseUscisStatus('<html><body>Error</body></html>')
    expect(result.status).toBe('Unknown')
    expect(result.description).toBe('')
  })
})
```

- [ ] **Run test, confirm it fails**

```bash
npx jest __tests__/lib/uscis/status.test.ts
# Expected: FAIL
```

- [ ] **Create USCIS status utility** at `src/lib/uscis/status.ts`

```typescript
export type UscisStatusResult = {
  status: string
  description: string
}

/** Fetch case status from USCIS for a given receipt number */
export async function fetchUscisStatus(receiptNumber: string): Promise<UscisStatusResult> {
  const response = await fetch('https://egov.uscis.gov/casestatus/mycasestatus.do', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      appReceiptNum: receiptNumber,
      caseStatusSearchBtn: 'CHECK STATUS',
    }),
  })
  if (!response.ok) throw new Error(`USCIS returned ${response.status}`)
  const html = await response.text()
  return parseUscisStatus(html)
}

/** Parse USCIS case status HTML response */
export function parseUscisStatus(html: string): UscisStatusResult {
  // USCIS wraps status in <h4> and description in <p> inside .rows.text-center
  const h4Match = html.match(/<h4[^>]*>(.*?)<\/h4>/s)
  const pMatch = html.match(/<div[^>]*class="[^"]*rows text-center[^"]*"[^>]*>.*?<p[^>]*>(.*?)<\/p>/s)

  const status = h4Match ? stripTags(h4Match[1]).trim() : 'Unknown'
  const description = pMatch ? stripTags(pMatch[1]).trim() : ''

  return { status, description }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}
```

- [ ] **Run test, confirm it passes**

```bash
npx jest __tests__/lib/uscis/status.test.ts
# Expected: PASS — 2 tests
```

- [ ] **Create tracker actions** at `src/actions/tracker.ts`

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { fetchUscisStatus } from '@/lib/uscis/status'
import { revalidatePath } from 'next/cache'

export async function setReceiptNumber(caseFormId: string, receiptNumber: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('case_forms')
    .update({ receipt_number: receiptNumber })
    .eq('id', caseFormId)
  if (error) throw error
  revalidatePath('/tracker')
}

export async function checkCaseStatus(caseFormId: string) {
  const supabase = createClient()
  const { data: caseForm, error } = await supabase
    .from('case_forms')
    .select('receipt_number')
    .eq('id', caseFormId)
    .single()
  if (error || !caseForm?.receipt_number) return

  const result = await fetchUscisStatus(caseForm.receipt_number)

  // Log to history
  await supabase.from('status_history').insert({
    case_form_id: caseFormId,
    status: result.status,
    description: result.description,
    source: 'uscis_api',
  })

  // Update current status on case_form
  await supabase.from('case_forms').update({
    current_uscis_status: result.status,
    last_checked_at: new Date().toISOString(),
  }).eq('id', caseFormId)

  revalidatePath('/tracker')
}

export async function checkAllActiveCases() {
  const supabase = createClient()
  const { data: forms } = await supabase
    .from('case_forms')
    .select('id, receipt_number')
    .not('receipt_number', 'is', null)

  if (!forms) return
  await Promise.all(forms.map(f => checkCaseStatus(f.id)))
  revalidatePath('/tracker')
}

export async function getActiveCaseForms() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('case_forms')
    .select(`
      id, form_type, receipt_number, current_uscis_status, last_checked_at,
      case:cases(
        id,
        primary_client:clients!cases_primary_client_id_fkey(first_name, last_name)
      ),
      status_history(id, status, description, checked_at, source)
    `)
    .not('receipt_number', 'is', null)
    .order('last_checked_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
```

- [ ] **Create tracker page** at `src/app/(app)/tracker/page.tsx`

```typescript
'use client'
import { useState, useEffect } from 'react'
import { getActiveCaseForms, checkAllActiveCases, checkCaseStatus, setReceiptNumber } from '@/actions/tracker'

export default function TrackerPage() {
  const [forms, setForms] = useState<any[]>([])
  const [newReceipt, setNewReceipt] = useState<Record<string, string>>({})
  const [checking, setChecking] = useState(false)

  async function load() {
    const data = await getActiveCaseForms()
    setForms(data)
  }

  useEffect(() => { load() }, [])

  async function handleCheckAll() {
    setChecking(true)
    await checkAllActiveCases()
    await load()
    setChecking(false)
  }

  async function handleCheckOne(id: string) {
    await checkCaseStatus(id)
    await load()
  }

  async function handleSetReceipt(formId: string) {
    const receipt = newReceipt[formId]
    if (!receipt) return
    await setReceiptNumber(formId, receipt)
    setNewReceipt(prev => ({ ...prev, [formId]: '' }))
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Case Tracker</h1>
        <button onClick={handleCheckAll} disabled={checking}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50">
          {checking ? 'Checking...' : 'Refresh All Statuses'}
        </button>
      </div>

      {forms.length === 0 && (
        <p className="text-gray-400">No cases with receipt numbers yet.</p>
      )}

      <div className="space-y-4">
        {forms.map((form: any) => {
          const client = form.case?.primary_client
          const history = [...(form.status_history ?? [])].sort(
            (a: any, b: any) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime()
          )
          return (
            <div key={form.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {client?.last_name}, {client?.first_name} — {form.form_type.toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-400">Receipt: {form.receipt_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-300">
                    {form.current_uscis_status ?? 'Not checked yet'}
                  </p>
                  {form.last_checked_at && (
                    <p className="text-xs text-gray-500">
                      Last checked: {new Date(form.last_checked_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <button onClick={() => handleCheckOne(form.id)}
                className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                Check Now
              </button>

              {history.length > 0 && (
                <details className="text-sm">
                  <summary className="text-gray-400 cursor-pointer">Status history ({history.length})</summary>
                  <div className="mt-2 space-y-1 pl-2 border-l border-gray-700">
                    {history.slice(0, 5).map((h: any) => (
                      <div key={h.id}>
                        <p className="text-xs text-gray-300">{h.status}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(h.checked_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add USCIS case tracker with status polling and history"
```

---

## Task 12: Dashboard + cross-sell flags

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`

- [ ] **Create dashboard page** at `src/app/(app)/dashboard/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { count: clientCount },
    { count: activeCases },
    { data: recentCases },
    { data: rfeCases },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('cases').select('*', { count: 'exact', head: true })
      .not('status', 'in', '(approved,denied)'),
    supabase.from('cases')
      .select(`
        id, status, created_at,
        primary_client:clients!cases_primary_client_id_fkey(first_name, last_name),
        case_forms(form_type)
      `)
      .not('status', 'in', '(approved,denied)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('cases')
      .select(`
        id,
        primary_client:clients!cases_primary_client_id_fkey(first_name, last_name)
      `)
      .eq('status', 'rfe_issued'),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Clients" value={clientCount ?? 0} />
        <StatCard label="Active Cases" value={activeCases ?? 0} />
        <StatCard label="RFE Issued" value={rfeCases?.length ?? 0} urgent />
      </div>

      {/* RFE alerts */}
      {rfeCases && rfeCases.length > 0 && (
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
          <h2 className="font-semibold text-orange-300 mb-2">⚠ RFE Issued — Action Required</h2>
          <div className="space-y-1">
            {rfeCases.map((c: any) => (
              <Link key={c.id} href={`/cases/${c.id}`}
                className="block text-sm text-orange-200 hover:text-white">
                → {(c.primary_client as any)?.last_name}, {(c.primary_client as any)?.first_name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent cases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent Active Cases</h2>
          <Link href="/cases" className="text-sm text-blue-400 hover:text-blue-300">View all →</Link>
        </div>
        <div className="space-y-2">
          {(recentCases ?? []).map((c: any) => (
            <Link key={c.id} href={`/cases/${c.id}`}
              className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-800 border border-gray-800">
              <div>
                <p className="text-sm font-medium">
                  {(c.primary_client as any)?.last_name}, {(c.primary_client as any)?.first_name}
                </p>
                <p className="text-xs text-gray-400">
                  {(c.case_forms as any[]).map((f: any) => f.form_type.toUpperCase()).join(' + ')}
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {c.status.replace(/_/g, ' ')}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-semibold mb-3">Quick Actions</h2>
        <div className="flex gap-3">
          <Link href="/clients/new"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">
            + New Client
          </Link>
          <Link href="/cases/new"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">
            + New Case
          </Link>
          <Link href="/tracker"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">
            View Tracker
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, urgent }: { label: string; value: number; urgent?: boolean }) {
  return (
    <div className={`p-4 rounded-lg border ${urgent && value > 0 ? 'bg-orange-900/20 border-orange-700' : 'bg-gray-900 border-gray-800'}`}>
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${urgent && value > 0 ? 'text-orange-300' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
```

- [ ] **Run all tests**

```bash
npx jest
# Expected: PASS — all tests
```

- [ ] **Run dev server and do a full manual walkthrough**:
  1. Log in → redirects to dashboard ✓
  2. Create a client → appears in list ✓
  3. Create a simple N-400 case from client profile ✓
  4. Check document checklist auto-populated ✓
  5. Upload a document ✓
  6. Open N-400 filing screen → copy fields → mark as Copied ✓ ✓
  7. Enter a receipt number in tracker ✓
  8. Click "Check Now" → status returned and logged ✓

- [ ] **Commit**

```bash
git add -A && git commit -m "feat: add dashboard with stats, RFE alerts, and quick actions"
```

---

## Self-Review

**Spec coverage check:**
- CRM (client profiles, cross-sell tags, search) → Tasks 4-5 ✓
- Simple case creation → Task 7 ✓
- Package case creation → Task 7 ✓
- Document checklist (pre-built per form type) → Tasks 7-8 ✓
- Document upload + storage → Task 8 ✓
- Form field definitions (N-400, I-765, I-130, I-131) → Task 6 ✓
- Copy-paste filing screen with [Copied ✓] tracking → Task 9 ✓
- PDF generation for mail forms → Task 10 ✓
- USCIS status tracker + history → Task 11 ✓
- Dashboard + RFE alerts → Task 12 ✓
- Auth (staff login, protected routes) → Task 3 ✓

**Outstanding items for follow-up (not blocking v1):**
- Client search page uses `<ClientSearch />` which requires `useSearchParams` in a Suspense boundary — wrap in `<Suspense>` in production
- The new case form uses raw UUIDs for client IDs — replace with a client search/autocomplete component (reuse `ClientSearch`)
- I-864 and I-693 form definitions not created (only checklist entries) — add to `src/lib/forms/` following the same pattern as `i765.ts`
- `NEXT_PUBLIC_BASE_URL` env var needed for PDF route in production — add to Vercel environment variables
