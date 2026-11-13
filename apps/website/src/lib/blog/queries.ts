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

type SlugPair = Pick<BlogPostRow, "slug_vi" | "slug_en" | "title_vi" | "title_en" | "excerpt_vi" | "excerpt_en">;

/** Slugs, titles and excerpts only (no bodies): enough to link each post to its other-language slug. */
export async function listPostSlugPairs(): Promise<SlugPair[]> {
  const { data, error } = await publicClient()
    .from("blog_posts")
    .select("slug_vi,slug_en,title_vi,title_en,excerpt_vi,excerpt_en")
    .eq("published", true);
  if (error) throw new Error(`blog_posts slug pairs failed: ${error.message}`);
  return (data ?? []) as unknown as SlugPair[];
}

/**
 * Published rows whose English or Vietnamese slug equals `slug`; failing that,
 * the post that gave `slug` up (previous_slugs, migration website_03), so the
 * page can redirect an old link. The second lookup runs only for unknown slugs
 * and never throws: an error there just means "not found".
 */
export async function findPublishedPostsBySlug(slug: string): Promise<BlogPostRow[]> {
  if (!isValidSlug(slug)) return []; // also keeps the .or() filter injection-free
  const client = publicClient();
  const { data, error } = await client
    .from("blog_posts")
    .select(COLUMNS)
    .eq("published", true)
    .or(`slug_en.eq.${slug},slug_vi.eq.${slug}`)
    .limit(2);
  if (error) throw new Error(`blog_posts lookup failed: ${error.message}`);
  if (data && data.length > 0) return data as unknown as BlogPostRow[];

  const old = await client
    .from("blog_posts")
    .select(COLUMNS)
    .eq("published", true)
    .contains("previous_slugs", [slug])
    .limit(1);
  return old.error ? [] : ((old.data ?? []) as unknown as BlogPostRow[]);
}
