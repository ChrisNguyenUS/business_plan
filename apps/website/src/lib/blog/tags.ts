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
  {
    key: "eb3",
    category: "immigration",
    slug: { vi: "eb3", en: "eb3" },
    label: { vi: "EB-3", en: "EB-3" },
    description: {
      vi: "Định cư Mỹ diện EB-3 lao động phổ thông: điều kiện, PERM và I-140, thời gian chờ theo Visa Bulletin, chi phí và cách tránh lừa đảo.",
      en: "EB-3 Other Workers green cards: eligibility, PERM and Form I-140, Visa Bulletin wait times, costs, and how to avoid scams.",
    },
  },
  {
    key: "immigration-scams",
    category: "immigration",
    slug: { vi: "lua-dao-di-tru", en: "immigration-scams" },
    label: { vi: "Lừa đảo di trú", en: "Immigration scams" },
    description: {
      vi: "Dấu hiệu lừa đảo di trú theo cảnh báo của USCIS và FTC, cách kiểm tra bên hỗ trợ hồ sơ và nơi báo cáo.",
      en: "Immigration scam warning signs from USCIS and the FTC, how to check who is helping with your case, and where to report.",
    },
  },
  {
    key: "form-llc",
    category: "business",
    slug: { vi: "mo-llc", en: "form-llc" },
    label: { vi: "Mở LLC", en: "Forming an LLC" },
    description: {
      vi: "Mở LLC ở Mỹ: các bước nộp hồ sơ với bang, registered agent, EIN, Company Agreement và tài khoản ngân hàng.",
      en: "Forming an LLC in the U.S.: state filing steps, registered agents, the EIN, the Company Agreement and the bank account.",
    },
  },
  {
    key: "texas-business",
    category: "business",
    slug: { vi: "kinh-doanh-o-texas", en: "texas-business" },
    label: { vi: "Kinh doanh ở Texas", en: "Texas business" },
    description: {
      vi: "Lập và duy trì doanh nghiệp ở Texas: Form 205, lệ phí bang, franchise tax, Public Information Report và sales tax permit.",
      en: "Starting and keeping a business in Texas: Form 205, state fees, franchise tax, the Public Information Report and sales tax permits.",
    },
  },
  {
    key: "business-taxes",
    category: "business",
    slug: { vi: "thue-doanh-nghiep", en: "business-taxes" },
    label: { vi: "Thuế doanh nghiệp", en: "Business taxes" },
    description: {
      vi: "Thuế và báo cáo của doanh nghiệp nhỏ: EIN, cách IRS đánh thuế LLC, franchise tax Texas và Form 5472 cho chủ nước ngoài.",
      en: "Small business taxes and filings: the EIN, how the IRS taxes LLCs, Texas franchise tax, and Form 5472 for foreign owners.",
    },
  },
  {
    key: "business-banking",
    category: "business",
    slug: { vi: "ngan-hang-doanh-nghiep", en: "business-banking" },
    label: { vi: "Ngân hàng doanh nghiệp", en: "Business banking" },
    description: {
      vi: "Mở tài khoản ngân hàng cho LLC: giấy tờ cần mang, quy định xác minh chủ sở hữu và lưu ý khi chủ ở Việt Nam.",
      en: "Opening a bank account for an LLC: the documents to bring, ownership verification rules, and notes for owners in Vietnam.",
    },
  },
  {
    key: "business-website",
    category: "business",
    slug: { vi: "website-doanh-nghiep", en: "business-websites" },
    label: { vi: "Website doanh nghiệp", en: "Business websites" },
    description: {
      vi: "Website, email theo tên miền và Google Business Profile cho doanh nghiệp nhỏ, làm đúng quy định của Google.",
      en: "Websites, branded email and Google Business Profile for small businesses, set up within Google's rules.",
    },
  },
  {
    key: "us-company-from-vietnam",
    category: "business",
    slug: { vi: "mo-cong-ty-tu-viet-nam", en: "us-company-from-vietnam" },
    label: { vi: "Mở công ty từ Việt Nam", en: "U.S. company from Vietnam" },
    description: {
      vi: "Người ở Việt Nam mở công ty ở Mỹ: EIN không cần SSN, ngân hàng, Form 5472 và những gì công ty không làm được về visa.",
      en: "Forming a U.S. company while living in Vietnam: an EIN without an SSN, banking, Form 5472, and what a company can't do for a visa.",
    },
  },
  {
    key: "income-tax-filing",
    category: "tax",
    slug: { vi: "khai-thue", en: "filing-taxes" },
    label: { vi: "Khai thuế", en: "Filing taxes" },
    description: {
      vi: "Khai thuế thu nhập liên bang cho cá nhân và gia đình: hạn nộp, giấy tờ, khấu trừ mới và khai thuế lần đầu ở Mỹ.",
      en: "Filing your federal income tax return: deadlines, documents, new deductions, and your first U.S. tax return.",
    },
  },
  {
    key: "foreign-accounts",
    category: "tax",
    slug: { vi: "tai-khoan-nuoc-ngoai", en: "foreign-accounts" },
    label: { vi: "Tài khoản ở nước ngoài", en: "Foreign accounts" },
    description: {
      vi: "Báo cáo tài khoản ngân hàng ở nước ngoài với Mỹ: FBAR, Form 8938 (FATCA), ngưỡng, hạn nộp và mức phạt.",
      en: "Reporting foreign bank accounts to the U.S.: FBAR, Form 8938 (FATCA), thresholds, deadlines and penalties.",
    },
  },
  {
    key: "money-to-vietnam",
    category: "tax",
    slug: { vi: "gui-tien-ve-viet-nam", en: "money-to-vietnam" },
    label: { vi: "Gửi tiền về Việt Nam", en: "Money to Vietnam" },
    description: {
      vi: "Gửi và nhận tiền giữa Mỹ và Việt Nam: thuế quà tặng Form 709, Form 3520 cho quà từ nước ngoài và thu nhập từ Việt Nam.",
      en: "Sending and receiving money between the U.S. and Vietnam: gift tax Form 709, Form 3520 for foreign gifts, and Vietnam income.",
    },
  },
  {
    key: "self-employed-taxes",
    category: "tax",
    slug: { vi: "thue-tu-doanh", en: "self-employed-taxes" },
    label: { vi: "Thuế tự doanh", en: "Self-employed taxes" },
    description: {
      vi: "Thuế cho người tự doanh và chủ LLC: self-employment tax, thuế ước tính hằng quý, Form 1099 và sales tax Texas.",
      en: "Taxes for the self-employed and LLC owners: self-employment tax, quarterly estimated tax, Form 1099 and Texas sales tax.",
    },
  },
  {
    key: "ssn-and-id",
    category: "documents",
    slug: { vi: "ssn-giay-to-tuy-than", en: "ssn-and-id" },
    label: { vi: "SSN và giấy tờ tùy thân", en: "SSN and ID" },
    description: {
      vi: "Thẻ Social Security, REAL ID, bằng lái xe và đổi tên trên giấy tờ sau kết hôn hoặc ly hôn.",
      en: "Social Security cards, REAL ID, driver's licenses and changing your name on your documents after marriage or divorce.",
    },
  },
  {
    key: "birth-and-newborn",
    category: "documents",
    slug: { vi: "khai-sinh-sinh-con", en: "birth-and-newborn" },
    label: { vi: "Khai sinh và sinh con", en: "Birth and newborns" },
    description: {
      vi: "Giấy khai sinh ở Mỹ, SSN và bảo hiểm sức khỏe cho em bé mới sinh.",
      en: "U.S. birth certificates, your baby's SSN and health coverage for a newborn.",
    },
  },
  {
    key: "passport",
    category: "documents",
    slug: { vi: "ho-chieu", en: "passport" },
    label: { vi: "Hộ chiếu Mỹ", en: "U.S. passport" },
    description: {
      vi: "Làm hộ chiếu Mỹ lần đầu cho người lớn và trẻ em: giấy tờ, lệ phí và thời gian chờ.",
      en: "Getting a first U.S. passport for adults and children: documents, fees and wait times.",
    },
  },
  {
    key: "banking-and-credit",
    category: "documents",
    slug: { vi: "ngan-hang-tin-dung", en: "banking-and-credit" },
    label: { vi: "Ngân hàng và tín dụng", en: "Banking and credit" },
    description: {
      vi: "Mở tài khoản ngân hàng cá nhân và xây dựng điểm tín dụng khi mới sang Mỹ.",
      en: "Opening a personal bank account and building a credit score when you are new to the U.S.",
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
