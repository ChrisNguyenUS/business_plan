# Multilingual SEO Reference

Guide for building web presence that ranks in multiple languages. Read this file
when the site serves users in more than one language, or when the business targets
specific ethnic/linguistic communities.

---

## Core Principle

Never translate and overwrite. Every language is a separate SEO entity with its own:
- URL
- Title tag and meta description
- Keyword targets (researched in the target language, not translated from English)
- Schema markup
- Internal link structure

A translated page on the same URL cannot rank for native-language queries.
A page at `/vi/dich-vu-khai-thue/` can.

---

## URL Structure — Choose One and Never Change It

Three valid approaches. Pick one before launch — changing it later requires 301 redirects
across the entire site.

```
OPTION 1: Subdirectory (Recommended for most sites)
  /en/tax-preparation/
  /vi/dich-vu-khai-thue/
  /es/preparacion-de-impuestos/

  Pros:  All language versions on one domain — shares domain authority
  Cons:  Slightly more complex routing setup
  Best for: WordPress (use WPML or Polylang), Next.js, any modern framework

OPTION 2: Subdomain
  en.yoursite.com/tax-preparation/
  vi.yoursite.com/dich-vu-khai-thue/
  es.yoursite.com/preparacion-de-impuestos/

  Pros:  Easy to host language versions independently
  Cons:  Google treats subdomains as separate sites — doesn't share authority as freely
  Best for: Large enterprises with separate content teams per region

OPTION 3: Country-code Top-level Domain (ccTLD)
  yoursite.com (English)
  yoursite.vn (Vietnamese — Vietnam market)
  yoursite.mx (Spanish — Mexico market)

  Pros:  Strongest geo-targeting signal for specific country ranking
  Cons:  Separate domain = separate authority, separate hosting, much higher cost
  Best for: Large companies with dedicated budgets per market

RECOMMENDATION: Use subdirectory for most local service businesses and small-to-mid sites.
```

---

## hreflang Tags — Required on Every Language Version

hreflang tells Google which version of a page to show to which user based on language
and location. Missing hreflang = Google may show the wrong language version (or not rank any).

### Where to Place hreflang

In the `<head>` of every page, on every language version.

### Format

```html
<!-- On the English page (/en/tax-preparation/) -->
<link rel="alternate" hreflang="en" href="https://yoursite.com/en/tax-preparation/">
<link rel="alternate" hreflang="vi" href="https://yoursite.com/vi/dich-vu-khai-thue/">
<link rel="alternate" hreflang="es" href="https://yoursite.com/es/preparacion-de-impuestos/">
<link rel="alternate" hreflang="x-default" href="https://yoursite.com/en/tax-preparation/">

<!-- On the Vietnamese page (/vi/dich-vu-khai-thue/) — SAME SET OF TAGS -->
<link rel="alternate" hreflang="en" href="https://yoursite.com/en/tax-preparation/">
<link rel="alternate" hreflang="vi" href="https://yoursite.com/vi/dich-vu-khai-thue/">
<link rel="alternate" hreflang="es" href="https://yoursite.com/es/preparacion-de-impuestos/">
<link rel="alternate" hreflang="x-default" href="https://yoursite.com/en/tax-preparation/">
```

**Rules:**
- Every language version must reference ALL other language versions
- `x-default` = the fallback page for users whose language isn't specifically covered
- Tags must be absolute URLs (include https://)
- Tags must be reciprocal — if page A references page B, page B must reference page A

### Language + Region Codes

Use `language-REGION` format when targeting a specific country:

```
en       → English (all regions)
en-US    → English, United States
en-GB    → English, United Kingdom
vi       → Vietnamese (all regions — use this for Vietnamese diaspora in US)
vi-VN    → Vietnamese, Vietnam (use if specifically targeting Vietnam)
es       → Spanish (all regions)
es-US    → Spanish, United States (Latinos in the US)
es-MX    → Spanish, Mexico
zh-Hans  → Chinese (Simplified)
zh-Hant  → Chinese (Traditional)
ko       → Korean
```

### hreflang in WordPress

Use **WPML** (paid, $99/year) or **Polylang** (free) — both handle hreflang automatically.
Do not implement hreflang manually in WordPress — plugin handles it correctly.

### hreflang in Next.js

```javascript
// In your page's <Head> or layout
export default function Page() {
  return (
    <Head>
      <link rel="alternate" hreflang="en" href="https://yoursite.com/en/tax-preparation/" />
      <link rel="alternate" hreflang="vi" href="https://yoursite.com/vi/dich-vu-khai-thue/" />
      <link rel="alternate" hreflang="x-default" href="https://yoursite.com/en/tax-preparation/" />
    </Head>
  );
}
```

Or configure site-wide in next.config.js:
```javascript
module.exports = {
  i18n: {
    locales: ['en', 'vi', 'es'],
    defaultLocale: 'en',
  },
};
```

---

## Keyword Research for Non-English Languages

**Do not just translate your English keyword list.** Native speakers search differently.

### Vietnamese Keyword Research

```
SEARCH BEHAVIOR PATTERNS:
  → Vietnamese diaspora in the US frequently mix Vietnamese and English in searches
  → Common patterns: "khai thuế Houston", "tax Houston tiếng Việt", "bảo hiểm nhân thọ Houston"
  → Research both: pure Vietnamese keywords AND mixed-language queries

TOOLS:
  → Google Keyword Planner: set language to Vietnamese, location to United States
  → Google Autocomplete: type in Vietnamese, note suggestions
  → Google Trends: compare Vietnamese vs English term search volume
  → Facebook Audience Insights: see what Vietnamese-speaking audiences in Houston engage with
  → Vietnamese Facebook groups in Houston: read what questions community members ask

HIGH-VALUE VIETNAMESE KEYWORDS (tax example):
  → "khai thuế ở Houston" (file taxes in Houston)
  → "dịch vụ khai thuế tiếng Việt" (tax filing service in Vietnamese)
  → "khai thuế cho người Việt" (tax filing for Vietnamese people)
  → "thuế thu nhập cá nhân Mỹ" (US personal income tax)
  → "hoàn thuế bao lâu" (how long does tax refund take)

COMMUNITY SEARCH TERMS (insurance example):
  → "bảo hiểm nhân thọ ở Mỹ" (life insurance in America)
  → "bảo hiểm sức khỏe cho người Việt" (health insurance for Vietnamese)
```

### Spanish Keyword Research

```
SEARCH BEHAVIOR PATTERNS:
  → US Hispanic searchers often use Spanish for service searches but English for brand searches
  → Location searches: "[service] Houston" is common even in Spanish-language queries

TOOLS:
  → Google Keyword Planner: set language to Spanish, location to United States
  → Google Autocomplete in Spanish
  → Spanish Facebook groups in Houston area

HIGH-VALUE SPANISH KEYWORDS (tax example):
  → "preparación de impuestos Houston" (tax preparation Houston)
  → "declarar impuestos en Houston" (file taxes in Houston)
  → "servicios de impuestos en español" (tax services in Spanish)
  → "reembolso de impuestos 2026" (tax refund 2026)
  → "preparador de impuestos cerca de mí" (tax preparer near me)
```

---

## What to Translate — Full Checklist

Translation is not just the body text. Every SEO element must be translated:

```
METADATA
  ☐ Title tag — researched in target language, not just translated
  ☐ Meta description — translated, with native-language call to action

URL SLUGS
  ☐ Use native language words, not transliterated English
  ✅ /vi/dich-vu-khai-thue/
  ❌ /vi/tax-preparation/
  ❌ /vi/khai-thue/ (partial — prefer full Vietnamese phrase)

HEADINGS
  ☐ H1, H2, H3 — fully translated with native-language keyword targets

CONTENT
  ☐ All body text — translated by a native speaker, not Google Translate alone
  ☐ FAQ section — questions written in the way native speakers actually ask them

IMAGE ALT TEXT
  ☐ Every image alt attribute translated

SCHEMA MARKUP
  ☐ name, description, FAQPage questions and answers — all translated
  ☐ Locale/language fields updated if schema includes them

INTERNAL LINKS
  ☐ Language versions link only to other pages in the same language
  ☐ /vi/ pages link to /vi/ pages; /en/ pages link to /en/ pages
  ☐ One cross-language link per page is acceptable (language switcher nav)

NAVIGATION
  ☐ Language switcher in header — links to equivalent page in each language
  ☐ Footer NAP block in each language version

CTA BUTTONS
  ☐ All calls to action translated (not left in English on a Vietnamese page)
```

---

## Schema Markup for Multilingual Sites

Update these schema fields for each language version:

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Manna One Solution",
  "description": "Dịch vụ khai thuế, bảo hiểm nhân thọ, và hỗ trợ giấy tờ di trú tại Houston, TX.",
  "inLanguage": "vi",
  "knowsLanguage": ["vi", "en", "es"]
}
```

For FAQPage schema on language-specific pages, write the questions and answers
in the target language — Google extracts these for AI Overview in the searcher's language.

---

## Content Strategy for Ethnic Community SEO

Beyond translation, community-specific content builds deeper trust and GEO signals:

```
CULTURAL CONTEXT CONTENT:
  → Explain US systems in the context of what the community already knows
  → Example: "Khác với hệ thống thuế ở Việt Nam, thuế Mỹ yêu cầu..."
    (Unlike Vietnam's tax system, US taxes require...)
  → This type of content gets cited by AI systems serving Vietnamese-speaking users

COMMUNITY-SPECIFIC FAQ TOPICS:
  → Tax: "Tôi mới sang Mỹ có phải khai thuế không?" (Do new immigrants need to file taxes?)
  → Insurance: "Người có visa H-1B có mua được bảo hiểm nhân thọ không?"
    (Can H-1B visa holders get life insurance?)
  → These questions have low competition but high conversion intent

COMMUNITY TRUST SIGNALS:
  → Mention languages spoken explicitly: "Phục vụ cộng đồng người Việt tại Houston"
  → Display certifications in context community recognizes
  → Link to or mention trusted Vietnamese community organizations
  → Zalo / WhatsApp contact option alongside phone (community channels matter)

CONTENT AMPLIFICATION:
  → Share content in Vietnamese Facebook groups in Houston (organically, not spam)
  → Contribute to community Q&A threads with helpful answers + links back to your pages
  → Partner with Vietnamese-language local media (Người Việt, Viet Mercury)
```

---

## Technical Implementation by Platform

### WordPress (WPML or Polylang)

```
WPML ($99/year — recommended for complex multilingual):
  → Creates separate language versions of every page
  → Handles hreflang automatically
  → Translates strings throughout theme and plugins
  → Works with Yoast SEO for multilingual title/meta management

Polylang (free):
  → Good for 2–3 languages with simpler sites
  → hreflang support included
  → Less polished than WPML for complex sites

Setup steps:
  1. Install WPML or Polylang
  2. Configure languages (English, Vietnamese, Spanish)
  3. Set URL structure to subdirectory (/en/, /vi/, /es/)
  4. For each English page: create translation in each language
  5. Verify hreflang output with Google Search Console → International Targeting
```

### Next.js

```javascript
// next.config.js
module.exports = {
  i18n: {
    locales: ['en', 'vi', 'es'],
    defaultLocale: 'en',
    localeDetection: true, // Auto-redirect based on browser language
  },
};

// File structure:
// pages/[locale]/tax-preparation.js  or
// pages/tax-preparation.js  (with locale from router)

// Access locale in page:
import { useRouter } from 'next/router';
const { locale } = useRouter();
```

### Astro

```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'vi', 'es'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
```

---

## Monitoring Multilingual Performance

```
GOOGLE SEARCH CONSOLE:
  → Add each language version's URL path as a separate property, OR
  → Use the single property and filter by URL path (/vi/, /es/)
  → Check: International Targeting report → hreflang errors
  → Check: Performance by country (are Vietnamese users finding Vietnamese pages?)

KEY QUESTIONS TO ANSWER MONTHLY:
  → Are the Vietnamese/Spanish pages getting indexed? (Coverage report)
  → Are they appearing for native-language queries? (Performance → filter by query language)
  → Are click-through rates similar across languages? (If not, titles need revision)
  → Are there hreflang errors? (International Targeting report)
```
