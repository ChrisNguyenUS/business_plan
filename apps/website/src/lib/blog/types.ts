import type { Locale } from "@/lib/i18n/config";

export type FaqItem = { q: string; a: string };

/** One row of public.blog_posts (migration website_01). */
export interface BlogPostRow {
  id: string;
  slug_en: string | null;
  slug_vi: string | null;
  title_en: string | null;
  title_vi: string | null;
  excerpt_en: string | null;
  excerpt_vi: string | null;
  content_en: string | null;
  content_vi: string | null;
  faq_en: FaqItem[];
  faq_vi: FaqItem[];
  author_name: string;
  cover_image_url: string | null;
  category: string;
  post_type: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A post as one locale's page sees it. `slugs` lists every locale the post exists in. */
export interface LocalizedPost {
  id: string;
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  faq: FaqItem[];
  authorName: string;
  coverImageUrl: string | null;
  category: string;
  publishedAt: string;
  updatedAt: string;
  slugs: Partial<Record<Locale, string>>;
}
