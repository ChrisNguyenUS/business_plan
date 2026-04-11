# MOS Internal Staff App — Design Spec
**Date:** April 9, 2026
**Project:** MOS Internal (`app.mannaonesolution.com`)
**Tech Stack:** Next.js + Supabase + Vercel
**Owner:** Manna One Solution, Houston, TX

---

## 1. Overview

An internal web application for Manna One Solution staff to manage immigration clients, generate filing documents, track case statuses, and identify cross-sell opportunities across Tax, Insurance, and AI services.

**Three core goals:**
1. **Speed** — collect client info once, generate all required documents automatically
2. **Accuracy** — structured copy-paste filing screen eliminates manual transcription errors
3. **Retention** — permanent client database enables cross-sell and case follow-up

---

## 2. Architecture

```
app.mannaonesolution.com  (internal, staff-only)
         │
    Next.js App (Vercel)
         │
    Supabase
    ├── PostgreSQL (client data, cases, forms, status history)
    ├── Auth (staff login, email/password)
    └── Storage (uploaded document scans)
         │
    USCIS Public Case Status API
    └── Polled daily per active receipt number
```

**Separate from mannaos.com** — completely isolated deployment. A bug in the internal app cannot affect the public website.

---

## 3. Tech Stack

| Item | Choice | Reason |
|---|---|---|
| Framework | Next.js | Same stack as public site |
| Database | Supabase (PostgreSQL) | Free tier, built-in auth, storage |
| File storage | Supabase Storage | Document scans, ZIP downloads |
| PDF generation | `pdf-lib` (JS) | Fill AcroForm templates for mail filing — **USCIS PDFs are XFA and must be pre-converted offline via Adobe Acrobat Pro; pdf-lib cannot fill native XFA PDFs** |
| PDF alternative | Apryse SDK (evaluate) | Handles XFA natively in Node.js — no conversion step needed; commercial pricing |
| Hosting | Vercel | Same as public site, auto-deploy |
| Auth | Supabase Auth | Email/password for staff accounts |
| USCIS tracking | Playwright (Node.js) on dedicated VPS | Browser automation bot scrapes `egov.uscis.gov/casestatus/mycasestatus.do` daily; works for all receipt number prefixes; 2–5s delay between requests; ~50 checks/day at MOS scale. Abstracted behind `USCISClient` interface for future Torch API upgrade. |

---

## 4. Core Concepts

### 4.1 Client Profile
Any individual in the system — petitioner or beneficiary. Stores all personal information collected once and reused across all cases.

**Fields:**
- Full legal name (first, middle, last)
- Other names used (maiden name, aliases)
- Date of birth
- Country of birth / citizenship
- Alien Registration Number (A-Number)
- Social Security Number
- Current address + mailing address
- Phone + email
- Marital status + spouse info
- Children (name, DOB, citizenship status per child)
- Immigration history (entry dates, visa types, status changes)
- Employment history
- Travel history (last 5 years)
- Services used (cross-sell tracking)

### 4.2 Case Types

**Simple Case** — one client, one form:
- N-400 (Citizenship)
- I-765 (EAD / Employment Authorization)
- I-90 (Green Card Renewal)
- I-131 (Travel Document / Advance Parole)
- F-1 / Visa applications
- Other single-form filings

**Package Case** — petitioner + beneficiary + multiple forms bundled:
- Marriage-based Green Card: I-130 + I-485 + I-765 + I-131 + I-864 + I-693
- Parent-sponsored Green Card: I-130 + I-485 + I-765 + I-131 + I-864 + I-693
- Other family-based petitions

Package cases link two client profiles (petitioner + beneficiary) and track each form independently under one master case.

---

## 5. Modules

### 5.1 CRM — Client Management

- Create, search, edit client profiles
- Search by name, A-Number, phone, or email
- Returning clients: search → profile loads → no re-entry needed
- Cross-sell tags: mark which services a client has used (Immigration, Tax, Insurance, AI)
- Cross-sell flags: automatically suggest services based on profile (e.g., immigration client approaching tax season)
- Full case history per client

### 5.2 Case Manager

**Creating a case:**
1. Staff selects client (or creates new)
2. Selects case type: Simple or Package
3. For Package: selects second client (petitioner or creates new)
4. Selects form type(s) — pre-built package templates available
5. Case is created with pre-populated document checklist

**Document checklist:**
- Pre-built per form type (N-400 checklist differs from I-485 checklist)
- Package cases: master checklist + per-form sub-checklists
- Each item: check off when received + upload scan
- Staff can add custom items per case
- Progress indicator: X of Y required documents received
- App warns if required documents are missing when staff tries to generate filing output
- [Download All as ZIP] for mail filing packet assembly

**Document storage:**
- Scans stored in Supabase Storage, linked to the case
- [View] and [Download] per document
- [Download All as ZIP] bundles all case documents
- Originals always stay with the client — app stores copies only

### 5.3 Filing Assistant

Two output modes depending on the form:

**Mode A — Interactive Copy-Paste Screen (online filing forms)**

Used for: N-400, I-130, I-765, I-90, I-485 (online), and all forms filed via USCIS portal.

Staff opens this screen alongside the USCIS portal on a second monitor:

- Sections mirror the USCIS form structure (Part 1, Part 2, Part 3...)
- Section tabs at top — click to jump between parts
- Each field shows: label + value + [Copy] button
- Clicking [Copy]: copies value to clipboard + button changes to [Copied ✓] + field turns green
- Section tab shows ✓ when all fields in that section are copied
- Progress indicator: X of Y fields copied across the whole form
- [Copy All] button per section
- [Reset Section] to unmark all copied fields in a section
- Package cases: one filing screen per form, navigate between them with tabs

Staff workflow:
```
Open USCIS portal (one monitor) + Filing screen (other monitor)
→ Work through Part 1 → copy each field → USCIS portal Part 1
→ Tab to Part 2 → continue
→ All sections ✓ → filing complete
```

**Mode B — Filled USCIS PDF (mail filing forms)**

Used for: I-131 and any form requiring physical mailing.

- App fills official USCIS PDF with client data using `pdf-lib`
- Staff downloads, prints, assembles packet with document copies, mails
- Field mapping written once per form (one-time setup, ~2-4 hours per form)
- When USCIS updates a form PDF, only the mapping needs review

### 5.4 Case Tracker

- Staff enters receipt number(s) after submission (one per form)
- App pings USCIS public case status endpoint daily per active receipt number
- Status changes trigger an in-app notification to staff
- Full status history log per receipt number (with timestamps)
- Case statuses:
  - Documents Pending
  - Ready to File
  - Submitted — Awaiting Receipt
  - Receipt Received
  - In Progress (USCIS processing)
  - RFE Issued (Request for Evidence)
  - Approved
  - Denied
- Package cases: master status (overall) + individual form status per receipt number
- Cases marked Approved or Denied are archived, not deleted

---

## 6. Data Model

```
clients
├── id, created_at
├── first_name, middle_name, last_name
├── other_names (array)
├── date_of_birth, country_of_birth
├── a_number, ssn
├── address, mailing_address
├── phone, email
├── marital_status
├── spouse_id (→ clients)
├── children (JSON array)
├── immigration_history (JSON)
├── travel_history (JSON)
├── employment_history (JSON)
└── services_used (array: immigration, tax, insurance, ai)

cases
├── id, created_at
├── case_type (simple | package)
├── package_type (marriage_greencard | parent_greencard | null)
├── primary_client_id (→ clients)
├── secondary_client_id (→ clients, for package cases)
├── status (documents_pending | ready | submitted | ... | approved | denied)
└── notes

case_forms
├── id
├── case_id (→ cases)
├── form_type (n400 | i485 | i130 | i765 | i131 | i864 | i693 | ...)
├── filing_mode (online | mail)
├── receipt_number
└── current_uscis_status

documents
├── id
├── case_id (→ cases)
├── case_form_id (→ case_forms, nullable — some docs span whole case)
├── label (e.g. "Green Card front & back")
├── required (boolean)
├── received (boolean)
├── file_path (Supabase Storage path)
└── notes

status_history
├── id
├── case_form_id (→ case_forms)
├── status
├── checked_at
└── source (uscis_api | manual)

users
├── id (Supabase Auth)
├── name
└── role (ultimate_admin | staff)
    // designed for future 'admin' role between ultimate_admin and staff

checklist_templates
├── id, form_type, updated_at, updated_by
└── items (JSON array: [{label, required, order}])
    // Ultimate Admin edits via UI; propagates to new + open/unfiled cases

fee_schedule
├── id, service_type (immigration | tax | insurance | ai)
├── form_type (nullable — immigration sub-types only)
├── uscis_fee (nullable — immigration only)
├── mos_fee
└── updated_at, updated_by

jobs (non-immigration services: Tax, Insurance, AI)
├── id, client_id (→ clients)
├── service_type (tax | insurance | ai)
├── description, fee, deadline
├── status (open | in_progress | complete)
├── notes
└── created_at, created_by

payments
├── id
├── case_id (nullable — immigration)
├── job_id (nullable — non-immigration)
├── milestone_label (nullable)
├── amount, payment_date
├── method (cash | check | card | zelle)
└── logged_by, created_at

payment_schedules
├── id, case_id (or job_id)
├── milestone_label, amount_due
├── due_trigger (e.g., "at intake", "at filing")
└── paid (boolean)

expenses
├── id
├── case_id (nullable), job_id (nullable)
├── label (e.g., "USCIS I-485 fee", "Translation", "Postage")
├── amount, expense_date
├── paid_by (mos | client)
└── logged_by, created_at

audit_log
├── id, user_id, action
├── entity_type, entity_id
├── old_value (JSON), new_value (JSON)
└── created_at
    // append-only; covers all system changes
```

---

## 7. Filing Mode by Form Type

| Form | Description | Filing Mode | Output |
|---|---|---|---|
| N-400 | Citizenship | Online | Copy-paste screen |
| I-485 | Adjustment of Status | Online / Mail | Both |
| I-130 | Petition for Relative | Online | Copy-paste screen |
| I-765 | EAD | Online | Copy-paste screen |
| I-90 | Green Card Renewal | Online | Copy-paste screen |
| I-131 | Travel Document | Mail | Filled USCIS PDF |
| I-864 | Affidavit of Support | Mail | Filled USCIS PDF |
| I-693 | Medical Exam | Civil surgeon — no app output | Checklist only |
| F-1 / Visa | Consulate filing | N/A | Copy-paste screen |

---

## 8. USCIS Status Tracking

**Approach: Playwright browser automation bot**

A Playwright (Node.js) bot runs on a dedicated VPS (~$5/mo, DigitalOcean or equivalent) with a static IP. Each day it:

1. Queries the DB for all active receipt numbers (status not in approved / denied / archived)
2. For each receipt number: navigates to `egov.uscis.gov/casestatus/mycasestatus.do`, fills in the receipt number, submits, and scrapes the status text from the result page
3. Compares scraped status to stored `current_uscis_status`
4. On change: writes to `status_history`, updates `case_forms`, creates in-app notification

**Why this approach:**
- Works for all receipt number prefixes (IOE, WAC, EAC, LIN, SRC, MSC) — the Torch API requires months of approval and the unofficial `csol-api` only supports IOE
- At ~50 checks/day with 2–5 second delays between requests, MOS is indistinguishable from a staff member manually checking — well below any IP-ban threshold
- Built in 1 day; no API registration or approval process

**Architecture:** All scraping logic lives behind a `USCISClient` interface. When/if the official USCIS Torch API approval is obtained, swap in a `TorchAPIUSCISClient` implementation without changing cron logic.

**Failure handling:**
- If USCIS page structure changes (CSS selectors break): log parse error, alert admin, continue other records
- If CAPTCHA appears: detect in Playwright response, alert admin immediately, pause polling for that run
- After 3 consecutive failures on a receipt number: escalate to admin notification

**Other details:**
- Receipt number format: 3-letter code + 10 digits (e.g., `IOE0123456789`, `WAC2190012345`)
- Staff enters receipt number manually after client receives USCIS notice
- Cases marked Approved or Denied are archived; polling stops automatically

---

## 9. Cross-Sell System

- Every client profile has `services_used` tags
- Dashboard surfaces cross-sell opportunities:
  - Immigration client → approaching tax season → flag for tax outreach
  - Green Card approved → eligible for N-400 in 3-5 years → flag with reminder date
  - Immigration client → has a business → offer AI/automation services
- Staff can manually add notes and follow-up dates per client
- Phase 2: automated reminders via n8n workflows

---

## 10. Auth & Access

- Staff login: email + password via Supabase Auth
- Two roles (designed so an intermediate "Admin" role can be inserted later):
  - **Ultimate Admin** (1 person — business owner) — everything Staff can do, PLUS: configure document checklist templates, manage fee schedules (USCIS + MOS fees), finance dashboard with revenue/expense tracking, manage staff accounts, view audit trail, export financial reports, manage non-immigration job tracker settings
  - **Staff** — create and manage clients, cases, and jobs; log payments and expenses; use filing assistant; view their own dashboard (active cases, notifications)
- Ultimate Admin has a separate login account from Staff accounts
- No client-facing login — internal tool only
- Hosted at `app.mannaonesolution.com` — not linked from public site

## 11. Legal & Compliance

**UPL (Unauthorized Practice of Immigration Law)**
- The Filing Assistant is a **transcription aid only** — it pre-populates data that staff and the supervising attorney or EOIR-accredited representative have already decided. The app does not advise on which form to file, does not evaluate eligibility, and does not coach responses.
- Under USCIS policy and Texas law (Gov. Code § 81.102), generating filled immigration forms and advising clients constitutes the practice of law. MOS must operate this tool under supervision of a licensed Texas attorney or hold EOIR accreditation. **Confirm with legal counsel before launch.**

**Texas Data Privacy and Security Act (TDPSA, eff. July 2024)**
- SSN, A-Number, and immigration/citizenship status are **sensitive data** under TDPSA.
- Required before launch: explicit client consent, DPA with Supabase, Data Protection Assessment, published privacy policy, consumer rights flows (access/correction/deletion within 45 days).
- Penalties: up to $7,500/violation (Texas AG enforcement).

---

## 11. Out of Scope (v1)

- AI document extraction (upload passport → auto-fill fields) — Phase 2
- n8n automated cross-sell workflows — Phase 2
- Automated USCIS fee change monitoring — Phase 2
- Tax-specific case management (quarterly deadlines, franchise fees, payroll cycles) — Phase 2
- AI service-specific fields (client goals, business type, detailed plans) — Phase 2
- MFA for Ultimate Admin account — Phase 2
- Client portal (client self-service) — Phase 3
- Spanish language support — Phase 3
- Mobile app — Phase 3
- Attorney representative USCIS account filing — not applicable (UPL concern)

---

## 12. Success Criteria

- Staff can create a client profile and open a case in under 2 minutes
- Copy-paste filing screen covers all fields for N-400, I-485, I-130, I-765
- Document checklist pre-populated correctly per form type
- USCIS status auto-checked daily with staff notification on change
- Package cases (marriage green card) fully supported with petitioner + beneficiary
- Document uploads stored and retrievable, ZIP download works
- Filled PDF generated correctly for I-131 and I-864

---

*Manna One Solution — One Stop, All Solutions.*
*Houston, TX | mannaonesolution.com*
