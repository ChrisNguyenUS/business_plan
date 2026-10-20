import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { BLOG_LABELS, CATEGORY_LABELS } from "@/lib/blog/labels";
import { postsForTag } from "@/lib/blog/post-locale";
import { loadTagPage } from "@/lib/blog/tag-route";
import { tagJsonLd, tagMetadata } from "@/lib/blog/tag-seo";
import { tagPath, tagsInCategory } from "@/lib/blog/tags";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { BlogCardGrid, toBlogCard } from "./BlogCardGrid";

export async function tagPageMetadata(localeParam: string, slug: string, expected: Locale): Promise<Metadata> {
  const data = await loadTagPage(localeParam, slug, expected);
  return data ? tagMetadata(data.tag, data.locale, data.localesWithPosts) : {};
}

export async function TagPageView({ localeParam, slug, expected }: { localeParam: string; slug: string; expected: Locale }) {
  const data = await loadTagPage(localeParam, slug, expected);
  if (!data) notFound();
  const { locale, tag, posts, rows } = data;
  const t = BLOG_LABELS[locale];
  const related = tagsInCategory(tag.category).filter((x) => x.key !== tag.key && postsForTag(rows, x.key, locale).length > 0);

  return (
    <div className="py-16 lg:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(tagJsonLd(tag, locale, posts)) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link href={`/${locale}`} className="hover:text-primary">{t.home}</Link>
          <span className="mx-2">›</span>
          <Link href={`/${locale}/blog`} className="hover:text-primary">{t.blog}</Link>
        </nav>
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">#{tag.label[locale]}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{tag.description[locale]}</p>
        </div>
        <BlogCardGrid cards={posts.map((p) => toBlogCard(p, locale))} categoryLabels={CATEGORY_LABELS[locale]} minReadLabel={t.minRead} />
        {related.length > 0 && (
          <section className="mt-14 text-center">
            <h2 className="text-lg font-semibold text-charcoal mb-4">{t.relatedTags}</h2>
            <ul className="flex flex-wrap gap-2 justify-center">
              {related.map((x) => (
                <li key={x.key}>
                  <Link href={tagPath(locale, x.key)} className="inline-block rounded-full border border-border px-3 py-1 text-sm text-primary hover:bg-primary/5">
                    #{x.label[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
