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
