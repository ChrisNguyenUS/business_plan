import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots.txt", () => {
  it("points crawlers at the sitemap on the www host", () => {
    expect(robots().sitemap).toBe("https://www.mannaos.com/sitemap.xml");
  });

  it("lets every crawler, AI crawlers included, into the public site", () => {
    expect(robots().rules).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("keeps the API, admin and client portal out of the crawl", () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? [] : rules.disallow;
    expect(disallow).toEqual(
      expect.arrayContaining(["/api/", "/en/admin", "/vi/admin", "/en/portal", "/vi/portal"])
    );
  });
});
