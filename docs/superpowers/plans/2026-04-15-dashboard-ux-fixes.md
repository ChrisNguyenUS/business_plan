# Dashboard UX Fixes & Navigation Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix cursor/button styling bugs, wire up navigation on all metric cards and action buttons, and scaffold the USCIS Status Alerts Panel with daily-bot data props.

**Architecture:** All changes are confined to `apps/internal_app/src/app/(app)/dashboard/page.tsx` and one new extracted component `UscisStatusAlertsPanel.tsx`. The dashboard page is a Next.js 14 server component; navigation is implemented via `<Link>` wrappers. The USCIS panel is extracted to a server component with typed placeholder props ready for the daily API bot.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v4 (CSS-variable-based colors), Supabase server client, TypeScript

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `apps/internal_app/src/app/(app)/dashboard/page.tsx` | Cursor fixes, card navigation, today/yesterday query, button fix |
| Create | `apps/internal_app/src/components/dashboard/UscisStatusAlertsPanel.tsx` | Extracted USCIS alerts + daily-bot placeholder props |

---

### Task 1: Fix New Client Button Visibility

**Root cause:** `bg-gradient-to-br from-primary to-primary-container` uses Tailwind v4 CSS-variable color names. Gradient stop utilities don't resolve CSS vars as color values the same way `bg-*` does, so the gradient is transparent → white bg + white text = invisible.

**Files:**
- Modify: `apps/internal_app/src/app/(app)/dashboard/page.tsx:187`

- [ ] **Step 1: Replace broken gradient classes with inline style on New Client Link**

In `page.tsx`, find the New Client `<Link>` (line ~187) and replace its className + add style:

```tsx
// BEFORE
<Link href="/clients/new" className="px-6 py-2.5 rounded-lg bg-gradient-to-br from-primary to-primary-container text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity">
  <span className="material-symbols-outlined text-lg">add</span> New Client
</Link>

// AFTER
<Link
  href="/clients/new"
  className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
  style={{ background: 'linear-gradient(135deg, #006970, #3AAFB9)', boxShadow: '0 4px 14px rgba(0,105,112,0.25)' }}
>
  <span className="material-symbols-outlined text-lg">add</span> New Client
</Link>
```

- [ ] **Step 2: Verify the New Case button is styled correctly**

The New Case button (`border-2 border-primary-container text-primary`) uses direct bg/border/text utilities which resolve CSS vars correctly. No change needed — but confirm `cursor-pointer` is added:

```tsx
<Link href="/cases/new" className="px-6 py-2.5 rounded-lg border-2 border-primary-container text-primary text-sm font-semibold hover:bg-primary/5 transition-colors cursor-pointer">
  <span className="material-symbols-outlined text-lg align-middle">create_new_folder</span> New Case
</Link>
```

- [ ] **Step 3: Add cursor-pointer to View Tracker link**

```tsx
<Link href="/tracker" className="px-6 py-2.5 rounded-lg text-slate-500 text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer">
  View Tracker
</Link>
```

- [ ] **Step 4: Commit**

```bash
git add apps/internal_app/src/app/\(app\)/dashboard/page.tsx
git commit -m "fix: make New Client button visible and add cursor-pointer to quick actions"
```

---

### Task 2: Wire Metric Cards with Navigation & Cursor

**Current state:** All 4 summary cards are plain `<div>` elements. Active Cases, Total Clients, and USCIS Alerts need to be wrapped in `<Link>` with `cursor-pointer`.

**Files:**
- Modify: `apps/internal_app/src/app/(app)/dashboard/page.tsx:60–113`

- [ ] **Step 1: Add today vs yesterday USCIS alert query to server data fetching**

In `DashboardPage()`, add two more queries inside the `Promise.all`:

```tsx
// Add inside Promise.all array (after existing 5 queries):
supabase.from('cases')
  .select('*', { count: 'exact', head: true })
  .in('status', ['rfe_issued', 'denied', 'interview_scheduled'])
  .gte('updated_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
supabase.from('cases')
  .select('*', { count: 'exact', head: true })
  .in('status', ['rfe_issued', 'denied', 'interview_scheduled'])
  .gte('updated_at', new Date(new Date().setHours(0,0,0,0) - 86400000).toISOString())
  .lt('updated_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
```

Update the destructuring accordingly:

```tsx
const [
  { count: clientCount },
  { count: activeCases },
  { data: recentCases },
  { data: rfeCases },
  { count: completedMTD },
  { count: alertsToday },
  { count: alertsYesterday },
] = await Promise.all([...])
```

- [ ] **Step 2: Wrap Active Cases card in a Link**

Replace the outer `<div>` of the Active Cases card with a `<Link>` tag pointing to `/cases?status=active`:

```tsx
<Link
  href="/cases?status=active"
  className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start cursor-pointer"
>
  <div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Active Cases</p>
    <h3 className="text-4xl font-bold text-primary-container">{activeCases ?? 0}</h3>
    <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
      <span className="material-symbols-outlined text-sm text-green-500">trending_up</span> Tracked
    </p>
  </div>
  <div className="bg-primary/5 p-2 rounded-lg">
    <span className="material-symbols-outlined text-primary-container" data-icon="folder_open">folder_open</span>
  </div>
</Link>
```

- [ ] **Step 3: Wrap Total Clients card in a Link**

Replace the outer `<div>` of Total Clients with `<Link href="/clients">`:

```tsx
<Link
  href="/clients"
  className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start cursor-pointer"
>
  <div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Clients</p>
    <h3 className="text-4xl font-bold text-amber-600">{clientCount ?? 0}</h3>
    <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
      <span className="material-symbols-outlined text-sm text-amber-500">group</span> Database size
    </p>
  </div>
  <div className="bg-amber-50 p-2 rounded-lg">
    <span className="material-symbols-outlined text-amber-600" data-icon="group">group</span>
  </div>
</Link>
```

- [ ] **Step 4: Wrap USCIS Alerts card in a Link and show today/yesterday delta**

Replace the outer `<div>` of USCIS Alerts with `<Link href="/cases?filter=alerts">`, and update the subtitle to show today vs yesterday:

```tsx
<Link
  href="/cases?filter=alerts"
  className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start cursor-pointer"
>
  <div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">USCIS Alerts</p>
    <h3 className="text-4xl font-bold text-error">{rfeCases?.length ?? 0}</h3>
    <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
      <span className="material-symbols-outlined text-sm text-error">priority_high</span>
      {(alertsToday ?? 0) > 0
        ? `${alertsToday} new today (${alertsYesterday ?? 0} yesterday)`
        : 'No new alerts today'}
    </p>
  </div>
  <div className="bg-error-container/30 p-2 rounded-lg">
    <span className="material-symbols-outlined text-error" data-icon="warning">warning</span>
  </div>
</Link>
```

- [ ] **Step 5: Leave Completed MTD card as a plain div (no cursor)**

The Completed MTD card is informational only — keep it as `<div>` with no `cursor-pointer`.

- [ ] **Step 6: Add cursor-pointer to View All link**

The existing `<Link href="/cases">` already works. Just ensure `cursor-pointer` class:

```tsx
<Link href="/cases" className="text-xs text-primary-container font-bold uppercase tracking-widest hover:underline transition-all cursor-pointer">View All</Link>
```

- [ ] **Step 7: Commit**

```bash
git add apps/internal_app/src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: wire metric cards with navigation and show today/yesterday USCIS alert delta"
```

---

### Task 3: Extract & Scaffold UscisStatusAlertsPanel Component

**Goal:** Extract the USCIS Status Alerts card into its own server component. Add a `dailyAlerts: DailyUscisAlert[]` prop placeholder (empty array passed from dashboard) with the type and UI sections ready for the backend bot's daily scrape data.

**Files:**
- Create: `apps/internal_app/src/components/dashboard/UscisStatusAlertsPanel.tsx`
- Modify: `apps/internal_app/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create UscisStatusAlertsPanel.tsx**

```tsx
// apps/internal_app/src/components/dashboard/UscisStatusAlertsPanel.tsx
import Link from 'next/link'

/** Represents one USCIS status change scraped daily by the backend bot */
export interface DailyUscisAlert {
  receiptNumber: string
  clientName: string
  previousStatus: string
  currentStatus: string
  updatedAt: string // ISO date string from scraper
}

interface RfeCase {
  id: string
  status: string
  created_at: string
  primary_client: { first_name: string; last_name: string; id: string } | null
}

interface Props {
  rfeCases: RfeCase[]
  /** Placeholder for daily bot scrape data — populate from /api/uscis/daily-alerts */
  dailyAlerts: DailyUscisAlert[]
}

export default function UscisStatusAlertsPanel({ rfeCases, dailyAlerts }: Props) {
  const newCount = rfeCases.length

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">USCIS Status Alerts</h3>
        {newCount > 0 && (
          <span className="bg-error text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
            {newCount} NEW
          </span>
        )}
      </div>

      {/* Daily bot status changes — populated by backend scraper */}
      {dailyAlerts.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Today&apos;s Status Changes
          </p>
          <div className="space-y-3">
            {dailyAlerts.map((alert) => (
              <div
                key={alert.receiptNumber}
                className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30"
              >
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-slate-700">{alert.clientName}</p>
                  <p className="text-[10px] text-slate-400">{alert.receiptNumber}</p>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400">{alert.previousStatus}</span>
                  <span className="material-symbols-outlined text-xs text-slate-400">arrow_forward</span>
                  <span className="font-semibold text-primary-container">{alert.currentStatus}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(alert.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing urgent cases from DB */}
      <div className="space-y-4">
        {(!rfeCases || rfeCases.length === 0) ? (
          <div className="p-4 text-center text-sm text-slate-500 bg-surface-container-low rounded-lg">
            No urgent alerts at this time.
          </div>
        ) : (
          rfeCases.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="block flex gap-4 group cursor-pointer hover:bg-surface-container-low p-2 -m-2 rounded-lg transition-all relative"
            >
              <div
                className={`status-pillar absolute left-0 top-2 bottom-2 ${
                  c.status === 'rfe_issued' ? 'bg-error' : 'bg-amber-500'
                }`}
              />
              <div className="flex-grow pl-3">
                <p className="text-xs font-bold text-slate-400">ID: {c.id.split('-')[0]}</p>
                <p className="text-sm font-medium text-slate-800">
                  {c.status === 'rfe_issued'
                    ? 'Request for Additional Evidence (RFE) Issued'
                    : 'Status Update Received'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  {new Date(c.created_at).toLocaleDateString()} •{' '}
                  {c.primary_client?.first_name} {c.primary_client?.last_name}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update dashboard/page.tsx to use UscisStatusAlertsPanel**

Replace the inline USCIS Status Alerts card JSX with the component:

```tsx
// Add import at top
import UscisStatusAlertsPanel from '@/components/dashboard/UscisStatusAlertsPanel'

// Replace the inline <div className="bg-surface-container-lowest rounded-xl p-6 ..."> card block with:
<UscisStatusAlertsPanel
  rfeCases={(rfeCases ?? []).map((c: any) => ({
    id: c.id,
    status: c.status,
    created_at: c.created_at,
    primary_client: c.primary_client as { first_name: string; last_name: string; id: string } | null,
  }))}
  dailyAlerts={[]}
/>
```

- [ ] **Step 3: Commit**

```bash
git add apps/internal_app/src/components/dashboard/UscisStatusAlertsPanel.tsx apps/internal_app/src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: extract UscisStatusAlertsPanel with daily-bot data props placeholder"
```
