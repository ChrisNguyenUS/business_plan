# MOS Internal Staff App — Site Vision

## 1. Vision

An internal immigration case management app for Manna One Solution staff. Desktop-first, dual-monitor workflow. Staff use this app alongside the USCIS portal to manage client intake, case filing, document checklists, and case status tracking — all from a single premium dashboard.

## 2. Stitch Project

- **Project ID:** 11496096077619613643
- **Device Type:** DESKTOP

## 3. Design System

See `.stitch/DESIGN.md` for full specification.

## 4. Sitemap (Completed Screens — 26 total)

### Core Screens (Iteration 1)
- [x] `login` — Login screen with centered MOS logo, email+password form, teal Sign In button
- [x] `dashboard` — Staff dashboard: active cases, recent activity, USCIS alerts, cross-sell flags
- [x] `clients` — Client list with search, filterable table, + New Client button
- [x] `client-profile` — Individual client profile with personal info, immigration data, case history, cross-sell tags
- [x] `cases` — Cases list filterable by status, form type, assigned staff
- [x] `case-detail` — Case detail: document checklist, filing screen links, receipt numbers, status log, notes
- [x] `filing-screen` — Filing assistant Mode A: section tabs, per-field Copy buttons, progress bar
- [x] `notifications` — Notification center for USCIS status change alerts

### Extended Screens (Iteration 2)
- [x] `staff-management` — Admin staff management: create, view, deactivate accounts
- [x] `pdf-preview` — PDF generation preview Mode B: document preview, field readiness, missing field warnings
- [x] `new-client` — Multi-step new client creation form
- [x] `new-case` — Case creation wizard: case type, client linking, form selection, review
- [x] `settings` — Staff profile, notification preferences, display settings, active sessions

### Admin & Utility Screens (Iteration 3)
- [x] `case-archive` — Archived cases timeline view with year markers, Approved/Denied filtering
- [x] `analytics` — Analytics & reports dashboard: KPI cards, case trends, form type chart, staff performance
- [x] `bulk-import` — CSV bulk client import: drag-drop upload, column mapping, validation preview
- [x] `field-mapping` — Form field mapping editor: USCIS field → client data source, transform rules

### PRD Financial & Admin Screens (Iteration 4)
- [x] `jobs` — Non-immigration jobs list: Tax, Insurance, AI services filterable by type and status
- [x] `job-detail` — Job detail: service info, fee, deadline, payments tab, expenses tab, notes
- [x] `fee-schedule` — Fee schedule editor (Admin): USCIS fees + MOS fees per form/service, package pricing
- [x] `checklist-templates` — Checklist template editor (Admin): sortable items per form type, required toggle
- [x] `payment-tab` — Case payment tab: milestone schedule, payment history, Log Payment modal
- [x] `expense-tab` — Case expense tab: expense list, auto-populated USCIS fees, add expense, net revenue
- [x] `admin-finance-dashboard` — Ultimate Admin finance dashboard: revenue KPIs, 4 service cards, charts, outstanding balances
- [x] `finance-export` — Financial CSV export: date/service/client filters, preview, recent exports
- [x] `audit-log` — Audit log viewer (Admin): searchable/filterable append-only change log

## 5. Roadmap

_(All PRD screens completed — 26 total across 4 iterations!)_

## 6. Creative Freedom

_(All PRD features have been designed)_
