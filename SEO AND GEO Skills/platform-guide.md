# Platform Selection Guide

Read this file when the user hasn't chosen a platform yet, or when you need to
recommend the right stack for a given project type.

---

## The Core Question

Two things determine the platform:
1. **Who updates the content after launch?** (Developer vs non-developer)
2. **What does the site need to do?** (Static info vs dynamic data vs e-commerce)

---

## Platform Decision Tree

```
Does a non-technical person need to update content after launch?
│
├── YES → Does the site need e-commerce?
│         ├── YES → WooCommerce (WordPress) or Shopify
│         └── NO  → Does design quality matter more than budget?
│                   ├── YES → Webflow
│                   └── NO  → WordPress
│
└── NO → Is this a simple marketing/info site with infrequent updates?
          ├── YES → Astro or Hugo (fastest, cheapest)
          └── NO  → Does it need a blog, dynamic routes, or API integration?
                    ├── YES → Next.js
                    └── NO  → Astro
```

---

## Platform Profiles

### Static Site Generators

**Best platforms:** Next.js, Astro, Hugo, Eleventy

**What "static" means:**
The site is pre-built into plain HTML files at build time. When a visitor loads a page,
the server sends a pre-made file — no database query, no server processing. This is the
fundamental reason static sites are faster and more secure than database-driven sites.

**SEO advantages:**
- Fastest possible LCP (Core Web Vitals) — files are ready instantly
- Clean HTML output — no plugin bloat interfering with structure
- Full control over every meta tag, schema, and heading
- Free hosting on Vercel or Netlify with global CDN included

**SEO disadvantages:**
- Requires a developer to update content (no visual editor by default)
- Must rebuild and redeploy after every content change
- Not suitable for real-time dynamic content (live pricing, stock levels)

**GEO suitability:** Excellent — full control over schema, fact placement, and page structure.

**Best for:**
- Developer-managed blogs and portfolios
- Landing pages and microsites
- Documentation sites
- Any project where the developer is also the content manager

**Hosting cost:** Free (Vercel, Netlify free tier) to $20/month for high traffic

**When to choose Astro over Next.js:**
- Site is mostly static content (blog, marketing site, portfolio)
- No need for complex React interactivity
- Want the absolute fastest possible output
- Astro ships zero JavaScript by default — Next.js ships a JS runtime

**When to choose Next.js over Astro:**
- Need React components with state and interactivity
- Building a web app, not just a content site
- Team already knows React

**When to choose Ghost over Astro/Next.js:**
- Primary purpose is a blog or newsletter-driven content site
- Want a beautiful built-in editor without WordPress complexity
- Need native membership/subscription features (Ghost has this built in)
- Ghost outputs clean, fast HTML with excellent Core Web Vitals out of the box
- Hosting: Ghost(Pro) starts at $9/month; self-host free on any Node.js server

---

### WordPress

**What it is:**
A database-driven CMS where content is stored in MySQL and rendered dynamically
on each page request. Powers ~43% of all websites globally.

**SEO advantages:**
- Yoast SEO or RankMath plugin handles title tags, sitemaps, schema with a UI
- Massive plugin ecosystem for any SEO need
- Easy to maintain a blog and publish content regularly
- URL structure fully customizable via permalinks settings

**SEO disadvantages:**
- Can become slow with too many plugins (hurts Core Web Vitals)
- Requires caching plugin (WP Rocket, W3 Total Cache) to compete on speed
- Security vulnerabilities if not maintained (outdated plugins/themes)
- Shared hosting often too slow for good Core Web Vitals

**GEO suitability:** Good with plugins, but less precise than hand-coded schema.

**Speed optimization for WordPress (required for competitive SEO):**
1. Hosting: Use WP Engine, Kinsta, or Cloudways — NOT GoDaddy/Bluehost shared
2. Caching: Install WP Rocket ($59/year) or LiteSpeed Cache (free)
3. Images: Use Imagify or ShortPixel plugin to auto-compress
4. Theme: Use GeneratePress or Kadence (lightweight) — NOT Divi or Elementor
5. CDN: Cloudflare free tier (set up in 10 minutes)

**Recommended plugin stack for SEO:**
```
SEO:        Yoast SEO (free) or RankMath (free)
Speed:      WP Rocket ($59/yr) or LiteSpeed Cache (free)
Images:     Imagify (free tier) or ShortPixel
Security:   Wordfence (free)
Backup:     UpdraftPlus (free)
Schema:     Schema Pro ($79) or use RankMath's built-in schema
```

**Hosting cost:** $15–50/month for quality managed WordPress hosting
**Domain cost:** $10–15/year

**Best for:**
- Clients who need to self-manage content
- Businesses that blog regularly
- Multi-author sites
- Local business sites with service pages + blog
- Sites that may eventually need e-commerce (WooCommerce)

---

### Webflow

**What it is:**
A visual, no-code website builder that outputs clean HTML/CSS/JS. Has its own
CMS for content management and handles hosting internally.

**SEO advantages:**
- Clean code output (no plugin bloat)
- Built-in CMS for content management without needing a developer
- Faster than WordPress out of the box
- Good meta tag management through the designer interface

**SEO disadvantages:**
- Schema markup requires custom code embeds — less convenient than WordPress plugins
- Limited to Webflow's ecosystem — can't install third-party plugins
- More expensive than WordPress + cheap hosting
- Export and self-host option removes CMS functionality

**GEO suitability:** Moderate — schema requires manual code embeds, but structure control is good.

**Best for:**
- Design-heavy marketing sites
- Agency client projects where design quality is premium
- Founders who want to manage content visually without a developer
- SaaS landing pages and product marketing sites

**Hosting cost:** $23–$39/month (includes hosting, no separate server needed)

**Webflow vs WordPress decision:**
```
Choose Webflow if:  Design quality is the top priority AND budget allows $39/month
Choose WordPress if: Budget is tighter OR complex functionality needed OR long-term flexibility matters
```

---

### Framer

**What it is:**
A newer visual site builder (similar to Webflow) built on React. Outputs production-ready
React code. Growing in popularity among product designers and SaaS teams.

**SEO advantages:**
- Fast output by default (React + SSR)
- Good meta tag management through the interface
- Clean semantic HTML

**SEO disadvantages:**
- Schema markup requires custom code embeds (same limitation as Webflow)
- Smaller ecosystem than Webflow — fewer integrations
- CMS is less mature than Webflow's for large content sites

**GEO suitability:** Moderate — similar to Webflow.

**Best for:**
- SaaS landing pages and product marketing sites
- Designers who already know Figma (Framer's design tools are similar)
- Teams wanting React output without building from scratch

**Hosting cost:** $10–$30/month
**When to choose Framer over Webflow:** Team uses Figma and values Framer's Figma-like interface;
project is a landing page or small marketing site (not a large content site).

---

### Headless CMS Architecture

**What "headless" means:**
Content is stored and managed in one system (the CMS — "body") but displayed by a
completely separate frontend system (the "head"). The two connect via API.

**Example stack:**
```
Content management:  Sanity or Contentful (Headless CMS)
Frontend:            Next.js or Astro (pulls content via API at build time)
Hosting:             Vercel (frontend) + Sanity/Contentful cloud (content)
```

**Why use this:**
- Editors get a polished, user-friendly content interface (better than WordPress)
- Developers get full control over the frontend and output HTML
- Content can be reused across website, mobile app, email, etc.
- Best of both worlds: fast static output + non-developer content management

**SEO/GEO:** Excellent — full developer control over output with non-dev content editing.

**Best for:**
- Projects with both a developer and a non-technical content manager
- Multi-channel content (website + app + other surfaces)
- Larger content operations with editorial workflows

**Cost:**
- Sanity: Free for small projects, $99/month for teams
- Contentful: Free for small projects, $300/month for larger
- Frontend hosting: Free on Vercel for most projects

---

## Quick Comparison Table

| | Static (Astro/Next.js) | Ghost | WordPress | Webflow | Framer | Headless CMS |
|---|---|---|---|---|---|---|
| **Speed (Core Web Vitals)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **SEO control** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **GEO / Schema** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Non-dev content editing** | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Monthly cost** | Free–$20 | $9–25 | $15–50 | $23–39 | $10–30 | $20–100+ |
| **Setup complexity** | Medium | Low | Low | Low | Low | High |
| **Long-term flexibility** | High | Medium | High | Medium | Medium | High |

---

## Recommended Stacks by Project Type

```
LOCAL SERVICE BUSINESS (plumber, tax preparer, insurance agent):
  Simple:   WordPress + GeneratePress theme + Yoast SEO + Cloudflare
  Premium:  Webflow CMS

BLOG / CONTENT SITE:
  Developer-managed:                  Astro + GitHub + Netlify (free)
  Newsletter + membership focus:      Ghost (Pro hosting or self-hosted)
  Non-developer-managed:              WordPress + quality hosting

E-COMMERCE:
  Small catalog:  WordPress + WooCommerce
  Large catalog:  Shopify (not covered in this skill — separate platform)

SAAS / WEB APP LANDING PAGE:
  Developer team:      Next.js + Vercel
  Solo founder:        Webflow or Framer
  Designer-led team:   Framer (Figma-like workflow)

PORTFOLIO:
  Developer:      Astro or Next.js (free hosting)
  Designer:       Webflow

MULTILINGUAL LOCAL BUSINESS:
  WordPress + WPML or Polylang plugin (best multilingual support)
  OR: Separate subfolders per language in any platform
```
