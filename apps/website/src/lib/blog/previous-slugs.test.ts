import { describe, expect, it } from "vitest";
import { previousSlugsAfterEdit } from "./previous-slugs";

const live = { slug_vi: "bai-cu", slug_en: "old-post", published: true, published_at: "2026-10-20T00:00:00Z", previous_slugs: [] };

describe("previousSlugsAfterEdit", () => {
  it("keeps the slug a public post gives up, so old links can redirect", () => {
    expect(previousSlugsAfterEdit(live, { slug_vi: "bai-moi", slug_en: "old-post" })).toEqual(["bai-cu"]);
  });

  it("keeps both languages' old slugs and the ones kept before", () => {
    expect(
      previousSlugsAfterEdit({ ...live, previous_slugs: ["rat-cu"] }, { slug_vi: "bai-moi", slug_en: "new-post" }),
    ).toEqual(["rat-cu", "bai-cu", "old-post"]);
  });

  it("also keeps it for a post that was public once and is a draft now", () => {
    expect(previousSlugsAfterEdit({ ...live, published: false }, { slug_vi: "bai-moi", slug_en: "old-post" })).toEqual(["bai-cu"]);
  });

  it("keeps nothing for a draft that was never public", () => {
    expect(
      previousSlugsAfterEdit({ ...live, published: false, published_at: null }, { slug_vi: "bai-moi", slug_en: "new-post" }),
    ).toEqual([]);
  });

  it("drops an old slug that becomes current again", () => {
    expect(previousSlugsAfterEdit({ ...live, slug_vi: "bai-moi", previous_slugs: ["bai-cu"] }, { slug_vi: "bai-cu", slug_en: "old-post" }))
      .toEqual(["bai-moi"]);
  });

  it("treats a removed slug as given up", () => {
    expect(previousSlugsAfterEdit(live, { slug_vi: null, slug_en: "old-post" })).toEqual(["bai-cu"]);
  });
});
