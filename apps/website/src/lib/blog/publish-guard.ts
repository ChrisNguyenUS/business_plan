import { isAllowedCoverUrl } from "./cover";
import { isValidSlug } from "./slugify";
import type { BlogPostRow } from "./types";

const filled = (s: string | null | undefined) => !!s && s.trim() !== "";

// The database checks the slug format and that a post has at least one slug;
// checking first turns its raw constraint errors into readable reasons.
function slugProblem(post: Partial<BlogPostRow>): string | null {
  for (const slug of [post.slug_vi, post.slug_en]) {
    if (filled(slug) && !isValidSlug(slug!)) {
      return `Slug "${slug}" không hợp lệ: chỉ chữ thường, số và dấu gạch ngang.`;
    }
  }
  return null;
}

function coverProblem(post: Partial<BlogPostRow>): string | null {
  return filled(post.cover_image_url) && !isAllowedCoverUrl(post.cover_image_url!)
    ? "Ảnh bìa phải là đường dẫn trong site (vd. /images/blog/ten-anh.webp) hoặc ảnh công khai trong Supabase Storage của dự án."
    : null;
}

/** Why this post can't be saved at all, even as a draft, or null when it can. */
export function saveBlocker(post: Partial<BlogPostRow>): string | null {
  const noSlug = !filled(post.slug_vi) && !filled(post.slug_en) ? "Cần ít nhất một slug (tiếng Việt hoặc tiếng Anh)." : null;
  return slugProblem(post) ?? noSlug ?? coverProblem(post);
}

/** Why this post can't be published yet, or null when it can. */
export function publishBlocker(post: Partial<BlogPostRow>): string | null {
  const langs = [
    { slug: post.slug_vi, title: post.title_vi, content: post.content_vi, excerpt: post.excerpt_vi },
    { slug: post.slug_en, title: post.title_en, content: post.content_en, excerpt: post.excerpt_en },
  ];
  const complete = langs.some((l) => filled(l.slug) && filled(l.title) && filled(l.content) && filled(l.excerpt));
  const incomplete = complete ? null : "Cần ít nhất một ngôn ngữ có đủ tiêu đề, slug, tóm tắt và nội dung.";
  return slugProblem(post) ?? incomplete ?? coverProblem(post);
}
