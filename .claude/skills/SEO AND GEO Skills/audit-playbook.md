# Live Site Audit Playbook

Use this when auditing a site that already exists. Ideas distilled from
[claude-seo](https://github.com/AgriciDaniel/claude-seo) v2.5.0 (MIT, © 2026 agricidaniel) and checked
against Google's docs on 2026-11-01. Re-check dated claims before quoting them.

---

## 1. Evidence Rules

```
Source order:   Google docs + Search Console > vendor docs > third-party studies > opinion
Scores:         Heuristics only. No tool has access to Google's internal ranking data.
Statistics:     Quote with source and date, or leave out.
Conflicts:      When community advice contradicts Google, follow Google and say so.
```

Every finding must state:

1. What was observed, on which URL
2. Why it matters, and how sure you are
3. The fix, and what it depends on
4. How to tell it worked (a metric or check, and when to look)

Before recommending a fix, ask whether it makes the page worse for a human reader and whether the team
can really ship it. If earlier advice has gone stale, retract it explicitly.

---

## 2. Audit Order

Fix blockers first. Later layers are wasted if an earlier one fails.

```
1. Access:     robots.txt, status codes, bot challenges/firewall, server-rendered HTML
2. Index:      canonical, noindex, sitemap, hreflang, snippet eligibility
3. Fit:        right page type for the query (section 4)
4. Quality:    unique first-hand content, author, sources, dates, YMYL trust signals
5. Enhance:    schema, images, internal links, Core Web Vitals
6. Off-site:   real mentions, links, Google Business Profile
```

---

## 3. AI Crawlers

Training and search crawlers are separate. Blocking training does not have to block citation.
Bot lists change, so confirm against the vendor's docs before editing robots.txt.

| Vendor | Search / citation | User-triggered fetch | Training |
|---|---|---|---|
| OpenAI | OAI-SearchBot | ChatGPT-User | GPTBot |
| Anthropic | Claude-SearchBot | Claude-User | ClaudeBot |
| Perplexity | PerplexityBot | Perplexity-User | not used for foundation-model training (vendor claim) |
| Google | Googlebot (Google-Extended does not affect Search inclusion or ranking) | — | Google-Extended |

Checks:

- Many AI crawlers read raw HTML without running JavaScript. Confirm the main content is in the
  server response, not only after hydration.
- A robots.txt allow means nothing if a CDN or firewall challenges the bot. Check firewall settings
  and server logs.
- Report llms.txt as present or absent, with no score weight. Google Search does not use it.

---

## 4. Page-Type Fit (SERP Backwards Check)

A technically perfect page can still fail if it is the wrong type for the query.

1. Take the target keyword and read the live top 10.
2. Classify each result: article, product, service, comparison, tool, listing, forum, video, official.
3. If most results share a type and your page differs, change the page type or the target keyword.
   Do not polish the wrong page.
4. List what the top results give that yours lacks: a tool, a table, a price, a download, a form.
5. Write 2–3 user stories from the SERP: "When I [situation], I want [result], so I can [goal]."

---

## 5. Hreflang Checks

- Every page references itself and every language version (full mesh)
- All alternates link back; A→B needs B→A
- hreflang URLs exactly match canonical URLs, including trailing slash and protocol
- Never put hreflang on a page whose canonical points elsewhere
- Language codes use ISO 639-1 (`vi`, `en`); a region needs a language first (`en-US`, never `US`)
- Use `x-default` for a selector or fallback page
- Translate titles, descriptions and schema text too; mixed-language metadata is a common miss

---

## 6. Programmatic Page Gates

Thresholds below are internal review triggers, not Google rules. Google's test is whether each page
has its own value or only funnels users (doorway pages, scaled content abuse).

```
30+ templated pages:  Review a sample. Each needs facts specific to that page.
50+ templated pages:  Stop and justify the set before adding more.
```

| Safer | Risky |
|---|---|
| Each page holds unique data, rules or tools | Only the city or state name changes |
| Facts checked against an official source | Mass AI text with no first-hand value |
| Page answers a question people really search | Keyword variants with no distinct intent |

To test a page, remove the place name. If the rest could sit on any sibling page, it fails.

---

## 7. Regression Baselines

Record key pages before a large release, then compare after deploy.

| Severity | Change |
|---|---|
| Critical | Status code, noindex added, canonical changed, page removed from sitemap, main content missing from HTML |
| Warning | Title, H1 or meta description changed; schema removed; Core Web Vitals worse |
| Info | Other heading or copy changes, Open Graph changes |

---

## 8. Keep Claims Honest

- Never promise rankings or AI citations.
- Use Search Console as the first-party source for indexing and clicks.
- Google's warning signs: writing to a word count, entering niches with no expertise for traffic,
  faking freshness dates, churning content for "freshness".
- For YMYL topics such as immigration, tax and insurance, accuracy and disclaimers beat every style
  or length heuristic.
