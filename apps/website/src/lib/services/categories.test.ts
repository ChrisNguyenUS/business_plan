import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";
import { serviceCategories } from "./categories";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

describe("serviceCategories", () => {
  const cats = serviceCategories(en as Dictionary, "en");

  it("lists the six top-level categories in order", () => {
    expect(cats.map((c) => c.key)).toEqual([
      "immigration",
      "personal-documents",
      "tax",
      "business",
      "insurance",
      "ai",
    ]);
  });

  it("keeps existing detail URLs and adds the two new ones", () => {
    expect(cats.map((c) => c.href)).toEqual([
      "/en/services/immigration",
      "/en/services/personal-documents",
      "/en/services/tax",
      "/en/services/business",
      "/en/services/insurance",
      "/en/services/ai",
    ]);
  });

  it("keeps Personal & Document Services out of the immigration tree", () => {
    const personal = cats.find((c) => c.key === "personal-documents")!;
    expect(personal.href).not.toContain("/immigration");
    expect(personal.title.toLowerCase()).not.toContain("immigration");
  });

  it("has a title, description, short nav label and image for every category in both languages", () => {
    for (const [dict, locale] of [[en, "en"], [vi, "vi"]] as const) {
      for (const c of serviceCategories(dict as Dictionary, locale)) {
        expect(c.title, c.key).toBeTruthy();
        expect(c.desc, c.key).toBeTruthy();
        expect(c.navLabel, c.key).toBeTruthy();
        expect(c.img).toMatch(/^\/images\/services\/.+\.webp$/);
      }
    }
  });
});
