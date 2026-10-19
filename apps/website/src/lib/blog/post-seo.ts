import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { ORGANIZATION_ID } from "@/lib/seo/json-ld";
import { SITE_URL } from "@/lib/seo/site";
import { blogPostPath } from "./post-locale";
import type { LocalizedPost } from "./types";

export const ORG_AUTHOR = "Manna One Solution";
const OG_FALLBACK = "/images/og-image.png";

const CRUMBS: Record<Locale, { home: string; blog: string }> = {
  vi: { home: "Trang chủ", blog: "Bài viết" },
  en: { home: "Home", blog: "Articles" },
};

/** hreflang map for the locales that exist; x-default = English if present, else Vietnamese. */
// Covers may be stored site-relative ("/images/blog/x.webp"); schema.org needs absolute URLs.
const absoluteUrl = (url: string) => (url.startsWith("/") ? `${SITE_URL}${url}` : url);

export function languageAlternates(paths: Partial<Record<Locale, string>>): Record<string, string> {
  const languages: Record<string, string> = {};
  if (paths.en) languages.en = paths.en;
  if (paths.vi) languages.vi = paths.vi;
  const fallback = paths.en ?? paths.vi;
  if (fallback) languages["x-default"] = fallback;
  return languages;
}

function postPaths(post: LocalizedPost): Partial<Record<Locale, string>> {
  const paths: Partial<Record<Locale, string>> = {};
  for (const [locale, slug] of Object.entries(post.slugs) as [Locale, string][]) {
    paths[locale] = blogPostPath(locale, slug);
  }
  return paths;
}

export function postMetadata(post: LocalizedPost): Metadata {
  const path = blogPostPath(post.locale, post.slug);
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: path, languages: languageAlternates(postPaths(post)) },
    openGraph: {
      type: "article",
      siteName: "Manna One Solution",
      url: path,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [post.coverImageUrl ?? OG_FALLBACK],
    },
    twitter: { card: "summary_large_image", images: [post.coverImageUrl ?? OG_FALLBACK] },
  };
}

export function postJsonLd(post: LocalizedPost) {
  const url = `${SITE_URL}${blogPostPath(post.locale, post.slug)}`;
  const crumbs = CRUMBS[post.locale];
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: post.authorName === ORG_AUTHOR ? { "@id": ORGANIZATION_ID } : { "@type": "Person", name: post.authorName },
      publisher: { "@id": ORGANIZATION_ID },
      inLanguage: post.locale,
      mainEntityOfPage: url,
      url,
      image: absoluteUrl(post.coverImageUrl ?? OG_FALLBACK),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: crumbs.home, item: `${SITE_URL}/${post.locale}` },
        { "@type": "ListItem", position: 2, name: crumbs.blog, item: `${SITE_URL}/${post.locale}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
  if (post.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: post.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function blogIndexMetadata(locale: Locale, localesWithPosts: Locale[]): Pick<Metadata, "alternates" | "robots"> {
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of localesWithPosts) paths[l] = `/${l}/blog`;
  const meta: Pick<Metadata, "alternates" | "robots"> = {
    alternates: { canonical: `/${locale}/blog`, languages: languageAlternates(paths) },
  };
  if (!localesWithPosts.includes(locale)) meta.robots = { index: false, follow: true };
  return meta;
}
