import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostBody } from "./PostBody";

describe("PostBody", () => {
  it("renders Markdown headings below the page H1", () => {
    const html = renderToStaticMarkup(<PostBody markdown={"# Phần một\n\n## Phần hai"} />);
    expect(html).not.toContain("<h1");
    expect(html).toContain("<h2>Phần một</h2>");
  });

  it("renders GFM tables", () => {
    const html = renderToStaticMarkup(<PostBody markdown={"| Mẫu đơn | Lệ phí |\n|---|---|\n| N-400 | xem uscis.gov |"} />);
    expect(html).toContain("<table>");
    expect(html).toContain("<td>N-400</td>");
  });

  it("wraps tables so wide ones scroll sideways on phones", () => {
    const html = renderToStaticMarkup(<PostBody markdown={"| A | B |\n|---|---|\n| 1 | 2 |"} />);
    expect(html).toContain('<div class="my-8 overflow-x-auto"><table>');
  });

  it("opens external links safely and keeps internal links in-tab", () => {
    const html = renderToStaticMarkup(<PostBody markdown={"[USCIS](https://www.uscis.gov) [N400](/n400ready)"} />);
    expect(html).toContain('<a href="https://www.uscis.gov" target="_blank" rel="noopener noreferrer">USCIS</a>');
    expect(html).toContain('<a href="/n400ready">N400</a>');
  });
});
