import { notFound } from "next/navigation";
import { isValidLocale, locales, type Locale } from "@/lib/i18n/config";
import { listPublishedPosts } from "@/lib/blog/queries";
import { blogIndexPosts, blogPostPath, postSlugs } from "@/lib/blog/post-locale";
import { blogIndexMetadata } from "@/lib/blog/post-seo";
import { BLOG_LABELS, CATEGORY_LABELS, formatPostDate } from "@/lib/blog/labels";
import { BlogList, type BlogCard } from "@/components/blog/BlogList";

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
  const cards: BlogCard[] = posts.map((p) => ({
    id: p.id,
    href: blogPostPath(p.locale, p.slug),
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    dateLabel: formatPostDate(p.publishedAt, l),
    coverImageUrl: p.coverImageUrl,
  }));

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">{t.indexHeading}</h1>
          <p className="text-muted-foreground text-lg">{t.indexSub}</p>
          {fallback && <p className="mt-4 text-sm text-primary font-medium">{t.fallbackNote}</p>}
        </div>
        {cards.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">{t.empty}</p>
        ) : (
          <BlogList locale={l} allLabel={t.all} categoryLabels={CATEGORY_LABELS[l]} posts={cards} />
        )}
      </div>
    </div>
  );
}
