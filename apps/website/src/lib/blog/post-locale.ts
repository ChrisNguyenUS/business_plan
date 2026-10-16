import { locales, type Locale } from "@/lib/i18n/config";
import type { BlogPostRow, FaqItem, LocalizedPost } from "./types";

function fieldsFor(post: BlogPostRow, locale: Locale) {
  return locale === "vi"
    ? { slug: post.slug_vi, title: post.title_vi, excerpt: post.excerpt_vi, content: post.content_vi, faq: post.faq_vi }
    : { slug: post.slug_en, title: post.title_en, excerpt: post.excerpt_en, content: post.content_en, faq: post.faq_en };
}

const filled = (s: string | null) => !!s && s.trim() !== "";

export function blogPostPath(locale: Locale, slug: string): string {
  return `/${locale}/blog/${slug}`;
}

/** Locales whose slug, title and content are all filled in — the post "exists" there. */
export function postSlugs(post: BlogPostRow): Partial<Record<Locale, string>> {
  const slugs: Partial<Record<Locale, string>> = {};
  for (const locale of locales) {
    const f = fieldsFor(post, locale);
    if (filled(f.slug) && filled(f.title) && filled(f.content)) slugs[locale] = f.slug!;
  }
  return slugs;
}

export function localizePost(post: BlogPostRow, locale: Locale): LocalizedPost | null {
  const slugs = postSlugs(post);
  const slug = slugs[locale];
  if (!slug) return null;
  const f = fieldsFor(post, locale);
  return {
    id: post.id,
    locale,
    slug,
    title: f.title!,
    excerpt: f.excerpt ?? "",
    content: f.content!,
    faq: (f.faq ?? []) as FaqItem[],
    authorName: post.author_name,
    coverImageUrl: post.cover_image_url,
    category: post.category,
    publishedAt: post.published_at ?? post.created_at,
    updatedAt: post.updated_at,
    slugs,
  };
}

export type PostRoute =
  | { kind: "render"; post: LocalizedPost }
  | { kind: "redirect"; to: string }
  | { kind: "not-found" };

/** `candidates` = published rows whose slug_en or slug_vi equals `slug`. */
export function resolvePostRoute(candidates: BlogPostRow[], locale: Locale, slug: string): PostRoute {
  const own = candidates.find((p) => postSlugs(p)[locale] === slug);
  if (own) return { kind: "render", post: localizePost(own, locale)! };
  for (const p of candidates) {
    const target = postSlugs(p)[locale];
    if (target) return { kind: "redirect", to: blogPostPath(locale, target) };
  }
  return { kind: "not-found" };
}
