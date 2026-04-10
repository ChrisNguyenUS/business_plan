# PRD: MannaOS.com — Manna One Solution Website
**Date:** April 9, 2026
**Project:** MannaOS.com
**Tech Stack:** Next.js + Vercel + Supabase
**Owner:** Manna One Solution, Houston, TX
**Phone:** 346-852-4454
**Facebook:** facebook.com/mannaonesolution

---

## 1. Overview

A bilingual (Vietnamese/English) professional website for Manna One Solution — a one-stop service company in Houston, TX offering Tax & Business, Insurance, Immigration, and AI/Automation services. Primary targets: Vietnamese community in Houston and surrounding states.

**Four core goals:**
1. **Lead generation** — get found on Google and AI search, capture leads via form
2. **Credibility** — build trust when prospects look up the business
3. **Booking** — let clients schedule appointments online
4. **Client portal** — let existing clients track their cases and documents

**Three user roles:**
- **Visitor** — public, no login required
- **Client** — authenticated, accesses their own portal
- **Admin** — authenticated, manages content and all client data

---

## 2. Tech Stack & Hosting

| Item | Choice |
|---|---|
| Framework | Next.js (React) |
| Hosting | Vercel (free tier) |
| Domain | MannaOS.com — connect to Vercel |
| Database & Auth | Supabase (shared with internal admin app) |
| File Storage | Supabase Storage |
| Contact form | Formspree (free tier, no extra backend needed) |
| Appointment booking | Calendly embed |
| Deployment | GitHub → Vercel auto-deploy |
| SSL | Automatic via Vercel |
| Cron jobs | Vercel Cron (USCIS auto-sync) |
| Rich text editor | Tiptap |

---

## 3. Design System

### Logo
Two files provided in `/Logo/`:
- `Logo.PNG` — full logo with white background (use in light-bg contexts or contained badge)
- `No background Manna logo.JPG` — for dark backgrounds (place on dark teal surface)

Logo colors extracted (drive the entire site palette):
- **Teal** — primary brand color, the metallic M mark: `#2A9090`
- **Charcoal/black** — dark stroke accent on the M: `#1A1A1A`
- **Metallic silver** — wordmark "MANNA ONE SOLUTION": `#8A9BA8`

> **Note:** Request a transparent PNG version of the logo for clean use on any background color (current files have white/light backing). Until then, use the logo inside a white-background pill/badge in the dark navbar, or place it on a dark teal surface that matches the site.

### Colors
Light, clean palette derived from the logo:
```
Primary background:   #FFFFFF  (white — clean, professional)
Secondary background: #F0F7F7  (very light teal tint — alternate sections, cards)
Surface:              #F8FAFA  (off-white — subtle section separation)
Accent teal:          #2A9090  (logo teal — buttons, links, active states, CTAs)
Accent teal dark:     #1A6060  (hover state, pressed)
Accent gradient:      #2A9090 → #1A6060  (teal gradient — hero CTA buttons)
Silver accent:        #8A9BA8  (logo silver — borders, dividers, secondary badges)
Charcoal:             #1A1A1A  (logo dark stroke — headings, icon fills)
Text primary:         #1A1A1A  (charcoal — matches logo wordmark darkness)
Text secondary:       #4A6868  (teal-tinted dark gray — body, captions)
Border:               #D0E4E4  (light teal-gray — card borders, inputs)
```

### Typography
- **Font:** Inter — Google Fonts, full Vietnamese diacritic support
- **Headings:** Bold, charcoal `#1A1A1A` — complements the bold logo wordmark
- **Body:** Regular weight, `#4A6868` — readable, warm
- **Labels/badges:** Semi-bold, silver `#8A9BA8` — echoes the metallic wordmark feel

### Visual Style
- Clean white background — professional, trustworthy, accessible
- Light teal `#F0F7F7` alternating sections — creates rhythm without dark contrast
- Teal `#2A9090` CTA buttons, links, and active states — logo color drives all interactions
- Silver borders and dividers — echoes the metallic wordmark
- Subtle drop shadows on cards (no glassmorphism — doesn't suit light backgrounds)
- Logo `Logo.PNG` works natively on white background — no transparent PNG required for main site
- Clean whitespace — not cluttered

---

## 4. Site Structure

```
Public:
  /                        Home
  /services                Services overview
  /services/tax            Tax & Business
  /services/insurance      Insurance & Finance
  /services/immigration    Immigration
  /services/ai             AI / Automation
  /about                   About Manna One Solution
  /contact                 Contact & Book Appointment
  /blog                    Blog list (filterable by service category)
  /blog/[slug]             Individual blog post

Auth:
  /login                   Shared login (client + admin)
  /signup                  Client self-registration
  /forgot-password         Password reset

Client Portal (auth required — client role):
  /portal/dashboard        All active services — card per service
  /portal/services/[type]  Dynamic detail page per service type
  /portal/documents        All documents across all services

Admin Panel (auth required — admin role):
  /admin/clients           Client list, search, filter
  /admin/clients/[id]      View + manage client services + documents
  /admin/blog              Blog post list (draft/published)
  /admin/blog/new          Write + publish post with photos
  /admin/blog/[id]/edit    Edit existing post
  /admin/content           Website content editor (cover photos, text sections)

Static:
  /llms.txt                GEO — AI crawler entity description
  /sitemap.xml             Auto-generated via next-sitemap
  /robots.txt              Block /portal and /admin from indexing
```

---

## 5. Database Schema (Supabase)

### profiles
```
id               uuid (→ auth.users)
role             'client' | 'admin'
full_name        text
phone            text
preferred_language  'vi' | 'en'
created_at       timestamp
```

### services
```
id               uuid
client_id        uuid (→ profiles)
service_type     'uscis' | 'tax' | 'insurance' | 'ai' | ...  ← extensible
status           text  (e.g. "In Progress", "Awaiting Documents", "Complete")
metadata         jsonb  ← service-specific fields (see below)
created_at       timestamp
updated_at       timestamp
```

**metadata shapes per service_type:**
```
uscis:      { receipt_number, case_type, last_sync, uscis_status, uscis_description }
tax:        { year, form_type, irs_confirmation, notes }
insurance:  { policy_type, term, value, carrier, policy_number, expiry_date }
ai:         { project_name, phase, next_milestone, notes }
```
New service types = new metadata shape only. No schema migration required.

### service_documents
```
id               uuid
service_id       uuid (→ services)
file_name        text
file_url         text  (Supabase Storage URL)
uploaded_by      'client' | 'admin'
created_at       timestamp
```

### blog_posts
```
id               uuid
slug             text (unique)
title_vi         text
title_en         text
content_vi       text  (Tiptap JSON or HTML)
content_en       text
cover_image_url  text  (Supabase Storage)
category         'tax' | 'insurance' | 'immigration' | 'ai' | 'general'
published        boolean
author_id        uuid (→ profiles)
created_at       timestamp
updated_at       timestamp
```

### site_content
```
key              text (unique)  e.g. 'hero_image', 'about_cover', 'home_headline_vi'
value            text
updated_at       timestamp
updated_by       uuid (→ profiles)
```
Admin edits these via `/admin/content`. Next.js reads them at request time.

### uscis_sync_log
```
id               uuid
service_id       uuid (→ services)
synced_at        timestamp
status_text      text
raw_response     jsonb
```

### Row Level Security (RLS)
- Clients: read/write own rows only across `services`, `service_documents`, `profiles`
- Admins: full access to all tables
- Public: no access to any table (public content served from Next.js static generation)

---

## 6. Public Pages

### 6.1 Home Page (/)

Sections in order:
1. **Navbar** — Logo left | Nav links center | Language toggle pill (EN/VI) + "Book Now" (teal button) + "Sign In" right | White background | Sticky on scroll with subtle shadow
2. **Hero** — Full-width dark gradient, bilingual headline, 2 CTAs: "Đặt lịch ngay" + "Our Services" | Cover photo editable via admin
3. **Services Overview** — 4 cards: Tax, Insurance, Immigration, AI — icon + description + "Learn more"
4. **Why Manna** — 4 trust points: Bilingual service, EFIN licensed, Life Insurance licensed, AI-powered | Credential numbers shown
5. **How It Works** — 3 steps: Contact → Free consultation → We handle it
6. **Contact Strip** — Phone: 346-852-4454 | Facebook | quick inline form
7. **Footer** — Logo, services list, contact info, social links, copyright

No testimonials section at launch — add real reviews when available.

### 6.2 Services Page (/services)
- Overview of all 4 service categories as large cards
- Pricing summary per card
- CTA to individual service pages or /contact

### 6.3 Individual Service Pages

**Tax & Business (/services/tax)**
- Services: Tax prep, Extension filing, LLC setup
- Pricing table:
  - Extension Filing (Form 4868): $50–$75
  - Individual Tax (simple): $150–$250
  - Individual Tax (complex): $250–$400
  - Business Tax (LLC/S-Corp): $400–$800
  - LLC Setup (full package): $300–$500 + state fee
- EFIN credential badge
- FAQ section (5–8 Q&As with JSON-LD schema)
- CTA: Book appointment

**Insurance & Finance (/services/insurance)**
- Services: Life Insurance, Annuity, Retirement Planning
- Commission-based — no fixed pricing
- License credential badge
- FAQ section
- CTA: Free consultation

**Immigration (/services/immigration)**
- Services: N-400, Green Card, Visa Renewal, Consultation
- FAQ section
- CTA: Contact for case evaluation

**AI / Automation (/services/ai)**
- Services: Workflow automation, AI tools for SMBs, Business digitization, Monthly retainer
- Emphasize: "We understand your business — we build the automation"
- FAQ section
- CTA: Free discovery call

### 6.4 About Page (/about)
- Founder story — editable via admin
- Credentials: EFIN number, Life Insurance License number (visible, indexed)
- Mission: "One Stop, All Solutions"
- Serving: Houston, DFW, Austin, Vietnamese communities nationwide
- Cover photo editable via admin

### 6.5 Contact & Booking Page (/contact)
Three methods side by side:
1. **Contact Form** (Formspree) — Name, Phone, Email, Service dropdown, Message
2. **Calendly Embed** — "Book a free 15-min consultation" — clients book directly, no friction
3. **Direct Contact** — 346-852-4454 (click-to-call), Facebook Messenger, Google Maps embed

Floating buttons (fixed bottom-right): Phone + Facebook Messenger

### 6.6 Blog (/blog)
- Filter bar: All | Tax | Insurance | Immigration | AI | General
- Card grid: cover photo, title (VI/EN), category tag, date, excerpt
- Each post: full bilingual content, cover photo, share buttons
- Purpose: SEO + GEO — answer questions Vietnamese community searches for

---

## 7. Client Signup & Auth Flow

**Low-friction signup at /signup:**
```
Step 1: Full name, Email, Phone, Password
Step 2: Supabase sends verification email
Step 3: Client lands on /portal/dashboard (empty state)
         "Your services will appear here after your consultation."
Step 4: Admin receives notification of new signup, schedules consultation,
         assigns services to client profile
```

No service selection on signup — keeps it simple. Admin assigns services after first consultation.

**Login at /login:**
- Single login page for both clients and admins
- Supabase Auth handles sessions
- Role-based redirect: admin → /admin/clients | client → /portal/dashboard

---

## 8. Client Portal

### Dashboard (/portal/dashboard)
- One card per active service showing: service name, status badge, last updated, quick action
- Empty state: friendly message + CTA to book consultation
- Extensible: any new service_type automatically gets a card

### Service Detail (/portal/services/[type])
Dynamic page per service type. Common elements:
- Current status (large, clear)
- Status history timeline
- Documents section: view + download admin-uploaded docs, upload own docs
- Service-specific metadata display (policy details, receipt number, project phase, etc.)

### Documents (/portal/documents)
- All documents across all services in one view
- Filterable by service type
- Upload new documents (client-side)

---

## 9. Admin Panel

### Client Management (/admin/clients)
- List all clients, search by name, filter by service type
- Click into client → see all their services + documents
- Add new service to client (select type → fill metadata → save)
- Update service status + metadata
- Upload documents on behalf of client
- Email notification on new client signup

### Blog Management (/admin/blog)
- List all posts (draft/published), filterable by category
- New post editor:
  - VI tab + EN tab (separate content, same post)
  - Cover photo upload (→ Supabase Storage)
  - Inline photo insertion via Tiptap
  - Category selector (maps to service type)
  - Publish/draft toggle
  - Slug auto-generated from title, editable
- Edit existing posts
- Delete posts

### Website Content Editor (/admin/content)
Admin-editable sections stored in `site_content` table:
```
Home hero image          Cover photo upload
Home hero headline VI    Text field
Home hero headline EN    Text field
About cover image        Photo upload
About bio VI             Rich text
About bio EN             Rich text
Service page images      One upload per service (4 total)
```
Changes reflect on public site immediately (no redeploy needed).

---

## 10. USCIS Auto-Sync

Vercel Cron job runs daily:
1. Queries all `services` rows where `service_type = 'uscis'`
2. Fetches case status from USCIS public case status tool using `metadata.receipt_number`
3. Updates `services.metadata.uscis_status` and `services.metadata.last_sync`
4. Logs result to `uscis_sync_log`
5. Client sees updated status on next portal visit — no action required

---

## 11. Bilingual System

- **Language toggle button** in navbar (right side, always visible): displays current language and switches on click
  - Shows **"VI"** when in English mode → click to switch to Vietnamese
  - Shows **"EN"** when in Vietnamese mode → click to switch to English
  - Styled as a pill button in teal `#2A9090` — clearly visible, not buried in a dropdown
- **Default language: English**
- Selection persists via `localStorage` — survives page refresh and navigation
- Implementation: `next-i18next` with JSON translation files
  - `/locales/en/common.json`
  - `/locales/vi/common.json`
- All static public content translated (both languages fully complete)
- Blog posts have separate `title_en`, `content_en`, `title_vi`, `content_vi` fields — shown based on active language
- Portal and admin UI: English only (admin is bilingual; clients use the toggle for public pages)

---

## 12. SEO Strategy

| Item | Implementation |
|---|---|
| Meta tags | `next/head` — unique title + description per page, bilingual |
| hreflang | VI/EN alternates on all pages |
| OpenGraph | Facebook share preview with cover image |
| Local Business JSON-LD | name, address (Houston TX), phone, hours, service area |
| Service JSON-LD | one per service page |
| Article JSON-LD | on every blog post |
| FAQ JSON-LD | 5–8 Q&As per service page |
| Sitemap | Auto-generated via `next-sitemap`, submitted to GSC |
| robots.txt | Block /portal, /admin, /api |
| Page speed | SSG + Next.js Image — Lighthouse 90+ target |
| Credential display | EFIN + license numbers on About + service pages |
| Target keywords | "khai thuế Houston", "tax prep Houston Vietnamese", "LLC setup Texas", "bảo hiểm nhân thọ Houston", "immigration consultant Houston" |

---

## 13. GEO Strategy (AI Search — ChatGPT, Perplexity, Google AI Overviews)

| Item | Implementation |
|---|---|
| `/llms.txt` | Static file at site root — describes business entity, services, credentials, location for AI crawlers |
| FAQ schema | Reusable FAQ component that auto-renders JSON-LD schema — on every service page |
| Entity consistency | Identical NAP (Name, Address, Phone) on every page, GBP, and Facebook |
| Answer-first content | Blog posts written to directly answer questions — AI engines cite direct answers |
| Credential authority | EFIN + license numbers establish YMYL authority (tax, insurance, immigration) |
| Bing Webmaster | Submit sitemap to Bing (feeds Perplexity and Copilot) |
| GSC verification | Google Search Console at launch |
| Structured metadata | All pages have complete, accurate structured data |

---

## 14. Performance & Quality

- Static generation (SSG) for all public pages — fast, SEO-friendly
- Client portal and admin panel: server-side rendering (SSR) via Supabase Auth
- Images: Next.js `<Image>` with lazy loading + Supabase Storage CDN
- Fonts: `next/font` (no layout shift)
- Mobile-first responsive design
- Lighthouse target: 90+ on Performance, SEO, Accessibility

---

## 15. Out of Scope (v1)

- Payment processing online
- Live chat
- CRM integration
- Spanish (Hispanic market) — Phase 2
- Bookkeeping/Payroll pages — Phase 2
- Social media cross-posting agent — separate project
- Internal document management app — separate project (shares Supabase DB)

---

## 16. Success Criteria

- Website live and indexed by Google within 1 week of launch
- Contact form delivering emails
- Calendly booking functional
- Client signup, login, and portal working end-to-end
- USCIS auto-sync running daily
- Admin can publish blog posts with photos
- Admin can update cover photos and key content without code changes
- Bilingual toggle working correctly
- Mobile-responsive on iOS and Android
- Domain connected and HTTPS active
- Lighthouse 90+ across Performance, SEO, Accessibility
- /llms.txt live and accessible

---

## 17. Domain Connection Steps

1. In Vercel: Add custom domain MannaOS.com → copy DNS records
2. In domain registrar: Update DNS (A record + CNAME)
3. Wait 24–48h for propagation
4. Vercel auto-provisions SSL certificate
5. Submit sitemap to Google Search Console and Bing Webmaster Tools

---

*Manna One Solution — One Stop, All Solutions.*
*Houston, TX | MannaOS.com | 346-852-4454*
