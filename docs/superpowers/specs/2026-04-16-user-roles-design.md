# User Roles & Access Control Design

**Date:** 2026-04-16
**Apps:** `apps/website` + `apps/internal_app`
**Status:** Approved

---

## Overview

Introduce a unified 3-role system across both apps, enforced at the middleware layer and backed by the shared Supabase `profiles` table.

---

## Section 1: Database

### Roles

| Role | Description |
|---|---|
| `admin` | Owner — full access to both apps |
| `staff` | Internal staff — internal app only, restricted permissions |
| `client` | End customer — website portal only |

### Migration

Rename existing role values in the `profiles` table:

| Old value | New value |
|---|---|
| `ultimate_admin` | `admin` |
| `user` | `client` |

### Schema changes

1. Add a `CHECK` constraint: `role IN ('admin', 'staff', 'client')`
2. Default for new signups via website: `client`
3. `staff` and `admin` accounts are created manually via the Supabase dashboard — no self-signup (a future admin UI for staff management is out of scope for this phase)
4. Update TypeScript `Profile` interface in both apps:
   ```ts
   role: "admin" | "staff" | "client"
   ```

---

## Section 2: Auth Flow & Post-Login Routing

### Website

```
/[locale]/login → sign in → check role
  admin  → /[locale]/admin
  client → /[locale]/portal
  staff  → stay on /[locale]/login, show: "Please use the internal app"
```

### Internal App

```
/login → sign in → check role
  admin  → /dashboard (full access)
  staff  → /dashboard (restricted access)
  client → stay on /login, show: "Please use the client portal at mannaos.com"
```

### Middleware role-check mechanism (Option A)

1. Call `supabase.auth.getUser()` on every protected request
2. Query `profiles` for the role (single DB call)
3. Forward role via response header `x-user-role` so server layouts avoid a second DB call
4. Route guards enforce:
   - `/[locale]/admin/*` → requires `admin`
   - `/[locale]/portal/*` → requires `client`
   - Internal app all routes → requires `admin` or `staff`

---

## Section 3: Website Middleware Changes

Current middleware handles i18n only. Extend it to layer auth on top:

**Public routes (no auth required):**
- `/[locale]/` — home
- `/[locale]/services/*` — service info pages
- `/[locale]/about`
- `/[locale]/contact`
- `/[locale]/blog/*`
- `/[locale]/privacy-policy`
- `/[locale]/terms-of-service`
- `/[locale]/login`
- `/[locale]/signup`

**Protected routes:**
- `/[locale]/admin/*` — requires `admin`
- `/[locale]/portal/*` — requires `client`

**Order of operations:**

```
1. i18n locale detection and redirect (existing logic — unchanged)
2. Is this path under /admin or /portal?
   → No:  pass through
   → Yes: getUser() + profile role query
          → wrong role or unauthenticated: redirect to /[locale]/login
          → correct role: pass through
```

---

## Section 4: Internal App Changes

### Middleware

Extend the existing unauthenticated redirect to add role enforcement:

- `admin` or `staff` → allow through
- `client` → redirect to `/login` with message: "Please use the client portal at mannaos.com"
- Unauthenticated → redirect to `/login` (existing behavior, unchanged)

### Navigation (sidebar)

Staff sees a restricted sidebar — the following items are hidden for `staff`:

| Nav item | Admin | Staff |
|---|---|---|
| Dashboard | ✅ | ✅ |
| Cases | ✅ | ✅ |
| Clients | ✅ | ✅ |
| USCIS Tracker | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| PDF Generator | ✅ | ✅ |
| Jobs (prices) | ✅ | ❌ hidden |

### Permission enforcement (server-side)

Hiding nav is not enough — Server Actions for updating prices and document requirements must also check the role:
- If `staff` calls a restricted action → return 403 / throw unauthorized error

### Sidebar role label

| Role | Display label |
|---|---|
| `admin` | "Admin" |
| `staff` | "Staff" |

---

## Section 5: Client Portal UI

Route: `/[locale]/portal`

### Tab 1: "My Services"

- Lists all services the client is currently enrolled in
- Each service renders as a card: name, status badge, last updated date
- Status vocabulary per service:

| Service | Status values |
|---|---|
| Immigration | Case Received → In Review → Decision |
| Tax | Documents Needed → In Progress → Filed → Complete |
| Insurance | Active / Renewal Due / Expired |
| AI Services | Active / Pending Setup |

- Multiple cases per service (e.g., two immigration cases) → list within the service card
- Empty state: "You have no active services yet. Explore what we offer →" (links to Explore tab)

### Tab 2: "Explore Services"

- Shows all 4 services the client is NOT yet enrolled in
- Each card contains:
  - Service name + short description
  - "Learn More" link → `/[locale]/services/[tax|immigration|insurance|ai]`
  - "Request Consultation" CTA → links to Calendly booking page (already integrated in Phase A) with the service name passed as a prefill parameter
- If client is enrolled in all 4 → show "You're all set!" message
- If client is enrolled in none → Explore tab is the default landing tab

---

## Suggested Implementation Phases

1. **Phase A — DB + Role unification** — migration, TypeScript types, CHECK constraint
2. **Phase B — Middleware routing** — website auth layer, internal app role routing
3. **Phase C — Client portal UI** — My Services + Explore Services tabs
4. **Phase D — Permission enforcement** — staff nav restrictions, server action guards

---

## Out of Scope

- Email notifications when case status changes (future phase)
- Client ability to upload documents (future phase)
- Staff account self-registration (admin creates manually)
- Multi-tenant or per-client data isolation beyond RLS (already handled by Supabase RLS)
