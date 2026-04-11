# PRD: Manna One Solution Website
**Date:** April 6, 2026  
**Project:** MannaOS.com  
**Tech Stack:** Next.js + Vercel  
**Owner:** Manna One Solution, Houston, TX

---

## 1. Overview

A bilingual (Vietnamese/English) professional website for Manna One Solution — a one-stop service company in Houston, TX offering Tax & Business, Insurance, Immigration, and AI/Automation services. Primary targets: Vietnamese community in Houston and surrounding states.

**Three core goals:**
1. **Lead generation** — get found on Google, capture leads via form
2. **Credibility** — build trust when prospects look up the business
3. **Booking** — let clients schedule appointments online

---

## 2. Tech Stack & Hosting

| Item | Choice |
|---|---|
| Framework | Next.js (React) |
| Hosting | Vercel (free tier) |
| Domain | MannaOS.com — connect to Vercel |
| Contact form | Formspree (free tier, no backend needed) |
| Appointment booking | Calendly embed |
| Deployment | GitHub → Vercel auto-deploy |
| SSL | Automatic via Vercel |

---

## 3. Design System

### Colors
```
Primary background:   #0A1628  (deep navy)
Secondary background: #1E3A5F  (mid navy — cards, sections)
Accent gradient:      #4F8EF7 → #7B2FBE  (blue-to-purple — hero, CTAs)
Accent solid:         #4F8EF7  (blue — buttons, links)
Gold accent:          #F5A623  (trust badges, highlights)
Text primary:         #FFFFFF
Text secondary:       #E2E8F0
```

### Typography
- **Font:** Inter (or Plus Jakarta Sans) — Google Fonts, full Vietnamese diacritic support
- **Headings:** Bold, large, clean
- **Body:** Regular weight, readable

### Logo
- Text-based SVG monogram: **M1S** with blue-purple gradient
- Full name: "Manna One Solution" in white
- Tagline: "Tax · Insurance · Immigration · AI" in muted text
- No image file needed — rendered in code

### Visual Style
- Dark navy background — professional, modern, tech-forward (Stripe/Linear aesthetic)
- Glassmorphism cards: semi-transparent with subtle blur/border
- Gradient buttons with hover animation
- Clean whitespace — not cluttered

---

## 4. Site Structure

```
/               Home
/services       Services overview
/services/tax              Tax & Business
/services/insurance        Insurance & Finance
/services/immigration      Immigration
/services/ai               AI / Automation
/about          About Manna One Solution
/contact        Contact & Book Appointment
/blog           Blog (tax tips, LLC guides, etc. — for SEO)
```

---

## 5. Page Designs

### 5.1 Home Page (/)

Sections in order:

1. **Navbar** — Logo left | Nav links center | VI/EN toggle + "Book Now" CTA right | Sticky on scroll
2. **Hero** — Full-width dark gradient, bilingual headline, 2 CTAs: "Đặt lịch ngay" + "Our Services"
3. **Services Overview** — 4 cards in grid: Tax, Insurance, Immigration, AI — icon + short description + "Learn more" link
4. **Why Manna** — 4 trust points: Bilingual service, EFIN licensed, Life Insurance licensed, AI-powered
5. **How It Works** — 3 steps: (1) Contact us → (2) Free consultation → (3) We handle it
6. **Testimonials** — Section placeholder; add real reviews as they come in
7. **Contact Strip** — Phone number, Facebook link, quick contact form inline
8. **Footer** — Logo, services list, contact info, copyright

### 5.2 Services Page (/services)

- Overview of all 4 service categories
- Each as a large card with description and pricing summary
- CTA to individual service pages or /contact

### 5.3 Individual Service Pages

**Tax & Business (/services/tax)**
- Services: Tax prep (individual + business), Extension filing, LLC setup
- Pricing table:
  - Extension Filing (Form 4868): $50–$75
  - Individual Tax (simple): $150–$250
  - Individual Tax (complex): $250–$400
  - Business Tax (LLC/S-Corp): $400–$800
  - LLC Setup (full package): $300–$500 + state fee
- CTA: Book appointment

**Insurance & Finance (/services/insurance)**
- Services: Life Insurance, Annuity, Retirement Planning
- No fixed pricing (commission-based) — CTA to consult

**Immigration (/services/immigration)**
- Services: N-400 (Citizenship), Green Card, Visa Renewal, Consultation
- CTA: Contact for case evaluation

**AI / Automation (/services/ai)**
- Services: Workflow automation, AI tools for SMBs, Business digitization, Monthly retainer
- Emphasize: "We understand your business — we build the automation"
- CTA: Free discovery call

### 5.4 About Page (/about)
- Founder story: why Manna One Solution was created
- Credentials: EFIN, Life Insurance License, bilingual Vietnamese-English
- Mission statement: "One Stop, All Solutions"
- Serving: Houston, DFW, Austin, and Vietnamese communities nationwide

### 5.5 Contact & Booking Page (/contact)
Three contact methods side by side:

1. **Contact Form** (via Formspree)
   - Fields: Name, Phone, Email, Service needed (dropdown), Message
   - On submit: confirmation message shown, email sent to owner

2. **Calendly Embed**
   - Inline calendar for self-scheduling
   - Label: "Book a free 15-min consultation"

3. **Direct Contact**
   - Phone number (call/text)
   - Facebook Messenger link
   - Google Maps embed (Houston, TX)

### 5.6 Blog (/blog)
- List of articles stored as Markdown files in `/content/blog/`
- Categories: Tax tips, LLC guides, Immigration news, Insurance basics
- Purpose: SEO — target Vietnamese-language search queries
- Each post has: title, date, category, Vietnamese + English content
- No CMS needed — edit markdown files directly (vibecode-friendly)

---

## 6. Bilingual System

- Language toggle: **VI / EN** button in navbar, persists via `localStorage`
- Implementation: `next-i18next` or simple React context with JSON translation files
- Translation files:
  - `/locales/vi/common.json`
  - `/locales/en/common.json`
- All static content translated; blog posts can be single-language
- Default language: Vietnamese

---

## 7. Contact & Booking Features

| Feature | Implementation |
|---|---|
| Contact form | Formspree free tier — no backend |
| Appointment booking | Calendly free tier — embedded inline |
| Floating contact buttons | Fixed bottom-right: Phone + Facebook Messenger |
| Phone | Click-to-call (`tel:` link) |
| Facebook | Link to Facebook Business page |

No Zalo integration.

---

## 8. SEO Strategy

| Item | Implementation |
|---|---|
| Meta tags | `next/head` — unique title + description per page, bilingual |
| OpenGraph | Facebook share preview with image |
| Local Business Schema | JSON-LD: name, address, phone, hours, service area |
| Sitemap | Auto-generated via `next-sitemap` |
| Page speed | Next.js static generation — fast load times |
| Target keywords | "tax preparation Houston Vietnamese", "khai thuế Houston", "LLC setup Houston", "bảo hiểm nhân thọ Houston" |
| Google Business Profile | Separate from website — set up independently |

---

## 9. Performance & Quality

- Static generation (SSG) for all pages — fast, SEO-friendly
- Images: Next.js `<Image>` component with lazy loading
- Fonts: Loaded via `next/font` (no layout shift)
- Mobile-first responsive design
- Lighthouse target: 90+ on Performance, SEO, Accessibility

---

## 10. Out of Scope (v1)

- Payment processing online
- Client portal / login
- Live chat
- CRM integration
- Spanish (Hispanic market) — Phase 2
- Bookkeeping/Payroll pages — Phase 2

---

## 11. Success Criteria

- Website live and indexed by Google within 1 week of launch
- Contact form working and delivering emails
- Calendly booking functional
- Bilingual toggle working correctly
- Mobile-responsive on iOS and Android
- Domain connected and HTTPS active

---

## 12. Suggested Domain Connection Steps

1. In Vercel: Add custom domain → copy DNS records
2. In domain registrar: Update DNS (A record + CNAME)
3. Wait 24–48h for propagation
4. Vercel auto-provisions SSL certificate

---

*Manna One Solution — One Stop, All Solutions.*  
*Houston, TX | MannaOS.com*
