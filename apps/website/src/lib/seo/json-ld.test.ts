import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { siteJsonLd } from "./json-ld";

const ORG_ID = "https://www.mannaos.com/#organization";

function node(type: string) {
  return siteJsonLd["@graph"].find((n) => [n["@type"]].flat().includes(type));
}

describe("site-wide JSON-LD", () => {
  it("describes the business on the www host, serving the whole U.S.", () => {
    expect(node("Organization")).toMatchObject({
      "@id": ORG_ID,
      name: "Manna One Solution",
      url: "https://www.mannaos.com",
      areaServed: { "@type": "Country", name: "United States" },
    });
  });

  it("declares the WebSite and names the business as its publisher", () => {
    expect(node("WebSite")).toMatchObject({
      url: "https://www.mannaos.com",
      publisher: { "@id": ORG_ID },
    });
  });

  it("points the logo at a file that ships in /public", () => {
    const logo = new URL(String(node("Organization")?.logo));
    expect(logo.origin).toBe("https://www.mannaos.com");
    const file = fileURLToPath(new URL(`../../../public${logo.pathname}`, import.meta.url));
    expect(existsSync(file)).toBe(true);
  });
});
