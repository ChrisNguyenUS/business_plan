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
| PDF generation | `pdf-lib` (JS) | Fill USCIS PDFs for mail filing |
| Hosting | Vercel | Same as public site, auto-deploy |
| Auth | Supabase Auth | Email/password for staff accounts |
| USCIS tracking | USCIS public status endpoint | No login required, receipt number only |

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

users (staff)
├── id (Supabase Auth)
├── name
└── role (admin | staff)
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

- USCIS provides a public case status endpoint queryable by receipt number (no login required)
- App queries daily for all cases with status not in (approved, denied, archived)
- On status change: log to `status_history`, flag case in dashboard, notify assigned staff
- Receipt number format: 3-letter code + 10 digits (e.g., `IOE0123456789`, `WAC2190012345`)
- Staff enters receipt number manually after client receives it (email from USCIS or mail notice)

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
- Two roles:
  - **Admin** — full access, manage staff accounts, view all cases
  - **Staff** — create and manage cases, no access to staff management
- No client-facing login — internal tool only
- Hosted at `app.mannaonesolution.com` — not linked from public site

---

## 11. Out of Scope (v1)

- AI document extraction (upload passport → auto-fill fields) — Phase 2
- n8n automated cross-sell workflows — Phase 2
- Client portal (client self-service) — Phase 3
- Payment processing — Phase 3
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
