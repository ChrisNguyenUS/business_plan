# Blog search, topic filter and hashtags: design

**Date:** 2026-10-19
**App:** `apps/website` (mannaos.com)
**Status:** approved in chat 2026-10-19, pending spec review

## Goal

Readers of `/vi/blog` and `/en/blog` can find a post by typing what they remember ("bảo lãnh cha mẹ", "thi quoc tich", even "thi quôcs tịch"), narrow the list by a big topic, and jump between posts that share a hashtag. Each hashtag also gets its own indexable page, so a topic cluster (for example family petitions) ranks as a group.

## Decisions taken with the owner

| Question | Decision |
|---|---|
| How hashtags are managed | Fixed list defined in code; admin only ticks hashtags per post |
| Big-topic filter | Keep a category filter: Di trú Mỹ, Business, Thuế, Bảo hiểm, AI, Giấy tờ ở Mỹ |
| Categories with no posts | Hidden until they have at least one post |
| Indexable page per hashtag | Yes, in this project |

## Out of scope

- Writing posts for Business, Tax, Insurance, AI or U.S. paperwork.
- An admin screen for creating or renaming hashtags (new hashtags are a code change).
- Server-side or full-text search. The blog has 12 posts; client-side search over every card is enough until roughly 200 posts.
- Searching inside article bodies (titles, excerpts and hashtag names only).

## 1. Data

### Migration `website_02_blog_tags.sql`

- Replace the `category` check constraint so it allows `tax, insurance, immigration, ai, business, documents, general`.
- Add `tags text[] not null default '{}'`.
- No new RLS: the column inherits the existing `blog_posts` policies (anon reads published rows; only `is_admin()` writes).
- No index: the public pages load every published post and filter in memory.
- Backfill the 12 published posts with the mapping in section 2, in the same migration file.

The database does not check tag keys against the list. The app is the gatekeeper: the admin form only offers known keys, the public pages ignore unknown keys, and a test asserts that every key in the backfill exists in the registry.

### Category labels (`src/lib/blog/labels.ts`)

| Key | VI | EN |
|---|---|---|
| immigration | Di trú Mỹ | U.S. immigration |
| business | Business | Business |
| tax | Thuế | Tax |
| insurance | Bảo hiểm | Insurance |
| ai | AI | AI |
| documents | Giấy tờ ở Mỹ | U.S. paperwork |
| general | Chung | General |

Display order is the order above. `general` never appears as a filter button.

## 2. Hashtag registry (`src/lib/blog/tags.ts`)

One typed array. Each entry: `key` (stored in the DB, never changes), `category`, `slug` per locale, `label` per locale, `description` per locale (1–2 sentences used on the hashtag page and its meta description, at most 160 characters).

| key | category | VI slug / label | EN slug / label |
|---|---|---|---|
| citizenship-test | immigration | thi-quoc-tich / Thi quốc tịch | citizenship-test / Citizenship test |
| form-n-400 | immigration | don-n-400 / Đơn N-400 | form-n-400 / Form N-400 |
| green-card | immigration | the-xanh / Thẻ xanh | green-card / Green card |
| sponsor-spouse | immigration | bao-lanh-vo-chong / Bảo lãnh vợ chồng | sponsor-spouse / Sponsoring a spouse |
| sponsor-parents | immigration | bao-lanh-cha-me / Bảo lãnh cha mẹ | sponsor-parents / Sponsoring parents |
| family-petitions | immigration | bao-lanh-gia-dinh / Bảo lãnh gia đình | family-petitions / Family petitions |
| uscis-fees | immigration | le-phi-uscis / Lệ phí USCIS | uscis-fees / USCIS fees |
| older-applicants | immigration | nguoi-lon-tuoi / Người lớn tuổi | older-applicants / Older applicants |
| travel-abroad | immigration | di-lai-nuoc-ngoai / Đi lại nước ngoài | travel-abroad / Travel abroad |

Hashtags render with a leading `#` and normal spacing: **#Bảo lãnh cha mẹ**, not #bảolãnhchamẹ.

### Backfill (by `slug_vi`)

| Post | Tags |
|---|---|
| thi-quoc-tich-my | citizenship-test, form-n-400, uscis-fees |
| 128-cau-hoi-thi-quoc-tich-my | citizenship-test |
| thi-quoc-tich-my-cho-nguoi-tren-65-tuoi | citizenship-test, older-applicants |
| thi-quoc-tich-my-co-kho-khong | citizenship-test |
| cau-hoi-yes-no-don-n-400 | form-n-400 |
| don-n-400-la-gi | form-n-400, uscis-fees |
| gia-han-the-xanh | green-card, uscis-fees |
| the-xanh-2-nam-len-10-nam | green-card, sponsor-spouse, uscis-fees |
| co-the-xanh-ve-viet-nam-duoc-bao-lau | green-card, travel-abroad, uscis-fees |
| mat-the-xanh-phai-lam-sao | green-card, travel-abroad, uscis-fees |
| bao-lanh-vo-chong-sang-my | sponsor-spouse, family-petitions, uscis-fees |
| bao-lanh-cha-me-sang-my | sponsor-parents, family-petitions, uscis-fees |

### Helpers (pure, unit-tested)

- `tagsForPost(keys)` drops unknown keys and keeps registry order.
- `tagBySlug(locale, slug)` resolves a hashtag page URL.
- `tagPath(locale, key)` returns `/vi/blog/chu-de/<slug>` or `/en/blog/topics/<slug>`.
- `tagCounts(posts)` returns post counts per key for one locale's visible posts.

## 3. Search (`src/lib/blog/search.ts`, pure, unit-tested)

- `normalize(text)`: lowercase, Unicode NFD, strip combining marks, map `đ` to `d`, collapse non-letters/digits to spaces.
- Haystack per card: title + excerpt + hashtag labels in the page's locale, normalized once.
- A query matches a card when **every** query token matches some haystack word. A token matches a word when the word starts with the token, or when the token has 4+ characters and is within edit distance 1 of the word or of the word's same-length prefix.
- Examples that must pass: "thi quoc tich", "THI QUỐC TỊCH" and "thi quôcs tịch" find the citizenship posts; "bảo lãnh cha mẹ" finds the parents post first among results; "lệ phí" finds the posts tagged USCIS fees; "xyz" finds nothing.
- Result order: cards that match in the title first, then the existing date order.

## 4. Blog index (`/[locale]/blog`)

The page stays server-rendered with every card in the HTML. `BlogList` (client) adds:

1. **Search box** above the filters, with a clear button. It filters as the reader types (no submit button), debounced about 150 ms.
2. **Category buttons:** "Tất cả / All" plus each category that has posts in this locale, in the order of section 1.
3. **Hashtag chips:** hashtags of the visible category (all categories when "All"), each with its count (`#Thẻ xanh · 4`). Selecting a chip filters; selecting it again clears it. Only hashtags with at least one post show.
4. **URL state:** `?q=`, `?cat=` and `?tag=` (tag uses the locale slug) mirror the controls with `router.replace` and no scroll, so a filtered list can be shared on Zalo. On load the controls read these params. `useSearchParams` needs a `<Suspense>` boundary; its fallback renders the full unfiltered list so the HTML stays complete.
5. **Empty state:** "Không tìm thấy bài phù hợp" / "No matching articles", the five hashtags with the most posts, and a link to Zalo (`https://zalo.me/3468524454`, the number already used by `FloatingButtons`).
6. **Result count** line for screen readers and sighted readers: "12 bài viết" / "3 of 12 articles".

The `<title>`, canonical and robots of `/blog` do not change with query params; the canonical stays `/[locale]/blog`.

## 5. Hashtag pages

Routes: `src/app/[locale]/blog/chu-de/[tag]/page.tsx` (VI) and `src/app/[locale]/blog/topics/[tag]/page.tsx` (EN). Each one returns 404 for the other locale, for an unknown slug, and for a hashtag with no published post in that locale.

Content: breadcrumb (Trang chủ › Bài viết › #Hashtag), H1 `#<label>`, the registry description, the post cards (same card component), then chips to the other hashtags of the same category.

SEO:
- `title`: `<label>: bài viết | Manna One Solution` / `<label>: articles | Manna One Solution`; meta description from the registry.
- Canonical to itself; hreflang `vi`, `en` and `x-default` (en) only when the other locale's page also has posts, otherwise only its own locale.
- JSON-LD `@graph`: `CollectionPage` (with `isPartOf` the WebSite and `about` the hashtag label) plus `BreadcrumbList`, through the existing `serializeJsonLd`.
- Rendered on demand and cached by the `[locale]` layout's `revalidate = 30`, like the post pages (no `generateStaticParams`).

Sitemap: one entry per hashtag page that has posts, `lastModified` = the newest `updated_at` among its posts, with the same alternates rule as above.

## 6. Post page

Under the title and date line, show the post's hashtags as chips linking to their hashtag pages (only hashtags that resolve in this locale). No schema change; `BlogPosting.keywords` gets the hashtag labels.

## 7. Admin (`/[locale]/admin/blog`)

- `CATEGORIES` gains `business` and `documents` (the select shows keys, like today).
- A "Hashtags" fieldset of checkboxes lists the hashtags of the selected category. Changing the category keeps only the ticked hashtags that belong to it.
- Saving writes `tags` with the existing insert/update calls; no other admin behavior changes.

## 8. Errors and edge cases

- DB unavailable: index, hashtag pages and sitemap keep their current fallback behavior (empty list or the existing error path); hashtag pages return 404 rather than an empty page.
- Unknown `?tag=` or `?cat=` value: ignored, the full list shows.
- A post tagged with a key later removed from the registry: the key is ignored everywhere.
- A locale with no posts for a hashtag: no chip, no page, no sitemap entry for that locale.

## 9. Testing

Unit (vitest):
- `search.ts`: normalization, accents, `đ`, typo tolerance, multi-token AND, title-first ordering, empty query returns all.
- `tags.ts`: keys unique; slugs unique per locale and valid per `isValidSlug`; every label and description present in both locales; descriptions ≤ 160 characters; every backfill key exists.
- Hashtag page metadata and JSON-LD builders: canonical, alternates rule, CollectionPage + BreadcrumbList.
- Sitemap: hashtag entries only for hashtags with posts, per locale.
- `BlogList`: renders every card on the server; URL params restore filters (testing-library is not installed, so test the pure filter function plus a server render, following the existing `renderToStaticMarkup` tests).

Manual, on the local dev server from this worktree:
- `/vi/blog`: type "thi quôcs tịch", pick "Di trú Mỹ", pick "#Thẻ xanh", copy the URL into a new tab and see the same list.
- A hashtag page in both locales, its 404 cases, and the chips on a post page.
- Mobile width 375 px: chips wrap, no horizontal page scroll.

Then `vitest`, `tsc --noEmit` and `eslint` for the app.

## 10. Rollout

1. Apply `website_02_blog_tags.sql` to prod with `apply_migration` after the owner approves, then confirm the constraint, the column and the 12 backfilled rows with a read-only query.
2. Merge and push to `main`; Vercel deploys.
3. Check on prod: the search examples in section 3, two hashtag pages per locale, sitemap entries, and Rich Results Test on one hashtag page.
