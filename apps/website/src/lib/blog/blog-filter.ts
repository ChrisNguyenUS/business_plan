import type { Locale } from "@/lib/i18n/config";
import { CATEGORY_ORDER } from "./labels";
import { searchDoc, searchItems } from "./search";
import { BLOG_TAGS, tagBySlug, tagByKey, tagsForPost, type BlogTag } from "./tags";

export interface FilterableCard {
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  /** ISO date used for sorting. */
  publishedAt: string;
}

export type BlogSort = "newest" | "oldest" | "relevant";

/** `tag` is a hashtag key; the URL carries the locale slug instead. */
export interface BlogFilter {
  q: string;
  cat: string | null;
  tag: string | null;
  sort: BlogSort;
}

export const EMPTY_FILTER: BlogFilter = { q: "", cat: null, tag: null, sort: "newest" };

const isCategory = (c: string) => (CATEGORY_ORDER as readonly string[]).includes(c);
const isSort = (s: string | null): s is BlogSort => s === "newest" || s === "oldest" || s === "relevant";

export function parseFilter(params: { get(name: string): string | null }, locale: Locale): BlogFilter {
  const cat = params.get("cat");
  const tagSlug = params.get("tag");
  const sort = params.get("sort");
  return {
    q: params.get("q") ?? "",
    cat: cat && isCategory(cat) ? cat : null,
    tag: tagSlug ? (tagBySlug(locale, tagSlug)?.key ?? null) : null,
    sort: isSort(sort) ? sort : "newest",
  };
}

export function filterToSearch(f: BlogFilter, locale: Locale): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.cat) p.set("cat", f.cat);
  const tag = f.tag ? tagByKey(f.tag) : null;
  if (tag) p.set("tag", tag.slug[locale]);
  if (f.sort !== "newest") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** True when the reader narrowed the list (sort alone doesn't count). */
export function hasActiveFilters(f: BlogFilter): boolean {
  return f.q.trim() !== "" || f.cat !== null || f.tag !== null;
}

const byDate = (a: FilterableCard, b: FilterableCard) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

export function filterCards<T extends FilterableCard>(cards: readonly T[], f: BlogFilter, locale: Locale): T[] {
  const narrowed = cards.filter((c) => (!f.cat || c.category === f.cat) && (!f.tag || c.tags.includes(f.tag)));
  const matched = searchItems(narrowed, f.q, (c) => searchDoc(c.title, c.excerpt, ...tagsForPost(c.tags).map((t) => t.label[locale])));
  // Relevance order (title matches first) only means something with a query.
  if (f.sort === "relevant" && f.q.trim()) return matched;
  const sorted = [...matched].sort(byDate);
  return f.sort === "oldest" ? sorted.reverse() : sorted;
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

/** Hashtags of a category, most used first; ties keep registry order (Array.prototype.sort is stable). */
export function topicsByCount(cards: readonly FilterableCard[], cat: string | null): TagCount[] {
  return [...tagCountsFor(cards, cat)].sort((a, b) => b.count - a.count);
}

export function topTags(cards: readonly FilterableCard[], n = 5): TagCount[] {
  return topicsByCount(cards, null).slice(0, n);
}
