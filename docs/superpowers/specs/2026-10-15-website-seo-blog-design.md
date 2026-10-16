# Website — SEO Blog on the Existing Admin Feature + N-400 Article Batch

**Date:** 2026-10-15
**App:** `apps/website/` only (plus one Supabase migration and owner-approved content inserts)
**Branch:** `worktree-website-seo-fixes` (worktree `.claude/worktrees/website-seo-fixes`)
**Status:** Written spec approved by owner (2026-10-15)
**Follows:** the SEO/GEO technical fixes shipped the same day (canonical + hreflang on www, `/llms.txt`, robots/sitemap, site JSON-LD — ROADMAP "Website SEO/GEO nền kỹ thuật")

## 1. Goal

Make mannaos.com able to publish articles that rank on Google and get cited by AI answer engines, using the blog feature the owner already has in `/[locale]/admin/blog`, then publish a first batch of six Vietnamese articles about U.S. citizenship (N-400).

Success =
1. A published post is a server-rendered page whose HTML (no JavaScript needed) contains the full article, its own title/description, canonical, hreflang for the languages it exists in, visible dates and byline, a visible FAQ, and BlogPosting + FAQPage + BreadcrumbList JSON-LD.
2. The post appears in `sitemap.xml` with its real last-modified date.
3. The owner can write and publish the next post from the admin screen without a developer, and a failed save is reported instead of silently lost.
4. Six Vietnamese N-400 articles are live, each fact-checked against uscis.gov as of the publish date.

## 2. Constraints (non-negotiable)

1. **Not a law firm.** Every article carries the non-attorney disclosure. Articles inform; they never tell a reader what to answer, which form fits their case, or that they qualify.
2. **No expertise claims.** Under 8 CFR 1.2 a non-attorney is exempt from "practice" only when they do not hold themselves out as qualified in immigration matters. Article copy and the blog page chrome must not say "chuyên gia", "expert", "chuyên môn di trú". (The existing blog subtitle "Chuyên gia chia sẻ…/Expert insights…" is replaced.)
3. **Nationwide wording.** Educational content targets the whole U.S. Any mention of the paid document-preparation service keeps the state caveat from `immigration_scope_note` (owner decision 2026-10-15, PRD §Geographic Scope).
4. **No MannaOS prices** (pricing is hidden site-wide). USCIS filing fees are public facts and may be quoted with "theo uscis.gov, kiểm tra ngày …" and a link.
5. **Never name the EB-3 white-label partner** anywhere (page, metadata, JSON-LD, article text).
6. **Facts are dated and sourced.** Every number (fees, test rules, timelines, pass rates) links to its uscis.gov (or other .gov) source and is re-checked on the day the article is published.
7. **One H1 per page.** The post title is the only H1; Markdown `#` headings in the body are rendered as H2.

## 3. Current state (verified 2026-10-15)

| Area | Today | Problem |
|---|---|---|
| Table | `blog_posts` does **not** exist on prod (`to_regclass` = null). Defined only in the unapplied `apps/website/supabase/migrations/phase_b_website_tables.sql`. | Admin "Save Post" ignores the error, closes the modal and shows an empty list — posts are silently lost. |
| Public list `/[locale]/blog` | `"use client"`, fetches in `useEffect`. No `generateMetadata`; `/vi/blog` inherits the English default title/description. | Crawlers that don't run JS (GPTBot, ClaudeBot, PerplexityBot) see a spinner. |
| Public post `/[locale]/blog/[slug]` | `"use client"`, fetches in `useEffect`; one `slug` for both languages; date always `en-US`. | No per-post title/description/canonical/schema; no Vietnamese URL. |
| Admin `/[locale]/admin/blog` | Modal: title/excerpt/content (Markdown) per language, one slug (ASCII from the English title), cover URL, category, post type, published toggle. Writes straight from the browser Supabase client. | No Vietnamese slug, no FAQ, no author; errors swallowed. |
| Markdown | `react-markdown` 10; no `remark-gfm`. | Tables (good for featured snippets) don't render. |

## 4. Data — migration `apps/website/supabase/migrations/website_01_blog_posts.sql`

The table has never existed on prod, so it is created clean (the unapplied `phase_b` definition is not reused; `phase_b_website_tables.sql` is left for the separate `contact_submissions` decision).

```sql
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug_en text unique,                 -- null when the post has no English version
  slug_vi text unique,                 -- null when the post has no Vietnamese version
  title_en text, title_vi text,
  excerpt_en text, excerpt_vi text,    -- also the meta description (aim ≤ 160 chars)
  content_en text, content_vi text,    -- Markdown (GFM)
  faq_en jsonb not null default '[]'::jsonb,   -- [{ "q": "...", "a": "..." }]
  faq_vi jsonb not null default '[]'::jsonb,
  author_name text not null default 'Manna One Solution',
  cover_image_url text,
  category text not null default 'general'
    check (category in ('tax','insurance','immigration','ai','general')),
  post_type text not null default 'article'
    check (post_type in ('article','guide','news','faq')),
  published boolean not null default false,
  published_at timestamptz,            -- set on first publish, never moved
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug_en is not null or slug_vi is not null),
  check (slug_en ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug_vi ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
    -- (a null slug passes: the regex check is null, not false)
);
```

- **Trigger** `blog_posts_touch()` (plain `plpgsql`, not SECURITY DEFINER) on insert/update: `updated_at := now()`; when `published` is true and `published_at` is null, `published_at := now()`. Then `revoke execute on function public.blog_posts_touch() from public, anon, authenticated` (memory rule: Supabase grants EXECUTE on new functions directly).
- **RLS on**, one policy per action:
  - `select`: `published = true or public.is_admin()` — to `anon, authenticated`.
  - `insert` / `update` / `delete`: `public.is_admin()` — to `authenticated` only.
  - `anon` gets `select` only; no insert/update/delete grants.
  - Never `auth.role() = 'authenticated'` (end-users share the project).
- **Index** on `(published, published_at desc)` for the list query.
- **Verification on prod with zero residue** (recipe in memory `supabase-migrations-layout`): one rolled-back `DO` block that probes anon / plain client user / admin — anon and client can read a published row but not a draft, cannot insert/update/delete; admin can do all four. Then `get_advisors security` (lints 0028/0029) after applying.
- Applied with MCP `apply_migration` only after the owner says yes at that step.

## 5. Public pages (server-rendered)

### 5.1 Data access — `src/lib/blog/` (server-only)

- `queries.ts` — anon Supabase client without session (`createClient(url, anonKey, { auth: { persistSession: false } })`), so RLS returns published posts only. `listPublishedPosts(locale)`, `getPostBySlug(locale, slug)`, `listPublishedPostsForSitemap()`.
- `post-locale.ts` — pure functions: which locales a post exists in (title + slug + content present), the localized view of a post, and slug resolution:
  - `/vi/blog/<s>` matches `slug_vi`; `/en/blog/<s>` matches `slug_en`.
  - If `<s>` is the *other* locale's slug of a post that exists in the requested locale → 308 to that locale's slug.
  - Otherwise → 404 (no thin pages for a missing translation).
- `post-seo.ts` — pure functions: `postMetadata(post, locale)` and `postJsonLd(post, locale)`.

UI components get plain data from these modules (separation of concerns: UI ↔ logic ↔ DB).

### 5.2 `/[locale]/blog` (list)

- Server Component; inherits the locale layout's `revalidate = 30` (no own value).
- Lists published posts that exist in the page's locale, newest `published_at` first: cover (if any), category chip, localized date (`vi-VN` / `en-US`), title, excerpt.
- Category filter kept as a small client component over the server-rendered list (all posts stay in the HTML).
- `generateMetadata`: localized title ("Bài viết: quốc tịch, di trú, thuế | Manna One Solution" / "Articles: citizenship, immigration, tax | Manna One Solution"), localized description, canonical to itself; hreflang only for locales that have at least one published post (`x-default` = English if it has posts, else Vietnamese).
- A locale with no published posts (English, for this first batch) renders an empty-state page with `robots: { index: false }`, and its list URL is left out of the sitemap — no thin page in the index, no hreflang pointing at a noindex page.
- Subtitle copy without "expert"/"chuyên gia".

### 5.3 `/[locale]/blog/[slug]` (post)

- Server Component; inherits `revalidate = 30`; `notFound()` / `permanentRedirect()` from §5.1 slug resolution.
- Visible: breadcrumb (Trang chủ › Bài viết › title), H1 title, byline (`author_name`), "Đăng ngày … · Cập nhật ngày …" (`published_at`, `updated_at`), cover image, body (Markdown + GFM tables; `#` → H2; external links `rel="noopener"`), FAQ section rendered from `faq_<locale>`, then — for `category = 'immigration'` — the existing `immigration_scope_note` disclosure and a CTA block (N400 Ready + `/[locale]/services/immigration`).
- `generateMetadata` (from `postMetadata`):
  - `title` = post title; `description` = excerpt.
  - `alternates.canonical` = this URL; `languages` only for locales the post exists in; `x-default` = the English URL if it exists, else the Vietnamese one.
  - `openGraph`: `type: "article"`, `publishedTime`, `modifiedTime`, `images` = cover or the site OG image.
- JSON-LD (one `@graph` script, from `postJsonLd`):
  - `BlogPosting`: `headline`, `description`, `datePublished`, `dateModified`, `author` (the Organization `@id` when `author_name` is exactly "Manna One Solution", otherwise `{ "@type": "Person", name: author_name }`), `publisher: { "@id": ORGANIZATION_ID }`, `inLanguage`, `mainEntityOfPage`, `image`.
  - `BreadcrumbList`: home → blog → post.
  - `FAQPage`: only when the FAQ is non-empty, built from the same array the page renders (structured data must match visible text).

## 6. Sitemap and llms.txt

- `sitemap.ts` becomes async: adds each published post with `lastModified = updated_at` and alternates for the locales it exists in, and lists a locale's blog index only when that locale has posts (§5.2). The existing test "does not stamp the build time" keeps passing (static pages still carry no `lastModified`). DB failure → the static entries are still returned (log the error; never fail the sitemap).
- `llms.txt` gains one link to `/vi/blog` in its "Tiếng Việt" section; individual posts are not listed (it stays force-static). Its test keeps checking that every link is a live sitemap URL.

## 7. Admin editor (`/[locale]/admin/blog`)

- Per-language tab adds: **Slug** (auto-filled from that language's title by `slugify()` until edited by hand), **FAQ** (repeatable Q/A rows, add/remove), excerpt character counter (warn > 160).
- Shared fields add: **Author name**.
- `slugify()` (`src/lib/blog/slugify.ts`): lower-case, strip Vietnamese diacritics (NFD + remove combining marks, `đ/Đ → d`), non-alphanumerics → `-`, trim dashes. "Thi quốc tịch Mỹ 2026" → `thi-quoc-tich-my-2026`.
- **Publish guard:** "Published" requires at least one complete language (title + slug + content + excerpt); otherwise the toggle shows why.
- **Errors:** `savePost` checks the Supabase `error`; on failure the modal stays open with the message (e.g. duplicate slug); on success it closes and reloads.
- List row shows the Vietnamese title when there is no English one, and a "Xem bài" link for published posts.
- Out of this slice: SEO checklist warnings, image upload for covers (cover stays a URL field).

## 8. Content — first batch (Vietnamese only)

### 8.1 Posts

Slugs carry no year so the URL survives yearly updates; titles may carry the year.

| # | `slug_vi` | Working title | Primary query (Google autocomplete 2026-10-15) | Role |
|---|---|---|---|---|
| 1 | `thi-quoc-tich-my` | Thi quốc tịch Mỹ 2026: toàn bộ quy trình từ đơn N-400 đến lễ tuyên thệ | thi quốc tịch mỹ 2026; phỏng vấn quốc tịch mỹ; thi quốc tịch mỹ gồm những gì | Pillar (2,500–3,500 words) |
| 2 | `128-cau-hoi-thi-quoc-tich-my` | 128 câu hỏi thi quốc tịch Mỹ (bộ 2025) bằng tiếng Việt và cách học | 128 câu hỏi thi quốc tịch mỹ (2026 / tiếng việt) | Cluster — reference list |
| 3 | `thi-quoc-tich-my-cho-nguoi-tren-65-tuoi` | Thi quốc tịch Mỹ cho người trên 65 tuổi: miễn tiếng Anh, học bao nhiêu câu? | thi quốc tịch mỹ cho người trên 65 tuổi; thi quốc tịch mỹ bằng tiếng việt | Cluster |
| 4 | `cau-hoi-yes-no-don-n-400` | Câu hỏi Yes/No trong đơn N-400: mỗi câu hỏi điều gì | thi quốc tịch mỹ n400 yes/no | Cluster |
| 5 | `don-n-400-la-gi` | Đơn N-400 là gì? Điều kiện, lệ phí và các phần của đơn | đơn n 400 là gì; hướng dẫn điền đơn n 400; mẫu đơn n 400 | Cluster |
| 6 | `thi-quoc-tich-my-co-kho-khong` | Thi quốc tịch Mỹ có khó không? Tỷ lệ đậu và phần dễ rớt | thi quốc tịch mỹ khó không | Cluster |

Linking: every cluster links to the pillar and to at least two siblings; the pillar links to all five. Every post links to N400 Ready (`/n400ready`) and `/vi/services/immigration`, and to at least one uscis.gov page.

### 8.2 Writing rules (from the SEO/GEO skill, adapted)

- Answer the title's question in the first 2–3 sentences; each H2 opens with a direct answer.
- Specific facts (numbers, dates, form numbers) with the source linked where they appear; a "Nguồn" list at the end with the check date.
- 5–8 FAQ entries per post (stored in `faq_vi`, rendered and marked up).
- Plain Vietnamese for readers aged 50+; English terms in parentheses on first use (e.g. "thường trú nhân (green card)").
- No legal advice: describe what USCIS asks and what the rules say; for anything case-specific ("nếu bạn từng bị bắt…") point to a licensed immigration attorney.
- Excerpt ≤ 160 characters and contains the primary query.

### 8.3 Facts to verify on uscis.gov at writing time (not assumed)

- 2025 civics test: effective date (applications filed on/after 2025-10-20), number asked (up to 20 of 128), passing score (12), early stop rule, the 2008 test for earlier filings.
- 65/20 special consideration under the 2025 test (number of questions asked and needed) and the 50/20, 55/15 English exemptions; N-648.
- N-400 fees (paper vs online), reduced fee and fee waiver (I-912) eligibility; current processing times link.
- Naturalization eligibility (5 years / 3 years married to a U.S. citizen, continuous residence, physical presence, good moral character).
- Pass-rate data (USCIS "Applicant Performance on the Naturalization Test"), quoting the period it covers.
- The 128 questions and official answers: taken from the USCIS 2025 list (M-1778) and cross-checked with the N400 Ready question bank; time-sensitive answers (officials) point to uscis.gov/citizenship/testupdates and to N400 Ready's personalized answers.

### 8.4 Drafting and loading

- Drafts as Markdown files with front matter (`slug_vi`, `title_vi`, `excerpt_vi`, `category: immigration`, `faq_vi`) in `docs/content/blog/vi/<slug>.md` — readable in Obsidian, reviewed by the owner before anything is published.
- After approval, the posts are inserted with one SQL upsert per post (keyed on `slug_vi`), run only with the owner's OK; the owner can also paste them through the admin screen.

## 9. Testing

- **Unit (vitest, node):** `slugify` (Vietnamese diacritics, `đ`, punctuation, repeated dashes); `post-locale` (locale availability, slug resolution incl. cross-locale redirect and 404); `post-seo` (alternates only for existing locales, x-default rule, author Organization vs Person, BlogPosting fields, FAQPage only when FAQ non-empty, breadcrumb items); list-page alternates/noindex when a locale has no posts; sitemap with posts (DB module mocked — it is the external boundary), without English posts, and with a DB error; Markdown body renders a GFM table and demotes `#` to H2 (`renderToStaticMarkup`).
- **RLS:** rolled-back prod `DO` block matrix (anon / client / admin × select published, select draft, insert, update, delete).
- **Integration:** dev server + curl: list and post pages return full article text without JS, one canonical, hreflang matches the post's locales, JSON-LD parses; unknown slug → 404; other-locale slug → 308.
- **After deploy:** Google Rich Results Test on one post; `geo-optimizer` audit on one post (optional).
- Full website suite, `tsc --noEmit`, `eslint` stay at 0.

## 10. Rollout (each outward step needs the owner's OK at that moment)

1. Code + tests on the branch (no prod effect).
2. Apply the migration to prod + RLS matrix + advisors.
3. Push → Vercel deploy; verify `/vi/blog` live.
4. Owner reviews the six drafts → insert → verify each post page and the sitemap on prod.
5. Owner: request indexing of the pillar in Google Search Console and submit the sitemap in Bing Webmaster Tools.

## 11. Out of scope (follow-ups)

- `contact_submissions` (the other half of the ROADMAP P0 — leads are not stored on prod).
- English versions of the six articles.
- Public, indexable N400 Ready pages (landing + the 128 questions per state) — biggest untapped search demand, separate project.
- The four Vietnamese service pages showing English descriptions (`site_content` override).
- SEO checklist in the admin editor, cover image upload, RSS feed.

## 12. Owner answers (2026-10-15)

1. **Byline:** "Manna One Solution" (the default `author_name`; JSON-LD author = the Organization `@id`).
2. **N400 Ready "miễn phí":** yes — articles may call N400 Ready free.
3. **Cover images:** none for now; the site OG image is used.
