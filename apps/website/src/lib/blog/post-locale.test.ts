import { describe, expect, it } from "vitest";
import { blogIndexPosts, localesWithTag, localizePost, postSlugs, postsForTag, resolvePostRoute } from "./post-locale";
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
    tags: [],
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
      coverImageUrl: null, category: "immigration", tags: [],
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
    expect(resolvePostRoute([viOnly], "vi", "don-n-400-la-gi").kind).toBe("render");
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

describe("blogIndexPosts", () => {
  it("lists the page's own-language posts when it has any", () => {
    const r = blogIndexPosts([viOnly, both], "en");
    expect(r.fallback).toBe(false);
    expect(r.posts.map((p) => [p.id, p.locale])).toEqual([["p2", "en"]]);
  });

  it("falls back to the other language's posts instead of an empty page", () => {
    const r = blogIndexPosts([viOnly], "en");
    expect(r.fallback).toBe(true);
    expect(r.posts.map((p) => [p.id, p.locale, p.slug])).toEqual([["p1", "vi", "don-n-400-la-gi"]]);
  });

  it("is empty only when no language has posts", () => {
    expect(blogIndexPosts([], "vi")).toEqual({ fallback: false, posts: [] });
  });
});

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
