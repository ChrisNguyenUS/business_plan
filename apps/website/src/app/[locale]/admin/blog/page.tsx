"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface BlogPost {
  id: string;
  slug: string;
  title_en: string | null;
  title_vi: string | null;
  excerpt_en: string | null;
  excerpt_vi: string | null;
  content_en: string | null;
  content_vi: string | null;
  cover_image_url: string | null;
  category: string;
  post_type: string;
  published: boolean;
  created_at: string;
}

const CATEGORIES = ["tax", "insurance", "immigration", "ai", "general"];
const POST_TYPES = ["article", "guide", "news", "faq"];

const EMPTY_POST: Partial<BlogPost> = {
  slug: "", title_en: "", title_vi: "", excerpt_en: "", excerpt_vi: "",
  content_en: "", content_vi: "", cover_image_url: "", category: "general",
  post_type: "article", published: false,
};

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [saving, setSaving] = useState(false);
  const [langTab, setLangTab] = useState<"en" | "vi">("en");

  const load = useCallback(async () => {
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = posts.filter(p =>
    (p.title_en || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.title_vi || "").toLowerCase().includes(search.toLowerCase())
  );

  function generateSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function savePost() {
    if (!editing) return;
    setSaving(true);

    const slug = editing.slug || generateSlug(editing.title_en || "untitled");
    const payload = {
      slug,
      title_en: editing.title_en || null,
      title_vi: editing.title_vi || null,
      excerpt_en: editing.excerpt_en || null,
      excerpt_vi: editing.excerpt_vi || null,
      content_en: editing.content_en || null,
      content_vi: editing.content_vi || null,
      cover_image_url: editing.cover_image_url || null,
      category: editing.category || "general",
      post_type: editing.post_type || "article",
      published: editing.published ?? false,
    };

    if (editing.id) {
      await supabase.from("blog_posts").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("blog_posts").insert(payload);
    }

    setSaving(false);
    setEditing(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-charcoal">Blog Posts</h1>
        <button
          onClick={() => { setEditing({ ...EMPTY_POST }); setLangTab("en"); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Post
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts..." className="w-full h-10 rounded-lg border border-border pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No blog posts found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-border p-5 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-light text-primary">{p.category}</span>
                  {p.published ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600"><Eye className="h-3 w-3" /> Published</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><EyeOff className="h-3 w-3" /> Draft</span>
                  )}
                </div>
                <p className="font-semibold text-charcoal text-sm truncate">{p.title_en || p.title_vi || "Untitled"}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => { setEditing(p); setLangTab("en"); }} className="ml-4 p-2 rounded-lg hover:bg-muted transition-colors"><Edit className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-charcoal">{editing.id ? "Edit Post" : "New Post"}</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>

            {/* Language Tabs */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
              <button onClick={() => setLangTab("en")} className={`flex-1 py-1.5 rounded-md text-sm font-medium ${langTab === "en" ? "bg-white shadow-sm text-charcoal" : "text-muted-foreground"}`}>English</button>
              <button onClick={() => setLangTab("vi")} className={`flex-1 py-1.5 rounded-md text-sm font-medium ${langTab === "vi" ? "bg-white shadow-sm text-charcoal" : "text-muted-foreground"}`}>Vietnamese</button>
            </div>

            <div className="space-y-4">
              {langTab === "en" ? (
                <>
                  <FormField label="Title (EN)" value={editing.title_en || ""} onChange={(v) => setEditing({ ...editing, title_en: v, slug: editing.slug || generateSlug(v) })} />
                  <FormField label="Excerpt (EN)" value={editing.excerpt_en || ""} onChange={(v) => setEditing({ ...editing, excerpt_en: v })} />
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Content (EN)</label>
                    <textarea value={editing.content_en || ""} onChange={(e) => setEditing({ ...editing, content_en: e.target.value })} rows={8} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono" placeholder="Markdown or HTML content..." />
                  </div>
                </>
              ) : (
                <>
                  <FormField label="Title (VI)" value={editing.title_vi || ""} onChange={(v) => setEditing({ ...editing, title_vi: v })} />
                  <FormField label="Excerpt (VI)" value={editing.excerpt_vi || ""} onChange={(v) => setEditing({ ...editing, excerpt_vi: v })} />
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Content (VI)</label>
                    <textarea value={editing.content_vi || ""} onChange={(e) => setEditing({ ...editing, content_vi: e.target.value })} rows={8} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono" placeholder="Nội dung Markdown hoặc HTML..." />
                  </div>
                </>
              )}

              <FormField label="Slug" value={editing.slug || ""} onChange={(v) => setEditing({ ...editing, slug: v })} />
              <FormField label="Cover Image URL" value={editing.cover_image_url || ""} onChange={(v) => setEditing({ ...editing, cover_image_url: v })} />

              <div className="grid grid-cols-2 gap-3">
                <SelectFormField label="Category" value={editing.category || "general"} options={CATEGORIES} onChange={(v) => setEditing({ ...editing, category: v })} />
                <SelectFormField label="Post Type" value={editing.post_type || "article"} options={POST_TYPES} onChange={(v) => setEditing({ ...editing, post_type: v })} />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setEditing({ ...editing, published: !editing.published })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.published ? "bg-primary" : "bg-gray-300"}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${editing.published ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm font-medium text-charcoal">{editing.published ? "Published" : "Draft"}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={savePost} disabled={saving} className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

function SelectFormField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-lg border border-border px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
