import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isValidSlug } from "./slugify";
import { BLOG_TAGS, keepTagsForCategory, tagBySlug, tagPath, tagsForPost, tagsInCategory } from "./tags";

describe("BLOG_TAGS registry", () => {
  it("has unique keys and unique valid slugs per locale", () => {
    const keys = BLOG_TAGS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const locale of ["vi", "en"] as const) {
      const slugs = BLOG_TAGS.map((t) => t.slug[locale]);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const s of slugs) expect(isValidSlug(s)).toBe(true);
    }
  });

  it("has a label and a description of at most 160 characters in both locales", () => {
    for (const t of BLOG_TAGS) {
      for (const locale of ["vi", "en"] as const) {
        expect(t.label[locale].trim()).not.toBe("");
        expect(t.description[locale].trim()).not.toBe("");
        expect(t.description[locale].length).toBeLessThanOrEqual(160);
      }
    }
  });

  it("covers every key the backfill migration writes", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/website_02_blog_tags.sql"), "utf8");
    const used = [...sql.matchAll(/array\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
    expect(used.length).toBeGreaterThan(0);
    const known = new Set(BLOG_TAGS.map((t) => t.key));
    for (const key of used) expect(known.has(key)).toBe(true);
  });
});

describe("business and EB-3 hashtags", () => {
  it("lists the business hashtags in registry order", () => {
    expect(tagsInCategory("business").map((t) => t.key)).toEqual([
      "form-llc", "texas-business", "business-taxes", "business-banking", "business-website", "us-company-from-vietnam",
    ]);
  });

  it("adds EB-3 and immigration-scam hashtags under immigration", () => {
    expect(tagBySlug("vi", "eb3")?.key).toBe("eb3");
    expect(tagBySlug("en", "immigration-scams")?.category).toBe("immigration");
    expect(tagPath("vi", "form-llc")).toBe("/vi/blog/chu-de/mo-llc");
  });
});

describe("tax hashtags", () => {
  it("lists the tax hashtags in registry order", () => {
    expect(tagsInCategory("tax").map((t) => t.key)).toEqual([
      "income-tax-filing", "foreign-accounts", "money-to-vietnam", "self-employed-taxes",
    ]);
  });

  it("builds localized paths for them", () => {
    expect(tagPath("vi", "income-tax-filing")).toBe("/vi/blog/chu-de/khai-thue");
    expect(tagPath("en", "money-to-vietnam")).toBe("/en/blog/topics/money-to-vietnam");
    expect(tagBySlug("vi", "thue-tu-doanh")?.key).toBe("self-employed-taxes");
  });
});

describe("hashtag lookups", () => {
  it("drops unknown keys and keeps registry order", () => {
    expect(tagsForPost(["uscis-fees", "nope", "green-card"]).map((t) => t.key)).toEqual(["green-card", "uscis-fees"]);
  });

  it("finds a hashtag by its locale slug", () => {
    expect(tagBySlug("vi", "bao-lanh-cha-me")?.key).toBe("sponsor-parents");
    expect(tagBySlug("en", "bao-lanh-cha-me")).toBeNull();
  });

  it("builds the localized hashtag page path", () => {
    expect(tagPath("vi", "sponsor-parents")).toBe("/vi/blog/chu-de/bao-lanh-cha-me");
    expect(tagPath("en", "sponsor-parents")).toBe("/en/blog/topics/sponsor-parents");
  });

  it("lists hashtags of one category and keeps only those when the category changes", () => {
    expect(tagsInCategory("immigration").every((t) => t.category === "immigration")).toBe(true);
    expect(tagsInCategory("insurance")).toEqual([]);
    expect(keepTagsForCategory(["green-card", "nope"], "immigration")).toEqual(["green-card"]);
    expect(keepTagsForCategory(["green-card"], "tax")).toEqual([]);
  });
});
