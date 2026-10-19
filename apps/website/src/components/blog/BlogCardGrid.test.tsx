import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlogCardGrid, toBlogCard } from "./BlogCardGrid";
import type { LocalizedPost } from "@/lib/blog/types";

const post: LocalizedPost = {
  id: "p1", locale: "vi", slug: "gia-han-the-xanh", title: "Gia hạn thẻ xanh", excerpt: "Tóm tắt",
  content: "x", faq: [], authorName: "Manna One Solution", coverImageUrl: null, category: "immigration",
  tags: ["green-card"], publishedAt: "2026-10-19T19:43:00Z", updatedAt: "2026-10-19T20:00:00Z", slugs: { vi: "gia-han-the-xanh" },
};

describe("BlogCardGrid", () => {
  it("maps a post to a card linking to its own locale", () => {
    const card = toBlogCard(post, "vi");
    expect(card).toMatchObject({ id: "p1", href: "/vi/blog/gia-han-the-xanh", tags: ["green-card"], category: "immigration" });
    expect(card.dateLabel).toContain("2026");
  });

  it("renders every card with its category label", () => {
    const html = renderToStaticMarkup(<BlogCardGrid cards={[toBlogCard(post, "vi")]} categoryLabels={{ immigration: "Di trú Mỹ" }} />);
    expect(html).toContain('href="/vi/blog/gia-han-the-xanh"');
    expect(html).toContain("Di trú Mỹ");
    expect(html).toContain("Gia hạn thẻ xanh");
  });
});
