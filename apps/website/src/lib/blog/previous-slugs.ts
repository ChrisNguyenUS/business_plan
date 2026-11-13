import type { BlogPostRow } from "./types";

type Original = Pick<BlogPostRow, "slug_vi" | "slug_en" | "published" | "published_at"> & {
  previous_slugs?: string[] | null;
};

/**
 * previous_slugs after an edit (migration website_03). Once a post has been
 * public, every slug it gives up stays here, so old links still find the post
 * and redirect to its current slug. A slug that is current again is dropped.
 */
export function previousSlugsAfterEdit(
  original: Original,
  edited: { slug_vi?: string | null; slug_en?: string | null },
): string[] {
  const kept = new Set(original.previous_slugs ?? []);
  const wasPublic = original.published || !!original.published_at;
  if (wasPublic) {
    const pairs: [string | null, string | null | undefined][] = [
      [original.slug_vi, edited.slug_vi],
      [original.slug_en, edited.slug_en],
    ];
    for (const [before, after] of pairs) {
      if (before && before !== (after || null)) kept.add(before);
    }
  }
  for (const current of [edited.slug_vi, edited.slug_en]) {
    if (current) kept.delete(current);
  }
  return [...kept];
}
