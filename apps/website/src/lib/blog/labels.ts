import type { Locale } from "@/lib/i18n/config";

export const BLOG_LABELS = {
  vi: {
    indexTitle: "Bài viết: quốc tịch, di trú, thuế",
    indexDesc: "Hướng dẫn bằng tiếng Việt về thi quốc tịch Mỹ, đơn USCIS, thuế và bảo hiểm — có nguồn và ngày kiểm tra.",
    indexHeading: "Bài viết",
    indexSub: "Thông tin về quốc tịch, di trú, thuế và bảo hiểm, viết bằng tiếng Việt, có dẫn nguồn.",
    empty: "Chưa có bài viết.",
    fallbackNote: "Các bài dưới đây hiện chỉ có bản tiếng Anh.",
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
    searchLabel: "Tìm bài viết",
    searchPlaceholder: "Tìm bài: thi quốc tịch, bảo lãnh cha mẹ, thẻ xanh…",
    clearSearch: "Xóa tìm kiếm",
    countAll: "{total} bài viết",
    countSome: "{shown}/{total} bài viết",
    noResults: "Không tìm thấy bài phù hợp.",
    popularTags: "Chủ đề nhiều bài:",
    askZalo: "Hỏi Manna qua Zalo",
    tagsLabel: "Hashtag",
    tagTitleSuffix: "bài viết",
    relatedTags: "Chủ đề liên quan",
  },
  en: {
    indexTitle: "Articles: citizenship, immigration, tax",
    indexDesc: "Guides on the U.S. citizenship test, USCIS forms, tax and insurance — sourced and dated.",
    indexHeading: "Articles",
    indexSub: "Citizenship, immigration, tax and insurance, explained with sources.",
    empty: "No articles yet.",
    fallbackNote: "Our articles are in Vietnamese for now — English versions are coming.",
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
    searchLabel: "Search articles",
    searchPlaceholder: "Search: citizenship test, sponsoring parents, green card…",
    clearSearch: "Clear search",
    countAll: "{total} articles",
    countSome: "{shown} of {total} articles",
    noResults: "No matching articles.",
    popularTags: "Popular topics:",
    askZalo: "Ask Manna on Zalo",
    tagsLabel: "Hashtags",
    tagTitleSuffix: "articles",
    relatedTags: "Related topics",
  },
} satisfies Record<Locale, Record<string, string>>;

/** Big topics shown as filter buttons, in display order. "general" is a fallback, never a filter. */
export const CATEGORY_ORDER = ["immigration", "business", "tax", "insurance", "ai", "documents"] as const;

export const CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  vi: {
    immigration: "Di trú Mỹ", business: "Business", tax: "Thuế", insurance: "Bảo hiểm",
    ai: "AI", documents: "Giấy tờ ở Mỹ", general: "Chung",
  },
  en: {
    immigration: "U.S. immigration", business: "Business", tax: "Tax", insurance: "Insurance",
    ai: "AI", documents: "U.S. paperwork", general: "General",
  },
};

export function formatPostDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}
