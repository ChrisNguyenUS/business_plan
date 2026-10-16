import { describe, expect, it } from "vitest";
import { publishBlocker } from "./publish-guard";

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
