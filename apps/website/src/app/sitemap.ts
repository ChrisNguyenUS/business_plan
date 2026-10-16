import type { MetadataRoute } from "next";
import type { Locale } from "@/lib/i18n/config";
import { listPublishedPosts } from "@/lib/blog/queries";
import { blogPostPath, postSlugs } from "@/lib/blog/post-locale";
import { languageAlternates } from "@/lib/blog/post-seo";
import type { BlogPostRow } from "@/lib/blog/types";
import { SITE_URL } from "@/lib/seo/site";

const locales = ["en", "vi"] as const;

// No lastModified on static pages: stamping the build time on every page tells
// crawlers that everything changed on each deploy, so they learn to ignore it.
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

function absoluteAlternates(paths: Partial<Record<Locale, string>>) {
  const absolute: Partial<Record<Locale, string>> = {};
  for (const [locale, path] of Object.entries(paths) as [Locale, string][]) absolute[locale] = `${SITE_URL}${path}`;
  return languageAlternates(absolute);
}

// A DB outage must not take the sitemap down: fall back to the static pages.
async function publishedPosts(): Promise<BlogPostRow[]> {
  try {
    return await listPublishedPosts();
  } catch (error) {
    console.error(`sitemap: blog posts unavailable — ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await publishedPosts();

  // A locale's blog index is listed only when it has posts (empty ones are noindex).
  const withPosts = locales.filter((l) => posts.some((p) => postSlugs(p)[l]));
  const indexPaths: Partial<Record<Locale, string>> = {};
  for (const l of withPosts) indexPaths[l] = `/${l}/blog`;
  const blogIndex: MetadataRoute.Sitemap = withPosts.map((l) => ({
    url: `${SITE_URL}/${l}/blog`,
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: { languages: absoluteAlternates(indexPaths) },
  }));

  const postEntries: MetadataRoute.Sitemap = posts.flatMap((post) => {
    const paths: Partial<Record<Locale, string>> = {};
    for (const [l, slug] of Object.entries(postSlugs(post)) as [Locale, string][]) paths[l] = blogPostPath(l, slug);
    return Object.values(paths).map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: new Date(post.updated_at),
      alternates: { languages: absoluteAlternates(paths) },
    }));
  });

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
    ...blogIndex,
    ...postEntries,
    ...urls("/privacy-policy", 0.3, "yearly"),
    ...urls("/terms-of-service", 0.3, "yearly"),
  ];
}
