import { beforeEach, describe, expect, it, vi } from "vitest";
import viMessages from "@/messages/vi.json";

vi.mock("server-only", () => ({}));

let siteContentRows: { section: string; content: unknown }[] = [];

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: async () => ({ data: siteContentRows }),
    }),
  },
}));

const { getDictionary } = await import("./get-dictionary");

// Prod site_content 'services' row stores single-language (English) *_desc
// keys. They must not leak onto Vietnamese pages.
const legacyServicesRow = {
  section: "services",
  content: {
    tax_desc: "English tax intro from the DB",
    insurance_desc: "English insurance intro from the DB",
    immigration_desc: "English immigration intro from the DB",
    ai_desc: "English AI intro from the DB",
  },
};

describe("getDictionary service descriptions", () => {
  beforeEach(() => {
    siteContentRows = [legacyServicesRow];
  });

  it("keeps vi.json descriptions on Vietnamese pages despite legacy English *_desc", async () => {
    const d = await getDictionary("vi");
    expect(d.tax_desc).toBe(viMessages.tax_desc);
    expect(d.insurance_desc).toBe(viMessages.insurance_desc);
    expect(d.immigration_desc).toBe(viMessages.immigration_desc);
    expect(d.ai_desc).toBe(viMessages.ai_desc);
  });

  it("still applies legacy *_desc overrides on English pages", async () => {
    const d = await getDictionary("en");
    expect(d.tax_desc).toBe("English tax intro from the DB");
    expect(d.ai_desc).toBe("English AI intro from the DB");
  });

  it("prefers a localized service_content detail_intro for Vietnamese", async () => {
    siteContentRows = [
      {
        section: "services",
        content: {
          ...legacyServicesRow.content,
          service_content: { tax: { detail_intro: { description: { vi: "Giới thiệu thuế từ DB" } } } },
        },
      },
    ];
    const d = await getDictionary("vi");
    expect(d.tax_desc).toBe("Giới thiệu thuế từ DB");
    expect(d.insurance_desc).toBe(viMessages.insurance_desc);
  });

  it("localizes immigration_offerings names with an optional name_vi, per locale", async () => {
    siteContentRows = [
      {
        section: "services",
        content: {
          immigration_offerings: [
            { id: "1", name: "N-400 Citizenship Filing Application", name_vi: "Hồ sơ Quốc tịch N-400" },
            { id: "2", name: "Green Card Filing Applications" }, // no vi translation yet
          ],
        },
      },
    ];

    const vi = await getDictionary("vi");
    expect(vi.immigration_offerings).toEqual([
      { id: "1", name: "Hồ sơ Quốc tịch N-400" },
      { id: "2", name: "Green Card Filing Applications" }, // falls back to English
    ]);

    const en = await getDictionary("en");
    expect(en.immigration_offerings).toEqual([
      { id: "1", name: "N-400 Citizenship Filing Application" },
      { id: "2", name: "Green Card Filing Applications" },
    ]);
  });
});
