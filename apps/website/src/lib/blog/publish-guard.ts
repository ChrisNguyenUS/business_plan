import { isValidSlug } from "./slugify";
import type { BlogPostRow } from "./types";

const filled = (s: string | null | undefined) => !!s && s.trim() !== "";

/** Why this post can't be published yet, or null when it can. */
export function publishBlocker(post: Partial<BlogPostRow>): string | null {
  const langs = [
    { slug: post.slug_vi, title: post.title_vi, content: post.content_vi, excerpt: post.excerpt_vi },
    { slug: post.slug_en, title: post.title_en, content: post.content_en, excerpt: post.excerpt_en },
  ];
  for (const l of langs) {
    if (filled(l.slug) && !isValidSlug(l.slug!)) {
      return `Slug "${l.slug}" không hợp lệ: chỉ chữ thường, số và dấu gạch ngang.`;
    }
  }
  const complete = langs.some((l) => filled(l.slug) && filled(l.title) && filled(l.content) && filled(l.excerpt));
  return complete ? null : "Cần ít nhất một ngôn ngữ có đủ tiêu đề, slug, tóm tắt và nội dung.";
}
