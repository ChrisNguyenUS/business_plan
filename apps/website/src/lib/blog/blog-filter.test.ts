import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTER, filterCards, filterToSearch, hasActiveFilters, parseFilter, tagCountsFor, topicsByCount, topTags,
  visibleCategories, type FilterableCard,
} from "./blog-filter";

// Server order is newest first.
const card = (id: string, title: string, tags: string[], publishedAt: string, category = "immigration"): FilterableCard & { id: string } => ({
  id, title, excerpt: "", category, tags, publishedAt,
});
const cards = [
  card("a", "Gia hạn thẻ xanh", ["green-card", "uscis-fees"], "2026-10-03T00:00:00Z"),
  card("b", "Mất thẻ xanh", ["green-card", "travel-abroad"], "2026-10-02T00:00:00Z"),
  card("c", "Bảo lãnh cha mẹ", ["sponsor-parents", "family-petitions"], "2026-10-01T00:00:00Z"),
  card("d", "Khai thuế 2027", [], "2026-09-30T00:00:00Z", "tax"),
];
const params = (q: string) => new URLSearchParams(q);
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("parseFilter / filterToSearch", () => {
  it("reads q, a known category, a hashtag slug in the page's locale and the sort", () => {
    expect(parseFilter(params("q=th%E1%BA%BB&cat=tax&tag=the-xanh&sort=oldest"), "vi")).toEqual({ q: "thẻ", cat: "tax", tag: "green-card", sort: "oldest" });
  });
  it("ignores unknown categories, general, slugs from the other locale and unknown sorts", () => {
    expect(parseFilter(params("cat=general&tag=green-card&sort=random"), "vi")).toEqual(EMPTY_FILTER);
  });
  it("writes only the set fields, with the tag as a locale slug and newest omitted", () => {
    expect(filterToSearch({ q: " lệ phí ", cat: null, tag: "green-card", sort: "newest" }, "en")).toBe("?q=l%E1%BB%87+ph%C3%AD&tag=green-card");
    expect(filterToSearch({ ...EMPTY_FILTER, sort: "oldest" }, "vi")).toBe("?sort=oldest");
    expect(filterToSearch(EMPTY_FILTER, "vi")).toBe("");
  });
});

describe("filterCards", () => {
  it("filters by category, hashtag and search together", () => {
    expect(ids(filterCards(cards, { ...EMPTY_FILTER, cat: "tax" }, "vi"))).toEqual(["d"]);
    expect(ids(filterCards(cards, { ...EMPTY_FILTER, tag: "green-card" }, "vi"))).toEqual(["a", "b"]);
    expect(ids(filterCards(cards, { ...EMPTY_FILTER, q: "mat", tag: "green-card" }, "vi"))).toEqual(["b"]);
  });
  it("searches hashtag labels in the page's locale", () => {
    expect(ids(filterCards(cards, { ...EMPTY_FILTER, q: "bao lanh gia dinh" }, "vi"))).toEqual(["c"]);
    expect(ids(filterCards(cards, { ...EMPTY_FILTER, q: "family petitions" }, "en"))).toEqual(["c"]);
  });
  it("sorts newest or oldest first by publish date", () => {
    expect(ids(filterCards(cards, EMPTY_FILTER, "vi"))).toEqual(["a", "b", "c", "d"]);
    expect(ids(filterCards(cards, { ...EMPTY_FILTER, sort: "oldest" }, "vi"))).toEqual(["d", "c", "b", "a"]);
  });
  it("keeps title matches first when sorting by relevance with a query", () => {
    const mixed = [
      card("body", "Gia hạn", ["green-card"], "2026-10-05T00:00:00Z"),
      card("title", "Thẻ xanh mất", [], "2026-10-01T00:00:00Z"),
    ];
    expect(ids(filterCards(mixed, { ...EMPTY_FILTER, q: "the xanh", sort: "relevant" }, "vi"))).toEqual(["title", "body"]);
    expect(ids(filterCards(mixed, { ...EMPTY_FILTER, q: "the xanh" }, "vi"))).toEqual(["body", "title"]);
  });
});

describe("hasActiveFilters", () => {
  it("is true only when a query, category or hashtag is set", () => {
    expect(hasActiveFilters(EMPTY_FILTER)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTER, sort: "oldest" })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTER, q: "  " })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTER, tag: "green-card" })).toBe(true);
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
  it("orders topics by post count, ties in registry order", () => {
    expect(topicsByCount(cards, null).map((x) => x.tag.key)).toEqual([
      "green-card", "sponsor-parents", "family-petitions", "uscis-fees", "travel-abroad",
    ]);
  });
  it("lists the most used hashtags first for the empty state", () => {
    expect(topTags(cards, 2).map((x) => x.tag.key)).toEqual(["green-card", "sponsor-parents"]);
  });
});
