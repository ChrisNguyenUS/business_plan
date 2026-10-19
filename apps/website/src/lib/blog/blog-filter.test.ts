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
