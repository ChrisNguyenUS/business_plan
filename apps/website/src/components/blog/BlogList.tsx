"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n/config";

export type BlogCard = {
  id: string;
  href: string;
  title: string;
  excerpt: string;
  category: string;
  dateLabel: string;
  coverImageUrl: string | null;
};

// Rendered on the server too: every card is in the HTML; the filter only hides cards.
export function BlogList({
  locale,
  allLabel,
  categoryLabels,
  posts,
}: {
  locale: Locale;
  allLabel: string;
  categoryLabels: Record<string, string>;
  posts: BlogCard[];
}) {
  const [active, setActive] = useState("all");
  const categories = ["all", ...Array.from(new Set(posts.map((p) => p.category)))];
  const shown = active === "all" ? posts : posts.filter((p) => p.category === active);

  return (
    <div lang={locale}>
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                active === c ? "bg-primary text-white" : "bg-teal-light text-muted-foreground hover:bg-primary/10"
              }`}
            >
              {c === "all" ? allLabel : categoryLabels[c] ?? c}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {shown.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
          >
            {p.coverImageUrl && (
              <div className="aspect-[1200/630] overflow-hidden relative">
                <Image src={p.coverImageUrl} alt={p.title} fill sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" className="object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-light text-primary font-semibold">
                  {categoryLabels[p.category] ?? p.category}
                </span>
                <span className="text-muted-foreground">{p.dateLabel}</span>
              </div>
              <h2 className="font-bold text-charcoal text-lg mb-2 group-hover:text-primary transition-colors">{p.title}</h2>
              <p className="text-muted-foreground text-sm line-clamp-3">{p.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
