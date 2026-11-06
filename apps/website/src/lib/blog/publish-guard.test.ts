import { describe, expect, it } from "vitest";
import { publishBlocker, saveBlocker } from "./publish-guard";

const viComplete = { title_vi: "Đơn N-400", slug_vi: "don-n-400", content_vi: "Nội dung", excerpt_vi: "Tóm tắt" };

describe("publishBlocker", () => {
  it("allows publishing when one language is complete", () => {
    expect(publishBlocker(viComplete)).toBeNull();
  });

  it("blocks when no language has title, slug, content and excerpt", () => {
    expect(publishBlocker({ ...viComplete, excerpt_vi: "" })).toMatch(/ít nhất một ngôn ngữ/);
    expect(publishBlocker({})).toMatch(/ít nhất một ngôn ngữ/);
  });

  it("blocks a slug the database would reject", () => {
    expect(publishBlocker({ ...viComplete, slug_vi: "Don N-400" })).toMatch(/slug/i);
  });
});

describe("saveBlocker", () => {
  it("lets an unfinished draft be saved", () => {
    expect(saveBlocker({ slug_vi: "nhap", title_vi: "Nháp" })).toBeNull();
  });

  it("explains a slug the database would reject instead of showing the raw error", () => {
    expect(saveBlocker({ slug_vi: "Bài Mới" })).toMatch(/Slug "Bài Mới" không hợp lệ/);
  });

  it("asks for at least one slug, which the database requires", () => {
    expect(saveBlocker({ title_vi: "Nháp", slug_vi: "", slug_en: " " })).toMatch(/ít nhất một slug/);
  });

  it("rejects a cover image that next/image cannot load", () => {
    expect(saveBlocker({ slug_vi: "nhap", cover_image_url: "https://example.com/a.jpg" })).toMatch(/Ảnh bìa/);
    expect(saveBlocker({ slug_vi: "nhap", cover_image_url: "/images/blog/a.webp" })).toBeNull();
  });
});

describe("publishBlocker and the cover", () => {
  it("also blocks publishing with a cover next/image cannot load", () => {
    expect(publishBlocker({ ...viComplete, cover_image_url: "https://example.com/a.jpg" })).toMatch(/Ảnh bìa/);
  });
});
