# 🗺️ Project Roadmap: Business Plan App

## Trạng thái hiện tại
- **Current Phase:** Website Phase A — Post-Launch Hardening (ads-readiness)
- **Last updated:** 2026-04-25

## Track 1 — SDLC 8-Phase Framework
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