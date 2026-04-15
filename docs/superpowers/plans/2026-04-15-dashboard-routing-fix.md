# Dashboard Routing & Search Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three bugs in the internal app dashboard: (1) an invisible full-screen overlay link causing all clicks to 404, (2) stat cards with no navigation, (3) a non-functional search bar.

**Architecture:** The overlay bug is caused by `absolute inset-0` on a `<Link>` inside a `<tr className="relative">` — CSS absolute positioning inside table rows is not reliably contained in all browsers, so the link escapes and covers the entire main content area. Fix by extracting the table into a `'use client'` component using `useRouter` on `<tr onClick>`. Stat cards get `<Link>` wrappers. Search bar becomes a separate `'use client'` component mounted in the server layout.

**Tech Stack:** Next.js App Router, React Server Components, `'use client'` boundary, `next/link`, `next/navigation` (`useRouter`, `usePathname`), Tailwind CSS.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/internal_app/src/components/dashboard/RecentCasesTable.tsx` | **Create** | Client component: renders clickable case rows using `useRouter`, no overlay hack |
| `apps/internal_app/src/app/(app)/dashboard/page.tsx` | **Modify** | Import RecentCasesTable; wrap 4 stat cards in `<Link>`; fix USCIS alert className |
| `apps/internal_app/src/components/layout/SearchBar.tsx` | **Create** | Client component: controlled input + `useRouter` navigate to `/clients?q=` |
| `apps/internal_app/src/app/(app)/layout.tsx` | **Modify** | Replace raw `<input>` with `<SearchBar />` |

---

## Task 1: Create `RecentCasesTable` client component (fixes the 404 overlay bug)

**Root cause:** `dashboard/page.tsx` line 144 places `<Link className="absolute inset-0 z-10">` inside a `<td>`. The parent `<tr className="relative">` is supposed to contain it, but `position: relative` on table row elements does not create a reliable CSS containing block in all browsers. The link ends up positioned relative to a higher ancestor (`<main>` or the outer `<div>`), creating a giant invisible clickable zone that intercepts every click on the right side of the screen.

**Fix:** Make each `<tr>` navigate via `onClick` + `useRouter`. No invisible overlay links needed.

**Files:**
- Create: `apps/internal_app/src/components/dashboard/RecentCasesTable.tsx`
- Modify: `apps/internal_app/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create `RecentCasesTable.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'

interface CaseRow {
  id: string
  status: string
  created_at: string
  primary_client: { first_name: string; last_name: string; id: string } | null
  case_forms: { form_type: string }[]
}

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function RecentCasesTable({ cases }: { cases: CaseRow[] }) {
  const router = useRouter()

  return (
    <table className="w-full text-left">
      <thead className="bg-surface-container-low/50">
        <tr>
          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client Name</th>
          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Forms</th>
          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Updated</th>
        </tr>
      </thead>
      <tbody className="divide-y-0">
        {cases.map((c) => {
          const initials = `${c.primary_client?.first_name?.[0] ?? ''}${c.primary_client?.last_name?.[0] ?? ''}`.toUpperCase()
          const formsDesc = c.case_forms.map((f) => f.form_type.toUpperCase()).join(', ') || 'N/A'
          const isUrgent = c.status === 'rfe_issued'

          return (
            <tr
              key={c.id}
              className="hover:bg-surface-container-high transition-colors cursor-pointer"
              onClick={() => router.push(`/cases/${c.id}`)}
            >
              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">{initials}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.primary_client?.first_name} {c.primary_client?.last_name}</p>
                    <p className="text-[11px] text-slate-400 truncate w-32">#{c.id.split('-')[0]}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5">
                <p className="text-[11px] text-slate-600 font-medium">{formsDesc}</p>
              </td>
              <td className="px-6 py-5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
                }`}>
                  {c.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </td>
              <td className="px-6 py-5">
                <p className="text-xs text-slate-500">{timeAgo(c.created_at)}</p>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Update `dashboard/page.tsx` to import and use `RecentCasesTable`**

Replace the entire `<table>` block (lines 125–182) with:

```tsx
import RecentCasesTable from '@/components/dashboard/RecentCasesTable'

// Inside the JSX, replace the <table>...</table> block with:
<RecentCasesTable cases={recentCases ?? []} />
```

Also remove the local `timeAgo` function from `dashboard/page.tsx` (it will live in the new component). 

> ⚠️ The `timeAgo` utility also exists at `@/lib/utils` — import from there in `RecentCasesTable.tsx` instead of redefining it. Check `apps/internal_app/src/lib/utils.ts` first.

- [ ] **Step 3: Verify `timeAgo` is in `@/lib/utils`**

```bash
grep -n "timeAgo" apps/internal_app/src/lib/utils.ts
```

If it exists, use `import { timeAgo } from '@/lib/utils'` in `RecentCasesTable.tsx` and remove the local definition. If it doesn't exist, keep the local definition.

- [ ] **Step 4: Commit**

```bash
git add apps/internal_app/src/components/dashboard/RecentCasesTable.tsx \
        apps/internal_app/src/app/(app)/dashboard/page.tsx
git commit -m "fix: replace absolute-inset overlay link with useRouter row click on dashboard table"
```

---

## Task 2: Make stat cards clickable `<Link>` components

**Problem:** The 4 summary cards (Active Cases, Total Clients, USCIS Alerts, Completed MTD) at the top of `dashboard/page.tsx` are plain `<div>` elements — they look interactive (they have hover effects) but clicking them does nothing.

**Files:**
- Modify: `apps/internal_app/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Wrap Active Cases card in a Link**

Replace:
```tsx
<div className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start">
  <div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Active Cases</p>
```

With:
```tsx
<Link href="/cases" className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start no-underline">
  <div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Active Cases</p>
```

And close with `</Link>` instead of `</div>`.

- [ ] **Step 2: Wrap Total Clients card in a Link**

Replace outer `<div>` with:
```tsx
<Link href="/clients" className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start no-underline">
```

Close with `</Link>`.

- [ ] **Step 3: Wrap USCIS Alerts card in a Link**

Replace outer `<div>` with:
```tsx
<Link href="/tracker" className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start no-underline">
```

Close with `</Link>`.

- [ ] **Step 4: Wrap Completed MTD card in a Link**

Replace outer `<div>` with:
```tsx
<Link href="/cases?status=approved" className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start no-underline">
```

Close with `</Link>`.

- [ ] **Step 5: Also add the missing `import Link from 'next/link'`** (it should already be there — verify at the top of the file).

- [ ] **Step 6: Fix USCIS alert link className in the alerts section**

Find line (approx. 216) inside the USCIS Alerts card map:
```tsx
className="block flex gap-4 group cursor-pointer hover:bg-surface-container-low p-2 -m-2 rounded-lg transition-all relative no-underline block"
```

Replace with:
```tsx
className="flex gap-4 group cursor-pointer hover:bg-surface-container-low p-2 -m-2 rounded-lg transition-all relative no-underline"
```

- [ ] **Step 7: Commit**

```bash
git add apps/internal_app/src/app/(app)/dashboard/page.tsx
git commit -m "fix: make dashboard stat cards clickable links and fix USCIS alert className"
```

---

## Task 3: Create functional `SearchBar` client component

**Problem:** The search input in `layout.tsx` (line 132) is a plain `<input>` with no state, no onChange, no navigation. It is purely visual and does nothing on interaction.

**Solution:** Extract a `'use client'` `SearchBar` component that navigates to `/clients?q=<query>` on Enter (the clients page already supports `?q=` filtering via `getClients(params.q)`).

**Files:**
- Create: `apps/internal_app/src/components/layout/SearchBar.tsx`
- Modify: `apps/internal_app/src/app/(app)/layout.tsx`

- [ ] **Step 1: Create `SearchBar.tsx`**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const q = query.trim()
      if (q) {
        router.push(`/clients?q=${encodeURIComponent(q)}`)
        setQuery('')
      }
    }
    if (e.key === 'Escape') {
      setQuery('')
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className="relative">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
        search
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search cases, clients..."
        className="pl-10 pr-4 py-1.5 bg-[#f1f4f9] rounded-full border-none text-sm w-64 outline-none focus:ring-2"
        style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
        autoComplete="off"
      />
    </div>
  )
}
```

- [ ] **Step 2: Replace raw `<input>` in `layout.tsx` with `<SearchBar />`**

In `apps/internal_app/src/app/(app)/layout.tsx`, replace the entire `<div className="relative">` block (the search container, lines ~128–137):

```tsx
// Before:
<div className="relative">
  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
    search
  </span>
  <input
    placeholder="Search cases, clients..."
    className="pl-10 pr-4 py-1.5 bg-[#f1f4f9] rounded-full border-none text-sm w-64 outline-none focus:ring-2"
    style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
  />
</div>
```

With:
```tsx
<SearchBar />
```

And add the import at the top of `layout.tsx`:
```tsx
import SearchBar from '@/components/layout/SearchBar'
```

- [ ] **Step 3: Commit**

```bash
git add apps/internal_app/src/components/layout/SearchBar.tsx \
        apps/internal_app/src/app/(app)/layout.tsx
git commit -m "feat: add functional search bar that navigates to /clients?q= on Enter"
```

---

## Task 4: Add page title to top bar (polish)

**Problem:** The layout's top bar has no page title. The HTML prototype shows the current page name (e.g., "Dashboard") prominently to the left of the search bar. Currently the top bar only shows the search input and notification bell.

**Files:**
- Create: `apps/internal_app/src/components/layout/PageTitle.tsx`
- Modify: `apps/internal_app/src/app/(app)/layout.tsx`

- [ ] **Step 1: Create `PageTitle.tsx`**

```tsx
'use client'

import { usePathname } from 'next/navigation'

const TITLE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cases': 'Cases',
  '/clients': 'Clients',
  '/jobs': 'Jobs',
  '/pdf-generator': 'PDF Generator',
  '/tracker': 'USCIS Tracker',
  '/notifications': 'Notifications',
}

export default function PageTitle() {
  const pathname = usePathname()
  // Match the first segment (e.g. /cases/123 → /cases)
  const segment = '/' + (pathname.split('/')[1] ?? '')
  const title = TITLE_MAP[segment] ?? ''

  if (!title) return null

  return (
    <h2 className="text-xl font-semibold text-slate-800 tracking-tight">{title}</h2>
  )
}
```

- [ ] **Step 2: Add `<PageTitle />` to the top bar in `layout.tsx`**

Inside the `<header>` in `layout.tsx`, update the `<div className="flex items-center gap-4">` to include `<PageTitle />` before `<SearchBar />`:

```tsx
import PageTitle from '@/components/layout/PageTitle'

// In the header's left-side div:
<div className="flex items-center gap-4">
  <PageTitle />
  <SearchBar />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/internal_app/src/components/layout/PageTitle.tsx \
        apps/internal_app/src/app/(app)/layout.tsx
git commit -m "feat: add dynamic page title to top bar"
```

---

## Self-Review

### Spec coverage
- [x] Invisible overlay causing 404 → Task 1 (RecentCasesTable with useRouter)
- [x] Stat cards not clickable → Task 2 (Link wrappers)
- [x] Search bar non-functional → Task 3 (SearchBar client component)
- [x] USCIS alert `block flex` className conflict → Task 2 Step 6
- [x] Page title missing from top bar → Task 4 (PageTitle)

### Placeholder check
- No TBDs or "implement later" language found.
- All code blocks are complete and self-contained.

### Type consistency
- `CaseRow` type in `RecentCasesTable.tsx` matches the Supabase query shape from `dashboard/page.tsx` (id, status, created_at, primary_client, case_forms).
- `timeAgo` — confirm whether it lives in `@/lib/utils` (Task 1 Step 3) before removing local definition.
