# Website SEO Blog + N-400 Article Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing admin blog publish server-rendered, indexable, schema-marked posts, and publish six fact-checked Vietnamese N-400 articles.

**Architecture:** A clean `blog_posts` table (per-locale slugs, FAQ, author, `published_at`, admin-only writes) replaces the never-applied definition. Pure modules in `src/lib/blog/` turn a DB row into a localized post, route decisions, Next metadata and JSON-LD; thin Server Component pages render them. The sitemap reads published posts; the admin modal gains per-locale slugs, FAQ rows, author and visible save errors.

**Tech Stack:** Next.js 16.2 App Router (Server Components), Supabase (Postgres + RLS, `@supabase/supabase-js`), `react-markdown` 10 + `remark-gfm` (new), Vitest (node env), Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-15-website-seo-blog-design.md` (approved 2026-10-15). Read it first.

**Working dir:** worktree `.claude/worktrees/website-seo-fixes`, branch `worktree-website-seo-fixes`; app commands run in `apps/website`. Read `apps/website/AGENTS.md` (Next 16 differs from training data; docs in `node_modules/next/dist/docs/`).

## Global Constraints

- Not a law firm: immigration posts end with the existing `immigration_scope_note` text; articles never tell a reader what to answer or that they qualify.
- No "expert", "chuyên gia", "chuyên môn di trú" in any new copy (8 CFR 1.2).
- No MannaOS prices. USCIS fees only with a uscis.gov link and "kiểm tra ngày …".
- Never name the EB-3 partner (`grep -ri immilink apps/website/src docs/content` must stay empty apart from existing guard tests).
- All public URLs on `SITE_URL` = `https://www.mannaos.com` (`src/lib/seo/site.ts`); organization `@id` = `ORGANIZATION_ID` (`src/lib/seo/json-ld.ts`).
- Author byline default and for this batch: `Manna One Solution` (JSON-LD author = Organization `@id`).
- N400 Ready may be called "miễn phí". No cover images (OG fallback `/images/og-image.png`).
- One H1 per page; Markdown `#` renders as H2.
- Slugs match `^[a-z0-9]+(-[a-z0-9]+)*$`.
- Prod DB changes and pushes to `main` only after the owner says yes at that step.
- Run vitest and tsc separately (`vitest && tsc` skips tsc on failure). ESLint stays at 0; `react-hooks/set-state-in-effect` is an error.

## Review Focus

1. A URL slug containing `,`, `(`, `)` or `%` must never reach the Supabase `.or()` filter (filter injection) → invalid slugs 404 without a query (Task 5 test).
2. The same slug used as `slug_en` of one post and `slug_vi` of another → each locale must open its own post, not whichever row comes first (Task 3 test).
3. A post with a Vietnamese slug but empty Vietnamese content (half-written translation) → the Vietnamese URL 404s and is absent from hreflang and the sitemap (Task 3 + Task 6 tests).
4. Supabase down while building the sitemap → static entries still returned, no 500 (Task 6 test).
5. Admin publishing a post with no complete language, or saving a duplicate slug → the modal stays open and says why (Task 7 test for the guard; manual check for the DB error message).

---

### Task 1: `blog_posts` migration + prod RLS proof

**Files:**
- Create: `apps/website/supabase/migrations/website_01_blog_posts.sql`

**Interfaces:**
- Produces: table `public.blog_posts` with columns used by every later task: `id, slug_en, slug_vi, title_en, title_vi, excerpt_en, excerpt_vi, content_en, content_vi, faq_en, faq_vi, author_name, cover_image_url, category, post_type, published, published_at, created_at, updated_at`.

- [ ] **Step 1: Write the migration**

```sql
-- website_01: blog_posts for the public blog + admin editor (spec 2026-10-15-website-seo-blog-design).
-- The table never existed on prod; phase_b_website_tables.sql was never applied.

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug_en text unique,
  slug_vi text unique,
  title_en text,
  title_vi text,
  excerpt_en text,
  excerpt_vi text,
  content_en text,
  content_vi text,
  faq_en jsonb not null default '[]'::jsonb,
  faq_vi jsonb not null default '[]'::jsonb,
  author_name text not null default 'Manna One Solution',
  cover_image_url text,
  category text not null default 'general'
    check (category in ('tax', 'insurance', 'immigration', 'ai', 'general')),
  post_type text not null default 'article'
    check (post_type in ('article', 'guide', 'news', 'faq')),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_has_slug check (slug_en is not null or slug_vi is not null),
  constraint blog_posts_slug_en_format check (slug_en ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint blog_posts_slug_vi_format check (slug_vi ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index blog_posts_published_idx on public.blog_posts (published, published_at desc);

-- updated_at on every write; published_at stamped once, on first publish.
create function public.blog_posts_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.blog_posts_touch() from public, anon, authenticated;

create trigger blog_posts_touch
  before insert or update on public.blog_posts
  for each row execute function public.blog_posts_touch();

alter table public.blog_posts enable row level security;

-- anon: published rows only, read-only.
create policy blog_posts_select_anon on public.blog_posts
  for select to anon using (published = true);
-- signed-in: published rows, or everything for admins (drafts in /admin/blog).
create policy blog_posts_select_auth on public.blog_posts
  for select to authenticated using (published = true or (select public.is_admin()));
create policy blog_posts_insert_admin on public.blog_posts
  for insert to authenticated with check ((select public.is_admin()));
create policy blog_posts_update_admin on public.blog_posts
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy blog_posts_delete_admin on public.blog_posts
  for delete to authenticated using ((select public.is_admin()));

revoke insert, update, delete, truncate, references, trigger on public.blog_posts from anon;
revoke truncate, references, trigger on public.blog_posts from authenticated;
```

- [ ] **Step 2: Prove the access matrix on prod with zero residue (read-only effect)**

Pick one admin and one client id first:
```sql
select (select id from public.profiles where role = 'admin' limit 1) as admin_id,
       (select id from public.profiles where role = 'client' limit 1) as client_id;
```
Then run, via MCP `execute_sql`, one `DO` block that contains the Step 1 statements verbatim, then (substitute the two ids):
```sql
  insert into public.blog_posts (slug_vi, title_vi, content_vi, published) values ('rls-pub', 't', 'c', true);
  insert into public.blog_posts (slug_vi, title_vi, content_vi, published) values ('rls-draft', 't', 'c', false);
  -- anon
  perform set_config('role', 'anon', true);
  select count(*) into a_pub from public.blog_posts;             -- expect 1
  begin insert into public.blog_posts (slug_vi) values ('x'); a_ins := 'ALLOWED';
  exception when insufficient_privilege then a_ins := 'denied'; end;
  -- client
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', '<client_id>', 'role', 'authenticated')::text, true);
  select count(*) into c_pub from public.blog_posts;             -- expect 1
  begin insert into public.blog_posts (slug_vi) values ('y'); c_ins := 'ALLOWED';
  exception when insufficient_privilege then c_ins := 'denied'; end;
  update public.blog_posts set title_vi = 'hack'; get diagnostics c_upd = row_count;  -- expect 0
  -- admin
  perform set_config('request.jwt.claims', json_build_object('sub', '<admin_id>', 'role', 'authenticated')::text, true);
  select count(*) into ad_all from public.blog_posts;            -- expect 2
  update public.blog_posts set title_vi = 'ok'; get diagnostics ad_upd = row_count;  -- expect 2
  select count(*) into ad_pubat from public.blog_posts where slug_vi = 'rls-pub' and published_at is not null; -- expect 1
  delete from public.blog_posts; get diagnostics ad_del = row_count;                 -- expect 2
  raise exception 'RESULT anon_read=% anon_insert=% client_read=% client_insert=% client_update=% admin_read=% admin_update=% published_at=% admin_delete=%',
    a_pub, a_ins, c_pub, c_ins, c_upd, ad_all, ad_upd, ad_pubat, ad_del;
```
(Declare the counters as `int`/`text` in the block's `declare` section.) Expected message: `RESULT anon_read=1 anon_insert=denied client_read=1 client_insert=denied client_update=0 admin_read=2 admin_update=2 published_at=1 admin_delete=2`. Then confirm no residue: `select to_regclass('public.blog_posts')` → null.

Note: `execute_sql` rejects any text containing the word DROP — the block above has none.

- [ ] **Step 3: Commit (migration file only; not yet applied)**

```bash
git add supabase/migrations/website_01_blog_posts.sql
git commit -m "feat(website): blog_posts migration — per-locale slugs, FAQ, admin-only writes"
```

- [ ] **Step 4 (owner OK required): apply to prod**

Ask the owner. On yes: MCP `apply_migration` name `website_01_blog_posts` with the file content; then `get_advisors` type `security` and check no new 0028/0029 lints for `blog_posts_touch` and no RLS-disabled table.

---

### Task 2: Types + `slugify`

**Files:**
- Create: `apps/website/src/lib/blog/types.ts`
- Create: `apps/website/src/lib/blog/slugify.ts`
- Test: `apps/website/src/lib/blog/slugify.test.ts`

**Interfaces:**
- Produces: `FaqItem`, `BlogPostRow`, `LocalizedPost` (types.ts); `slugify(text: string): string`, `isValidSlug(slug: string): boolean` (slugify.ts).

- [ ] **Step 1: Write types (no test — declarations only)**

```ts
// src/lib/blog/types.ts
import type { Locale } from "@/lib/i18n/config";

export type FaqItem = { q: string; a: string };

/** One row of public.blog_posts (migration website_01). */
export interface BlogPostRow {
  id: string;
  slug_en: string | null;
  slug_vi: string | null;
  title_en: string | null;
  title_vi: string | null;
  excerpt_en: string | null;
  excerpt_vi: string | null;
  content_en: string | null;
  content_vi: string | null;
  faq_en: FaqItem[];
  faq_vi: FaqItem[];
  author_name: string;
  cover_image_url: string | null;
  category: string;
  post_type: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A post as one locale's page sees it. `slugs` lists every locale the post exists in. */
export interface LocalizedPost {
  id: string;
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  faq: FaqItem[];
  authorName: string;
  coverImageUrl: string | null;
  category: string;
  publishedAt: string;
  updatedAt: string;
  slugs: Partial<Record<Locale, string>>;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/blog/slugify.test.ts
import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "./slugify";

describe("slugify", () => {
  it("strips Vietnamese diacritics and đ", () => {
    expect(slugify("Thi quốc tịch Mỹ 2026")).toBe("thi-quoc-tich-my-2026");
    expect(slugify("Đơn N-400 là gì?")).toBe("don-n-400-la-gi");
  });

  it("collapses punctuation and spaces into single dashes, trimmed", () => {
    expect(slugify("  Yes/No --- câu hỏi!! ")).toBe("yes-no-cau-hoi");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugify("?!")).toBe("");
  });
});

describe("isValidSlug", () => {
  it("accepts lower-case words joined by single dashes", () => {
    expect(isValidSlug("128-cau-hoi-thi-quoc-tich-my")).toBe(true);
  });

  it("rejects anything that could break a PostgREST filter or URL", () => {
    for (const bad of ["", "a,b", "a)b", "a--b", "-a", "A", "a%2C", "a.b"]) {
      expect(isValidSlug(bad), bad).toBe(false);
    }
  });
});
```

- [ ] **Step 3: Run — expect FAIL (module missing)**

Run: `npx vitest run src/lib/blog/slugify.test.ts`

- [ ] **Step 4: Implement**

```ts
// src/lib/blog/slugify.ts
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Thi quốc tịch Mỹ 2026" → "thi-quoc-tich-my-2026". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Same rule as the blog_posts slug CHECK constraints. */
export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}
```

- [ ] **Step 5: Run — expect PASS; tsc**

Run: `npx vitest run src/lib/blog/slugify.test.ts` then `npx tsc --noEmit -p .`

- [ ] **Step 6: Commit**

```bash
git add src/lib/blog/types.ts src/lib/blog/slugify.ts src/lib/blog/slugify.test.ts
git commit -m "feat(website): blog post types + Vietnamese-aware slugify"
```

---

### Task 3: Localize a row + route decision (`post-locale.ts`)

**Files:**
- Create: `apps/website/src/lib/blog/post-locale.ts`
- Test: `apps/website/src/lib/blog/post-locale.test.ts`

**Interfaces:**
- Consumes: `BlogPostRow`, `LocalizedPost` (Task 2).
- Produces:
  - `postSlugs(post: BlogPostRow): Partial<Record<Locale, string>>` — locales whose slug, title and content are all non-blank.
  - `localizePost(post: BlogPostRow, locale: Locale): LocalizedPost | null`
  - `type PostRoute = { kind: "render"; post: LocalizedPost } | { kind: "redirect"; to: string } | { kind: "not-found" }`
  - `resolvePostRoute(candidates: BlogPostRow[], locale: Locale, slug: string): PostRoute`
  - `blogPostPath(locale: Locale, slug: string): string` → `/${locale}/blog/${slug}`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/blog/post-locale.test.ts
import { describe, expect, it } from "vitest";
import { localizePost, postSlugs, resolvePostRoute } from "./post-locale";
import type { BlogPostRow } from "./types";

function row(over: Partial<BlogPostRow>): BlogPostRow {
  return {
    id: "p1",
    slug_en: null, slug_vi: null,
    title_en: null, title_vi: null,
    excerpt_en: null, excerpt_vi: null,
    content_en: null, content_vi: null,
    faq_en: [], faq_vi: [],
    author_name: "Manna One Solution",
    cover_image_url: null,
    category: "immigration",
    post_type: "article",
    published: true,
    published_at: "2026-10-20T15:00:00Z",
    created_at: "2026-10-19T15:00:00Z",
    updated_at: "2026-10-21T15:00:00Z",
    ...over,
  };
}

const viOnly = row({ slug_vi: "don-n-400-la-gi", title_vi: "Đơn N-400 là gì?", content_vi: "Nội dung", excerpt_vi: "Tóm tắt" });
const both = row({
  id: "p2",
  slug_en: "what-is-form-n-400", title_en: "What is Form N-400?", content_en: "Body",
  slug_vi: "don-n-400", title_vi: "Đơn N-400", content_vi: "Nội dung",
});

describe("postSlugs", () => {
  it("lists only locales with slug, title and content", () => {
    expect(postSlugs(viOnly)).toEqual({ vi: "don-n-400-la-gi" });
    expect(postSlugs(both)).toEqual({ en: "what-is-form-n-400", vi: "don-n-400" });
  });

  it("drops a half-written translation (slug but blank content)", () => {
    expect(postSlugs(row({ slug_en: "x", title_en: "X", content_en: "  ", slug_vi: "y", title_vi: "Y", content_vi: "c" })))
      .toEqual({ vi: "y" });
  });
});

describe("localizePost", () => {
  it("returns the locale's fields, falling back to created_at when never published", () => {
    expect(localizePost(row({ ...viOnly, published_at: null, faq_vi: [{ q: "Q?", a: "A." }] }), "vi")).toEqual({
      id: "p1", locale: "vi", slug: "don-n-400-la-gi", title: "Đơn N-400 là gì?", excerpt: "Tóm tắt",
      content: "Nội dung", faq: [{ q: "Q?", a: "A." }], authorName: "Manna One Solution",
      coverImageUrl: null, category: "immigration",
      publishedAt: "2026-10-19T15:00:00Z", updatedAt: "2026-10-21T15:00:00Z",
      slugs: { vi: "don-n-400-la-gi" },
    });
  });

  it("returns null for a locale the post does not exist in", () => {
    expect(localizePost(viOnly, "en")).toBeNull();
  });
});

describe("resolvePostRoute", () => {
  it("renders when the slug is this locale's slug", () => {
    const r = resolvePostRoute([viOnly], "vi", "don-n-400-la-gi");
    expect(r.kind).toBe("render");
  });

  it("redirects the other locale's slug to this locale's slug", () => {
    expect(resolvePostRoute([both], "vi", "what-is-form-n-400")).toEqual({ kind: "redirect", to: "/vi/blog/don-n-400" });
  });

  it("404s when the post has no version in this locale", () => {
    expect(resolvePostRoute([viOnly], "en", "don-n-400-la-gi")).toEqual({ kind: "not-found" });
  });

  it("404s when nothing matched", () => {
    expect(resolvePostRoute([], "vi", "anything")).toEqual({ kind: "not-found" });
  });

  it("prefers the post whose own-locale slug matches when two posts share a slug across locales", () => {
    const enPost = row({ id: "en-post", slug_en: "shared", title_en: "EN", content_en: "b" });
    const viPost = row({ id: "vi-post", slug_vi: "shared", title_vi: "VI", content_vi: "b" });
    const r = resolvePostRoute([enPost, viPost], "vi", "shared");
    expect(r.kind === "render" && r.post.id).toBe("vi-post");
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

Run: `npx vitest run src/lib/blog/post-locale.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/blog/post-locale.ts
import { locales, type Locale } from "@/lib/i18n/config";
import type { BlogPostRow, FaqItem, LocalizedPost } from "./types";

function fieldsFor(post: BlogPostRow, locale: Locale) {
  return locale === "vi"
    ? { slug: post.slug_vi, title: post.title_vi, excerpt: post.excerpt_vi, content: post.content_vi, faq: post.faq_vi }
    : { slug: post.slug_en, title: post.title_en, excerpt: post.excerpt_en, content: post.content_en, faq: post.faq_en };
}

const filled = (s: string | null) => !!s && s.trim() !== "";

export function blogPostPath(locale: Locale, slug: string): string {
  return `/${locale}/blog/${slug}`;
}

export function postSlugs(post: BlogPostRow): Partial<Record<Locale, string>> {
  const slugs: Partial<Record<Locale, string>> = {};
  for (const locale of locales) {
    const f = fieldsFor(post, locale);
    if (filled(f.slug) && filled(f.title) && filled(f.content)) slugs[locale] = f.slug!;
  }
  return slugs;
}

export function localizePost(post: BlogPostRow, locale: Locale): LocalizedPost | null {
  const slugs = postSlugs(post);
  const slug = slugs[locale];
  if (!slug) return null;
  const f = fieldsFor(post, locale);
  return {
    id: post.id,
    locale,
    slug,
    title: f.title!,
    excerpt: f.excerpt ?? "",
    content: f.content!,
    faq: (f.faq ?? []) as FaqItem[],
    authorName: post.author_name,
    coverImageUrl: post.cover_image_url,
    category: post.category,
    publishedAt: post.published_at ?? post.created_at,
    updatedAt: post.updated_at,
    slugs,
  };
}

export type PostRoute =
  | { kind: "render"; post: LocalizedPost }
  | { kind: "redirect"; to: string }
  | { kind: "not-found" };

/** `candidates` = published rows whose slug_en or slug_vi equals `slug`. */
export function resolvePostRoute(candidates: BlogPostRow[], locale: Locale, slug: string): PostRoute {
  const own = candidates.find((p) => postSlugs(p)[locale] === slug);
  if (own) return { kind: "render", post: localizePost(own, locale)! };
  for (const p of candidates) {
    const target = postSlugs(p)[locale];
    if (target) return { kind: "redirect", to: blogPostPath(locale, target) };
  }
  return { kind: "not-found" };
}
```

- [ ] **Step 4: Run — expect PASS; tsc**

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog/post-locale.ts src/lib/blog/post-locale.test.ts
git commit -m "feat(website): localize blog rows and decide render/redirect/404 per locale"
```

---

### Task 4: Metadata + JSON-LD for posts and the blog index (`post-seo.ts`)

**Files:**
- Create: `apps/website/src/lib/blog/post-seo.ts`
- Test: `apps/website/src/lib/blog/post-seo.test.ts`

**Interfaces:**
- Consumes: `LocalizedPost` (Task 2), `blogPostPath` (Task 3), `SITE_URL`, `ORGANIZATION_ID`.
- Produces:
  - `ORG_AUTHOR = "Manna One Solution"`
  - `languageAlternates(paths: Partial<Record<Locale, string>>): Record<string, string>` — en/vi present ones + `x-default` (en, else vi). Paths may be relative or absolute; values are passed through.
  - `postMetadata(post: LocalizedPost): Metadata`
  - `postJsonLd(post: LocalizedPost): { "@context": string; "@graph": Record<string, unknown>[] }`
  - `blogIndexMetadata(locale: Locale, localesWithPosts: Locale[]): Pick<Metadata, "alternates" | "robots">`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/blog/post-seo.test.ts
import { describe, expect, it } from "vitest";
import { blogIndexMetadata, languageAlternates, postJsonLd, postMetadata } from "./post-seo";
import type { LocalizedPost } from "./types";

const post: LocalizedPost = {
  id: "p1", locale: "vi", slug: "don-n-400-la-gi", title: "Đơn N-400 là gì?", excerpt: "Tóm tắt",
  content: "Nội dung", faq: [{ q: "Lệ phí bao nhiêu?", a: "Xem uscis.gov." }],
  authorName: "Manna One Solution", coverImageUrl: null, category: "immigration",
  publishedAt: "2026-10-20T15:00:00Z", updatedAt: "2026-10-21T15:00:00Z",
  slugs: { vi: "don-n-400-la-gi" },
};

describe("languageAlternates", () => {
  it("uses English as x-default when it exists, else Vietnamese", () => {
    expect(languageAlternates({ en: "/en/blog/a", vi: "/vi/blog/b" })).toEqual({ en: "/en/blog/a", vi: "/vi/blog/b", "x-default": "/en/blog/a" });
    expect(languageAlternates({ vi: "/vi/blog/b" })).toEqual({ vi: "/vi/blog/b", "x-default": "/vi/blog/b" });
  });
});

describe("postMetadata", () => {
  it("is self-canonical with hreflang only for existing locales", () => {
    const m = postMetadata(post);
    expect(m.title).toBe("Đơn N-400 là gì?");
    expect(m.description).toBe("Tóm tắt");
    expect(m.alternates).toEqual({
      canonical: "/vi/blog/don-n-400-la-gi",
      languages: { vi: "/vi/blog/don-n-400-la-gi", "x-default": "/vi/blog/don-n-400-la-gi" },
    });
  });

  it("is an Open Graph article with dates and the site image when there is no cover", () => {
    expect(postMetadata(post).openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-10-20T15:00:00Z",
      modifiedTime: "2026-10-21T15:00:00Z",
      images: ["/images/og-image.png"],
    });
  });
});

describe("postJsonLd", () => {
  const graph = postJsonLd(post)["@graph"];
  const byType = (t: string) => graph.find((n) => n["@type"] === t);

  it("describes a BlogPosting on www, authored and published by the organization", () => {
    expect(byType("BlogPosting")).toMatchObject({
      headline: "Đơn N-400 là gì?",
      datePublished: "2026-10-20T15:00:00Z",
      dateModified: "2026-10-21T15:00:00Z",
      inLanguage: "vi",
      url: "https://www.mannaos.com/vi/blog/don-n-400-la-gi",
      author: { "@id": "https://www.mannaos.com/#organization" },
      publisher: { "@id": "https://www.mannaos.com/#organization" },
    });
  });

  it("names a person as author when the byline is not the organization", () => {
    const g = postJsonLd({ ...post, authorName: "Chris Nguyen" })["@graph"];
    expect(g.find((n) => n["@type"] === "BlogPosting")?.author).toEqual({ "@type": "Person", name: "Chris Nguyen" });
  });

  it("adds a breadcrumb home → blog → post", () => {
    expect(byType("BreadcrumbList")?.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "https://www.mannaos.com/vi" },
      { "@type": "ListItem", position: 2, name: "Bài viết", item: "https://www.mannaos.com/vi/blog" },
      { "@type": "ListItem", position: 3, name: "Đơn N-400 là gì?", item: "https://www.mannaos.com/vi/blog/don-n-400-la-gi" },
    ]);
  });

  it("emits FAQPage from the visible FAQ, and none when the FAQ is empty", () => {
    expect(byType("FAQPage")?.mainEntity).toEqual([
      { "@type": "Question", name: "Lệ phí bao nhiêu?", acceptedAnswer: { "@type": "Answer", text: "Xem uscis.gov." } },
    ]);
    expect(postJsonLd({ ...post, faq: [] })["@graph"].some((n) => n["@type"] === "FAQPage")).toBe(false);
  });
});

describe("blogIndexMetadata", () => {
  it("indexes a locale with posts and links only locales that have posts", () => {
    expect(blogIndexMetadata("vi", ["vi"])).toEqual({
      alternates: { canonical: "/vi/blog", languages: { vi: "/vi/blog", "x-default": "/vi/blog" } },
    });
  });

  it("noindexes a locale with no posts", () => {
    expect(blogIndexMetadata("en", ["vi"]).robots).toEqual({ index: false, follow: true });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/blog/post-seo.ts
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { ORGANIZATION_ID } from "@/lib/seo/json-ld";
import { SITE_URL } from "@/lib/seo/site";
import { blogPostPath } from "./post-locale";
import type { LocalizedPost } from "./types";

export const ORG_AUTHOR = "Manna One Solution";
const OG_FALLBACK = "/images/og-image.png";

const CRUMBS: Record<Locale, { home: string; blog: string }> = {
  vi: { home: "Trang chủ", blog: "Bài viết" },
  en: { home: "Home", blog: "Articles" },
};

export function languageAlternates(paths: Partial<Record<Locale, string>>): Record<string, string> {
  const languages: Record<string, string> = {};
  if (paths.en) languages.en = paths.en;
  if (paths.vi) languages.vi = paths.vi;
  const fallback = paths.en ?? paths.vi;
  if (fallback) languages["x-default"] = fallback;
  return languages;
}

function postPaths(post: LocalizedPost): Partial<Record<Locale, string>> {
  const paths: Partial<Record<Locale, string>> = {};
  for (const [locale, slug] of Object.entries(post.slugs) as [Locale, string][]) {
    paths[locale] = blogPostPath(locale, slug);
  }
  return paths;
}

export function postMetadata(post: LocalizedPost): Metadata {
  const path = blogPostPath(post.locale, post.slug);
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: path, languages: languageAlternates(postPaths(post)) },
    openGraph: {
      type: "article",
      siteName: "Manna One Solution",
      url: path,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [post.coverImageUrl ?? OG_FALLBACK],
    },
  };
}

export function postJsonLd(post: LocalizedPost) {
  const url = `${SITE_URL}${blogPostPath(post.locale, post.slug)}`;
  const crumbs = CRUMBS[post.locale];
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: post.authorName === ORG_AUTHOR ? { "@id": ORGANIZATION_ID } : { "@type": "Person", name: post.authorName },
      publisher: { "@id": ORGANIZATION_ID },
      inLanguage: post.locale,
      mainEntityOfPage: url,
      url,
      image: post.coverImageUrl ?? `${SITE_URL}${OG_FALLBACK}`,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: crumbs.home, item: `${SITE_URL}/${post.locale}` },
        { "@type": "ListItem", position: 2, name: crumbs.blog, item: `${SITE_URL}/${post.locale}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
  if (post.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: post.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function blogIndexMetadata(locale: Locale, localesWithPosts: Locale[]): Pick<Metadata, "alternates" | "robots"> {
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of localesWithPosts) paths[l] = `/${l}/blog`;
  const meta: Pick<Metadata, "alternates" | "robots"> = {
    alternates: { canonical: `/${locale}/blog`, languages: languageAlternates(paths) },
  };
  if (!localesWithPosts.includes(locale)) meta.robots = { index: false, follow: true };
  return meta;
}
```

- [ ] **Step 4: Run — expect PASS; tsc**

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog/post-seo.ts src/lib/blog/post-seo.test.ts
git commit -m "feat(website): blog metadata, hreflang and BlogPosting/FAQ/breadcrumb JSON-LD"
```

---

### Task 5: Markdown body, data access, and the post page

**Files:**
- Modify: `apps/website/package.json` (add `remark-gfm`)
- Create: `apps/website/src/components/blog/PostBody.tsx`
- Test: `apps/website/src/components/blog/PostBody.test.tsx`
- Create: `apps/website/src/lib/blog/queries.ts`
- Test: `apps/website/src/lib/blog/queries.test.ts`
- Create: `apps/website/src/lib/blog/labels.ts`
- Rewrite: `apps/website/src/app/[locale]/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces:
  - `PostBody({ markdown }: { markdown: string })` (server component).
  - `listPublishedPosts(): Promise<BlogPostRow[]>` (throws on DB error), `findPublishedPostsBySlug(slug: string): Promise<BlogPostRow[]>` (returns `[]` without querying when `!isValidSlug(slug)`).
  - `BLOG_LABELS: Record<Locale, {...}>` and `formatPostDate(iso: string, locale: Locale): string`.

- [ ] **Step 1: Add the dependency**

Run (from the worktree root): `pnpm --filter website add remark-gfm@^4.0.1 --store-dir "/Users/anhnguyen/Obsidian/Business planning/.pnpm-store/v3"`

- [ ] **Step 2: Write failing tests**

```tsx
// src/components/blog/PostBody.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostBody } from "./PostBody";

describe("PostBody", () => {
  it("renders Markdown headings below the page H1", () => {
    const html = renderToStaticMarkup(<PostBody markdown={"# Phần một\n\n## Phần hai"} />);
    expect(html).not.toContain("<h1");
    expect(html).toContain("<h2>Phần một</h2>");
  });

  it("renders GFM tables", () => {
    const html = renderToStaticMarkup(<PostBody markdown={"| Mẫu đơn | Lệ phí |\n|---|---|\n| N-400 | xem uscis.gov |"} />);
    expect(html).toContain("<table>");
    expect(html).toContain("<td>N-400</td>");
  });

  it("opens external links safely and keeps internal links in-tab", () => {
    const html = renderToStaticMarkup(<PostBody markdown={"[USCIS](https://www.uscis.gov) [N400](/n400ready)"} />);
    expect(html).toContain('<a href="https://www.uscis.gov" target="_blank" rel="noopener noreferrer">USCIS</a>');
    expect(html).toContain('<a href="/n400ready">N400</a>');
  });
});
```

```ts
// src/lib/blog/queries.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from }) }));

import { findPublishedPostsBySlug } from "./queries";

beforeEach(() => from.mockReset());

describe("findPublishedPostsBySlug", () => {
  it("never queries for a slug that could inject a PostgREST filter", async () => {
    expect(await findPublishedPostsBySlug("a,slug_vi.neq.x")).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run — expect FAIL (modules missing)**

Run: `npx vitest run src/components/blog/PostBody.test.tsx src/lib/blog/queries.test.ts`

- [ ] **Step 4: Implement `PostBody`, `queries`, `labels`**

```tsx
// src/components/blog/PostBody.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// The post title is the page's only H1, so Markdown "#" headings render as H2.
export function PostBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h2>{children}</h2>,
        a: ({ href, children }) =>
          href?.startsWith("http") ? (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ) : (
            <a href={href}>{children}</a>
          ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
```

```ts
// src/lib/blog/queries.ts
import { createClient } from "@supabase/supabase-js";
import { isValidSlug } from "./slugify";
import type { BlogPostRow } from "./types";

const COLUMNS =
  "id,slug_en,slug_vi,title_en,title_vi,excerpt_en,excerpt_vi,content_en,content_vi,faq_en,faq_vi," +
  "author_name,cover_image_url,category,post_type,published,published_at,created_at,updated_at";

// Anon key, no session: RLS returns published rows only.
function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

export async function listPublishedPosts(): Promise<BlogPostRow[]> {
  const { data, error } = await publicClient()
    .from("blog_posts")
    .select(COLUMNS)
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw new Error(`blog_posts list failed: ${error.message}`);
  return (data ?? []) as unknown as BlogPostRow[];
}

/** Published rows whose English or Vietnamese slug equals `slug`. */
export async function findPublishedPostsBySlug(slug: string): Promise<BlogPostRow[]> {
  if (!isValidSlug(slug)) return []; // also keeps the .or() filter injection-free
  const { data, error } = await publicClient()
    .from("blog_posts")
    .select(COLUMNS)
    .eq("published", true)
    .or(`slug_en.eq.${slug},slug_vi.eq.${slug}`)
    .limit(2);
  if (error) throw new Error(`blog_posts lookup failed: ${error.message}`);
  return (data ?? []) as unknown as BlogPostRow[];
}
```

```ts
// src/lib/blog/labels.ts
import type { Locale } from "@/lib/i18n/config";

export const BLOG_LABELS = {
  vi: {
    indexTitle: "Bài viết: quốc tịch, di trú, thuế",
    indexDesc: "Hướng dẫn bằng tiếng Việt về thi quốc tịch Mỹ, đơn USCIS, thuế và bảo hiểm — có nguồn và ngày kiểm tra.",
    indexHeading: "Bài viết",
    indexSub: "Thông tin về quốc tịch, di trú, thuế và bảo hiểm, viết bằng tiếng Việt, có dẫn nguồn.",
    empty: "Chưa có bài viết.",
    home: "Trang chủ",
    blog: "Bài viết",
    published: "Đăng ngày",
    updated: "Cập nhật",
    by: "Tác giả",
    faq: "Câu hỏi thường gặp",
    ctaTitle: "Luyện thi quốc tịch miễn phí với N400 Ready",
    ctaBody: "Ôn 128 câu hỏi công dân, luyện nói và viết, thi thử như phỏng vấn thật — bằng tiếng Việt và tiếng Anh.",
    ctaApp: "Mở N400 Ready",
    ctaService: "Dịch vụ hồ sơ di trú",
    all: "Tất cả",
  },
  en: {
    indexTitle: "Articles: citizenship, immigration, tax",
    indexDesc: "Guides on the U.S. citizenship test, USCIS forms, tax and insurance — sourced and dated.",
    indexHeading: "Articles",
    indexSub: "Citizenship, immigration, tax and insurance, explained with sources.",
    empty: "No articles yet.",
    home: "Home",
    blog: "Articles",
    published: "Published",
    updated: "Updated",
    by: "By",
    faq: "Frequently asked questions",
    ctaTitle: "Practice for the citizenship test free with N400 Ready",
    ctaBody: "Study the 128 civics questions, practice speaking and writing, and take mock interviews — in English and Vietnamese.",
    ctaApp: "Open N400 Ready",
    ctaService: "Immigration document services",
    all: "All",
  },
} satisfies Record<Locale, Record<string, string>>;

export const CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  vi: { tax: "Thuế", insurance: "Bảo hiểm", immigration: "Di trú", ai: "AI", general: "Chung" },
  en: { tax: "Tax", insurance: "Insurance", immigration: "Immigration", ai: "AI", general: "General" },
};

export function formatPostDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Chicago",
  });
}
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Rewrite the post page**

```tsx
// src/app/[locale]/blog/[slug]/page.tsx
import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { findPublishedPostsBySlug } from "@/lib/blog/queries";
import { resolvePostRoute } from "@/lib/blog/post-locale";
import { postJsonLd, postMetadata } from "@/lib/blog/post-seo";
import { BLOG_LABELS, formatPostDate } from "@/lib/blog/labels";
import { PostBody } from "@/components/blog/PostBody";

type Props = { params: Promise<{ locale: string; slug: string }> };

async function route(params: Props["params"]) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  return resolvePostRoute(await findPublishedPostsBySlug(slug), locale, slug);
}

export async function generateMetadata({ params }: Props) {
  const r = await route(params);
  return r.kind === "render" ? postMetadata(r.post) : {};
}

export default async function BlogPostPage({ params }: Props) {
  const r = await route(params);
  if (r.kind === "redirect") permanentRedirect(r.to);
  if (r.kind === "not-found") notFound();
  const post = r.post;
  const locale: Locale = post.locale;
  const t = BLOG_LABELS[locale];
  const d = await getDictionary(locale);

  return (
    <div className="py-16 lg:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd(post)) }} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link href={`/${locale}`} className="hover:text-primary">{t.home}</Link>
          <span className="mx-2">›</span>
          <Link href={`/${locale}/blog`} className="hover:text-primary">{t.blog}</Link>
        </nav>

        <h1 className="text-3xl lg:text-4xl font-bold text-charcoal mb-4 leading-tight">{post.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {t.by} {post.authorName} · {t.published} {formatPostDate(post.publishedAt, locale)} · {t.updated}{" "}
          {formatPostDate(post.updatedAt, locale)}
        </p>

        {post.coverImageUrl && (
          <div className="rounded-2xl overflow-hidden mb-8 relative h-64 lg:h-80">
            <Image src={post.coverImageUrl} alt={post.title} fill className="object-cover" />
          </div>
        )}

        <div className="prose prose-lg max-w-none prose-headings:text-charcoal prose-p:text-muted-foreground prose-a:text-primary">
          <PostBody markdown={post.content} />
        </div>

        {post.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-charcoal mb-4">{t.faq}</h2>
            <div className="space-y-3">
              {post.faq.map((f) => (
                <details key={f.q} className="rounded-xl border border-border p-4 [&::-webkit-details-marker]:hidden">
                  <summary className="font-semibold text-charcoal cursor-pointer">{f.q}</summary>
                  <p className="mt-2 text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {post.category === "immigration" && (
          <>
            <p className="mt-10 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
              {d.immigration_scope_note}
            </p>
            <div className="mt-8 rounded-2xl bg-charcoal p-8 text-center">
              <h2 className="text-xl font-bold text-white mb-2">{t.ctaTitle}</h2>
              <p className="text-white/70 text-sm mb-6">{t.ctaBody}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/n400ready" className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark">{t.ctaApp}</Link>
                <Link href={`/${locale}/services/immigration`} className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10">{t.ctaService}</Link>
              </div>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
```

Note: FAQ answers are always rendered in the HTML (`<details>` keeps them in the DOM), so the FAQPage JSON-LD matches visible content.

- [ ] **Step 7: tsc + eslint + full vitest**

Run: `npx tsc --noEmit -p .`, `npx eslint src/lib/blog src/components/blog "src/app/[locale]/blog"`, `npx vitest run`

- [ ] **Step 8: Commit**

```bash
git add package.json ../../pnpm-lock.yaml src/components/blog src/lib/blog/queries.ts src/lib/blog/queries.test.ts src/lib/blog/labels.ts "src/app/[locale]/blog/[slug]/page.tsx"
git commit -m "feat(website): server-rendered blog post page with GFM, FAQ, schema and locale redirects"
```

---

### Task 6: Blog index page + sitemap + llms.txt link

**Files:**
- Rewrite: `apps/website/src/app/[locale]/blog/page.tsx`
- Create: `apps/website/src/components/blog/BlogList.tsx` (client: category filter + cards)
- Modify: `apps/website/src/app/sitemap.ts`
- Modify: `apps/website/src/app/sitemap.test.ts`
- Modify: `apps/website/src/lib/seo/llms-txt.ts`
- Modify: `apps/website/src/app/llms.txt/route.test.ts`

**Interfaces:**
- Consumes: `listPublishedPosts`, `postSlugs`, `localizePost`, `blogPostPath`, `languageAlternates`, `blogIndexMetadata`, `BLOG_LABELS`, `CATEGORY_LABELS`, `formatPostDate`.
- Produces: `sitemap(): Promise<MetadataRoute.Sitemap>`; `BlogList` props `{ locale: Locale; allLabel: string; categoryLabels: Record<string, string>; posts: BlogCard[] }` with `BlogCard = { id: string; href: string; title: string; excerpt: string; category: string; dateLabel: string; coverImageUrl: string | null }`.

- [ ] **Step 1: Update the sitemap tests first (failing)**

Replace `src/app/sitemap.test.ts` with:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlogPostRow } from "@/lib/blog/types";

const listPublishedPosts = vi.fn<() => Promise<BlogPostRow[]>>();
vi.mock("@/lib/blog/queries", () => ({ listPublishedPosts: () => listPublishedPosts() }));

import sitemap from "./sitemap";

const viPost: BlogPostRow = {
  id: "p1", slug_en: null, slug_vi: "don-n-400-la-gi",
  title_en: null, title_vi: "Đơn N-400 là gì?", excerpt_en: null, excerpt_vi: "x",
  content_en: null, content_vi: "Nội dung", faq_en: [], faq_vi: [],
  author_name: "Manna One Solution", cover_image_url: null, category: "immigration", post_type: "article",
  published: true, published_at: "2026-10-20T15:00:00Z", created_at: "2026-10-19T15:00:00Z", updated_at: "2026-10-21T15:00:00Z",
};

beforeEach(() => listPublishedPosts.mockResolvedValue([]));
afterEach(() => vi.useRealTimers());

describe("sitemap.xml", () => {
  it("lists only www URLs, never the apex host that redirects", async () => {
    listPublishedPosts.mockResolvedValue([viPost]);
    for (const entry of await sitemap()) {
      expect(entry.url.startsWith("https://www.mannaos.com/")).toBe(true);
    }
  });

  it("gives each page its en, vi and x-default (English) alternates", async () => {
    const about = (await sitemap()).find((e) => e.url === "https://www.mannaos.com/vi/about");
    expect(about?.alternates?.languages).toEqual({
      en: "https://www.mannaos.com/en/about",
      vi: "https://www.mannaos.com/vi/about",
      "x-default": "https://www.mannaos.com/en/about",
    });
  });

  it("does not stamp the build time as every page's last modification", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const january = await sitemap();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
    expect(await sitemap()).toEqual(january);
  });

  it("adds each published post in the locales it exists in, with its real update date", async () => {
    listPublishedPosts.mockResolvedValue([viPost]);
    const entries = await sitemap();
    expect(entries.find((e) => e.url.endsWith("/blog/don-n-400-la-gi"))).toEqual({
      url: "https://www.mannaos.com/vi/blog/don-n-400-la-gi",
      lastModified: new Date("2026-10-21T15:00:00Z"),
      alternates: { languages: {
        vi: "https://www.mannaos.com/vi/blog/don-n-400-la-gi",
        "x-default": "https://www.mannaos.com/vi/blog/don-n-400-la-gi",
      } },
    });
    expect(entries.some((e) => e.url === "https://www.mannaos.com/vi/blog")).toBe(true);
    expect(entries.some((e) => e.url === "https://www.mannaos.com/en/blog")).toBe(false);
  });

  it("still returns the site's pages when the blog query fails", async () => {
    listPublishedPosts.mockRejectedValue(new Error("db down"));
    const entries = await sitemap();
    expect(entries.some((e) => e.url === "https://www.mannaos.com/vi/about")).toBe(true);
  });
});
```

And in `src/app/llms.txt/route.test.ts`, add the same mock before importing (so `/vi/blog` is a live sitemap URL), and make the sitemap call async:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/blog/queries", () => ({
  listPublishedPosts: async () => [{
    id: "p1", slug_en: null, slug_vi: "bai", title_en: null, title_vi: "Bài", excerpt_en: null, excerpt_vi: "x",
    content_en: null, content_vi: "c", faq_en: [], faq_vi: [], author_name: "Manna One Solution",
    cover_image_url: null, category: "immigration", post_type: "article", published: true,
    published_at: "2026-10-20T15:00:00Z", created_at: "2026-10-20T15:00:00Z", updated_at: "2026-10-20T15:00:00Z",
  }],
}));

import sitemap from "../sitemap";
import { GET } from "./route";
```
and in "links only to live canonical pages": `const livePages = new Set((await sitemap()).map((e) => e.url));`

- [ ] **Step 2: Run — expect the new sitemap tests to FAIL**

Run: `npx vitest run src/app/sitemap.test.ts src/app/llms.txt/route.test.ts`

- [ ] **Step 3: Implement the sitemap**

Replace the bottom of `src/app/sitemap.ts` (keep the `urls()` helper as is) with:

```ts
import { listPublishedPosts } from "@/lib/blog/queries";
import { blogPostPath, postSlugs } from "@/lib/blog/post-locale";
import { languageAlternates } from "@/lib/blog/post-seo";
import type { BlogPostRow } from "@/lib/blog/types";

const absolute = (paths: Partial<Record<(typeof locales)[number], string>>) => {
  const out: Partial<Record<(typeof locales)[number], string>> = {};
  for (const [l, p] of Object.entries(paths) as [(typeof locales)[number], string][]) out[l] = `${SITE_URL}${p}`;
  return languageAlternates(out);
};

async function publishedPosts(): Promise<BlogPostRow[]> {
  try {
    return await listPublishedPosts();
  } catch (error) {
    console.error("sitemap: blog posts unavailable", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await publishedPosts();
  const withPosts = locales.filter((l) => posts.some((p) => postSlugs(p)[l]));
  const blogIndexPaths: Partial<Record<(typeof locales)[number], string>> = {};
  for (const l of withPosts) blogIndexPaths[l] = `/${l}/blog`;

  const blogIndex: MetadataRoute.Sitemap = withPosts.map((l) => ({
    url: `${SITE_URL}/${l}/blog`,
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: { languages: absolute(blogIndexPaths) },
  }));

  const postEntries: MetadataRoute.Sitemap = posts.flatMap((post) => {
    const slugs = postSlugs(post);
    const paths: Partial<Record<(typeof locales)[number], string>> = {};
    for (const [l, s] of Object.entries(slugs) as [(typeof locales)[number], string][]) paths[l] = blogPostPath(l, s);
    return Object.values(paths).map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: new Date(post.updated_at),
      alternates: { languages: absolute(paths) },
    }));
  });

  return [
    ...urls("", 1.0, "weekly"),
    ...urls("/services", 0.9, "monthly"),
    ...urls("/services/immigration", 0.9, "monthly"),
    ...urls("/services/immigration/eb3", 0.8, "monthly"),
    ...urls("/services/tax", 0.9, "monthly"),
    ...urls("/services/ai", 0.9, "monthly"),
    ...urls("/services/insurance", 0.9, "monthly"),
    ...urls("/about", 0.8, "monthly"),
    ...urls("/contact", 0.8, "weekly"),
    ...blogIndex,
    ...postEntries,
    ...urls("/privacy-policy", 0.3, "yearly"),
    ...urls("/terms-of-service", 0.3, "yearly"),
  ];
}
```
(The old `...urls("/blog", …)` line is removed; move the new imports to the top of the file.)

In `src/lib/seo/llms-txt.ts`, under `## Tiếng Việt`, add after the "Thuế & doanh nghiệp" line:
```
- [Bài viết: quốc tịch, di trú, thuế](${vi("/blog")})
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Rewrite the index page + client list**

```tsx
// src/components/blog/BlogList.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n/config";

export type BlogCard = {
  id: string; href: string; title: string; excerpt: string;
  category: string; dateLabel: string; coverImageUrl: string | null;
};

export function BlogList({ locale, allLabel, categoryLabels, posts }: {
  locale: Locale; allLabel: string; categoryLabels: Record<string, string>; posts: BlogCard[];
}) {
  const [active, setActive] = useState("all");
  const categories = ["all", ...Array.from(new Set(posts.map((p) => p.category)))];
  const shown = active === "all" ? posts : posts.filter((p) => p.category === active);

  return (
    <div lang={locale}>
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${active === c ? "bg-primary text-white" : "bg-teal-light text-muted-foreground hover:bg-primary/10"}`}
            >
              {c === "all" ? allLabel : categoryLabels[c] ?? c}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {shown.map((p) => (
          <Link key={p.id} href={p.href} className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
            {p.coverImageUrl && (
              <div className="aspect-video overflow-hidden relative">
                <Image src={p.coverImageUrl} alt={p.title} fill className="object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-light text-primary font-semibold">{categoryLabels[p.category] ?? p.category}</span>
                <span className="text-muted-foreground">{p.dateLabel}</span>
              </div>
              <h2 className="font-bold text-charcoal text-lg mb-2 group-hover:text-primary transition-colors">{p.title}</h2>
              <p className="text-muted-foreground text-sm line-clamp-3">{p.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/[locale]/blog/page.tsx
import { notFound } from "next/navigation";
import { isValidLocale, locales, type Locale } from "@/lib/i18n/config";
import { listPublishedPosts } from "@/lib/blog/queries";
import { blogPostPath, localizePost, postSlugs } from "@/lib/blog/post-locale";
import { blogIndexMetadata } from "@/lib/blog/post-seo";
import { BLOG_LABELS, CATEGORY_LABELS, formatPostDate } from "@/lib/blog/labels";
import { BlogList, type BlogCard } from "@/components/blog/BlogList";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const posts = await listPublishedPosts();
  const withPosts = locales.filter((l) => posts.some((p) => postSlugs(p)[l]));
  return {
    title: BLOG_LABELS[locale].indexTitle,
    description: BLOG_LABELS[locale].indexDesc,
    ...blogIndexMetadata(locale, withPosts),
  };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const l: Locale = locale;
  const t = BLOG_LABELS[l];
  const cards: BlogCard[] = (await listPublishedPosts()).flatMap((row) => {
    const p = localizePost(row, l);
    return p
      ? [{ id: p.id, href: blogPostPath(l, p.slug), title: p.title, excerpt: p.excerpt, category: p.category,
           dateLabel: formatPostDate(p.publishedAt, l), coverImageUrl: p.coverImageUrl }]
      : [];
  });

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">{t.indexHeading}</h1>
          <p className="text-muted-foreground text-lg">{t.indexSub}</p>
        </div>
        {cards.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">{t.empty}</p>
        ) : (
          <BlogList locale={l} allLabel={t.all} categoryLabels={CATEGORY_LABELS[l]} posts={cards} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: tsc + eslint + full vitest**

- [ ] **Step 7: Commit**

```bash
git add src/app/sitemap.ts src/app/sitemap.test.ts src/lib/seo/llms-txt.ts src/app/llms.txt/route.test.ts src/components/blog/BlogList.tsx "src/app/[locale]/blog/page.tsx"
git commit -m "feat(website): server-rendered blog index; posts in sitemap with real lastmod"
```

---

### Task 7: Admin editor — per-locale slugs, FAQ rows, author, publish guard, visible errors

**Files:**
- Create: `apps/website/src/lib/blog/publish-guard.ts`
- Test: `apps/website/src/lib/blog/publish-guard.test.ts`
- Modify: `apps/website/src/app/[locale]/admin/blog/page.tsx`

**Interfaces:**
- Consumes: `BlogPostRow`, `FaqItem`, `slugify`, `isValidSlug`.
- Produces: `publishBlocker(post: Partial<BlogPostRow>): string | null` — null when at least one language has title + valid slug + content + excerpt; otherwise a Vietnamese reason.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/blog/publish-guard.test.ts
import { describe, expect, it } from "vitest";
import { publishBlocker } from "./publish-guard";

const viComplete = { title_vi: "Đơn N-400", slug_vi: "don-n-400", content_vi: "Nội dung", excerpt_vi: "Tóm tắt" };

describe("publishBlocker", () => {
  it("allows publishing when one language is complete", () => {
    expect(publishBlocker(viComplete)).toBeNull();
  });

  it("blocks when no language has title, slug, content and excerpt", () => {
    expect(publishBlocker({ ...viComplete, excerpt_vi: "" })).toMatch(/ít nhất một ngôn ngữ/);
    expect(publishBlocker({})).toMatch(/ít nhất một ngôn ngữ/);
  });

  it("blocks a slug the database would reject", () => {
    expect(publishBlocker({ ...viComplete, slug_vi: "Don N-400" })).toMatch(/slug/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/blog/publish-guard.ts
import { isValidSlug } from "./slugify";
import type { BlogPostRow } from "./types";

const filled = (s: string | null | undefined) => !!s && s.trim() !== "";

/** Why this post can't be published yet, or null when it can. */
export function publishBlocker(post: Partial<BlogPostRow>): string | null {
  const langs = [
    { slug: post.slug_vi, title: post.title_vi, content: post.content_vi, excerpt: post.excerpt_vi },
    { slug: post.slug_en, title: post.title_en, content: post.content_en, excerpt: post.excerpt_en },
  ];
  for (const l of langs) {
    if (filled(l.slug) && !isValidSlug(l.slug!)) return `Slug "${l.slug}" không hợp lệ: chỉ chữ thường, số và dấu gạch ngang.`;
  }
  const complete = langs.some((l) => filled(l.slug) && filled(l.title) && filled(l.content) && filled(l.excerpt));
  return complete ? null : "Cần ít nhất một ngôn ngữ có đủ tiêu đề, slug, tóm tắt và nội dung.";
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Modify the admin page**

In `src/app/[locale]/admin/blog/page.tsx`:

1. Replace the local `BlogPost` interface and `EMPTY_POST` with:
```ts
import type { BlogPostRow, FaqItem } from "@/lib/blog/types";
import { slugify } from "@/lib/blog/slugify";
import { publishBlocker } from "@/lib/blog/publish-guard";

type BlogPost = BlogPostRow;

const EMPTY_POST: Partial<BlogPost> = {
  slug_en: "", slug_vi: "", title_en: "", title_vi: "", excerpt_en: "", excerpt_vi: "",
  content_en: "", content_vi: "", faq_en: [], faq_vi: [], author_name: "Manna One Solution",
  cover_image_url: "", category: "immigration", post_type: "article", published: false,
};
```
2. Remove `generateSlug`. Add state `const [saveError, setSaveError] = useState<string | null>(null);` and reset it to `null` wherever the modal opens (the "New Post" and edit buttons' onClick).
3. Replace `savePost` with:
```ts
async function savePost() {
  if (!editing) return;
  if (editing.published) {
    const blocker = publishBlocker(editing);
    if (blocker) { setSaveError(blocker); return; }
  }
  setSaving(true);
  setSaveError(null);
  const payload = {
    slug_en: editing.slug_en || null,
    slug_vi: editing.slug_vi || null,
    title_en: editing.title_en || null,
    title_vi: editing.title_vi || null,
    excerpt_en: editing.excerpt_en || null,
    excerpt_vi: editing.excerpt_vi || null,
    content_en: editing.content_en || null,
    content_vi: editing.content_vi || null,
    faq_en: (editing.faq_en ?? []).filter((f) => f.q.trim() && f.a.trim()),
    faq_vi: (editing.faq_vi ?? []).filter((f) => f.q.trim() && f.a.trim()),
    author_name: editing.author_name?.trim() || "Manna One Solution",
    cover_image_url: editing.cover_image_url || null,
    category: editing.category || "general",
    post_type: editing.post_type || "article",
    published: editing.published ?? false,
  };
  const { error } = editing.id
    ? await supabase.from("blog_posts").update(payload).eq("id", editing.id)
    : await supabase.from("blog_posts").insert(payload);
  setSaving(false);
  if (error) {
    setSaveError(error.code === "23505" ? "Slug này đã được dùng cho bài khác." : error.message);
    return;
  }
  setEditing(null);
  load();
}
```
4. In both language tabs, the Title field's onChange also fills that language's slug while the slug is still the auto value:
```tsx
<FormField label="Title (VI)" value={editing.title_vi || ""} onChange={(v) => setEditing({
  ...editing, title_vi: v,
  slug_vi: !editing.slug_vi || editing.slug_vi === slugify(editing.title_vi || "") ? slugify(v) : editing.slug_vi,
})} />
<FormField label="Slug (VI)" value={editing.slug_vi || ""} onChange={(v) => setEditing({ ...editing, slug_vi: v })} />
```
(mirror with `_en` in the English tab), plus under each Excerpt field: `<p className="text-xs text-muted-foreground mt-1">{(editing.excerpt_vi || "").length}/160</p>` (red when > 160: `className={len > 160 ? "text-xs text-red-600 mt-1" : "text-xs text-muted-foreground mt-1"}`), and the FAQ editor for that language: `<FaqEditor value={editing.faq_vi ?? []} onChange={(faq) => setEditing({ ...editing, faq_vi: faq })} />`.
5. Remove the shared "Slug" field; add `<FormField label="Author" value={editing.author_name || ""} onChange={(v) => setEditing({ ...editing, author_name: v })} />` next to Cover Image URL.
6. Above the Cancel/Save buttons: `{saveError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>}`.
7. In the list row, after the date: for published posts link to the public page:
```tsx
{p.published && (p.slug_vi || p.slug_en) && (
  <a href={p.slug_vi ? `/vi/blog/${p.slug_vi}` : `/en/blog/${p.slug_en}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">Xem bài</a>
)}
```
8. Add the FAQ editor component at the bottom of the file:
```tsx
function FaqEditor({ value, onChange }: { value: FaqItem[]; onChange: (v: FaqItem[]) => void }) {
  const set = (i: number, patch: Partial<FaqItem>) => onChange(value.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1">FAQ</label>
      <div className="space-y-2">
        {value.map((f, i) => (
          <div key={i} className="rounded-lg border border-border p-2 space-y-1">
            <input value={f.q} onChange={(e) => set(i, { q: e.target.value })} placeholder="Câu hỏi" className="w-full h-9 rounded-md border border-border px-2 text-sm" />
            <textarea value={f.a} onChange={(e) => set(i, { a: e.target.value })} placeholder="Trả lời" rows={2} className="w-full rounded-md border border-border px-2 py-1 text-sm" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-xs text-red-600">Xóa</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...value, { q: "", a: "" }])} className="mt-2 text-sm text-primary font-medium">+ Thêm câu hỏi</button>
    </div>
  );
}
```
9. Content textareas: placeholder "Markdown" (HTML is not rendered), `rows={14}`.

- [ ] **Step 6: tsc + eslint (page) + full vitest**

- [ ] **Step 7: Manual check on the dev server (after Task 1 is applied)**

Log in as admin at `/vi/login`, open `/vi/admin/blog`: create a Vietnamese draft (slug auto-fills from title), save, reopen, add two FAQ rows, publish, open "Xem bài". Then try saving a second post with the same `slug_vi` → "Slug này đã được dùng cho bài khác." stays in the modal. Delete both test posts afterwards (`delete from public.blog_posts where slug_vi like 'test-%'` with owner OK, or via a DO-block rollback).

- [ ] **Step 8: Commit**

```bash
git add src/lib/blog/publish-guard.ts src/lib/blog/publish-guard.test.ts "src/app/[locale]/admin/blog/page.tsx"
git commit -m "feat(website): admin blog — Vietnamese slugs, FAQ rows, author, publish guard, save errors"
```

---

### Task 8: Six Vietnamese N-400 articles (drafts for owner review)

Independent of Tasks 1–7 (Markdown files only) — can run in parallel.

**Files:**
- Create: `docs/content/blog/vi/thi-quoc-tich-my.md`
- Create: `docs/content/blog/vi/128-cau-hoi-thi-quoc-tich-my.md`
- Create: `docs/content/blog/vi/thi-quoc-tich-my-cho-nguoi-tren-65-tuoi.md`
- Create: `docs/content/blog/vi/cau-hoi-yes-no-don-n-400.md`
- Create: `docs/content/blog/vi/don-n-400-la-gi.md`
- Create: `docs/content/blog/vi/thi-quoc-tich-my-co-kho-khong.md`

**File format** (front matter is `key: value` lines; the FAQ is the last section, `### question` + answer paragraph, so the loader in Task 9 can move it into `faq_vi`):

```markdown
---
slug_vi: don-n-400-la-gi
title_vi: Đơn N-400 là gì? Điều kiện, lệ phí và các phần của đơn
excerpt_vi: Đơn N-400 là đơn xin nhập quốc tịch Mỹ. Điều kiện nộp, lệ phí theo uscis.gov và các phần chính của đơn, giải thích bằng tiếng Việt.
category: immigration
checked_on: 2026-10-16
---

(2–3 sentences that answer the title directly)

## …H2 sections, each opening with a direct answer…

## Nguồn

- [USCIS — N-400, Application for Naturalization](https://www.uscis.gov/n-400) (kiểm tra ngày 16/10/2026)

## Câu hỏi thường gặp

### Câu hỏi 1?

Trả lời 1.
```

- [ ] **Step 1: Verify the facts (spec §8.3) on uscis.gov and record each with URL + date in a scratch checklist** — 2025 civics test rules and effective date; 65/20 under the 2025 test; 50/20, 55/15, N-648; N-400 fees (paper/online), reduced fee, I-912; eligibility (5 yrs / 3 yrs, continuous residence, physical presence, good moral character); pass-rate data and its period; the official 128 questions/answers (M-1778) cross-checked with the N400 Ready bank (`select` from the `n400_*` question table, read-only).
- [ ] **Step 2: Write the pillar (`thi-quoc-tich-my`, 2,500–3,500 words)** linking to all five clusters, `/n400ready`, `/vi/services/immigration` and ≥ 3 uscis.gov pages.
- [ ] **Step 3: Write the five clusters (1,200–2,500 words; the 128-question list may be longer)**, each linking the pillar, two siblings, `/n400ready`, `/vi/services/immigration`, ≥ 1 uscis.gov page.
- [ ] **Step 4: Self-check every file:** excerpt ≤ 160 characters and contains the primary query; 5–8 FAQ entries; no "chuyên gia/expert/chuyên môn"; no MannaOS price; every number has a linked source; no advice on what to answer; `grep -ri immilink docs/content` empty.
- [ ] **Step 5: Commit and ask the owner to review the six drafts**

```bash
git add docs/content/blog/vi
git commit -m "docs(content): six Vietnamese N-400 article drafts for review"
```

---

### Task 9: Rollout (each step needs the owner's OK at that moment)

- [ ] **Step 1: Integration check on the dev server** (`.claude/launch.json` `website-dev`, port 3107) with a temporary published row (Task 1 applied): `curl` the list and post pages — full article text in the HTML, exactly one canonical, hreflang only `vi` + `x-default`, JSON-LD parses with BlogPosting/BreadcrumbList/FAQPage; `/vi/blog/does-not-exist` → 404; `/en/blog/<vi-slug>` → 404; `/vi/blog/a,b` → 404. Remove the temporary row.
- [ ] **Step 2: Full verification:** `npx vitest run`, `npx tsc --noEmit -p .`, `npx eslint`, `npx next build`.
- [ ] **Step 3 (owner OK): push** `git push origin HEAD:main` (rebase on `main` first if it moved); confirm `https://www.mannaos.com/vi/blog` responds and is `noindex` while empty.
- [ ] **Step 4 (owner OK after reviewing drafts): load the posts.** Convert each draft to one upsert with a scratchpad script (not committed):

```python
# scratchpad/blog_to_sql.py — usage: python3 -I blog_to_sql.py docs/content/blog/vi/*.md > posts.sql
import json, re, sys

def parse(path):
    text = open(path, encoding="utf-8").read()
    _, fm, body = text.split("---\n", 2)
    meta = dict(line.split(": ", 1) for line in fm.strip().splitlines())
    body, _, faq_part = body.partition("\n## Câu hỏi thường gặp\n")
    faq = [{"q": q.strip(), "a": a.strip()} for q, a in re.findall(r"^### (.+?)\n+(.+?)(?=\n### |\Z)", faq_part, re.S | re.M)]
    return meta, body.strip(), faq

def lit(s):  # dollar-quoted literal; tag chosen so it never appears in the text
    return f"$blog${s}$blog$"

for path in sys.argv[1:]:
    meta, body, faq = parse(path)
    print(
        "insert into public.blog_posts (slug_vi, title_vi, excerpt_vi, content_vi, faq_vi, category, published) values ("
        f"{lit(meta['slug_vi'])}, {lit(meta['title_vi'])}, {lit(meta['excerpt_vi'])}, {lit(body)}, "
        f"{lit(json.dumps(faq, ensure_ascii=False))}::jsonb, {lit(meta['category'])}, true) "
        "on conflict (slug_vi) do update set title_vi = excluded.title_vi, excerpt_vi = excluded.excerpt_vi, "
        "content_vi = excluded.content_vi, faq_vi = excluded.faq_vi, category = excluded.category, published = true;"
    )
```
Run the SQL with MCP `execute_sql`; then on prod: each post page 200 with its JSON-LD, `sitemap.xml` lists the six posts and `/vi/blog`, `/en/blog` stays out.
- [ ] **Step 5: ROADMAP + memory:** tick the "SEO/GEO B" line in `docs/ROADMAP.md` with what shipped; strike the `blog_posts` half of the P0 line; update memory `mannaos-seo-geo-work`. Commit `docs: ROADMAP — SEO blog + N-400 articles live`, push with owner OK. Owner: request indexing of the pillar in GSC, submit sitemap in Bing.
