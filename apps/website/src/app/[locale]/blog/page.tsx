import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isValidLocale, locales, type Locale } from "@/lib/i18n/config";
import { listPublishedPosts } from "@/lib/blog/queries";
import { blogIndexPosts, postSlugs } from "@/lib/blog/post-locale";
import { blogIndexMetadata } from "@/lib/blog/post-seo";
import { BLOG_LABELS, CATEGORY_LABELS } from "@/lib/blog/labels";
import { BlogList } from "@/components/blog/BlogList";
import { BlogCardGrid, toBlogCard } from "@/components/blog/BlogCardGrid";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const posts = await listPublishedPosts();
  const withPosts = locales.filter((l) => posts.some((p) => postSlugs(p)[l]));
  return {
    title: BLOG_LABELS[locale].indexTitle,
    description: BLOG_LABELS[locale].indexDesc,
    ...blogIndexMetadata(locale, withPosts),
  };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const l: Locale = locale;
  const t = BLOG_LABELS[l];
  const { fallback, posts } = blogIndexPosts(await listPublishedPosts(), l);
  const cards = posts.map((p) => toBlogCard(p, l));

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">{t.indexHeading}</h1>
          <p className="text-muted-foreground text-lg">{t.indexSub}</p>
          {fallback && <p className="mt-4 text-sm text-primary font-medium">{t.fallbackNote}</p>}
        </div>
        {cards.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">{t.empty}</p>
        ) : (
          <Suspense fallback={<BlogCardGrid cards={cards} categoryLabels={CATEGORY_LABELS[l]} minReadLabel={t.minRead} />}>
            <BlogList locale={l} cards={cards} labels={t} categoryLabels={CATEGORY_LABELS[l]} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
