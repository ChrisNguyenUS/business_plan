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

// Braces matter: a function returned from beforeEach is run as teardown.
beforeEach(() => {
  listPublishedPosts.mockResolvedValue([]);
});
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
      alternates: {
        languages: {
          vi: "https://www.mannaos.com/vi/blog/don-n-400-la-gi",
          "x-default": "https://www.mannaos.com/vi/blog/don-n-400-la-gi",
        },
      },
    });
    expect(entries.some((e) => e.url === "https://www.mannaos.com/vi/blog")).toBe(true);
    expect(entries.some((e) => e.url === "https://www.mannaos.com/en/blog")).toBe(false);
  });

  it("is regenerated periodically so newly published posts appear without a deploy", async () => {
    const mod = await import("./sitemap");
    expect(mod.revalidate).toBeGreaterThan(0);
    expect(mod.revalidate).toBeLessThanOrEqual(3600);
  });

  it("still returns the site's pages when the blog query fails", async () => {
    listPublishedPosts.mockImplementation(async () => {
      throw new Error("db down");
    });
    const entries = await sitemap();
    expect(entries.some((e) => e.url === "https://www.mannaos.com/vi/about")).toBe(true);
  });
});
