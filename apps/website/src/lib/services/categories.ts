import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

export interface ServiceCategory {
  key: string;
  title: string;
  /** Short label for the navbar dropdown and footer. */
  navLabel: string;
  desc: string;
  img: string;
  href: string;
}

// The six top-level categories, in display order. Personal & Document Services
// is its own category with its own URL, never a child of Immigration.
export function serviceCategories(d: Dictionary, locale: Locale): ServiceCategory[] {
  const base = `/${locale}/services`;
  return [
    {
      key: "immigration",
      title: d.services_immigration_title,
      navLabel: d.services_immigration_nav,
      desc: d.services_immigration_desc,
      img: "/images/services/immigration.webp",
      href: `${base}/immigration`,
    },
    {
      key: "personal-documents",
      title: d.services_personal_title,
      navLabel: d.services_personal_nav,
      desc: d.services_personal_desc,
      img: "/images/services/personal-documents.webp",
      href: `${base}/personal-documents`,
    },
    {
      key: "tax",
      title: d.services_tax_title,
      navLabel: d.services_tax_nav,
      desc: d.services_tax_desc,
      img: "/images/services/tax.webp",
      href: `${base}/tax`,
    },
    {
      key: "business",
      title: d.services_business_title,
      navLabel: d.services_business_nav,
      desc: d.services_business_desc,
      img: "/images/services/business.webp",
      href: `${base}/business`,
    },
    {
      key: "insurance",
      title: d.services_insurance_title,
      navLabel: d.services_insurance_nav,
      desc: d.services_insurance_desc,
      img: "/images/services/insurance.webp",
      href: `${base}/insurance`,
    },
    {
      key: "ai",
      title: d.services_ai_title,
      navLabel: d.services_ai_nav,
      desc: d.services_ai_desc,
      img: "/images/services/ai.webp",
      href: `${base}/ai`,
    },
  ];
}
