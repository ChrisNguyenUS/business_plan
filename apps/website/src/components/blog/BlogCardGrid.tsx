import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n/config";
import { blogPostPath } from "@/lib/blog/post-locale";
import { formatPostDate } from "@/lib/blog/labels";
import type { LocalizedPost } from "@/lib/blog/types";

export type BlogCard = {
  id: string;
  href: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  dateLabel: string;
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
    dateLabel: formatPostDate(post.publishedAt, pageLocale),
    coverImageUrl: post.coverImageUrl,
  };
}

export function BlogCardGrid({ cards, categoryLabels }: { cards: BlogCard[]; categoryLabels: Record<string, string> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {cards.map((p) => (
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
  );
}
