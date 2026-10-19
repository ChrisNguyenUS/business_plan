import type { Locale } from "@/lib/i18n/config";
import { CATEGORY_ORDER } from "./labels";
import { searchDoc, searchItems } from "./search";
import { BLOG_TAGS, tagBySlug, tagByKey, tagsForPost, type BlogTag } from "./tags";

export interface FilterableCard {
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
}

/** `tag` is a hashtag key; the URL carries the locale slug instead. */
export interface BlogFilter {
  q: string;
  cat: string | null;
  tag: string | null;
}

const isCategory = (c: string) => (CATEGORY_ORDER as readonly string[]).includes(c);

export function parseFilter(params: { get(name: string): string | null }, locale: Locale): BlogFilter {
  const cat = params.get("cat");
  const tagSlug = params.get("tag");
  return {
    q: params.get("q") ?? "",
    cat: cat && isCategory(cat) ? cat : null,
    tag: tagSlug ? (tagBySlug(locale, tagSlug)?.key ?? null) : null,
  };
}

export function filterToSearch(f: BlogFilter, locale: Locale): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.cat) p.set("cat", f.cat);
  const tag = f.tag ? tagByKey(f.tag) : null;
  if (tag) p.set("tag", tag.slug[locale]);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function filterCards<T extends FilterableCard>(cards: readonly T[], f: BlogFilter, locale: Locale): T[] {
  const narrowed = cards.filter((c) => (!f.cat || c.category === f.cat) && (!f.tag || c.tags.includes(f.tag)));
  return searchItems(narrowed, f.q, (c) => searchDoc(c.title, c.excerpt, ...tagsForPost(c.tags).map((t) => t.label[locale])));
}

export function visibleCategories(cards: readonly FilterableCard[]): string[] {
  return CATEGORY_ORDER.filter((cat) => cards.some((c) => c.category === cat));
}

export interface TagCount {
  tag: BlogTag;
  count: number;
}

export function tagCountsFor(cards: readonly FilterableCard[], cat: string | null): TagCount[] {
  const pool = cat ? cards.filter((c) => c.category === cat) : cards;
  return BLOG_TAGS.map((tag) => ({ tag, count: pool.filter((c) => c.tags.includes(tag.key)).length })).filter((x) => x.count > 0);
}

/** Most used hashtags first; ties keep registry order (Array.prototype.sort is stable). */
export function topTags(cards: readonly FilterableCard[], n = 5): TagCount[] {
  return [...tagCountsFor(cards, null)].sort((a, b) => b.count - a.count).slice(0, n);
}
