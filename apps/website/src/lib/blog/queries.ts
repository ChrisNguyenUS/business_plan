import { createClient } from "@supabase/supabase-js";
import { isValidSlug } from "./slugify";
import type { BlogPostRow } from "./types";

const COLUMNS =
  "id,slug_en,slug_vi,title_en,title_vi,excerpt_en,excerpt_vi,content_en,content_vi,faq_en,faq_vi," +
  "author_name,cover_image_url,category,tags,post_type,published,published_at,created_at,updated_at";

// Anon key, no session: RLS returns published rows only.
function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

export async function listPublishedPosts(): Promise<BlogPostRow[]> {
  const { data, error } = await publicClient()
    .from("blog_posts")
    .select(COLUMNS)
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw new Error(`blog_posts list failed: ${error.message}`);
  return (data ?? []) as unknown as BlogPostRow[];
}

/** Published rows whose English or Vietnamese slug equals `slug`. */
export async function findPublishedPostsBySlug(slug: string): Promise<BlogPostRow[]> {
  if (!isValidSlug(slug)) return []; // also keeps the .or() filter injection-free
  const { data, error } = await publicClient()
    .from("blog_posts")
    .select(COLUMNS)
    .eq("published", true)
    .or(`slug_en.eq.${slug},slug_vi.eq.${slug}`)
    .limit(2);
  if (error) throw new Error(`blog_posts lookup failed: ${error.message}`);
  return (data ?? []) as unknown as BlogPostRow[];
}
