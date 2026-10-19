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
  // One typo = one inserted, deleted or substituted letter; a swap of two letters counts as two.
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
