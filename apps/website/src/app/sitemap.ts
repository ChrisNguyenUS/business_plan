import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

const locales = ["en", "vi"] as const;

// No lastModified: stamping the build time on every page tells crawlers that
// everything changed on each deploy, so they learn to ignore the field.
function urls(path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        en: `${SITE_URL}/en${path}`,
        vi: `${SITE_URL}/vi${path}`,
        "x-default": `${SITE_URL}/en${path}`,
      },
    },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...urls("", 1.0, "weekly"),
    ...urls("/services", 0.9, "monthly"),
    ...urls("/services/immigration", 0.9, "monthly"),
    ...urls("/services/immigration/eb3", 0.8, "monthly"),
    ...urls("/services/tax", 0.9, "monthly"),
    ...urls("/services/ai", 0.9, "monthly"),
    ...urls("/services/insurance", 0.9, "monthly"),
    ...urls("/about", 0.8, "monthly"),
    ...urls("/contact", 0.8, "weekly"),
    ...urls("/blog", 0.7, "weekly"),
    ...urls("/privacy-policy", 0.3, "yearly"),
    ...urls("/terms-of-service", 0.3, "yearly"),
  ];
}
