# Technical SEO Reference

Deep implementation guide for technical SEO. Read this file when working on
robots.txt, sitemaps, Core Web Vitals, redirects, or site speed.

---

## Core Web Vitals — Full Implementation

### LCP (Largest Contentful Paint) — Target: Under 2.5 seconds

LCP measures how long the biggest visible element (usually a hero image or large heading)
takes to fully render on screen. It is the user's first impression of site speed.

**Common causes of slow LCP:**
- Uncompressed images (most common cause — accounts for 70%+ of slow LCP)
- No CDN — server is geographically far from user
- Render-blocking resources (CSS or JS that loads before the page can paint)
- Slow server response time (TTFB over 600ms)

**Fixes:**

1. Compress and convert images to WebP:
```bash
# Using cwebp (install with: brew install webp)
cwebp -q 80 input.jpg -o output.webp

# Using sharp in Node.js
const sharp = require('sharp');
sharp('input.jpg').webp({ quality: 80 }).toFile('output.webp');
```

2. Preload the hero image (put in <head>):
```html
<link rel="preload" as="image" href="/images/hero.webp" fetchpriority="high">
```

3. Use a CDN (Content Delivery Network):
- Cloudflare (free tier covers most projects)
- Vercel Edge Network (automatic when hosting on Vercel)
- AWS CloudFront

4. Set explicit image dimensions to help browser allocate space early:
```html
<img src="hero.webp" width="1200" height="600" alt="..." loading="eager">
```

5. Defer non-critical scripts:
```html
<script src="analytics.js" defer></script>
<script src="chat-widget.js" defer></script>
```

---

### CLS (Cumulative Layout Shift) — Target: Under 0.1

CLS measures visual instability — how much content moves around while the page loads.
A score of 0 = nothing moves. A score of 1 = everything shifts dramatically.

**Common causes of high CLS:**
- Images without width/height attributes
- Web fonts swapping (invisible text becomes visible text with different metrics)
- Ads, embeds, or iframes loading without reserved space
- Dynamic content injected above existing content

**Fixes:**

1. Always set width + height on images:
```html
<!-- Bad -->
<img src="photo.jpg" alt="...">

<!-- Good -->
<img src="photo.jpg" width="800" height="450" alt="...">
```

2. Reserve space for ads and embeds:
```css
.ad-container {
  min-height: 250px; /* Reserve space before ad loads */
  width: 300px;
}
```

3. Fix font swap CLS:
```css
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* Shows fallback font, swaps when loaded */
  /* For better CLS, use 'optional' if font isn't critical */
}
```

4. Use CSS aspect-ratio for responsive images:
```css
.hero-image {
  aspect-ratio: 16 / 9;
  width: 100%;
}
```

---

### INP (Interaction to Next Paint) — Target: Under 200ms

INP measures how quickly the page responds to ALL user interactions (clicks, taps, key
presses) throughout the entire session, not just the first one.

**Common causes of slow INP:**
- Large JavaScript bundles blocking the main thread
- Heavy third-party scripts (chat widgets, session recorders, analytics)
- Long-running event handlers
- Excessive DOM size (too many HTML elements)

**Fixes:**

1. Audit and remove unnecessary third-party scripts:
   - Each third-party script (chat, tracking, social buttons) adds 50–200ms
   - Audit with Chrome DevTools → Performance → Main Thread

2. Lazy-load non-critical JavaScript:
```html
<!-- Load heavy components only when needed -->
<script type="module">
  const btn = document.getElementById('open-chat');
  btn.addEventListener('click', async () => {
    const { ChatWidget } = await import('./chat-widget.js');
    new ChatWidget();
  });
</script>
```

3. Break up long tasks with setTimeout:
```javascript
// Bad — blocks main thread for entire loop
function processLargeList(items) {
  items.forEach(item => heavyProcess(item));
}

// Good — yields back to browser between chunks
async function processLargeList(items) {
  for (const item of items) {
    heavyProcess(item);
    await new Promise(r => setTimeout(r, 0)); // yield
  }
}
```

---

## robots.txt — Full Guide

robots.txt tells search engine crawlers which pages to visit and which to skip.
Place at root: `https://yoursite.com/robots.txt`

### Standard robots.txt Template

```
User-agent: *
Allow: /

# Block admin and system pages
Disallow: /admin/
Disallow: /wp-admin/
Disallow: /dashboard/
Disallow: /login/
Disallow: /register/
Disallow: /cart/
Disallow: /checkout/
Disallow: /account/
Disallow: /api/

# Block staging/test areas
Disallow: /staging/
Disallow: /test/
Disallow: /dev/

# Block search results pages (avoid duplicate content)
Disallow: /search?
Disallow: /*?s=

# Block URL parameters that create duplicate content
Disallow: /*?sort=
Disallow: /*?filter=
Disallow: /*?ref=

# Sitemap location
Sitemap: https://yoursite.com/sitemap.xml
```

### WordPress-Specific robots.txt

```
User-agent: *
Allow: /wp-content/uploads/

Disallow: /wp-admin/
Disallow: /wp-includes/
Disallow: /wp-login.php
Disallow: /xmlrpc.php
Disallow: /?s=
Disallow: /search/
Disallow: /tag/
Disallow: /page/
Disallow: /author/

Sitemap: https://yoursite.com/sitemap.xml
```

---

## sitemap.xml — Full Guide

A sitemap lists all URLs Google should crawl and index. Submit via Google Search Console.

### For Static Sites — Generate at Build Time

**Next.js (App Router):**
```javascript
// app/sitemap.js
export default function sitemap() {
  return [
    {
      url: 'https://yoursite.com',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://yoursite.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Add all pages here
  ];
}
```

**Astro:**
```javascript
// Install: npm install @astrojs/sitemap
// astro.config.mjs
import sitemap from '@astrojs/sitemap';
export default defineConfig({
  site: 'https://yoursite.com',
  integrations: [sitemap()],
});
```

### For WordPress
Use Yoast SEO or RankMath plugin — both auto-generate and maintain sitemap.

### Manual sitemap.xml Template (Small Sites)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yoursite.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://yoursite.com/services/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

## Canonical Tags

Canonical tags tell Google which version of a URL is the "official" one, preventing
duplicate content penalties when the same content is accessible via multiple URLs.

### Where to Put Them

Every single page must have a canonical tag in the `<head>`:

```html
<head>
  <link rel="canonical" href="https://yoursite.com/exact-page-url/">
</head>
```

### Common Canonical Problems and Fixes

| Problem | Example | Fix |
|---|---|---|
| HTTP vs HTTPS | Both versions exist | Canonical to HTTPS, redirect HTTP→HTTPS |
| Trailing slash | /page and /page/ both work | Pick one, canonical + redirect the other |
| URL parameters | /page?sort=asc | Canonical to /page/, block params in robots.txt |
| WWW vs non-WWW | Both resolve | Pick one, 301 redirect the other |
| Pagination | /page/2/, /page/3/ | Each page self-canonicals; do NOT canonical all to page 1 |

---

## 301 Redirects

A 301 redirect permanently moves a page from old URL to new URL. Essential when:
- Restructuring site architecture
- Deleting a page (redirect to most relevant surviving page)
- Changing a URL slug
- Migrating from HTTP to HTTPS
- Migrating from www to non-www

### Implementation by Platform

**Next.js (next.config.js):**
```javascript
module.exports = {
  async redirects() {
    return [
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true, // 301
      },
    ];
  },
};
```

**Netlify (_redirects file in public/):**
```
/old-page    /new-page    301
/blog/post-1 /articles/post-1  301
```

**Apache (.htaccess):**
```apache
Redirect 301 /old-page https://yoursite.com/new-page
```

**WordPress:**
Use Redirection plugin (free) — no code needed.

---

## Google Search Console Setup

1. Go to search.google.com/search-console
2. Add property → choose "URL prefix" → enter full site URL
3. Verify ownership:
   - Easiest: Upload HTML file to site root
   - Alternative: Add meta tag to `<head>`
   - Alternative: DNS TXT record
4. Submit sitemap: Sitemaps → enter sitemap.xml URL → Submit
5. Wait 1–7 days for first data to appear
6. Monitor: Coverage (indexing), Performance (clicks/impressions), Core Web Vitals

---

## Bing Webmaster Tools Setup

Bing's index is the data source for **ChatGPT browsing mode** and **Microsoft Copilot**.
Setting this up means your content can be cited by these AI systems when users ask
questions in your niche. Takes 10 minutes. Do this same day as Google Search Console.

1. Go to bing.com/webmasters
2. Sign in with a Microsoft account
3. Add your site:
   - Option A: Import from Google Search Console (fastest — auto-imports your sitemap and settings)
   - Option B: Manual setup → enter your site URL
4. Verify ownership:
   - XML file: Download and upload to site root
   - Meta tag: Add to `<head>` of homepage
   - CNAME: Add DNS record (best for technical users)
5. Submit sitemap: Sitemaps → enter your sitemap.xml URL → Submit
6. Wait 3–5 days for first crawl data

### Bing-Specific Features Worth Using

```
SEO ANALYZER
  → Tools → SEO Analyzer → enter any page URL
  → Bing flags specific issues: missing meta tags, slow load times, broken links
  → Fix anything flagged — Bing's crawler is less forgiving than Google's

URL INSPECTION
  → Equivalent to Google's URL Inspection tool
  → Test if a specific page is indexed, force a re-crawl after updates

BACKLINK DATA
  → Bing shows inbound links — useful secondary data source alongside Google's

CRAWL CONTROL
  → Set preferred crawl rate (useful if server resources are limited)
```

### Bing vs Google — Key Differences

```
BING FAVORS:
  → Older, more established domains (newer sites rank faster on Google)
  → Exact-match keywords in title tags more heavily
  → Social signals (Facebook/LinkedIn shares have more influence than on Google)
  → Bing Places completion (equivalent of Google Business Profile for Bing)

BING WEAKNESSES:
  → Smaller total index — some new content takes longer to appear
  → Less sophisticated at understanding semantic/entity relationships

PRACTICAL IMPLICATION:
  → Sites that rank on Google will generally rank on Bing
  → Bing Webmaster Tools is maintenance, not active optimization
  → Set it up, submit the sitemap, then focus optimization effort on Google
```

### Bing Places for Business

Separate from Bing Webmaster Tools — this is Bing's equivalent of Google Business Profile.
Appears in Bing Maps and Bing local search results, and feeds Microsoft Copilot's local data.

```
1. Go to bingplaces.com
2. Search for your business — claim if listed, create if not
3. Verify by phone or postcard
4. Complete all fields (same NAP as your GBP — exact match)
5. Add photos, hours, services, description
```

---

## Accessibility as an SEO Quality Signal

Google uses accessibility signals as indicators of page quality. Well-structured,
accessible pages also score better on Core Web Vitals (especially CLS and INP).
Additionally, screen reader-friendly content demonstrates E-E-A-T by showing
attention to all users.

```
ACCESSIBILITY SEO CHECKLIST:

IMAGES AND MEDIA:
  ☐ All images have descriptive, meaningful alt text
      ✅ alt="Vietnamese family reviewing tax documents with preparer at desk"
      ❌ alt="image1.jpg" or alt="tax tax tax Houston tax preparation"
  ☐ Decorative images use alt="" (empty alt) or are CSS backgrounds
  ☐ Videos have captions or transcripts

HEADING STRUCTURE:
  ☐ One H1 per page (already in On-Page SEO checklist)
  ☐ No skipped heading levels (H1 → H3 without H2 is invalid)
  ☐ Headings describe section content, not just formatted for visual size

COLOR AND CONTRAST:
  ☐ Color contrast ratio meets WCAG 2.1 AA minimum (4.5:1 for normal text)
  ☐ Information is not conveyed by color alone (add icons or text labels)
  ☐ Test with Chrome DevTools → Rendering → Emulate vision deficiencies

KEYBOARD AND INTERACTION:
  ☐ All interactive elements (links, buttons, forms) are keyboard-accessible
  ☐ Focus order is logical — tabbing through page follows visual layout
  ☐ Focus is visible (do not set outline: none without an alternative)
  ☐ Skip-to-content link at top of page for keyboard users

FORMS:
  ☐ All form fields have associated <label> elements
  ☐ Required fields are indicated (not just by color)
  ☐ Error messages are descriptive and associated with the field

HTML SEMANTICS:
  ☐ Use <nav>, <main>, <article>, <aside>, <footer> semantic elements
  ☐ ARIA labels on navigation menus and interactive components
  ☐ Language attribute set on <html> tag: <html lang="en"> or <html lang="vi">
  ☐ For multilingual pages: use lang attributes on content blocks in other languages

TESTING TOOLS:
  → WAVE (wave.webaim.org) — browser extension, free
  → Lighthouse Accessibility audit (Chrome DevTools → Lighthouse tab)
  → axe DevTools (browser extension, free)
  → Target: 90+ Lighthouse accessibility score
```
