import type { MetadataRoute } from "next";

const BASE = "https://mannaos.com";
const locales = ["en", "vi"] as const;

function urls(path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: `${BASE}/${locale}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: { languages: { en: `${BASE}/en${path}`, vi: `${BASE}/vi${path}` } },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...urls("", 1.0, "weekly"),
    ...urls("/services", 0.9, "monthly"),
    ...urls("/services/immigration", 0.9, "monthly"),
    ...urls("/services/tax", 0.9, "monthly"),
    ...urls("/services/insurance", 0.9, "monthly"),
    ...urls("/services/ai", 0.9, "monthly"),
    ...urls("/about", 0.8, "monthly"),
    ...urls("/contact", 0.8, "weekly"),
    ...urls("/blog", 0.7, "weekly"),
    ...urls("/privacy-policy", 0.3, "yearly"),
    ...urls("/terms-of-service", 0.3, "yearly"),
  ];
}
