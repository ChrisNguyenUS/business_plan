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
