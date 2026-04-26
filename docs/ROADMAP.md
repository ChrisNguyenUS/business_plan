# 🗺️ Project Roadmap: Business Plan App

## Trạng thái hiện tại
- **Current Phase:** Website Phase 4 — Post-Launch Hardening (verifying GA4 + Meta Pixel + CAPI)
- **Last updated:** 2026-04-26

> **Track scope:**
> - **Track 1** — SDLC 8-phase framework, áp dụng cho **Internal App** (`apps/internal_app/`).
> - **Track 2** — Feature rollout của **Website** (`apps/website/` = MannaOS.com).
> - **Track 3** — Quality gates của **Website** (SDLC phases scoped down cho website risk surface).

## Track 1 — SDLC 8-Phase Framework (Internal App)
- [x] **Phase 0: Documents** — Đã hoàn thành PRD Website và Internal App.
- [x] **Phase 1: Static Safety** — ✅ MOS Internal Staff App scaffolded at `apps/internal_app/`:
  - Next.js 14 App Router + Supabase + Tailwind CSS + TypeScript
  - Auth (login page, middleware, protected layout with sidebar)
  - Client CRM (list, search, create, edit, profile)
  - Case Management (list, new case wizard, case detail + document checklist)
  - Filing Assistant Mode A (copy-paste per field via CopyPasteScreen)
  - Filing Assistant Mode B (Local PDF generation via pdf-lib)
  - USCIS Case Tracker (Status polling and historical records)
  - Form definitions: N-400, I-765, I-130, I-131
  - Dashboard (Stats, alerts, quick actions)
  - Jobs page (tax/insurance/AI services)
  - Notifications page
  - Database migrations: `001_schema.sql` + `002_rls.sql`
  - UI faithful to `ui_prototypes/public_internal_app/` HTML prototypes
- [x] **Phase 2: Unit Tests**
- [ ] **Phase 3: Integration Tests**
- [ ] **Phase 4: CI/CD**
- [ ] **Phase 5: E2E Tests**
- [ ] **Phase 6: AI Eval**
- [ ] **Phase 7: Monitoring**

## Track 2 — Website (MannaOS.com) Rollout
- [x] **Website Phase 1A — Marketing Landing** — Bilingual (EN/VI) Next.js 16 site with Home, 4 Service pages, About, Contact, Privacy Policy, ToS, floating buttons, SEO (sitemap, robots, JSON-LD), contact form (Supabase + Resend), deployed on Vercel. Shared Supabase project `ffsrlmtqzlidnuitkdvw`.
- [x] **Website Phase 2 — Auth + Client Portal** — Supabase Auth (login/signup/forgot-password) with cookie-based sessions, profiles table + RLS, middleware route protection, portal layout with My Services / Explore Services tabs.
- [x] **Website Phase 3 — Admin Panel + Content Editor** — Admin layout & navigation, server actions, image upload, client/blog/submissions management, Content Editor wired to `site_content` (homepage/about/services + dynamic immigration form bundles), public pages read live from DB with cache disabled for instant updates.
- [ ] **Website Phase 4 — Phase A Post-Launch Hardening (ads-readiness)** — Custom domain + DNS, Meta Pixel + CAPI (PageView/Lead/Schedule/Contact verified in Events Manager), GA4 events from §3 PRD, Lighthouse mobile ≥90, LCP <2.5s @ 4G, CWV check (LCP/CLS/INP), live-site smoke test (contact form → Resend + Supabase, Calendly embed, language switcher, hreflang), GSC + Bing Webmaster verification, sitemap submission. Gate before running Facebook ads or starting Phase B.
- [ ] **Website Phase 5 — Phase B Immigration SEO/GEO Depth** — Full topical map (pillar + Texas state + 4 cities + 11 form clusters + 5 bundles), non-attorney disclosure system, JSON-LD matrix (LegalService/Service/Offer/HowTo/FAQPage/Speakable/BreadcrumbList), `/llms.txt`, Texas residency gate, USCIS case status display, automated review acquisition.

## Track 3 — Website Quality Gates (SDLC scoped for `apps/website/`)
> Listed in **execution order**, not SDLC numerical order. Phase 6 (AI Eval) **N/A** for website — it has no AI features. Don't block Track 2 Phase 5 (SEO/GEO depth) on full test buildout; do high-leverage items now, layer in tests incrementally.

- [ ] **W1 — Monitoring (Phase 7-lite)** — Vercel Analytics (built-in) + Sentry error tracking + UptimeRobot ping + CWV alerts. Goal: site crash dưới ad traffic biết liền. **Run before Facebook ads go live.** ~1h.
- [ ] **W2 — CI/CD (Phase 4)** — GitHub Action: typecheck + lint + Lighthouse CI on PR, block merge if fail. Vercel preview deploys (already on by default). ~30 min setup.
- [ ] **W3 — Unit Tests (Phase 2, scoped)** — Test critical logic only: `/api/contact` route (validation, honeypot, CAPI hashing), `lib/analytics/meta-capi.ts` payload shape, `lib/analytics/events.ts` event_id, `lib/i18n/get-dictionary.ts` fallback. **Skip UI presentation tests** — low value. Build incrementally during Track 2 Phase 5.
- [ ] **W4 — Integration Tests (Phase 3)** — Contact form end-to-end (form → API → Supabase + Resend + CAPI fire), Auth (signup → middleware → portal session), Admin (edit `site_content` → public reflects via cache disable). Run after Track 2 Phase 5 core ships.
- [ ] **W5 — E2E Tests (Phase 5)** — Playwright against Vercel preview URL: golden path (Home → Services → Contact → Submit → success), Login → Portal → My Services tab, Admin login → edit homepage hero → public page reflects. Run after Track 2 Phase 5 core ships.
- ~~**W? — AI Eval (Phase 6)**~~ — **N/A.** Website has no AI features. Belongs to Track 1 (Internal App: USCIS form-fill agent, document AI).