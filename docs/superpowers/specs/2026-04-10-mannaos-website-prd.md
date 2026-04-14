# MannaOS.com — Manna One Solution Website

**Date:** April 10, 2026
**Revision:** April 11, 2026 — V1 reframed into **Phase A (4-service marketing showcase — ship-to-show + Facebook ads)** then **Phase B (Immigration SEO/GEO topical depth)**. The immigration Texas-only scope and all SEO/GEO work from the 4/10 draft are preserved inside Phase B.
**Project:** MannaOS.com
**Tech Stack:** Next.js 14 + Vercel + Supabase
**Owner:** Manna One Solution
**HQ Address:** `Bellaire Blvd, Houston, TX 77036` _(placeholder — street number to be decided)_
**Phone:** 346-852-4454
**Email:** `Chris@mannaos.com`
**Facebook:** facebook.com/mannaonesolution
**V1 Positioning:** **One Stop, All Solutions** — a single bilingual marketing site that showcases all four Manna One Solution services (Tax & Business · Insurance & Finance · Immigration · AI / Automation). Needs to be ship-ready so the owner can show it to clients and point Facebook ad traffic at it.
**V1 Phase A (Priority 1 — ship first, ~2 weeks):** 4-service landing page + service overview pages (Tax, Insurance, Immigration, AI) + About + Contact/Calendly + bilingual — built to convert ad traffic and client demos. Basic SEO hygiene only (meta, OG, sitemap, schema stubs).
**V1 Phase B (Priority 2 — follows Phase A):** The full Vietnamese USCIS immigration topical map (pillar → Texas state → 4 Texas cities → 11 form clusters → 5 bundles) with fact-dense pricing, FAQPage schema, /llms.txt, and GEO content rules from the original 4/10 draft. Texas-only immigration scope preserved.
**Phase 1.5+ Services:** Full tax topical map (Jan–Apr 2027 season), insurance (TX-only), AI Automation deeper topical map.
**Credentials (current):** IRS EFIN `857993` · Texas Life Insurance License `3142469` · Texas Property & Casualty Insurance License `3118525` · NPN `21024561` · PTIN-registered
**Credentials (planned pre-launch):** Texas Notary Public (for in-house signature verification on USCIS forms)
**Service footprint:** Texas residents only in V1 (document preparation is regulated state-by-state; see §1 Geographic Scope)
**Languages:** Vietnamese (primary community) + English

---

## 1. Overview & Goals

### Problem Statement

- **Manna One Solution has no live website.** The owner cannot show prospective clients a professional online presence during in-person consultations, cannot hand out a URL on business cards, and cannot run Facebook ads against the Vietnamese-American community in Houston because there is no landing page to send traffic to. Every other problem below is gated by this one: until the site is public, visible, and conversion-ready, the other problems have no surface to work on.
- **Clients and prospects hear about four services (Tax · Insurance · Immigration · AI) by word of mouth, but have no way to see them in one place.** The business is literally called "Manna One Solution" — "One Stop, All Solutions" — so the site must communicate the full service menu at first glance, even if only immigration is being aggressively SEO-optimized in Phase B.
- **Vietnamese community members in Texas** seeking help with USCIS immigration forms (green card, citizenship, work permit, travel documents, removing conditions on marriage-based green cards) **struggle to find an affordable, Vietnamese-speaking, transparent document preparer**. Their options today are: (a) immigration attorneys who charge 2–5× more than the forms require for straightforward cases, (b) generic non-attorney preparers who don't speak Vietnamese, or (c) "notario" scammers who pretend to be lawyers and often harm the case.
- **Vietnamese-speaking clients distrust non-attorney preparers** because of widespread notario fraud targeting immigrant communities. Any new entrant must aggressively differentiate on *transparency*, *honest scope disclosures*, and *accurate pricing* — not just language.
- **Existing and prospective clients** cannot easily look up USCIS filing fees, typical processing times, or package pricing in Vietnamese because USCIS.gov is English-only and community resources are scattered across Facebook groups.
- **Prospects researching services online** cannot evaluate Manna One Solution's credibility because the business has no professional website and no visible credentials on the public web.
- **The owner** (the business operator, also the document preparer) needs a simple portal to track active cases, upload documents securely, and publish bilingual educational content — without building a bespoke CRM.

### Product Goals

Goals are ordered by Phase A (ship-to-show + ads) then Phase B (SEO/GEO depth). Priority is literal — Phase A goals ship before Phase B goals are touched.

**Phase A — Priority 1 (ship-to-show + Facebook ads, ~2 weeks)**

1. **Ship a credible, bilingual, 4-service marketing site** — Home landing page + About + Contact + four service overview pages (Tax, Insurance, Immigration, AI) in VI and EN. Ready to hand a URL to a prospect during an in-person meeting. "Don't have a website" must no longer be true.
2. **Make the site ad-ready for Facebook campaigns** — Meta Pixel + Conversions API installed, server-side event de-dup, clear primary CTA (Calendly booking), mobile-first above-the-fold hero that converts cold traffic from paid ads, UTM-aware lead capture, LCP <2.5s on 4G for the ad landing target.
3. **Communicate "One Stop, All Solutions" at a glance** — the Home page must show all 4 services side by side (banner → 4 service cards → trust badges → how it works → contact strip) per the April 9, 2026 design doc (`2026-04-09-mannaos-website-design.md`). Clients must understand the full menu in 5 seconds.
4. **Enable self-service booking** — prospects can schedule free consultations (remote video or in-person at Houston HQ) via Calendly embedded on /contact. The Calendly path is the primary Phase A conversion event.
5. **Capture every lead safely** — contact form with dual delivery (Resend email + Supabase backup). Basic bilingual labels, light spam protection, Texas residency field on the immigration-specific form (non-TX referrals still routed to legal aid, but the site itself welcomes cross-service Texas leads).

**Phase B — Priority 2 (SEO/GEO depth, starts after Phase A ships)**

6. **Become the trusted Vietnamese-language USCIS document preparation source in Texas** — rank on Google and AI search (ChatGPT, Perplexity, Google AI Overview, Copilot) for Vietnamese-language immigration form queries ("khai N-400", "gia hạn thẻ xanh", "làm giấy tờ bảo lãnh vợ chồng", etc.) targeted at Texas residents. Build out the full topical map in §2a: pillar → Texas state → 4 city pages → 11 form clusters → 5 bundles, per locale.
7. **Win the transparency battle** — publish total package prices (service fee + USCIS filing fee) for every form and bundle on the public site. Almost no competitor does this in Vietnamese. It is both an SEO/GEO signal (fact density) and a notario-fraud differentiator.
8. **Establish credibility despite being new** — compensate for low client count with (a) clear non-attorney disclosures, (b) deep and accurate educational content citing USCIS.gov directly, (c) Texas Notary Public credential for signature verification, (d) honest scope ("we prepare — we do not give legal advice"), (e) strong referral paths to pro-bono legal orgs for complex cases we cannot handle.
9. **Give clients a case-tracking portal** — authenticated view of their case status, uploaded documents, and USCIS receipt numbers. Reduces "what's happening with my case?" phone calls.
10. **Empower admin content management** — let the owner publish bilingual blog posts across the immigration topical map without developer involvement.
11. **Build a credible SEO foundation that later extends to tax, insurance, and AI automation** — every choice in Phase B (topical map, URL architecture, schema, i18n) must support adding those pillars in Phase 1.5 without requiring architectural rework.

### Target Users

**Primary Persona: Texas-resident Vietnamese family navigating USCIS paperwork**
- Age: 25–65
- Location: Houston (primary), Dallas-Fort Worth, Austin, San Antonio (secondary — content + remote delivery)
- Technical comfort: moderate — uses Facebook, Zalo, YouTube, Google on mobile daily
- Life stage triggers that bring them to the site:
  - Green card expiring → needs I-90 renewal
  - 5 years as permanent resident → ready for N-400 citizenship
  - Marriage to a U.S. citizen → needs I-130 + I-485 + work permit + travel doc
  - 2-year green card expiring → needs I-751 to remove conditions
  - Lost / stolen green card → needs I-90 replacement
  - Needs emergency travel → needs I-131 advance parole
  - Sponsoring a parent / child / sibling → needs I-130
- Motivation: find a Vietnamese-speaking preparer who (a) charges clearly and fairly, (b) explains what they can and cannot do, (c) is NOT a notario scammer, (d) handles the paperwork correctly the first time
- Device: 75% mobile, 25% desktop
- Primary fear: getting scammed or having their case denied because of a wrong form

**Secondary Persona: Existing client tracking their USCIS case**
- Same demographic, now post-engagement
- Context: wants to know "where is my case at USCIS?" without calling the office
- Motivation: peace of mind, document access, receipt-number visibility

**Tertiary Persona: Houston walk-in / local referral**
- Subset of the Primary Persona who searches "văn phòng làm giấy tờ di trú Houston", "USCIS help near me", or similar
- Reached through Local Pack + GBP + in-person consultations at the Bellaire Blvd HQ
- Expected to drive first V1 revenue while SEO traction builds

**Quaternary Persona: Business owner / admin**
- Single admin user (the owner) managing 5–25 active immigration cases at a time in V1
- Context: case tracking, document uploads, blog publishing, review requests
- Motivation: run the practice without spreadsheets or email chains

### V1 Rollout Order — Phase A (Ship-to-Show + Ads) → Phase B (SEO/GEO Depth)

This section is the **single source of truth** for which work ships first. Every other section in this PRD — scope, feature breakdown, flows, timeline, metrics — is ordered against this rollout plan. The original 4/10 draft rolled all the immigration SEO/GEO work into "Phase 1"; this revision splits that Phase 1 into **Phase 1A (Marketing Landing)** and **Phase 1B (Immigration Topical Map)**.

```
  ┌────────────────────────────────────────────────────────────────┐
  │  PHASE A — MARKETING LANDING (Priority 1, ships first, ~2 wk) │
  ├────────────────────────────────────────────────────────────────┤
  │  • Bilingual (VI/EN) Home landing page — 4 service showcase   │
  │    (banner hero · 4 service cards · trust badges · how it     │
  │     works · contact strip · footer) per 2026-04-09 design     │
  │  • 4 Service Overview pages: Tax · Insurance · Immigration ·  │
  │    AI — one-pagers, each with pricing summary and CTA         │
  │  • About page with founder bio + credentials                   │
  │  • Contact page with Calendly embed + contact form (Resend +  │
  │    Supabase backup)                                           │
  │  • Privacy Policy + Terms of Service (stubs per locale)       │
  │  • Meta Pixel + Conversions API, GA4, UTM capture             │
  │  • Basic SEO hygiene: per-page <title>/meta, OG image,        │
  │    sitemap.xml, robots.txt, /llms.txt stub, Organization +    │
  │    LocalBusiness JSON-LD, hreflang EN⇄VI                      │
  │  • Floating contact buttons (phone · Messenger · Zalo)        │
  │  • Mobile-first, LCP <2.5s on 4G (ad landing target)          │
  │                                                                │
  │  Phase A deliberately does NOT include: the 11 form cluster    │
  │  pages, the 5 bundle pages, the 4 Texas city pages, the full   │
  │  notario fraud awareness / referral-out trust pages, the       │
  │  client portal, the admin panel, or the blog system. Those    │
  │  are Phase B work that starts the day Phase A ships.           │
  └────────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────────────┐
  │  PHASE B — IMMIGRATION SEO/GEO DEPTH (Priority 2, follows A)  │
  ├────────────────────────────────────────────────────────────────┤
  │  • Full immigration pillar + Texas state cluster + 4 Texas    │
  │    city support pages per §2a                                  │
  │  • 11 form cluster pages (I-90, I-130, I-485, I-751, I-765,   │
  │    I-131, N-400, N-600, I-864, I-912, AR-11) × 2 locales      │
  │  • 5 bundle pages × 2 locales                                  │
  │  • Non-Attorney Disclosure + Notario Fraud Awareness +        │
  │    Need-an-Immigration-Attorney referral-out pages             │
  │  • Fact-dense pricing tables (Service Fee + USCIS Fee =       │
  │    Total) with "verified as of" timestamps                     │
  │  • Full JSON-LD matrix (LegalService, Service, Offer, HowTo,  │
  │    FAQPage, Speakable, BreadcrumbList, Person, Article)        │
  │  • Full /llms.txt immigration scope, AI crawler opt-in,       │
  │    monthly AI citation audit process                          │
  │  • Blog system + Tiptap editor with SEO publish-blockers      │
  │  • Client portal (dashboard · case list · case detail ·       │
  │    document upload/download · USCIS status display)            │
  │  • Admin panel (clients · cases · blog · content editor ·    │
  │    review-ask)                                                 │
  │  • Texas residency gate on immigration-specific contact flow  │
  │  • All SEO/GEO content rules from §2a and §4.8 L4             │
  └────────────────────────────────────────────────────────────────┘
```

**Why this ordering (and not the original 4/10 order):**

- The owner cannot run Facebook ads, show the site to walk-in clients, or hand out business cards with a URL until a landing page exists. Phase A solves that in ~2 weeks. Phase B (the SEO topical map) takes much longer and does not unblock ads or in-person demos.
- Phase A and Phase B share the same tech stack, the same design system, the same bilingual routing, and the same Supabase project. Nothing in Phase A is throwaway. Phase B extends Phase A's foundation.
- The Phase B immigration topical map is **not deleted** or watered down. Every piece of immigration content, schema, pricing strategy, notario fraud differentiation, and GEO work from the original 4/10 draft is preserved — it just runs second. The Phase A landing page links to immigration (even before Phase B ships) via a simple overview page; once Phase B lands, the Home service card for Immigration starts pointing at the full pillar.
- Texas-only regulatory gating for immigration still applies. Phase A's Immigration service card and overview page must carry the non-attorney disclosure and Texas-residents-only scope statement from day 1, even though the deep form cluster pages don't exist yet. The Tax / Insurance / AI cards are marketing-stage only in Phase A with a "Book a free consultation" CTA — no deep topical map.

### Geographic Scope

**V1 is Texas-only for immigration services.** This is a deliberate regulatory and strategic decision, not a growth ceiling. Tax, Insurance, and AI services are constrained separately — see §1 Regulatory Constraints and the per-service notes below.

```
V1 LAUNCH TARGET: Texas residents only
  Houston, TX — street address, GBP, Apple Business Connect, Bing Places, local citations,
  Vietnamese American Chamber of Commerce of Houston, in-person consultations.
  Texas state-level content for remote Dallas-Fort Worth, Austin, San Antonio clients.

V1 CITY SUPPORT COVERAGE (within Texas):
  Houston (HQ — full Local Pack optimization, in-person + remote)
  Dallas-Fort Worth (remote delivery, state-level content)
  Austin (remote delivery, state-level content)
  San Antonio (remote delivery, state-level content)

PHASE 1.5 (post-V1 validation, pending state registration):
  None for immigration until owner registers as an Immigration Consultant / Document
  Preparer in additional states. See §1 Regulatory Constraints below.

PHASE 2 (other services):
  Tax preparation (national — EFIN is federal, PTIN valid in all states)
  Life + P&C Insurance (Texas-only due to Texas-only licenses)
  AI Automation Consulting (national — no licensing)

RATIONALE:
  → Immigration document preparation by non-attorneys is regulated at the STATE level,
    not just the federal level. Texas is permissive (no specific consultant registration).
    CA/NV/FL/IL/WA/MD/MN/NC/NY all require registration + bonding; unauthorized practice
    in those states ranges from misdemeanor to felony (CA Immigration Consultants Act,
    FL UPL, NV Document Preparation Services Act).
  → Launching Texas-only lets MannaOS build topical authority and client volume without
    regulatory exposure. Expansion to other states is a registration + bond decision, not
    a website decision.
  → Houston Vietnamese community (Little Saigon / Asiatown / Bellaire corridor) is one
    of the largest concentrations in the U.S. — sufficient TAM for V1 revenue targets.
  → Texas-only also tightens the SEO signal: a site focused on "Vietnamese USCIS help in
    Texas" outranks a thinner multi-state site on the queries that matter most.
```

**V1 Regulatory Constraints — Immigration Document Preparation:**

| Constraint | Status | Implication |
|---|---|---|
| **State-level consultant registration** | Texas = no registration required. All other states = requires registration/bonding. | V1 site scopes marketing, schema `areaServed`, and service delivery to **Texas only**. Any marketing, ad copy, or schema that implies service to CA/NV/FL/IL/WA/MD/MN/NC/NY without registration is a regulatory violation in those states. |
| **Unauthorized Practice of Law (UPL)** | Federal + state. MannaOS is a **document preparer**, not a law firm. | Every page + blog post + FAQ + schema must include the explicit disclaimer: "We are not attorneys. We prepare USCIS forms at your direction. We do not provide legal advice." Must recommend an attorney for complex cases (RFEs, NOIDs, prior denials, criminal history, inadmissibility issues). |
| **Notario fraud differentiation** | Community-specific trust issue. | Site must prominently state non-attorney status and link to free legal aid orgs (CLINIC, KIND, Catholic Charities, AILA pro-bono) for clients who need an attorney. This is both ethically required and a community-trust differentiator. |
| **Form G-28 eligibility** | Requires BIA accreditation or attorney bar admission. MannaOS does NOT file G-28. | Owner signs USCIS forms as the "preparer" (Form section "Preparer's Statement") only. Does not represent clients before USCIS. Does not attend USCIS interviews as a representative (can attend as a translator/companion only if permitted). |
| **Texas Notary Public** | Planned pre-launch. | Enables in-house signature witnessing for USCIS forms. Adds a verifiable credential for E-E-A-T. |
| **Fee transparency** | Competitive differentiator + SEO fact density. | All prices published on the public site as "Total = Service Fee + USCIS Filing Fee". USCIS fees are quoted live with a "verified as of [date]" footer and a link to `uscis.gov/forms/filing-fees`. |

**Future (non-V1) services — retained in PRD for architectural continuity:**

| Service | Timing | Delivery scope |
|---|---|---|
| Tax preparation | Phase 1.5 (Jan–Apr 2027 tax season) | National — EFIN is federal, PTIN valid in all states |
| Life insurance (term, whole, IUL) | Phase 1.5 or Phase 2 | ⚠️ Texas only — Texas Life License 3142469 |
| Property & Casualty insurance (auto, home, commercial) | Phase 1.5 or Phase 2 | ⚠️ Texas only — Texas P&C License 3118525 |
| AI automation consulting | Phase 2 | National — no licensing |

### Scope & Non-Scope

**In Scope — Phase A (Marketing Landing + Facebook Ads, ~2 weeks, ships first):**
- Bilingual (VI + EN) public marketing site with **subdirectory i18n routing** (`/en/...` and `/vi/...`, never toggle-on-one-URL), but with a **small Phase A route tree**, not the full Phase B topical map
- **Home landing page** — banner hero, 4 service showcase cards (Tax · Insurance · Immigration · AI), "Why Manna" trust badges, "How It Works" 3-step, contact strip, footer — per the 2026-04-09 design doc
- **4 service overview pages** (one-pagers, brochure-style) — `/services/tax`, `/services/insurance`, `/services/immigration`, `/services/ai` — each with bilingual headline, service list, pricing summary, trust credential, FAQ stub, Calendly CTA. Immigration page carries the non-attorney disclosure and Texas-only scope statement even though the Phase B form cluster pages don't exist yet.
- **About page** — founder bio, credentials (EFIN, Texas Life/P&C licenses, Texas Notary when granted), "One Stop, All Solutions" mission, Houston HQ address
- **Contact page** — Calendly embed (free tier, one event type), contact form (Resend + Supabase backup), Houston HQ map, phone click-to-call, Facebook Messenger deep link, Zalo deep link
- **Legal pages** — Privacy Policy + Terms of Service stubs per locale (required for GA4 consent + Meta Pixel)
- **Ad infrastructure** — Meta Pixel + Conversions API (server-side event de-dup), GA4 with `lead`, `calendly_booking_complete`, `form_submit`, `page_view`, `outbound_click` events, UTM parameter capture persisted on the contact form, consent banner for EU/CA visitors
- **Design system + shared components** — the exact palette, typography, and logo rules from §7 (already derived from the logo). All components built in Phase A are reused by Phase B — no throwaway work.
- **Basic SEO hygiene** — unique `<title>` + meta description per page (bilingual), OG image, hreflang reciprocal, canonical tags, auto-generated `sitemap.xml`, `robots.txt`, Organization + LocalBusiness JSON-LD in root layout, a stub `/llms.txt` describing the 4-service business entity (detailed immigration-scope /llms.txt lands in Phase B). No form-level schema, no HowTo, no itemized Offer schema — those are Phase B.
- **Floating contact buttons** — fixed bottom-right: phone, Facebook Messenger, Zalo
- **Performance budget** — Home LCP <2.5s on 4G mobile; Lighthouse mobile Performance 90+. This is the ad landing page — it gets the strictest budget in Phase A.
- **Supabase project bootstrap** — create the project, set up `contact_submissions` table, connect Resend for outbound email. (Full schema for cases, blog, portal is Phase B.)

**In Scope — Phase B (Immigration SEO/GEO Depth + Portal + Admin, starts after Phase A ships):**
- **Full immigration topical map per §2a** — pillar (`/en/services/vietnamese-immigration-document-preparation/` + VI equivalent) · Texas state cluster · 4 Texas city support pages (Houston, DFW, Austin, San Antonio) · 11 form cluster pages · 5 bundle pages — every page in both locales with native Vietnamese slugs
- **Non-attorney disclosure system** — above-the-fold banner component on every pillar/form/bundle page + standalone `/non-attorney-disclosure/`, `/notario-fraud-awareness/`, `/need-an-immigration-attorney/` trust pages per locale
- **Published pricing tables on every form & bundle page** — Service Fee + USCIS Filing Fee = Total, "verified as of" timestamps, admin-editable via `site_content`
- **Texas residency gate** — on the immigration-specific contact path, non-TX submissions receive an automated Resend reply + referral block pointing to CLINIC/KIND/AILA
- **Full JSON-LD schema matrix** — LegalService, Service, Offer (itemized bundles), HowTo, FAQPage, Speakable, BreadcrumbList, Person, Article, as documented in §4.8 L4
- **Expanded `/llms.txt`** — full immigration scope entity description with form-level pricing, credentials, per-state availability
- **GEO content rules** — answer-first content, fact density, ≥3 internal links per page, ≥1 outbound .gov link, 5–8 visible FAQ matching FAQPage JSON-LD, monthly AI citation audit process
- **Blog system** — Tiptap editor with post_type (pillar/cluster/support) tier, per-locale slugs, bilingual title + content, cover photo, category, SEO publish-blockers (meta desc, OG image, author, ≥3 internal links, ≥1 .gov outbound link, FAQ, word count by tier)
- **Client portal** — signup, login, forgot-password (Supabase Auth + Resend), dashboard with active case list, case detail (receipt number, status, history, documents), document upload/download
- **Admin panel** — client management, case management (create/update/upload), blog editor, website content editor, review acquisition UI
- **USCIS case status display** — reads from shared Supabase DB populated by the internal staff app's Playwright agent (MannaOS.com stays read-only)
- **Automated review acquisition system** — post-case Resend email + opt-in SMS with short Google review link, one-per-case enforcement
- **Off-site directories** — GBP (Houston), Apple Business Connect, Bing Places, Yelp, BBB, Nextdoor, Vietnamese American Chamber of Commerce — NAP consistency across all
- **Full GA4 event coverage** — all events in §3 Feature Breakdown

Everything below this line about "V1" originally referred to the unified immigration-first scope. Treat references to "V1" in §2a and §4.8 as **Phase B scope** unless otherwise annotated.

- **One service pillar optimized for SEO/GEO: Vietnamese USCIS Document Preparation, Texas residents** (Phase B only)
- Core pages per locale: Home, Immigration Services pillar (EN + VI), Texas state page, Houston city page, form-specific pages (one per major USCIS form), About, Contact, Pricing, Blog (list + detail), Privacy Policy, Terms of Service, **non-attorney disclosure page**, **notario fraud awareness page**
- Bilingual system (Vietnamese / English) — **separate URLs per locale**, native Vietnamese slugs, reciprocal `hreflang`, localized metadata, localized FAQ schema, localized JSON-LD
- SEO: per-locale metadata, canonical tags, sitemap per locale, robots.txt (with AI crawler opt-in), JSON-LD (LocalBusiness, LegalService, Service, FAQPage, Article, BreadcrumbList, Person, Organization, Speakable, HowTo for form guides, Offer for each priced bundle)
- GEO: `/llms.txt`, answer-first content format, fact-dense pages with published total prices (service + USCIS fee), outbound `.gov` links to every form on uscis.gov, dedicated FAQ section on every page with matching FAQPage JSON-LD, monthly AI citation audit process
- **Published pricing tables** — every service and bundle shows Service Fee + USCIS Filing Fee + Total, with a "USCIS fees verified as of [date]" footer and a link to `uscis.gov/forms/filing-fees`
- **Topical Map implementation (V1 tier):** 1 national pillar (immigration) × 2 languages = 2 pillar pages. Texas state page × 2 = 2. Houston city page × 2 = 2. Form-specific cluster pages (one per major form: I-90, I-130, I-485, I-751, I-765, I-131, N-400, N-600, I-864, I-912, AR-11) × 2 = 22. Bundle pages (Marriage GC, Parent/Child petition, Citizenship Fast-Track, GC Renewal + Travel, Remove Conditions + EAD) × 2 = 10. See §2a.
- **Total service-content pages V1:** ~38 per locale = 76 including both languages (static pages + pillar + cluster + support) — see §3 Information Architecture
- Google Analytics 4 from launch with custom events (page views, contact form submissions, Calendly clicks, language switcher clicks, outbound .gov clicks, phone click-to-call, Messenger clicks, locale-detected preference, review-ask modal shown/completed, pricing-table view, form-specific page scroll depth)
- Contact form (Resend + Supabase backup) + Calendly booking embed, per-locale labels, **mandatory "Are you a Texas resident?" field** (out-of-state responders get an automated reply explaining the scope limitation and referring to CLINIC/KIND free legal aid orgs)
- **Automated review acquisition system** — post-case SMS/email ask via Resend with locale-appropriate message + short Google review link
- Client signup, login, password reset (Supabase Auth), per-locale auth emails
- Client portal: dashboard with active case list, USCIS receipt-number display, document upload/download, per-case status (Draft → Submitted to USCIS → Biometrics → Interview → Decision)
- USCIS case status display (reads from shared Supabase DB, populated by internal staff app polling USCIS online case status)
- Admin panel: client management, case management (create case, update status, upload USCIS correspondence), blog editor (Tiptap) with post-type tier (pillar / cluster / support) and SEO publish-blockers, website content editor, review-ask trigger
- Supabase database with RLS (profiles, cases, case_documents, blog with per-locale slugs, site_content, contact_submissions, review_requests, uscis_receipts)

**Out of Scope (deferred to Phase 1.5 or later):**
- **Tax preparation pages and content** — deferred to Phase 1.5 (Q3 2026, ahead of 2027 tax season). Architecture must support adding the pillar without rework.
- **Life Insurance and P&C Insurance pages** — deferred to Phase 1.5 or Phase 2. Texas-only when added.
- **AI Automation Consulting pages** — deferred to Phase 2.
- **Non-Texas immigration marketing** — blocked until owner registers as an Immigration Consultant in additional states.
- **Form G-28 representation** — requires BIA accreditation or bar admission; not offered.
- **In-person USCIS interview representation** — requires attorney. MannaOS can only attend as a translator/companion where allowed.
- **Complex cases** (RFEs, NOIDs, denials, inadmissibility, criminal history) — explicitly referred to attorneys via the referral-out page.
- Online payment processing — V2 after validating service demand (V1 uses invoicing + Zelle / Venmo / cash / check)
- Live chat — V2; phone + Facebook Messenger + Zalo covers initial needs
- CRM integration (HubSpot, Salesforce) — V2 if client volume justifies
- Spanish language support — V2.5 targeting Hispanic market
- Social media cross-posting — separate project
- Internal staff management app — separate project (shares Supabase DB)
- Mobile native app — responsive web is sufficient for V1

### Success Metrics

Metrics are split by phase. **Phase A metrics are the primary success signal for V1.0** — they tell the owner whether the landing page is doing its job (showing clients + converting Facebook ad traffic). Phase B metrics (SEO/GEO depth, AI citations, Local Pack) are secondary and measured on a longer horizon.

**Phase A — Marketing Landing + Facebook Ads (Priority 1):**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Home landing LCP (mobile, 4G, 75th pct) | <2.5s | PageSpeed Insights, GSC CWV report |
| Home Lighthouse Performance (mobile) | ≥90 | Lighthouse CI |
| Phase A launch-ready date | ≤14 days after kickoff | Git tag |
| Meta Pixel + CAPI firing | PageView, Lead, Schedule, Contact all verified in Events Manager Test Events within Day 1 of launch | Meta Events Manager |
| Facebook Ad CTR (cold VI audience, Houston geo) | ≥1.5% on first campaign, ≥2.5% by day 30 | Meta Ads Manager |
| Facebook Ad cost per landing page view | ≤$0.25 CPC (Houston VI audience benchmark) | Meta Ads Manager |
| Facebook Ad cost per Calendly booking (primary conversion) | ≤$25/booking at launch, ≤$15/booking by day 30 | Meta Ads Manager + Calendly |
| Bounce rate on /home from paid traffic | <55% | GA4 segmented by UTM source=facebook |
| Calendly bookings sourced from ads | ≥3/week from day 14, ≥8/week by day 45 | GA4 + Calendly analytics |
| Contact form submissions (all services combined) | ≥2/week from day 14, ≥5/week by day 45 | Supabase `contact_submissions` |
| In-person demo URL handoffs (owner hands out the URL during consultations) | Qualitative — owner reports the site is "show-ready" in the first consultation after launch | Owner self-report |
| Cross-service lead mix | Tracked from day 1: Tax / Insurance / Immigration / AI breakdown of contact form `service_interest` field | Supabase query |

**Phase B — Immigration SEO/GEO Indexing & Technical (Priority 2):**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Google indexing (EN + VI) | All public URLs indexed within 14 days of launch on both Google and Bing | Google Search Console + Bing Webmaster |
| Lighthouse scores | 90+ on Performance, SEO, Accessibility, Best Practices (mobile) | Lighthouse CI |
| Core Web Vitals (mobile, 75th percentile) | LCP < 2.5s, CLS < 0.1, INP < 200ms | PageSpeed Insights + GSC CWV report |
| hreflang validation | Zero hreflang errors in GSC International Targeting report | GSC |
| NAP consistency | 100% match across website, GBP, Apple Business Connect, Bing Places, Yelp, BBB | Manual quarterly audit |

**Traffic & Lead Generation (V1 — immigration-only, Texas-only):**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Organic sessions | ≥30/month by day 60; ≥120/month by day 120; ≥300/month by day 180 | GA4 |
| Contact form submissions (Texas residents) | ≥2/week by day 45; ≥4/week by day 90 | Supabase `contact_submissions` + residency field |
| Calendly bookings | ≥1/week by day 30; ≥3/week by day 90 | Calendly analytics |
| Paid cases (actual revenue, not just consultations) | ≥2 new cases in month 1; ≥5/month by day 90; ≥10/month by day 180 | Admin cases dashboard |
| Mobile vs. desktop split | Tracking active from day 1, mobile ≥70% expected (community trends toward mobile-only) | GA4 device report |
| In-person vs. remote case split | Tracking from day 30 — in-person should be ≥40% given Houston proximity | Calendly + cases.delivery_mode field |
| Out-of-state form submissions (safety signal) | <5% of total — if higher, tighten geo targeting and contact form wording | Supabase query |

**AI Search (GEO) & Topical Authority (V1 — immigration queries):**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| AI citation audit | Monthly audit of top 20 immigration-form queries (VI + EN) across Google AI Overview, ChatGPT, Perplexity, Microsoft Copilot | Spreadsheet: Query × Engine × Cited Y/N × Date |
| AI citation frequency | ≥2 of top 20 queries cited by at least one AI engine by day 120 | Monthly audit |
| Branded search volume | "manna one solution" branded queries growing ≥20% month-over-month after day 90 | GSC → filter by query containing brand name |
| Share of voice (VI queries) | Appear on page 1 for ≥3 Vietnamese-language immigration queries by day 120, ≥8 by day 180 | GSC Performance report |
| FAQPage rich result impressions | Visible in GSC Performance → Search Appearance → FAQ rich result within 30 days | GSC |
| HowTo rich result impressions | Form-guide pages show HowTo rich result within 60 days | GSC |

**Local SEO (Houston / Texas Local Pack):**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Google Business Profile verified | Verified before V1 launch | GBP dashboard |
| Apple Business Connect verified | Verified before V1 launch | Apple Business Connect |
| Bing Places verified | Verified before V1 launch | Bing Places |
| Google reviews | ≥3 by day 60; ≥10 by day 180; avg rating ≥4.7 (realistic given 1–2 current clients) | GBP Insights |
| GBP profile views | ≥300 profile views/month by day 90 | GBP Insights |
| Local Pack appearance | Appear in Local Pack for "dịch vụ di trú Houston", "USCIS help Houston Vietnamese", and 3 other Houston-anchored immigration queries by day 120 | Manual SERP check |

**Content Engine:**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Blog publishing cadence | ≥2 posts/month per locale (4 total across EN + VI) | blog_posts table |
| Pillar / cluster / support tier ratio | Across V1, maintain ~1 : 3 : 5 tier ratio in blog post distribution | blog_posts.post_type field |
| Content decay monitoring | Review posts >6 months old quarterly; refresh dateModified if still current | Admin dashboard alert |

**Product (Client Portal + Admin):**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Client portal adoption | 80% of active clients registered within 30 days | Supabase auth count vs. active clients |
| USCIS status freshness | Data no more than 24 hours old (depends on staff app sync) | uscis_sync_log.synced_at timestamp |

---

## 2. User Stories

V1 user stories center on Vietnamese-speaking Texas residents preparing USCIS immigration
forms. Tax, insurance, and AI automation stories are deferred to Phase 1.5+.

### Story 1: Vietnamese Green Card Holder (Houston) Renews an Expiring Green Card

- **User Role**: Visitor (Vietnamese-speaking prospect in Houston, green card expires in 4 months)
- **Goal**: File Form I-90 to renew an expiring green card without getting scammed and without paying attorney rates.
- **User Flow**:
  1. User searches Google on mobile for "gia hạn thẻ xanh Houston" or "I-90 tiếng Việt"
  2. MannaOS.com appears in Google Local Pack (GBP) AND in organic with FAQ rich snippet, driven by the I-90 form cluster page `/vi/mau-don/i-90-gia-han-the-xanh/`
  3. User lands on the form page, sees: Vietnamese headline, above-the-fold non-attorney disclosure banner, transparent pricing ($250 service fee + $465 USCIS fee = $715 total, "verified as of [date]" with outbound uscis.gov link), 5–8 FAQ in Vietnamese, link to notario fraud awareness page
  4. User scrolls to "What we do / What we don't do" scope block and understands MannaOS is a non-attorney document preparer
  5. User clicks "Đặt lịch miễn phí" → `/vi/lien-he/` with Calendly embed + Texas residency gate field
  6. User confirms Texas residency → books in-person consult at Houston HQ
  7. Owner receives email via Resend + Calendly notification; submission stored in Supabase
- **Acceptance Criteria**:
  - Form page loads in under 2.5s on 4G mobile (LCP)
  - User arrives directly on a Vietnamese URL (no toggle required) because the organic result is the `/vi/` URL
  - FAQ JSON-LD and Offer JSON-LD (pricing) validate via Google Rich Results Test
  - Non-attorney disclosure banner is present in the first 200 words of the page
  - Pricing table shows Service Fee + USCIS Fee = Total with a dated "verified as of" timestamp
  - Calendly embed loads inline without redirect
  - Contact form submits and shows bilingual confirmation message
  - If user selects "No, I'm not a Texas resident" on the gate, form shows referral message (not submission) pointing to CLINIC / AILA pro-bono

### Story 1b: Vietnamese Family Buys the Marriage Green Card Bundle

- **User Role**: Visitor (Vietnamese-American U.S. citizen in Dallas-Fort Worth, newly married to a Vietnamese national)
- **Goal**: Sponsor spouse for a green card via the full marriage-based adjustment of status package.
- **User Flow**:
  1. User searches "thẻ xanh kết hôn bao nhiêu tiền" or asks ChatGPT "How much does a marriage green card package cost in Texas Vietnamese?"
  2. Organic result: MannaOS.com Marriage Green Card bundle page `/vi/goi-dich-vu/ho-so-ket-hon-xin-the-xanh/` or English equivalent `/en/bundles/marriage-green-card-package/`
  3. AI result (ChatGPT / Perplexity) cites Manna One Solution with itemized pricing (I-130 + I-485 + I-765 + I-131 + I-864 = $2,115 USCIS + $1,085 service = $3,200 total), non-attorney status, Texas service area, and link to the bundle page
  4. User lands on the bundle page, sees: explicit non-attorney disclosure, itemized price breakdown per form, attorney comparison block (AILA average $3,500–$6,000 for the same bundle), timeline expectation, "what to expect" checklist, required documents list, FAQ addressing common marriage-GC concerns, referral-out note for complex cases (prior denials, immigration violations, criminal history)
  5. User confirms Texas residency in the contact form → books a remote video consultation via Calendly
  6. After consultation, admin creates a `case` record in admin panel, assigns the bundle, uploads signed engagement agreement, and sets initial milestone: "Documents pending"
- **Acceptance Criteria**:
  - Bundle page has unique content (not copy-paste from component forms) — timeline, what-to-expect, required documents are bundle-specific
  - Attorney comparison block cites a real, linked source (AILA or equivalent survey)
  - Itemized pricing uses the `site_content` entries for each component form so an admin fee update propagates to both the form and bundle pages
  - LocalBusiness + Service schema uses `areaServed: Texas` only
  - The page mentions non-attorney document preparer status in the first 200 words
  - Referral-out guidance is present for complex cases (RFEs, prior denials, removal)

### Story 2: Client Checks USCIS Case Status

- **User Role**: Authenticated Client
- **Goal**: See the latest status of their immigration case without manually checking the USCIS website.
- **User Flow**:
  1. Client navigates to MannaOS.com → clicks "Sign In"
  2. Enters email + password → redirected to `/portal/dashboard`
  3. Dashboard shows a card for each active case (e.g., "N-400 Naturalization", "I-130 Family Petition")
  4. Client clicks a case card → navigated to `/portal/cases/[case-id]`
  5. Sees: case type, receipt number, current USCIS status ("Case Was Received"), last synced timestamp, priority date, bundle name if applicable
  6. Sees status history timeline showing all status changes with dates
  7. Can download any documents admin has uploaded (e.g., receipt notice PDF, NOA, approval notice)
  8. Can upload their own documents (e.g., additional evidence, supporting affidavits)
- **Acceptance Criteria**:
  - USCIS status reflects the most recent daily sync (within 24 hours)
  - Status history shows all transitions in chronological order
  - Document upload accepts PDF, JPG, PNG up to 10MB
  - Client can only see their own cases (RLS enforced on `cases` table)
  - Empty state shows friendly message + "How MannaOS case tracking works" explainer if no cases yet
  - Portal explicitly states case tracking is informational and does not substitute for uscis.gov checks

### Story 3: Admin Publishes a Bilingual Blog Post

- **User Role**: Admin
- **Goal**: Write and publish an immigration guide (e.g., "5 common I-130 mistakes for Vietnamese families") in both Vietnamese and English to improve SEO and feed form-cluster pages.
- **User Flow**:
  1. Admin logs in → redirected to `/admin/clients`
  2. Navigates to `/admin/blog` → clicks "New Post"
  3. Enters title (VI tab + EN tab), selects category (e.g., "Green Card", "Citizenship", "Travel Documents")
  4. Writes content using Tiptap rich text editor — adds headings, lists, bold text, internal links to form pages and bundle pages
  5. Uploads a cover photo → preview shown
  6. Inserts an inline photo within the article body
  7. Slug auto-generates from English title; VI slug is manually entered in native Vietnamese
  8. Adds FAQ section (admin UI) + outbound link to uscis.gov for the specific form
  9. Toggles "Published" → clicks Save — blocked if publish-gate requirements (meta desc, OG image, author, ≥3 internal links, ≥1 .gov outbound link, FAQ, word count) are not met
  10. Post appears on `/blog` immediately with cover image, category tag, and both language versions
- **Acceptance Criteria**:
  - Tiptap editor supports headings, bold, italic, lists, links, inline images
  - Cover photo uploads to Supabase Storage and displays in blog list
  - Slug is URL-safe and unique; native VI characters are acceptable via IDN-safe slug generation
  - Draft posts are not visible on the public blog
  - Article JSON-LD schema is generated for published posts with author, datePublished, inLanguage
  - Publish-gate blocks save if any required field is missing, with specific error per gate
  - No AI-assisted drafting — content is manually written by the owner per §10 Resolved Decisions

### Story 4: Admin Creates a Case and Manages Documents

- **User Role**: Admin
- **Goal**: After a signed engagement, open a case for a client, assign the bundle or form, upload the USCIS receipt notice, and update status milestones.
- **User Flow**:
  1. Admin navigates to `/admin/clients` → searches for client name
  2. Clicks into client profile → sees all prior and active cases
  3. Clicks "New Case" → selects form or bundle from dropdown (populated from `/admin/site_content` form catalog)
  4. Fills metadata: receipt number (optional at creation), priority date (if applicable), bundle components, initial milestone
  5. Uploads engagement agreement PDF → saved to Supabase Storage, linked to case
  6. When the USCIS receipt notice arrives, admin edits the case and enters the receipt number
  7. Playwright staff app on VPS begins polling that receipt number on next cycle; status history populates automatically
  8. Client immediately sees the new case card on their portal dashboard
- **Acceptance Criteria**:
  - Case types are extensible (dropdown populated from `site_content` form catalog)
  - Metadata fields change dynamically based on selected form/bundle
  - Document uploads are linked to the specific case via `case_documents` table
  - Client portal reflects changes in real-time (no cache delay for portal)
  - Receipt number validated: 3-letter prefix + 10-digit number
  - Bundle cases create one parent `case` with child references to component form receipt numbers (e.g., Marriage GC = one case containing I-130, I-485, I-765, I-131, I-864 receipts)

### Story 5: Visitor Discovers Business via AI Search (Texas-Scoped Immigration)

- **User Role**: Visitor using ChatGPT, Perplexity, Google AI Overview, or Microsoft Copilot
- **Goal**: Get a direct, cited answer to a Vietnamese-language immigration question from a Texas resident.
- **User Flow**:
  1. User asks AI assistant in Vietnamese: "Dịch vụ làm giấy tờ di trú tiếng Việt uy tín ở Houston không phải luật sư?" or in English: "Non-attorney Vietnamese USCIS document preparer Houston Texas pricing"
  2. AI engines have indexed MannaOS.com's immigration pillar, Texas state cluster, Houston city support, all 11 form cluster pages, all 5 bundle pages, `/llms.txt`, and FAQ JSON-LD
  3. AI decomposes the query (query fan-out) into sub-queries: "Vietnamese USCIS document preparer Houston", "non-attorney immigration help Texas", "N-400 Vietnamese pricing", "notario fraud Houston Vietnamese alternative"
  4. AI response cites Manna One Solution with non-attorney document preparer disclosure, Texas Notary credential, transparent pricing, and links to the form or bundle page that matches the sub-query
  5. User clicks through to the cited page → finds FAQ section that matches their question → books consultation via Calendly or submits contact form (Texas residents only)
- **Acceptance Criteria**:
  - `/llms.txt` accessible at site root and describes business entity, V1 immigration service scope, form-level pricing, Texas-only service area, non-attorney disclosure, and credentials accurately
  - FAQ JSON-LD on every pillar/form/bundle page uses answer-first format with specific facts (dollar amounts, form numbers, USCIS fee, timelines, Texas Notary #, non-attorney status)
  - Every page has ≥1 outbound link to uscis.gov or another `.gov` source
  - NAP (Name, Address, Phone) identical across website, GBP, Apple Business Connect, Bing Places, Yelp, BBB, Facebook
  - Sitemap submitted to both Google Search Console and Bing Webmaster Tools (Bing = ChatGPT browsing + Copilot source)
  - robots.txt explicitly allows `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot` on public content

### Story 6: Recent Client Leaves a Google Review (Review Acquisition Loop)

- **User Role**: Recent client (immigration form prep just completed, USCIS receipt in hand)
- **Goal**: Quickly leave a review in Vietnamese without navigating complex UIs.
- **User Flow**:
  1. Admin marks the client's case as "Filed with USCIS" in `/admin/cases/[id]` (milestone update)
  2. Admin clicks "Request Review" button → fires a Resend email + opt-in SMS to the client with bilingual copy and a short Google review link
  3. Client opens the email on mobile, taps the short link → lands directly on Google's review composer with the MannaOS.com business pre-selected
  4. Client writes a review in Vietnamese, leaves 5 stars, submits
  5. Admin dashboard shows "Review requested" and (manually or via Places API) "Review received"
  6. Owner responds to the review within 48 hours, thanking the client by first name and mentioning the specific form (e.g., "Chúc mừng anh chị đã nộp hồ sơ N-400!")
- **Acceptance Criteria**:
  - Review request message copy is available in VI + EN, stored in `site_content` so admin can edit without a deploy
  - Short URL uses the official Google review link format from GBP (`g.page/...` or `search.google.com/local/writereview?placeid=...`)
  - `review_requests` table records: client_id, case_id, sent_at, channel (email/SMS), opened_at (if trackable)
  - Admin cannot send more than one review ask per case per client (avoid spamming clients and triggering Google policy flags)
  - GDPR/TCPA compliance: client must have opted into SMS during signup (checkbox on `/signup` stored on `profiles.sms_consent`)

### Story 7: Non-Texas Visitor Is Gated and Referred Out (UPL Safety Valve)

- **User Role**: Visitor (Vietnamese-speaking prospect in Orange County, CA)
- **Goal**: Wants help with an N-400 in Vietnamese.
- **User Flow**:
  1. User searches and lands on an N-400 form page (organic or AI citation). Non-attorney disclosure and "Texas residents only" banner are visible.
  2. User clicks "Book consultation" → contact form loads with Texas residency gate as the first field.
  3. User selects "No, I'm not a Texas resident."
  4. Form disables submission and replaces the submit button with a referral block: "We can only serve Texas residents. For help in California, try: CLINIC network affiliate in Santa Ana, Asian Americans Advancing Justice - Southern California, KIND (for unaccompanied minors). [Links to each.]"
  5. GA4 fires a `non_tx_referral` event with the visitor's state if known.
- **Acceptance Criteria**:
  - Contact form is un-submittable when residency = No
  - Referral block content is stored in `site_content` (admin-editable)
  - Links open in new tab with `rel="noopener"`
  - GA4 event `non_tx_referral` fires and is visible in DebugView
  - Form does NOT create a `contact_submissions` row for non-TX visitors (no lead capture)
  - Success metric: non-TX submissions remain <5% of total form interactions per §1 Success Metrics

---

## 2a. Topical Map, Keyword Strategy & URL Architecture

This section is the strategic foundation for SEO/GEO. It follows the 4-tier Topical Map
structure from `SEO AND GEO Skills/SKILL.md` Phase 1 and the multilingual subdirectory
approach from `multilingual-seo.md`. Every URL below must exist with unique, fact-dense
content covering all four search intents.

### 2a.1 Keyword Research Process (Week 1 of Phase 1)

Before any page is built, complete and document keyword research in
`docs/superpowers/research/2026-04-mannaos-keywords.md` (create during Phase 1 Week 1).

```
V1 SCOPE: Immigration document preparation, Texas residents only.
Keyword research is bounded to immigration queries in VI + EN, anchored to Texas.

STEP 1: Seed keywords — build in both languages, immigration only
  Vietnamese seeds:
    làm giấy tờ di trú, dịch vụ di trú, nộp đơn USCIS, gia hạn thẻ xanh,
    đơn N-400, quốc tịch Mỹ, bảo lãnh vợ chồng, bảo lãnh gia đình,
    đơn I-130, đơn I-485, work permit, giấy phép đi làm, I-765, I-131,
    giấy đi lại, I-90, thẻ xanh mất, I-751, xóa điều kiện thẻ xanh,
    đơn xin miễn phí USCIS, I-912, văn phòng dịch vụ di trú Houston,
    giúp điền đơn di trú tiếng Việt, notario, không phải luật sư

  English seeds:
    Vietnamese immigration help Texas, USCIS document preparer Houston,
    Vietnamese-speaking N-400 help, green card renewal Vietnamese,
    I-130 filing help Houston, marriage green card package Texas,
    remove conditions green card Vietnamese, affordable immigration help
    Vietnamese, non-attorney document preparer Texas, notario differences

STEP 2: Expand with modifiers — location, form number, intent, community
  + "Houston" / "Texas" / "TX",
  + "near me" / "gần tôi",
  + "cost" / "fee" / "giá" / "lệ phí",
  + "how to" / "cách",
  + form numbers (N-400, I-90, I-130, I-485, I-751, I-765, I-131, N-600, I-864, I-912),
  + "Vietnamese" / "tiếng Việt",
  + "without lawyer" / "không cần luật sư"

STEP 3: Tools
  → Google Keyword Planner: language=Vietnamese + English, location=Texas
  → Google Autocomplete A–Z suffix sweep in VI + EN
  → Google People Also Ask for each form number
  → USCIS form pages: note the questions users ask in comments on community forums
  → Facebook Groups: "Người Việt ở Houston", "Hỏi đáp di trú Mỹ", community groups
    → real questions about forms, timelines, costs
  → Reddit: r/USCIS, r/immigration, r/HoustonVietnamese — search for Vietnamese form questions
  → ChatGPT: "List 40 questions a Vietnamese immigrant in Texas would ask
    about each USCIS form: I-90, I-130, I-485, I-751, I-765, I-131, N-400, N-600"

STEP 4: Map every keyword to:
  → One of 4 intents (Info / Commercial / Transactional / Navigational)
  → One page in the Topical Map below (never let a keyword orphan)
  → A priority tier (V1 launch / Phase 1.5 expansion)

STEP 5: Output format
  | Query | Lang | Volume est | Difficulty | Intent | Target URL | Tier |
```

**Minimum V1 keyword set:** 40 VI + 40 EN target queries — all immigration-related,
all anchored to Texas or generic U.S. federal. Do not launch Phase 1 pages without
this spreadsheet committed.

### 2a.2 Topical Map — 4-Tier Structure (V1: Immigration-only, Texas-only)

```
TIER 1 — SERVICE PILLAR (1 service × 2 languages = 2 pages)
  The national pillar for Vietnamese USCIS document preparation.
  Broadest keyword, highest-depth content (3,000–5,000 words).
  Despite marketing to Texas residents only, the pillar URL is non-geo at this tier
  so the future architecture can layer state/city pages cleanly.

  EN: /en/services/vietnamese-immigration-document-preparation/
  VI: /vi/dich-vu/lam-giay-to-di-tru-tieng-viet/

  Must include above the fold:
    • Non-attorney disclosure ("We are not a law firm")
    • "Currently serving Texas residents only" notice
    • Full pricing table (Service Fee + USCIS Fee + Total per form + bundles)
    • Link to Texas state page + Houston city page
    • Link to the referral-out page for clients who need an attorney

TIER 2 — STATE CLUSTER (1 state × 2 languages = 2 pages)
  V1 = Texas only.

  EN: /en/services/vietnamese-immigration-document-preparation/texas/
  VI: /vi/dich-vu/lam-giay-to-di-tru-tieng-viet/texas/

  Content requirements (1,500–2,500 words):
    • Texas-specific context: nearest USCIS field office (Houston),
      ASC biometrics locations in Texas, lockbox routing for TX residents
    • Texas Vietnamese community hubs: Houston (Bellaire corridor),
      Dallas (Richardson / Garland), Austin (Rundberg), San Antonio
    • State-specific FAQ (8–10 entries)
    • Links up to the national pillar + down to all 4 Texas city pages

TIER 3 — CITY SUPPORT (4 cities × 2 languages = 8 pages)

  V1 cities (all in Texas):
    Houston (HQ — full Local Pack optimization, in-person consultations)
    Dallas-Fort Worth (remote delivery, content anchored to Vietnamese community)
    Austin (remote delivery)
    San Antonio (remote delivery)

  EN examples:
    /en/services/vietnamese-immigration-document-preparation/texas/houston/
    /en/services/vietnamese-immigration-document-preparation/texas/dallas-fort-worth/
    /en/services/vietnamese-immigration-document-preparation/texas/austin/
    /en/services/vietnamese-immigration-document-preparation/texas/san-antonio/

  VI examples (city names kept in English — mixed-language search is common):
    /vi/dich-vu/lam-giay-to-di-tru-tieng-viet/texas/houston/
    /vi/dich-vu/lam-giay-to-di-tru-tieng-viet/texas/dallas-fort-worth/

  Content requirements (1,000–1,500 words):
    • Neighborhood names (Bellaire / Alief / Chinatown for Houston;
      Richardson / Garland for DFW; etc.)
    • Local landmarks, driving directions (Houston only), community orgs
      (Vietnamese American Chamber of Commerce Houston, Vietnamese Culture &
      Science Association, Buddhist temples, Catholic parishes)
    • City-specific FAQ (5–8 entries)
    • LocalBusiness schema with geo coordinates (Houston) or areaServed (other cities)
    • Review count callout (Houston only)
    • In-person availability statement (Houston) vs remote-only (other cities)

TIER 4a — FORM CLUSTER PAGES (11 forms × 2 languages = 22 pages)

  One dedicated page per USCIS form the practice supports. These are the highest-
  intent commercial pages and the primary target of form-number search queries.

  V1 form pages:
    I-90  Green Card Renewal / Replacement
    I-130 Family-Based Petition
    I-485 Adjustment of Status (usually paired with I-130)
    I-751 Remove Conditions on Residence
    I-765 Work Permit / EAD
    I-131 Travel Document / Advance Parole
    N-400 Naturalization / Citizenship
    N-600 Certificate of Citizenship for children
    I-864 Affidavit of Support (support content for I-130/I-485 bundles)
    I-912 Request for Fee Waiver
    AR-11 Change of Address

  EN URL pattern:
    /en/services/vietnamese-immigration-document-preparation/forms/i-90-green-card-renewal/
    /en/services/vietnamese-immigration-document-preparation/forms/n-400-citizenship/
    /en/services/vietnamese-immigration-document-preparation/forms/i-130-family-petition/
    [...etc for all 11 forms]

  VI URL pattern (form number stays, slug in Vietnamese):
    /vi/dich-vu/lam-giay-to-di-tru-tieng-viet/mau-don/i-90-gia-han-the-xanh/
    /vi/dich-vu/lam-giay-to-di-tru-tieng-viet/mau-don/n-400-quoc-tich-my/
    /vi/dich-vu/lam-giay-to-di-tru-tieng-viet/mau-don/i-130-bao-lanh-gia-dinh/

  Each form page content requirements (1,500–2,500 words):
    • H1: form number + Vietnamese name + English name
    • "What this form is for" — 1-paragraph plain-language explanation
    • "Who can use this form" — eligibility bullets
    • "USCIS filing fee" — current fee with "verified as of [date]" + uscis.gov link
    • "Our service fee and total" — MannaOS pricing table
    • "What we do" — preparation steps we perform
    • "What we do NOT do" — non-attorney disclosure (no legal advice, no G-28,
      no interview representation)
    • "Current USCIS processing times" — link to uscis.gov/processing-times
    • "Common mistakes on this form" — educational content (fact-dense for GEO)
    • "Documents you'll need" — checklist
    • "Step-by-step how we work together" — HowTo schema eligible
    • FAQ (8–12 entries) — FAQPage schema
    • CTA: "Start your [form name] — book a free consultation"
    • Internal links: pillar, Texas state page, related forms, bundle offers
    • Outbound link: USCIS.gov/forms/[form-number]

TIER 4b — BUNDLE OFFER PAGES (5 bundles × 2 languages = 10 pages)

  Bundle pages are separate from form pages because they target bundle-intent
  queries ("marriage green card package cost", "citizenship all-in-one service").
  Each bundle page shows the price breakdown and links to the individual form pages
  it contains.

  V1 bundles:
    marriage-green-card-package         (I-130 + I-485 + I-765 + I-131 + I-864)
    family-petition-consular            (I-130 only for overseas relatives)
    citizenship-fast-track              (N-400 + civics prep + interview coaching)
    green-card-renewal-plus-travel-doc  (I-90 + I-131)
    remove-conditions-plus-ead          (I-751 + I-765)

  EN URLs:
    /en/services/vietnamese-immigration-document-preparation/bundles/marriage-green-card-package/
    /en/services/vietnamese-immigration-document-preparation/bundles/citizenship-fast-track/
    [...etc]

  VI URLs (slugs in Vietnamese):
    /vi/dich-vu/lam-giay-to-di-tru-tieng-viet/goi-dich-vu/goi-the-xanh-dien-vo-chong/
    /vi/dich-vu/lam-giay-to-di-tru-tieng-viet/goi-dich-vu/goi-quoc-tich-nhanh/

  Each bundle page (1,200–2,000 words):
    • H1: bundle name
    • Pricing table: every form included + USCIS fee + service fee + total
    • "Who this bundle is for"
    • Attorney comparison (ethical, fact-based — cite AILA averages)
    • Typical timeline (from intake to USCIS receipt notice)
    • FAQ (6–10 entries)
    • CTA: book consultation + price transparency disclaimer

TIER 5 — SEMANTIC SUPPORT / BLOG (ongoing, no launch gate)

  Long-tail FAQ, how-to, comparison, community-context, and red-flag posts.
  These are the top-of-funnel discovery content that drives initial traffic while
  the commercial pages accumulate authority.

  V1 launch blog targets (seed content — minimum 20 posts across VI + EN):

  INFORMATIONAL:
    /vi/blog/notario-la-gi-va-cach-tranh-bi-lua/                [critical trust piece]
    /vi/blog/su-khac-biet-giua-luat-su-di-tru-va-nguoi-lam-giay-to/
    /vi/blog/thoi-gian-xu-ly-ho-so-uscis-hien-tai-2026/
    /vi/blog/le-phi-uscis-2026-tieng-viet/
    /en/blog/what-is-a-notario-and-how-to-avoid-fraud/
    /en/blog/document-preparer-vs-immigration-attorney-vietnamese/
    /en/blog/uscis-processing-times-texas-2026/

  COMMERCIAL:
    /vi/blog/gia-lam-ho-so-thanh-cong-dan-my-2026/
    /vi/blog/co-nen-tu-lam-giay-to-di-tru-khong/
    /en/blog/cost-of-becoming-a-us-citizen-vietnamese-guide/
    /en/blog/is-it-worth-hiring-help-for-uscis-forms/

  HOW-TO / COMMUNITY:
    /vi/blog/cach-chuan-bi-cho-buoi-phong-van-quoc-tich/
    /vi/blog/tai-lieu-can-chuan-bi-cho-don-i-130/
    /en/blog/how-to-prepare-for-your-n-400-interview-vietnamese/
    /en/blog/documents-you-need-for-i-130-spouse-petition/

  RED FLAG (differentiation content):
    /vi/blog/10-dau-hieu-nhan-biet-notario-lua-dao/
    /vi/blog/khi-nao-ban-thuc-su-can-luat-su-di-tru/
    /en/blog/10-red-flags-that-indicate-a-notario-scam/
    /en/blog/when-you-actually-need-an-immigration-lawyer-not-a-preparer/
```

**V1 page count summary:**

| Tier | Pages per locale | Total (EN + VI) |
|---|---:|---:|
| Tier 1 — Pillar (1 service) | 1 | 2 |
| Tier 2 — State cluster (Texas only) | 1 | 2 |
| Tier 3 — City support (4 Texas cities) | 4 | 8 |
| Tier 4a — Form cluster pages (11 forms) | 11 | 22 |
| Tier 4b — Bundle offer pages (5 bundles) | 5 | 10 |
| Static + legal (Home, About, Contact, Pricing overview, Non-Attorney Disclosure, Notario Fraud Awareness, Referral-Out, Privacy, Terms, Blog list) | 10 | 20 |
| **Subtotal (non-blog)** | **32** | **64** |
| Tier 5 — Blog launch seed (target 10/locale by launch) | 10 | 20 |
| **V1 total at launch** | **42** | **84** |

The blog grows post-launch; the 32-page non-blog footprint per locale is the hard V1 target.

### 2a.3 Four-Intent Coverage Matrix (V1 — immigration form cluster)

Every form cluster in the topical map must have content addressing **all 4 search intents**
per the Phase 1 rule in `SKILL.md`. Missing one intent = ceding that segment to competitors.

| Form Cluster | Informational | Commercial | Transactional | Navigational |
|---|---|---|---|---|
| **I-90 Green Card Renewal** | `/en/blog/when-do-i-need-to-renew-my-green-card/` | `/en/blog/i-90-cost-fees-and-service-options/` | `/en/services/vietnamese-immigration-document-preparation/forms/i-90-green-card-renewal/` | `/en/services/vietnamese-immigration-document-preparation/texas/houston/` |
| **N-400 Citizenship** | `/en/blog/how-to-prepare-for-your-n-400-interview-vietnamese/` | `/en/blog/is-it-worth-hiring-help-for-uscis-forms/` | `/en/services/vietnamese-immigration-document-preparation/forms/n-400-citizenship/` | `/en/services/vietnamese-immigration-document-preparation/bundles/citizenship-fast-track/` |
| **I-130 + I-485 (Marriage GC)** | `/en/blog/documents-you-need-for-i-130-spouse-petition/` | `/en/blog/cost-of-marriage-green-card-attorney-vs-preparer/` | `/en/services/vietnamese-immigration-document-preparation/bundles/marriage-green-card-package/` | `/en/services/vietnamese-immigration-document-preparation/texas/houston/` |
| **I-751 Remove Conditions** | `/en/blog/i-751-timeline-and-evidence-checklist/` | `/en/blog/i-751-cost-breakdown-vietnamese/` | `/en/services/vietnamese-immigration-document-preparation/forms/i-751-remove-conditions/` | `/en/services/vietnamese-immigration-document-preparation/bundles/remove-conditions-plus-ead/` |
| **I-765 Work Permit** | `/en/blog/what-is-an-ead-and-who-needs-one/` | `/en/blog/i-765-filing-fee-2026/` | `/en/services/vietnamese-immigration-document-preparation/forms/i-765-work-permit/` | `/en/services/vietnamese-immigration-document-preparation/texas/houston/` |
| **I-131 Travel Document** | `/en/blog/advance-parole-vs-reentry-permit-vs-travel-doc/` | `/en/blog/i-131-service-cost-vietnamese/` | `/en/services/vietnamese-immigration-document-preparation/forms/i-131-travel-document/` | `/en/services/vietnamese-immigration-document-preparation/bundles/green-card-renewal-plus-travel-doc/` |

Each row must be mirrored in `/vi/` with native Vietnamese slugs + native keyword research.
Additional forms (N-600, I-864, I-912, AR-11, FOIA, translations) follow the same pattern
but with smaller content footprints because search volume is lower.

**Intent coverage priority:** The **Transactional** column is the revenue column. If Phase 1
timeline slips, trim blog content before trimming form cluster pages — a visitor searching
"I-90 cost" needs to land on a page with the price, not a blog post.

### 2a.3b Pricing Strategy — Published on Every Form & Bundle Page

MannaOS publishes **total prices** (service fee + USCIS filing fee) on every form and
bundle page. This is both a business differentiator (almost no Vietnamese-language
immigration preparer does this) and an SEO/GEO asset (fact density + zero-click answers
AI engines can cite directly).

**V1 introductory pricing — single forms:**

| Form | Service Fee | USCIS Fee (2026) | **Total** |
|---|---:|---:|---:|
| I-90 Green Card Renewal (paper) | $250 | $465 | **$715** |
| I-90 Green Card Renewal (online) | $250 | $415 | **$665** |
| I-765 Work Permit (standalone, paper) | $250 | $520 | **$770** |
| I-765 Work Permit (standalone, online) | $250 | $470 | **$720** |
| I-131 Travel Document (standalone) | $250 | $630 | **$880** |
| I-751 Remove Conditions | $550 | $750 | **$1,300** |
| N-400 Citizenship (paper) | $550 | $760 | **$1,310** |
| N-400 Citizenship (online) | $550 | $710 | **$1,260** |
| N-600 Certificate of Citizenship | $400 | $1,385 | **$1,785** |
| I-912 Fee Waiver (on its own) | $150 | $0 | **$150** |
| AR-11 Change of Address | $50 | $0 | **$50** |
| FOIA Request to USCIS | $100 | $0 | **$100** |
| Certified Translation (per page) | $25 | — | **$25/page** |

**V1 introductory pricing — bundles:**

| Bundle | Included Forms | USCIS Fees | Service Fee | **Total** |
|---|---|---:|---:|---:|
| **Marriage Green Card Package** ⭐ | I-130 + I-485 + I-765 + I-131 + I-864 (concurrent filing) | $2,115 | $1,085 | **$3,200** |
| **Family Petition — Consular** | I-130 only (for overseas relative) | $675 | $425 | **$1,100** |
| **Citizenship Fast-Track** | N-400 + civics prep + interview coaching | $710 online / $760 paper | $590 | **$1,300–$1,350** |
| **Green Card Renewal + Travel Doc** | I-90 + I-131 | $1,095 | $305 | **$1,400** |
| **Remove Conditions + Work Permit** | I-751 + I-765 | $1,220 | $580 | **$1,800** |

**Pricing display rules (enforced at the feature level in §3):**

```
1. Every form page MUST show: Service Fee · USCIS Fee · Total — in a prominent
   pricing table above the fold or directly under the H1.

2. Every USCIS fee MUST have a timestamp: "USCIS fee verified as of 2026-04-10"
   with a link to https://www.uscis.gov/forms/filing-fees

3. Every bundle page MUST show the itemized breakdown — not just the total.
   Clients should see exactly what goes to USCIS vs. what goes to MannaOS.

4. Every price MUST include the disclaimer: "Service fee is flat. USCIS filing
   fees are set by USCIS and subject to change; we will quote the current fee
   before filing."

5. Every price appears in schema as an Offer with @type, price, priceCurrency,
   and itemOffered (see §4.8 L4 schema templates).

6. Every price is also reflected in /llms.txt for AI engine extraction.

7. Pricing is managed via site_content in Supabase — admin can update without a
   deploy when USCIS fees change (annually) or when MannaOS adjusts service fees.
```

**Attorney comparison content (ethical fact-based):**
Each bundle page includes a comparison block citing AILA-published attorney fee averages
so visitors can evaluate the alternative. Example on the Marriage GC Package page:

> **How this compares to hiring an attorney:**
> AILA-reported average attorney fees for a marriage-based adjustment of status
> range from $3,500 to $7,500 plus USCIS filing fees. Our total of $3,200
> (service + USCIS fees combined) represents significant savings for
> straightforward cases. If your case is complex (criminal history, prior denial,
> inadmissibility issues, RFE/NOID), we will refer you to an attorney — see our
> [referral-out page](./referral-out/).

This block is **mandatory** on every bundle page. The referral-out link builds trust
and protects the practice from UPL exposure.

### 2a.3c Notario Fraud Differentiation Content

Vietnamese-American and broader Latino immigrant communities are the primary victims
of "notario" fraud — scammers who claim to be lawyers but are not. Every MannaOS page
must differentiate clearly:

```
REQUIRED ON EVERY PILLAR + FORM + BUNDLE PAGE:
  ☐ Non-attorney disclosure in the first 200 words (visible, not hidden in footer)
  ☐ Plain language: "We are not attorneys. We prepare USCIS forms at your direction
    under your review. We cannot give legal advice."
  ☐ Explicit scope: "We do NOT file Form G-28. We do NOT represent clients before
    USCIS. We do NOT attend USCIS interviews as a legal representative."
  ☐ Referral paths to free legal aid orgs (CLINIC, KIND, Catholic Charities,
    AILA pro-bono) for clients who need a lawyer

REQUIRED STANDALONE PAGES:
  /en/non-attorney-disclosure/                                [full disclosure doc]
  /vi/khong-phai-luat-su/                                     [VI equivalent]
  /en/notario-fraud-awareness/                                [community education]
  /vi/canh-bao-lua-dao-notario/                               [VI equivalent]
  /en/need-an-immigration-attorney/                           [referral-out hub]
  /vi/can-luat-su-di-tru/                                     [VI equivalent]

These pages carry strong E-E-A-T signals and are linked from:
  → Site footer (every page)
  → Above-the-fold disclosure on every form page
  → Contact form "Before you book" section
```

The notario fraud awareness pages become anchor content for AI citations —
AI engines cite pages that explicitly address trust and safety topics.

### 2a.4 URL Rules (Universal)

```
✅ Lowercase only
✅ Hyphens only (no underscores)
✅ Primary keyword in the slug
✅ Locale prefix required: /en/ or /vi/
✅ State + city names stay in English even on VI pages
   (Vietnamese-American searches are frequently mixed-language)
✅ Folder depth mirrors Topical Map hierarchy
✅ Under 70 characters where possible
❌ Never translate-and-overwrite onto a single URL
❌ Never change a live URL without a 301 redirect
```

**hreflang rule:** Every page must reference every locale variant reciprocally, plus
`x-default` pointing to the EN version. This is enforced at the Next.js layout level.

### 2a.5 Query Fan-Out Strategy

AI engines decompose queries into sub-queries and pick the best source per sub-query.
To maximize citation probability, each service pillar must own answers to the top
10–15 sub-queries around its main question.

**How to generate sub-queries for each pillar:**

```
1. Type the pillar query into Google → "People Also Ask" → record all variants
2. Type the pillar query into ChatGPT: "What are all the related questions someone
   might ask about [pillar topic] as a Vietnamese-American?"
3. Google Autocomplete A–Z suffix sweep in VI + EN
4. Each unique sub-query → one cluster/support/blog page in the Topical Map
```

Track sub-query coverage in the keyword research spreadsheet under a
"Sub-queries covered" column on each pillar row.

### 2a.6 Zero-Click vs Click Strategy

Per `SKILL.md` Phase 6 "Zero-Click Search Strategy":

```
OPTIMIZE FOR AI VISIBILITY (brand, zero-click OK):
  • Pillar definition sections ("What is Form 1040 for Vietnamese immigrants?")
  • Price range snippets
  • Credential mentions (EFIN, insurance license)
  • Any content whose cite inside an AI answer builds brand trust
  → Measure: branded search volume trend, AI citation frequency

OPTIMIZE FOR CLICK-THROUGH (transactional pages):
  • City support pages (users need to book a consultation)
  • "Đặt lịch" / "Book consultation" pages
  • Calendly-linked landing pages
  → Measure: CTR from SERP, Calendly conversion rate
```

This informs what content the team adds first: pillars publish fact-dense AI-bait
sections, city pages emphasize CTAs and local trust signals.

---

## 3. Functional Requirements

### Phase A Feature Breakdown — 4-Service Marketing Showcase (ships first)

This subsection is the **authoritative feature list for Phase A**. The tables that follow it ("Public site + SEO/GEO foundation", "Auth, Portal, Admin", "Off-site directories") are Phase B scope — they do not block Phase A launch.

**Phase A — Home Landing Page (`/en/` and `/vi/`)**

The Home landing page is the single most important page in Phase A. It is the ad destination for every Facebook campaign, the URL the owner hands out in person, and the 5-second test of whether MannaOS looks legitimate. Sections in order (per 2026-04-09 design doc):

| # | Section | Description | Priority |
|---|---|---|---|
| 1 | **Navbar (sticky)** | Logo left (transparent PNG) · nav links center (Services · About · Contact · Blog[Phase B]) · language toggle pill (VI/EN) + "Book Now" (teal CTA) + "Sign In"[Phase B] right · white bg, subtle shadow on scroll | Must |
| 2 | **Hero banner** | Full-width section. Bilingual H1 headline ("One Stop, All Solutions" / "Một Điểm Đến, Mọi Giải Pháp"). Subheadline naming the 4 services. Two CTAs: primary "Đặt lịch miễn phí / Book Free Consultation" (links to Calendly embed on /contact) + secondary "Our Services" (anchor to service cards below). Hero background image editable in Phase B via `site_content`; in Phase A it's a static optimized image. | Must |
| 3 | **Services Overview — 4 service cards** | Grid of 4 cards (2×2 on mobile, 4×1 on desktop). **Tax & Business · Insurance & Finance · Immigration · AI / Automation.** Each card: icon + service name (bilingual) + 1-line description + "Learn more →" link to that service's overview page. Cards have subtle drop shadows, teal hover state. This is the "One Stop, All Solutions" moment — the visitor must see all 4 at once. | Must |
| 4 | **Why Manna — trust badges** | 4 trust points in a horizontal strip: (a) Bilingual service (VN/EN), (b) IRS EFIN licensed (#857993), (c) Texas Life + P&C Insurance licensed (#3142469 / #3118525), (d) Texas Notary Public (pending Phase 0 / "Coming [month]" if not yet commissioned). Credential numbers visible — drives Google E-E-A-T and reassures clients on first visit. | Must |
| 5 | **How It Works — 3 steps** | 3-step graphic: ① Liên hệ / Contact us → ② Free consultation → ③ We handle it. Simple illustrations or numbered icons. Translated bilingually. | Must |
| 6 | **Contact strip** | Full-width section with phone (346-852-4454, click-to-call), Facebook Messenger button, inline quick form (name + phone + "I'm interested in..." dropdown with 4 services + submit). Submission goes to the same `contact_submissions` table. | Must |
| 7 | **Footer** | Logo · services list (4 links) · About · Contact · Privacy · Terms · social links (Facebook, Zalo) · NAP block (name, Bellaire Blvd Houston TX 77036, phone) · copyright. Same on every Phase A page. | Must |

No testimonials section at launch — add real reviews when available (Phase B via `site_content`).

**Phase A — Service Overview Pages (one per service, brochure-style)**

Each of the 4 service overview pages is a single bilingual marketing page — **not** a deep topical map page. Phase B will add deeper cluster pages for immigration (and eventually tax/insurance/AI). For Phase A these pages give the owner something to link to from Home, from ads, and from Facebook posts.

| Service | Route (EN) | Route (VI) | Phase A Content |
|---|---|---|---|
| **Tax & Business** | `/en/services/tax/` | `/vi/dich-vu/thue/` | Services list (Individual tax, Business tax, LLC setup, Tax extension), pricing summary ($50–$800 range), EFIN credential badge (#857993), 5-question FAQ stub, Calendly CTA. Not a topical map — one marketing page. |
| **Insurance & Finance** | `/en/services/insurance/` | `/vi/dich-vu/bao-hiem/` | Services list (Life Insurance, Annuity, Retirement Planning, Auto/Home P&C), Texas-only disclosure, license credentials (#3142469 Life, #3118525 P&C), "Commission-based, free consultation" framing, 5-question FAQ stub, Calendly CTA. |
| **Immigration** | `/en/services/immigration/` | `/vi/dich-vu/di-tru/` | Services list (N-400, Green Card, Work Permit, Travel Doc, Marriage GC Bundle), **non-attorney disclosure above the fold**, **Texas-only scope statement**, pricing teaser ("from $715 for I-90"), Calendly CTA. This page is the Phase A placeholder that Phase B replaces with the full pillar + form cluster tree. Once Phase B ships, this URL can either remain as a "gateway" page that links down to the pillar or 301 to the pillar — decision owned by the owner at Phase B launch. |
| **AI / Automation** | `/en/services/ai/` | `/vi/dich-vu/ai-tu-dong-hoa/` | Services list (Workflow automation, AI tools for SMBs, Business digitization, Monthly retainer), "We understand your business — we build the automation" framing, 5-question FAQ stub, "Free discovery call" Calendly CTA. |

**Phase A — Shared page-level features (applies to all Phase A pages):**

| Feature | Description | Priority |
|---|---|---|
| **Next.js i18n subdirectory routing** | `/en/` + `/vi/` prefixes via App Router `[locale]` segment. `localeDetection` based on `Accept-Language`. `NEXT_LOCALE` cookie honors explicit switches. Same approach as Phase B — no throwaway — but Phase A only ships the route tree listed above. | Must |
| **Language switcher component** | Pill button in navbar showing the other locale; uses the same `routeMap` scheme as Phase B (a language-neutral page ID → per-locale URL). Phase A's map has ~8 entries; Phase B extends it. | Must |
| **Shared layout + design system** | Palette, typography, spacing, logo rules from §7. Tailwind CSS. Reused by Phase B. | Must |
| **Floating contact buttons** | Fixed bottom-right: phone (tel:), Facebook Messenger (m.me deep link), Zalo (zalo.me deep link). Visible on all Phase A pages. | Must |
| **Contact form** | Next.js API route → Resend (email to owner) + Supabase `contact_submissions` backup. Fields: name, phone, email, service dropdown (Tax/Insurance/Immigration/AI), message, preferred channel (email/phone/Zalo), UTM fields captured from URL. Bilingual labels. Basic anti-spam (honeypot + rate limit). **Texas residency field is only required when `service_interest = Immigration`.** | Must |
| **Calendly embed** | Inline on `/en/contact/` + `/vi/lien-he/`. Free tier, one event type ("Free 15-min consultation"). `window.Calendly` event listener fires a GA4 `calendly_booking_complete` event + a Meta Pixel `Schedule` event when a booking finishes. | Must |
| **Meta Pixel + Conversions API** | Client-side pixel + server-side CAPI via Next.js API route, with de-dup `event_id`s. Events: `PageView`, `Lead` (contact form submit), `Schedule` (Calendly booking), `Contact` (phone/Messenger click). Test Events verified before first campaign. | Must |
| **Google Analytics 4** | gtag.js via next/script. Events: `page_view`, `form_submit`, `calendly_click`, `calendly_booking_complete`, `phone_click_to_call`, `messenger_click`, `zalo_click`, `locale_switch`, `outbound_click`. Consent banner for EU/CA. | Must |
| **UTM capture** | Contact form reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `fbclid` from URL + stores on `contact_submissions` row. | Must |
| **Per-page metadata** | `generateMetadata()` per page with bilingual title, description, canonical, hreflang (EN⇄VI⇄x-default), OG image. Metadata authored per locale (not machine-translated). | Must |
| **Site-wide schema** | Root layout emits `Organization` schema. Home additionally emits `WebSite` + a minimal `LocalBusiness` with Houston HQ address, phone, 4 services listed as `hasOfferCatalog`. No form-level Offer schema in Phase A — that's Phase B. | Must |
| **/llms.txt (stub)** | Short file describing Manna One Solution as a 4-service one-stop shop (Tax, Insurance, Immigration, AI) with Houston HQ + 346-852-4454. Phase B replaces with the full immigration-scope document. | Must |
| **robots.txt + sitemap.xml** | `next-sitemap`. Phase A sitemap includes Home + 4 service overview pages + About + Contact + Privacy + Terms + language alternates. Phase B adds the rest. AI crawler Allow directives go in Phase A so the site is discoverable from day one. | Must |
| **Privacy Policy + Terms of Service** | Stubs per locale. Required for GA4 consent + Meta Pixel compliance. Phase B expands them with the non-attorney document preparer clause and UPL disclaimer. | Must |
| **404 page** | Custom per locale, with nav back to Home + service cards. | Must |
| **Image optimization** | `next/image`, explicit width/height (CLS prevention), WebP, descriptive file names, translated alt text per locale. | Must |

**Phase A — Explicitly NOT in scope (deferred to Phase B):**

- The 11 form cluster pages, 5 bundle pages, 4 Texas city pages, Texas state cluster page, and the immigration pillar page
- Notario Fraud Awareness / Non-Attorney Disclosure / Need-an-Immigration-Attorney standalone trust pages
- Published form-level pricing tables with "verified as of" timestamps and itemized Offer JSON-LD
- FAQPage schema per page, HowTo schema, Speakable schema
- The blog system, Tiptap editor, and SEO publish-blockers
- Client portal (dashboard, case detail, documents, case tracking)
- Admin panel (client management, case management, blog editor, content editor, review-ask)
- USCIS status display (depends on shared Supabase schema + internal staff app)
- Automated review acquisition system
- Monthly AI citation audit process
- GBP / Apple Business Connect / Bing Places / Yelp / Nextdoor directory setup

Phase A launches with the marketing site and ad infrastructure. The day after it ships, Phase B work starts against the same codebase.

### Phase B Feature Breakdown — Immigration SEO/GEO Depth + Portal + Admin

**Public site + SEO/GEO foundation:**

| Feature | Description | Priority | Dependencies |
|---------|-------------|----------|--------------|
| **Next.js i18n subdirectory routing** | `/en/` and `/vi/` URL prefixes via App Router + `[locale]` segment. Each locale has its own route tree, metadata, slugs, and sitemap. `localeDetection` auto-redirects first-time visitors based on `Accept-Language`. localStorage remembers explicit switches. **URL is the source of truth, never just state.** | Must-have | None |
| **Native Vietnamese slugs** | All VI pages use native Vietnamese keyword slugs (e.g. `/vi/dich-vu/lam-giay-to-di-tru-tieng-viet/texas/houston/`, `/vi/mau-don/i-90-gia-han-the-xanh/`), never transliterated English. | Must-have | i18n routing |
| **Public marketing pages (per locale) — V1 immigration-only** | Home · 1 service pillar (Vietnamese Immigration Document Preparation) · 1 Texas state page · 4 Texas city pages (Houston + DFW + Austin + San Antonio) · 11 form cluster pages (I-90, I-130, I-485, I-751, I-765, I-131, N-400, N-600, I-864, I-912, AR-11) · 5 bundle pages · About · Contact · Pricing overview · **Non-Attorney Disclosure** · **Notario Fraud Awareness** · **Need an Immigration Attorney (referral-out)** · Privacy Policy · Terms of Service · Blog list · Blog detail. Each rendered in both EN and VI. 32 non-blog pages per locale. | Must-have | i18n routing |
| **Pricing tables on every form & bundle page** | Structured pricing component that renders Service Fee + USCIS Fee + Total, pulled from `site_content.pricing`. Includes "verified as of [date]" timestamp and outbound link to uscis.gov/forms/filing-fees. Admin can update fees without a deploy. | Must-have | site_content table, schema Offer |
| **Non-attorney disclosure component** | Reusable above-the-fold banner on every form/bundle/pillar page stating "We are not attorneys. We prepare USCIS forms at your direction. We do not provide legal advice." Linked to the full disclosure page. | Must-have | None |
| **Referral-out page** | Lists CLINIC, KIND, Catholic Charities, AILA pro-bono, Texas RioGrande Legal Aid, and other free/low-cost legal services. "When you need an attorney instead of a document preparer" content. Required for UPL protection and community trust. | Must-have | None |
| **Texas residency gate on contact form** | "Are you a Texas resident?" required field on the contact form. Non-TX submissions receive an automated Resend reply explaining V1 scope + linking to the referral-out page. Stored in `contact_submissions.tx_resident` for metrics. | Must-have | Resend, Supabase |
| **Privacy Policy + Terms of Service** | Dedicated pages per locale. Required for GA4 legal compliance, E-E-A-T, and trust signals. | Must-have | None |
| **hreflang + canonical tags** | Every public page outputs `<link rel="alternate" hreflang="en/vi/x-default">` reciprocal tags and a self-referencing canonical tag. Implemented site-wide in root layout. | Must-have | i18n routing |
| **Per-locale sitemap.xml** | `next-sitemap` generates `sitemap.xml` index referencing `sitemap-en.xml` and `sitemap-vi.xml`. All URLs include `<xhtml:link rel="alternate" hreflang=...>` entries. | Must-have | None |
| **robots.txt with AI crawler opt-in** | Explicit `Allow` directives for `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot` on public content. `Disallow` for `/portal`, `/admin`, `/api`. `Sitemap:` directive. See §4.8 L4. | Must-have | None |
| **`/llms.txt`** | Static markdown file at site root describing business entity, services, price ranges, credentials, per-state availability, top FAQ answers. Template in §4.8 L4. | Must-have | None |
| **JSON-LD schema system** | Site-wide `Organization` + per-page `LocalBusiness` (Houston) / `LegalService` / `Service` / `Offer` (form & bundle pricing) / `HowTo` (form preparation steps) / `BreadcrumbList` / `FAQPage` / `Article` / `Person` / `Speakable`. All schema bilingual (`inLanguage`, `knowsLanguage`). Every `LegalService` includes a `disambiguatingDescription` stating non-attorney document preparer status. Templates in §4.8 L4. | Must-have | None |
| **Breadcrumb component** | Visible breadcrumb navigation on all non-home pages, rendering `BreadcrumbList` JSON-LD. Mirrors URL hierarchy. | Must-have | None |
| **Per-page metadata system** | Typed Next.js `generateMetadata()` per page with locale-aware title, description, OG tags, Twitter Card, canonical, hreflang. All metadata authored in EN + VI separately (not auto-translated). | Must-have | i18n routing |
| **Image optimization pipeline** | Next.js `<Image>` with `loading="lazy"`, explicit `width`/`height` (CLS prevention), WebP conversion, descriptive file names, translated alt text per locale. | Must-have | None |
| **FAQ sections** | Every pillar and cluster page includes a visible H2 "Câu hỏi thường gặp" / "Frequently Asked Questions" section with 5–8 Q&As. On-page Q&A must match FAQPage JSON-LD exactly. Answer-first format. | Must-have | Schema system |
| **Outbound authoritative links** | Every service / state / city page links out to ≥1 `.gov` source (irs.gov, uscis.gov, state tax/insurance department). Tracked in GA4 as outbound click events. | Must-have | None |
| **Published price ranges** | Each service page must display a specific price range on-page (not just in contact form). Fact density drives GEO citations. | Must-have | Content |
| **Contact form** | Next.js API route → Resend email + Supabase `contact_submissions` backup: name, phone, email, service dropdown, state dropdown, message, preferred channel (email/phone/Zalo), SMS consent checkbox. Per-locale labels. | Must-have | Resend, Supabase |
| **Calendly booking embed** | Inline calendar on `/en/contact/` and `/vi/lien-he/`. Two event types: in-person (Houston HQ) + remote video (nationwide). | Must-have | Calendly |
| **Google Analytics 4** | GA4 property + gtag.js via next/script. Custom events: `contact_form_submit`, `calendly_click`, `calendly_booking_complete`, `locale_switch`, `outbound_gov_click`, `phone_click_to_call`, `messenger_click`, `review_request_sent`, `review_request_opened`, `faq_expand`. Consent banner for EU/CA visitors. | Must-have | Privacy Policy |
| **Blog system** | Per-locale slugs (`slug_en`, `slug_vi`) · bilingual title + content · cover image · category · **post_type (pillar/cluster/support)** · author reference · published/draft · datePublished · dateModified. Blog list supports category filter and locale awareness. | Must-have | Supabase Storage |
| **Blog SEO publish-blockers** | Admin cannot publish a post without: meta description per locale, OG image, author, ≥3 internal links, ≥1 outbound authoritative link, FAQ section (if pillar/cluster), minimum word count based on post_type (pillar 2,000 / cluster 800 / support 400). | Must-have | Blog system |
| **Author bio + Person schema** | Every blog post renders author name, photo, bio, credentials (EFIN, license #) pulled from `profiles` table. Generates `Person` schema and `Article.author` reference. | Must-have | profiles table |
| **Internal linking rules (editor-enforced)** | Tiptap editor surfaces link suggestions from related pages. Each page (automatically checked on build) must receive ≥2 inbound links and give ≥3 outbound internal links. | Should-have | Blog system |
| **Floating contact buttons** | Fixed bottom-right: phone (click-to-call) + Facebook Messenger + **Zalo** deeplink. | Should-have | None |
| **Review acquisition system** | Admin "Request Review" button on client detail → sends bilingual email + (opt-in) SMS via Resend with short Google review link. Stores in `review_requests` table. Max 1 request per service per client. | Must-have | Resend, GBP |
| **Content decay alerts** | Admin dashboard lists posts with `dateModified > 6 months ago` and prompts for refresh. | Should-have | Blog system |

**Auth, Portal, Admin:**

| Feature | Description | Priority | Dependencies |
|---------|-------------|----------|--------------|
| Supabase Auth | Client signup, login, forgot-password, email verification, per-locale auth emails via Resend | Must-have | Supabase project |
| Signup SMS consent | Signup form includes explicit TCPA-compliant SMS consent checkbox (stored on `profiles.sms_consent`) | Must-have | Supabase Auth |
| Client state field | `profiles.state` (ISO 2-letter code) captured on signup to segment client base by state | Must-have | Supabase schema |
| Auth middleware | Next.js middleware guarding `/portal` (client) and `/admin` (admin) routes | Must-have | Supabase Auth |
| Client portal: dashboard | Card per active service, status badge, last updated, empty state | Must-have | Auth, DB schema |
| Client portal: service detail | Dynamic page per service type with metadata, status history, documents | Must-have | Auth, DB schema |
| Client portal: documents | Cross-service document view, filter by type, upload capability | Should-have | Auth, Supabase Storage |
| USCIS status display | Client portal reads USCIS status from shared Supabase DB (populated by internal staff app's Playwright agent on VPS) | Must-have | Shared Supabase DB, Internal staff app |
| Admin: client management | Client list, search, filter (by state + service type), add/edit services, upload documents, "Request Review" button | Must-have | Auth, DB schema |
| Admin: blog editor | Tiptap rich text, cover photo upload, bilingual tabs (VI/EN), post_type selector, author selector, per-locale slug field, SEO publish-blockers | Must-have | Supabase Storage |
| Admin: content editor | Edit hero images, headlines, about bio, service images, review request templates, l10n overrides — reflected live | Should-have | Supabase Storage, site_content table |

**Off-site directories (managed outside the web app but tracked in Phase 4 launch checklist — see §9):**

| Directory | Priority | Notes |
|---|---|---|
| Google Business Profile (Houston) | Must-have | Postcard or video verification. Full completeness. |
| Apple Business Connect (Houston) | Must-have | Powers Siri + Apple Intelligence for iOS searchers. |
| Bing Places for Business (Houston) | Must-have | Powers ChatGPT browsing + Copilot local. |
| IRS Directory of Federal Tax Return Preparers | Must-have | Auto-listed when EFIN registered. Verify listing is live. |
| Texas Department of Insurance licensee lookup | Must-have | Auto-listed when licensed. Link from About page. |
| Yelp Business | Must-have | NAP match. |
| BBB | Must-have | Apply for accreditation if budget permits. |
| Nextdoor Business | Should-have | Strong for neighborhood-level Houston queries. |
| Vietnamese American Chamber of Commerce of Houston | Must-have | Primary community citation. |
| Người Việt (Westminster, CA — national Vietnamese paper) | Should-have | Backlink + brand mention target. |
| Viet Mercury, Người Việt Dallas, Việt Báo | Should-have | Regional community media outreach. |

### Information Architecture

**Public site — bilingual subdirectory routing.** Each URL below exists in both
`/en/` and `/vi/` with native slugs. Count below reflects EN only; double for VI total.

```
V1 launch — 32 non-blog pages per locale (64 total SSG) + 10 seed blog posts per locale (20 total).

  HOME + LEGAL + TRUST (10 pages):
    /en/                                                          [Home]
    /en/about/                                                    [About + founder bio + credentials]
    /en/contact/                                                  [Form + Calendly + Houston HQ address + TX residency gate]
    /en/pricing/                                                  [Pricing overview hub — all forms + bundles]
    /en/non-attorney-disclosure/                                  [Full UPL disclosure]
    /en/notario-fraud-awareness/                                  [Community education + red flags]
    /en/need-an-immigration-attorney/                             [Referral-out hub: CLINIC, KIND, AILA pro-bono, TRLA]
    /en/privacy-policy/
    /en/terms-of-service/
    /en/blog/                                                     [Blog list]
    /en/blog/[slug]/                                              [Blog detail — 10 seed posts per locale]

  SERVICE PILLAR (1 page):
    /en/services/vietnamese-immigration-document-preparation/     [National pillar — scoped to Texas in V1]

  STATE CLUSTER (1 page):
    /en/services/vietnamese-immigration-document-preparation/texas/

  CITY SUPPORT (4 pages — all Texas):
    /en/services/vietnamese-immigration-document-preparation/texas/houston/          [HQ — full Local Pack]
    /en/services/vietnamese-immigration-document-preparation/texas/dallas-fort-worth/
    /en/services/vietnamese-immigration-document-preparation/texas/austin/
    /en/services/vietnamese-immigration-document-preparation/texas/san-antonio/

  FORM CLUSTER PAGES (11 pages):
    /en/services/vietnamese-immigration-document-preparation/forms/i-90-green-card-renewal/
    /en/services/vietnamese-immigration-document-preparation/forms/i-130-family-petition/
    /en/services/vietnamese-immigration-document-preparation/forms/i-485-adjustment-of-status/
    /en/services/vietnamese-immigration-document-preparation/forms/i-751-remove-conditions/
    /en/services/vietnamese-immigration-document-preparation/forms/i-765-work-permit/
    /en/services/vietnamese-immigration-document-preparation/forms/i-131-travel-document/
    /en/services/vietnamese-immigration-document-preparation/forms/n-400-citizenship/
    /en/services/vietnamese-immigration-document-preparation/forms/n-600-certificate-of-citizenship/
    /en/services/vietnamese-immigration-document-preparation/forms/i-864-affidavit-of-support/
    /en/services/vietnamese-immigration-document-preparation/forms/i-912-fee-waiver/
    /en/services/vietnamese-immigration-document-preparation/forms/ar-11-change-of-address/

  BUNDLE OFFER PAGES (5 pages):
    /en/services/vietnamese-immigration-document-preparation/bundles/marriage-green-card-package/
    /en/services/vietnamese-immigration-document-preparation/bundles/family-petition-consular/
    /en/services/vietnamese-immigration-document-preparation/bundles/citizenship-fast-track/
    /en/services/vietnamese-immigration-document-preparation/bundles/green-card-renewal-plus-travel-doc/
    /en/services/vietnamese-immigration-document-preparation/bundles/remove-conditions-plus-ead/

  Per-locale totals (non-blog): 10 static/trust + 1 pillar + 1 state + 4 city + 11 form + 5 bundle = 32
  Per-locale blog launch seed: 10 posts

Mirror VI tree under /vi/ with native Vietnamese slugs (see §2a.2). VI URL pattern:
  /vi/dich-vu/lam-giay-to-di-tru-tieng-viet/{texas,mau-don,goi-dich-vu}/...

V1 total at launch: 32 × 2 + 10 × 2 = 84 pages (64 non-blog + 20 blog seed).
```

**Locale-root redirects:**
```
/                 → 301 → /en/   (or /vi/ if Accept-Language indicates Vietnamese)
/services/*       → 301 → /en/services/vietnamese-immigration-document-preparation/
                    (catches any legacy short URLs; will expand when Phase 1.5 services launch)
```

**Auth flow — 3 pages per locale:**
```
/[locale]/login/          → role-based redirect (client → /portal, admin → /admin)
/[locale]/signup/         → email verification → portal (empty state)
/[locale]/forgot-password/ → reset email → login
```

**Client Portal — 3 page types (English UI only in V1):**
```
/portal/dashboard/                    (all services)
/portal/services/[type]/              (service detail per type)
/portal/documents/                    (cross-service)
```

**Admin Panel — 4 sections (English UI only):**
```
/admin/clients/                       (client list + search + state filter)
/admin/clients/[id]/                  (client detail — services, documents, "Request Review" button)
/admin/blog/                          (post list + tier filter)
/admin/blog/new/ · /admin/blog/[id]/edit/   (editor with SEO publish-blockers)
/admin/content/                       (site_content editor — hero, headlines, review templates)
```

### Data Entities

V1 is case-centric: each `case` represents a single USCIS form filing or bundle engagement
for a specific client. Tax/insurance service types are deferred to Phase 1.5+.

```
profiles ←── auth.users (1:1)
    │     (id, role, full_name, phone, preferred_locale, state,
    │      sms_consent, scope_acknowledged_at, engagement_agreement_url,
    │      bio_en, bio_vi, photo_url)
    │
    ├── cases (1:many)
    │     │  (id, client_id, case_type{form|bundle},
    │     │   form_code{I-90,I-130,I-485,I-751,I-765,I-131,N-400,N-600,
    │     │             I-864,I-912,AR-11,FOIA,TRANSLATION},
    │     │   bundle_code{marriage-gc|family-petition-consular|
    │     │               citizenship-fast-track|gc-renewal-travel-doc|
    │     │               remove-conditions-ead}?,
    │     │   parent_case_id?  -- bundle children reference parent bundle case
    │     │   current_status{intake|docs-pending|prep-in-progress|
    │     │                   ready-to-file|filed-with-uscis|
    │     │                   noa-received|case-update|completed|
    │     │                   referred-out|cancelled},
    │     │   uscis_receipt_number?, uscis_last_synced_at?,
    │     │   priority_date?, notice_date?,
    │     │   service_fee_cents, uscis_fee_cents, total_fee_cents,
    │     │   payment_status{quoted|invoiced|paid|refunded},
    │     │   engagement_signed_at, filed_at?, completed_at?,
    │     │   internal_notes (admin-only), created_at, updated_at)
    │     │
    │     ├── case_documents (1:many)
    │     │     (id, case_id, uploader{client|admin},
    │     │      document_type{engagement_agreement|client_upload|
    │     │                    uscis_noa|uscis_rfe|uscis_approval|
    │     │                    supporting_evidence|draft_form|
    │     │                    final_form|translation|other},
    │     │      storage_path, filename, mime_type, size_bytes,
    │     │      uploaded_at)
    │     │
    │     ├── uscis_sync_log (1:many)
    │     │     (id, case_id, receipt_number, polled_at,
    │     │      status_text, status_code, raw_html_snapshot_path,
    │     │      error?, success boolean)
    │     │
    │     ├── case_status_history (1:many)
    │     │     (id, case_id, status, changed_by{admin|uscis_sync},
    │     │      changed_at, note?)
    │     │
    │     └── review_requests (1:many)
    │           (id, client_id, case_id, sent_at, channel{email|sms},
    │            opened_at?, status{sent|opened|completed|bounced})
    │
    └── blog_posts (admin-authored only — author_id = profiles.id)
          (slug_en, slug_vi, title_en, title_vi,
           meta_description_en, meta_description_vi,
           content_en, content_vi, cover_image_url,
           category{green-card|citizenship|travel|family|fee-waiver|
                    notario-awareness|form-guide},
           post_type{pillar|state|city|form|bundle|blog},
           author_id, published, date_published, date_modified,
           outbound_links_jsonb, faq_jsonb, word_count_en, word_count_vi)

contact_submissions
    (id, name, email, phone, state, is_texas_resident bool,
     form_interest?, bundle_interest?, preferred_channel,
     sms_consent, scope_acknowledged bool, locale, message, created_at)

site_content (key-value store, admin-editable — central content engine)
    (key, value_en, value_vi, last_verified_at?, verification_source_url?)
    Examples:
      hero.headline
      hero.subhead
      form.i-90.service_fee_cents (250_00)
      form.i-90.uscis_fee_paper_cents (465_00)
      form.i-90.uscis_fee_online_cents (415_00)
      form.i-90.last_verified_at (2026-04-10)
      form.i-90.verification_source_url (https://www.uscis.gov/forms/filing-fees)
      bundle.marriage-green-card.components (["I-130","I-485","I-765","I-131","I-864"])
      bundle.marriage-green-card.service_fee_cents (1085_00)
      disclosure.non_attorney_banner
      disclosure.notario_fraud_warning
      disclosure.scope_of_service
      referral.non_texas_resident_message
      referral.attorney_partners (JSON array of verified partners)
      cta.book_consultation
      review_request.email_template
      review_request.sms_template
      about.founder_bio
      footer.notary_commission_number  -- populated post-commission
      footer.texas_notary_badge_enabled bool
```

**Key indexes and constraints:**
- `cases(client_id, created_at DESC)` — client dashboard ordering
- `cases(uscis_receipt_number)` unique where not null — one case per receipt
- `cases(parent_case_id)` — fast lookup of bundle component cases
- `case_documents(case_id, uploaded_at DESC)` — per-case file listing
- `case_status_history(case_id, changed_at DESC)` — timeline display
- `uscis_sync_log(receipt_number, polled_at DESC)` — latest sync per case
- `blog_posts(slug_en)` unique, `blog_posts(slug_vi)` unique — per-locale URL uniqueness
- `contact_submissions(created_at DESC)` — admin inbox
- `contact_submissions(is_texas_resident=true)` — gate check
- `review_requests(case_id)` unique — enforces "max 1 request per case per client"
- `site_content(key)` unique — key-value lookup
- RLS: clients can SELECT only rows where `cases.client_id = auth.uid()`; admins bypass.
- RLS on `case_documents`: client can SELECT/INSERT where parent case is theirs; admins bypass.

---

## 4. Architecture Flows

### 4.1 Lead Generation & Booking Flow

#### L0 — Intent & Outcome

**Intent**
- **(Phase A primary)** A Vietnamese-speaking prospect in Houston sees a Facebook ad featuring Manna One Solution, clicks through to a bilingual landing page that showcases all 4 services, and either books a Calendly consultation or submits the contact form — all on mobile, in under 3 minutes.
- **(Phase A secondary)** The owner hands out the MannaOS.com URL during an in-person consultation; the prospect loads it on their phone, sees the 4-service landing page, and is reassured that the business looks legitimate.
- **(Phase B primary)** A Vietnamese-speaking prospect in Houston searches Google or an AI assistant for a specific USCIS form (e.g. "gia hạn thẻ xanh Houston"), lands on the matching form cluster page, and books a consultation without ever visiting the Home landing page.

**Outcome**
- **(Phase A)** Paid Facebook traffic and in-person handoffs convert to Calendly bookings or contact form submissions at the Phase A targets in §1 Success Metrics. The owner has something to show clients and run ads against.
- **(Phase B)** Organic search and AI-search traffic converts on deep-funnel immigration pages, with FAQ rich snippets, published pricing, and non-attorney disclosure all visible above the fold.

#### L1 — Business Flow

**Phase A path (Facebook ad → Home landing page):**

1. **Owner** launches a Facebook ad targeting the Vietnamese-American community in Houston + surrounding Texas metros. Ad creative features the MannaOS logo, a bilingual headline, and a service-specific hook (Tax / Insurance / Immigration / AI).
2. **Prospect** sees the ad on Facebook or Instagram, taps the "Learn More" / "Book Now" button.
3. **Meta** sends the prospect to `mannaos.com/en/?utm_source=facebook&utm_campaign=...&fbclid=...` (or `/vi/` based on ad audience language).
4. **Next.js middleware** honors the locale prefix and renders the Home landing page on the edge. Meta Pixel fires `PageView`; server-side CAPI fires the de-duplicated copy.
5. **Prospect** sees the hero banner, scrolls through the 4 service cards, trust badges, "How It Works", and contact strip — in their language — in under 5 seconds.
6. **Prospect** taps "Book Free Consultation" → navigates to `/contact/` with UTM params preserved.
7. **Prospect** either (a) fills the Calendly embed to book a consultation (fires `Schedule` on Meta + `calendly_booking_complete` on GA4), or (b) submits the contact form (fires `Lead` on Meta + `form_submit` on GA4), or (c) taps the click-to-call phone button (fires `Contact`).
8. **Next.js API route** stores the contact form submission in Supabase `contact_submissions` with UTM parameters attached, then sends notification email to the owner via Resend.
9. **Owner** sees the lead in the Resend inbox (and the Supabase dashboard) within seconds, follows up via phone or email within 24 hours.

**Phase A secondary path (in-person URL handoff):**

1. During an in-person consultation the **owner** writes `mannaos.com` on a card or says it out loud.
2. **Prospect** types it in their phone browser — Next.js middleware detects Accept-Language `vi*` → 302 → `/vi/`.
3. Same Home landing page renders. The prospect sees the 4-service showcase and the "legitimate business" signals (logo, credentials, Calendly), which reassures them that the owner isn't a fly-by-night operator.

**Phase B path (organic search / AI search → form cluster page):**

1. **Prospect** searches Google/AI for a specific immigration query in Vietnamese or English.
2. **Google/AI** returns MannaOS.com in results (rich snippet with FAQ, local business info, pricing extracted from Offer schema).
3. **Prospect** clicks through, lands directly on a form cluster or bundle page — **not** the Home landing page.
4. **Website** serves the page in the locale that matches the URL the prospect clicked (`/vi/...` or `/en/...`). There is no toggle; the server-delivered locale is the index target.
5. **Prospect** reads the above-the-fold non-attorney disclosure, the pricing table (Service + USCIS = Total with verified-as-of timestamp), the Texas-residents-only scope, and the FAQ.
6. **Prospect** decides to take action — either books via Calendly (Texas residents) or sees the referral-out block (non-Texas).
7. **Calendly** sends confirmation to prospect + notification to owner.
8. **Next.js API route** stores submission in Supabase `contact_submissions` and sends email to owner via Resend.
9. **Owner** reviews leads, follows up within 24 hours.

#### L2 — User Flow

```mermaid
flowchart TD
    FBAd["Facebook / Instagram Ad\nVN audience, Houston geo\nCreative: 4-service hook"]
        --> AdClick["User taps 'Book Now'\nutm_source=facebook\nfbclid=...\nlocale inferred from audience"]

    AdClick --> Home["Phase A Landing: mannaos.com/{locale}/\nHero banner · 4 service cards\nTrust badges · How It Works\nContact strip · Footer"]

    InPerson["Owner hands out\n'mannaos.com' in person"]
        --> MobileTyped["User types URL on phone\nMiddleware: Accept-Language → /vi/ or /en/"]
    MobileTyped --> Home

    OrgSearch["Phase B: Google / AI Search\n'gia hạn thẻ xanh Houston'\n'N-400 tiếng Việt'"]
        --> SERP["SERP result: form cluster page\nFAQ rich snippet + Offer pricing"]
    SERP --> FormPage["Phase B Deep Page:\n/vi/dich-vu/.../mau-don/i-90-gia-han-the-xanh/\nNon-attorney disclosure above fold\nPricing table · FAQ · TX scope"]

    Home --> FourCards["User scans 4 service cards\nTax · Insurance · Immigration · AI"]
    FourCards --> CardClick{"Which service\ncard?"}
    CardClick -->|Tax| TaxOverview["/{locale}/services/tax/"]
    CardClick -->|Insurance| InsOverview["/{locale}/services/insurance/"]
    CardClick -->|Immigration| ImmOverview["/{locale}/services/immigration/\n(Phase A: brochure page\nPhase B: pillar + cluster tree)"]
    CardClick -->|AI| AIOverview["/{locale}/services/ai/"]

    Home --> HeroCTA["Hero primary CTA:\n'Book Free Consultation'"]
    TaxOverview --> ContactPage
    InsOverview --> ContactPage
    ImmOverview --> ContactPage
    AIOverview --> ContactPage
    HeroCTA --> ContactPage
    FormPage --> ContactPage

    ContactPage["/{locale}/contact/\nCalendly embed\nContact form (with UTM capture)\nPhone · Messenger · Zalo"]

    ContactPage --> BookCalendly["Calendly: pick date/time\nName + phone\nConfirmation shown"]
    ContactPage --> SubmitForm["Contact form submit\nName · Phone · Email\nService dropdown (4)\nMessage · UTM stored"]
    ContactPage --> PhoneTap["Click-to-call 346-852-4454"]

    BookCalendly --> MetaSchedule["Meta Pixel: Schedule\nGA4: calendly_booking_complete\nOwner notified by Calendly"]
    SubmitForm --> MetaLead["Meta Pixel: Lead\nGA4: form_submit\nResend email + Supabase row"]
    PhoneTap --> MetaContact["Meta Pixel: Contact\nGA4: phone_click_to_call"]
```

#### L3 — System Flow

```mermaid
flowchart TD
    Browser["Browser\n(mobile first — 70% of traffic)"]
        --> Vercel["Vercel CDN\nServes static HTML (SSG)\nEdge middleware: locale detect"]

    Vercel --> NextJS["Next.js App (App Router)\napp/[locale]/(public)/\npage.tsx, services/*, contact/*\nPer-locale metadata + JSON-LD"]

    NextJS --> LocaleRoute["URL is source of truth:\n/en/... or /vi/...\nNEXT_LOCALE cookie honors switches"]

    Browser -->|Contact form submit| APIRoute["Next.js API Route\n(POST /api/contact)\nReads UTM + fbclid from body"]
    APIRoute --> ContactDB[("Supabase: contact_submissions\n+ utm_source · utm_campaign\n+ fbclid · service_interest")]
    APIRoute --> Resend["Resend API\n(send email to owner)"]
    APIRoute --> MetaCAPI["Meta Conversions API\nServer-side 'Lead' event\nevent_id = client pixel event_id\n(de-duplicates client pixel)"]
    Resend --> OwnerEmail["Owner Email\n(lead notification with UTM)"]

    Browser -->|Book appointment| Calendly["Calendly Embed (iframe)\nwindow.Calendly event listener"]
    Calendly --> CalendlyAPI["Calendly Service\nConfirmation to prospect\nNotification to owner"]
    Calendly -->|event_scheduled postMessage| ClientPixel["Client Meta Pixel\n'Schedule' event"]
    ClientPixel --> MetaCAPI

    Browser -->|Page view| Pixel["Client Meta Pixel fbq('PageView')\n+ GA4 page_view"]
    Pixel --> MetaCAPI

    Browser -->|Click-to-call| Phone["tel:346-852-4454\n+ fbq('Contact')"]
    Browser -->|Messenger| FB["m.me/mannaonesolution"]
    Browser -->|Zalo| Zalo["zalo.me/..."]

    Vercel --> GoogleBot["Googlebot / Bingbot / AI Crawlers\n(GPTBot, ClaudeBot, PerplexityBot,\nGoogle-Extended, CCBot — all allowed)"]
    GoogleBot --> Sitemap["sitemap.xml\n(Phase A: Home + 4 service overviews\n+ About + Contact + legal)\n(Phase B: + pillar + clusters + blog)"]
    GoogleBot --> LlmsTxt["/llms.txt\n(Phase A: 4-service entity stub)\n(Phase B: full immigration scope)"]
    GoogleBot --> JsonLD["JSON-LD per page\n(Phase A: Organization + LocalBusiness)\n(Phase B: + LegalService + Service + Offer\n+ FAQPage + HowTo + Speakable + Article)"]
```

---

### 4.2 Client Signup & Authentication Flow

#### L0 — Intent & Outcome

**Intent**
- New client wants to access their service dashboard after initial consultation, without complex registration.
- Returning client wants to quickly log in and check their case status.

**Outcome**
- Client registers in under 60 seconds, verifies email, and lands on their portal — ready to view services once admin assigns them.

#### L1 — Business Flow

1. **Client** visits `/signup` (linked from consultation follow-up email or navbar "Sign In").
2. **Client** enters: full name, email, phone, password.
3. **System** creates account in Supabase Auth, sends verification email.
4. **Client** clicks verification link → redirected to `/portal/dashboard`.
5. **Dashboard** shows empty state: "Your services will appear here after your consultation."
6. **Admin** receives notification of new signup.
7. **Admin** assigns services to client profile after consultation.
8. **Client** returns later, logs in → sees their service cards populated.

#### L2 — User Flow

```mermaid
flowchart TD
    Entry["Navbar: 'Sign In' button\nor follow-up email link"]
        --> LoginPage["Page: /login\nEmail + Password fields\n'Create account' + 'Forgot password' links"]

    LoginPage -->|Has account| Login["User: enters email + password\nClicks 'Sign In'"]
    LoginPage -->|New user| GoSignup["User: clicks 'Create account'"]

    GoSignup --> SignupPage["Page: /signup\nFull name, Email, Phone, Password"]
    SignupPage --> Submit["User: fills form, clicks 'Create Account'"]
    Submit --> VerifyScreen["Screen: 'Check your email'\nVerification link sent"]
    VerifyScreen --> ClickLink["User: clicks email verification link"]
    ClickLink --> Dashboard["Page: /portal/dashboard\nEmpty state: 'Services appear after consultation'"]

    Login --> RoleCheck{"User role?"}
    RoleCheck -->|client| Dashboard
    RoleCheck -->|admin| AdminPanel["Page: /admin/clients"]

    LoginPage -->|Forgot password| ForgotPage["Page: /forgot-password\nEmail field"]
    ForgotPage --> ResetEmail["System: sends password reset email"]
    ResetEmail --> ResetLink["User: clicks link, enters new password"]
    ResetLink --> LoginPage
```

#### L3 — System Flow

```mermaid
flowchart TD
    Client["Browser\n(/signup form)"]
        --> SupabaseAuth["Supabase Auth API\nauth.signUp()"]

    SupabaseAuth --> CreateUser["auth.users\n(new row: email, hashed password)"]
    SupabaseAuth --> SendEmail["Supabase Email\n(verification link)"]
    SupabaseAuth --> TriggerFn["DB Trigger: on auth.users INSERT\n→ INSERT INTO profiles\n(id, role='client', full_name, phone)"]

    TriggerFn --> ProfilesTable[("profiles table\n(id, role, full_name, phone,\npreferred_language)")]

    SendEmail --> VerifyClick["User clicks verification link"]
    VerifyClick --> SupabaseVerify["Supabase: mark email_confirmed_at"]

    Client -->|Login| LoginAPI["Supabase Auth API\nauth.signInWithPassword()"]
    LoginAPI --> Session["Supabase Session\n(JWT with user_id + role in metadata)"]

    Session --> Middleware["Next.js Middleware\nReads session cookie\nChecks route vs. role"]

    Middleware -->|client + /portal/*| PortalPages["Server Component\nSupabase client with RLS\n→ only own rows visible"]
    Middleware -->|admin + /admin/*| AdminPages["Server Component\nSupabase client with RLS\n→ all rows visible"]
    Middleware -->|no session + /portal or /admin| Redirect["Redirect → /login"]

    ProfilesTable --> RLS["Row Level Security\nclients: auth.uid() = id\nadmins: role = 'admin'"]
```

---

### 4.3 Client Portal — Service Tracking Flow

#### L0 — Intent & Outcome

**Intent**
- Client wants to know "what's happening with my case?" — whether it's USCIS immigration, tax filing, insurance policy, or AI project — without calling the office.
- Client wants to access and share documents related to their services.

**Outcome**
- Client logs in, sees all active services at a glance, drills into any service for status history and documents — updated within 24 hours of any change.

#### L1 — Business Flow

1. **Client** logs into portal → lands on dashboard.
2. **Dashboard** displays one card per active service with: service name, status badge, last updated date.
3. **Client** clicks a service card → navigated to service detail page.
4. **Service detail** shows: current status (large), status history timeline, service-specific metadata, linked documents.
5. **Client** downloads a document admin uploaded (e.g., receipt notice PDF).
6. **Client** uploads their own document (e.g., additional evidence for immigration case).
7. **Client** navigates to `/portal/documents` → sees all documents across all services, filterable.

#### L2 — User Flow

```mermaid
flowchart TD
    Login["User logs in\n→ /portal/dashboard"]
        --> Dashboard["Page: Dashboard\nCards: USCIS (In Progress), Tax 2025 (Complete),\nInsurance (Active)"]

    Dashboard -->|Empty state| EmptyMsg["'Your services will appear here\nafter your consultation.'\nCTA: Book consultation"]

    Dashboard -->|Click USCIS card| USCISDetail["Page: /portal/services/uscis\nReceipt: IOE-1234567890\nStatus: 'Case Was Received'\nLast synced: today 6:00 AM"]

    USCISDetail --> Timeline["Status History Timeline\n• Apr 10 — Case Was Received\n• Apr 5 — Case Was Submitted"]

    USCISDetail --> Docs["Documents Section\n📄 Receipt Notice.pdf (admin uploaded)\n📄 Evidence.pdf (client uploaded)"]

    Docs -->|Download| Download["Browser downloads file\nfrom Supabase Storage"]
    Docs -->|Upload| UploadModal["Upload modal:\nSelect file (PDF/JPG/PNG, max 10MB)\nFile saved to service documents"]

    Dashboard -->|Click 'Documents' nav| AllDocs["Page: /portal/documents\nAll documents across all services\nFilter: All | USCIS | Tax | Insurance | AI"]
```

#### L3 — System Flow

```mermaid
flowchart TD
    Browser["Browser\n(authenticated client)"]
        --> ServerComp["Next.js Server Component\n/portal/dashboard"]

    ServerComp --> SupabaseRLS["Supabase Client (server)\nwith RLS: auth.uid() = client_id"]

    SupabaseRLS --> ServicesQuery["SELECT * FROM services\nWHERE client_id = auth.uid()"]
    ServicesQuery --> ServicesTable[("services table\n(id, client_id, service_type,\nstatus, metadata)")]

    Browser -->|Click service card| DetailPage["Server Component\n/portal/services/[type]"]

    DetailPage --> MetadataQuery["SELECT metadata, status\nFROM services\nWHERE client_id = auth.uid()\nAND service_type = :type"]

    DetailPage --> DocsQuery["SELECT * FROM service_documents\nWHERE service_id = :id"]
    DocsQuery --> DocsTable[("service_documents table\n(file_name, file_url, uploaded_by)")]

    DocsTable --> StorageURL["Supabase Storage\nSigned URL for download"]

    Browser -->|Upload document| UploadAction["Server Action:\nupload to Supabase Storage\nINSERT service_documents row"]
    UploadAction --> Storage[("Supabase Storage\nbucket: client-documents")]
    UploadAction --> DocsTable
```

---

### 4.4 USCIS Status Display Flow (Read from Shared DB)

> **Architecture note:** MannaOS.com does **not** poll USCIS directly. The internal staff app (`app.mannaonesolution.com`) runs a Playwright agent on a dedicated VPS that navigates `egov.uscis.gov/casestatus/mycasestatus.do` daily, scrapes each receipt number's status, and writes updates to the shared Supabase database. MannaOS.com client portal simply reads this data. CAPTCHA is real on the USCIS site but at MOS scale (~50 checks/day with 2–5s random delays from a static-IP VPS), it stays below detection thresholds. CAPTCHA detection and admin alerting are handled by the staff app's Playwright agent. For L4 technical workflows (error handling, idempotency, edge cases), see the internal staff app PRD: `2026-04-09-uscis-tracker-L4.md`.

#### L0 — Intent & Outcome

**Intent**
- Client wants to see their immigration case status without manually checking the USCIS website.
- Client expects status to be current (within 24 hours) when they log into the portal.

**Outcome**
- Client logs into MannaOS.com portal and sees the latest USCIS status, synced automatically by the staff app. No manual effort from the client or from the MannaOS.com website itself.

#### L1 — Business Flow

1. **Internal staff app** (separate project on VPS) runs Playwright agent daily at 6:00 AM CT.
2. **Playwright agent** navigates to USCIS website, enters each active receipt number, scrapes status.
3. **Agent** compares scraped status with stored `current_uscis_status` in shared Supabase DB.
4. **If changed**: agent updates `services.metadata`, inserts `uscis_sync_log` row, creates staff notification.
5. **MannaOS.com client portal** reads from the same `services` and `uscis_sync_log` tables.
6. **Client** logs into portal → sees the latest status, history timeline, and last-synced timestamp.
7. **No polling, no cron, no external API calls happen on MannaOS.com** — it is a pure read consumer.

#### L2 — User Flow

```mermaid
flowchart TD
    StaffApp["Internal Staff App (VPS)\nPlaywright agent polls USCIS daily\n→ writes to shared Supabase DB"]
        --> DBUpdated["Supabase DB updated\nservices.metadata.uscis_status\nuscis_sync_log row inserted"]

    DBUpdated --> ClientVisit["Client: logs into MannaOS.com\n→ /portal/services/uscis"]

    ClientVisit --> SeesStatus["Portal shows:\nReceipt: IOE-1234567890\nStatus: 'Case Was Approved' ✓\nLast synced: today 6:00 AM"]

    SeesStatus --> Timeline["Status History Timeline\n• Apr 10 — Case Was Approved\n• Apr 5 — Case Was Received\n• Mar 28 — Case Was Submitted"]

    SeesStatus --> Docs["Documents Section\nReceipt notice, evidence uploads"]
```

#### L3 — System Flow

```mermaid
flowchart TD
    VPS["Dedicated VPS\n(DigitalOcean ~$5/mo)\nStatic IP"]
        --> PlaywrightAgent["Playwright Agent (Node.js)\nDaily 6:00 AM CT cron\nNavigates egov.uscis.gov\nScrapes status per receipt"]

    PlaywrightAgent -->|Write| SharedDB[("Shared Supabase DB\nservices table\nuscis_sync_log table")]

    MannaOS["MannaOS.com\n(Vercel — Next.js)"]
        -->|Read only| SharedDB

    MannaOS --> PortalPage["Server Component\n/portal/services/uscis\nSELECT metadata, status\nFROM services\nWHERE client_id = auth.uid()\nAND service_type = 'uscis'"]

    PortalPage --> HistoryQuery["SELECT * FROM uscis_sync_log\nWHERE service_id = :id\nORDER BY synced_at DESC"]

    PortalPage --> RenderStatus["Render:\n• Current status (large badge)\n• Last synced timestamp\n• Status history timeline\n• Linked documents"]
```

---

### 4.5 Admin Client Management Flow

#### L0 — Intent & Outcome

**Intent**
- Admin needs to manage 10–50 clients across 4 service lines without spreadsheets — add services, update statuses, upload documents, all in one place.
- Admin wants new client signups surfaced immediately so no lead falls through the cracks.

**Outcome**
- Admin searches or browses client list, clicks into a client, manages all their services and documents from a single detail page. Changes reflect on the client's portal instantly.

#### L1 — Business Flow

1. **Admin** logs in → lands on `/admin/clients`.
2. **Admin** sees list of all clients with search and filter by service type.
3. **Admin** clicks a client → sees their profile + all active services.
4. **Admin** clicks "Add Service" → selects service type, fills metadata, sets initial status.
5. **System** creates service row → client sees it on their portal immediately.
6. **Admin** uploads a document for the client → linked to specific service.
7. **Admin** updates service status → status change recorded, client sees update.
8. **New client signup** triggers email notification to admin.

#### L2 — User Flow

```mermaid
flowchart TD
    AdminLogin["Admin logs in\n→ /admin/clients"]
        --> ClientList["Page: /admin/clients\nSearch bar + service type filter\nTable: Name, Email, Phone, Services, Last Updated"]

    ClientList -->|Search 'Nguyen'| FilteredList["Filtered results\nshowing matching clients"]

    ClientList -->|Click client row| ClientDetail["Page: /admin/clients/[id]\nProfile: name, email, phone\nActive Services: cards per service"]

    ClientDetail -->|Click 'Add Service'| AddService["Modal: Add Service\nDropdown: USCIS / Tax / Insurance / AI\nDynamic metadata fields\nInitial status field\nSave button"]

    AddService --> SaveService["System: creates service row\nClient portal updated instantly"]

    ClientDetail -->|Click service card| EditService["Inline edit:\nUpdate status dropdown\nEdit metadata fields\nSave changes"]

    ClientDetail -->|Click 'Upload Document'| UploadDoc["Upload modal:\nSelect service (dropdown)\nChoose file (PDF/JPG/PNG)\nUpload → linked to service"]

    ClientDetail -->|View documents| DocList["Documents section:\nAll docs for this client\nGrouped by service\nDownload / delete actions"]
```

#### L3 — System Flow

```mermaid
flowchart TD
    AdminBrowser["Browser\n(authenticated admin)"]
        --> AdminServer["Next.js Server Component\n/admin/clients"]

    AdminServer --> SupabaseAdmin["Supabase Client (server)\nAdmin role — full access via RLS"]

    SupabaseAdmin --> ListClients["SELECT profiles.*,\narray_agg(services) as services\nFROM profiles\nJOIN services ON profiles.id = services.client_id\nWHERE role = 'client'"]
    ListClients --> ProfilesDB[("profiles + services tables")]

    AdminBrowser -->|Add service| AddAction["Server Action:\nINSERT INTO services\n(client_id, service_type, status, metadata)"]
    AddAction --> ServicesDB[("services table")]

    AdminBrowser -->|Update status| UpdateAction["Server Action:\nUPDATE services\nSET status = :status, metadata = :metadata\nWHERE id = :id"]
    UpdateAction --> ServicesDB

    AdminBrowser -->|Upload document| UploadAction["Server Action:\n1. Upload file → Supabase Storage\n2. INSERT service_documents\n(service_id, file_name, file_url, uploaded_by='admin')"]
    UploadAction --> StorageBucket[("Supabase Storage\nbucket: client-documents")]
    UploadAction --> DocsDB[("service_documents table")]

    AdminBrowser -->|revalidatePath| Revalidate["Next.js: revalidatePath\n('/portal/dashboard')\nClient sees changes immediately"]
```

---

### 4.6 Admin Blog Management Flow

#### L0 — Intent & Outcome

**Intent**
- Admin wants to publish helpful content (tax tips, immigration guides, LLC how-tos) to attract organic search traffic and AI search citations — without needing a developer.
- Content must be bilingual to serve both Vietnamese and English audiences.

**Outcome**
- Admin writes a blog post with rich text and photos in both languages, publishes it, and it appears on the public blog within seconds — complete with SEO schema and proper formatting.

#### L1 — Business Flow

1. **Admin** navigates to `/admin/blog` → sees all posts (draft + published).
2. **Admin** clicks "New Post" → opens Tiptap editor.
3. **Admin** writes original content in VI tab, switches to EN tab, writes English version. All blog content is original, written by the owner.
4. **Admin** uploads cover photo + optional inline photos.
5. **Admin** selects category (Tax, Insurance, Immigration, AI, General).
6. **Admin** reviews slug (auto-generated, editable), toggles Published.
7. **System** saves post to `blog_posts` table, uploads images to Supabase Storage.
8. **Post** appears on `/blog` with cover image, category tag, and bilingual content.
9. **Article JSON-LD** auto-generated for published posts.

#### L2 — User Flow

```mermaid
flowchart TD
    AdminNav["Admin: /admin/blog\nPost list: title, category, status, date"]
        --> NewPost["Admin clicks 'New Post'\n→ /admin/blog/new"]

    NewPost --> Editor["Tiptap Rich Text Editor\nVI tab (Vietnamese content)\nEN tab (English content)"]

    Editor --> WritVI["Admin: writes Vietnamese content\nHeadings, lists, bold, links"]
    WritVI --> SwitchEN["Admin: clicks EN tab"]
    SwitchEN --> WritEN["Admin: writes English content"]

    WritEN --> UploadCover["Admin: uploads cover photo\nPreview shown below upload button"]

    UploadCover --> InlinePhoto["Admin: inserts inline photo\nvia Tiptap toolbar button"]

    InlinePhoto --> SelectCategory["Admin: selects category\nDropdown: Tax | Insurance | Immigration | AI | General"]

    SelectCategory --> ReviewSlug["Admin: reviews auto-generated slug\n(editable text field)"]

    ReviewSlug --> TogglePublish{"Publish now?"}
    TogglePublish -->|Yes| Publish["Admin: toggles 'Published' ON\nClicks 'Save'"]
    TogglePublish -->|No| SaveDraft["Admin: leaves as Draft\nClicks 'Save'"]

    Publish --> LivePost["Post appears on /blog\nWith cover image, category tag,\nArticle JSON-LD schema"]

    SaveDraft --> DraftSaved["Post saved as draft\nNot visible on public blog"]

    AdminNav -->|Click existing post| EditPost["Page: /admin/blog/[id]/edit\nSame editor, pre-filled content"]
    EditPost --> Editor
```

#### L3 — System Flow

```mermaid
flowchart TD
    AdminBrowser["Browser\n(admin on /admin/blog/new)"]
        --> TiptapClient["Tiptap Editor\n(client component)\nOutputs HTML or JSON per language tab"]

    AdminBrowser -->|Upload cover photo| CoverUpload["Server Action:\nUpload to Supabase Storage\nbucket: blog-images\nReturns public URL"]
    CoverUpload --> BlogStorage[("Supabase Storage\nblog-images bucket")]

    AdminBrowser -->|Upload inline photo| InlineUpload["Tiptap image button\n→ same upload flow\nInserts <img> into editor content"]
    InlineUpload --> BlogStorage

    AdminBrowser -->|Click Save| SaveAction["Server Action:\nINSERT/UPDATE blog_posts\n(slug, title_vi, title_en,\ncontent_vi, content_en,\ncover_image_url, category,\npublished, author_id)"]
    SaveAction --> BlogDB[("blog_posts table")]

    BlogDB -->|published = true| PublicBlog["Next.js: /blog/[slug]\nSSG with revalidate\nRenders VI or EN based on toggle"]

    PublicBlog --> ArticleSchema["JSON-LD: Article schema\nauthor, datePublished,\nheadline, description, image"]

    PublicBlog --> SitemapUpdate["next-sitemap\nIncludes new blog URL\nin sitemap.xml"]
```

---

### 4.7 Bilingual System Flow — Subdirectory i18n Routing

> **Critical SEO decision:** Each locale lives at its own URL (`/en/...`, `/vi/...`)
> with native slugs, metadata, schema, and content. We **do not** use a single-URL
> client-side toggle — per `multilingual-seo.md`, "a translated page on the same URL
> cannot rank for native-language queries." Google and Bing only render and index
> the server-delivered locale.

#### L0 — Intent & Outcome

**Intent**
- Vietnamese-speaking visitors (primary persona) must be able to find MannaOS.com in Vietnamese search results on Google and in AI answer engines — not only after clicking a toggle.
- English-speaking visitors (including Google/Bing crawlers rendering the EN version) get a fully-indexed English site.
- Both locales share brand authority while maintaining distinct keyword footprints.

**Outcome**
- MannaOS.com ranks natively for Vietnamese-language queries because Vietnamese content lives on Vietnamese URLs with Vietnamese slugs, Vietnamese metadata, Vietnamese FAQ JSON-LD, and correct `hreflang` reciprocity. Visitors land directly on the correct-language page from the search engine.

#### L1 — Business Flow

1. **First-time visitor** hits `mannaos.com/` — Next.js middleware reads `Accept-Language`:
   - `vi*` → 302 redirect to `/vi/`
   - otherwise → 302 redirect to `/en/`
2. **Search engine result click** sends the visitor directly to the canonical locale URL (e.g. `/vi/dich-vu/lam-giay-to-di-tru-tieng-viet/texas/houston/` or `/vi/mau-don/n-400-xin-quoc-tich/`). **No redirect, no toggle, no delay.**
3. **Language switcher** (navbar) links to the equivalent page in the other locale (computed at render time from a `routeMap` keyed by a language-neutral page ID).
4. **Explicit switch** stores preference in a `NEXT_LOCALE` cookie (1-year expiry); subsequent bare-root visits honor the cookie over `Accept-Language`.
5. **Blog posts** use per-locale slugs from `blog_posts.slug_en` / `slug_vi`; the switcher finds the sibling slug by post ID.
6. **Portal and admin UI** are English-only in V1 (simplifies RLS and labels).

#### L2 — User Flow

```mermaid
flowchart TD
    SEVisit["Visitor from search engine\n(e.g. Google VI result)"]
        --> DirectURL["Lands directly on\n/vi/dich-vu/lam-giay-to-di-tru-tieng-viet/texas/houston/"]

    RootVisit["Visitor types mannaos.com"]
        --> Middleware{"Next.js middleware\nreads cookie +\nAccept-Language"}

    Middleware -->|Cookie NEXT_LOCALE=vi| RedirectVI["302 → /vi/"]
    Middleware -->|Cookie NEXT_LOCALE=en| RedirectEN["302 → /en/"]
    Middleware -->|No cookie, Accept-Language: vi*| RedirectVI
    Middleware -->|No cookie, other| RedirectEN

    DirectURL --> RenderedVI["Server-rendered VI page\n• VI title + meta\n• VI JSON-LD\n• VI body + FAQ\n• hreflang: vi, en, x-default"]

    RedirectVI --> RenderedVI
    RedirectEN --> RenderedEN["Server-rendered EN page\n• EN title + meta\n• EN JSON-LD\n• EN body + FAQ\n• hreflang: en, vi, x-default"]

    RenderedVI --> SwitcherVI["Navbar switcher link:\n→ equivalent /en/ URL"]
    RenderedEN --> SwitcherEN["Navbar switcher link:\n→ equivalent /vi/ URL"]

    SwitcherVI -->|Click 'EN'| SetCookieEN["Set cookie NEXT_LOCALE=en\nNavigate to /en/... equivalent"]
    SwitcherEN -->|Click 'VI'| SetCookieVI["Set cookie NEXT_LOCALE=vi\nNavigate to /vi/... equivalent"]
```

#### L3 — System Flow

```mermaid
flowchart TD
    Request["Browser request\n(any URL)"]
        --> MW["Next.js Middleware\n(middleware.ts)"]

    MW --> LocaleCheck{"URL starts with\n/en/ or /vi/?"}
    LocaleCheck -->|Yes| PassThrough["Pass through to\napp/[locale]/..."]
    LocaleCheck -->|No (bare root)| DetectLocale["Detect locale from:\n1. NEXT_LOCALE cookie\n2. Accept-Language header\n3. Default: 'en'"]
    DetectLocale --> Redirect302["302 redirect to\n/{locale}/..."]

    PassThrough --> AppRouter["Next.js App Router\napp/[locale]/(public)/\nservices/\n  vietnamese-immigration-document-preparation/\n    [state]/\n      [city]/page.tsx\nforms/[formSlug]/page.tsx\nbundles/[bundleSlug]/page.tsx"]

    AppRouter --> Metadata["generateMetadata()\n• Locale-aware title + desc\n• canonical: self URL\n• hreflang: en, vi, x-default"]

    AppRouter --> I18nDict["Server-side translation dict\n/messages/en.json\n/messages/vi.json\n(for UI strings only —\npage content is authored\nseparately per locale)"]

    AppRouter --> ContentLoad["Page content source:\n• Static (MDX per locale) for pillars/clusters/cities\n• DB (blog_posts) for blog detail"]

    AppRouter --> JsonLDGen["JSON-LD generator\n• Organization / LocalBusiness / LegalService\n• Service + Offer (form & bundle pricing)\n• HowTo (form preparation)\n• BreadcrumbList\n• FAQPage (locale-specific Q&A)\n• Person (for blog author)\n• Speakable\n• inLanguage + knowsLanguage"]

    AppRouter --> Sitemap["app/sitemap.ts\nEmits every URL × every locale\nWith <xhtml:link hreflang> entries"]

    AppRouter --> Switcher["<LanguageSwitcher>\nreceives language-neutral pageId + params\nResolves equivalent URL in other locale\nvia routeMap config"]
```

#### Implementation notes

```
DIRECTORY LAYOUT (Next.js App Router):
  app/
    [locale]/
      layout.tsx                 # hreflang tags, <html lang={locale}>
      (public)/
        page.tsx                 # home
        about/page.tsx
        contact/page.tsx
        privacy-policy/page.tsx
        terms-of-service/page.tsx
        services/
          vietnamese-immigration-document-preparation/  # immigration pillar (V1)
            page.tsx             # pillar
            texas/
              page.tsx           # Texas state cluster
              [city]/page.tsx    # Houston / DFW / Austin / San Antonio
        forms/
          [formSlug]/page.tsx    # 11 form cluster pages
        bundles/
          [bundleSlug]/page.tsx  # 5 bundle pages
        non-attorney-disclosure/page.tsx
        notario-fraud-awareness/page.tsx
        need-an-immigration-attorney/page.tsx
        blog/
          page.tsx               # list
          [slug]/page.tsx        # detail (slug is locale-specific)
      (auth)/
        login/page.tsx
        signup/page.tsx
        forgot-password/page.tsx
    portal/                      # English-only, no [locale]
    admin/                       # English-only, no [locale]

ROUTE MAP (for language switcher):
  config/routeMap.ts exports a typed map like:
    {
      home: { en: '/en', vi: '/vi' },
      'services.immigration': {
        en: '/en/services/vietnamese-immigration-document-preparation',
        vi: '/vi/dich-vu/lam-giay-to-di-tru-tieng-viet',
      },
      'services.immigration.texas.houston': {
        en: '/en/services/vietnamese-immigration-document-preparation/texas/houston',
        vi: '/vi/dich-vu/lam-giay-to-di-tru-tieng-viet/texas/houston',
      },
      'forms.i-90': {
        en: '/en/forms/i-90-green-card-renewal',
        vi: '/vi/mau-don/i-90-gia-han-the-xanh',
      },
      'forms.n-400': {
        en: '/en/forms/n-400-citizenship',
        vi: '/vi/mau-don/n-400-xin-quoc-tich',
      },
      'bundles.marriage-gc': {
        en: '/en/bundles/marriage-green-card-package',
        vi: '/vi/goi-dich-vu/ho-so-ket-hon-xin-the-xanh',
      },
      ...
    }
  Each page calls useRouteMap(pageId) to render the switcher.

CONTENT AUTHORING:
  Marketing pages (pillar/Texas/city/form/bundle) authored as MDX files in
    content/en/services/..., content/en/forms/..., content/en/bundles/...
    content/vi/dich-vu/..., content/vi/mau-don/..., content/vi/goi-dich-vu/...
  Authored separately per locale — do NOT machine-translate.
  Native Vietnamese speaker writes or reviews every VI page.

BLOG DETAIL:
  Single blog_posts row stores both locales.
  URL routing: /en/blog/[slug] looks up by slug_en,
               /vi/blog/[slug] looks up by slug_vi.
  Language switcher for blog uses post ID to find sibling slug.
```

---

### 4.8 SEO & GEO Strategy Flow

#### L0 — Intent & Outcome

**Intent**
- Business must be discoverable both by traditional search engines (Google, Bing) and by AI answer engines (ChatGPT, Perplexity, Google AI Overview, Microsoft Copilot, Apple Intelligence / Siri).
- Vietnamese-language queries for professional services must surface MannaOS.com across multiple states, not just Houston.
- AI engines must cite the business with accurate credentials, pricing, and per-state availability.

**Outcome**
- MannaOS.com ranks on page 1 for target Vietnamese + English keywords in target states, appears in Google Local Pack for Houston queries, and is cited by AI answer engines for Vietnamese-language professional services questions across the U.S.

#### L1 — Business Flow

1. **Keyword research** (Phase 1 Week 1) is completed and documented before any page is built.
2. **Topical Map** (§2a) is implemented: national pillars → state clusters → city support pages, all per locale.
3. **At build time**, Next.js generates static HTML with structured data for every public page, per locale.
4. **Per-locale sitemap** auto-generated and submitted to Google Search Console + Bing Webmaster Tools.
5. **Every pillar / cluster / city page** includes 5–8 FAQ questions with matching FAQPage JSON-LD, answer-first format, published price ranges, outbound `.gov` links.
6. **Blog posts** generate Article + Person (author) + BreadcrumbList JSON-LD with datePublished and dateModified.
7. **`/llms.txt`** describes the business entity, services, pricing, credentials, and per-state delivery for AI crawlers.
8. **`/robots.txt`** explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) and blocks `/portal`, `/admin`, `/api`.
9. **hreflang** tags with reciprocal `en` / `vi` / `x-default` on every page.
10. **Google Business Profile + Apple Business Connect + Bing Places** (external) set up for Houston HQ with identical NAP.
11. **Monthly AI citation audit** (automated or manual spreadsheet) tracks top 20 target queries across Google AIO, ChatGPT, Perplexity, Copilot.

#### L2 — User Flow

```mermaid
flowchart TD
    GoogleUser["User searches Google\n'làm N-400 tiếng Việt Houston'"]
        --> GoogleSERP["Google SERP\nMannaOS.com with FAQ rich snippet\nLocal Business card (GBP)"]

    GoogleSERP --> ClickThrough["User clicks → /forms/n-400-citizenship\nPricing table ($550 + $760 USCIS),\nnon-attorney disclosure, FAQ"]

    AIUser["User asks ChatGPT\n'Vietnamese non-attorney USCIS\ndocument preparer Houston?'"]
        --> AICrawl["AI has indexed:\n/llms.txt entity description\nFAQ JSON-LD from form/bundle pages\nBlog articles with direct answers"]

    AICrawl --> AICitation["AI response cites:\n'Manna One Solution in Houston\nis a non-attorney document preparer.\nN-400 prep: $550 service + $760 USCIS.\nTexas residents only.'\nLink: MannaOS.com"]

    AICitation --> AIClickThrough["User clicks through\n→ MannaOS.com service page"]

    BingUser["Perplexity / Copilot user\nasks similar query"]
        --> BingSitemap["Bing has indexed:\nsitemap.xml (submitted to Bing Webmaster)\nAll structured data"]

    BingSitemap --> BingCitation["Perplexity cites MannaOS.com\nwith accurate business info"]
```

#### L3 — System Flow

```mermaid
flowchart TD
    BuildTime["Next.js Build (SSG)\nGenerates static HTML for all public pages"]
        --> MetaTags["next/head per page\nUnique title + description\nhreflang: vi + en alternates\nOpenGraph image"]

    BuildTime --> JsonLD["JSON-LD Components"]

    JsonLD --> LocalBiz["LocalBusinessSchema\nname: Manna One Solution\naddress: Houston, TX\nphone: 346-852-4454\nserviceArea: Houston, DFW, Austin"]

    JsonLD --> ServiceSchema["ServiceSchema (×4)\nOne per service page\npriceRange, provider, areaServed"]

    JsonLD --> FaqSchema["FaqSchema (×4)\n5–8 Q&As per service page\nAnswer-first content format"]

    JsonLD --> ArticleSchema["ArticleSchema (per blog post)\nauthor, datePublished,\nheadline, description, image"]

    BuildTime --> StaticFiles["Static Files"]
    StaticFiles --> Sitemap["sitemap.xml\n(next-sitemap, all public URLs)"]
    StaticFiles --> Robots["robots.txt\nDisallow: /portal, /admin, /api"]
    StaticFiles --> LlmsTxt["/llms.txt\nBusiness entity description\nServices, credentials, location\nFor AI crawler consumption"]

    Sitemap --> GSC["Google Search Console\n(submit sitemap)"]
    Sitemap --> Bing["Bing Webmaster Tools\n(submit sitemap → feeds Perplexity)"]
```

#### L4 — Implementation Detail

This level provides the concrete templates and rules that developers and content
authors must follow. Nothing below is optional for V1.

##### L4.1 Schema Implementation Matrix

Every public page emits a site-wide `Organization` schema in the root layout plus
per-page schemas listed here. All schemas are bilingual — use `inLanguage: "vi"`
on VI pages and `inLanguage: "en"` on EN pages. Add `knowsLanguage: ["vi", "en"]`
to `Organization` and `LocalBusiness`.

| Page type | Required schemas |
|---|---|
| Site-wide (root layout) | `Organization` |
| Home | `Organization`, `WebSite`, `BreadcrumbList` (trivial) |
| Immigration pillar page | `LegalService`, `Service`, `FAQPage`, `BreadcrumbList`, `Speakable` |
| Texas state cluster page | `LegalService`, `Service`, `FAQPage`, `BreadcrumbList`, `Speakable` |
| Houston city support page | `LocalBusiness` + `LegalService`, `Service`, `FAQPage`, `BreadcrumbList`, `Speakable` |
| Texas non-Houston city page (DFW / Austin / San Antonio) | `LegalService` (no `address`, uses `areaServed`: Texas), `Service`, `FAQPage`, `BreadcrumbList`, `Speakable` |
| Form cluster page (e.g. I-90) | `LegalService`, `Service` (with `Offer` for pricing), `HowTo` (preparation steps), `FAQPage`, `BreadcrumbList`, `Speakable` |
| Bundle page (e.g. Marriage GC Package) | `LegalService`, `Service` (with `Offer` total + itemized `OfferCatalog`), `HowTo`, `FAQPage`, `BreadcrumbList`, `Speakable` |
| Non-attorney disclosure page | `LegalService`, `BreadcrumbList` |
| Notario fraud awareness page | `Article`, `BreadcrumbList`, `Speakable` |
| Referral-out ("Need an Attorney") page | `Article`, `BreadcrumbList`, `ItemList` (of referral partners) |
| About | `Person` (owner) + `AboutPage` |
| Contact | `ContactPage` |
| Blog list | `Blog`, `BreadcrumbList` |
| Blog post | `Article` (or `BlogPosting`), `Person` (author), `FAQPage` (if post has FAQ), `BreadcrumbList`, `Speakable` |
| Privacy / Terms | Minimal — `BreadcrumbList` only |

**Why `LegalService` instead of `ProfessionalService`:** Schema.org `LegalService` is the closest
type for USCIS immigration document preparation. It does NOT imply the provider is a law firm —
use it with an explicit `description` that states "non-attorney document preparer" and pair it
with a `disambiguatingDescription` clarifying scope. The type tag improves GEO relevance
matching for immigration queries without misrepresenting status.

##### L4.2 LocalBusiness + LegalService Schema Template (Houston HQ)

```json
{
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "LegalService"],
  "name": "Manna One Solution",
  "alternateName": "MannaOS",
  "url": "https://mannaos.com/en/",
  "logo": "https://mannaos.com/logo.png",
  "image": "https://mannaos.com/og-houston.jpg",
  "telephone": "+1-346-852-4454",
  "email": "Chris@mannaos.com",
  "priceRange": "$50–$3,200",
  "description": "Vietnamese-language USCIS immigration document preparation for Texas residents. Non-attorney document preparer serving Houston's Vietnamese community and Vietnamese families across Texas. Transparent pricing: Service Fee + USCIS Filing Fee. Texas Notary Public.",
  "disambiguatingDescription": "Manna One Solution is a non-attorney document preparation service. We help clients complete USCIS forms. We do NOT provide legal advice, file Form G-28, or represent clients before USCIS. For legal representation, clients are referred to licensed immigration attorneys or accredited nonprofit legal aid providers.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Bellaire Blvd",
    "addressLocality": "Houston",
    "addressRegion": "TX",
    "postalCode": "77036",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 29.7604,
    "longitude": -95.3698
  },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "09:00", "closes": "18:00" },
    { "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "10:00", "closes": "14:00" }
  ],
  "areaServed": { "@type": "State", "name": "Texas" },
  "knowsLanguage": ["vi", "en"],
  "inLanguage": "en",
  "sameAs": [
    "https://www.facebook.com/mannaonesolution",
    "https://g.page/[TODO]",
    "https://www.bing.com/maps?q=[TODO]"
  ],
  "hasCredential": [
    {
      "@type": "EducationalOccupationalCredential",
      "name": "Texas Notary Public",
      "credentialCategory": "Commission",
      "recognizedBy": { "@type": "GovernmentOrganization", "name": "Texas Secretary of State" }
    }
  ]
}
```

For VI pages, duplicate with `"inLanguage": "vi"` and a Vietnamese `description` + `disambiguatingDescription`.

**Note on other credentials (EFIN, Texas Life 3142469, Texas P&C 3118525, NPN):**
These are held by the owner but are NOT displayed in the V1 LocalBusiness schema because
V1 does not offer tax or insurance services. Listing them in the schema would create
confused service-type signals for Google. They belong on the `/about/` page's `Person`
schema as owner credentials, not on the business entity. Add them back to LocalBusiness
`hasCredential` in Phase 1.5+ when tax and insurance services launch.

##### L4.3 LegalService Schema — Texas Non-Houston City Page Template

Texas non-Houston city pages (DFW, Austin, San Antonio) drop `address` and `geo`
and use `areaServed: Texas` to signal remote delivery to Texas residents statewide:

```json
{
  "@context": "https://schema.org",
  "@type": "LegalService",
  "name": "Manna One Solution — Vietnamese Immigration Document Preparation (Dallas-Fort Worth)",
  "url": "https://mannaos.com/en/services/vietnamese-immigration-document-preparation/texas/dallas-fort-worth/",
  "description": "Remote Vietnamese-language USCIS document preparation for Texas residents in the Dallas-Fort Worth metroplex. Non-attorney document preparer. Service Fee + USCIS Fee pricing. Serving Vietnamese families in Arlington, Garland, Plano, Irving, and the broader DFW area.",
  "disambiguatingDescription": "Non-attorney document preparer. Does not provide legal advice or file Form G-28.",
  "telephone": "+1-346-852-4454",
  "priceRange": "$50–$3,200",
  "areaServed": { "@type": "State", "name": "Texas" },
  "knowsLanguage": ["vi", "en"],
  "inLanguage": "en",
  "provider": {
    "@type": "Organization",
    "name": "Manna One Solution",
    "url": "https://mannaos.com/"
  }
}
```

##### L4.3b Service + Offer Schema — Form Cluster Page Template (e.g. I-90)

Every form cluster page includes a `Service` with one or more `Offer` children
representing the Service Fee + USCIS Fee components. This is what AI engines
extract for pricing citations.

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "I-90 Green Card Renewal Document Preparation",
  "description": "Non-attorney document preparation service for USCIS Form I-90 (Application to Replace Permanent Resident Card). For Vietnamese-speaking Texas residents.",
  "serviceType": "USCIS Form I-90 document preparation",
  "provider": {
    "@type": "LegalService",
    "name": "Manna One Solution",
    "url": "https://mannaos.com/"
  },
  "areaServed": { "@type": "State", "name": "Texas" },
  "offers": [
    {
      "@type": "Offer",
      "name": "I-90 Preparation — Paper Filing",
      "description": "Service Fee $250 + USCIS Filing Fee $465 = $715 total. USCIS filing fee verified as of [LAST_VERIFIED_DATE] at https://www.uscis.gov/forms/filing-fees.",
      "price": "715.00",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "CompoundPriceSpecification",
        "priceComponent": [
          { "@type": "UnitPriceSpecification", "name": "MannaOS Service Fee", "price": "250.00", "priceCurrency": "USD" },
          { "@type": "UnitPriceSpecification", "name": "USCIS Filing Fee", "price": "465.00", "priceCurrency": "USD" }
        ]
      }
    },
    {
      "@type": "Offer",
      "name": "I-90 Preparation — Online Filing",
      "description": "Service Fee $250 + USCIS Filing Fee $415 = $665 total.",
      "price": "665.00",
      "priceCurrency": "USD"
    }
  ]
}
```

##### L4.4 FAQPage Schema — Template for Every Pillar / City / Form / Bundle Page

The visible HTML FAQ and the JSON-LD must match exactly. 5–8 entries per page.
Each answer is 40–80 words, answer-first, with at least one specific fact.

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "inLanguage": "vi",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Gia hạn thẻ xanh (I-90) ở Houston giá bao nhiêu?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Manna One Solution chuẩn bị hồ sơ I-90 gia hạn thẻ xanh với mức phí dịch vụ $250 cộng phí nộp USCIS $465 cho nộp giấy hoặc $415 cho nộp online — tổng $715 (giấy) hoặc $665 (online). Phí USCIS trả trực tiếp cho USCIS. Chúng tôi là dịch vụ chuẩn bị hồ sơ, không phải luật sư. Phí tư vấn ban đầu miễn phí cho cư dân Texas."
      }
    },
    {
      "@type": "Question",
      "name": "Manna One Solution có phải là luật sư không?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Không. Manna One Solution là dịch vụ chuẩn bị hồ sơ USCIS bằng tiếng Việt cho cư dân Texas, không phải văn phòng luật sư. Chúng tôi không tư vấn pháp lý, không nộp G-28, và không đại diện khách hàng tại USCIS. Với các trường hợp phức tạp (RFE, bị từ chối, hoặc vi phạm di trú), chúng tôi giới thiệu khách hàng đến luật sư di trú có giấy phép hoặc tổ chức pháp lý phi lợi nhuận."
      }
    }
  ]
}
```

##### L4.5 Article Schema — Template for Every Blog Post

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[exact H1]",
  "description": "[meta_description for this locale]",
  "inLanguage": "vi",
  "image": { "@type": "ImageObject", "url": "...", "width": 1200, "height": 630 },
  "author": {
    "@type": "Person",
    "name": "[from profiles.full_name]",
    "jobTitle": "EFIN Certified Tax Preparer, Licensed Insurance Agent",
    "url": "https://mannaos.com/vi/gioi-thieu/"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Manna One Solution",
    "logo": { "@type": "ImageObject", "url": "https://mannaos.com/logo.png" }
  },
  "datePublished": "[ISO-8601]",
  "dateModified": "[ISO-8601]",
  "mainEntityOfPage": "[canonical URL]"
}
```

##### L4.6 robots.txt (Full File)

```
# MannaOS.com — allow public content, block private, opt into AI crawlers

User-agent: *
Disallow: /portal
Disallow: /admin
Disallow: /api
Allow: /

# AI answer-engine crawlers (opt-in for GEO)
User-agent: GPTBot
Allow: /
Disallow: /portal
Disallow: /admin
Disallow: /api

User-agent: ClaudeBot
Allow: /
Disallow: /portal
Disallow: /admin
Disallow: /api

User-agent: PerplexityBot
Allow: /
Disallow: /portal
Disallow: /admin
Disallow: /api

User-agent: Google-Extended
Allow: /
Disallow: /portal
Disallow: /admin
Disallow: /api

User-agent: CCBot
Allow: /
Disallow: /portal
Disallow: /admin
Disallow: /api

Sitemap: https://mannaos.com/sitemap.xml
```

##### L4.7 `/llms.txt` (Full File Template — V1 Immigration Scope)

```
# Manna One Solution

> Vietnamese-language USCIS immigration document preparation for Texas residents.
> Headquartered in Houston, TX. Non-attorney document preparer — not a law firm.
> Texas Notary Public (pending Phase 0 commission). Transparent pricing (service fee
> + USCIS filing fee). Serving Vietnamese-American families across Texas with
> document preparation for green card, citizenship, family petition, travel document,
> and fee waiver forms.

## Important Scope Disclosure
Manna One Solution is a **non-attorney document preparer**. We help clients complete,
organize, and prepare USCIS forms. We do NOT provide legal advice, do NOT file Form
G-28, do NOT represent clients before USCIS, and do NOT handle Requests for Evidence,
Notices of Intent to Deny, denials, inadmissibility determinations, or removal
proceedings. For any of those situations we refer clients to a licensed immigration
attorney or an accredited nonprofit legal aid provider.

## Contact
- **Name**: Manna One Solution
- **Headquarters**: Bellaire Blvd, Houston, TX 77036 (street number TBD)
- **Phone**: +1-346-852-4454
- **Email**: Chris@mannaos.com
- **Hours**: Mon–Fri 9:00–18:00 CT, Sat 10:00–14:00 CT
- **Languages**: Vietnamese (native), English
- **Service Area**: Texas residents only
- **Delivery**: In-person (Houston HQ) + remote (video, phone, secure portal) for Texas residents

## Credentials
- Texas Notary Public (pending — Phase 0 commission with Texas Secretary of State)
- Non-attorney document preparer (Texas has no state-level immigration consultant registration requirement)
- IRS EFIN 857993, Texas Life Insurance License 3142469, Texas P&C Insurance License 3118525, NPN 21024561, PTIN-registered (held for Phase 1.5+ services — not part of V1 immigration scope)

## V1 Services and Pricing (Texas residents only)

All prices below are **Service Fee + USCIS Filing Fee = Total**. USCIS filing fees
are set by USCIS and paid directly to USCIS. Service fees are what MannaOS charges
for document preparation. Fees verified against https://www.uscis.gov/forms/filing-fees
as of [LAST_VERIFIED_DATE].

### Single-Form Services
- **I-90 Green Card Renewal / Replacement** — paper: $250 + $465 = **$715 total** · online: $250 + $415 = **$665 total**
  - https://mannaos.com/en/forms/i-90-green-card-renewal/
  - https://mannaos.com/vi/mau-don/i-90-gia-han-the-xanh/
- **I-130 Petition for Alien Relative (standalone)** — $425 + $675 = **$1,100 total**
  - https://mannaos.com/en/forms/i-130-family-petition/
  - https://mannaos.com/vi/mau-don/i-130-bao-lanh-gia-dinh/
- **I-485 Adjustment of Status (standalone)** — $650 + $1,440 = **$2,090 total**
  - https://mannaos.com/en/forms/i-485-adjustment-of-status/
  - https://mannaos.com/vi/mau-don/i-485-dieu-chinh-tinh-trang/
- **I-751 Remove Conditions on Green Card** — $550 + $750 = **$1,300 total**
  - https://mannaos.com/en/forms/i-751-remove-conditions/
  - https://mannaos.com/vi/mau-don/i-751-bo-dieu-kien-the-xanh/
- **I-765 Employment Authorization (standalone)** — paper: $250 + $520 = **$770 total** · online: $250 + $470 = **$720 total**
  - https://mannaos.com/en/forms/i-765-work-permit/
  - https://mannaos.com/vi/mau-don/i-765-giay-phep-lam-viec/
- **I-131 Advance Parole / Travel Document** — $250 + $630 = **$880 total**
  - https://mannaos.com/en/forms/i-131-travel-document/
  - https://mannaos.com/vi/mau-don/i-131-giay-di-lai/
- **N-400 Application for Naturalization** — paper: $550 + $760 = **$1,310 total** · online: $550 + $710 = **$1,260 total**
  - https://mannaos.com/en/forms/n-400-citizenship/
  - https://mannaos.com/vi/mau-don/n-400-xin-quoc-tich/
- **N-600 Certificate of Citizenship** — $400 + $1,385 = **$1,785 total**
  - https://mannaos.com/en/forms/n-600-certificate-of-citizenship/
  - https://mannaos.com/vi/mau-don/n-600-giay-chung-nhan-quoc-tich/
- **I-864 Affidavit of Support (standalone)** — $200 + $0 = **$200 total**
- **I-912 Request for Fee Waiver** — $150 + $0 = **$150 total**
- **AR-11 Change of Address** — $50 + $0 = **$50 total**
- **FOIA request assistance** — $100 + $0 = **$100 total**
- **Certified Vietnamese ↔ English translation** — $25 per page

### Bundles (common multi-form packages)
- **Marriage Green Card Package** ⭐ — I-130 + I-485 + I-765 + I-131 + I-864
  - $1,085 service + $2,115 USCIS = **$3,200 total**
  - https://mannaos.com/en/bundles/marriage-green-card-package/
  - https://mannaos.com/vi/goi-dich-vu/ho-so-ket-hon-xin-the-xanh/
- **Family Petition Consular** — I-130 only (spouse/parent/child abroad)
  - $425 service + $675 USCIS = **$1,100 total**
- **Citizenship Fast-Track** — N-400 + interview prep
  - paper: $590 service + $760 USCIS = **$1,350 total** · online: $590 + $710 = **$1,300 total**
- **Green Card Renewal + Travel Doc** — I-90 + I-131
  - $305 service + $1,095 USCIS = **$1,400 total**
- **Remove Conditions + EAD** — I-751 + I-765
  - $580 service + $1,220 USCIS = **$1,800 total**

### What We Do NOT Do
- Legal advice or case-strategy recommendations
- Form G-28 filings or representation before USCIS
- USCIS interview representation
- RFE / NOID / denial responses
- Inadmissibility determinations or waivers
- Removal (deportation) proceedings or immigration court work
- Asylum (referred out to qualified nonprofits)
- Any service for clients residing outside Texas
- Tax preparation, insurance, or other financial services (planned Phase 1.5+ — not V1)

## Service Area
- **In-person**: Houston HQ (Bellaire Blvd, Houston, TX 77036)
- **Remote (video + secure portal)**: Texas residents statewide — Dallas-Fort Worth, Austin, San Antonio, and all other Texas cities
- **NOT available outside Texas.** Non-Texas residents are referred to CLINIC network affiliates, KIND (for unaccompanied minors), Catholic Charities, and AILA pro-bono referrals in their state.

## Key FAQs
- **Are you attorneys?**
  No. Manna One Solution is a non-attorney document preparer. We help Vietnamese-speaking Texas residents complete USCIS forms. We do not provide legal advice, file G-28, or represent clients before USCIS. If you need legal advice or representation, we will refer you to a licensed immigration attorney or an accredited nonprofit.
- **Why is your pricing cheaper than an attorney?**
  Because we are not attorneys and we do not provide legal services. We prepare documents — similar to how tax preparers help with tax forms without being CPAs. AILA attorneys typically charge $3,500–$6,000 for a marriage green card package; our service fee for the same bundle is $1,085, plus the same USCIS filing fees ($2,115) that go directly to the government.
- **Can I use Manna One Solution if I live in California or another state?**
  No. V1 is Texas residents only. Several states (CA, NV, FL, IL, WA, and others) require immigration consultants to register and post a bond in that state. We are not registered outside Texas. For non-Texas residents we recommend CLINIC, KIND, Catholic Charities, or AILA pro-bono referrals.
- **What languages do you speak?**
  Vietnamese (native) and English.
- **Is the initial consultation free?**
  Yes. Free initial consultation for Texas residents — in-person at our Houston HQ or remote via video.
- **How do I know you're not a notario scam?**
  Every page on our website is transparent about what we do and don't do. We publish all pricing (service fee + exact USCIS fee). We tell you upfront we are not attorneys. We refer complex cases out instead of taking your money. See https://mannaos.com/en/notario-fraud-awareness/ for how to verify any immigration service provider — including us.

## Planned Phase 1.5+ Services (NOT available in V1)
- Vietnamese tax preparation (EFIN 857993 — Phase 1.5, decision gate Sep 30 2026)
- Vietnamese life insurance, Texas residents only (Texas License 3142469 — Phase 2)
- Vietnamese property & casualty insurance, Texas residents only (Texas License 3118525 — Phase 2)
- AI automation consulting for small business (Phase 2)
```

##### L4.8 GEO Content Rules (Apply to Every V1 Marketing Page)

```
EVERY PILLAR / TEXAS / CITY / FORM / BUNDLE PAGE MUST INCLUDE:

☐ Primary keyword in H1 (locale-specific, immigration-scoped)
☐ Answer the main question in the first 2 sentences under H1 (no preamble)
☐ Non-attorney disclosure within the first 200 words ("non-attorney document preparer,
  not a law firm, not legal advice")
☐ Published pricing as plain text — "Service Fee $X + USCIS Fee $Y = $Z total"
  (not behind a form)
☐ USCIS fee "verified as of [date]" with outbound link to uscis.gov/forms/filing-fees
☐ Texas Notary Public credential in footer (once commission granted)
☐ NAP block in footer (identical wording every page in the same locale)
☐ ≥1 outbound link to a .gov source — uscis.gov preferred for form/bundle pages
☐ ≥3 internal links to related pillar / Texas / city / form / bundle / blog pages
☐ Visible FAQ section (H2: "Frequently Asked Questions" / "Câu hỏi thường gặp")
☐ 5–8 FAQ Q&A pairs, each answer 40–80 words, with at least one specific fact per answer
☐ FAQPage JSON-LD matching the visible FAQ exactly
☐ "Texas residents only" service-scope statement (especially on form and bundle pages)
☐ Referral-out link for complex cases: "Need legal advice? Here are Houston-area pro-bono
  options: [link to /need-an-immigration-attorney/]"
☐ Scope block listing what MannaOS does NOT do (no G-28, no interview rep, no RFE, etc.)

DISCLAIMER TEXT (mandatory on every pillar/form/bundle page):
  "Manna One Solution is a non-attorney document preparer. We help Vietnamese-speaking
   Texas residents complete USCIS forms. We are not a law firm and do not provide legal
   advice. For complex cases — Requests for Evidence, denials, inadmissibility, or
   removal proceedings — we refer clients to licensed immigration attorneys."

KEY TERM DEFINITIONS:
  Every pillar / form / bundle page defines key terms in the opening 150 words where
  applicable: "USCIS", "I-130", "I-485", "I-765", "I-131", "I-751", "N-400", "AOS",
  "priority date", "receipt number", "NOA", "adjustment of status", "consular processing",
  "biometrics", "combo card", "advance parole", "conditional green card".
  These definitions become AI extraction bait.

FACT DENSITY RULE:
  Per 200 words of content, include at least 1 specific number, date, or named entity.
  Vague sentences ("we offer competitive pricing") are never cited. Specific sentences
  ("I-90 paper filing is $250 service fee + $465 USCIS fee = $715 total as of April 2026")
  are cited.
```

##### L4.9 Anti-Thin-Content Rules for Texas City + Form + Bundle Pages

Per `local-seo.md`: *"Each page must have genuinely unique local content. Copy-paste
pages — Google detects thin location pages and ignores them."* V1 has only 4 Texas
city pages + 11 form pages + 5 bundle pages per locale — each one must earn its place.

```
TEXAS STATE CLUSTER PAGE MUST INCLUDE:
  ☐ Texas immigration context: Houston as largest Vietnamese community in the South,
    Dallas-Fort Worth Vietnamese community in Arlington + Garland, growing Austin
    Vietnamese community, San Antonio's smaller but established VN community
  ☐ Texas regulatory context: Texas has no state-level immigration consultant
    registration requirement (unlike CA/NV/FL/IL/WA/MD/MN/NC/NY)
  ☐ Texas Notary Public credential explained — why it matters for USCIS signatures
  ☐ 3+ Texas-specific FAQ entries (e.g., "Do I need to travel to Houston to use
    Manna One Solution from Dallas?")
  ☐ Outbound link to uscis.gov and Texas Secretary of State notary page
  ☐ Internal links up to the immigration pillar and down to all 4 Texas city pages

TEXAS CITY PAGES (Houston, DFW, Austin, San Antonio) MUST INCLUDE:
  ☐ Unique opening paragraph naming the city and Vietnamese neighborhood
    (Houston: Bellaire / Alief / Hong Kong City Mall;
     DFW: Arlington / Garland Vietnamese community;
     Austin: North Austin / Braker Lane Vietnamese corridor;
     San Antonio: Southeast San Antonio Vietnamese community)
  ☐ Houston page only: full street address, embedded Google Map, in-person Calendly
    event type, driving directions from major landmarks
  ☐ Non-Houston Texas cities: explicit remote delivery messaging in first 100 words
    ("We serve [city] Vietnamese families remotely via secure video consultation")
  ☐ 3+ city-specific FAQ entries (e.g., "Can I use Manna One Solution from Austin
    without traveling to Houston?")
  ☐ Unique H1 and meta description per city
  ☐ Links up to Texas state cluster + down to at least 2 form cluster pages

FORM CLUSTER PAGES (11 forms × 2 locales) MUST INCLUDE:
  ☐ Form-specific H1 (e.g. "I-90 Green Card Renewal — Vietnamese Document Preparation
    in Texas")
  ☐ Pricing table (Service + USCIS = Total) with "verified as of [date]"
  ☐ "Who qualifies for this form" plain-language eligibility summary
  ☐ "Common mistakes" section unique to this form
  ☐ "What you'll need" document checklist unique to this form
  ☐ Non-attorney disclosure above the fold
  ☐ 5+ form-specific FAQ entries
  ☐ HowTo JSON-LD for the preparation process (5–10 steps)
  ☐ Outbound link to that form's uscis.gov page
  ☐ Link to at least one bundle page (if the form is a bundle component)

BUNDLE PAGES (5 bundles × 2 locales) MUST INCLUDE:
  ☐ Bundle-specific H1 (e.g. "Marriage Green Card Package — Vietnamese Document
    Preparation in Texas")
  ☐ Itemized pricing: each component form's Service Fee + USCIS Fee, plus total
  ☐ Attorney comparison block citing AILA or comparable survey
  ☐ Unique timeline / what-to-expect section
  ☐ Complete "required documents" list for the bundle
  ☐ Non-attorney disclosure above the fold
  ☐ Scope block listing what's excluded from the bundle
  ☐ 5+ bundle-specific FAQ entries
  ☐ Referral-out note for complex cases
  ☐ Links to each component form's cluster page
```

##### L4.10 Monthly AI Citation Audit Process

```
CADENCE: First Monday of every month
OWNER: Admin (the owner)
TIME: ~1 hour
STORAGE: Google Sheets — one sheet per month, kept in `docs/seo-audits/`

COLUMNS:
  Query (VI or EN) | Google AIO cited? | ChatGPT cited? |
  Perplexity cited? | Copilot cited? | Competitor cited? | Notes

PROCESS:
  1. Open the canonical top-20 query list (maintained in keyword research spreadsheet)
  2. For each query, search:
     a. Google → look for AI Overview panel → check if MannaOS.com is in cited sources
     b. ChatGPT (browsing mode) → ask the query → check cited links
     c. Perplexity → ask the query → check sources list
     d. Microsoft Copilot → ask the query → check citations
  3. Record Y/N per engine
  4. If a competitor is cited and we are not, flag for content-gap follow-up
  5. Track month-over-month trend of "any engine cited" %
  6. At 6-month mark, audit becomes the primary success signal for GEO investment
```

| Requirement | Target |
|-------------|--------|
| **Performance** | All public pages load in <2.5s LCP on 4G mobile. SSG for all public marketing pages. Lighthouse Performance 90+ (mobile). |
| **Core Web Vitals (mobile, 75th percentile)** | **LCP < 2.5s** · **CLS < 0.1** · **INP < 200ms**. Monitored via PageSpeed Insights and GSC Core Web Vitals report. Any regression blocks deploy. |
| **Security** | Supabase Auth with email verification (via Resend). Row Level Security on all tables. No client data exposed to public. robots.txt blocks /portal, /admin, /api. Strict CSP + HSTS headers. |
| **Scalability** | Vercel auto-scales CDN for public traffic. Supabase free tier supports initial client load (10–50 clients). Upgrade path to Supabase Pro when client count exceeds 500. Sitemap stays under 50k URLs (far below our ~100-page V1 footprint). |
| **Accessibility** | WCAG 2.1 AA compliance. Semantic HTML, alt text on images (per locale), keyboard navigation, contrast ratios ≥4.5:1, skip-to-content link. Lighthouse Accessibility 90+. |
| **Mobile responsiveness** | Mobile-first design. All pages usable on iOS Safari + Android Chrome. Touch-friendly tap targets (min 44×44px). |
| **Localization** | Full bilingual subdirectory routing (Vietnamese + English) with separate URLs per locale. Native Vietnamese slugs (not transliteration). All Vietnamese diacritics render correctly (Inter font). Reciprocal hreflang + canonical on every page. All SEO elements (title, meta, alt, schema, URL, CTAs) authored per locale, never machine-translated. |
| **Reliability** | USCIS status freshness depends on internal staff app sync (95%+ target). Contact form: dual delivery (Resend email + Supabase backup) — no single point of failure. Vercel: 99.99% uptime SLA. Review request SMS delivery not critical (email is fallback). |
| **Data Retention** | Client documents retained for 7 years in Supabase Storage. Contact submissions retained indefinitely (with admin-only access). Auto-delete policy implementation deferred to V2. |
| **Privacy / Compliance** | Privacy Policy page per locale. GA4 consent banner for EU/CA visitors. TCPA-compliant SMS opt-in (recorded on signup). GDPR data export + delete process documented in Privacy Policy. |
| **SEO** | Lighthouse SEO score 95+. All pages indexed within 14 days on Google AND Bing (both locales). Structured data validates via Google Rich Results Test and Schema.org validator. Zero hreflang errors in GSC International Targeting report. |
| **GEO** | `/llms.txt` present and accurate. Top 20 target queries audited monthly across 4 AI engines. ≥3 citations by day 90 target. FAQPage schema valid and visible-FAQ-matching on all pillar/cluster/city pages. |
| **NAP consistency** | 100% NAP match across website, GBP, Apple Business Connect, Bing Places, Yelp, BBB, Facebook, IRS PTIN directory, Texas DOI licensee lookup. Audited quarterly. |

---

## 6. Technical Considerations

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript | SSG for public pages, SSR for portal/admin, React ecosystem |
| Styling | Tailwind CSS | Utility-first, fast prototyping, responsive by default |
| Database | Supabase (PostgreSQL) | Auth + DB + Storage + RLS in one service, generous free tier |
| Auth | Supabase Auth | Email/password, email verification, session management |
| File Storage | Supabase Storage | Client documents, blog images, site content images |
| Rich Text | Tiptap | Headless editor, supports image insertion, outputs HTML |
| Email | Resend | Auth verification emails + contact form delivery. 100 emails/day free tier. First-party Supabase integration. |
| Contact Form | Next.js API route + Resend + Supabase backup | API route sends email via Resend, also stores in `contact_submissions` table as backup |
| Booking | Calendly (embed) | Zero dev effort, proven UX, free tier |
| Hosting | Vercel | Free tier, auto-deploy from GitHub, CDN |
| Sitemap | next-sitemap | Auto-generates sitemap.xml and robots.txt at build time |
| Fonts | Inter via next/font | Vietnamese diacritic support, no layout shift |
| Analytics | Google Analytics 4 (gtag.js via next/script) | Free, integrates with GSC, tracks custom events (form submissions, Calendly clicks, language toggle) |

### Key API Integrations

| Service | Purpose | Failure Impact |
|---------|---------|----------------|
| Resend | Contact form email delivery + Supabase Auth verification emails | Email delivery fails → lead still saved in Supabase `contact_submissions` (no lead lost). Auth emails delayed. |
| Calendly | Appointment booking | Booking unavailable (mitigate: show phone number) |
| Supabase | Auth, database, storage | Full application down (mitigate: Supabase 99.9% SLA) |
| Google Search Console | Sitemap submission, indexing | Delayed indexing (mitigate: manual URL inspection) |
| Bing Webmaster Tools | Sitemap submission for AI search | Reduced AI search visibility |

### Database Schema Summary

Six core tables + one audit log:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profiles (client + admin) | id (→ auth.users), role, full_name, phone, preferred_language |
| `services` | All client services (extensible) | client_id, service_type, status, metadata (jsonb) |
| `service_documents` | Files linked to services | service_id, file_name, file_url, uploaded_by |
| `blog_posts` | Bilingual blog content | slug, title_vi/en, content_vi/en, cover_image_url, category, published |
| `site_content` | Admin-editable website sections | key, value (key-value store) |
| `contact_submissions` | Contact form backup (never lose a lead) | name, email, phone, service_interest, message, created_at |
| `uscis_sync_log` | USCIS polling audit trail (written by staff app, read by portal) | service_id, synced_at, status_text, raw_response |

**Row Level Security:**
- Clients: read/write own rows across `services`, `service_documents`, `profiles`
- Admins: full access to all tables
- Public: no access (public content served via SSG)

---

## 7. UI/UX Direction

_Dark theme source of truth: `2026-04-06-manna-one-solution-website-design.md`. The 4-card services layout is preserved from that doc. This section supersedes any light-palette references in earlier design iterations._

### Design Language

**Palette** (dark navy — Stripe/Linear aesthetic):
```
Primary background:   #0A1628  (deep navy — full site background)
Secondary background: #1E3A5F  (mid navy — cards, alternate sections)
Accent gradient:      #4F8EF7 → #7B2FBE  (blue-to-purple — hero CTA buttons, highlights)
Accent solid:         #4F8EF7  (blue — links, active states, icon fills)
Gold accent:          #F5A623  (trust badges, credential number highlights)
Text primary:         #FFFFFF
Text secondary:       #E2E8F0  (muted white — body text, captions)
Border (glass):       rgba(255, 255, 255, 0.08)  (glassmorphism card borders)
Border hover:         rgba(255, 255, 255, 0.18)  (card hover state)
```

**Hero** (Home + each service overview page):
```
Hero background:      linear-gradient(135deg, #060E1A 0%, #0A1628 50%, #1E3A5F 100%)
Hero text:            #FFFFFF
Hero CTA primary:     gradient button (#4F8EF7 → #7B2FBE) with white text + glow on hover
Hero CTA secondary:   transparent, 1px white border, white text
```
Full-width deep dark gradient sets a tech-forward, trustworthy tone. Transparent logo PNG works on dark backgrounds without modification.

**Typography:**
- **Font:** Inter — Google Fonts, full Vietnamese diacritic support
- **Headings:** Bold, white `#FFFFFF` — large, clean
- **Body:** Regular weight, `#E2E8F0` — readable on dark background
- **Credential badges:** Semi-bold, gold `#F5A623` — EFIN, license numbers, trust signals

**Brand personality:** Trustworthy · Professional · Bilingual · Modern · Tech-forward

### Visual Style

- **Dark navy full-site** — `#0A1628` primary background across all pages (Stripe/Linear aesthetic)
- **Glassmorphism cards** — `rgba(30, 58, 95, 0.6)` background with `backdrop-filter: blur(12px)` and 1px rgba-white border; used for service cards, trust badges block, "How It Works" steps
- **Gradient CTA buttons** — blue-to-purple `#4F8EF7 → #7B2FBE`; `scale(1.02)` + box-shadow glow on hover; 200ms transition
- **Gold for trust signals** — credential numbers (EFIN, Life license, P&C license, Notary) rendered in gold `#F5A623` — stands out against dark background
- **Transparent logo** — `Logo-Picsart-BackgroundRemover.PNG` works on dark navy backgrounds without modification
- **Sticky navbar** — dark `#0A1628` background; subtle bottom border; gradient logo glow on scroll
- **Clean whitespace** — generous section padding; not cluttered despite dark background

### 4 Service Cards — Component Spec (Home Landing + `/services` overview)

Renders as the third section on the Home page immediately below the dark hero. This is the "One Stop, All Solutions" moment — the visitor sees all 4 services at once in the first scroll past the hero.

**Grid layout:**
- Mobile: `grid-cols-2` (2 × 2 grid)
- Desktop: `grid-cols-4` (single row)

**Per-card anatomy (glassmorphism):**
```
Background:      rgba(30, 58, 95, 0.6)                   (mid navy semi-transparent)
Backdrop-filter: blur(12px)
Border:          1px solid rgba(255, 255, 255, 0.08)
Border-radius:   16px
Box-shadow:      0 4px 24px rgba(79, 142, 247, 0.12)     (blue-tinted glow)
Hover:           box-shadow → 0 8px 40px rgba(79,142,247,0.22)
                 border → rgba(255,255,255,0.18)
                 translateY(-2px)
Padding:         28px (desktop) / 16px (mobile)

Content (in order):
  1. Icon          SVG, 48×48 — gradient fill (#4F8EF7 → #7B2FBE), unique per service
  2. Service name  Bold, 18px, white #FFFFFF — bilingual
  3. Description   Regular, 14px, #E2E8F0 — 1-line bilingual tagline
  4. "Learn more →"  Semi-bold, blue #4F8EF7; underline + glow on hover
```

**Four cards (in order):**
| Card | Icon theme | EN name | VI name | Links to |
|---|---|---|---|---|
| 1 | Tax / document | Tax & Business | Thuế & Kinh Doanh | `/en/services/tax/` |
| 2 | Shield / chart | Insurance & Finance | Bảo Hiểm & Tài Chính | `/en/services/insurance/` |
| 3 | Passport / globe | Immigration | Di Trú | `/en/services/immigration/` |
| 4 | Robot / circuit | AI / Automation | Tự Động Hóa AI | `/en/services/ai/` |

### Key Interaction Patterns

- **Mobile-first** responsive design — 70% of traffic expected on mobile
- **Sticky navbar** — dark `#0A1628` background; subtle bottom border; language toggle pill always visible
- **Language toggle pill** — shows the OTHER locale (VI when in English, EN when in Vietnamese)
- **Floating contact buttons** — fixed bottom-right: phone · Facebook Messenger · Zalo; gradient backgrounds matching CTAs
- **Glassmorphism cards** — hover glow + lift (`translateY(-2px)`); consistent across service cards, trust badges, How It Works steps
- **Gradient buttons** — `scale(1.02)` + glow on hover; 200ms transition; primary action throughout the site
- **Loading states** — skeleton screens for portal/admin data loading (dark variant)
- **Empty states** — friendly messages with gradient CTA buttons on dark background
- **Form validation** — inline errors, blue `#4F8EF7` focus rings on inputs

### Logo Usage

| Context | File |
|---------|------|
| Navbar (dark background) | `Logo-Picsart-BackgroundRemover.PNG` (transparent — white elements visible on dark navy) |
| Footer | `Logo-Picsart-BackgroundRemover.PNG` (transparent) |
| Hero section | `Logo-Picsart-BackgroundRemover.PNG` (transparent) |
| OG / social share image | `Logo.PNG` (white background) |
| Email templates | `Logo.PNG` (white background) |

---

## 8. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Unauthorized Practice of Law (UPL) claim** — a client, competitor, or the Texas State Bar interprets MannaOS content or conduct as giving legal advice | **Critical** — cease-and-desist, civil penalty, reputational destruction | Medium (new practice, complex topic) | Hard rules: (1) Non-attorney disclosure above the fold on every pillar/form/bundle page per §2a.3c. (2) Content never tells a reader *whether* to file a form — only *how* the form works mechanically. (3) No G-28 filing, no interview representation, no RFE/NOID/denial/removal handling — these are hard-coded exclusions on the scope-of-service page and in Terms of Service. (4) Every page links to the referral-out page for questions outside document preparation. (5) All content reviewed for UPL risk by the owner before publish; ambiguous language rewritten to describe the form, not the client's legal strategy. (6) Privacy Policy + ToS explicitly frame MannaOS as a non-attorney document preparer. |
| **Notario fraud association** — Vietnamese and Latino communities have deep, justified distrust of non-attorney immigration prep. MannaOS may be lumped in with notario shops by default. | **High** — community trust collapse, zero word-of-mouth | High (at launch, decays with reputation) | (1) Notario fraud awareness page in both locales — actively educates the reader on notario fraud and positions MannaOS as the opposite model. (2) Transparent pricing (Service + USCIS = Total) on every form page — opacity is the notario tell. (3) Texas Notary Public credential displayed prominently. (4) Explicit "We are NOT a notario, we are NOT an attorney — here is exactly what we do and don't do" block on every form page. (5) Referral-out page with real pro-bono partners (not a placeholder). (6) Review collection from first 5 cases is disproportionately important; prioritize review requests in Phase 4. |
| **New-practitioner trust gap** — owner has 1–2 completed cases and no professional accreditation; E-E-A-T signals are thin | **High** — Google may deprioritize until authority accrues | High | Compensate for low practitioner history with: (1) Accurate, specific content (fact density > opinion density — reduces hallucination risk penalty from Google's helpful content system). (2) Transparent pricing (trust signal). (3) Texas Notary Public credential (verifiable third-party trust anchor). (4) Comprehensive referral-out page (ethical signal). (5) Detailed author/about page with real bio, real photo, real address, real phone. (6) Aggressive review collection from the first 10 cases — reviews are the fastest off-page authority signal for a new business. (7) Acknowledge newness on the about page rather than hide it ("Launched in 2026 to serve Houston's Vietnamese community with transparent, honest document preparation"). |
| **USCIS fee schedule change** — USCIS last updated fees April 1 2024; next change could invalidate every price on the site overnight | High — stale fees = immediate trust collapse on first client interaction | Low (short-term), Medium (1–2 year horizon) | (1) All fees stored in `site_content` table keyed by form number — admin can update without a code deploy. (2) Every pricing table displays "Verified as of [date]" with outbound link to uscis.gov/forms/filing-fees. (3) Monthly fee-verification task added to admin runbook (Open Question #8). (4) USCIS publishes proposed rules in the Federal Register months before taking effect — owner subscribes to USCIS email alerts to catch changes early. |
| **Texas Notary commission delayed** — Notary application to Texas Secretary of State takes longer than expected, missing launch | Medium — removes a core differentiating credential from launch copy | Medium | (1) File the Notary application in Phase 0, not Phase 4 (see §10 Open Question #2). (2) If commission has not been granted by end of Phase 3, launch copy is hedged: "Notary services available [month] 2026" with a specific date rather than removing the claim entirely. (3) Texas Notary commissions are typically granted in 2–4 weeks — minimal schedule risk if started early. |
| **Accidental multi-state marketing** — copy, schema `areaServed`, ads, or content crawls include non-Texas states and trigger out-of-state consultant registration requirements (CA, NV, FL, IL, WA, MD, MN, NC, NY) | High — regulatory violation in the unregistered state | Low–Medium | (1) Topical Map explicitly Texas-only in V1 (see §2a.2). (2) All LocalBusiness + LegalService schema uses `areaServed: Texas`. (3) Contact form contains a Texas residency gate; non-TX submissions get an automated referral reply. (4) Pre-publish checklist: CI grep blocks any non-TX US state name except in: referral-out page, notario-fraud-awareness page, and the Phase 1.5+ deferred-services disclosure. (5) Manual review by owner on every page at publish. |
| **Client expectation mismatch** — client hires MannaOS expecting attorney-level advice (case strategy, eligibility determination, RFE response) | Medium — refund requests, negative reviews, UPL exposure | High (especially at first) | (1) Intake form includes explicit scope-of-service acknowledgment checkbox: "I understand MannaOS is a non-attorney document preparer and will not give legal advice." (2) First consultation script starts with a scope-setting statement. (3) Terms of Service attached to every engagement. (4) Clients with complex cases (RFE, prior denial, inadmissibility, removal proceedings) are referred out before payment. (5) Refund policy documented in ToS. |
| **USCIS data stale** — staff app Playwright sync fails (scraper break, CAPTCHA, VPS down) | Medium — clients see outdated status on portal | Medium | MannaOS.com is read-only — no direct risk to website. Staff app handles CAPTCHA detection, HTML snapshots, admin alerts. If sync is down, portal shows last-known status with "last synced" timestamp so clients know data age. |
| **Supabase free tier limits exceeded** — as client count grows | Medium — service degradation | Low (at V1 scale) | Monitor usage via Supabase dashboard. Clear upgrade path to Pro tier ($25/mo) at 500+ clients. |
| **Slow organic traction** — new domain, no backlinks, 3–6 month indexing ramp, narrow immigration-only footprint | Medium — leads trickle at first | High | Phase 0 keyword research targets low-competition long-tail VI queries first (e.g., form-specific "I-90 tiếng Việt Houston"). Publish ≥2 form cluster or bundle posts per month per locale. Build GBP + Apple BC + Bing Places + Tier 1 + Vietnamese community citations in Phase 4. Prioritize Houston Local Pack (fastest 4–8 week win) while Texas city pages mature. Traffic targets: 30 sessions by day 60, 120 by day 120, 300 by day 180. |
| **Vietnamese content quality** — machine-translated or awkward VI copy tanks community trust + SEO | **High** — primary persona is Vietnamese | Medium | Native Vietnamese reviewer required for every `/vi/` page before publish (Open Question #7). No auto-translation. Keyword research done in Vietnamese (Phase 0), not translated from English keywords. Immigration topics are emotionally loaded — translation errors are more costly than on a tax or insurance site. |
| **Thin form/bundle pages** — Google devalues copy-paste pages that look templated across 11 forms | High — devalues the entire form cluster tier | Medium | Each form page must have: unique step-by-step preparation narrative, unique FAQ (≥5), unique "common mistakes" section, unique eligibility-red-flag list, unique pricing breakdown. Bundle pages add unique timeline + unique "what to expect" section. Code review checklist blocks publish otherwise. |
| **AI crawler opt-out policy changes** — Google-Extended or others flip default | Medium — reduces GEO upside | Low | robots.txt reviewed quarterly. If policy shifts, move to explicit per-bot decisions. |
| **NAP drift** across directories over time | Medium — hurts Local Pack + trust | Medium | Quarterly NAP audit (§5 NFRs). Canonical NAP documented in `/llms.txt`. Any future change (new address, new phone) triggers a cross-directory update checklist. |
| **Resend email delivery fails** — contact form email not delivered | Low — lead still saved in Supabase | Low | Dual delivery: Resend sends email + Supabase `contact_submissions` stores every submission. |
| **Resend quota exhausted** — auth + contact + review requests exceed 100/day free tier | Low — delayed auth / reviews | Medium (as client count grows) | Monitor Resend dashboard weekly. Upgrade to paid tier ($20/mo) before hitting 80/day sustained. |
| **Client doesn't verify email** — account stuck | Low — single user affected | Medium | Show clear "check your email" screen. Add "Resend verification" button. Admin can manually verify if needed. |
| **Blog content thin despite guardrails** — authors skip FAQ or outbound links | Medium — SEO investment wasted | Medium | Admin publish-blockers (§3): cannot save `published=true` unless meta desc + OG image + author + ≥3 internal links + ≥1 outbound .gov link + FAQ + min word count by tier are all present. |
| **GEO citation stagnation** — AI engines cite competitors instead | Medium — lost top-of-funnel brand | Medium | Monthly AI citation audit (§4.8 L4.10). Citation gaps flagged in audit become content briefs for next month's form/bundle updates. |

---

## 9. Timeline & Milestones

| Phase | Scope | Duration | Target |
|-------|-------|----------|--------|
| **Phase 0: Research + Regulatory (gate for Phase 1B only — Phase 1A can start in parallel)** | (1) Owner obtains Texas Notary Public commission (for in-house form signatures). (2) Owner confirms no additional state registration needed (Texas = permissive). (3) Keyword research in VI + EN (40 + 40 immigration queries targeted to Texas). (4) Competitor audit (≥3 Vietnamese-language and ≥3 English-language document preparers in Houston / Texas — content, pricing, schema, backlinks). (5) Topical Map documented and approved. (6) USCIS filing fees verified at uscis.gov/forms/filing-fees. Business data already collected: address (Bellaire Blvd, Houston, TX 77036 — street number TBD), email Chris@mannaos.com, EFIN 857993, Texas Life 3142469, Texas P&C 3118525, NPN 21024561. **Important:** Phase 0 does not block Phase 1A. The marketing landing page and ad infrastructure can ship before the keyword research and notary commission land. | 1–2 weeks | April 2026 |
| **Phase 1A: Marketing Landing + Facebook Ad Infrastructure (ships first, unblocks demos + ads)** | Next.js scaffold with `[locale]` routing; design system + Tailwind; Home landing page (hero banner · 4 service cards · trust badges · How It Works · contact strip · footer) per 2026-04-09 design; 4 service overview pages (Tax · Insurance · Immigration · AI) with Phase A scope (brochure-style, Calendly CTA); About page; Contact page with Calendly embed + contact form (Resend + Supabase backup); Privacy Policy + Terms stubs; Meta Pixel + Conversions API + GA4 with de-dup event_ids; UTM capture on contact form; root-layout Organization + LocalBusiness JSON-LD; hreflang EN⇄VI; /llms.txt stub; sitemap.xml + robots.txt; floating contact buttons (phone · Messenger · Zalo); Vercel deploy; Home LCP <2.5s on 4G verified; Meta Test Events verified. **~12 pages per locale at launch.** | 1.5–2 weeks | April 2026 |
| **Phase 1A Gate** | Phase 1A is shipped the moment the owner can: (1) point a Facebook ad at the Home URL and see Meta Pixel events in Events Manager, (2) hand out `mannaos.com` in an in-person consultation and have the prospect see a working bilingual site with 4 service cards, (3) receive a Calendly booking and a contact form lead end-to-end. No SEO rank, no AI citations, no portal, no admin needed for this gate. | — | April 2026 |
| **Phase 1B: Immigration SEO/GEO Topical Map** | All Phase B public pages (Immigration pillar + Texas state + 4 Texas city + 11 form cluster + 5 bundle + Non-Attorney Disclosure + Notario Fraud Awareness + Referral-Out + Blog list) in EN + VI; full JSON-LD matrix (LegalService, Service, FAQPage, HowTo, Article, Offer, BreadcrumbList, Person, Speakable); per-locale sitemaps; AI crawler opt-in directives; expanded /llms.txt with immigration scope; Texas residency gate on immigration contact path; pricing tables with verified-as-of timestamps; notario fraud differentiation components. **32 non-blog pages per locale (Phase 1A + Phase 1B combined).** Built on top of the Phase 1A codebase — zero throwaway. | 2–3 weeks | April–May 2026 |
| **Phase 2: Auth + Client Portal (case-tracking focus)** | Supabase Auth (with Resend); client signup (with TX residency + SMS consent); login; forgot-password; portal dashboard; case list view; case detail view (USCIS receipt number, current status, status history, uploaded documents); document upload/download | 1–2 weeks | May 2026 |
| **Phase 3: Admin Panel + Content Engine** | Client management; case management (create case, assign form/bundle, update status, upload USCIS correspondence); blog editor (Tiptap) with post_type tier, per-locale slugs, SEO publish-blockers, word count validation; website content editor (for pricing, disclosures, fee timestamps); author bio system; review acquisition UI; admin notifications | 1–2 weeks | May 2026 |
| **Phase 4: Polish, Launch & Directory Submission** | See detailed launch checklist below. Phase 4 applies the directory + review-acquisition polish on top of the already-live Phase 1A + 1B site. | 1–2 weeks | May–June 2026 |
| **Phase 1.5: Content Expansion (within V1 scope)** | Grow blog to 40+ posts per locale; add more cluster pages for forms we discover demand for (e.g., I-589 asylum if within scope, DS-260 coordination, I-601 waivers referral); refine pricing based on first 30 cases; first quarterly AI citation audit; refresh Phase 0 keyword list based on actual GSC data | 4–6 weeks | June–July 2026 |
| **Phase 1.75 (decision gate): Tax Pillar** | If V1 traction is positive AND owner wants to add tax before 2027 filing season: build out Tax pillar following the same 4-tier structure. Texas-only initially to stay consistent with V1; expand to other states after. **Decision gate on Sep 30, 2026.** | 4–6 weeks | Oct–Dec 2026 |
| **Phase 2 (broader scope)**: Add Life + P&C Insurance pillars (Texas-only), AI Automation Consulting pillar (national), online payments, Spanish language (`/es/` tree), potentially non-resident immigration state expansion if owner has registered/bonded in new states. | TBD | Q1–Q2 2027 |

### Phase 1A Launch Checklist — Marketing Landing + Facebook Ads

Phase 1A ships **before** Phase 4. It is the minimum-viable public site that unblocks Facebook ads and in-person client demos. Phase 4 later layers the off-site directory + review work on top.

**Content readiness (Phase 1A):**
```
☐ Home landing page: hero banner + 4 service cards + trust badges + How It Works + contact strip + footer — rendered in EN + VI
☐ Hero headline + subhead copy finalized in both locales (native VI reviewer approved)
☐ 4 service overview pages (/services/tax · /services/insurance · /services/immigration · /services/ai) — rendered in EN + VI, each with service list, pricing summary, trust credential, Calendly CTA
☐ Immigration overview page carries non-attorney disclosure + Texas-residents-only scope statement above the fold
☐ About page with founder bio + credentials (EFIN 857993, Texas Life 3142469, Texas P&C 3118525, NPN 21024561, Texas Notary — hedged if not yet granted)
☐ Contact page with Calendly embed + contact form + Houston HQ map + phone + Messenger + Zalo
☐ Privacy Policy + Terms of Service stubs in EN + VI
☐ 404 page custom-designed per locale with nav + service cards
```

**Technical readiness (Phase 1A):**
```
☐ Home LCP <2.5s on 4G mobile (Lighthouse mobile Performance ≥90)
☐ All Phase 1A pages render in EN + VI with no placeholder copy
☐ hreflang reciprocal EN ⇄ VI ⇄ x-default on every Phase 1A page
☐ sitemap.xml generated with Phase 1A URLs only (Phase 1B will extend)
☐ robots.txt present with AI crawler Allow directives
☐ /llms.txt stub describing Manna One Solution as a 4-service one-stop (Tax · Insurance · Immigration · AI), Houston HQ, phone, credentials
☐ Organization + LocalBusiness JSON-LD in root layout, validated via Google Rich Results Test
☐ Floating contact buttons (phone · Messenger · Zalo) visible on all Phase 1A pages
☐ Vercel custom domain mannaos.com connected with HTTPS
```

**Ad infrastructure readiness (Phase 1A):**
```
☐ Meta Pixel installed in root layout, fires PageView on every page
☐ Meta Conversions API wired via Next.js API route with de-dup event_ids
☐ Meta Test Events verified for: PageView, Lead (contact form), Schedule (Calendly), Contact (phone/Messenger click)
☐ GA4 installed with events: page_view, form_submit, calendly_click, calendly_booking_complete, phone_click_to_call, messenger_click, zalo_click, locale_switch, outbound_click
☐ Consent banner for EU/CA visitors present (GDPR / CPRA compliance)
☐ UTM parameter capture tested end-to-end: ad click → contact_submissions row contains utm_source, utm_campaign, fbclid
☐ First Facebook ad campaign drafted (creative + copy in VI + EN, audience: Vietnamese language + Houston geo)
```

**Lead capture readiness (Phase 1A):**
```
☐ Contact form submits to Next.js API route → Resend email + Supabase contact_submissions row (dual delivery)
☐ Test lead received in owner email within 30 seconds
☐ Test lead appears in Supabase contact_submissions table
☐ Calendly embed loads without redirect on mobile
☐ Test booking completed end-to-end, confirmation received by prospect and owner
☐ Phone click-to-call tested on iOS Safari + Android Chrome
☐ Facebook Messenger deep link opens the MannaOS page
☐ Zalo deep link opens the MannaOS account (or falls back gracefully if Zalo not installed)
```

**Phase 1A go-live gate (all must be true):**
```
☐ Owner can point a Facebook ad at https://mannaos.com/ and see Meta Events Manager Test Events firing
☐ Owner can hand out "mannaos.com" in an in-person consultation and the prospect sees a working bilingual site with 4 service cards
☐ A real Calendly booking from a real prospect has completed end-to-end
☐ A real contact form submission has been received via Resend + visible in Supabase
☐ No placeholder copy on Home or any service overview page
```

Phase 1B (the immigration topical map), Phase 2 (portal), Phase 3 (admin), and Phase 4 (directory submission + reviews) start **after** this gate is green — but work on them can be drafted in parallel.

### Phase 4 Launch Checklist

Phase 4 is not "testing" — it's the coordinated launch of the web site plus all
off-site SEO/GEO assets. Nothing below is optional.

**Technical readiness (pre-launch):**
```
☐ Lighthouse mobile scores: Performance 90+, SEO 95+, Accessibility 90+, Best Practices 90+
☐ Core Web Vitals (mobile, 75th pct): LCP <2.5s, CLS <0.1, INP <200ms — verified
☐ All V1 pages rendered in EN + VI — no placeholder copy
☐ All JSON-LD validates via Google Rich Results Test
☐ hreflang reciprocal on every page (validated via Merkle / Ahrefs SEO tool)
☐ sitemap-en.xml + sitemap-vi.xml generated with xhtml:link alternates
☐ robots.txt includes AI crawler Allow directives + Sitemap reference
☐ /llms.txt live with real (non-TODO) business data
☐ Privacy Policy + Terms of Service published per locale
☐ 404 page custom-designed per locale with primary nav and search
☐ 301 redirects: any prior URL → new structure
☐ GA4 consent banner live for EU/CA
☐ All custom GA4 events firing (verified via DebugView)
```

**Google & Bing search setup:**
```
☐ Google Search Console verified (domain property, not URL prefix)
☐ Submit sitemap.xml to GSC
☐ Request indexing on top 8 URLs (4 EN + 4 VI national pillars) via URL Inspection
☐ Enable International Targeting check in GSC — confirm zero hreflang errors
☐ Bing Webmaster Tools verified
☐ Submit sitemap.xml to Bing
☐ IndexNow API integration (optional but recommended) for fast Bing re-crawl
```

**Google Business Profile (Houston HQ):**
```
☐ Claim or create listing at business.google.com
☐ Verify (postcard / phone / video — whichever Google offers)
☐ Business name: "Manna One Solution" — no keyword stuffing
☐ Primary category: "Immigration & Naturalization Service"
☐ Secondary categories: "Notary Public", "Document Preparation Service",
  "Translator" (for certified translation service), "Consultant"
☐ Business description (750 chars) — leads with Vietnamese-language USCIS document
  preparation + non-attorney disclosure + Houston HQ + Texas service area
☐ Services list with prices — all forms + bundles from §2a.3b pricing tables
☐ Hours (including Saturday for weekend working immigrants)
☐ Local phone number (346 area code) — matches website
☐ Website URL — matches website
☐ Attributes: "Vietnamese spoken", "Online appointments", "Appointment required",
  "Notary on site" (once commission obtained)
☐ Photos: logo, cover, interior, exterior, owner at work — minimum 10 photos
☐ GBP Posts: first post scheduled for launch day (topic: "Non-attorney document
  preparer now serving Houston's Vietnamese community")
☐ Generate short review link: g.page/[businessname] or review shortlink
```

**Apple Business Connect:**
```
☐ Create listing at business.apple.com
☐ Logo + photos uploaded
☐ Hours, services, action links (call, book, website)
☐ Attributes configured
☐ Verified
(This powers Siri + Apple Intelligence answers on iOS — critical for Vietnamese iPhone users)
```

**Bing Places for Business:**
```
☐ Claim or create listing at bingplaces.com
☐ Import from GBP if possible (saves time)
☐ Verified
☐ NAP matches GBP exactly
(This powers ChatGPT browsing + Microsoft Copilot local answers)
```

**Tier 1 citations:**
```
☐ Yelp Business (biz.yelp.com) — NAP match
☐ Better Business Bureau (bbb.org) — apply for accreditation if budget permits
☐ Yellow Pages (yp.com)
☐ Nextdoor Business (nextdoor.com/business)
☐ Facebook Business Page — already exists, update NAP to match
```

**Industry citations (automatic or semi-automatic):**
```
☐ IRS Directory of Federal Tax Return Preparers — confirm EFIN listing is live at
  irs.treasury.gov/rpo/rpo.jsf
☐ Texas Department of Insurance licensee lookup — confirm listing at tdi.texas.gov
☐ NATP (National Association of Tax Professionals) — if member, request directory listing
```

**Community citations (Vietnamese-American):**
```
☐ Vietnamese American Chamber of Commerce of Houston — apply for membership + directory listing
☐ Submit brand + backlink request to Người Việt Daily News (nguoi-viet.com) — resource listing
☐ Submit to Viet Mercury, Việt Báo where applicable
☐ Vietnamese business groups on Facebook — announce launch (organic, not paid)
☐ Reddit r/HoustonVietnamese, r/Vietnamese — share launch post naturally in relevant threads
```

**Content validation:**
```
☐ Every pillar/Texas/city/form/bundle page has 5–8 matching visible FAQ + FAQPage JSON-LD
☐ Every page has ≥1 outbound .gov link (uscis.gov preferred for form/bundle pages)
☐ Every page has ≥3 internal links
☐ Every form page has a complete pricing table (Service Fee + USCIS Fee = Total) with "verified as of [date]" timestamp linking to uscis.gov/forms/filing-fees
☐ Every bundle page has itemized pricing (per-form USCIS + service fee breakdown + total)
☐ Non-attorney disclosure component above the fold on every pillar/form/bundle page
☐ Notario fraud awareness block visible on every form and bundle page
☐ Referral-out page lists real, verified Houston-area pro-bono / legal-aid partners (not placeholders)
☐ CI grep: no non-Texas US state name appears in marketing copy (allowed only on referral-out, notario-fraud-awareness, and Phase 1.5+ deferred-services disclosure pages)
☐ CI grep: no mention of "tax", "insurance", "bảo hiểm", "khai thuế" on V1 immigration pages (deferred services)
☐ Texas Notary Public status displayed in footer and on About page (or hedged to a specific date if commission not yet granted)
☐ Non-attorney document preparer disclosure present on every pillar/form/bundle page
☐ Terms of Service explicitly frames MannaOS as non-attorney document preparer + UPL disclaimer
☐ Texas residency gate field on contact form, with automated non-TX referral reply tested
☐ Intake form includes scope-of-service acknowledgment checkbox
☐ Native Vietnamese speaker has reviewed every /vi/ page for accuracy and tone
```

**Measurement baseline (day 0):**
```
☐ Snapshot initial GSC metrics
☐ Record initial GBP profile views
☐ Run first monthly AI citation audit (baseline = all "no")
☐ Record Google organic sessions = 0
☐ Start branded search volume tracker in GSC (filter by "manna one")
```

---

## 10. Open Questions

The V1 refocus to immigration-only, Texas-only surfaces a tighter set of questions.
Most multi-state and multi-pillar questions from the prior revision are now resolved
(see Resolved Decisions table).

### Open — Required Before Phase 1 Build

| # | Question | Owner | Impact if unresolved |
|---|----------|-------|----------------------|
| 1 | **Final street number on Bellaire Blvd, Houston, TX 77036** (placeholder locked to Bellaire Blvd + 77036 — street number TBD) | Owner | Required for GBP postcard verification, Apple Business Connect, Bing Places, and Texas Notary commission application. Schema/`llms.txt` currently use "Bellaire Blvd" as street-only until the suite/number is confirmed. |
| 2 | **Texas Notary Public commission timeline** — when will the owner file the Notary application with the Texas Secretary of State? This is a Phase 0 gate: the Notary credential is a core trust signal on every form/bundle page and must be live by launch. | Owner | If the commission is not obtained pre-launch, every page copy reference to "in-house notarization" must be removed or hedged, and clients will need to be referred to a third-party notary — degrading the differentiation vs. notario-fraud shops. |
| 3 | **Final form list confirmation** — lock the V1 form set. Current PRD assumes 11 forms (I-90, I-130, I-485, I-751, I-765, I-131, N-400, N-600, I-864, I-912, AR-11). Any form the owner is NOT comfortable preparing must be dropped from V1 (and added to "refer to attorney" page). | Owner | Each form becomes 2 pages (EN + VI) of the topical map. Dropping a form post-launch creates 404s + breaks internal linking. |
| 4 | **Pricing validation against Houston market** — competitor audit of ≥3 Houston Vietnamese/Latino immigration prep shops and ≥2 mid-market Houston immigration attorneys. Confirm proposed service fees ($250–$550) sit in the 40–60%-below-attorney band. | Owner + Claude | Wrong pricing anchors the brand as either cheap-shop (too low, activates notario fraud concern) or unreachable (too high, loses price-sensitive segment). |
| 5 | **Attorney referral partnerships** — which 2–3 Houston-area immigration attorneys or legal-aid orgs will MannaOS actively refer to? Referral-out page needs real, verified partners (CLINIC network member, KIND chapter, Catholic Charities Houston, Texas RioGrande Legal Aid, AILA pro-bono list). | Owner | The referral-out page is the primary UPL safety valve. Without verified partners, the page reads as a liability disclaimer instead of a trust-building asset. |
| 6 | **Target keyword list (40 VI + 40 EN, immigration-scoped)** with volume + intent, using seeds in §2a.1 | Owner + Claude | Required before any slug is locked. Wrong slugs = permanent 301 debt on 32 pages per locale. |
| 7 | **Native Vietnamese reviewer** — who will review every `/vi/` page (esp. form pages, non-attorney disclosure, and notario fraud awareness) for tone, accuracy, and culturally natural phrasing before publish? | Owner | Machine-translated or awkward VI content on an immigration site tanks community trust catastrophically — this is the most emotionally loaded topic the site touches. |
| 8 | **USCIS fee verification process** — who is responsible for cross-checking every published fee against uscis.gov on a defined cadence (monthly? quarterly?) and updating the `site_content` table? | Owner | USCIS published major fee changes April 1 2024; next scheduled change is unknown. Stale fees on the site = customer trust collapse on first interaction. |
| 9 | **Google review short link** — requires GBP to be set up first, but confirm owner is ready to drive review requests immediately post-launch. Reviews from the first 5 cases are disproportionately important for new-practitioner E-E-A-T. | Owner | Review count + recency is a top-3 Local Pack ranking factor. |

### Should Decide Before Phase 2

| # | Question | Owner |
|---|----------|-------|
| 10 | **BIA accreditation (partial or full) via DOJ EOIR** — does the owner want to pursue Recognized Organization + Partially Accredited Representative status? This would unlock G-28 filing and representation at USCIS, dramatically expanding service scope. Requires 501(c) nonprofit affiliation or a Recognized Organization sponsor. Multi-year path. | Owner |
| 11 | Zalo click-to-chat integration — use Zalo Official Account as a community channel alongside phone/email? | Owner |
| 12 | Call tracking — use a dedicated tracking number (Google Ads call reporting) or the primary line? | Owner |
| 13 | Author profile strategy — will the owner be the sole author on the blog in V1, or will other contributors have profiles? | Owner |
| 14 | In-person vs remote Calendly split — same free tier (1 event type) or upgrade to paid for separate event types (initial consult vs. signing appointment)? | Owner |
| 15 | **Phase 1.5 trigger decision for tax pillar** — what revenue / case-count / credential conditions need to be true before adding the Vietnamese Tax Preparation pillar? (Decision gate scheduled for 2026-09-30.) | Owner |
| 16 | **Non-resident immigration consultant registration** (deferred) — if/when the owner wants to expand document prep to California, Nevada, Florida, Washington, or Illinois clients, each state has its own registration + bond requirements. Currently out of scope; revisit at Phase 2. | Owner |

### Resolved Decisions

| Question | Decision | Date |
|----------|----------|------|
| **V1 rollout order** | Split V1 into **Phase 1A (marketing landing + Facebook ad infrastructure)** and **Phase 1B (immigration SEO/GEO topical map)**. Phase 1A ships first so the owner has a URL for client demos and Facebook ads. Phase 1B preserves all immigration depth from the original 4/10 draft and starts the day Phase 1A ships. See §1 V1 Rollout Order and §9 Timeline. Reason for the change: the owner cannot run Facebook ads or hand out a URL at in-person consultations until a public landing page exists — the 4/10 draft's unified Phase 1 (3–4 weeks to first live page) blocks that for too long. | 2026-04-11 (Phase A/B split) |
| **V1 marketing positioning** | Home landing page must showcase **all 4 Manna One Solution services** (Tax · Insurance · Immigration · AI) per the 2026-04-09 design doc. "One Stop, All Solutions" is the brand promise and must be visible in 5 seconds. Each service gets a brochure-style overview page in Phase 1A; the Immigration service additionally gets the full topical map in Phase 1B. Supersedes the 4/10 draft's "immigration-only on Home" decision. | 2026-04-11 (Phase A/B split) |
| **V1 ad infrastructure** | Meta Pixel + Conversions API (with server-side de-duplication), GA4 with custom events, and UTM parameter capture on the contact form are **must-have Phase 1A deliverables**, not Phase 4 polish. The Home landing page is an ad destination and must be measured from day one. | 2026-04-11 (Phase A/B split) |
| **V1 service scope (SEO depth)** | Vietnamese-language USCIS immigration document preparation is the only service pillar that gets the full 4-tier topical map in Phase 1B. Tax, Life Insurance, P&C Insurance, and AI Automation Consulting are represented as Phase 1A brochure-style overview pages only; their deep topical maps are deferred to Phase 1.5+ and Phase 2 (see §9 timeline). Supersedes the prior "immigration pages only, no Tax/Insurance/AI surface at all in V1" decision. | 2026-04-11 (Phase A/B split) |
| **V1 service scope (original)** | Vietnamese-language USCIS immigration document preparation ONLY. Tax, Life Insurance, P&C Insurance, and AI Automation Consulting are deferred to Phase 1.5+ and Phase 2 (see §9 timeline). Supersedes the prior 5-pillar decision. **Note:** this decision was partially reversed on 2026-04-11 — Tax/Insurance/AI now have Phase 1A brochure surface to support the 4-service landing page. | 2026-04-10 (V1 refocus) |
| **V1 geographic scope** | Texas residents only. Owner is not registered as an immigration consultant in any other state, and CA/NV/FL/IL/WA/MD/MN/NC/NY require state registration + bonding. Marketing, contact form, and content all gated to Texas. Contact form contains a "Are you a Texas resident?" field; non-TX submissions get an automated referral reply pointing to CLINIC / AILA pro-bono. Supersedes the prior multi-state Tier 1/Tier 2 rollout. | 2026-04-10 (V1 refocus) |
| **Service provider classification** | MannaOS operates as a **non-attorney document preparer**, not a law firm. Does NOT file Form G-28, does NOT represent clients before USCIS, does NOT give legal advice, does NOT handle RFEs / NOIDs / denials / inadmissibility / removal. Explicit non-attorney disclosure required above the fold on every pillar, form, and bundle page per §2a.3c. | 2026-04-10 (V1 refocus) |
| **V1 form list** | 11 forms: I-90, I-130, I-485, I-751, I-765, I-131, N-400, N-600, I-864, I-912, AR-11. Each becomes a form-cluster page per locale. | 2026-04-10 (V1 refocus) |
| **V1 bundle list** | 5 bundles: Marriage Green Card Package, Family Petition Consular, Citizenship Fast-Track, GC Renewal + Travel Doc, Remove Conditions + EAD. Each becomes a bundle page per locale with itemized pricing per §2a.3b. | 2026-04-10 (V1 refocus) |
| **Pricing model** | Transparent "Service Fee + USCIS Fee = Total" on every form and bundle page. Service fees positioned 40–60% below typical AILA attorney rates. Flat-fee disclaimer: no hidden charges, USCIS fees paid directly to USCIS. All prices stored in `site_content` table for admin-editable updates without redeploy. Pricing table verified against uscis.gov with a displayed "verified as of [date]" timestamp. | 2026-04-10 (V1 refocus) |
| **Notario fraud differentiation** | Mandatory content strategy. Above-fold non-attorney disclosure banner component on every pillar/form/bundle page. Three standalone trust pages: `/non-attorney-disclosure/`, `/notario-fraud-awareness/`, `/need-an-immigration-attorney/` (all per locale). Referral-out page lists verified Houston-area pro-bono and low-cost legal aid partners. See §2a.3c. | 2026-04-10 (V1 refocus) |
| **Texas Notary Public** | Planned pre-launch credential. Application to Texas Secretary of State is a Phase 0 deliverable. Enables in-house signature witnessing on USCIS forms — a core trust differentiator vs. notario shops. Timeline locked in §10 Open Question #2. | 2026-04-10 (V1 refocus) |
| **Bilingual implementation** | Subdirectory routing `/en/` + `/vi/` via Next.js App Router `[locale]` segment with native Vietnamese slugs, reciprocal hreflang, and per-locale metadata/schema/content. | 2026-04-10 |
| **Default locale for first-time visitors** | `Accept-Language` detection: `vi*` → `/vi/`, otherwise `/en/`. `NEXT_LOCALE` cookie honors explicit user switches. | 2026-04-10 |
| **URL structure** | `/[locale]/services/vietnamese-immigration-document-preparation/[texas?]/[city?]/` for service pages; `/[locale]/forms/[form-slug]/` for form pages; `/[locale]/bundles/[bundle-slug]/` for bundle pages. 4-tier topical map hierarchy per §2a.2. | 2026-04-10 (V1 refocus) |
| **Topical Map V1 footprint** | 32 non-blog pages per locale (64 total) + 20 seed blog posts per locale (40) = **84 pages at launch**. Breakdown: 10 home/legal/trust + 1 pillar + 1 Texas state cluster + 4 Texas city supports + 11 form cluster + 5 bundle pages. Supersedes the prior 37-page multi-pillar footprint. | 2026-04-10 (V1 refocus) |
| **HQ address (placeholder)** | Bellaire Blvd, Houston, TX 77036 — street number TBD (heart of Houston Little Saigon / Asiatown). Used in LocalBusiness schema, `/llms.txt`, footer. | 2026-04-10 |
| **Business email** | Chris@mannaos.com | 2026-04-10 |
| **Credentials displayed publicly (V1)** | IRS EFIN 857993 (held but not used for V1 marketing — tax deferred), Texas Life Insurance License 3142469 (held but not used for V1 marketing), Texas P&C Insurance License 3118525 (same), NPN 21024561, PTIN-registered. For V1 public pages, lead with **Texas Notary Public** (pending Phase 0) + non-attorney document preparer status. Other credentials listed on `/about/` as background, not as V1 service offerings. | 2026-04-10 (V1 refocus) |
| **AI crawler policy** | Opt-in. robots.txt explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot on public content. | 2026-04-10 |
| **Review acquisition** | Required V1 feature. Admin "Request Review" button triggers bilingual email + opt-in SMS via Resend with short Google review link. TCPA opt-in captured at signup. | 2026-04-10 |
| **Privacy Policy + Terms of Service** | Must-have V1. Required for GA4 compliance and E-E-A-T. Terms of Service must explicitly include the non-attorney document preparer clause and UPL disclaimer. | 2026-04-10 (V1 refocus) |
| **AI citation audit** | Monthly process, stored in `docs/seo-audits/`. Owner responsibility. First audit = baseline on launch day. V1 audit prompts scoped to immigration queries. | 2026-04-10 (V1 refocus) |
| USCIS polling architecture | Playwright agent on dedicated VPS (internal staff app) writes to shared Supabase DB. MannaOS.com reads only — no separate cron. Case-tracking portal is a V1 feature, not deferred. | 2026-04-10 (V1 refocus) |
| Contact form provider | Resend (same provider as auth emails) via Next.js API route + Supabase `contact_submissions` backup. Includes Texas residency gate field. | 2026-04-10 |
| Email provider for Supabase Auth | Resend — 100 emails/day free tier, first-party Supabase integration. | 2026-04-10 |
| Blog content authorship | All original content, written by the owner. No AI-assisted drafting in V1. Every blog post requires: meta description per locale, OG image, author_id, ≥3 internal links, ≥1 outbound .gov link (usually uscis.gov), FAQ section, min word count by tier. | 2026-04-10 |
| Document retention policy | 7 years in Supabase Storage (aligns with USCIS record retention recommendations). Auto-delete policy deferred to V2. | 2026-04-10 |
| Google Business Profile | Not yet set up. Primary category will be "Immigration & Naturalization Service"; secondaries per §9 launch checklist. | 2026-04-10 (V1 refocus) |
| USCIS CAPTCHA | Real, but at MOS scale (~50 checks/day, 2–5s delays, static-IP VPS), below detection thresholds. Staff app handles detection + admin alerts. | 2026-04-10 |
| Calendly tier | Free tier for V1. Event types: in-person Houston HQ consult + remote video consult (Texas residents only). | 2026-04-10 (V1 refocus) |
| Analytics | Google Analytics 4 from launch (Phase 1). Custom events listed in §3 Feature Breakdown. | 2026-04-10 |
| Admin notification channel | Email via Resend for V1. No SMS or push notifications in V1. | 2026-04-10 |
| USCIS Torch API | Research after official launch. V1 uses Playwright scraper on VPS. | 2026-04-10 |

---

*Manna One Solution — One Stop, All Solutions.*
*Houston, TX | MannaOS.com | 346-852-4454*
