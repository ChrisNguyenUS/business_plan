# Blog Search, Topic Filter and Hashtag Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Readers of mannaos.com/vi/blog and /en/blog can search posts without typing accents, filter by big topic and by hashtag, share the filtered URL, and land on an indexable page per hashtag.

**Architecture:** A `tags text[]` column on `blog_posts` stores stable hashtag keys; the hashtag list (labels, slugs, descriptions in VI/EN) lives in code (`src/lib/blog/tags.ts`). Search and filtering are pure functions run in the browser over the server-rendered card list. Hashtag pages are server-rendered routes (`/vi/blog/chu-de/<slug>`, `/en/blog/topics/<slug>`) that reuse the card grid and get their own metadata, JSON-LD and sitemap entries.

**Tech Stack:** Next.js 16.2 App Router (server components, `useSearchParams` + `Suspense`), TypeScript, Tailwind v4, Supabase Postgres, vitest (`renderToStaticMarkup` for component tests; testing-library is NOT installed).

**Spec:** `docs/superpowers/specs/2026-10-19-blog-search-tags-design.md`

**Order constraint (do not skip):** from Task 2 on, the code selects the `tags` column, which exists on prod only after Task 14 applies the migration. The local dev server also reads the prod database. So: never push to `main` before Task 14 Step 3, and do browser checks only in Task 14.

**Working directory for every command:** `apps/website` inside the worktree `/Users/anhnguyen/Obsidian/Business planning/.claude/worktrees/website-seo-fixes`. Run tests with `pnpm --filter website exec vitest run <path>`. The worktree guard rejects compound `cd … && git …` commands: run git commands plainly from the worktree.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/website_02_blog_tags.sql` | Create | Category constraint + `tags` column + backfill of 12 posts |
| `src/lib/blog/types.ts` | Modify | `tags` on `BlogPostRow` and `LocalizedPost` |
| `src/lib/blog/queries.ts` | Modify | Select `tags` |
| `src/lib/blog/post-locale.ts` | Modify | Carry `tags`; `postsForTag`, `localesWithTag` |
| `src/lib/blog/labels.ts` | Modify | Category order/labels, new UI strings |
| `src/lib/blog/tags.ts` | Create | Hashtag registry + lookups |
| `src/lib/blog/search.ts` | Create | Accent-insensitive, typo-tolerant search |
| `src/lib/blog/blog-filter.ts` | Create | Filter state, URL params, category/tag counts |
| `src/lib/blog/tag-seo.ts` | Create | Hashtag page metadata + JSON-LD |
| `src/lib/blog/tag-route.ts` | Create | Load a hashtag page's data or `null` (404) |
| `src/lib/blog/post-seo.ts` | Modify | `keywords` in BlogPosting |
| `src/components/blog/BlogCardGrid.tsx` | Create | Card type, `toBlogCard`, card grid (server-safe) |
| `src/components/blog/BlogList.tsx` | Rewrite | Search box, category buttons, hashtag chips, URL sync, empty state |
| `src/components/blog/TagPageView.tsx` | Create | Hashtag page body + metadata loader |
| `src/app/[locale]/blog/page.tsx` | Modify | Use `toBlogCard`, `Suspense` |
| `src/app/[locale]/blog/chu-de/[tag]/page.tsx` | Create | VI hashtag route |
| `src/app/[locale]/blog/topics/[tag]/page.tsx` | Create | EN hashtag route |
| `src/app/[locale]/blog/[slug]/page.tsx` | Modify | Hashtag chips under the title |
| `src/app/sitemap.ts` | Modify | Hashtag page entries |
| `src/app/[locale]/admin/blog/page.tsx` | Modify | New categories + hashtag checkboxes |

Tests live next to their modules (`*.test.ts` / `*.test.tsx`), as the repo already does.

---

### Task 1: Migration file

**Files:**
- Create: `supabase/migrations/website_02_blog_tags.sql`

- [ ] **Step 1: Write the migration**

```sql
-- website_02: two new big topics (business, documents) and hashtags on blog posts.
-- Hashtag keys come from the fixed registry in src/lib/blog/tags.ts; the app is the
-- gatekeeper (admin offers only known keys, public pages ignore unknown ones).
-- The column inherits the blog_posts RLS policies and table-level grants from website_01.

alter table public.blog_posts drop constraint if exists blog_posts_category_check;
alter table public.blog_posts add constraint blog_posts_category_check
  check (category in ('tax', 'insurance', 'immigration', 'ai', 'business', 'documents', 'general'));

alter table public.blog_posts add column if not exists tags text[] not null default '{}';

-- Backfill the 12 posts published on 2026-10-19 (matched by slug_vi).
update public.blog_posts set tags = array['citizenship-test', 'form-n-400', 'uscis-fees'] where slug_vi = 'thi-quoc-tich-my';
update public.blog_posts set tags = array['citizenship-test'] where slug_vi = '128-cau-hoi-thi-quoc-tich-my';
update public.blog_posts set tags = array['citizenship-test', 'older-applicants'] where slug_vi = 'thi-quoc-tich-my-cho-nguoi-tren-65-tuoi';
update public.blog_posts set tags = array['citizenship-test'] where slug_vi = 'thi-quoc-tich-my-co-kho-khong';
update public.blog_posts set tags = array['form-n-400'] where slug_vi = 'cau-hoi-yes-no-don-n-400';
update public.blog_posts set tags = array['form-n-400', 'uscis-fees'] where slug_vi = 'don-n-400-la-gi';
update public.blog_posts set tags = array['green-card', 'uscis-fees'] where slug_vi = 'gia-han-the-xanh';
update public.blog_posts set tags = array['green-card', 'sponsor-spouse', 'uscis-fees'] where slug_vi = 'the-xanh-2-nam-len-10-nam';
update public.blog_posts set tags = array['green-card', 'travel-abroad', 'uscis-fees'] where slug_vi = 'co-the-xanh-ve-viet-nam-duoc-bao-lau';
update public.blog_posts set tags = array['green-card', 'travel-abroad', 'uscis-fees'] where slug_vi = 'mat-the-xanh-phai-lam-sao';
update public.blog_posts set tags = array['sponsor-spouse', 'family-petitions', 'uscis-fees'] where slug_vi = 'bao-lanh-vo-chong-sang-my';
update public.blog_posts set tags = array['sponsor-parents', 'family-petitions', 'uscis-fees'] where slug_vi = 'bao-lanh-cha-me-sang-my';
```

- [ ] **Step 2: Commit** (the file is applied to prod only in Task 14, after the owner approves)

```bash
git add apps/website/supabase/migrations/website_02_blog_tags.sql
git commit -m "feat(website): migration for blog hashtags and two new categories"
```

---

### Task 2: `tags` on the row and the localized post

**Files:**
- Modify: `src/lib/blog/types.ts`, `src/lib/blog/queries.ts`, `src/lib/blog/post-locale.ts`
- Test: `src/lib/blog/post-locale.test.ts`, fixtures in `src/lib/blog/post-seo.test.ts` and `src/app/sitemap.test.ts`

- [ ] **Step 1: Write the failing tests** (append to `src/lib/blog/post-locale.test.ts`; also add `tags: [],` to the `row()` defaults after `category: "immigration",`)

```ts
import { localesWithTag, postsForTag } from "./post-locale";

describe("hashtags on posts", () => {
  const tagged = row({
    id: "p3", tags: ["green-card", "uscis-fees"],
    slug_vi: "gia-han-the-xanh", title_vi: "Gia hạn thẻ xanh", content_vi: "Nội dung",
  });

  it("carries the row's tags onto the localized post", () => {
    expect(localizePost(tagged, "vi")?.tags).toEqual(["green-card", "uscis-fees"]);
  });

  it("treats a missing tags value as no tags", () => {
    expect(localizePost(row({ ...viOnly, tags: undefined as unknown as string[] }), "vi")?.tags).toEqual([]);
  });

  it("lists a hashtag's posts in one locale", () => {
    expect(postsForTag([tagged, viOnly], "green-card", "vi").map((p) => p.id)).toEqual(["p3"]);
    expect(postsForTag([tagged, viOnly], "green-card", "en")).toEqual([]);
  });

  it("lists the locales where a hashtag has posts", () => {
    expect(localesWithTag([tagged], "green-card")).toEqual(["vi"]);
    expect(localesWithTag([tagged], "sponsor-parents")).toEqual([]);
  });
});
```

Also update the existing `localizePost` expectation object in that file (around line 49) to include `tags: []`.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter website exec vitest run src/lib/blog/post-locale.test.ts`
Expected: FAIL (`postsForTag` is not exported; `tags` missing).

- [ ] **Step 3: Implement**

`src/lib/blog/types.ts`: in `BlogPostRow` add after `category: string;`:

```ts
  /** Hashtag keys from src/lib/blog/tags.ts (migration website_02). */
  tags: string[];
```

and in `LocalizedPost` after `category: string;`:

```ts
  tags: string[];
```

`src/lib/blog/queries.ts`: change the `COLUMNS` second line to:

```ts
  "author_name,cover_image_url,category,tags,post_type,published,published_at,created_at,updated_at";
```

`src/lib/blog/post-locale.ts`: in `localizePost`'s returned object add after `category: post.category,`:

```ts
    tags: post.tags ?? [],
```

and append:

```ts
/** A hashtag's posts as one locale's pages see them, in the rows' order. */
export function postsForTag(rows: BlogPostRow[], key: string, locale: Locale): LocalizedPost[] {
  return rows.filter((r) => (r.tags ?? []).includes(key)).flatMap((r) => localizePost(r, locale) ?? []);
}

/** Locales in which a hashtag page has at least one post. */
export function localesWithTag(rows: BlogPostRow[], key: string): Locale[] {
  return locales.filter((l) => postsForTag(rows, key, l).length > 0);
}
```

Fixtures: add `tags: [],` to the `viPost` object in `src/app/sitemap.test.ts` (after `category: "immigration",`) and to the `post` object in `src/lib/blog/post-seo.test.ts` (after `category: "immigration",`).

- [ ] **Step 4: Run tests and type-check**

Run: `pnpm --filter website exec vitest run src/lib/blog src/app/sitemap.test.ts`
Expected: PASS.
Run: `pnpm --filter website exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/blog apps/website/src/app/sitemap.test.ts
git commit -m "feat(website): carry blog post hashtags from the row to the page"
```

---

### Task 3: Category order, labels and UI strings

**Files:**
- Modify: `src/lib/blog/labels.ts`
- Test: `src/lib/blog/labels.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { BLOG_LABELS, CATEGORY_LABELS, CATEGORY_ORDER } from "./labels";

describe("blog labels", () => {
  it("orders the six filterable categories and never lists general", () => {
    expect(CATEGORY_ORDER).toEqual(["immigration", "business", "tax", "insurance", "ai", "documents"]);
  });

  it("names every category in both languages", () => {
    for (const key of [...CATEGORY_ORDER, "general"]) {
      expect(CATEGORY_LABELS.vi[key]).toBeTruthy();
      expect(CATEGORY_LABELS.en[key]).toBeTruthy();
    }
    expect(CATEGORY_LABELS.vi.immigration).toBe("Di trú Mỹ");
    expect(CATEGORY_LABELS.vi.documents).toBe("Giấy tờ ở Mỹ");
  });

  it("has the same UI string keys in both languages", () => {
    expect(Object.keys(BLOG_LABELS.vi).sort()).toEqual(Object.keys(BLOG_LABELS.en).sort());
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter website exec vitest run src/lib/blog/labels.test.ts`
Expected: FAIL (`CATEGORY_ORDER` not exported).

- [ ] **Step 3: Implement** in `src/lib/blog/labels.ts`

Add to `BLOG_LABELS.vi` (after `all: "Tất cả",`):

```ts
    searchLabel: "Tìm bài viết",
    searchPlaceholder: "Tìm bài: thi quốc tịch, bảo lãnh cha mẹ, thẻ xanh…",
    clearSearch: "Xóa tìm kiếm",
    countAll: "{total} bài viết",
    countSome: "{shown}/{total} bài viết",
    noResults: "Không tìm thấy bài phù hợp.",
    popularTags: "Chủ đề nhiều bài:",
    askZalo: "Hỏi Manna qua Zalo",
    tagsLabel: "Hashtag",
    tagTitleSuffix: "bài viết",
    relatedTags: "Chủ đề liên quan",
```

Add to `BLOG_LABELS.en` (after `all: "All",`):

```ts
    searchLabel: "Search articles",
    searchPlaceholder: "Search: citizenship test, sponsoring parents, green card…",
    clearSearch: "Clear search",
    countAll: "{total} articles",
    countSome: "{shown} of {total} articles",
    noResults: "No matching articles.",
    popularTags: "Popular topics:",
    askZalo: "Ask Manna on Zalo",
    tagsLabel: "Hashtags",
    tagTitleSuffix: "articles",
    relatedTags: "Related topics",
```

Replace `CATEGORY_LABELS` with:

```ts
/** Big topics shown as filter buttons, in display order. "general" is a fallback, never a filter. */
export const CATEGORY_ORDER = ["immigration", "business", "tax", "insurance", "ai", "documents"] as const;

export const CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  vi: {
    immigration: "Di trú Mỹ", business: "Business", tax: "Thuế", insurance: "Bảo hiểm",
    ai: "AI", documents: "Giấy tờ ở Mỹ", general: "Chung",
  },
  en: {
    immigration: "U.S. immigration", business: "Business", tax: "Tax", insurance: "Insurance",
    ai: "AI", documents: "U.S. paperwork", general: "General",
  },
};
```

- [ ] **Step 4: Run test**

Run: `pnpm --filter website exec vitest run src/lib/blog/labels.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/blog/labels.ts apps/website/src/lib/blog/labels.test.ts
git commit -m "feat(website): blog category order, two new categories and search strings"
```

---

### Task 4: Hashtag registry

**Files:**
- Create: `src/lib/blog/tags.ts`
- Test: `src/lib/blog/tags.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isValidSlug } from "./slugify";
import { BLOG_TAGS, keepTagsForCategory, tagBySlug, tagPath, tagsForPost, tagsInCategory } from "./tags";

describe("BLOG_TAGS registry", () => {
  it("has unique keys and unique valid slugs per locale", () => {
    const keys = BLOG_TAGS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const locale of ["vi", "en"] as const) {
      const slugs = BLOG_TAGS.map((t) => t.slug[locale]);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const s of slugs) expect(isValidSlug(s)).toBe(true);
    }
  });

  it("has a label and a description of at most 160 characters in both locales", () => {
    for (const t of BLOG_TAGS) {
      for (const locale of ["vi", "en"] as const) {
        expect(t.label[locale].trim()).not.toBe("");
        expect(t.description[locale].trim()).not.toBe("");
        expect(t.description[locale].length).toBeLessThanOrEqual(160);
      }
    }
  });

  it("covers every key the backfill migration writes", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/website_02_blog_tags.sql"), "utf8");
    const used = [...sql.matchAll(/array\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
    expect(used.length).toBeGreaterThan(0);
    const known = new Set(BLOG_TAGS.map((t) => t.key));
    for (const key of used) expect(known.has(key)).toBe(true);
  });
});

describe("hashtag lookups", () => {
  it("drops unknown keys and keeps registry order", () => {
    expect(tagsForPost(["uscis-fees", "nope", "green-card"]).map((t) => t.key)).toEqual(["green-card", "uscis-fees"]);
  });

  it("finds a hashtag by its locale slug", () => {
    expect(tagBySlug("vi", "bao-lanh-cha-me")?.key).toBe("sponsor-parents");
    expect(tagBySlug("en", "bao-lanh-cha-me")).toBeNull();
  });

  it("builds the localized hashtag page path", () => {
    expect(tagPath("vi", "sponsor-parents")).toBe("/vi/blog/chu-de/bao-lanh-cha-me");
    expect(tagPath("en", "sponsor-parents")).toBe("/en/blog/topics/sponsor-parents");
  });

  it("lists hashtags of one category and keeps only those when the category changes", () => {
    expect(tagsInCategory("immigration").length).toBe(BLOG_TAGS.length);
    expect(tagsInCategory("tax")).toEqual([]);
    expect(keepTagsForCategory(["green-card", "nope"], "immigration")).toEqual(["green-card"]);
    expect(keepTagsForCategory(["green-card"], "tax")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter website exec vitest run src/lib/blog/tags.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/lib/blog/tags.ts`

```ts
import type { Locale } from "@/lib/i18n/config";

/** One hashtag. `key` is stored in blog_posts.tags and never changes; slugs and labels may. */
export interface BlogTag {
  key: string;
  category: string;
  slug: Record<Locale, string>;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
}

// Fixed list (owner decision 2026-10-19): new hashtags are a code change, the admin only ticks them.
export const BLOG_TAGS: readonly BlogTag[] = [
  {
    key: "citizenship-test",
    category: "immigration",
    slug: { vi: "thi-quoc-tich", en: "citizenship-test" },
    label: { vi: "Thi quốc tịch", en: "Citizenship test" },
    description: {
      vi: "Bài viết về bài thi quốc tịch Mỹ: 128 câu hỏi công dân, thi tiếng Anh, tỷ lệ đậu và cách ôn, theo hướng dẫn của USCIS.",
      en: "Articles on the U.S. citizenship test: the 128 civics questions, the English test, pass rates and how to study, from USCIS guidance.",
    },
  },
  {
    key: "form-n-400",
    category: "immigration",
    slug: { vi: "don-n-400", en: "form-n-400" },
    label: { vi: "Đơn N-400", en: "Form N-400" },
    description: {
      vi: "Đơn N-400 xin nhập quốc tịch Mỹ: điều kiện, lệ phí, các phần của đơn và các câu hỏi Yes/No.",
      en: "Form N-400, the application for U.S. citizenship: eligibility, fees, the parts of the form and the Yes/No questions.",
    },
  },
  {
    key: "green-card",
    category: "immigration",
    slug: { vi: "the-xanh", en: "green-card" },
    label: { vi: "Thẻ xanh", en: "Green card" },
    description: {
      vi: "Thẻ xanh Mỹ: gia hạn bằng I-90, thẻ 2 năm lên 10 năm, mất thẻ và đi nước ngoài bao lâu thì an toàn.",
      en: "U.S. green cards: renewing with Form I-90, 2-year to 10-year cards, lost cards, and how long you can stay abroad.",
    },
  },
  {
    key: "sponsor-spouse",
    category: "immigration",
    slug: { vi: "bao-lanh-vo-chong", en: "sponsor-spouse" },
    label: { vi: "Bảo lãnh vợ chồng", en: "Sponsoring a spouse" },
    description: {
      vi: "Bảo lãnh vợ chồng sang Mỹ: ai được bảo lãnh, Form I-130, thời gian chờ, lệ phí và thẻ xanh 2 năm.",
      en: "Sponsoring a husband or wife for a green card: who qualifies, Form I-130, wait times, fees and the 2-year card.",
    },
  },
  {
    key: "sponsor-parents",
    category: "immigration",
    slug: { vi: "bao-lanh-cha-me", en: "sponsor-parents" },
    label: { vi: "Bảo lãnh cha mẹ", en: "Sponsoring parents" },
    description: {
      vi: "Bảo lãnh cha mẹ sang Mỹ: điều kiện người bảo lãnh, Form I-130 và I-864, lệ phí và các bước tại NVC.",
      en: "Sponsoring your parents for a green card: who can file, Forms I-130 and I-864, fees and the NVC steps.",
    },
  },
  {
    key: "family-petitions",
    category: "immigration",
    slug: { vi: "bao-lanh-gia-dinh", en: "family-petitions" },
    label: { vi: "Bảo lãnh gia đình", en: "Family petitions" },
    description: {
      vi: "Bảo lãnh người thân sang Mỹ theo diện gia đình: vợ chồng, cha mẹ, hồ sơ I-130 và thời gian chờ visa.",
      en: "Family-based green card petitions: spouses, parents, Form I-130 and visa wait times.",
    },
  },
  {
    key: "uscis-fees",
    category: "immigration",
    slug: { vi: "le-phi-uscis", en: "uscis-fees" },
    label: { vi: "Lệ phí USCIS", en: "USCIS fees" },
    description: {
      vi: "Lệ phí USCIS cho các đơn N-400, I-90, I-751, I-130 và hơn nữa, theo bảng phí G-1055, có ghi ngày kiểm tra.",
      en: "USCIS filing fees for Forms N-400, I-90, I-751, I-130 and more, from the G-1055 fee schedule with the date checked.",
    },
  },
  {
    key: "older-applicants",
    category: "immigration",
    slug: { vi: "nguoi-lon-tuoi", en: "older-applicants" },
    label: { vi: "Người lớn tuổi", en: "Older applicants" },
    description: {
      vi: "Thi quốc tịch cho người lớn tuổi: diện 65/20, 50/20, 55/15, thi bằng tiếng Việt và 20 câu hỏi đặc biệt.",
      en: "The citizenship test for older applicants: the 65/20, 50/20 and 55/15 exemptions, testing in your language, and the 20 questions.",
    },
  },
  {
    key: "travel-abroad",
    category: "immigration",
    slug: { vi: "di-lai-nuoc-ngoai", en: "travel-abroad" },
    label: { vi: "Đi lại nước ngoài", en: "Travel abroad" },
    description: {
      vi: "Đi nước ngoài khi có thẻ xanh: ở bao lâu thì an toàn, giấy phép tái nhập cảnh, mất thẻ ở nước ngoài.",
      en: "Traveling abroad with a green card: how long you can stay, reentry permits, and what to do if you lose your card.",
    },
  },
];

/** URL segment between /blog/ and the hashtag slug. */
export const TAG_SEGMENT: Record<Locale, string> = { vi: "chu-de", en: "topics" };

const BY_KEY = new Map(BLOG_TAGS.map((t) => [t.key, t]));

export function tagByKey(key: string): BlogTag | null {
  return BY_KEY.get(key) ?? null;
}

/** A post's hashtags in registry order; unknown keys are ignored. */
export function tagsForPost(keys: readonly string[]): BlogTag[] {
  return BLOG_TAGS.filter((t) => keys.includes(t.key));
}

export function tagBySlug(locale: Locale, slug: string): BlogTag | null {
  return BLOG_TAGS.find((t) => t.slug[locale] === slug) ?? null;
}

export function tagPath(locale: Locale, key: string): string {
  const tag = BY_KEY.get(key);
  if (!tag) throw new Error(`unknown blog tag: ${key}`);
  return `/${locale}/blog/${TAG_SEGMENT[locale]}/${tag.slug[locale]}`;
}

export function tagsInCategory(category: string): BlogTag[] {
  return BLOG_TAGS.filter((t) => t.category === category);
}

/** Admin: when a post's category changes, keep only the hashtags that belong to the new one. */
export function keepTagsForCategory(keys: readonly string[], category: string): string[] {
  return keys.filter((k) => BY_KEY.get(k)?.category === category);
}
```

- [ ] **Step 4: Run test**

Run: `pnpm --filter website exec vitest run src/lib/blog/tags.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/blog/tags.ts apps/website/src/lib/blog/tags.test.ts
git commit -m "feat(website): fixed bilingual hashtag registry for the blog"
```

---

### Task 5: Search

**Files:**
- Create: `src/lib/blog/search.ts`
- Test: `src/lib/blog/search.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { normalize, searchDoc, searchItems, tokenMatchesWord } from "./search";

type Item = { id: string; title: string; excerpt: string };
const items: Item[] = [
  { id: "parents", title: "Bảo lãnh cha mẹ sang Mỹ", excerpt: "Chỉ công dân Mỹ từ 21 tuổi được bảo lãnh." },
  { id: "spouse", title: "Bảo lãnh vợ chồng sang Mỹ", excerpt: "Vợ/chồng của công dân Mỹ không chờ số visa." },
  { id: "test", title: "Thi quốc tịch Mỹ 2026", excerpt: "Toàn bộ quy trình từ đơn N-400 đến lễ tuyên thệ." },
  { id: "fees-body", title: "Gia hạn thẻ xanh", excerpt: "Lệ phí $415 nếu nộp online." },
  { id: "fees-title", title: "Lệ phí USCIS 2026", excerpt: "Bảng phí G-1055." },
];
const run = (q: string) => searchItems(items, q, (i) => searchDoc(i.title, i.excerpt)).map((i) => i.id);

describe("normalize", () => {
  it("lowercases, strips Vietnamese accents, maps đ and collapses punctuation", () => {
    expect(normalize("Thi Quốc Tịch Mỹ")).toBe("thi quoc tich my");
    expect(normalize("Đơn N-400")).toBe("don n 400");
    expect(normalize("  Vợ/chồng!! ")).toBe("vo chong");
  });
});

describe("tokenMatchesWord", () => {
  it("matches prefixes", () => {
    expect(tokenMatchesWord("quo", "quoc")).toBe(true);
  });
  it("forgives one typo in tokens of 4+ characters only", () => {
    expect(tokenMatchesWord("quocs", "quoc")).toBe(true);
    expect(tokenMatchesWord("tihc", "tich")).toBe(false);
    expect(tokenMatchesWord("tixh", "tich")).toBe(true);
    expect(tokenMatchesWord("tch", "tich")).toBe(false);
  });
});

describe("searchItems", () => {
  it("returns everything for an empty query", () => {
    expect(run("  ")).toEqual(items.map((i) => i.id));
  });
  it("ignores accents and case, and forgives a typo", () => {
    expect(run("thi quoc tich")).toEqual(["test"]);
    expect(run("THI QUỐC TỊCH")).toEqual(["test"]);
    expect(run("thi quôcs tịch")).toEqual(["test"]);
  });
  it("requires every word to match", () => {
    expect(run("bảo lãnh cha mẹ")).toEqual(["parents"]);
    expect(run("bao lanh")).toEqual(["parents", "spouse"]);
  });
  it("puts title matches before body matches", () => {
    expect(run("lệ phí")).toEqual(["fees-title", "fees-body"]);
  });
  it("finds nothing for unrelated words", () => {
    expect(run("xyz")).toEqual([]);
  });
});
```

Note on `tihc`: a transposition counts as 2 edits under the plain edit distance used here, so it does not match; `tixh` (one substitution) does. This is intended: one typo means one inserted, deleted or substituted letter.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter website exec vitest run src/lib/blog/search.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/lib/blog/search.ts`

```ts
/** Words of a card, normalized: title words alone, and every searchable word. */
export interface SearchDoc {
  title: string[];
  all: string[];
}

/** Lowercase, drop Vietnamese accents (đ→d), keep letters and digits separated by single spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const words = (text: string): string[] => (text ? normalize(text).split(" ").filter(Boolean) : []);

export function searchDoc(title: string, ...rest: string[]): SearchDoc {
  const t = words(title);
  return { title: t, all: [...t, ...rest.flatMap(words)] };
}

// True when a and b differ by at most one inserted, deleted or substituted character.
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

export function tokenMatchesWord(token: string, word: string): boolean {
  if (word.startsWith(token)) return true;
  if (token.length < 4) return false;
  return withinOneEdit(token, word) || withinOneEdit(token, word.slice(0, token.length));
}

const allMatch = (tokens: string[], ws: string[]) => tokens.every((tok) => ws.some((w) => tokenMatchesWord(tok, w)));

/** Items whose words match every query token; title matches first, input order otherwise. */
export function searchItems<T>(items: readonly T[], query: string, doc: (item: T) => SearchDoc): T[] {
  const tokens = words(query);
  if (tokens.length === 0) return [...items];
  const inTitle: T[] = [];
  const elsewhere: T[] = [];
  for (const item of items) {
    const d = doc(item);
    if (allMatch(tokens, d.title)) inTitle.push(item);
    else if (allMatch(tokens, d.all)) elsewhere.push(item);
  }
  return [...inTitle, ...elsewhere];
}
```

- [ ] **Step 4: Run test**

Run: `pnpm --filter website exec vitest run src/lib/blog/search.test.ts`
Expected: PASS. If `run("bao lanh")` returns more ids, check the fixtures, not the matcher: only the two "Bảo lãnh" titles contain both words.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/blog/search.ts apps/website/src/lib/blog/search.test.ts
git commit -m "feat(website): accent-insensitive, typo-tolerant blog search"
```

---

### Task 6: Filter state and counts

**Files:**
- Create: `src/lib/blog/blog-filter.ts`
- Test: `src/lib/blog/blog-filter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { filterCards, filterToSearch, parseFilter, tagCountsFor, topTags, visibleCategories, type FilterableCard } from "./blog-filter";

const card = (id: string, title: string, tags: string[], category = "immigration"): FilterableCard & { id: string } => ({
  id, title, excerpt: "", category, tags,
});
const cards = [
  card("a", "Gia hạn thẻ xanh", ["green-card", "uscis-fees"]),
  card("b", "Mất thẻ xanh", ["green-card", "travel-abroad"]),
  card("c", "Bảo lãnh cha mẹ", ["sponsor-parents", "family-petitions"]),
  card("d", "Khai thuế 2027", [], "tax"),
];
const params = (q: string) => new URLSearchParams(q);

describe("parseFilter / filterToSearch", () => {
  it("reads q, a known category and a hashtag slug in the page's locale", () => {
    expect(parseFilter(params("q=th%E1%BA%BB&cat=tax&tag=the-xanh"), "vi")).toEqual({ q: "thẻ", cat: "tax", tag: "green-card" });
  });
  it("ignores unknown categories, general and slugs from the other locale", () => {
    expect(parseFilter(params("cat=general&tag=green-card"), "vi")).toEqual({ q: "", cat: null, tag: null });
  });
  it("writes only the set fields, with the tag as a locale slug", () => {
    expect(filterToSearch({ q: " lệ phí ", cat: null, tag: "green-card" }, "en")).toBe("?q=l%E1%BB%87+ph%C3%AD&tag=green-card");
    expect(filterToSearch({ q: "", cat: null, tag: null }, "vi")).toBe("");
  });
});

describe("filterCards", () => {
  it("filters by category, hashtag and search together", () => {
    expect(filterCards(cards, { q: "", cat: "tax", tag: null }, "vi").map((c) => c.id)).toEqual(["d"]);
    expect(filterCards(cards, { q: "", cat: null, tag: "green-card" }, "vi").map((c) => c.id)).toEqual(["a", "b"]);
    expect(filterCards(cards, { q: "mat", cat: null, tag: "green-card" }, "vi").map((c) => c.id)).toEqual(["b"]);
  });
  it("searches hashtag labels in the page's locale", () => {
    expect(filterCards(cards, { q: "bao lanh gia dinh", cat: null, tag: null }, "vi").map((c) => c.id)).toEqual(["c"]);
    expect(filterCards(cards, { q: "family petitions", cat: null, tag: null }, "en").map((c) => c.id)).toEqual(["c"]);
  });
});

describe("categories and hashtag counts", () => {
  it("shows only categories with posts, in display order", () => {
    expect(visibleCategories(cards)).toEqual(["immigration", "tax"]);
  });
  it("counts hashtags within the selected category, registry order, zero counts dropped", () => {
    expect(tagCountsFor(cards, null).map((x) => [x.tag.key, x.count])).toEqual([
      ["green-card", 2], ["sponsor-parents", 1], ["family-petitions", 1], ["uscis-fees", 1], ["travel-abroad", 1],
    ]);
    expect(tagCountsFor(cards, "tax")).toEqual([]);
  });
  it("lists the most used hashtags first for the empty state", () => {
    expect(topTags(cards, 2).map((x) => x.tag.key)).toEqual(["green-card", "sponsor-parents"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter website exec vitest run src/lib/blog/blog-filter.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/lib/blog/blog-filter.ts`

```ts
import type { Locale } from "@/lib/i18n/config";
import { CATEGORY_ORDER } from "./labels";
import { searchDoc, searchItems } from "./search";
import { BLOG_TAGS, tagBySlug, tagByKey, tagsForPost, type BlogTag } from "./tags";

export interface FilterableCard {
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
}

/** `tag` is a hashtag key; the URL carries the locale slug instead. */
export interface BlogFilter {
  q: string;
  cat: string | null;
  tag: string | null;
}

const isCategory = (c: string) => (CATEGORY_ORDER as readonly string[]).includes(c);

export function parseFilter(params: { get(name: string): string | null }, locale: Locale): BlogFilter {
  const cat = params.get("cat");
  const tagSlug = params.get("tag");
  return {
    q: params.get("q") ?? "",
    cat: cat && isCategory(cat) ? cat : null,
    tag: tagSlug ? (tagBySlug(locale, tagSlug)?.key ?? null) : null,
  };
}

export function filterToSearch(f: BlogFilter, locale: Locale): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.cat) p.set("cat", f.cat);
  const tag = f.tag ? tagByKey(f.tag) : null;
  if (tag) p.set("tag", tag.slug[locale]);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function filterCards<T extends FilterableCard>(cards: readonly T[], f: BlogFilter, locale: Locale): T[] {
  const narrowed = cards.filter((c) => (!f.cat || c.category === f.cat) && (!f.tag || c.tags.includes(f.tag)));
  return searchItems(narrowed, f.q, (c) => searchDoc(c.title, c.excerpt, ...tagsForPost(c.tags).map((t) => t.label[locale])));
}

export function visibleCategories(cards: readonly FilterableCard[]): string[] {
  return CATEGORY_ORDER.filter((cat) => cards.some((c) => c.category === cat));
}

export interface TagCount {
  tag: BlogTag;
  count: number;
}

export function tagCountsFor(cards: readonly FilterableCard[], cat: string | null): TagCount[] {
  const pool = cat ? cards.filter((c) => c.category === cat) : cards;
  return BLOG_TAGS.map((tag) => ({ tag, count: pool.filter((c) => c.tags.includes(tag.key)).length })).filter((x) => x.count > 0);
}

/** Most used hashtags first; ties keep registry order (Array.prototype.sort is stable). */
export function topTags(cards: readonly FilterableCard[], n = 5): TagCount[] {
  return [...tagCountsFor(cards, null)].sort((a, b) => b.count - a.count).slice(0, n);
}
```

- [ ] **Step 4: Run test**

Run: `pnpm --filter website exec vitest run src/lib/blog/blog-filter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/blog/blog-filter.ts apps/website/src/lib/blog/blog-filter.test.ts
git commit -m "feat(website): blog filter state, URL params and hashtag counts"
```

---

### Task 7: Card grid component

**Files:**
- Create: `src/components/blog/BlogCardGrid.tsx`
- Test: `src/components/blog/BlogCardGrid.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlogCardGrid, toBlogCard } from "./BlogCardGrid";
import type { LocalizedPost } from "@/lib/blog/types";

const post: LocalizedPost = {
  id: "p1", locale: "vi", slug: "gia-han-the-xanh", title: "Gia hạn thẻ xanh", excerpt: "Tóm tắt",
  content: "x", faq: [], authorName: "Manna One Solution", coverImageUrl: null, category: "immigration",
  tags: ["green-card"], publishedAt: "2026-10-19T19:43:00Z", updatedAt: "2026-10-19T20:00:00Z", slugs: { vi: "gia-han-the-xanh" },
};

describe("BlogCardGrid", () => {
  it("maps a post to a card linking to its own locale", () => {
    const card = toBlogCard(post, "vi");
    expect(card).toMatchObject({ id: "p1", href: "/vi/blog/gia-han-the-xanh", tags: ["green-card"], category: "immigration" });
    expect(card.dateLabel).toContain("2026");
  });

  it("renders every card with its category label", () => {
    const html = renderToStaticMarkup(<BlogCardGrid cards={[toBlogCard(post, "vi")]} categoryLabels={{ immigration: "Di trú Mỹ" }} />);
    expect(html).toContain('href="/vi/blog/gia-han-the-xanh"');
    expect(html).toContain("Di trú Mỹ");
    expect(html).toContain("Gia hạn thẻ xanh");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter website exec vitest run src/components/blog/BlogCardGrid.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/components/blog/BlogCardGrid.tsx` (markup moved unchanged from the current `BlogList`)

```tsx
import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n/config";
import { blogPostPath } from "@/lib/blog/post-locale";
import { formatPostDate } from "@/lib/blog/labels";
import type { LocalizedPost } from "@/lib/blog/types";

export type BlogCard = {
  id: string;
  href: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  dateLabel: string;
  coverImageUrl: string | null;
};

/** `pageLocale` formats the date; the link stays in the post's own language. */
export function toBlogCard(post: LocalizedPost, pageLocale: Locale): BlogCard {
  return {
    id: post.id,
    href: blogPostPath(post.locale, post.slug),
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    dateLabel: formatPostDate(post.publishedAt, pageLocale),
    coverImageUrl: post.coverImageUrl,
  };
}

export function BlogCardGrid({ cards, categoryLabels }: { cards: BlogCard[]; categoryLabels: Record<string, string> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {cards.map((p) => (
        <Link
          key={p.id}
          href={p.href}
          className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
        >
          {p.coverImageUrl && (
            <div className="aspect-[1200/630] overflow-hidden relative">
              <Image src={p.coverImageUrl} alt={p.title} fill sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-light text-primary font-semibold">
                {categoryLabels[p.category] ?? p.category}
              </span>
              <span className="text-muted-foreground">{p.dateLabel}</span>
            </div>
            <h2 className="font-bold text-charcoal text-lg mb-2 group-hover:text-primary transition-colors">{p.title}</h2>
            <p className="text-muted-foreground text-sm line-clamp-3">{p.excerpt}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test**

Run: `pnpm --filter website exec vitest run src/components/blog/BlogCardGrid.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/components/blog/BlogCardGrid.tsx apps/website/src/components/blog/BlogCardGrid.test.tsx
git commit -m "refactor(website): move the blog card grid into its own server-safe component"
```

---

### Task 8: Blog index with search, filters and URL state

**Files:**
- Rewrite: `src/components/blog/BlogList.tsx`
- Modify: `src/app/[locale]/blog/page.tsx`

- [ ] **Step 1: Rewrite `src/components/blog/BlogList.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { BLOG_LABELS } from "@/lib/blog/labels";
import { filterCards, filterToSearch, parseFilter, tagCountsFor, topTags, visibleCategories, type BlogFilter } from "@/lib/blog/blog-filter";
import { BlogCardGrid, type BlogCard } from "./BlogCardGrid";

const ZALO_URL = "https://zalo.me/3468524454";

const pill = (active: boolean) =>
  `px-4 py-2 rounded-full text-sm font-medium transition-colors ${
    active ? "bg-primary text-white" : "bg-teal-light text-muted-foreground hover:bg-primary/10"
  }`;

// Wrapped in <Suspense> by the page: the server HTML is the full, unfiltered grid.
export function BlogList({
  locale,
  cards,
  labels,
  categoryLabels,
}: {
  locale: Locale;
  cards: BlogCard[];
  labels: (typeof BLOG_LABELS)[Locale];
  categoryLabels: Record<string, string>;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<BlogFilter>(() => parseFilter(params, locale));

  // Mirror the controls in the URL so a filtered list can be shared; typing is debounced.
  useEffect(() => {
    const id = setTimeout(() => router.replace(`${pathname}${filterToSearch(filter, locale)}`, { scroll: false }), 150);
    return () => clearTimeout(id);
  }, [filter, locale, pathname, router]);

  const shown = useMemo(() => filterCards(cards, filter, locale), [cards, filter, locale]);
  const categories = visibleCategories(cards);
  const tagCounts = tagCountsFor(cards, filter.cat);
  const t = labels;
  const count =
    shown.length === cards.length
      ? t.countAll.replace("{total}", String(cards.length))
      : t.countSome.replace("{shown}", String(shown.length)).replace("{total}", String(cards.length));

  return (
    <div lang={locale}>
      <div className="max-w-2xl mx-auto mb-8">
        <label htmlFor="blog-search" className="sr-only">{t.searchLabel}</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <input
            id="blog-search"
            type="search"
            value={filter.q}
            placeholder={t.searchPlaceholder}
            onChange={(e) => setFilter({ ...filter, q: e.target.value })}
            className="w-full h-12 rounded-full border border-border bg-white pl-12 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {filter.q && (
            <button
              type="button"
              aria-label={t.clearSearch}
              onClick={() => setFilter({ ...filter, q: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          <button type="button" aria-pressed={filter.cat === null} onClick={() => setFilter({ ...filter, cat: null, tag: null })} className={pill(filter.cat === null)}>
            {t.all}
          </button>
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={filter.cat === c} onClick={() => setFilter({ ...filter, cat: c, tag: null })} className={pill(filter.cat === c)}>
              {categoryLabels[c] ?? c}
            </button>
          ))}
        </div>
      )}

      {tagCounts.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-6" aria-label={t.tagsLabel}>
          {tagCounts.map(({ tag, count: n }) => {
            const active = filter.tag === tag.key;
            return (
              <button
                key={tag.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter({ ...filter, tag: active ? null : tag.key })}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  active ? "border-primary bg-primary text-white" : "border-border text-primary hover:bg-primary/5"
                }`}
              >
                #{tag.label[locale]} · {n}
              </button>
            );
          })}
        </div>
      )}

      <p aria-live="polite" className="text-center text-sm text-muted-foreground mb-8">{count}</p>

      {shown.length > 0 ? (
        <BlogCardGrid cards={shown} categoryLabels={categoryLabels} />
      ) : (
        <div className="text-center py-12">
          <p className="text-charcoal font-medium mb-4">{t.noResults}</p>
          <p className="text-sm text-muted-foreground mb-3">{t.popularTags}</p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {topTags(cards).map(({ tag }) => (
              <button
                key={tag.key}
                type="button"
                onClick={() => setFilter({ q: "", cat: null, tag: tag.key })}
                className="px-3 py-1 rounded-full text-sm border border-border text-primary hover:bg-primary/5"
              >
                #{tag.label[locale]}
              </button>
            ))}
          </div>
          <a href={ZALO_URL} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark">
            {t.askZalo}
          </a>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app/[locale]/blog/page.tsx`**

Replace the imports of `BlogList` and the `cards` mapping, and the render of `BlogList`:

```tsx
import { Suspense } from "react";
import { BlogList } from "@/components/blog/BlogList";
import { BlogCardGrid, toBlogCard } from "@/components/blog/BlogCardGrid";
```

Remove `formatPostDate` and `blogPostPath` from the imports if no longer used. Replace the `cards` constant with:

```tsx
  const cards = posts.map((p) => toBlogCard(p, l));
```

Replace the `<BlogList … />` element with:

```tsx
          <Suspense fallback={<BlogCardGrid cards={cards} categoryLabels={CATEGORY_LABELS[l]} />}>
            <BlogList locale={l} cards={cards} labels={t} categoryLabels={CATEGORY_LABELS[l]} />
          </Suspense>
```

- [ ] **Step 3: Type-check, lint and run the blog tests**

Run: `pnpm --filter website exec tsc --noEmit`
Expected: exit 0.
Run: `pnpm --filter website exec eslint src/components/blog src/app`
Expected: no output.
Run: `pnpm --filter website exec vitest run src/lib/blog src/components/blog`
Expected: PASS.

- [ ] **Step 4: No browser check yet.** The local dev server reads the prod database, which has no `tags` column until Task 14, so the blog page cannot load locally now. The browser checks for this task are in Task 14 Step 5.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/components/blog/BlogList.tsx "apps/website/src/app/[locale]/blog/page.tsx"
git commit -m "feat(website): blog search box, topic buttons and hashtag chips with shareable URLs"
```

---

### Task 9: Hashtag page SEO helpers

**Files:**
- Create: `src/lib/blog/tag-seo.ts`
- Test: `src/lib/blog/tag-seo.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { tagJsonLd, tagMetadata, tagPagePaths } from "./tag-seo";
import { tagByKey } from "./tags";
import type { LocalizedPost } from "./types";

const tag = tagByKey("sponsor-parents")!;
const post: LocalizedPost = {
  id: "p1", locale: "vi", slug: "bao-lanh-cha-me-sang-my", title: "Bảo lãnh cha mẹ sang Mỹ", excerpt: "x",
  content: "x", faq: [], authorName: "Manna One Solution", coverImageUrl: null, category: "immigration",
  tags: ["sponsor-parents"], publishedAt: "2026-10-19T19:43:00Z", updatedAt: "2026-10-19T20:00:00Z", slugs: { vi: "bao-lanh-cha-me-sang-my" },
};

describe("tagPagePaths", () => {
  it("returns a path for each locale that has posts", () => {
    expect(tagPagePaths(tag, ["vi", "en"])).toEqual({ vi: "/vi/blog/chu-de/bao-lanh-cha-me", en: "/en/blog/topics/sponsor-parents" });
    expect(tagPagePaths(tag, ["vi"])).toEqual({ vi: "/vi/blog/chu-de/bao-lanh-cha-me" });
  });
});

describe("tagMetadata", () => {
  it("is self-canonical with hreflang only for locales that have posts", () => {
    const m = tagMetadata(tag, "vi", ["vi"]);
    expect(m.title).toBe("Bảo lãnh cha mẹ: bài viết");
    expect(m.description).toBe(tag.description.vi);
    expect(m.alternates).toEqual({
      canonical: "/vi/blog/chu-de/bao-lanh-cha-me",
      languages: { vi: "/vi/blog/chu-de/bao-lanh-cha-me", "x-default": "/vi/blog/chu-de/bao-lanh-cha-me" },
    });
  });
  it("links both languages with English as x-default when both have posts", () => {
    expect(tagMetadata(tag, "en", ["vi", "en"]).alternates?.languages).toEqual({
      en: "/en/blog/topics/sponsor-parents",
      vi: "/vi/blog/chu-de/bao-lanh-cha-me",
      "x-default": "/en/blog/topics/sponsor-parents",
    });
  });
});

describe("tagJsonLd", () => {
  it("describes a CollectionPage of the posts plus a breadcrumb", () => {
    const ld = tagJsonLd(tag, "vi", [post]);
    const [page, crumbs] = ld["@graph"] as Record<string, unknown>[];
    expect(page["@type"]).toBe("CollectionPage");
    expect(page.url).toBe("https://www.mannaos.com/vi/blog/chu-de/bao-lanh-cha-me");
    expect(page.isPartOf).toEqual({ "@id": "https://www.mannaos.com/#website" });
    expect((page.mainEntity as { itemListElement: unknown[] }).itemListElement).toEqual([
      { "@type": "ListItem", position: 1, url: "https://www.mannaos.com/vi/blog/bao-lanh-cha-me-sang-my", name: "Bảo lãnh cha mẹ sang Mỹ" },
    ]);
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect((crumbs.itemListElement as { name: string }[]).map((c) => c.name)).toEqual(["Trang chủ", "Bài viết", "#Bảo lãnh cha mẹ"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter website exec vitest run src/lib/blog/tag-seo.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/lib/blog/tag-seo.ts`

```ts
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo/site";
import { BLOG_LABELS } from "./labels";
import { blogPostPath } from "./post-locale";
import { languageAlternates } from "./post-seo";
import { tagPath, type BlogTag } from "./tags";
import type { LocalizedPost } from "./types";

export function tagPagePaths(tag: BlogTag, localesWithPosts: readonly Locale[]): Partial<Record<Locale, string>> {
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of localesWithPosts) paths[l] = tagPath(l, tag.key);
  return paths;
}

export function tagMetadata(tag: BlogTag, locale: Locale, localesWithPosts: readonly Locale[]): Metadata {
  const path = tagPath(locale, tag.key);
  const title = `${tag.label[locale]}: ${BLOG_LABELS[locale].tagTitleSuffix}`;
  const description = tag.description[locale];
  return {
    title,
    description,
    alternates: { canonical: path, languages: languageAlternates(tagPagePaths(tag, localesWithPosts)) },
    openGraph: { type: "website", siteName: "Manna One Solution", url: path, title, description },
  };
}

export function tagJsonLd(tag: BlogTag, locale: Locale, posts: LocalizedPost[]) {
  const url = `${SITE_URL}${tagPath(locale, tag.key)}`;
  const t = BLOG_LABELS[locale];
  const name = `#${tag.label[locale]}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name,
        description: tag.description[locale],
        inLanguage: locale,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@type": "Thing", name: tag.label[locale] },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: posts.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}${blogPostPath(p.locale, p.slug)}`,
            name: p.title,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.home, item: `${SITE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: t.blog, item: `${SITE_URL}/${locale}/blog` },
          { "@type": "ListItem", position: 3, name, item: url },
        ],
      },
    ],
  };
}
```

- [ ] **Step 4: Run test**

Run: `pnpm --filter website exec vitest run src/lib/blog/tag-seo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/blog/tag-seo.ts apps/website/src/lib/blog/tag-seo.test.ts
git commit -m "feat(website): metadata and JSON-LD for blog hashtag pages"
```

---

### Task 10: Hashtag page routes

**Files:**
- Create: `src/lib/blog/tag-route.ts`, `src/lib/blog/tag-route.test.ts`
- Create: `src/components/blog/TagPageView.tsx`
- Create: `src/app/[locale]/blog/chu-de/[tag]/page.tsx`, `src/app/[locale]/blog/topics/[tag]/page.tsx`

- [ ] **Step 1: Write the failing test** `src/lib/blog/tag-route.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlogPostRow } from "./types";

const listPublishedPosts = vi.fn<() => Promise<BlogPostRow[]>>();
vi.mock("./queries", () => ({ listPublishedPosts: () => listPublishedPosts() }));

import { loadTagPage } from "./tag-route";

const row: BlogPostRow = {
  id: "p1", slug_en: null, slug_vi: "bao-lanh-cha-me-sang-my", title_en: null, title_vi: "Bảo lãnh cha mẹ",
  excerpt_en: null, excerpt_vi: "x", content_en: null, content_vi: "Nội dung", faq_en: [], faq_vi: [],
  author_name: "Manna One Solution", cover_image_url: null, category: "immigration", tags: ["sponsor-parents"],
  post_type: "article", published: true, published_at: "2026-10-19T19:43:00Z", created_at: "2026-10-19T19:00:00Z",
  updated_at: "2026-10-19T20:00:00Z",
};

beforeEach(() => {
  listPublishedPosts.mockResolvedValue([row]);
});

describe("loadTagPage", () => {
  it("loads a hashtag that has posts in its locale", async () => {
    const data = await loadTagPage("vi", "bao-lanh-cha-me", "vi");
    expect(data?.tag.key).toBe("sponsor-parents");
    expect(data?.posts.map((p) => p.id)).toEqual(["p1"]);
    expect(data?.localesWithPosts).toEqual(["vi"]);
  });

  it("returns null for the other locale's route, unknown slugs and empty hashtags", async () => {
    expect(await loadTagPage("en", "bao-lanh-cha-me", "vi")).toBeNull();
    expect(await loadTagPage("vi", "khong-co", "vi")).toBeNull();
    expect(await loadTagPage("vi", "the-xanh", "vi")).toBeNull();
    expect(await loadTagPage("en", "sponsor-parents", "en")).toBeNull();
  });

  it("returns null when the database is unavailable", async () => {
    listPublishedPosts.mockRejectedValue(new Error("db down"));
    expect(await loadTagPage("vi", "bao-lanh-cha-me", "vi")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter website exec vitest run src/lib/blog/tag-route.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/lib/blog/tag-route.ts`

```ts
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { localesWithTag, postsForTag } from "./post-locale";
import { listPublishedPosts } from "./queries";
import { tagBySlug, type BlogTag } from "./tags";
import type { BlogPostRow, LocalizedPost } from "./types";

export interface TagPageData {
  locale: Locale;
  tag: BlogTag;
  posts: LocalizedPost[];
  localesWithPosts: Locale[];
  rows: BlogPostRow[];
}

/** Data for /vi/blog/chu-de/<slug> or /en/blog/topics/<slug>; null means 404. */
export async function loadTagPage(localeParam: string, slug: string, expected: Locale): Promise<TagPageData | null> {
  if (!isValidLocale(localeParam) || localeParam !== expected) return null;
  const tag = tagBySlug(expected, slug);
  if (!tag) return null;
  let rows: BlogPostRow[];
  try {
    rows = await listPublishedPosts();
  } catch (error) {
    console.error(`blog tag page: posts unavailable (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
  const posts = postsForTag(rows, tag.key, expected);
  if (posts.length === 0) return null;
  return { locale: expected, tag, posts, localesWithPosts: localesWithTag(rows, tag.key), rows };
}
```

- [ ] **Step 4: Run test**

Run: `pnpm --filter website exec vitest run src/lib/blog/tag-route.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the view** `src/components/blog/TagPageView.tsx`

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { BLOG_LABELS, CATEGORY_LABELS } from "@/lib/blog/labels";
import { postsForTag } from "@/lib/blog/post-locale";
import { loadTagPage } from "@/lib/blog/tag-route";
import { tagJsonLd, tagMetadata } from "@/lib/blog/tag-seo";
import { tagPath, tagsInCategory } from "@/lib/blog/tags";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { BlogCardGrid, toBlogCard } from "./BlogCardGrid";

export async function tagPageMetadata(localeParam: string, slug: string, expected: Locale): Promise<Metadata> {
  const data = await loadTagPage(localeParam, slug, expected);
  return data ? tagMetadata(data.tag, data.locale, data.localesWithPosts) : {};
}

export async function TagPageView({ localeParam, slug, expected }: { localeParam: string; slug: string; expected: Locale }) {
  const data = await loadTagPage(localeParam, slug, expected);
  if (!data) notFound();
  const { locale, tag, posts, rows } = data;
  const t = BLOG_LABELS[locale];
  const related = tagsInCategory(tag.category).filter((x) => x.key !== tag.key && postsForTag(rows, x.key, locale).length > 0);

  return (
    <div className="py-16 lg:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(tagJsonLd(tag, locale, posts)) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link href={`/${locale}`} className="hover:text-primary">{t.home}</Link>
          <span className="mx-2">›</span>
          <Link href={`/${locale}/blog`} className="hover:text-primary">{t.blog}</Link>
        </nav>
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">#{tag.label[locale]}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{tag.description[locale]}</p>
        </div>
        <BlogCardGrid cards={posts.map((p) => toBlogCard(p, locale))} categoryLabels={CATEGORY_LABELS[locale]} />
        {related.length > 0 && (
          <section className="mt-14 text-center">
            <h2 className="text-lg font-semibold text-charcoal mb-4">{t.relatedTags}</h2>
            <ul className="flex flex-wrap gap-2 justify-center">
              {related.map((x) => (
                <li key={x.key}>
                  <Link href={tagPath(locale, x.key)} className="inline-block rounded-full border border-border px-3 py-1 text-sm text-primary hover:bg-primary/5">
                    #{x.label[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add the two routes**

`src/app/[locale]/blog/chu-de/[tag]/page.tsx`:

```tsx
import { TagPageView, tagPageMetadata } from "@/components/blog/TagPageView";

type Props = { params: Promise<{ locale: string; tag: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, tag } = await params;
  return tagPageMetadata(locale, tag, "vi");
}

export default async function VietnameseTagPage({ params }: Props) {
  const { locale, tag } = await params;
  return <TagPageView localeParam={locale} slug={tag} expected="vi" />;
}
```

`src/app/[locale]/blog/topics/[tag]/page.tsx`:

```tsx
import { TagPageView, tagPageMetadata } from "@/components/blog/TagPageView";

type Props = { params: Promise<{ locale: string; tag: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, tag } = await params;
  return tagPageMetadata(locale, tag, "en");
}

export default async function EnglishTagPage({ params }: Props) {
  const { locale, tag } = await params;
  return <TagPageView localeParam={locale} slug={tag} expected="en" />;
}
```

- [ ] **Step 7: Type-check and lint**

Run: `pnpm --filter website exec tsc --noEmit`
Expected: exit 0.
Run: `pnpm --filter website exec eslint src/components/blog src/app src/lib/blog`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add apps/website/src/lib/blog/tag-route.ts apps/website/src/lib/blog/tag-route.test.ts apps/website/src/components/blog/TagPageView.tsx "apps/website/src/app/[locale]/blog/chu-de" "apps/website/src/app/[locale]/blog/topics"
git commit -m "feat(website): indexable hashtag pages for the blog (VI chu-de, EN topics)"
```

---

### Task 11: Sitemap entries for hashtag pages

**Files:**
- Modify: `src/app/sitemap.ts`
- Test: `src/app/sitemap.test.ts`

- [ ] **Step 1: Write the failing test** (append inside the existing `describe("sitemap.xml", …)`)

```ts
  it("lists a hashtag page per locale that has posts, dated by its newest post", async () => {
    const tagged = { ...viPost, id: "p2", slug_vi: "bao-lanh-cha-me-sang-my", tags: ["sponsor-parents", "nope"], updated_at: "2026-10-25T10:00:00Z" };
    listPublishedPosts.mockResolvedValue([viPost, tagged]);
    const entries = await sitemap();
    const tagEntry = entries.find((e) => e.url === "https://www.mannaos.com/vi/blog/chu-de/bao-lanh-cha-me");
    expect(tagEntry?.lastModified).toEqual(new Date("2026-10-25T10:00:00Z"));
    expect(tagEntry?.alternates?.languages).toEqual({
      vi: "https://www.mannaos.com/vi/blog/chu-de/bao-lanh-cha-me",
      "x-default": "https://www.mannaos.com/vi/blog/chu-de/bao-lanh-cha-me",
    });
    expect(entries.some((e) => e.url.includes("/en/blog/topics/"))).toBe(false);
    expect(entries.some((e) => e.url.includes("/blog/chu-de/the-xanh"))).toBe(false);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter website exec vitest run src/app/sitemap.test.ts`
Expected: FAIL (no hashtag entry).

- [ ] **Step 3: Implement** in `src/app/sitemap.ts`

Add imports:

```ts
import { localesWithTag } from "@/lib/blog/post-locale";
import { tagPagePaths } from "@/lib/blog/tag-seo";
import { BLOG_TAGS } from "@/lib/blog/tags";
```

(merge `localesWithTag` into the existing `@/lib/blog/post-locale` import line). After `postEntries`, add:

```ts
  // One entry per hashtag page that has posts in that locale (empty ones 404).
  const tagEntries: MetadataRoute.Sitemap = BLOG_TAGS.flatMap((tag) => {
    const tagged = posts.filter((p) => (p.tags ?? []).includes(tag.key));
    const paths = tagPagePaths(tag, localesWithTag(posts, tag.key));
    const newest = Math.max(...tagged.map((p) => new Date(p.updated_at).getTime()));
    return Object.values(paths).map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: new Date(newest),
      changeFrequency: "weekly" as const,
      priority: 0.6,
      alternates: { languages: absoluteAlternates(paths) },
    }));
  });
```

and add `...tagEntries,` right after `...postEntries,` in the returned array.

- [ ] **Step 4: Run test**

Run: `pnpm --filter website exec vitest run src/app/sitemap.test.ts`
Expected: PASS (all sitemap tests, old and new).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/app/sitemap.ts apps/website/src/app/sitemap.test.ts
git commit -m "feat(website): list blog hashtag pages in the sitemap"
```

---

### Task 12: Hashtags on the post page

**Files:**
- Modify: `src/lib/blog/post-seo.ts`, `src/app/[locale]/blog/[slug]/page.tsx`
- Test: `src/lib/blog/post-seo.test.ts`

- [ ] **Step 1: Write the failing test** (append to `src/lib/blog/post-seo.test.ts`)

```ts
describe("postJsonLd keywords", () => {
  it("lists the post's hashtag labels in its language", () => {
    const ld = postJsonLd({ ...post, tags: ["green-card", "uscis-fees", "nope"] });
    const article = (ld["@graph"] as Record<string, unknown>[])[0];
    expect(article.keywords).toBe("Thẻ xanh, Lệ phí USCIS");
  });

  it("omits keywords when the post has no hashtags", () => {
    const article = (postJsonLd(post)["@graph"] as Record<string, unknown>[])[0];
    expect(article).not.toHaveProperty("keywords");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter website exec vitest run src/lib/blog/post-seo.test.ts`
Expected: FAIL (`keywords` undefined).

- [ ] **Step 3: Implement**

`src/lib/blog/post-seo.ts`: add `import { tagsForPost } from "./tags";` and, in `postJsonLd`, add after `image: absoluteUrl(post.coverImageUrl ?? OG_FALLBACK),`:

```ts
      ...(tagsForPost(post.tags).length > 0
        ? { keywords: tagsForPost(post.tags).map((t) => t.label[post.locale]).join(", ") }
        : {}),
```

`src/app/[locale]/blog/[slug]/page.tsx`: add `import { tagPath, tagsForPost } from "@/lib/blog/tags";`, compute `const postTags = tagsForPost(post.tags);` after `const t = BLOG_LABELS[locale];`, and insert right after the date `<p>` (the one ending `{formatPostDate(post.updatedAt, locale)}</p>`):

```tsx
        {postTags.length > 0 && (
          <ul className="flex flex-wrap gap-2 -mt-4 mb-8" aria-label={t.tagsLabel}>
            {postTags.map((tag) => (
              <li key={tag.key}>
                <Link
                  href={tagPath(locale, tag.key)}
                  className="inline-block rounded-full bg-teal-light px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  #{tag.label[locale]}
                </Link>
              </li>
            ))}
          </ul>
        )}
```

- [ ] **Step 4: Run tests and type-check**

Run: `pnpm --filter website exec vitest run src/lib/blog`
Expected: PASS.
Run: `pnpm --filter website exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/blog/post-seo.ts apps/website/src/lib/blog/post-seo.test.ts "apps/website/src/app/[locale]/blog/[slug]/page.tsx"
git commit -m "feat(website): hashtag chips on blog posts and keywords in BlogPosting"
```

---

### Task 13: Admin categories and hashtag checkboxes

**Files:**
- Modify: `src/app/[locale]/admin/blog/page.tsx`

- [ ] **Step 1: Implement**

Add `import { keepTagsForCategory, tagsInCategory } from "@/lib/blog/tags";`.

Change:

```ts
const CATEGORIES = ["tax", "insurance", "immigration", "ai", "general"];
```

to:

```ts
const CATEGORIES = ["immigration", "business", "tax", "insurance", "ai", "documents", "general"];
```

In `EMPTY_POST` add `tags: [],` after `category: "immigration",`. In `savePost`'s `payload` add after `category: editing.category || "general",`:

```ts
      tags: editing.tags ?? [],
```

Replace the Category `SelectFormField`'s `onChange` with:

```tsx
onChange={(v) => setEditing({ ...editing, category: v, tags: keepTagsForCategory(editing.tags ?? [], v) })}
```

Insert after the `grid grid-cols-2` div that holds Category and Post Type:

```tsx
              <fieldset>
                <legend className="block text-sm font-medium text-charcoal mb-1">Hashtags</legend>
                {tagsInCategory(editing.category || "general").length === 0 ? (
                  <p className="text-xs text-muted-foreground">Chủ đề này chưa có hashtag.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tagsInCategory(editing.category || "general").map((tag) => {
                      const checked = (editing.tags ?? []).includes(tag.key);
                      return (
                        <label key={tag.key} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setEditing({
                                ...editing,
                                tags: checked ? (editing.tags ?? []).filter((k) => k !== tag.key) : [...(editing.tags ?? []), tag.key],
                              })
                            }
                          />
                          #{tag.label.vi}
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
```

- [ ] **Step 2: Type-check and lint**

Run: `pnpm --filter website exec tsc --noEmit`
Expected: exit 0.
Run: `pnpm --filter website exec eslint src/app`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "apps/website/src/app/[locale]/admin/blog/page.tsx"
git commit -m "feat(website): admin picks blog hashtags and the two new categories"
```

---

### Task 14: Migration on prod, full verification, push

This task changes production. Steps 1 and 6 each need the owner's explicit go-ahead in chat.

- [ ] **Step 1: Owner approval for the migration** — show the SQL of `website_02_blog_tags.sql` and ask to apply it.

- [ ] **Step 2: Confirm the constraint name on prod** (read-only, Supabase `execute_sql`)

```sql
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.blog_posts'::regclass and contype = 'c' and conname like '%category%';
```

Expected: one row named `blog_posts_category_check`. If the name differs, update the `drop constraint` line before applying.

- [ ] **Step 3: Apply** with Supabase `apply_migration`, name `website_02_blog_tags`, body = the file.

- [ ] **Step 4: Verify** (read-only)

```sql
select slug_vi, category, tags from public.blog_posts order by slug_vi;
select pg_get_constraintdef(oid) from pg_constraint where conname = 'blog_posts_category_check';
```

Expected: 12 rows, each with the tags from the spec table; the constraint lists `business` and `documents`. Then run Supabase `get_advisors` (security) and confirm no new findings for `blog_posts`.

- [ ] **Step 5: Full local check**

Run: `pnpm --filter website exec vitest run` → all pass.
Run: `pnpm --filter website exec tsc --noEmit` → exit 0.
Run: `pnpm --filter website exec eslint src` → no output.

Start the dev server from `apps/website` in the background (`pnpm exec next dev -p 3107`) and in the browser pane:
- `/vi/blog`: type "thi quôcs tịch" → only citizenship posts; clear; pick "Di trú Mỹ"; pick "#Thẻ xanh · 4" → 4 cards; copy the URL into a new tab → same list.
- Type "xyz" → empty state with popular hashtags and the Zalo button.
- `/vi/blog/chu-de/bao-lanh-cha-me` and `/en/blog/topics/sponsor-parents` render with breadcrumb, description, cards, related hashtags.
- `/vi/blog/chu-de/khong-co` and `/vi/blog/topics/sponsor-parents` return 404.
- A post page shows its hashtag chips; each chip opens its hashtag page.
- Mobile preset (375 px): chips wrap, `document.documentElement.scrollWidth === 375`.
Stop the dev server.

- [ ] **Step 6: Owner approval to push**, then:

```bash
git fetch origin main
git log --oneline HEAD..origin/main
git push origin HEAD:main
```

If `HEAD..origin/main` is not empty, merge `origin/main` first and re-run Step 5's test commands.

- [ ] **Step 7: Check prod after Vercel deploys**
- `https://www.mannaos.com/vi/blog?q=bao+lanh+cha+me` lists the parents post first.
- Both hashtag pages above return 200 with `CollectionPage` in their JSON-LD; one of them passes Google's Rich Results Test.
- `https://www.mannaos.com/sitemap.xml` contains `/vi/blog/chu-de/` and `/en/blog/topics/` entries.

- [ ] **Step 8: Update `docs/ROADMAP.md`** (mark blog search/hashtags done under the website section) and commit:

```bash
git add docs/ROADMAP.md
git commit -m "docs(roadmap): blog search, topic filter and hashtag pages shipped"
git push origin HEAD:main
```
