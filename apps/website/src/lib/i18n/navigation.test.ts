import { describe, expect, it } from "vitest";
import { getAlternateLocaleHref } from "./navigation";

describe("getAlternateLocaleHref", () => {
  it("swaps the locale prefix on ordinary pages", () => {
    expect(getAlternateLocaleHref("/vi/about", "vi")).toBe("/en/about");
    expect(getAlternateLocaleHref("/en", "en")).toBe("/vi");
  });

  it("points a hashtag page at the hashtag page of the other language", () => {
    expect(getAlternateLocaleHref("/vi/blog/chu-de/ngan-hang-tin-dung", "vi")).toBe("/en/blog/topics/banking-and-credit");
    expect(getAlternateLocaleHref("/en/blog/topics/banking-and-credit", "en")).toBe("/vi/blog/chu-de/ngan-hang-tin-dung");
  });

  it("points a blog post at the same post's slug in the other language", () => {
    const slugs = { vi: { "lam-passport-my-lan-dau": "first-us-passport-fees-documents" }, en: { "first-us-passport-fees-documents": "lam-passport-my-lan-dau" } };
    expect(getAlternateLocaleHref("/vi/blog/lam-passport-my-lan-dau", "vi", slugs)).toBe("/en/blog/first-us-passport-fees-documents");
    expect(getAlternateLocaleHref("/en/blog/first-us-passport-fees-documents", "en", slugs)).toBe("/vi/blog/lam-passport-my-lan-dau");
    expect(getAlternateLocaleHref("/vi/blog/chua-co-ban-en", "vi", slugs)).toBe("/en/blog/chua-co-ban-en");
    expect(getAlternateLocaleHref("/vi/blog", "vi", slugs)).toBe("/en/blog");
  });

  it("keeps the plain swap when the hashtag slug is unknown", () => {
    expect(getAlternateLocaleHref("/vi/blog/chu-de/khong-co", "vi")).toBe("/en/blog/chu-de/khong-co");
  });
});
