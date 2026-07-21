# 🗺️ Project Roadmap: Business Plan App

## Trạng thái hiện tại
- **Current Phase:** Website Phase 3B — N400 Civics Test App **shipped** (all 9 phases ✅; awaiting OAuth + Upstash + Sentry DSN credentials operator-side; manual smoke checklist + audio content drift fixes pending pre-launch)
- **Last updated:** 2026-07-15
- [x] N400 IA redesign — 4-tab navigation (Home / Học tập / Thi thử / Tiến độ), skill hubs with practice-modes bottom sheet, merged Tiến độ, Phỏng vấn đầy đủ full-interview mock (specs/2026-07-09-n400app-ia-redesign-design.md)
- [x] N400 Tiến độ redesign — tabs split by depth (Tổng quan / Chi tiết) around the three questions the screen answers; new `readiness.ts` engine (5 interview-readiness criteria, third of the three recommendation engines); every skill now tracked (was Civics-only); writing/speaking mock results surfaced for the first time; BadgeGallery de-duplicated to Tài khoản only. Zero DB migrations (specs/2026-07-15-n400app-progress-redesign-design.md)

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
- [x] **Website Phase 3B — N400 Civics Test App** — Bilingual (EN/VI) practice app at mannaos.com/n400app. Mock test (12/20 pass rule, early stop) with server-side scoring (`finalize_mock_attempt` RPC), Daily Practice, Flashcards, View All 128. Google + Facebook OAuth. Geoapify autocomplete + Geocodio district lookup for Q29/Q23/Q61/Q62. Owner-recorded MP3 audio (128 questions + 79 canonical answers + 100 Q23 senators + 441 Q29 reps + 56 Q61 governors + 50 Q62 capitals). Streak system (3/7/14/30/60/100 milestones) + **56-badge gamification (Phase 6B, v2 2026-07-07)** across 9 groups (streak / civics / writing / yesno / whatmean / combo / practice / other / secret) with idempotent server-side award engine and a badge gallery on the Tài khoản page. Speaking (What Mean + Yes/No) and Writing (dictation) study sections, plus a 4-way Thi thử split (Phỏng vấn đầy đủ / Civics / Viết / Speaking mock tests). Admin panel for questions/answers/audio/state-data/reps. Server-side Meta CAPI for `n400_mock_test_pass` + `n400_setup_complete`. Service Worker audio cache (`n400-audio-v1`). Sentry error tracking (DSN-gated). Verification scripts: `verify-seed.ts`, `verify-audio.ts`, `verify-badges.ts`. Playwright smoke spec at `e2e/n400/smoke.spec.ts`.
- [x] **Website Phase 3C — Shared Identity & User Profile Architecture** — `profiles` extended into shared Manna ecosystem identity (migrations 006–008): structured legal name fields (first/middle/last/preferred/suffix), `avatar_path` (relative storage path) + public `avatars` bucket, `preferred_language`, audit metadata. `handle_new_user_v2` trigger reads provider `given_name`/`family_name`. RLS overhaul: permissive read-all dropped, recursion-safe `is_admin()` helper, `profiles_protect_role` blocks role self-escalation. OAuth (Google/Facebook/Apple) buttons on login/signup + `/api/auth/callback` with first-login avatar bootstrap. Dynamic profile page + edit page (`profile-utils.ts` display-name rules, `lib/profile.ts` service). **Operator-side pending:** enable OAuth provider credentials in Supabase Dashboard.
- [x] **Website Phase 3D — N400 Growth Engine G1 (data + engine core)** — Event log (`n400_growth_events` + emitter triggers), config-driven lead scoring 0–300 (`n400_growth_rules`, recompute + read-time decay view), lead profiles with first/last-touch attribution, consultation requests + CTA decision log tables, seeded CTA/prompt definitions, feature flags (all OFF), historical backfill, `src/lib/n400/growth/` module (events/flags/attribution/ingest). Spec: specs/2026-07-19-n400-growth-engine-design.md. G3 (CTA+booking), G4 (internal_app Leads) pending.
- [x] **Website Phase 3E — N400 Growth Engine G2 (conversation model)** — Progressive profiling live behind `profiling`+`growth_engine` flags: pure evaluator (`growth/profiling.ts`, surface routing + snooze-as-active-days + deterministic variants + debug reason), answer/skip/mark-shown SECURITY DEFINER RPCs with journey-stage derivation (n400_21), insert-path event emitter fix (n400_20), full `prompt_shown → answered/skipped` funnel tagged by question × variant × surface, Level 2 card under Practice/Mock results, Level 1 dashboard soft card, Level 3 interview-mode hero intent via the priority-ordered `GROWTH_INTENT_TIERS` table. Spec §3. G3b (booking flow), G3c (filing checklist), G4 (internal_app Leads) pending.
- [x] **Website Phase 3E — N400 Growth Engine G3a (CTA engine)** — Behavior-driven CTA live behind `cta_engine`+`growth_engine` flags: pure evaluator (`growth/cta.ts`) over the 8 G1-seeded scenarios with all seven §4.1 hard rules (7-day cap, per-CTA cooldown, dismiss→snooze, 3-dismiss→30-day group mute, converted→consultation retired, priority order, action availability), server-side learning signals reusing the client's own `deriveReadiness`/`deriveSectionGradedTally` (drift-locked by test), shown/dismiss/click RPCs + `n400_cta_decision_log` with 30-day probabilistic retention (n400_24), `cta_*` events moved server-only, and `getGrowthState` collapsing prompt+CTA into one read. Spec §4. G3b (booking flow), G3c (filing checklist), G4 (internal_app Leads) pending.
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
