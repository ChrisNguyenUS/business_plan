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

  it("keeps the plain swap when the hashtag slug is unknown", () => {
    expect(getAlternateLocaleHref("/vi/blog/chu-de/khong-co", "vi")).toBe("/en/blog/chu-de/khong-co");
  });
});
