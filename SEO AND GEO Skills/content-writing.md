# SEO + GEO Content Writing Guide

Rules and templates for writing content that ranks on Google AND gets cited by AI systems.
Read this file when writing or reviewing any content for a website.

---

## The Core Principle

Write for three readers simultaneously:
1. **The human user** — scannability, clear answers, useful information
2. **Google's crawler** — keyword signals, heading structure, internal links
3. **AI answer engines** — fact density, direct answers, entity clarity

Content that satisfies all three ranks higher, gets cited more, and converts better.

---

## Page Structure Template (Universal)

Every content page should follow this structure:

```
[H1: Primary keyword — exactly what this page is about]

[Opening paragraph — 2–3 sentences]
 → Answer the main question immediately
 → Include primary keyword naturally in first 100 words
 → State who this page is for and what they'll learn

[H2: Major Section 1]
[H3: Sub-topic or question]
Content...

[H2: Major Section 2]
...

[H2: Frequently Asked Questions]
[H3: Question 1?]
Direct answer...
[H3: Question 2?]
Direct answer...

[H2: Conclusion or Call to Action]
Summary + next step for the reader
```

---

## Opening Paragraph Rules

The opening paragraph is the most important content on any page.
Google and AI systems both weight it heavily.

```
✅ DO:
- Answer the page's main question within the first 2 sentences
- Include the primary keyword naturally in the first sentence
- State a specific fact, number, or claim immediately
- Be direct — skip preamble and wind-up

❌ DON'T:
- Start with "In today's world..." or "Many people wonder..."
- Ask a rhetorical question as the first sentence
- Repeat the page title word for word
- Use passive voice in the opening
```

**Template:**
```
[Primary keyword] is [direct definition or answer]. [Specific supporting fact with number
or detail]. This guide covers [what the page covers] so you can [benefit to reader].
```

**Example (Tax preparation):**
```
Tax preparation services in Houston cost between $60 and $400 depending on return
complexity. Basic W-2 returns typically take 30–60 minutes to complete, while returns
with self-employment income, rental properties, or business deductions require more time.
This guide explains what to expect, how to prepare, and how to choose the right preparer.
```

---

## Keyword Usage Rules

```
PRIMARY KEYWORD
- Include in: Title tag, H1, first 100 words, at least one H2, meta description, URL
- Frequency: Appears naturally 3–5 times per 1,000 words — do not force it
- Never: Stuff the keyword into every sentence (Google penalizes this)

SECONDARY KEYWORDS
- Related terms and synonyms — use them throughout the body naturally
- LSI keywords (Latent Semantic Indexing) — related concepts Google expects to see
  Example: A page about "tax preparation" should also mention: IRS, W-2, 1099,
  refund, deduction, filing deadline, PTIN — even if not targeted separately

LONG-TAIL KEYWORDS
- Natural question phrases: "how much does X cost in Houston"
- Use as H3 headings in FAQ sections
- Answer them directly in 2–4 sentences
```

---

## Heading Writing Rules

```
H1 — One per page, contains primary keyword, states the exact topic
     NOT: "Welcome to Our Services"
     YES: "Tax Preparation Services in Houston — Affordable, Accurate, Fast"

H2 — Major topic sections, contains secondary keywords, can be questions
     NOT: "Our Process"
     YES: "How Our Tax Preparation Process Works"
     YES: "What Documents Do You Need to File Your Taxes?"

H3 — Sub-topics under H2, ideal for FAQ questions, long-tail keywords
     NOT: "More Info"
     YES: "How Much Does Tax Preparation Cost in Houston?"
     YES: "What's the Difference Between a W-2 and a 1099?"
```

---

## GEO Content Rules — Writing for AI Citation

These rules specifically increase the chances that AI systems cite your content.

### Rule 1: Lead With the Answer
AI extracts the first complete answer it finds. Put the answer before the explanation.

```
❌ Explanation-first (AI skips this):
"When considering the various factors that affect the cost of filing taxes,
including income complexity, number of forms, and preparer experience, the
price can range quite a bit depending on your specific situation."

✅ Answer-first (AI cites this):
"Tax preparation in Houston costs $60–$180 for personal returns. W-2-only
returns start at $60. Returns with self-employment income or multiple 1099s
cost $120–$180."
```

### Rule 2: Quantify Everything Possible

| Instead of | Write |
|---|---|
| "affordable prices" | "starting at $60" |
| "quick turnaround" | "completed same day for most returns" |
| "serving Houston" | "serving Houston, Sugar Land, Stafford, and Pearland" |
| "many years of experience" | "licensed since 2019 with PTIN and EFIN" |
| "open most days" | "open Monday–Saturday, 9am–6pm" |

### Rule 3: Define Key Terms on First Use

AI systems are trained to extract definitions. When you define a term clearly,
AI cites your definition when users ask "what is X."

```
Example:
"An EFIN (Electronic Filing Identification Number) is a 6-digit code issued by
the IRS that authorizes a tax preparer to electronically file returns on behalf
of clients. Only preparers with a valid EFIN can file taxes electronically."
```

### Rule 4: Use Entity-Dense Language

Include all relevant entity names — business name, city, state, credentials,
products/services by exact name. AI builds a knowledge graph from entities.

```
✅ Entity-rich:
"Manna One Solution, based in Houston TX, offers tax preparation services for
Vietnamese and Spanish-speaking clients in Harris County. Our PTIN-registered
preparer files federal and Texas state returns."

❌ Entity-poor:
"We offer tax services for the local community with qualified staff."
```

### Rule 5: Write FAQ Sections on Every Page

FAQ sections are the #1 most extracted content by AI Overview.
Every FAQ answer must:
- Start with a direct answer (not "It depends")
- Contain at least one specific fact (number, location, time, credential)
- Be 2–5 sentences — long enough to be complete, short enough to be extractable

---

## Featured Snippet Optimization (Position Zero)

Featured snippets appear above all organic results. Winning one can 2–3x your click-through
rate. The same structure that wins featured snippets also gets cited by AI systems.

### Types and How to Win Each

```
PARAGRAPH SNIPPET — "What is X?" / "What does X mean?"
  → Write a 40–60 word definition paragraph immediately after an H2 question heading
  → Format: [Term] is [definition]. [One supporting sentence]. [One implication sentence].
  → Don't pad — Google extracts the tightest, most direct answer

LIST SNIPPET — "How to X" / "Steps to X" / "Best X for Y"
  → Use an H2 question heading ("How Do You File Taxes for the First Time?")
  → Immediately follow with a numbered or bulleted list
  → Each item: 5–10 words — clear and action-oriented
  → 4–8 items is Google's preferred range for list snippets
  → Add a paragraph below the list for full explanation — Google shows the list, humans read the detail

TABLE SNIPPET — comparisons, pricing tiers, specifications
  → Use a proper HTML <table> with <th> headers
  → 2–5 columns, 3–8 rows is the sweet spot
  → Label columns clearly ("Service", "Price", "Turnaround", "Best For")
  → Google extracts tables nearly verbatim — accuracy is critical

VIDEO SNIPPET — "How to X" (visual/procedural topics)
  → Embed a YouTube video on the page
  → Add VideoObject schema (see references/schema-library.md)
  → Include a text transcript below the embed — Google uses this for extraction
```

### Snippet-Targeting Content Checklist

```
☐ Identified the specific snippet format for each target query
☐ H2 heading is phrased exactly as the user would ask the question
☐ Answer begins in the first sentence after the H2 — not buried in paragraphs
☐ Paragraph answers are 40–60 words
☐ List items are 5–10 words each
☐ Tables have clear headers and accurate data
☐ Content matches what's already showing as a featured snippet (if one exists)
   — to steal a snippet, your answer must be more direct and specific than the current winner
```

---

## Content Length and Depth Guidelines

### When to Write Long vs Short

```
WRITE LONG (1,500–4,000 words) when:
- The page is a Pillar page competing against established sites
- The topic genuinely requires depth (process, comparison, guide)
- Multiple related questions can be answered on the same page

WRITE CONCISE (400–900 words) when:
- The page answers one specific question
- The topic is a transaction (pricing, booking, contact)
- The user intent is clear and narrow
```

### How to Increase Content Depth Without Padding

```
Add depth by including:
✅ Specific examples with real numbers
✅ Step-by-step processes
✅ Comparison tables (X vs Y)
✅ Common mistakes and how to avoid them
✅ Definitions of jargon
✅ Frequently asked questions
✅ Local-specific information (city, neighborhood, language)

Never add depth by:
❌ Repeating the same point in different words
❌ Adding transition paragraphs with no information
❌ Restating the introduction at the end
❌ Adding quotes just to add quotes
```

---

## Writing for Multilingual SEO

When targeting non-English speakers, apply these additional rules:

```
1. SEPARATE PAGES PER LANGUAGE (not just translated text on same URL)
   /en/tax-preparation/
   /vi/dich-vu-khai-thue/     ← Vietnamese
   /es/preparacion-de-impuestos/ ← Spanish

2. hreflang tags in <head> of each language version:
   <link rel="alternate" hreflang="en" href="https://site.com/en/tax-preparation/">
   <link rel="alternate" hreflang="vi" href="https://site.com/vi/dich-vu-khai-thue/">
   <link rel="alternate" hreflang="es" href="https://site.com/es/preparacion-de-impuestos/">
   <link rel="alternate" hreflang="x-default" href="https://site.com/tax-preparation/">

3. TRANSLATE FULLY — not just the body text:
   - Title tags
   - Meta descriptions
   - Image alt text
   - Schema markup (name, description, FAQ answers)
   - URL slugs (use native language words, not transliterated English)

4. TARGET COMMUNITY-SPECIFIC KEYWORDS:
   - Vietnamese users often search in Vietnamese + English mixed
   - Research actual search queries in the target language using Google Autocomplete
     in that language setting
   - Include both: "khai thuế Houston" and "tax preparation Houston tiếng Việt"
```

---

## Internal Linking Content Rules

When writing content, build internal links naturally:

```
LINK WHEN:
- You mention a topic that has its own page on the site
- You reference a service, product, or location that has a dedicated page
- You use a term that is explained in more depth elsewhere

ANCHOR TEXT:
✅ "learn more about our tax preparation pricing" (descriptive)
✅ "life insurance options in Houston" (keyword-natural)
❌ "click here" (meaningless)
❌ "this page" (meaningless)
❌ Using the exact same keyword anchor every single time to the same page

LINK PLACEMENT:
- Link on first mention of a topic, not every mention
- Place links within the body text, not just at the end
- 3–5 outbound internal links per page is healthy
```

---

## Content Freshness & Decay Management

Google rewards content that is actively maintained. Content that once ranked well but
stops being updated will gradually lose position — this is called "content decay."

```
UPDATE THESE ON A SCHEDULE:
- Pricing information → review every 3 months
- Statistics and data → update annually or when new data is published
- "Best of" lists → review semi-annually
- How-to guides → review when process changes
- FAQ sections → add new questions from "People Also Ask" quarterly

ADD "Last Updated" DATE to all content pages:
<time datetime="2026-03-01">Last updated: March 2026</time>

Also update dateModified in Article schema when you update content.
```

### Content Decay Detection

Content decay = a page that previously ranked well but is losing rankings/traffic
over time. Detecting it early prevents losing positions to competitors.

```
HOW TO DETECT CONTENT DECAY:
  1. Google Search Console → Performance → filter by page
  2. Compare "Clicks" for last 28 days vs previous 28 days
  3. Pages with > 20% decline in clicks → flagged for refresh
  4. Also check: pages that dropped from top 10 to top 20 position

CONTENT REFRESH PROCESS:
  1. Check if search intent has changed
     → Google the query — do different page types now rank? (video vs article vs list)
     → If intent shifted, restructure the page to match new intent
  2. Update all facts, prices, dates, statistics
  3. Add FAQ section if missing (or add new questions to existing FAQ)
  4. Add new H2/H3 headings for questions from "People Also Ask"
  5. Improve opening paragraph with more specific, current data
  6. Update dateModified in Article schema
  7. Re-submit URL in Google Search Console → URL Inspection → Request Indexing
  8. Share updated page on social media for fresh engagement signals

AUDIT CADENCE:
  → Monthly: check top 20 highest-traffic pages in GSC for decay signals
  → Quarterly: full content audit across all indexed pages
  → Annually: complete Topical Map review + competitor gap analysis refresh
```

---

## E-E-A-T Content Signals

Write content that demonstrates real experience and expertise:

```
EXPERIENCE signals (show you've done it):
- "In our experience processing [X] returns..."
- "Clients often ask us about..."
- "A common mistake we see is..."

EXPERTISE signals (show you know it):
- License numbers, certifications mentioned naturally
- Technical terminology used correctly
- Nuanced explanations, not just surface-level info

AUTHORITATIVENESS signals (show others recognize you):
- Link to authoritative external sources (IRS.gov, ssa.gov, state agencies)
- Mention any press, partnerships, or affiliations
- Display credentials and affiliations

TRUSTWORTHINESS signals (show you're reliable):
- Consistent NAP (name, address, phone) across all pages
- Transparent pricing (ranges are fine, "call for pricing" hurts trust)
- Clear disclosure of what you can and cannot do legally
```

---

## AI-Assisted Content Guidelines

Google does NOT penalize content created with AI assistance. Google penalizes content
that lacks value — regardless of whether AI or a human wrote it. The key is using AI
as a tool, not a replacement for expertise.

```
SAFE AI USAGE:
  ✅ Use AI to generate draft outlines and structure
  ✅ Use AI to brainstorm FAQ questions and heading ideas
  ✅ Use AI to draft initial content → then human edits, adds experience, fact-checks
  ✅ Add specific local data, prices, and details that AI does not know
  ✅ Add first-hand experience: "In our experience...", "Clients often ask..."
  ✅ Fact-check every claim, statistic, legal statement, and price
  ✅ Ensure every page has unique value beyond what any AI model would generate

DANGEROUS AI USAGE:
  ❌ Publishing AI output verbatim without human review or editing
  ❌ Mass-producing location pages by swapping city names
      (Google detects thin, template-based pages and ignores them)
  ❌ Using AI to generate fake reviews, testimonials, or endorsements
  ❌ Copy-pasting AI content and only changing the keyword / city name
  ❌ Relying on AI for legal, tax, or financial claims without expert verification

RECOMMENDED WORKFLOW:
  1. AI generates draft structure + outline
  2. Human writes or edits: adds prices, local details, personal experience, credentials
  3. Human reviews: Is the keyword usage natural? Are facts correct? Is there unique value?
  4. Publish → monitor performance in GSC → iterate based on data
  5. Update content quarterly (see Content Freshness section above)

THE TEST:
  Ask yourself: "Does this page contain information or insight that a reader could NOT
  get by simply asking ChatGPT the same question?" If yes, publish. If no, add more
  original value before publishing.
```

---

## Video SEO & YouTube Strategy

YouTube is the second-largest search engine. Videos rank prominently in Google Search
results AND are frequently cited in AI Overviews, especially for "how-to" queries.

### When to Create Video Content

```
HIGH-VALUE VIDEO TYPES:
  → "How to [do X]" — step-by-step screen recordings or walkthroughs
  → FAQ answers — 1–2 minute videos per common question
  → Explainer content — complex topics explained visually
  → Client testimonials — real customers, real experiences (strongest trust signal)
  → Process overviews — "What to expect when you [use service]"

VIDEO CONTENT STRATEGY BY BUSINESS TYPE:
  Local service: FAQ videos in target languages (Vietnamese, Spanish, English)
  E-commerce: Product demos, unboxing, comparison videos
  Blog/Content: Tutorial videos, listicle videos, expert commentary
  SaaS: Feature demos, onboarding walkthroughs, use-case stories
```

### YouTube SEO Checklist

```
FOR EVERY VIDEO:
  ☐ Title: Primary keyword + value proposition (60 characters max)
      YES: "How to File Taxes in Houston — Step by Step Guide 2026"
      NO:  "Taxes Video Part 1"
  ☐ Description: First 150 characters = keyword-rich summary
      Full description: 200–500 words, include timestamps, links, keywords
  ☐ Tags: Primary keyword + 5–10 variations and related terms
  ☐ Custom Thumbnail: High-contrast, text overlay, face close-up if applicable
  ☐ Closed Captions: Auto-generated + manually edited for accuracy
      (Google indexes captions — keyword opportunity)
  ☐ Timestamps/Chapters: Help YouTube and Google extract "key moments"
      (these appear as separate results in Google Search)
  ☐ End Screen + Cards: Link to related videos and your website
  ☐ Pinned Comment: Summary + link to relevant page on your site
```

### Embedding Videos on Your Website

```
WHEN YOU EMBED A YOUTUBE VIDEO ON YOUR SITE:
  1. Place the embed within the relevant content section (not at bottom of page)
  2. Add VideoObject schema (see schema-library.md section 12)
  3. Write a full text transcript below the embed
     → AI systems extract and cite transcript text
     → Increases page word count and keyword coverage
     → Improves accessibility
  4. Benefit: time-on-page increases → positive engagement signal for Google

TRANSCRIPT FORMAT:
  <details>
    <summary>Video Transcript</summary>
    [Full transcript text here, with natural paragraph breaks]
  </details>
```

### Multilingual Video Strategy

```
FOR BUSINESSES SERVING MULTILINGUAL COMMUNITIES:
  → Create separate videos for each language (not just subtitles)
  → A Vietnamese-language video answering "Khai thuế ở Mỹ như thế nào?" has
    almost zero competition on YouTube
  → YouTube supports multi-language captions — add captions in all target languages
  → Embed language-specific videos on language-specific pages
    (/vi/ pages get Vietnamese videos, /en/ pages get English videos)
  → YouTube descriptions and titles in the target language
```
