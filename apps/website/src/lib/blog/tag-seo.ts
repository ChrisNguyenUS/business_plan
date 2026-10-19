import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo/site";
import { BLOG_LABELS } from "./labels";
import { blogPostPath } from "./post-locale";
import { languageAlternates } from "./post-seo";
import { tagPath, type BlogTag } from "./tags";
import type { LocalizedPost } from "./types";

export function tagPagePaths(tag: BlogTag, localesWithPosts: readonly Locale[]): Partial<Record<Locale, string>> {
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of localesWithPosts) paths[l] = tagPath(l, tag.key);
  return paths;
}

export function tagMetadata(tag: BlogTag, locale: Locale, localesWithPosts: readonly Locale[]): Metadata {
  const path = tagPath(locale, tag.key);
  const title = `${tag.label[locale]}: ${BLOG_LABELS[locale].tagTitleSuffix}`;
  const description = tag.description[locale];
  return {
    title,
    description,
    alternates: { canonical: path, languages: languageAlternates(tagPagePaths(tag, localesWithPosts)) },
    openGraph: { type: "website", siteName: "Manna One Solution", url: path, title, description },
  };
}

export function tagJsonLd(tag: BlogTag, locale: Locale, posts: LocalizedPost[]) {
  const url = `${SITE_URL}${tagPath(locale, tag.key)}`;
  const t = BLOG_LABELS[locale];
  const name = `#${tag.label[locale]}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name,
        description: tag.description[locale],
        inLanguage: locale,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@type": "Thing", name: tag.label[locale] },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: posts.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}${blogPostPath(p.locale, p.slug)}`,
            name: p.title,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.home, item: `${SITE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: t.blog, item: `${SITE_URL}/${locale}/blog` },
          { "@type": "ListItem", position: 3, name, item: url },
        ],
      },
    ],
  };
}
