import { describe, expect, it } from "vitest";
import { englishOnlyAlternates, localeAlternates } from "./alternates";

describe("localeAlternates", () => {
  it("makes each locale version its own canonical", () => {
    expect(localeAlternates("vi", "/about")?.canonical).toBe("/vi/about");
    expect(localeAlternates("en", "/about")?.canonical).toBe("/en/about");
  });

  it("links both language versions and sends other languages to English", () => {
    expect(localeAlternates("vi", "/services/tax")?.languages).toEqual({
      en: "/en/services/tax",
      vi: "/vi/services/tax",
      "x-default": "/en/services/tax",
    });
  });

  it("points the home page at /vi and /en, never a redirecting trailing slash", () => {
    expect(localeAlternates("vi", "")).toEqual({
      canonical: "/vi",
      languages: { en: "/en", vi: "/vi", "x-default": "/en" },
    });
  });
});

describe("englishOnlyAlternates", () => {
  it("points both locales at the English page, with no hreflang pair", () => {
    expect(englishOnlyAlternates("/privacy-policy")).toEqual({ canonical: "/en/privacy-policy" });
  });
});
