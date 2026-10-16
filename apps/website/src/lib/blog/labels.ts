import type { Locale } from "@/lib/i18n/config";

export const BLOG_LABELS = {
  vi: {
    indexTitle: "Bài viết: quốc tịch, di trú, thuế",
    indexDesc: "Hướng dẫn bằng tiếng Việt về thi quốc tịch Mỹ, đơn USCIS, thuế và bảo hiểm — có nguồn và ngày kiểm tra.",
    indexHeading: "Bài viết",
    indexSub: "Thông tin về quốc tịch, di trú, thuế và bảo hiểm, viết bằng tiếng Việt, có dẫn nguồn.",
    empty: "Chưa có bài viết.",
    home: "Trang chủ",
    blog: "Bài viết",
    published: "Đăng ngày",
    updated: "Cập nhật",
    by: "Tác giả",
    faq: "Câu hỏi thường gặp",
    ctaTitle: "Luyện thi quốc tịch miễn phí với N400 Ready",
    ctaBody: "Ôn 128 câu hỏi công dân, luyện nói và viết, thi thử như phỏng vấn thật — bằng tiếng Việt và tiếng Anh.",
    ctaApp: "Mở N400 Ready",
    ctaService: "Dịch vụ hồ sơ di trú",
    all: "Tất cả",
  },
  en: {
    indexTitle: "Articles: citizenship, immigration, tax",
    indexDesc: "Guides on the U.S. citizenship test, USCIS forms, tax and insurance — sourced and dated.",
    indexHeading: "Articles",
    indexSub: "Citizenship, immigration, tax and insurance, explained with sources.",
    empty: "No articles yet.",
    home: "Home",
    blog: "Articles",
    published: "Published",
    updated: "Updated",
    by: "By",
    faq: "Frequently asked questions",
    ctaTitle: "Practice for the citizenship test free with N400 Ready",
    ctaBody: "Study the 128 civics questions, practice speaking and writing, and take mock interviews — in English and Vietnamese.",
    ctaApp: "Open N400 Ready",
    ctaService: "Immigration document services",
    all: "All",
  },
} satisfies Record<Locale, Record<string, string>>;

export const CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  vi: { tax: "Thuế", insurance: "Bảo hiểm", immigration: "Di trú", ai: "AI", general: "Chung" },
  en: { tax: "Tax", insurance: "Insurance", immigration: "Immigration", ai: "AI", general: "General" },
};

export function formatPostDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}
