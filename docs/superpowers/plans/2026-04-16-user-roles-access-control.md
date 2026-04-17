# User Roles & Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a unified 3-role system (`admin` / `staff` / `client`) across both apps with role-based routing on login and permission enforcement.

**Architecture:** The shared Supabase `profiles` table holds the canonical role. Both middlewares query it on protected requests and forward the role via an `x-user-role` response header to avoid a second DB round-trip in layouts. Post-login redirect is handled at the login page (fetches profile after sign-in, redirects based on role).

**Tech Stack:** Next.js 16 (website), Next.js 14 (internal app), `@supabase/ssr` (already installed in both), Supabase Postgres migrations, TypeScript.

**Spec:** `docs/superpowers/specs/2026-04-16-user-roles-design.md`

---

## File Map

**Created:**
- `apps/internal_app/supabase/migrations/003_role_unification.sql` — rename roles, add CHECK, auto-create profile trigger
- `apps/internal_app/supabase/migrations/004_client_user_link.sql` — `user_id` on `clients` + RLS for client self-access

**Modified:**
- `apps/internal_app/src/types/index.ts` — `UserRole: 'staff' | 'admin'`
- `apps/website/src/components/providers/AuthProvider.tsx` — `Profile.role: "admin" | "staff" | "client"`
- `apps/website/src/middleware.ts` — layer auth guard on top of existing i18n logic
- `apps/internal_app/src/middleware.ts` — add role guard, block `client` accounts
- `apps/website/src/app/[locale]/(auth)/login/page.tsx` — role-based redirect after sign-in
- `apps/internal_app/src/app/(auth)/login/page.tsx` — show client redirect error banner
- `apps/internal_app/src/app/(app)/layout.tsx` — hide Jobs nav for staff, update role labels
- `apps/website/src/app/[locale]/portal/page.tsx` — rebuild with My Services + Explore Services tabs

---

## Task 1: DB Migration — Role Unification

**Files:**
- Create: `apps/internal_app/supabase/migrations/003_role_unification.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 003_role_unification.sql
-- Unify role values across shared profiles table and internal users table

-- ============================================================
-- PROFILES TABLE (shared by both apps)
-- ============================================================

-- Rename stale role values
UPDATE public.profiles SET role = 'admin'  WHERE role = 'ultimate_admin';
UPDATE public.profiles SET role = 'client' WHERE role = 'user';

-- Replace CHECK constraint (drop first to be idempotent)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'staff', 'client'));

-- Default role for new website signups
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'client';

-- ============================================================
-- USERS TABLE (internal app staff accounts)
-- ============================================================

UPDATE public.users SET role = 'admin' WHERE role = 'ultimate_admin';

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff'));

-- ============================================================
-- RLS HELPERS — body updated to check 'admin' (name kept to avoid
-- breaking existing policy references)
-- ============================================================

CREATE OR REPLACE FUNCTION is_ultimate_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Ensures website signups get a profiles row with role = 'client'
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 2: Run in Supabase dashboard**

Log into https://supabase.com → your project → SQL Editor → paste and run the file.

Verify: `SELECT DISTINCT role FROM public.profiles;` → should only show values from `{admin, staff, client}`.

Verify: `SELECT DISTINCT role FROM public.users;` → should only show `{admin, staff}`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add apps/internal_app/supabase/migrations/003_role_unification.sql
git commit -m "feat(db): unify role values to admin/staff/client, add signup trigger"
```

---

## Task 2: DB Migration — Link Clients to Auth Users

This allows the website portal to query a client's cases by their auth account.

**Files:**
- Create: `apps/internal_app/supabase/migrations/004_client_user_link.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 004_client_user_link.sql
-- Add user_id to clients table so website portal can join client records
-- to auth accounts, and add RLS policies for client self-access.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Client can read their own client record
CREATE POLICY "Client can read own record" ON public.clients
  FOR SELECT USING (user_id = auth.uid());

-- Client can read their own cases (via their linked client record)
CREATE POLICY "Client can read own cases" ON public.cases
  FOR SELECT USING (
    primary_client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- Client can read jobs under their own client record
CREATE POLICY "Client can read own jobs" ON public.jobs
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Run in Supabase dashboard**

SQL Editor → paste and run the file.

Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'user_id';` → 1 row returned.

- [ ] **Step 3: Link existing clients to their auth accounts (manual admin step)**

In Supabase Table Editor → `clients` → for each client that has created an account, set their `user_id` to the matching `auth.users.id`. New clients linked going forward automatically once staff sets the field when onboarding.

- [ ] **Step 4: Commit**

```bash
git add apps/internal_app/supabase/migrations/004_client_user_link.sql
git commit -m "feat(db): add user_id to clients, client self-access RLS policies"
```

---

## Task 3: Update TypeScript Types

**Files:**
- Modify: `apps/internal_app/src/types/index.ts`
- Modify: `apps/website/src/components/providers/AuthProvider.tsx`

- [ ] **Step 1: Update internal app UserRole**

In `apps/internal_app/src/types/index.ts`, replace line 1:

```ts
// Before:
export type UserRole = 'staff' | 'ultimate_admin'

// After:
export type UserRole = 'staff' | 'admin'
```

- [ ] **Step 2: Update website Profile interface**

In `apps/website/src/components/providers/AuthProvider.tsx`, replace the `role` line inside the `Profile` interface (line 11):

```ts
// Before:
  role: "user" | "admin";

// After:
  role: "admin" | "staff" | "client";
```

- [ ] **Step 3: Type-check both apps**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/apps/internal_app" && npx tsc --noEmit
cd "../website" && npx tsc --noEmit
```

Expected: No errors referencing `ultimate_admin` or `user` role values.

- [ ] **Step 4: Commit**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add apps/internal_app/src/types/index.ts apps/website/src/components/providers/AuthProvider.tsx
git commit -m "feat(types): unify UserRole to admin/staff/client in both apps"
```

---

## Task 4: Website Middleware — Add Auth Layer

The existing middleware only handles i18n. Extend it to also guard `/[locale]/admin/*` and `/[locale]/portal/*`.

**Files:**
- Modify: `apps/website/src/middleware.ts`

- [ ] **Step 1: Replace the entire middleware file**

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n/config';

const SKIP_PREFIXES = ['/_next', '/api', '/images'];
const SKIP_EXACT = ['/favicon.ico', '/robots.txt', '/sitemap.xml', '/llms.txt'];
const ADMIN_RE = /^\/[a-z]{2}\/admin(\/|$)/;
const PORTAL_RE = /^\/[a-z]{2}\/portal(\/|$)/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    SKIP_PREFIXES.some((p) => pathname.startsWith(p)) ||
    SKIP_EXACT.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // ── Step 1: i18n — redirect to locale-prefixed path if missing ──
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    const acceptLanguage = request.headers.get('accept-language') || '';
    const preferredLocale = acceptLanguage.toLowerCase().includes('vi') ? 'vi' : defaultLocale;
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const locale =
      cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])
        ? cookieLocale
        : preferredLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // ── Step 2: Auth guard — only /admin and /portal need protection ──
  const isAdminPath = ADMIN_RE.test(pathname);
  const isPortalPath = PORTAL_RE.test(pathname);

  if (!isAdminPath && !isPortalPath) {
    return NextResponse.next();
  }

  const locale = pathname.split('/')[1];

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string | undefined;

  if (isAdminPath && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (isPortalPath && role !== 'client') {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  supabaseResponse.headers.set('x-user-role', role ?? '');
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next|api|images|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)'],
};
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/apps/website" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add apps/website/src/middleware.ts
git commit -m "feat(website/middleware): add role-based auth guard for /admin and /portal"
```

---

## Task 5: Website Login Page — Role-Based Redirect

After sign-in, fetch the profile and redirect: `admin → /[locale]/admin`, `client → /[locale]/portal`, `staff → block with message`.

**Files:**
- Modify: `apps/website/src/app/[locale]/(auth)/login/page.tsx`

- [ ] **Step 1: Add supabase import**

In `apps/website/src/app/[locale]/(auth)/login/page.tsx`, add this import after the existing imports:

```ts
import { supabase } from "@/lib/supabase";
```

- [ ] **Step 2: Replace handleSubmit**

Replace the existing `handleSubmit` function (lines 21–34) with:

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError(null);
  setLoading(true);

  const { error: err } = await signIn(email, password);
  if (err) {
    setError(err);
    setLoading(false);
    return;
  }

  // Fetch role to determine redirect destination
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;

  if (!userId) {
    setError('Sign in failed. Please try again.');
    setLoading(false);
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const role = profile?.role;

  if (role === 'staff') {
    await supabase.auth.signOut();
    setError('Staff members sign in via the internal app, not this website.');
    setLoading(false);
    return;
  }

  router.push(role === 'admin' ? `/${locale}/admin` : `/${locale}/portal`);
}
```

- [ ] **Step 3: Type-check**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/apps/website" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add "apps/website/src/app/[locale]/(auth)/login/page.tsx"
git commit -m "feat(website/login): redirect to /admin or /portal based on role after sign-in"
```

---

## Task 6: Internal App Middleware — Role Guard

Block `client` accounts from the internal app entirely, forward role header for layouts.

**Files:**
- Modify: `apps/internal_app/src/middleware.ts`

- [ ] **Step 1: Replace the entire middleware file**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login')

  // Not logged in
  if (!user) {
    if (!isAuthPage) return NextResponse.redirect(new URL('/login', request.url))
    return supabaseResponse
  }

  // Logged in — single profile query covers all branches below
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined

  // Client accounts do not belong in the internal app
  if (role === 'client') {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'client_redirect')
    return NextResponse.redirect(url)
  }

  // Logged-in admin/staff visiting login → send to dashboard
  if (isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Block staff from routes they cannot access
  const STAFF_BLOCKED = ['/jobs']
  if (role === 'staff' && STAFF_BLOCKED.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Attach role to response header for use in layouts
  supabaseResponse.headers.set('x-user-role', role ?? '')
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/apps/internal_app" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add apps/internal_app/src/middleware.ts
git commit -m "feat(internal/middleware): block client accounts, forward x-user-role header"
```

---

## Task 7: Internal App Login Page — Client Error Banner

Show a friendly redirect message when a client tries to log in here.

**Files:**
- Modify: `apps/internal_app/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Add Suspense and useSearchParams imports**

Replace the top import block:

```ts
'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
```

- [ ] **Step 2: Rename component and add Suspense wrapper**

Rename the existing default export function from `LoginPage` to `LoginForm`. Then add a new default export at the bottom of the file:

```ts
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
```

- [ ] **Step 3: Read the error param inside LoginForm**

Inside `LoginForm`, add after the existing `const router = useRouter()` line:

```ts
const searchParams = useSearchParams()
const isClientRedirect = searchParams.get('error') === 'client_redirect'
```

- [ ] **Step 4: Add client redirect banner to JSX**

Place this block immediately above the existing `{error && ...}` error banner (around line 80 after the rename):

```tsx
{isClientRedirect && (
  <div className="w-full mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <p className="text-sm text-amber-700 font-medium">
      Client accounts sign in at{' '}
      <a
        href="https://mannaos.com"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-bold"
      >
        mannaos.com
      </a>
      .
    </p>
  </div>
)}
```

- [ ] **Step 5: Type-check**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/apps/internal_app" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add "apps/internal_app/src/app/(auth)/login/page.tsx"
git commit -m "feat(internal/login): show redirect message for client accounts"
```

---

## Task 8: Internal App Layout — Conditional Nav + Updated Labels

Hide the Jobs nav item for staff; update role labels to use new names.

**Files:**
- Modify: `apps/internal_app/src/app/(app)/layout.tsx`

- [ ] **Step 1: Update isAdmin check (line 41)**

```ts
// Before:
const isAdmin = profile?.role === 'ultimate_admin'

// After:
const isAdmin = profile?.role === 'admin'
```

- [ ] **Step 2: Replace visibleNav (line 50)**

```ts
// Before:
const visibleNav = NAV_ITEMS

// After:
const visibleNav = isAdmin
  ? NAV_ITEMS
  : NAV_ITEMS.filter((item) => item.href !== '/jobs')
```

- [ ] **Step 3: Update role label display (line 99)**

```tsx
// Before:
{isAdmin ? 'Ultimate Admin' : 'Immigration Staff'}

// After:
{isAdmin ? 'Admin' : 'Staff'}
```

- [ ] **Step 4: Type-check**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/apps/internal_app" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add "apps/internal_app/src/app/(app)/layout.tsx"
git commit -m "feat(internal/layout): hide Jobs nav for staff, update role display labels"
```

---

## Task 9: Website Portal Page — My Services + Explore Services

Rebuild the portal page with two tabs: "My Services" (active jobs grouped by service type) and "Explore Services" (unenrolled services with Learn More + Request Consultation CTA).

**Files:**
- Modify: `apps/website/src/app/[locale]/portal/page.tsx`

- [ ] **Step 1: Check NEXT_PUBLIC_CALENDLY_URL env var**

Open `apps/website/.env.local` (or Vercel environment variables). If a Calendly URL is set, confirm its key is `NEXT_PUBLIC_CALENDLY_URL`. If not set, the page falls back to `https://calendly.com/mannaonesolution`.

- [ ] **Step 2: Replace the entire portal page file**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Briefcase,
  Compass,
  AlertCircle,
  ChevronRight,
  FileText,
  Shield,
  Brain,
  Calculator,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

type ServiceType = "immigration" | "tax" | "insurance" | "ai";

interface ServiceJob {
  id: string;
  service_type: ServiceType;
  description: string;
  status: string;
  updated_at: string;
}

const SERVICE_META: Record<
  ServiceType,
  {
    label: string;
    icon: React.ElementType;
    infoPath: string;
    statuses: Record<string, { color: string; label: string }>;
  }
> = {
  immigration: {
    label: "Immigration",
    icon: FileText,
    infoPath: "/services/immigration",
    statuses: {
      documents_pending: { color: "bg-yellow-100 text-yellow-700", label: "Documents Pending" },
      ready_to_file: { color: "bg-blue-100 text-blue-700", label: "Ready to File" },
      submitted: { color: "bg-indigo-100 text-indigo-700", label: "Submitted" },
      receipt_received: { color: "bg-purple-100 text-purple-700", label: "Receipt Received" },
      in_progress: { color: "bg-purple-100 text-purple-700", label: "In Review" },
      rfe_issued: { color: "bg-red-100 text-red-700", label: "Action Required" },
      approved: { color: "bg-green-100 text-green-700", label: "Approved" },
      denied: { color: "bg-red-600 text-white", label: "Denied" },
    },
  },
  tax: {
    label: "Tax Services",
    icon: Calculator,
    infoPath: "/services/tax",
    statuses: {
      open: { color: "bg-yellow-100 text-yellow-700", label: "Documents Needed" },
      in_progress: { color: "bg-blue-100 text-blue-700", label: "In Progress" },
      complete: { color: "bg-green-100 text-green-700", label: "Filed & Complete" },
    },
  },
  insurance: {
    label: "Insurance",
    icon: Shield,
    infoPath: "/services/insurance",
    statuses: {
      open: { color: "bg-blue-100 text-blue-700", label: "Active" },
      in_progress: { color: "bg-yellow-100 text-yellow-700", label: "Renewal Due" },
      complete: { color: "bg-gray-100 text-gray-700", label: "Expired" },
    },
  },
  ai: {
    label: "AI Services",
    icon: Brain,
    infoPath: "/services/ai",
    statuses: {
      open: { color: "bg-purple-100 text-purple-700", label: "Pending Setup" },
      in_progress: { color: "bg-purple-100 text-purple-700", label: "Pending Setup" },
      complete: { color: "bg-green-100 text-green-700", label: "Active" },
    },
  },
};

const ALL_SERVICES: ServiceType[] = ["immigration", "tax", "insurance", "ai"];

const EXPLORE_DESCRIPTIONS: Record<ServiceType, string> = {
  immigration: "Green cards, naturalization, work permits, family petitions, and more.",
  tax: "Personal and business tax filing, ITIN, and year-round bookkeeping.",
  insurance: "Health, auto, and life insurance plans tailored for immigrants.",
  ai: "AI-powered tools to streamline your business operations.",
};

const CALENDLY_FALLBACK = "https://calendly.com/mannaonesolution";

export default function PortalPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const { user, profile } = useAuth();

  const [tab, setTab] = useState<"my-services" | "explore">("my-services");
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;

    // Resolve the client record linked to this auth account
    const { data: clientRecord } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!clientRecord) {
      setLoading(false);
      return;
    }

    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, service_type, description, status, updated_at")
      .eq("client_id", clientRecord.id)
      .order("updated_at", { ascending: false });

    setJobs((jobsData as ServiceJob[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const enrolledServices = [
    ...new Set(jobs.map((j) => j.service_type)),
  ] as ServiceType[];
  const availableServices = ALL_SERVICES.filter(
    (s) => !enrolledServices.includes(s)
  );
  const displayName = profile?.full_name || user?.email || "";
  const calendlyUrl =
    process.env.NEXT_PUBLIC_CALENDLY_URL ?? CALENDLY_FALLBACK;

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-charcoal mb-1">My Portal</h1>
        <p className="text-muted-foreground mb-6">
          Welcome back,{" "}
          <span className="font-semibold text-charcoal">{displayName}</span>
        </p>

        <div className="bg-teal-light border border-primary/20 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            {locale === "vi"
              ? "Theo dõi trạng thái dịch vụ của bạn tại đây."
              : "Track your active services and discover new ones below."}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted mb-8">
          <button
            onClick={() => setTab("my-services")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "my-services"
                ? "bg-white text-charcoal shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            My Services
            {enrolledServices.length > 0 && (
              <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {enrolledServices.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("explore")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "explore"
                ? "bg-white text-charcoal shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Compass className="h-4 w-4" />
            Explore Services
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tab === "my-services" ? (
          <MyServicesTab
            enrolledServices={enrolledServices}
            jobs={jobs}
            locale={locale}
            onExplore={() => setTab("explore")}
          />
        ) : (
          <ExploreServicesTab
            availableServices={availableServices}
            locale={locale}
            calendlyUrl={calendlyUrl}
          />
        )}
      </div>
    </div>
  );
}

function MyServicesTab({
  enrolledServices,
  jobs,
  locale,
  onExplore,
}: {
  enrolledServices: ServiceType[];
  jobs: ServiceJob[];
  locale: string;
  onExplore: () => void;
}) {
  if (enrolledServices.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-teal-light flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-semibold text-charcoal mb-2">
          No active services yet
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {locale === "vi"
            ? "Khám phá các dịch vụ của chúng tôi."
            : "Explore what we offer and book a free consultation to get started."}
        </p>
        <button
          onClick={onExplore}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors"
        >
          <Compass className="h-4 w-4" />
          Explore Services
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {enrolledServices.map((serviceType) => {
        const meta = SERVICE_META[serviceType];
        const Icon = meta.icon;
        const serviceJobs = jobs.filter((j) => j.service_type === serviceType);

        return (
          <div
            key={serviceType}
            className="bg-white rounded-xl border border-border overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-charcoal">{meta.label}</h3>
            </div>
            <div className="divide-y divide-border">
              {serviceJobs.map((job) => {
                const statusCfg = meta.statuses[job.status] ?? {
                  color: "bg-gray-100 text-gray-700",
                  label: job.status,
                };
                return (
                  <div
                    key={job.id}
                    className="px-5 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-charcoal line-clamp-1">
                        {job.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Updated {new Date(job.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`ml-4 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.color}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExploreServicesTab({
  availableServices,
  locale,
  calendlyUrl,
}: {
  availableServices: ServiceType[];
  locale: string;
  calendlyUrl: string;
}) {
  if (availableServices.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <Compass className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="font-semibold text-charcoal mb-2">You&#39;re all set!</h3>
        <p className="text-muted-foreground text-sm">
          You&#39;re enrolled in all of our services.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {availableServices.map((serviceType) => {
        const meta = SERVICE_META[serviceType];
        const Icon = meta.icon;
        const bookingUrl = `${calendlyUrl}?utm_source=portal&utm_medium=explore&utm_campaign=${serviceType}`;

        return (
          <div
            key={serviceType}
            className="bg-white rounded-xl border border-border p-5 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-charcoal">{meta.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4 flex-1">
              {EXPLORE_DESCRIPTIONS[serviceType]}
            </p>
            <div className="flex items-center gap-3 mt-auto">
              <Link
                href={`/${locale}${meta.infoPath}`}
                className="flex items-center gap-1 text-sm text-primary font-medium hover:underline"
              >
                Learn More
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors"
              >
                Request Consultation
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/apps/website" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add "apps/website/src/app/[locale]/portal/page.tsx"
git commit -m "feat(website/portal): rebuild with My Services and Explore Services tabs"
```

---

## Manual Verification Checklist

After all tasks are complete, verify the following flows:

**As Admin (website):**
- [ ] Navigate to `mannaos.com/en/login` → sign in → lands on `/en/admin` ✅
- [ ] Navigate to `/en/portal` while signed in as admin → redirected to `/en/login` ✅

**As Client (website):**
- [ ] Sign up → auto-gets `role = 'client'` profile ✅
- [ ] Sign in → lands on `/en/portal` with My Services tab ✅
- [ ] Navigate to `/en/admin` while signed in → redirected to `/en/login` ✅
- [ ] My Services shows empty state if no linked client record ✅
- [ ] Explore Services shows all 4 cards ✅

**As Staff (internal app):**
- [ ] Sign in → lands on `/dashboard` ✅
- [ ] Sidebar shows: Dashboard, Cases, Clients, USCIS Tracker, Notifications, PDF Generator — **no Jobs** ✅
- [ ] Role label shows "Staff" (not "Ultimate Admin") ✅
- [ ] Attempting to visit `/jobs` directly → middleware redirects to `/dashboard` ✅

**As Client (internal app):**
- [ ] Sign in → redirected to `/login?error=client_redirect` ✅
- [ ] Error banner shows with link to mannaos.com ✅

**As Staff (website):**
- [ ] Sign in → error message shown, user is signed out, stays on login page ✅
