---
name: seo-geo
description: >
  Universal SEO (Search Engine Optimization) and GEO (Generative Engine Optimization) skill
  for planning, building, and auditing any website or web app so it ranks on Google AND gets
  cited by AI systems like Google AI Overview, ChatGPT, Perplexity, and Microsoft Copilot.
  Trigger this skill whenever the user mentions: building a website, improving traffic, writing
  web content, planning site structure, adding schema markup, optimizing page speed, targeting
  keywords, ranking on Google, getting found online, setting up a blog, building a landing page,
  creating a business site, wanting AI to recommend their business, auditing an existing site,
  or digital marketing. Also trigger when the user asks about URL structure, metadata, sitemaps,
  robots.txt, Core Web Vitals, internal linking, Topical Map, Semantic SEO, E-E-A-T, backlinks,
  citations, Google Business Profile, local SEO, or multilingual SEO. SEO and GEO decisions
  must be baked in from day one — use this skill proactively even when the user hasn't
  explicitly asked for SEO help.
---

# SEO + GEO Universal Skill

This skill gives Claude a complete, project-type-agnostic framework for building web presence
that ranks on Google Search AND gets cited by AI answer engines. It applies to any niche,
language, or business type.

**Reference files** (read when you reach that phase):
- `technical-seo.md` — Core Web Vitals, robots.txt, sitemaps, canonicalization, Bing
- `schema-library.md` — Ready-to-use Schema markup templates by page type
- `content-writing.md` — SEO + GEO content writing rules and templates
- `platform-guide.md` — Platform selection: Static Site vs WordPress vs Webflow
- `local-seo.md` — Google Business Profile, citations, reviews, Local Pack
- `offpage-seo.md` — Link building, backlinks, competitor gap analysis
- `multilingual-seo.md` — hreflang, language-specific URLs, community keywords
- `community-seo.md` — Reddit, Quora, Facebook Groups, forum SEO strategy

---

## STEP 0: Project Discovery (Always Do This First)

Before writing any code or content, extract these answers from the user. If not provided, ask.

```
1. BUSINESS TYPE
   What kind of website is this?
   → Local service | E-commerce | SaaS/App | Blog/Media | Personal brand | Portfolio | Other

2. TARGET AUDIENCE
   Who is searching for this?
   → Language(s), location(s), age range, level of technical sophistication

3. PRIMARY GOAL
   What does success look like?
   → Phone calls | Form submissions | Product sales | Ad revenue | Email signups | Brand awareness

4. COMPETITORS
   Who is currently ranking for the main keywords?
   → Ask user to name 2–3 competitors, then use the competitor analysis process below

5. PLATFORM
   Has a platform been chosen? If not, read references/platform-guide.md
   → Static (Next.js, Astro) | WordPress | Webflow | Custom

6. CONTENT MANAGER
   Will a non-developer need to update content after launch?
   → Yes → lean toward WordPress or Webflow
   → No → static site is fine

7. TIMELINE / URGENCY
   Is there a deadline tied to a season, launch, or campaign?
   → Affects whether to prioritize quick wins vs long-term architecture

8. GEOGRAPHIC SCOPE
   What area does the business serve?
   → Single city       → prioritize Local Pack; run Phase 7 (Local SEO) in full
   → State / regional  → state-level pillar pages + city cluster pages beneath them;
                         GBP with state-wide service area; Phase 7 applies with adjustments
                         (citations = state associations, not just local directories;
                         Local Pack only triggers on city-level queries, not state queries)
   → Multi-state       → one state pillar page per state; city cluster pages under each;
                         GBP less central — content + backlinks are the primary lever
   → National          → skip Local SEO phase; focus on Topical Map depth and off-page authority

9. MULTILINGUAL
   Does the site need to serve users in multiple languages?
   → Yes → read references/multilingual-seo.md before Phase 2
   → No → skip multilingual phases
```

### Competitor Analysis Process

Once competitors are identified, analyze each one:

```
FOR EACH COMPETITOR:

1. CONTENT AUDIT
   → What topics do they rank for? (Search "[competitor] site:google.com" to see indexed pages)
   → What content format dominates? (Blog posts, landing pages, FAQs, videos)
   → What questions are they NOT answering? → These are your content gaps

2. KEYWORD GAPS
   → Search their primary keywords on Google and note what page types rank
   → Look for keywords where their content is weak (thin, outdated, vague) → your entry points

3. TOPICAL COVERAGE GAPS
   → Are all 4 search intents covered for their main clusters?
   → Where is their topical map thin? → prioritize covering those topics deeply

4. BACKLINK PROFILE (basic)
   → Use free tools: Ahrefs Backlink Checker (free), Moz Link Explorer (free tier)
   → Note: which types of sites link to them? (directories, blogs, press, partners)
   → These site types are your first link-building targets

5. TECHNICAL GAPS
   → Run their site through PageSpeed Insights — if they score low, speed is a differentiator
   → Check if they have schema markup (view-source → search for "application/ld+json")
   → Check if they have FAQ sections (if not, yours will have GEO advantage)
```

Do NOT proceed to Phase 1 until business type, audience, and goal are clear.

---

## PHASE 1: Keyword Research → Topical Map

### Step 1A: Keyword Research (Do This Before Building the Map)

Never build a Topical Map without researching actual search demand first.

**Free tools:**
```
Google Keyword Planner    → Requires Google Ads account (free). Shows monthly search volume.
Google Autocomplete       → Type your seed keyword, note all suggestions. Try A–Z suffixes.
Google "People Also Ask"  → Shows real questions users ask around a topic.
Google Related Searches   → Bottom of SERP. Reveals related angles.
Ubersuggest (free tier)   → Keyword ideas + basic difficulty scores.
Answer The Public         → Question-based keyword ideas (limited free searches).
```

**Paid tools (recommended for serious projects):**
```
Ahrefs or Semrush         → Full keyword difficulty, volume, competitor rankings.
                            Start with their free trials if budget allows.
```

**Keyword evaluation criteria:**
```
VOLUME    → Monthly searches. Any volume > 10/month is worth a page.
DIFFICULTY → How hard it is to rank. Prioritize low-difficulty keywords first.
INTENT    → Does the searcher want info, comparison, or to buy/contact?
BUSINESS VALUE → Even a keyword with 50 searches/month is worth a page
               if each conversion is worth $500.
```

**Keyword clustering process:**
```
1. Start with seed keywords (your main service/product terms)
2. Expand with modifiers: location, price, "near me", "how to", "best", "vs"
3. Group related keywords — pages that share similar intent get combined
4. One primary keyword per page. Related keywords become natural mentions.
5. Map every keyword to one of the 4 search intents (see below)
```

### Step 1B: Topical Map — The Strategic Foundation

A Topical Map is the master blueprint of every topic the website must cover to be seen as an
authority in its niche. This is the single most important strategic decision in any SEO project.

#### Why It Matters
Google ranks websites that demonstrate **Topical Authority** — depth of knowledge across an
entire subject — over websites that only target a few keywords. AI systems (for GEO) also
prefer to cite sources that comprehensively cover a topic.

#### Universal 4-Tier Structure

```
TIER 1 — PILLAR (1 per major theme)
  The broadest, highest-volume keyword that defines the site's core topic.
  Becomes the main category page.

  └── TIER 2 — CLUSTER BY CATEGORY (3–8 per pillar)
        Major sub-topics or product/service lines under the pillar.
        Each becomes an independent pillar page of its own.

        └── TIER 3 — CLUSTER BY INTENT (5–15 per tier-2 cluster)
              Pages targeting specific search intents within each category.
              See intent matrix below.

              └── TIER 4 — SEMANTIC SUPPORT (2–6 per tier-3 page)
                    FAQ pages, how-to guides, comparison articles, glossary terms.
                    Answers the long-tail questions surrounding each topic.
```

#### The 4 Search Intents — Every Cluster Must Cover All 4

| Intent | User's mental state | Query pattern | Best page type |
|---|---|---|---|
| **Informational** | Learning, researching | "what is X", "how does X work", "history of X" | Blog post, guide, glossary |
| **Commercial** | Comparing before deciding | "X vs Y", "best X for Z", "X review" | Comparison, listicle |
| **Transactional** | Ready to act | "buy X", "X price", "X near me", "hire X" | Landing page, product page |
| **Navigational** | Looking for a specific brand/place | "X brand official", "X Houston" | Brand + location page |

**Rule:** A niche is fully covered when every tier-3 page has content for all 4 intents.
Missing even one intent = traffic left for competitors.

#### How to Build the Topical Map for Any Project

1. **Identify the Pillar keyword** — the broadest term that defines the entire site
2. **List all categories** under that pillar (products, services, topics, locations)
3. **For each category**, brainstorm all the questions a user might ask across all 4 intents
4. **Group questions** into logical pages (each page = one primary keyword + related questions)
5. **Map the hierarchy** — which pages link to which, which page is the authority for each topic

#### Output Format
Always produce the Topical Map as a tree before creating any files:

```
[PILLAR]: /main-topic/
├── [CLUSTER]: /category-1/
│   ├── [INFO]:    /what-is-category-1/
│   ├── [COMM]:    /best-category-1-for-x/
│   ├── [TRANS]:   /buy-category-1/
│   └── [NAV]:     /category-1-brand-city/
├── [CLUSTER]: /category-2/
│   └── ...
```

---

## PHASE 2: URL Architecture

### Rules (Universal — Apply to Any Platform)

```
✅ Always lowercase
✅ Hyphens between words (never underscores)
✅ Primary keyword in the URL slug
✅ Folder structure mirrors the Topical Map hierarchy
✅ Keep slugs under 60 characters
✅ Human-readable — a user should understand the page topic from the URL alone

❌ Never use: capital letters, underscores, special characters, ID numbers
❌ Never use: dynamic parameters for content pages (?id=45, ?page=2)
❌ Never change a live URL without setting a 301 redirect
```

### URL Pattern by Page Type

```
Pillar page:      /main-topic/
Cluster page:     /main-topic/sub-category/
Support page:     /main-topic/sub-category/specific-question/
Blog post:        /blog/topic-keyword/
Location page:    /service-city-state/
Product page:     /products/product-name/
Language variant: /vi/main-topic/   or   /es/main-topic/
```

---

## PHASE 3: On-Page SEO — Per-Page Checklist

Apply to every page created. Read `references/content-writing.md` for full writing guidelines.

### Metadata

```
TITLE TAG
- Format: [Primary Keyword] | [Brand] or [Primary Keyword] — [Value Prop]
- Length: 50–60 characters
- Must contain primary keyword, preferably near the front
- No keyword stuffing — write for humans first

META DESCRIPTION
- Length: 140–160 characters
- Include primary keyword naturally
- Include a clear value proposition
- End with a soft call to action
- Does NOT directly affect rank but directly affects click-through rate (CTR)
```

### Heading Hierarchy

```
H1:  One per page. Primary keyword. States exactly what the page is about.
H2:  Major sections. Use secondary keywords and question formats.
H3:  Sub-sections. Long-tail keywords, FAQ questions, feature breakdowns.
H4+: Use sparingly, only for genuinely complex nested content.
```

### Featured Snippet Optimization (Position Zero)

Featured snippets are the boxed answers above organic results. Winning them also increases
GEO citation likelihood. Structure content to target them:

```
PARAGRAPH SNIPPET (definition questions: "what is X"):
  → H2: "What Is [Term]?"
  → Answer in the next 40–60 words. First sentence = definition. Second = why it matters.

LIST SNIPPET ("how to X", "steps to X", "X tips"):
  → Use a numbered or bulleted list immediately under the H2
  → Keep each item under 10 words
  → 4–8 items is the sweet spot

TABLE SNIPPET (comparisons, pricing, specifications):
  → Use an HTML <table> with clear headers
  → Google often extracts tables directly into featured snippets

RULE: Answer the question in the fewest words possible, immediately after the H2.
Don't bury the answer three paragraphs in.
```

### Image Optimization

```
File name:  descriptive-keyword-phrase.webp (not IMG_0045.jpg)
Alt text:   Describe the image naturally, include keyword if relevant
Format:     WebP preferred, JPEG acceptable, PNG for graphics with transparency
Size:       Compress to under 150KB per image
Dimensions: Always set width + height attributes in HTML to prevent CLS
```

### Content Length Guidelines

```
Pillar page:      2,000–4,000 words
Cluster page:     800–1,500 words
Support/FAQ page: 400–800 words
Landing page:     600–1,200 words (conversion-focused, not length-focused)
```

---

## PHASE 4: Technical SEO

Read `references/technical-seo.md` for full implementation details.

### Core Web Vitals — Quick Reference

| Metric | What it measures | Target | Primary fix |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | How fast the biggest element loads | < 2.5s | Compress images, use CDN, preload hero image |
| **CLS** (Cumulative Layout Shift) | Does content jump around while loading | < 0.1 | Set image dimensions, reserve ad space |
| **INP** (Interaction to Next Paint) | How fast page responds to clicks | < 200ms | Minimize JavaScript, remove heavy third-party scripts |

### Technical Must-Haves (Every Project)

```
☐ robots.txt — Allow crawling of content pages, block admin/cart/staging
☐ sitemap.xml — All canonical URLs listed, submitted to Google Search Console
☐ Canonical tags — Every page declares its own canonical to avoid duplicate content
☐ HTTPS — SSL required (free via Let's Encrypt)
☐ Mobile-first — Google indexes mobile version; always test on mobile first
☐ 404 page — Custom page with navigation, not a blank error
☐ 301 redirects — Any moved or deleted page must redirect to its replacement
☐ Google Search Console — Verified and monitoring from day one
☐ Bing Webmaster Tools — Verified and sitemap submitted (powers ChatGPT browsing + Copilot)
```

---

## PHASE 5: Schema Markup (SEO + GEO Bridge)

Schema markup is structured data in JSON-LD format that tells Google and AI systems exactly
what your content means. **This is the #1 technical factor for GEO (AI citation).**

Read `references/schema-library.md` for ready-to-use templates for:
- Organization / LocalBusiness
- Article / BlogPosting
- FAQPage (most important for AI Overview)
- Product / Offer
- BreadcrumbList
- Person / ProfessionalService
- HowTo
- Event
- VideoObject

### Schema Priority by Project Type

```
Local service business:  LocalBusiness + FAQPage + BreadcrumbList
E-commerce:              Product + Offer + BreadcrumbList + FAQPage
Blog / Content site:     Article + FAQPage + BreadcrumbList + Organization
SaaS / App:              SoftwareApplication + FAQPage + Organization
Personal brand:          Person + Article + FAQPage
Portfolio:               Person + CreativeWork + BreadcrumbList
```

---

## PHASE 6: GEO — Generative Engine Optimization

GEO = making your content the source AI systems cite when answering questions in your niche.

### AI Systems and Their Citation Sources

```
GOOGLE AI OVERVIEW
  → Pulls from pages Google already ranks highly in its index
  → Schema (especially FAQPage) heavily influences extraction
  → Best lever: rank well + add FAQPage schema + answer questions directly

CHATGPT (browsing mode) + MICROSOFT COPILOT
  → Both use Bing's index as the primary source
  → Set up Bing Webmaster Tools and submit your sitemap there
  → Content that ranks on Bing gets cited by ChatGPT browsing and Copilot
  → Same content principles apply: direct answers, fact density, entity clarity

PERPLEXITY
  → Uses multiple indexes (Google, Bing, its own crawler)
  → Strongly prefers content with cited sources and specific facts
  → Outbound links to authoritative sources (IRS.gov, government sites, etc.)
    increase the chance Perplexity uses your content as a relay

CLAUDE / ANTHROPIC (AI assistants)
  → Training data cutoff applies — real-time citation varies by product version
  → Focus on Google and Bing ranking; Claude with web access follows similar patterns
```

### What AI Systems Look for When Choosing Sources

```
1. FACT DENSITY
   Specific, verifiable data > vague claims
   ❌ "Prices vary depending on the service"
   ✅ "Services start at $X for basic, $Y for standard, $Z for premium"

2. DIRECT QUESTION ANSWERING
   Answer the question in the first 1–2 sentences of every section
   AI extracts the most direct answer, not the most eloquent one

3. Q&A CONTENT FORMAT
   Explicitly write questions as headings and answer them directly below
   This is the format AI systems are trained to extract from

4. ENTITY CLARITY
   Consistent NAP (Name, Address, Phone) across every page
   Clear "About" information — who runs this, what do they do, where are they
   Verified Google Business Profile (for local businesses)

5. TOPICAL DEPTH
   A site answering 50 related questions beats a site answering 1 question perfectly
   This is why Topical Map (Phase 1) is the foundation of GEO

6. EXTERNAL CITATIONS
   Content other sites link to or reference signals trustworthiness to AI
```

### GEO Writing Rules (Apply to Every Page)

```
Rule 1: Define key terms explicitly at the top of the page
        AI uses these definitions as authoritative citations

Rule 2: Use specific numbers — quantities, prices, dates, percentages
        Vague language is never cited; specific data always is

Rule 3: Include location-specific data for local businesses
        City, zip code, landmarks, service radius — all increase local GEO signals

Rule 4: Structure content with clear semantic sections
        H2 = topic, first paragraph under H2 = direct answer

Rule 5: Add a dedicated FAQ section to every page
        Mark it up with FAQPage schema (see references/schema-library.md)
        These FAQ entries are the most commonly extracted by AI Overview

Rule 6: Link out to authoritative external sources
        IRS.gov, state agencies, government sites, academic institutions
        This signals to Perplexity and other AI systems that your content is reliable
```

### Zero-Click Search Strategy

AI Overviews answer user questions directly on the SERP — users see the answer without
clicking through to your site. This is not a threat; it is a brand visibility opportunity
if your site is the source being cited.

#### When to Optimize for Clicks vs Visibility

```
OPTIMIZE FOR VISIBILITY (zero-click — brand awareness):
  → Definition queries: "What is X?" — ensure your brand name appears in the answer
  → Quick-fact queries: AI will cite your data, users see your brand
  → Top-of-funnel informational content
  → MEASURE: branded search volume increase, Share of Voice

OPTIMIZE FOR CLICKS (traffic — conversion):
  → Deep comparison guides (AI cannot summarize the full depth)
  → Interactive tools, calculators, personalized recommendations
  → Original research with complex data tables
  → Multi-step processes requiring visual aids
  → MEASURE: CTR, conversion rate, time on page

STRATEGIC RULE:
  Not every page needs clicks. Top-of-funnel pages build brand visibility.
  Bottom-of-funnel pages drive conversions. Optimize each accordingly.
```

#### New KPIs for the AI Search Era

```
TRACK THESE ALONGSIDE TRADITIONAL METRICS:
  ☐ Citation Frequency — how often your brand appears in AI-generated answers
  ☐ AI Mention Share — your visibility vs competitors within AI responses
  ☐ Branded Search Volume — users searching your brand name directly
      (this increases when AI citations build brand awareness)
  ☐ Share of Voice — % of target queries where your content is cited
  ☐ Contextual Sentiment — how AI systems describe your brand when mentioning it
```

### Query Fan-Out Strategy

AI engines break complex user questions into multiple sub-queries, then find the best
source for EACH sub-query independently. Sites that answer multiple sub-queries from
a single topic cluster have a higher probability of being cited.

```
EXAMPLE:
  User asks: "Should I get life insurance if I'm on an H-1B visa?"

  AI decomposes into sub-queries:
    → "Can H-1B visa holders get life insurance?"
    → "Best life insurance for immigrants"
    → "Life insurance eligibility requirements US"
    → "H-1B visa financial planning"

STRATEGY:
  → Create pillar content answering the main question
  → Create cluster pages answering EACH sub-query individually
  → Internal link all cluster pages back to the pillar
  → Result: your site is cited for multiple sub-queries = higher citation probability

HOW TO IDENTIFY SUB-QUERIES:
  → Type the main question into Google → check "People Also Ask" → those are sub-queries
  → Ask ChatGPT: "What are all the related questions someone might have about [topic]?"
  → Check Google Autocomplete with A-Z suffix variations
  → Each sub-query = one potential cluster page in your Topical Map
```

---

## PHASE 7: Local SEO

For any business with a geographic component — local, regional, statewide, or multi-state.
Local Pack (the map + 3 listings) and organic results have different ranking factors.
How much of this phase applies depends on geographic scope (see Step 0).

Read `references/local-seo.md` for full implementation details.

### Local SEO vs Organic SEO

```
ORGANIC SEO         → Targets Google's 10 blue links
                      Ranking factors: content quality, backlinks, technical SEO
                      Timeline: 3–6 months minimum

LOCAL PACK SEO      → Targets the map + 3 business listings
                      Ranking factors: GBP completeness, review count/recency, proximity
                      Timeline: 4–8 weeks with active GBP management
                      Note: Local Pack only triggers on city-level queries ("tax preparer Houston")
                      — state-level queries ("tax preparer Texas") return only organic results
```

### Phase 7 by Geographic Scope

```
SINGLE CITY:
  → Run this phase in full — GBP + citations + reviews + city content pages

STATE / REGIONAL:
  → GBP: set service area to the full state; still valuable for city-level Local Pack
  → Citations: prioritize state-level associations and chambers over neighborhood directories
    (Texas Society of CPAs, Texas Chamber of Commerce, state licensing boards)
  → Content: state pillar page (/tax-preparation-texas/) → city cluster pages beneath it
  → Reviews: same strategy — reviews help city-level Pack appearances across the state

MULTI-STATE / NATIONAL:
  → GBP: less central — only relevant if you have a physical office location
  → Skip local citations; focus on industry/national directories instead
  → Content: one state pillar page per state you target; city pages optional
  → Off-page authority (Phase 9) becomes the primary geographic ranking signal
```

### Local SEO Must-Haves (adapt to scope above)

```
☐ Google Business Profile — verified, all fields complete, photos added weekly
☐ NAP consistency — Name, Address, Phone identical across site + GBP + all directories
☐ Primary citations — Yelp, BBB, Angi, Yellow Pages, Bing Places, Apple Maps
☐ Geographic citations — local/state directories relevant to your service area
☐ Industry citations — niche directories relevant to your business type
☐ Review strategy — process for asking, timing, and responding to reviews
☐ Geographic content — city or state-specific pages in the Topical Map
```

---

## PHASE 8: Internal Linking

Every page must give AND receive links. No orphan pages ever.

### Link Flow (Mirrors Topical Map Hierarchy)

```
Pillar page     ← receives links from ALL cluster pages
Cluster page    ← receives links from pillar + all support pages under it
Support page    ← receives links from its parent cluster + related support pages
```

### Anchor Text Rules

```
✅ Descriptive: "see our tax preparation pricing"
✅ Keyword-natural: "learn about IUL life insurance"
❌ Generic: "click here", "read more", "learn more"
❌ Over-optimized: identical exact-match anchor on every link to the same page
```

### Minimum Link Requirements Per Page

```
Every page should GIVE links to:      3–5 related pages
Every page should RECEIVE links from: 2–3 other pages minimum
```

---

## PHASE 9: Off-Page SEO — Link Building

Read `references/offpage-seo.md` for full implementation details.

Backlinks remain one of Google's strongest ranking signals. A page with great content but
no backlinks will be outranked by a page with decent content and strong backlinks.

### The Core Principle

```
QUALITY > QUANTITY
One link from a relevant, authoritative site outweighs 100 links from irrelevant directories.
Relevance (same niche) + Authority (well-established site) + Placement (in-content, not footer)
```

### Link Building by Business Type

```
LOCAL SERVICE BUSINESS:
  Priority 1: Local citations (Phase 7) — these are links + NAP consistency
  Priority 2: Local chamber of commerce membership (link from local authority site)
  Priority 3: Sponsoring local events, charities, or community organizations (they link back)
  Priority 4: Local press — pitch story angles to local news sites

BLOG / CONTENT SITE:
  Priority 1: Guest posting on relevant industry blogs
  Priority 2: Original research or data that other sites reference and link to
  Priority 3: Resource page link building (find "resources" pages in your niche, pitch inclusion)

ANY BUSINESS:
  Priority 1: Supplier/partner links (mutual links from vendors, partners, associations)
  Priority 2: Unlinked brand mentions — find where your brand is mentioned without a link, ask for one
```

### Red Flags — Links to Avoid

```
❌ Paid links (against Google guidelines — can cause manual penalty)
❌ Link farms or Private Blog Networks (PBNs)
❌ Irrelevant directory spam
❌ Links from sites with no real content or traffic
❌ Exact-match anchor text on every backlink (over-optimization signal)
```

---

## PHASE 10: E-E-A-T — Trust Signals

E-E-A-T = Experience, Expertise, Authoritativeness, Trustworthiness.
These signals tell Google the content is written by real, qualified people.

### Implementation by Business Type

```
ALL SITES:
  ☐ About page — real person or team, background, why they're qualified
  ☐ Contact page — real address, phone, email (not just a form)
  ☐ Privacy Policy + Terms of Service pages
  ☐ HTTPS (covered in technical SEO)

LOCAL BUSINESS:
  ☐ Google Business Profile — verified, complete, photos added
  ☐ Consistent NAP across site, GBP, Yelp, directories
  ☐ Real customer reviews linked or embedded

PROFESSIONAL SERVICES (tax, legal, insurance, medical):
  ☐ License numbers displayed
  ☐ Credentials and certifications listed
  ☐ Author bio with credentials on every article
  ☐ Disclaimer text where legally appropriate

BLOG / CONTENT SITE:
  ☐ Author profile photo + bio on every post
  ☐ Date published + date last updated on every post
  ☐ Sources cited with outbound links to authoritative sites
```

---

## PHASE 11: Multilingual SEO

For sites serving users in multiple languages. Read `references/multilingual-seo.md` for
full implementation details.

### Quick Rules

```
☐ Separate URL per language — never serve translations on the same URL
☐ hreflang tags in <head> of every language version
☐ Translate ALL SEO elements — title, meta, alt text, schema, URL slugs
☐ Research keywords in the target language — don't just translate English keywords
☐ Native language URL slugs — /vi/dich-vu-khai-thue/ not /vi/tax-preparation/
```

---

## PHASE 12: Measurement — What to Track and When

### Tools to Set Up on Day One

```
Google Search Console (free)
  → Tracks impressions, clicks, average position, indexing errors
  → Submit sitemap here
  → Set up immediately, takes ~1 week to show first data

Bing Webmaster Tools (free)
  → Parallel to Google Search Console for Bing index
  → Submit sitemap — Bing's index powers ChatGPT browsing and Microsoft Copilot
  → Set up alongside Google Search Console

Google Analytics 4 (free)
  → Tracks traffic sources, user behavior, conversions
  → Set up conversion goals (form fills, calls, purchases)

Google PageSpeed Insights (free)
  → Measures Core Web Vitals
  → Test both mobile and desktop
  → Target score: 90+ on mobile
```

### Key Metrics by Phase

```
MONTHS 1–2 (Technical foundation):
  → Indexing coverage (are all pages getting indexed in Google AND Bing?)
  → Core Web Vitals scores
  → No crawl errors in Search Console or Bing Webmaster Tools

MONTHS 2–4 (Content building):
  → Impressions growing (even before clicks — means Google is seeing the content)
  → Number of keywords ranking in top 20
  → Average position improving
  → Local Pack appearances (for local businesses)

MONTHS 4–6+ (Authority building):
  → Clicks growing
  → CTR (click-through rate) above 3% average
  → Keywords moving from top 20 → top 10 → top 5
  → AI Overview citations appearing for target queries
  → ChatGPT / Copilot citations (search Bing for your queries to verify)

GEO / AI CITATION MEASUREMENT:
  → Traditional metrics (clicks, rankings) no longer capture full value
  → AI Overviews create "zero-click" brand impressions that don't show in GA4

  HOW TO TRACK AI CITATIONS:
    ☐ Google AI Overview: Search your target queries → check if your site is cited
    ☐ ChatGPT: Ask target questions in your niche → check if your info appears
    ☐ Perplexity: Search target queries → check sources list for your domain
    ☐ Microsoft Copilot: Search target queries → check citations
    ☐ Ahrefs / Semrush: Track "SERP features" column → monitor AI Overview presence

  MONTHLY AI CITATION AUDIT:
    1. List your top 20 target queries
    2. Search each on Google, ChatGPT, Perplexity, Copilot
    3. Record: Query | Google AIO cited? | ChatGPT cited? | Perplexity cited?
    4. Track trends month-over-month
    5. Identify queries where competitors are cited but you're not → content gaps

  NEW KPIs TO REPORT:
    ☐ Citation Frequency — how often brand appears in AI answers
    ☐ AI Mention Share — your citations vs competitor citations
    ☐ Branded Search Volume trend — GSC → filter by brand name queries
    ☐ Share of Voice — % of target queries where you're the cited source
```

---

## Quick-Start Checklist (For Any New Project)

Use this to confirm nothing is skipped before launch:

```
RESEARCH
  ☐ Keyword research completed (search volume, difficulty, intent mapped)
  ☐ Competitor analysis done (content gaps, backlink types identified)
  ☐ Topical Map documented
  ☐ 4 intents covered for each cluster
  ☐ URL structure defined and approved
  ☐ Multilingual requirements identified (if applicable)

ON-PAGE
  ☐ Title tags written for all pages (50–60 chars)
  ☐ Meta descriptions written (140–160 chars)
  ☐ H1 on every page, heading hierarchy correct
  ☐ Featured snippet targets identified (questions → structured answers)
  ☐ Images compressed, named, alt text added

TECHNICAL
  ☐ robots.txt live and correct
  ☐ sitemap.xml generated and submitted to Google + Bing
  ☐ Canonical tags on every page
  ☐ HTTPS active
  ☐ Mobile tested
  ☐ PageSpeed score 90+ mobile
  ☐ Google Search Console verified
  ☐ Bing Webmaster Tools verified

SCHEMA
  ☐ Organization or LocalBusiness on all pages
  ☐ Page-type schema on all key pages
  ☐ FAQPage schema on content pages
  ☐ BreadcrumbList on all pages except homepage
  ☐ VideoObject on pages embedding videos (if applicable)
  ☐ Speakable schema on pages with key definitions and FAQ answers

GEO
  ☐ FAQ section on every content page
  ☐ Specific facts/numbers in all content
  ☐ Entity info consistent across all pages
  ☐ Outbound links to authoritative sources on key pages
  ☐ Google Business Profile verified (local businesses)
  ☐ Zero-click strategy defined (which pages optimize for visibility vs clicks)
  ☐ Video content planned for high-intent "how-to" queries

LOCAL SEO (local businesses only)
  ☐ GBP fully complete — categories, services, photos, hours
  ☐ Apple Business Connect profile complete (business.apple.com)
  ☐ Primary citations submitted (Yelp, BBB, Angi, Yellow Pages, Bing Places)
  ☐ NAP consistent across all platforms
  ☐ Review request process in place

OFF-PAGE
  ☐ Initial link targets identified (local citations, partners, chamber)
  ☐ Outreach plan drafted for first 10 backlinks
  ☐ Community platforms identified (Reddit, Quora, Facebook Groups)
  ☐ Social profiles set up with consistent NAP
  ☐ Open Graph + Twitter Card meta tags on all pages

MULTILINGUAL (if applicable)
  ☐ Separate URLs per language
  ☐ hreflang tags implemented
  ☐ All SEO elements translated (title, meta, alt text, schema)

TRUST
  ☐ About page complete
  ☐ Contact page with real info
  ☐ Privacy Policy + Terms pages present
  ☐ Credentials/licenses displayed (professional services)

MEASUREMENT
  ☐ Google Search Console connected
  ☐ Bing Webmaster Tools connected
  ☐ Google Analytics 4 connected
  ☐ Conversion goals configured
  ☐ Monthly AI citation audit process set up (Google AIO, ChatGPT, Perplexity, Copilot)
  ☐ Content decay monitoring cadence established
```
