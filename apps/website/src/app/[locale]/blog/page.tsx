"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface BlogPost {
  id: string;
  slug: string;
  title_en: string | null;
  title_vi: string | null;
  excerpt_en: string | null;
  excerpt_vi: string | null;
  cover_image_url: string | null;
  category: string;
  published: boolean;
  created_at: string;
}

const CATEGORIES = ["all", "tax", "insurance", "immigration", "ai", "general"];

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  en: { all: "All", tax: "Tax", insurance: "Insurance", immigration: "Immigration", ai: "AI", general: "General" },
  vi: { all: "Tất cả", tax: "Thuế", insurance: "Bảo hiểm", immigration: "Di trú", ai: "AI", general: "Chung" },
};

export default function BlogPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      setPosts(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const labels = CATEGORY_LABELS[locale] || CATEGORY_LABELS.en;
  const filtered =
    activeCategory === "all" ? posts : posts.filter((p) => p.category === activeCategory);

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">
            {locale === "vi" ? "Blog & Tài Nguyên" : "Blog & Resources"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {locale === "vi"
              ? "Chuyên gia chia sẻ về thuế, bảo hiểm, di trú và tự động hóa doanh nghiệp"
              : "Expert insights on tax, insurance, immigration, and business automation"}
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-white"
                  : "bg-teal-light text-muted-foreground hover:bg-primary/10"
              }`}
            >
              {labels[cat] || cat}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            {locale === "vi" ? "Không tìm thấy bài viết." : "No posts found."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((post) => {
              const title =
                locale === "vi" && post.title_vi ? post.title_vi : post.title_en;
              const excerpt =
                locale === "vi" && post.excerpt_vi ? post.excerpt_vi : post.excerpt_en;

              return (
                <Link
                  key={post.id}
                  href={`/${locale}/blog/${post.slug}`}
                  className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  {post.cover_image_url && (
                    <div className="aspect-video overflow-hidden relative">
                      <Image
                        src={post.cover_image_url}
                        alt={title || ""}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-light text-primary text-xs font-semibold">
                        {labels[post.category] || post.category}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h2 className="font-bold text-charcoal text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {title}
                    </h2>
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {excerpt}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
