import type { Locale } from "@/lib/i18n/config";

/** One hashtag. `key` is stored in blog_posts.tags and never changes; slugs and labels may. */
export interface BlogTag {
  key: string;
  category: string;
  slug: Record<Locale, string>;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
}

// Fixed list (owner decision 2026-10-19): new hashtags are a code change, the admin only ticks them.
export const BLOG_TAGS: readonly BlogTag[] = [
  {
    key: "citizenship-test",
    category: "immigration",
    slug: { vi: "thi-quoc-tich", en: "citizenship-test" },
    label: { vi: "Thi quốc tịch", en: "Citizenship test" },
    description: {
      vi: "Bài viết về bài thi quốc tịch Mỹ: 128 câu hỏi công dân, thi tiếng Anh, tỷ lệ đậu và cách ôn, theo hướng dẫn của USCIS.",
      en: "Articles on the U.S. citizenship test: the 128 civics questions, the English test, pass rates and how to study, from USCIS guidance.",
    },
  },
  {
    key: "form-n-400",
    category: "immigration",
    slug: { vi: "don-n-400", en: "form-n-400" },
    label: { vi: "Đơn N-400", en: "Form N-400" },
    description: {
      vi: "Đơn N-400 xin nhập quốc tịch Mỹ: điều kiện, lệ phí, các phần của đơn và các câu hỏi Yes/No.",
      en: "Form N-400, the application for U.S. citizenship: eligibility, fees, the parts of the form and the Yes/No questions.",
    },
  },
  {
    key: "green-card",
    category: "immigration",
    slug: { vi: "the-xanh", en: "green-card" },
    label: { vi: "Thẻ xanh", en: "Green card" },
    description: {
      vi: "Thẻ xanh Mỹ: gia hạn bằng I-90, thẻ 2 năm lên 10 năm, mất thẻ và đi nước ngoài bao lâu thì an toàn.",
      en: "U.S. green cards: renewing with Form I-90, 2-year to 10-year cards, lost cards, and how long you can stay abroad.",
    },
  },
  {
    key: "sponsor-spouse",
    category: "immigration",
    slug: { vi: "bao-lanh-vo-chong", en: "sponsor-spouse" },
    label: { vi: "Bảo lãnh vợ chồng", en: "Sponsoring a spouse" },
    description: {
      vi: "Bảo lãnh vợ chồng sang Mỹ: ai được bảo lãnh, Form I-130, thời gian chờ, lệ phí và thẻ xanh 2 năm.",
      en: "Sponsoring a husband or wife for a green card: who qualifies, Form I-130, wait times, fees and the 2-year card.",
    },
  },
  {
    key: "sponsor-parents",
    category: "immigration",
    slug: { vi: "bao-lanh-cha-me", en: "sponsor-parents" },
    label: { vi: "Bảo lãnh cha mẹ", en: "Sponsoring parents" },
    description: {
      vi: "Bảo lãnh cha mẹ sang Mỹ: điều kiện người bảo lãnh, Form I-130 và I-864, lệ phí và các bước tại NVC.",
      en: "Sponsoring your parents for a green card: who can file, Forms I-130 and I-864, fees and the NVC steps.",
    },
  },
  {
    key: "family-petitions",
    category: "immigration",
    slug: { vi: "bao-lanh-gia-dinh", en: "family-petitions" },
    label: { vi: "Bảo lãnh gia đình", en: "Family petitions" },
    description: {
      vi: "Bảo lãnh người thân sang Mỹ theo diện gia đình: vợ chồng, cha mẹ, hồ sơ I-130 và thời gian chờ visa.",
      en: "Family-based green card petitions: spouses, parents, Form I-130 and visa wait times.",
    },
  },
  {
    key: "uscis-fees",
    category: "immigration",
    slug: { vi: "le-phi-uscis", en: "uscis-fees" },
    label: { vi: "Lệ phí USCIS", en: "USCIS fees" },
    description: {
      vi: "Lệ phí USCIS cho các đơn N-400, I-90, I-751, I-130 và hơn nữa, theo bảng phí G-1055, có ghi ngày kiểm tra.",
      en: "USCIS filing fees for Forms N-400, I-90, I-751, I-130 and more, from the G-1055 fee schedule with the date checked.",
    },
  },
  {
    key: "older-applicants",
    category: "immigration",
    slug: { vi: "nguoi-lon-tuoi", en: "older-applicants" },
    label: { vi: "Người lớn tuổi", en: "Older applicants" },
    description: {
      vi: "Thi quốc tịch cho người lớn tuổi: diện 65/20, 50/20, 55/15, thi bằng tiếng Việt và 20 câu hỏi đặc biệt.",
      en: "The citizenship test for older applicants: the 65/20, 50/20 and 55/15 exemptions, testing in your language, and the 20 questions.",
    },
  },
  {
    key: "travel-abroad",
    category: "immigration",
    slug: { vi: "di-lai-nuoc-ngoai", en: "travel-abroad" },
    label: { vi: "Đi lại nước ngoài", en: "Travel abroad" },
    description: {
      vi: "Đi nước ngoài khi có thẻ xanh: ở bao lâu thì an toàn, giấy phép tái nhập cảnh, mất thẻ ở nước ngoài.",
      en: "Traveling abroad with a green card: how long you can stay, reentry permits, and what to do if you lose your card.",
    },
  },
];

/** URL segment between /blog/ and the hashtag slug. */
export const TAG_SEGMENT: Record<Locale, string> = { vi: "chu-de", en: "topics" };

const BY_KEY = new Map(BLOG_TAGS.map((t) => [t.key, t]));

export function tagByKey(key: string): BlogTag | null {
  return BY_KEY.get(key) ?? null;
}

/** A post's hashtags in registry order; unknown keys are ignored. */
export function tagsForPost(keys: readonly string[]): BlogTag[] {
  return BLOG_TAGS.filter((t) => keys.includes(t.key));
}

export function tagBySlug(locale: Locale, slug: string): BlogTag | null {
  return BLOG_TAGS.find((t) => t.slug[locale] === slug) ?? null;
}

export function tagPath(locale: Locale, key: string): string {
  const tag = BY_KEY.get(key);
  if (!tag) throw new Error(`unknown blog tag: ${key}`);
  return `/${locale}/blog/${TAG_SEGMENT[locale]}/${tag.slug[locale]}`;
}

export function tagsInCategory(category: string): BlogTag[] {
  return BLOG_TAGS.filter((t) => t.category === category);
}

/** Admin: when a post's category changes, keep only the hashtags that belong to the new one. */
export function keepTagsForCategory(keys: readonly string[], category: string): string[] {
  return keys.filter((k) => BY_KEY.get(k)?.category === category);
}
