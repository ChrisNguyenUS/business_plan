import { describe, expect, it } from "vitest";
import sitemap from "../sitemap";
import { GET } from "./route";

async function body() {
  return (await GET()).text();
}

describe("/llms.txt", () => {
  it("answers 200 as plain text (it used to be a 500)", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });

  it("follows the llms.txt layout: H1 name, quoted summary, linked sections", async () => {
    const lines = (await body()).split("\n").filter((l) => l.trim() !== "");
    expect(lines[0]).toBe("# Manna One Solution");
    expect(lines[1].startsWith("> ")).toBe(true);
    expect(lines.some((l) => l.startsWith("## "))).toBe(true);
  });

  it("links only to live canonical pages", async () => {
    const livePages = new Set(sitemap().map((e) => e.url));
    livePages.add("https://www.mannaos.com/n400ready");
    const links = [...(await body()).matchAll(/\]\((https?:[^)\s]+)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(5);
    for (const link of links) {
      expect(livePages.has(link), link).toBe(true);
    }
  });

  it("states that Manna One Solution is not a law firm", async () => {
    expect(await body()).toContain("not a law firm");
  });

  it("never names the EB-3 white-label partner", async () => {
    expect((await body()).toLowerCase()).not.toContain("immilink");
  });
});
