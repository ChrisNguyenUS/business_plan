"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { BLOG_LABELS } from "@/lib/blog/labels";
import { filterCards, filterToSearch, parseFilter, tagCountsFor, topTags, visibleCategories, type BlogFilter } from "@/lib/blog/blog-filter";
import { BlogCardGrid, type BlogCard } from "./BlogCardGrid";

const ZALO_URL = "https://zalo.me/3468524454";

const pill = (active: boolean) =>
  `px-4 py-2 rounded-full text-sm font-medium transition-colors ${
    active ? "bg-primary text-white" : "bg-teal-light text-muted-foreground hover:bg-primary/10"
  }`;

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

  // Mirror the controls in the URL so a filtered list can be shared; typing is debounced.
  useEffect(() => {
    const id = setTimeout(() => router.replace(`${pathname}${filterToSearch(filter, locale)}`, { scroll: false }), 150);
    return () => clearTimeout(id);
  }, [filter, locale, pathname, router]);

  const shown = useMemo(() => filterCards(cards, filter, locale), [cards, filter, locale]);
  const categories = visibleCategories(cards);
  const tagCounts = tagCountsFor(cards, filter.cat);
  const t = labels;
  const count =
    shown.length === cards.length
      ? t.countAll.replace("{total}", String(cards.length))
      : t.countSome.replace("{shown}", String(shown.length)).replace("{total}", String(cards.length));

  return (
    <div lang={locale}>
      <div className="max-w-2xl mx-auto mb-8">
        <label htmlFor="blog-search" className="sr-only">{t.searchLabel}</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <input
            id="blog-search"
            type="search"
            value={filter.q}
            placeholder={t.searchPlaceholder}
            onChange={(e) => setFilter({ ...filter, q: e.target.value })}
            className="w-full h-12 rounded-full border border-border bg-white pl-12 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {filter.q && (
            <button
              type="button"
              aria-label={t.clearSearch}
              onClick={() => setFilter({ ...filter, q: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          <button type="button" aria-pressed={filter.cat === null} onClick={() => setFilter({ ...filter, cat: null, tag: null })} className={pill(filter.cat === null)}>
            {t.all}
          </button>
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={filter.cat === c} onClick={() => setFilter({ ...filter, cat: c, tag: null })} className={pill(filter.cat === c)}>
              {categoryLabels[c] ?? c}
            </button>
          ))}
        </div>
      )}

      {tagCounts.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-6" aria-label={t.tagsLabel}>
          {tagCounts.map(({ tag, count: n }) => {
            const active = filter.tag === tag.key;
            return (
              <button
                key={tag.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter({ ...filter, tag: active ? null : tag.key })}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  active ? "border-primary bg-primary text-white" : "border-border text-primary hover:bg-primary/5"
                }`}
              >
                #{tag.label[locale]} · {n}
              </button>
            );
          })}
        </div>
      )}

      <p aria-live="polite" className="text-center text-sm text-muted-foreground mb-8">{count}</p>

      {shown.length > 0 ? (
        <BlogCardGrid cards={shown} categoryLabels={categoryLabels} />
      ) : (
        <div className="text-center py-12">
          <p className="text-charcoal font-medium mb-4">{t.noResults}</p>
          <p className="text-sm text-muted-foreground mb-3">{t.popularTags}</p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {topTags(cards).map(({ tag }) => (
              <button
                key={tag.key}
                type="button"
                onClick={() => setFilter({ q: "", cat: null, tag: tag.key })}
                className="px-3 py-1 rounded-full text-sm border border-border text-primary hover:bg-primary/5"
              >
                #{tag.label[locale]}
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
