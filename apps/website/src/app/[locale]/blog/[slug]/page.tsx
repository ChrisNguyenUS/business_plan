import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { findPublishedPostsBySlug } from "@/lib/blog/queries";
import { resolvePostRoute } from "@/lib/blog/post-locale";
import { postJsonLd, postMetadata } from "@/lib/blog/post-seo";
import { BLOG_LABELS, formatPostDate } from "@/lib/blog/labels";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { PostBody } from "@/components/blog/PostBody";

type Props = { params: Promise<{ locale: string; slug: string }> };

async function route(params: Props["params"]) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  return resolvePostRoute(await findPublishedPostsBySlug(slug), locale, slug);
}

export async function generateMetadata({ params }: Props) {
  const r = await route(params);
  return r.kind === "render" ? postMetadata(r.post) : {};
}

export default async function BlogPostPage({ params }: Props) {
  const r = await route(params);
  if (r.kind === "redirect") permanentRedirect(r.to);
  if (r.kind === "not-found") notFound();
  const post = r.post;
  const locale: Locale = post.locale;
  const t = BLOG_LABELS[locale];
  const d = await getDictionary(locale);

  return (
    <div className="py-16 lg:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(postJsonLd(post)) }} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link href={`/${locale}`} className="hover:text-primary">{t.home}</Link>
          <span className="mx-2">›</span>
          <Link href={`/${locale}/blog`} className="hover:text-primary">{t.blog}</Link>
        </nav>

        <h1 className="text-3xl lg:text-4xl font-bold text-charcoal mb-4 leading-tight">{post.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {t.by} {post.authorName} · {t.published} {formatPostDate(post.publishedAt, locale)} · {t.updated}{" "}
          {formatPostDate(post.updatedAt, locale)}
        </p>

        {post.coverImageUrl && (
          <div className="rounded-2xl overflow-hidden mb-8 relative aspect-[1200/630]">
            <Image src={post.coverImageUrl} alt={post.title} fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          </div>
        )}

        <div className="prose prose-lg max-w-none prose-headings:text-charcoal prose-p:text-muted-foreground prose-a:text-primary">
          <PostBody markdown={post.content} />
        </div>

        {post.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-charcoal mb-4">{t.faq}</h2>
            <div className="space-y-3">
              {post.faq.map((f) => (
                <details key={f.q} className="rounded-xl border border-border p-4 [&::-webkit-details-marker]:hidden">
                  <summary className="font-semibold text-charcoal cursor-pointer">{f.q}</summary>
                  <p className="mt-2 text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {post.category === "immigration" && (
          <>
            <p className="mt-10 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
              {d.immigration_scope_note}
            </p>
            <div className="mt-8 rounded-2xl bg-charcoal p-8 text-center">
              <h2 className="text-xl font-bold text-white mb-2">{t.ctaTitle}</h2>
              <p className="text-white/70 text-sm mb-6">{t.ctaBody}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/n400ready" className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark">
                  {t.ctaApp}
                </Link>
                <Link
                  href={`/${locale}/services/immigration`}
                  className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  {t.ctaService}
                </Link>
              </div>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
