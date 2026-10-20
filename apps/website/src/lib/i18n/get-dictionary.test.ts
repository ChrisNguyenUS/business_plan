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

// Prod site_content 'about' row stores English-only story/areas. They must not
// replace the Vietnamese copy on /vi/about.
describe("getDictionary about overrides", () => {
  beforeEach(() => {
    siteContentRows = [
      { section: "about", content: { story: "English story from the DB", areas: "Houston · English areas" } },
    ];
  });

  it("keeps vi.json story and areas on Vietnamese pages", async () => {
    const d = await getDictionary("vi");
    expect(d.about_story).toBe(viMessages.about_story);
    expect(d.about_areas).toBe(viMessages.about_areas);
  });

  it("still applies story and areas on English pages", async () => {
    const d = await getDictionary("en");
    expect(d.about_story).toBe("English story from the DB");
    expect(d.about_areas).toBe("Houston · English areas");
  });
});

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

// Prod site_content 'homepage' row: trust_badges and cta_text are single-language (English).
const homepageRow = {
  section: "homepage",
  content: {
    hero_headline_en: "English headline from the DB",
    hero_headline_vi: "Tiêu đề tiếng Việt từ DB",
    cta_text: "Book a Free Consultation",
    trust_badges: [{ id: "1", title: "IRS Authorized e-file Provider", desc: "English badge" }],
  },
};

describe("getDictionary homepage row", () => {
  beforeEach(() => {
    siteContentRows = [homepageRow];
  });

  it("keeps vi.json trust badges and CTA on Vietnamese pages", async () => {
    const d = await getDictionary("vi");
    expect(d.trust_badges).toBeUndefined();
    expect(d.hero_cta1).toBe(viMessages.hero_cta1);
    expect(d.hero_headline).toBe("Tiêu đề tiếng Việt từ DB");
  });

  it("applies the English trust badges and CTA on English pages", async () => {
    const d = await getDictionary("en");
    expect(d.trust_badges).toEqual(homepageRow.content.trust_badges);
    expect(d.hero_cta1).toBe("Book a Free Consultation");
    expect(d.hero_headline).toBe("English headline from the DB");
  });

  it("uses trust_badges_vi on Vietnamese pages when present", async () => {
    const vi = [{ id: "1", title: "Nhà cung cấp e-file được IRS ủy quyền", desc: "Thẻ tiếng Việt" }];
    siteContentRows = [{ section: "homepage", content: { ...homepageRow.content, trust_badges_vi: vi } }];
    expect((await getDictionary("vi")).trust_badges).toEqual(vi);
  });
});
