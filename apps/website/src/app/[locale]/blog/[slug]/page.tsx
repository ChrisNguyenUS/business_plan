"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";

interface BlogPost {
  id: string;
  slug: string;
  title_en: string | null;
  title_vi: string | null;
  content_en: string | null;
  content_vi: string | null;
  cover_image_url: string | null;
  category: string;
  created_at: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();
      setPost(data);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-32 text-center">
        <p className="text-muted-foreground text-lg">Post not found.</p>
        <Link
          href={`/${locale}/blog`}
          className="text-primary font-semibold mt-4 inline-block"
        >
          {locale === "vi" ? "Quay lại Blog" : "Back to Blog"}
        </Link>
      </div>
    );
  }

  const title = locale === "vi" && post.title_vi ? post.title_vi : post.title_en;
  const content =
    locale === "vi" && post.content_vi ? post.content_vi : post.content_en;

  return (
    <div className="py-16 lg:py-24">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}/blog`}
          className="inline-flex items-center gap-1 text-primary text-sm font-medium mb-8 hover:gap-2 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          {locale === "vi" ? "Quay lại Blog" : "Back to Blog"}
        </Link>

        {post.cover_image_url && (
          <div className="rounded-2xl overflow-hidden mb-8 relative h-64 lg:h-80">
            <Image
              src={post.cover_image_url}
              alt={title || ""}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <span className="px-3 py-1 rounded-full bg-teal-light text-primary text-xs font-semibold">
            {post.category}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground text-sm">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold text-charcoal mb-8 leading-tight">
          {title}
        </h1>

        <div className="prose prose-lg max-w-none prose-headings:text-charcoal prose-p:text-muted-foreground prose-a:text-primary">
          <ReactMarkdown>{content || ""}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
