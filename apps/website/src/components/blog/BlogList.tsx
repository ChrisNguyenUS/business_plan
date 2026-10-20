"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, Tag, Trash2, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { BLOG_LABELS } from "@/lib/blog/labels";
import {
  EMPTY_FILTER, filterCards, filterToSearch, hasActiveFilters, parseFilter, topicsByCount, topTags, visibleCategories,
  type BlogFilter, type BlogSort,
} from "@/lib/blog/blog-filter";
import { tagByKey } from "@/lib/blog/tags";
import { BlogCardGrid, type BlogCard } from "./BlogCardGrid";

const ZALO_URL = "https://zalo.me/3468524454";
// Topics shown before "View all topics" (fewer on phones).
const COLLAPSED_TOPICS = 8;
const MOBILE_TOPICS = 5;

const tab = (active: boolean) =>
  `shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    active ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-charcoal"
  }`;

const chip = (active: boolean) =>
  `inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    active ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-charcoal hover:border-primary/50"
  }`;

function ActiveChip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-white px-3 py-1 text-sm text-primary">
      {label}
      <button type="button" onClick={onRemove} aria-label={`${removeLabel}: ${label}`} className="-my-1 -mr-1.5 rounded-full p-1.5 hover:bg-primary/10">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

// Wrapped in <Suspense> by the page: the server HTML is the full, unfiltered grid.
export function BlogList({
  locale,
  cards,
  labels,
  categoryLabels,
}: {
  locale: Locale;
  cards: BlogCard[];
  labels: (typeof BLOG_LABELS)[Locale];
  categoryLabels: Record<string, string>;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<BlogFilter>(() => parseFilter(params, locale));
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Mirror the controls in the URL so a filtered list can be shared; typing is debounced.
  useEffect(() => {
    const id = setTimeout(() => router.replace(`${pathname}${filterToSearch(filter, locale)}`, { scroll: false }), 150);
    return () => clearTimeout(id);
  }, [filter, locale, pathname, router]);

  const t = labels;
  const shown = useMemo(() => filterCards(cards, filter, locale), [cards, filter, locale]);
  const categories = visibleCategories(cards);
  const topics = topicsByCount(cards, filter.cat);
  const collapsed = topics.slice(0, COLLAPSED_TOPICS);
  // Keep a selected topic visible even when the list is collapsed.
  const hiddenSelected = topics.filter((x) => x.tag.key === filter.tag && !collapsed.includes(x));
  const visibleTopics = showAllTopics ? topics : [...collapsed, ...hiddenSelected];
  const activeTag = filter.tag ? tagByKey(filter.tag) : null;
  const active = hasActiveFilters(filter);
  const clearAll = () => setFilter({ ...EMPTY_FILTER, sort: filter.sort });
  const count =
    shown.length === cards.length
      ? t.countAll.replace("{total}", String(cards.length))
      : t.countSome.replace("{shown}", String(shown.length)).replace("{total}", String(cards.length));
  const sortOptions: [BlogSort, string][] = [
    ["newest", t.sortNewest],
    ["oldest", t.sortOldest],
    ...(filter.q.trim() ? [["relevant", t.sortRelevant] as [BlogSort, string]] : []),
  ];

  return (
    <div lang={locale}>
      <div className="max-w-3xl mx-auto">
        <label htmlFor="blog-search" className="sr-only">{t.searchLabel}</label>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <input
            id="blog-search"
            type="search"
            value={filter.q}
            placeholder={t.searchPlaceholder}
            onChange={(e) => setFilter({ ...filter, q: e.target.value })}
            className="w-full h-13 rounded-full border border-border bg-white pl-13 pr-12 text-base shadow-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring [&::-webkit-search-cancel-button]:hidden"
          />
          {filter.q && (
            <button
              type="button"
              aria-label={t.clearSearch}
              onClick={() => setFilter({ ...filter, q: "", sort: filter.sort === "relevant" ? "newest" : filter.sort })}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mt-5 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto sm:flex-wrap sm:justify-center [scrollbar-width:none]">
          <button type="button" aria-pressed={filter.cat === null} onClick={() => setFilter({ ...filter, cat: null, tag: null })} className={tab(filter.cat === null)}>
            {t.all}
          </button>
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={filter.cat === c} onClick={() => setFilter({ ...filter, cat: c, tag: null })} className={tab(filter.cat === c)}>
              {categoryLabels[c] ?? c}
            </button>
          ))}
        </div>
      )}

      {topics.length > 0 && (
        <section className="mt-6 border-t border-border pt-5" aria-labelledby="blog-topics-title">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Tag className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <div>
                <h2 id="blog-topics-title" className="text-sm font-semibold text-charcoal">{t.exploreTopics}</h2>
                <p className="text-xs text-muted-foreground">{t.exploreTopicsSub}</p>
              </div>
            </div>
            {topics.length > MOBILE_TOPICS && (
              <button
                type="button"
                aria-expanded={showAllTopics}
                onClick={() => setShowAllTopics(!showAllTopics)}
                className={`shrink-0 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline ${
                  topics.length <= COLLAPSED_TOPICS ? "sm:hidden" : ""
                }`}
              >
                {showAllTopics ? t.showFewerTopics : t.viewAllTopics}
                <ChevronDown className={`h-4 w-4 transition-transform ${showAllTopics ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleTopics.map(({ tag, count: n }, i) => {
              const selected = filter.tag === tag.key;
              const phoneHidden = !showAllTopics && !selected && i >= MOBILE_TOPICS;
              return (
                <button
                  key={tag.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter({ ...filter, tag: selected ? null : tag.key })}
                  className={`${chip(selected)} ${phoneHidden ? "max-sm:hidden" : ""}`}
                >
                  {tag.label[locale]}
                  <span className="inline-flex min-w-5 justify-center rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{n}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {active && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl bg-teal-light px-4 py-3">
          <span className="text-sm font-medium text-charcoal">{t.filtersLabel}</span>
          {filter.q.trim() && (
            <ActiveChip label={`“${filter.q.trim()}”`} removeLabel={t.removeFilter} onRemove={() => setFilter({ ...filter, q: "", sort: filter.sort === "relevant" ? "newest" : filter.sort })} />
          )}
          {filter.cat && (
            <ActiveChip label={categoryLabels[filter.cat] ?? filter.cat} removeLabel={t.removeFilter} onRemove={() => setFilter({ ...filter, cat: null, tag: null })} />
          )}
          {activeTag && <ActiveChip label={activeTag.label[locale]} removeLabel={t.removeFilter} onRemove={() => setFilter({ ...filter, tag: null })} />}
          <button type="button" onClick={clearAll} className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t.clearAll}
          </button>
        </div>
      )}

      <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">{count}</p>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t.sortBy}
          <select
            value={filter.sort}
            onChange={(e) => setFilter({ ...filter, sort: e.target.value as BlogSort })}
            className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {shown.length > 0 ? (
        <BlogCardGrid cards={shown} categoryLabels={categoryLabels} minReadLabel={t.minRead} />
      ) : (
        <div className="text-center py-12">
          <p className="text-charcoal font-medium mb-4">{t.noResults}</p>
          <button type="button" onClick={clearAll} className="mb-6 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
            {t.clearFilters}
          </button>
          <p className="text-sm text-muted-foreground mb-3">{t.popularTags}</p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {topTags(cards).map(({ tag }) => (
              <button key={tag.key} type="button" onClick={() => setFilter({ ...EMPTY_FILTER, sort: filter.sort, tag: tag.key })} className={chip(false)}>
                {tag.label[locale]}
              </button>
            ))}
          </div>
          <a href={ZALO_URL} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark">
            {t.askZalo}
          </a>
        </div>
      )}
    </div>
  );
}
