import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { localesWithTag, postsForTag } from "./post-locale";
import { listPublishedPosts } from "./queries";
import { tagBySlug, type BlogTag } from "./tags";
import type { BlogPostRow, LocalizedPost } from "./types";

export interface TagPageData {
  locale: Locale;
  tag: BlogTag;
  posts: LocalizedPost[];
  localesWithPosts: Locale[];
  rows: BlogPostRow[];
}

/** Data for /vi/blog/chu-de/<slug> or /en/blog/topics/<slug>; null means 404. */
export async function loadTagPage(localeParam: string, slug: string, expected: Locale): Promise<TagPageData | null> {
  if (!isValidLocale(localeParam) || localeParam !== expected) return null;
  const tag = tagBySlug(expected, slug);
  if (!tag) return null;
  let rows: BlogPostRow[];
  try {
    rows = await listPublishedPosts();
  } catch (error) {
    console.error(`blog tag page: posts unavailable (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
  const posts = postsForTag(rows, tag.key, expected);
  if (posts.length === 0) return null;
  return { locale: expected, tag, posts, localesWithPosts: localesWithTag(rows, tag.key), rows };
}
