# 🗺️ Project Roadmap: Business Plan App

## Trạng thái hiện tại
- **Current Phase:** Phase 2 (Unit Tests)
- **Last updated:** 2026-04-14

## Lộ trình 8 Phases
- [x] **Phase 0: Documents** - Đã hoàn thành PRD Website và Internal App.
- [x] **Phase 1: Static Safety** - ✅ MOS Internal Staff App scaffolded at `apps/internal_app/`:
  - Next.js 14 App Router + Supabase + Tailwind CSS + TypeScript
  - Auth (login page, middleware, protected layout with sidebar)
  - Client CRM (list, search, create, edit, profile)
  - Case Management (list, new case wizard, case detail + document checklist)
  - Filing Assistant Mode A (copy-paste per field via CopyPasteScreen)
  - Form definitions: N-400, I-765, I-130, I-131
  - Jobs page (tax/insurance/AI services)
  - Notifications page
  - Database migrations: `001_schema.sql` + `002_rls.sql`
  - 6 passing N-400 unit tests · 0 TypeScript errors
  - UI faithful to `ui_prototypes/public_internal_app/` HTML prototypes
- [ ] **Phase 2: Unit Tests** - [ ] **Phase 3: Integration Tests**
- [ ] **Phase 4: CI/CD**
- [ ] **Phase 5: E2E Tests**
- [ ] **Phase 6: AI Eval**
- [ ] **Phase 7: Monitoring**