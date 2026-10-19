import { describe, expect, it } from "vitest";
import { blogIndexMetadata, languageAlternates, postJsonLd, postMetadata } from "./post-seo";
import type { LocalizedPost } from "./types";

const post: LocalizedPost = {
  id: "p1", locale: "vi", slug: "don-n-400-la-gi", title: "Đơn N-400 là gì?", excerpt: "Tóm tắt",
  content: "Nội dung", faq: [{ q: "Lệ phí bao nhiêu?", a: "Xem uscis.gov." }],
  authorName: "Manna One Solution", coverImageUrl: null, category: "immigration", tags: [],
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

  it("shares the post's own cover on Open Graph and Twitter", () => {
    const m = postMetadata({ ...post, coverImageUrl: "/images/blog/don-n-400-la-gi.webp" });
    expect(m.openGraph).toMatchObject({ images: ["/images/blog/don-n-400-la-gi.webp"] });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", images: ["/images/blog/don-n-400-la-gi.webp"] });
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

  it("makes a site-relative cover image absolute for structured data", () => {
    const g = postJsonLd({ ...post, coverImageUrl: "/images/blog/don-n-400-la-gi.webp" })["@graph"];
    expect(g.find((n) => n["@type"] === "BlogPosting")?.image).toBe(
      "https://www.mannaos.com/images/blog/don-n-400-la-gi.webp"
    );
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
