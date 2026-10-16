import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";

afterEach(() => {
  vi.useRealTimers();
});

describe("sitemap.xml", () => {
  it("lists only www URLs, never the apex host that redirects", () => {
    for (const entry of sitemap()) {
      expect(entry.url.startsWith("https://www.mannaos.com/")).toBe(true);
    }
  });

  it("gives each page its en, vi and x-default (English) alternates", () => {
    const about = sitemap().find((e) => e.url === "https://www.mannaos.com/vi/about");
    expect(about?.alternates?.languages).toEqual({
      en: "https://www.mannaos.com/en/about",
      vi: "https://www.mannaos.com/vi/about",
      "x-default": "https://www.mannaos.com/en/about",
    });
  });

  it("does not stamp the build time as every page's last modification", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const january = sitemap();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
    expect(sitemap()).toEqual(january);
  });
});
