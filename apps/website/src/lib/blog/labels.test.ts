import { describe, expect, it } from "vitest";
import { BLOG_LABELS, CATEGORY_LABELS, CATEGORY_ORDER } from "./labels";

describe("blog labels", () => {
  it("orders the six filterable categories and never lists general", () => {
    expect(CATEGORY_ORDER).toEqual(["immigration", "business", "tax", "insurance", "ai", "documents"]);
  });

  it("names every category in both languages", () => {
    for (const key of [...CATEGORY_ORDER, "general"]) {
      expect(CATEGORY_LABELS.vi[key]).toBeTruthy();
      expect(CATEGORY_LABELS.en[key]).toBeTruthy();
    }
    expect(CATEGORY_LABELS.vi.immigration).toBe("Di trú Mỹ");
    expect(CATEGORY_LABELS.vi.documents).toBe("Giấy tờ ở Mỹ");
  });

  it("has the same UI string keys in both languages", () => {
    expect(Object.keys(BLOG_LABELS.vi).sort()).toEqual(Object.keys(BLOG_LABELS.en).sort());
  });
});
