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
