const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Thi quốc tịch Mỹ 2026" → "thi-quoc-tich-my-2026". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Same rule as the blog_posts slug CHECK constraints. */
export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}
