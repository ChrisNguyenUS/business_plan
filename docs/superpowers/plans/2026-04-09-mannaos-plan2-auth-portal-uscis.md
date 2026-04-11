# MannaOS.com — Plan 2: Auth + Client Portal + USCIS Status Display

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase authentication, client self-registration, and a full client portal where clients can track their USCIS cases, view tax/insurance/AI service status, and manage documents.

**Architecture:** Supabase Auth for sessions. Next.js middleware guards `/portal/*` routes (client role) and `/admin/*` (admin role). Portal pages use server components reading from Supabase with RLS — clients see only their own data. **MannaOS.com is a pure read consumer for USCIS data** — the internal staff app (separate project on VPS) runs a Playwright agent daily that writes USCIS status to the shared Supabase DB. This website never calls USCIS.gov directly. Service model is extensible via `service_type` + `metadata` jsonb.

**Tech Stack:** Supabase (Auth + Postgres + Storage + RLS), @supabase/ssr, Next.js App Router server components.

**Prerequisite:** Plan 1 is deployed. `mannaos-web` repo exists on GitHub + Vercel.

---

## File Map

```
mannaos-web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   └── forgot-password/
│   │   │       └── page.tsx
│   │   ├── portal/
│   │   │   ├── layout.tsx              Auth guard — client role required
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx            All services overview
│   │   │   ├── services/
│   │   │   │   └── [type]/
│   │   │   │       └── page.tsx        Dynamic service detail
│   │   │   └── documents/
│   │   │       └── page.tsx            All documents
│   │   └── api/
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts               Browser Supabase client
│   │       ├── server.ts               Server component Supabase client
│   │       └── types.ts                Database type definitions
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthForm.tsx            Shared form for login/signup
│   │   └── portal/
│   │       ├── ServiceCard.tsx         Dashboard service card
│   │       ├── StatusBadge.tsx         Colored status indicator
│   │       ├── DocumentList.tsx        Document viewer + upload
│   │       └── service-views/
│   │           ├── UscisView.tsx       USCIS metadata display
│   │           ├── TaxView.tsx
│   │           ├── InsuranceView.tsx
│   │           └── AiView.tsx
│   └── middleware.ts                   Route protection
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql
│       └── 002_rls.sql
```

---

## Task 1: Supabase Project Setup

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_rls.sql`

- [ ] **Step 1: Create Supabase project**

1. Go to supabase.com → New Project
2. Name: `mannaos`
3. Database password: save securely
4. Region: US East (closest to Houston)
5. Copy Project URL and anon key from Settings → API

- [ ] **Step 2: Add environment variables**

Add to `.env.local` and Vercel project settings:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 3: Run schema migration**

In Supabase Dashboard → SQL Editor, run this SQL:

Create `supabase/migrations/001_schema.sql` (also run in dashboard):
```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  role         text not null check (role in ('client', 'admin')) default 'client',
  full_name    text not null default '',
  phone        text not null default '',
  preferred_language text not null check (preferred_language in ('en', 'vi')) default 'en',
  created_at   timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Services table (extensible — service_type + metadata jsonb)
create table public.services (
  id           uuid primary key default uuid_generate_v4(),
  client_id    uuid references public.profiles(id) on delete cascade not null,
  service_type text not null check (service_type in ('uscis', 'tax', 'insurance', 'ai')),
  status       text not null default 'Pending',
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger services_updated_at
  before update on public.services
  for each row execute procedure public.update_updated_at();

-- Service documents
create table public.service_documents (
  id           uuid primary key default uuid_generate_v4(),
  service_id   uuid references public.services(id) on delete cascade not null,
  file_name    text not null,
  file_url     text not null,
  uploaded_by  text not null check (uploaded_by in ('client', 'admin')),
  created_at   timestamptz not null default now()
);

-- USCIS sync log
create table public.uscis_sync_log (
  id           uuid primary key default uuid_generate_v4(),
  service_id   uuid references public.services(id) on delete cascade not null,
  synced_at    timestamptz not null default now(),
  status_text  text not null default '',
  raw_response text
);

-- Site content (for admin-editable sections)
create table public.site_content (
  key          text primary key,
  value        text not null default '',
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles(id)
);

-- Seed default site content keys
insert into public.site_content (key, value) values
  ('hero_headline_en', 'One Stop, All Solutions'),
  ('hero_headline_vi', 'Một Nơi, Tất Cả Giải Pháp'),
  ('hero_subheadline_en', 'Tax · Insurance · Immigration · AI Automation'),
  ('hero_subheadline_vi', 'Thuế · Bảo Hiểm · Di Trú · Tự Động Hóa AI'),
  ('about_bio_en', 'Manna One Solution was founded to serve Houston''s Vietnamese community with trustworthy, bilingual professional services — all under one roof.'),
  ('about_bio_vi', 'Manna One Solution được thành lập để phục vụ cộng đồng người Việt tại Houston với dịch vụ chuyên nghiệp, song ngữ và đáng tin cậy.');

-- Blog posts
create table public.blog_posts (
  id           uuid primary key default uuid_generate_v4(),
  slug         text unique not null,
  title_en     text not null default '',
  title_vi     text not null default '',
  content_en   text not null default '',
  content_vi   text not null default '',
  cover_image_url text,
  category     text not null check (category in ('tax', 'insurance', 'immigration', 'ai', 'general')),
  published    boolean not null default false,
  author_id    uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute procedure public.update_updated_at();
```

- [ ] **Step 4: Run RLS policies**

Create `supabase/migrations/002_rls.sql` (also run in dashboard):
```sql
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.service_documents enable row level security;
alter table public.uscis_sync_log enable row level security;
alter table public.site_content enable row level security;
alter table public.blog_posts enable row level security;

-- Profiles: users read/update own; admins read all
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- Services: clients see own; admins see all
create policy "Clients read own services"
  on public.services for select
  using (client_id = auth.uid());

create policy "Clients cannot insert services directly"
  on public.services for insert
  with check (false);  -- Only admins insert via service role

create policy "Admins full access to services"
  on public.services for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- Service documents: clients see own; admins see all; clients can insert own
create policy "Clients read own documents"
  on public.service_documents for select
  using (exists (
    select 1 from public.services s
    where s.id = service_id and s.client_id = auth.uid()
  ));

create policy "Clients upload own documents"
  on public.service_documents for insert
  with check (
    uploaded_by = 'client' and
    exists (
      select 1 from public.services s
      where s.id = service_id and s.client_id = auth.uid()
    )
  );

create policy "Admins full access to documents"
  on public.service_documents for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- USCIS sync log: clients read own
create policy "Clients read own sync log"
  on public.uscis_sync_log for select
  using (exists (
    select 1 from public.services s
    where s.id = service_id and s.client_id = auth.uid()
  ));

-- Site content: public read; admins write
create policy "Public can read site content"
  on public.site_content for select
  using (true);

create policy "Admins can write site content"
  on public.site_content for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- Blog posts: published posts are public; admins manage all
create policy "Anyone can read published blog posts"
  on public.blog_posts for select
  using (published = true);

create policy "Admins full access to blog posts"
  on public.blog_posts for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));
```

- [ ] **Step 5: Create Supabase Storage buckets**

In Supabase Dashboard → Storage:
1. Create bucket `documents` — private (only authenticated users)
2. Create bucket `blog-images` — public (images served publicly)
3. Create bucket `site-images` — public (hero images etc.)

Add Storage policies in SQL Editor:
```sql
-- Documents: clients access own folder, admins access all
create policy "Clients access own documents"
  on storage.objects for all
  using (
    bucket_id = 'documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Admins access all documents"
  on storage.objects for all
  using (
    bucket_id = 'documents' and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Blog images: public read, admins write
create policy "Public read blog images"
  on storage.objects for select
  using (bucket_id = 'blog-images');

create policy "Admins write blog images"
  on storage.objects for insert
  with check (
    bucket_id = 'blog-images' and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Site images: public read, admins write
create policy "Public read site images"
  on storage.objects for select
  using (bucket_id = 'site-images');

create policy "Admins write site images"
  on storage.objects for insert
  with check (
    bucket_id = 'site-images' and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
```

- [ ] **Step 6: Commit migration files**

```bash
git add supabase/
git commit -m "feat: add Supabase schema migrations and RLS policies"
```

---

## Task 2: Supabase Client Files

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/types.ts`

- [ ] **Step 1: Install Supabase SSR package**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create database type definitions**

Create `src/lib/supabase/types.ts`:
```typescript
export type Role = 'client' | 'admin'
export type ServiceType = 'uscis' | 'tax' | 'insurance' | 'ai'
export type Language = 'en' | 'vi'
export type UploadedBy = 'client' | 'admin'

export interface Profile {
  id: string
  role: Role
  full_name: string
  phone: string
  preferred_language: Language
  created_at: string
}

export interface Service {
  id: string
  client_id: string
  service_type: ServiceType
  status: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ServiceDocument {
  id: string
  service_id: string
  file_name: string
  file_url: string
  uploaded_by: UploadedBy
  created_at: string
}

export interface UscisMetadata {
  receipt_number: string
  case_type: string
  uscis_status: string
  uscis_description: string
  last_sync: string
}

export interface TaxMetadata {
  year: string
  form_type: string
  irs_confirmation: string
  notes: string
}

export interface InsuranceMetadata {
  policy_type: string
  term: string
  value: string
  carrier: string
  policy_number: string
  expiry_date: string
}

export interface AiMetadata {
  project_name: string
  phase: string
  next_milestone: string
  notes: string
}

export interface SiteContent {
  key: string
  value: string
  updated_at: string
  updated_by: string | null
}

export interface BlogPost {
  id: string
  slug: string
  title_en: string
  title_vi: string
  content_en: string
  content_vi: string
  cover_image_url: string | null
  category: 'tax' | 'insurance' | 'immigration' | 'ai' | 'general'
  published: boolean
  author_id: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 3: Create browser client**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Create server client**

Create `src/lib/supabase/server.ts`:
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
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 5: Write tests for Supabase type exports**

Create `src/lib/supabase/__tests__/types.test.ts`:
```typescript
import type { Profile, Service, ServiceType } from '../types'

// Type-level tests — if this file compiles, types are correct
const serviceType: ServiceType = 'uscis'
const profile: Partial<Profile> = { role: 'client' }
const service: Partial<Service> = { service_type: 'tax', status: 'In Progress' }

test('ServiceType includes all expected values', () => {
  const types: ServiceType[] = ['uscis', 'tax', 'insurance', 'ai']
  expect(types).toHaveLength(4)
})

test('Profile role is client or admin', () => {
  expect(['client', 'admin']).toContain(profile.role)
})
```

- [ ] **Step 6: Run type tests**

```bash
npx jest src/lib/supabase/__tests__/types.test.ts
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client files and database types"
```

---

## Task 3: Next.js Middleware (Route Protection)

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write middleware test**

Create `src/middleware.test.ts`:
```typescript
// Integration test — verify middleware logic for route matching
import { describe, test, expect } from '@jest/globals'

// Test the route matching logic in isolation
function isPortalRoute(pathname: string) {
  return pathname.startsWith('/portal')
}
function isAdminRoute(pathname: string) {
  return pathname.startsWith('/admin')
}
function isAuthRoute(pathname: string) {
  return ['/login', '/signup', '/forgot-password'].includes(pathname)
}

describe('route matching', () => {
  test('portal routes are protected', () => {
    expect(isPortalRoute('/portal/dashboard')).toBe(true)
    expect(isPortalRoute('/portal/services/uscis')).toBe(true)
    expect(isPortalRoute('/about')).toBe(false)
  })

  test('admin routes are protected', () => {
    expect(isAdminRoute('/admin/clients')).toBe(true)
    expect(isAdminRoute('/admin/blog')).toBe(true)
    expect(isAdminRoute('/contact')).toBe(false)
  })

  test('auth routes are not protected', () => {
    expect(isAuthRoute('/login')).toBe(true)
    expect(isAuthRoute('/signup')).toBe(true)
    expect(isAuthRoute('/portal/dashboard')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — confirm it passes (logic only)**

```bash
npx jest src/middleware.test.ts
```
Expected: PASS

- [ ] **Step 3: Create middleware**

Create `src/middleware.ts`:
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Unauthenticated users trying to access protected routes
  if (!user && (pathname.startsWith('/portal') || pathname.startsWith('/admin'))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated users: check role for admin routes
  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url))
    }
  }

  // Authenticated users visiting login/signup → redirect to dashboard
  if (user && ['/login', '/signup'].includes(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const redirectTo = profile?.role === 'admin' ? '/admin/clients' : '/portal/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|logo-og.png|llms.txt|robots.txt|sitemap.xml).*)',
  ],
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Next.js middleware for auth route protection"
```

---

## Task 4: Auth Pages (Login, Signup, Forgot Password)

**Files:**
- Create: `src/components/auth/AuthForm.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/forgot-password/page.tsx`

- [ ] **Step 1: Write auth form tests**

Create `src/components/auth/__tests__/AuthForm.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { AuthForm } from '../AuthForm'

test('renders email and password fields', () => {
  render(<AuthForm mode="login" onSubmit={async () => {}} />)
  expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
})

test('signup mode shows name and phone fields', () => {
  render(<AuthForm mode="signup" onSubmit={async () => {}} />)
  expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/phone/i)).toBeInTheDocument()
})

test('login mode does not show name field', () => {
  render(<AuthForm mode="login" onSubmit={async () => {}} />)
  expect(screen.queryByPlaceholderText(/full name/i)).not.toBeInTheDocument()
})

test('shows error message when provided', () => {
  render(<AuthForm mode="login" onSubmit={async () => {}} error="Invalid credentials" />)
  expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest src/components/auth/__tests__/AuthForm.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create AuthForm component**

Create `src/components/auth/AuthForm.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface AuthFormProps {
  mode: 'login' | 'signup'
  onSubmit: (data: { email: string; password: string; fullName?: string; phone?: string }) => Promise<void>
  error?: string
}

export function AuthForm({ mode, onSubmit, error }: AuthFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget
    const data = {
      email:    (form.elements.namedItem('email') as HTMLInputElement).value,
      password: (form.elements.namedItem('password') as HTMLInputElement).value,
      ...(mode === 'signup' && {
        fullName: (form.elements.namedItem('fullName') as HTMLInputElement).value,
        phone:    (form.elements.namedItem('phone') as HTMLInputElement).value,
      }),
    }
    await onSubmit(data)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'signup' && (
        <>
          <input
            name="fullName"
            required
            placeholder="Full Name"
            className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
          <input
            name="phone"
            placeholder="Phone Number"
            className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </>
      )}
      <input
        name="email"
        type="email"
        required
        placeholder="Email Address"
        className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Password"
        minLength={8}
        className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
      />
      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest src/components/auth/__tests__/AuthForm.test.tsx
```
Expected: 4 tests PASS

- [ ] **Step 5: Create Login page**

Create `src/app/(auth)/login/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AuthForm } from '@/components/auth/AuthForm'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [error, setError] = useState<string>()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin({ email, password }: { email: string; password: string }) {
    setError(undefined)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('role').single()
    router.push(profile?.role === 'admin' ? '/admin/clients' : '/portal/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Manna One Solution" width={120} height={48} className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-charcoal">Welcome back</h1>
          <p className="text-text-secondary text-sm mt-1">Sign in to your account</p>
        </div>
        <AuthForm mode="login" onSubmit={handleLogin} error={error} />
        <div className="mt-6 text-center space-y-2">
          <Link href="/forgot-password" className="text-teal text-sm hover:text-teal-dark block">
            Forgot your password?
          </Link>
          <p className="text-text-secondary text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="text-teal font-semibold hover:text-teal-dark">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create Signup page**

Create `src/app/(auth)/signup/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AuthForm } from '@/components/auth/AuthForm'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleSignup({ email, password, fullName, phone }: {
    email: string; password: string; fullName?: string; phone?: string
  }) {
    setError(undefined)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName ?? '' },
        emailRedirectTo: `${window.location.origin}/portal/dashboard`,
      },
    })
    if (error) {
      setError(error.message)
      return
    }
    // Update phone in profile
    if (phone) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ phone, full_name: fullName ?? '' }).eq('id', user.id)
      }
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-card p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-2xl font-bold text-charcoal mb-2">Check your email</h2>
          <p className="text-text-secondary">
            We sent you a confirmation link. Click it to activate your account and access your portal.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Manna One Solution" width={120} height={48} className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-charcoal">Create your account</h1>
          <p className="text-text-secondary text-sm mt-1">Track your cases and documents online</p>
        </div>
        <AuthForm mode="signup" onSubmit={handleSignup} error={error} />
        <p className="mt-6 text-center text-text-secondary text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-teal font-semibold hover:text-teal-dark">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create Forgot Password page**

Create `src/app/(auth)/forgot-password/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string>()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) { setError(error.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-card p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-bold text-charcoal mb-2">Reset link sent</h2>
          <p className="text-text-secondary text-sm">Check your email for a password reset link.</p>
          <Link href="/login" className="text-teal font-semibold mt-4 block hover:text-teal-dark">Back to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Manna One Solution" width={120} height={48} className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-charcoal">Reset your password</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email Address"
            className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" variant="primary" className="w-full">Send Reset Link</Button>
        </form>
        <Link href="/login" className="text-teal text-sm hover:text-teal-dark block text-center mt-4">
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Verify auth flow in browser**

```bash
npm run dev
```
1. Go to http://localhost:3000/signup — fill form, submit → see "Check your email" success screen
2. Check email → click confirmation link → should redirect to /portal/dashboard
3. Go to /login — sign in → should redirect to /portal/dashboard
4. Go to /logout (clear cookies in DevTools) → try /portal/dashboard → should redirect to /login

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add auth pages (login, signup, forgot-password) with Supabase"
```

---

## Task 5: Portal Layout & Status Components

**Files:**
- Create: `src/app/portal/layout.tsx`
- Create: `src/components/portal/StatusBadge.tsx`
- Create: `src/components/portal/ServiceCard.tsx`

- [ ] **Step 1: Write StatusBadge tests**

Create `src/components/portal/__tests__/StatusBadge.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'

test('renders status text', () => {
  render(<StatusBadge status="In Progress" />)
  expect(screen.getByText('In Progress')).toBeInTheDocument()
})

test('applies teal style for active statuses', () => {
  render(<StatusBadge status="In Progress" />)
  expect(screen.getByText('In Progress').className).toContain('teal')
})

test('applies green style for complete status', () => {
  render(<StatusBadge status="Complete" />)
  expect(screen.getByText('Complete').className).toContain('green')
})

test('applies gray for pending status', () => {
  render(<StatusBadge status="Pending" />)
  expect(screen.getByText('Pending').className).toContain('gray')
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest src/components/portal/__tests__/StatusBadge.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create StatusBadge component**

Create `src/components/portal/StatusBadge.tsx`:
```typescript
interface StatusBadgeProps {
  status: string
}

function getStatusStyle(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('complete') || s.includes('approved') || s.includes('active'))
    return 'bg-green-100 text-green-800 border-green-200'
  if (s.includes('progress') || s.includes('review') || s.includes('processing'))
    return 'bg-teal/10 text-teal border-teal/20'
  if (s.includes('waiting') || s.includes('awaiting') || s.includes('document'))
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  if (s.includes('denied') || s.includes('rejected') || s.includes('error'))
    return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(status)}`}>
      {status}
    </span>
  )
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest src/components/portal/__tests__/StatusBadge.test.tsx
```
Expected: 4 tests PASS

- [ ] **Step 5: Create ServiceCard component**

Create `src/components/portal/ServiceCard.tsx`:
```typescript
import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import type { Service } from '@/lib/supabase/types'

const SERVICE_LABELS: Record<string, { name: string; icon: string }> = {
  uscis:     { name: 'Immigration / USCIS',  icon: '🌏' },
  tax:       { name: 'Tax & Business',       icon: '📋' },
  insurance: { name: 'Insurance & Finance',  icon: '🛡️' },
  ai:        { name: 'AI & Automation',      icon: '🤖' },
}

export function ServiceCard({ service }: { service: Service }) {
  const label = SERVICE_LABELS[service.service_type] ?? { name: service.service_type, icon: '📁' }

  return (
    <Link href={`/portal/services/${service.service_type}?id=${service.id}`} className="block group">
      <div className="bg-white border border-border rounded-xl p-6 shadow-card hover:shadow-md hover:border-teal/30 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="text-3xl">{label.icon}</div>
          <StatusBadge status={service.status} />
        </div>
        <h3 className="font-bold text-charcoal group-hover:text-teal transition-colors mb-1">
          {label.name}
        </h3>
        <p className="text-text-secondary text-xs">
          Updated {new Date(service.updated_at).toLocaleDateString()}
        </p>
        <p className="text-teal text-sm font-medium mt-3">View details →</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 6: Create Portal layout (auth guard)**

Create `src/app/portal/layout.tsx`:
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen bg-bg-surface">
      {/* Portal top bar */}
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/portal/dashboard">
            <Image src="/logo.png" alt="Manna One Solution" width={100} height={40} className="h-8 w-auto" />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/portal/dashboard" className="text-sm text-text-secondary hover:text-teal font-medium">
              Dashboard
            </Link>
            <Link href="/portal/documents" className="text-sm text-text-secondary hover:text-teal font-medium">
              Documents
            </Link>
            <Link href="/" className="text-sm text-text-secondary hover:text-teal font-medium">
              ← Public Site
            </Link>
            <span className="text-sm text-charcoal font-semibold">{profile.full_name}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-10">
        {children}
      </main>
    </div>
  )
}

function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="POST">
      <button type="submit" className="text-sm text-text-secondary hover:text-red-600 transition-colors">
        Sign Out
      </button>
    </form>
  )
}
```

- [ ] **Step 7: Create sign-out API route**

Create `src/app/api/auth/signout/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add portal layout, StatusBadge, and ServiceCard components"
```

---

## Task 6: Portal Dashboard

**Files:**
- Create: `src/app/portal/dashboard/page.tsx`

- [ ] **Step 1: Create Portal Dashboard page**

Create `src/app/portal/dashboard/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { ServiceCard } from '@/components/portal/ServiceCard'
import { Button } from '@/components/ui/Button'
import type { Service } from '@/lib/supabase/types'

export default async function PortalDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('client_id', user!.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const activeServices = (services ?? []) as Service[]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal">
          Welcome, {profile?.full_name || 'there'}
        </h1>
        <p className="text-text-secondary mt-1">
          Here's a summary of your active services with Manna One Solution.
        </p>
      </div>

      {activeServices.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center shadow-card">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-charcoal mb-2">No active services yet</h2>
          <p className="text-text-secondary mb-6">
            Your services will appear here after your consultation with Manna One Solution.
          </p>
          <Button href="/contact" variant="primary">Book a Free Consultation</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeServices.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```
Sign in → should land on /portal/dashboard. Verify empty state shows. (Services will appear after admin adds them in Plan 3.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add portal dashboard with service cards"
```

---

## Task 7: Portal Service Detail Pages

**Files:**
- Create: `src/app/portal/services/[type]/page.tsx`
- Create: `src/components/portal/service-views/UscisView.tsx`
- Create: `src/components/portal/service-views/TaxView.tsx`
- Create: `src/components/portal/service-views/InsuranceView.tsx`
- Create: `src/components/portal/service-views/AiView.tsx`
- Create: `src/components/portal/DocumentList.tsx`

- [ ] **Step 1: Create DocumentList component**

Create `src/components/portal/DocumentList.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ServiceDocument } from '@/lib/supabase/types'

interface DocumentListProps {
  documents: ServiceDocument[]
  serviceId: string
  clientId: string
}

export function DocumentList({ documents, serviceId, clientId }: DocumentListProps) {
  const [uploading, setUploading] = useState(false)
  const [docs, setDocs] = useState(documents)
  const supabase = createClient()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const filePath = `${clientId}/${serviceId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
      const { data: doc } = await supabase
        .from('service_documents')
        .insert({
          service_id:  serviceId,
          file_name:   file.name,
          file_url:    urlData.publicUrl,
          uploaded_by: 'client',
        })
        .select()
        .single()
      if (doc) setDocs(prev => [...prev, doc as ServiceDocument])
    }
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-charcoal">Documents</h3>
        <label className="cursor-pointer text-sm text-teal font-semibold hover:text-teal-dark">
          {uploading ? 'Uploading...' : '+ Upload'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {docs.length === 0 ? (
        <p className="text-text-secondary text-sm">No documents yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map(doc => (
            <li key={doc.id} className="flex items-center justify-between bg-bg-surface border border-border rounded-lg px-4 py-3">
              <span className="text-sm text-charcoal truncate">{doc.file_name}</span>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal text-sm font-semibold hover:text-teal-dark ml-4 shrink-0"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create USCIS view component**

Create `src/components/portal/service-views/UscisView.tsx`:
```typescript
import type { UscisMetadata } from '@/lib/supabase/types'

export function UscisView({ metadata }: { metadata: UscisMetadata }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InfoField label="Receipt Number" value={metadata.receipt_number} />
        <InfoField label="Case Type"      value={metadata.case_type} />
        <InfoField label="USCIS Status"   value={metadata.uscis_status} />
        <InfoField label="Last Synced"    value={metadata.last_sync ? new Date(metadata.last_sync).toLocaleDateString() : 'Never'} />
      </div>
      {metadata.uscis_description && (
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
          <p className="text-sm font-semibold text-charcoal mb-1">Status Details</p>
          <p className="text-text-secondary text-sm">{metadata.uscis_description}</p>
        </div>
      )}
      <p className="text-xs text-silver">
        Case status is automatically synced daily from USCIS.gov. For urgent inquiries call 346-852-4454.
      </p>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-silver font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-charcoal font-semibold">{value || '—'}</p>
    </div>
  )
}
```

- [ ] **Step 3: Create Tax view component**

Create `src/components/portal/service-views/TaxView.tsx`:
```typescript
import type { TaxMetadata } from '@/lib/supabase/types'

export function TaxView({ metadata }: { metadata: TaxMetadata }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { label: 'Tax Year',           value: metadata.year },
        { label: 'Form Type',          value: metadata.form_type },
        { label: 'IRS Confirmation #', value: metadata.irs_confirmation },
        { label: 'Notes',              value: metadata.notes },
      ].map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-silver font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-charcoal font-semibold">{value || '—'}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create Insurance view component**

Create `src/components/portal/service-views/InsuranceView.tsx`:
```typescript
import type { InsuranceMetadata } from '@/lib/supabase/types'

export function InsuranceView({ metadata }: { metadata: InsuranceMetadata }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { label: 'Policy Type',   value: metadata.policy_type },
        { label: 'Term',          value: metadata.term },
        { label: 'Coverage Value',value: metadata.value },
        { label: 'Carrier',       value: metadata.carrier },
        { label: 'Policy Number', value: metadata.policy_number },
        { label: 'Expiry Date',   value: metadata.expiry_date },
      ].map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-silver font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-charcoal font-semibold">{value || '—'}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create AI view component**

Create `src/components/portal/service-views/AiView.tsx`:
```typescript
import type { AiMetadata } from '@/lib/supabase/types'

export function AiView({ metadata }: { metadata: AiMetadata }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Project Name',    value: metadata.project_name },
          { label: 'Current Phase',   value: metadata.phase },
          { label: 'Next Milestone',  value: metadata.next_milestone },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-silver font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className="text-charcoal font-semibold">{value || '—'}</p>
          </div>
        ))}
      </div>
      {metadata.notes && (
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
          <p className="text-sm font-semibold text-charcoal mb-1">Notes</p>
          <p className="text-text-secondary text-sm">{metadata.notes}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create service detail page**

Create `src/app/portal/services/[type]/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/portal/StatusBadge'
import { DocumentList } from '@/components/portal/DocumentList'
import { UscisView }     from '@/components/portal/service-views/UscisView'
import { TaxView }       from '@/components/portal/service-views/TaxView'
import { InsuranceView } from '@/components/portal/service-views/InsuranceView'
import { AiView }        from '@/components/portal/service-views/AiView'
import type { Service, ServiceDocument, UscisMetadata, TaxMetadata, InsuranceMetadata, AiMetadata } from '@/lib/supabase/types'

function renderServiceView(service: Service) {
  switch (service.service_type) {
    case 'uscis':     return <UscisView     metadata={service.metadata as unknown as UscisMetadata} />
    case 'tax':       return <TaxView       metadata={service.metadata as unknown as TaxMetadata} />
    case 'insurance': return <InsuranceView metadata={service.metadata as unknown as InsuranceMetadata} />
    case 'ai':        return <AiView        metadata={service.metadata as unknown as AiMetadata} />
    default:          return <pre className="text-xs">{JSON.stringify(service.metadata, null, 2)}</pre>
  }
}

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: { type: string }
  searchParams: { id?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Get specific service by id or first of this type
  let query = supabase
    .from('services')
    .select('*')
    .eq('client_id', user.id)
    .eq('service_type', params.type)

  if (searchParams.id) query = query.eq('id', searchParams.id)

  const { data } = await query.order('created_at', { ascending: false }).limit(1).single()
  if (!data) notFound()

  const service = data as Service

  const { data: documents } = await supabase
    .from('service_documents')
    .select('*')
    .eq('service_id', service.id)
    .order('created_at', { ascending: false })

  const SERVICE_NAMES: Record<string, string> = {
    uscis: 'Immigration / USCIS', tax: 'Tax & Business',
    insurance: 'Insurance & Finance', ai: 'AI & Automation',
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">
            {SERVICE_NAMES[service.service_type] ?? service.service_type}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Opened {new Date(service.created_at).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={service.status} />
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-card mb-6">
        <h2 className="font-bold text-charcoal mb-4">Service Details</h2>
        {renderServiceView(service)}
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-card">
        <DocumentList
          documents={(documents ?? []) as ServiceDocument[]}
          serviceId={service.id}
          clientId={user.id}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add portal service detail pages with extensible service views"
```

---

## Task 8: Portal Documents Page

**Files:**
- Create: `src/app/portal/documents/page.tsx`

- [ ] **Step 1: Create documents page**

Create `src/app/portal/documents/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import type { Service, ServiceDocument } from '@/lib/supabase/types'

export default async function PortalDocumentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: services } = await supabase
    .from('services')
    .select('id, service_type')
    .eq('client_id', user!.id)

  const serviceIds = (services ?? []).map((s: Pick<Service, 'id' | 'service_type'>) => s.id)

  const SERVICE_NAMES: Record<string, string> = {
    uscis: 'Immigration / USCIS', tax: 'Tax & Business',
    insurance: 'Insurance & Finance', ai: 'AI & Automation',
  }

  const { data: documents } = serviceIds.length > 0
    ? await supabase
        .from('service_documents')
        .select('*, services(service_type)')
        .in('service_id', serviceIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div>
      <h1 className="text-2xl font-bold text-charcoal mb-8">All Documents</h1>

      {!documents || documents.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center shadow-card">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-text-secondary">No documents yet. Upload documents from each service's detail page.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-secondary border-b border-border">
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">File</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">Service</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">Uploaded By</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc: ServiceDocument & { services: { service_type: string } }) => (
                <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-bg-surface">
                  <td className="px-6 py-4 text-sm text-charcoal">{doc.file_name}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {SERVICE_NAMES[doc.services?.service_type] ?? doc.services?.service_type}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      doc.uploaded_by === 'admin'
                        ? 'bg-teal/10 text-teal'
                        : 'bg-bg-secondary text-text-secondary'
                    }`}>
                      {doc.uploaded_by === 'admin' ? 'Manna' : 'You'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-silver">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      className="text-teal text-sm font-semibold hover:text-teal-dark">
                      Download
                    </a>
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

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add portal documents page with all-services view"
```

---

## Task 9: USCIS Status Display Verification

> **Architecture note:** MannaOS.com does NOT poll USCIS.gov. The internal staff app (`app.mannaonesolution.com`) runs a Playwright agent on a dedicated VPS daily, scrapes each receipt number's status, and writes updates to the shared Supabase DB (`services` + `uscis_sync_log` tables). This website is a pure read consumer — no cron, no scraping, no USCIS API calls.

This task verifies the USCIS data flows correctly from DB → portal, and seeds test data to confirm the display works end-to-end.

**Files:**
- No new files — verifying Tasks 6 and 7 read correctly from shared DB

- [ ] **Step 1: Seed a test USCIS service row via Supabase dashboard**

In Supabase Dashboard → Table Editor → `services`, insert a test row:
```json
{
  "client_id": "<your own user id from auth.users>",
  "service_type": "uscis",
  "status": "Case Was Received",
  "metadata": {
    "receipt_number": "IOE1234567890",
    "case_type": "N-400",
    "uscis_status": "Case Was Received",
    "uscis_description": "On April 10, 2026, we received your Form N-400.",
    "last_sync": "2026-04-10T06:00:00.000Z"
  }
}
```

- [ ] **Step 2: Seed a test uscis_sync_log row**

In Supabase Dashboard → Table Editor → `uscis_sync_log`, insert:
```json
{
  "service_id": "<id from step 1>",
  "status_text": "Case Was Received",
  "raw_response": "On April 10, 2026, we received your Form N-400."
}
```

- [ ] **Step 3: Verify portal dashboard shows USCIS card**

```bash
npm run dev
```
Log in as the test client. Navigate to `/portal/dashboard`.
Confirm: USCIS service card appears with status badge "Case Was Received" and last updated date.

- [ ] **Step 4: Verify USCIS detail page**

Navigate to `/portal/services/uscis`.
Confirm:
- Receipt number `IOE1234567890` displayed
- Status "Case Was Received" shown prominently
- Last synced timestamp reads "2026-04-10, 6:00 AM"
- Status history timeline shows one entry

- [ ] **Step 5: Verify stale data is clearly labeled**

The `last_sync` timestamp must always be visible. If the staff app hasn't run yet (data is old), the client sees when the data was last updated — they are never shown stale data without knowing it.

Confirm: `UscisView.tsx` renders the `last_sync` field from `metadata` as a human-readable string. If missing, shows "Not yet synced."

- [ ] **Step 6: Clean up seed data**

Delete the test rows from `uscis_sync_log` and `services` in Supabase dashboard. Real data will be populated by the internal staff app (separate project).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "verify: USCIS portal display reads correctly from shared Supabase DB"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Supabase DB schema (all tables) | Task 1 |
| Row Level Security | Task 1 |
| Supabase Storage buckets | Task 1 |
| Supabase browser + server clients | Task 2 |
| Route protection middleware | Task 3 |
| Client signup (low friction) | Task 4 |
| Login / forgot password | Task 4 |
| Email verification | Task 4 (Supabase handles) |
| Role-based redirect after login | Task 3, 4 |
| Portal layout with nav | Task 5 |
| Sign out | Task 5 |
| Dashboard — service cards | Task 6 |
| Empty state CTA | Task 6 |
| Service detail — extensible by type | Task 7 |
| USCIS detail view | Task 7 |
| Tax / Insurance / AI views | Task 7 |
| Document upload (client) | Task 7 |
| Document download | Task 7, 8 |
| All documents page | Task 8 |
| USCIS status display (reads from shared DB) | Task 7, 9 |
| Last-synced timestamp visible to client | Task 7, 9 |
| USCIS data populated by internal staff app (not this website) | Architecture — no code needed |

**Out of scope for Plan 2 (handled in Plan 3):**
- Admin adding services to clients
- Admin uploading documents
- Blog management
- Content editor
