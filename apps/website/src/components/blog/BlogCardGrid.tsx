import Link from "next/link";
import Image from "next/image";
import { Calendar, ChevronRight, Clock } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { blogPostPath } from "@/lib/blog/post-locale";
import { formatPostDate } from "@/lib/blog/labels";
import { readingMinutes } from "@/lib/blog/reading-time";
import type { LocalizedPost } from "@/lib/blog/types";

export type BlogCard = {
  id: string;
  href: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishedAt: string;
  dateLabel: string;
  readingMinutes: number;
  coverImageUrl: string | null;
};

/** `pageLocale` formats the date; the link stays in the post's own language. */
export function toBlogCard(post: LocalizedPost, pageLocale: Locale): BlogCard {
  return {
    id: post.id,
    href: blogPostPath(post.locale, post.slug),
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    publishedAt: post.publishedAt,
    dateLabel: formatPostDate(post.publishedAt, pageLocale),
    readingMinutes: readingMinutes(post.content),
    coverImageUrl: post.coverImageUrl,
  };
}

export function BlogCardGrid({
  cards,
  categoryLabels,
  minReadLabel,
}: {
  cards: BlogCard[];
  categoryLabels: Record<string, string>;
  /** Contains "{n}", e.g. "{n} min read". */
  minReadLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((p) => (
        <Link
          key={p.id}
          href={p.href}
          className="group flex flex-col bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {p.coverImageUrl && (
            <div className="aspect-[1200/630] overflow-hidden relative">
              <Image src={p.coverImageUrl} alt={p.title} fill sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
          )}
          <div className="flex flex-1 flex-col p-5">
            <span className="self-start px-2.5 py-0.5 rounded-full bg-teal-light text-primary text-xs font-semibold uppercase tracking-wide">
              {categoryLabels[p.category] ?? p.category}
            </span>
            <h2 className="mt-3 font-bold text-charcoal text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">{p.title}</h2>
            <p className="mt-2 text-muted-foreground text-sm line-clamp-2">{p.excerpt}</p>
            <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <time dateTime={p.publishedAt}>{p.dateLabel}</time>
              <span aria-hidden="true">·</span>
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{minReadLabel.replace("{n}", String(p.readingMinutes))}</span>
              <ChevronRight className="ml-auto h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
