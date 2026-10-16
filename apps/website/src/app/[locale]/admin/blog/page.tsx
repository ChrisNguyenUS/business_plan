"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { BlogPostRow, FaqItem } from "@/lib/blog/types";
import { slugify } from "@/lib/blog/slugify";
import { publishBlocker } from "@/lib/blog/publish-guard";

type BlogPost = BlogPostRow;

const CATEGORIES = ["tax", "insurance", "immigration", "ai", "general"];
const POST_TYPES = ["article", "guide", "news", "faq"];
const DEFAULT_AUTHOR = "Manna One Solution";

const EMPTY_POST: Partial<BlogPost> = {
  slug_en: "", slug_vi: "", title_en: "", title_vi: "", excerpt_en: "", excerpt_vi: "",
  content_en: "", content_vi: "", faq_en: [], faq_vi: [], author_name: DEFAULT_AUTHOR,
  cover_image_url: "", category: "immigration", post_type: "article", published: false,
};

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [langTab, setLangTab] = useState<"en" | "vi">("vi");

  const load = async () => {
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setPosts(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = posts.filter(p =>
    (p.title_en || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.title_vi || "").toLowerCase().includes(search.toLowerCase())
  );

  function openEditor(post: Partial<BlogPost>) {
    setEditing(post);
    setSaveError(null);
    setLangTab("vi");
  }

  async function savePost() {
    if (!editing) return;
    if (editing.published) {
      const blocker = publishBlocker(editing);
      if (blocker) { setSaveError(blocker); return; }
    }
    setSaving(true);
    setSaveError(null);

    const payload = {
      slug_en: editing.slug_en || null,
      slug_vi: editing.slug_vi || null,
      title_en: editing.title_en || null,
      title_vi: editing.title_vi || null,
      excerpt_en: editing.excerpt_en || null,
      excerpt_vi: editing.excerpt_vi || null,
      content_en: editing.content_en || null,
      content_vi: editing.content_vi || null,
      faq_en: (editing.faq_en ?? []).filter((f) => f.q.trim() && f.a.trim()),
      faq_vi: (editing.faq_vi ?? []).filter((f) => f.q.trim() && f.a.trim()),
      author_name: editing.author_name?.trim() || DEFAULT_AUTHOR,
      cover_image_url: editing.cover_image_url || null,
      category: editing.category || "general",
      post_type: editing.post_type || "article",
      published: editing.published ?? false,
    };

    const { error } = editing.id
      ? await supabase.from("blog_posts").update(payload).eq("id", editing.id)
      : await supabase.from("blog_posts").insert(payload);

    setSaving(false);
    if (error) {
      setSaveError(error.code === "23505" ? "Slug này đã được dùng cho bài khác." : error.message);
      return;
    }
    setEditing(null);
    load();
  }

  // The slug follows the title until someone types their own.
  function setTitle(lang: "en" | "vi", value: string) {
    if (!editing) return;
    const titleKey = lang === "vi" ? "title_vi" : "title_en";
    const slugKey = lang === "vi" ? "slug_vi" : "slug_en";
    const current = editing[slugKey] || "";
    const auto = !current || current === slugify(editing[titleKey] || "");
    setEditing({ ...editing, [titleKey]: value, [slugKey]: auto ? slugify(value) : current });
  }

  const lang = langTab;
  const excerpt = (lang === "vi" ? editing?.excerpt_vi : editing?.excerpt_en) || "";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-charcoal">Blog Posts</h1>
        <button
          onClick={() => openEditor({ ...EMPTY_POST })}
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
                <p className="font-semibold text-charcoal text-sm truncate">{p.title_vi || p.title_en || "Untitled"}</p>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  {p.published && (p.slug_vi || p.slug_en) && (
                    <a
                      href={p.slug_vi ? `/vi/blog/${p.slug_vi}` : `/en/blog/${p.slug_en}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary"
                    >
                      Xem bài
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => openEditor(p)} className="ml-4 p-2 rounded-lg hover:bg-muted transition-colors"><Edit className="h-4 w-4 text-muted-foreground" /></button>
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
              <button onClick={() => setLangTab("vi")} className={`flex-1 py-1.5 rounded-md text-sm font-medium ${langTab === "vi" ? "bg-white shadow-sm text-charcoal" : "text-muted-foreground"}`}>Vietnamese</button>
              <button onClick={() => setLangTab("en")} className={`flex-1 py-1.5 rounded-md text-sm font-medium ${langTab === "en" ? "bg-white shadow-sm text-charcoal" : "text-muted-foreground"}`}>English</button>
            </div>

            <div className="space-y-4">
              <FormField
                label={`Title (${lang.toUpperCase()})`}
                value={(lang === "vi" ? editing.title_vi : editing.title_en) || ""}
                onChange={(v) => setTitle(lang, v)}
              />
              <FormField
                label={`Slug (${lang.toUpperCase()})`}
                value={(lang === "vi" ? editing.slug_vi : editing.slug_en) || ""}
                onChange={(v) => setEditing({ ...editing, [lang === "vi" ? "slug_vi" : "slug_en"]: v })}
              />
              <div>
                <FormField
                  label={`Excerpt / meta description (${lang.toUpperCase()})`}
                  value={excerpt}
                  onChange={(v) => setEditing({ ...editing, [lang === "vi" ? "excerpt_vi" : "excerpt_en"]: v })}
                />
                <p className={excerpt.length > 160 ? "text-xs text-red-600 mt-1" : "text-xs text-muted-foreground mt-1"}>{excerpt.length}/160</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Content ({lang.toUpperCase()})</label>
                <textarea
                  value={(lang === "vi" ? editing.content_vi : editing.content_en) || ""}
                  onChange={(e) => setEditing({ ...editing, [lang === "vi" ? "content_vi" : "content_en"]: e.target.value })}
                  rows={14}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  placeholder="Markdown"
                />
              </div>
              <FaqEditor
                value={(lang === "vi" ? editing.faq_vi : editing.faq_en) ?? []}
                onChange={(faq) => setEditing({ ...editing, [lang === "vi" ? "faq_vi" : "faq_en"]: faq })}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Author" value={editing.author_name || ""} onChange={(v) => setEditing({ ...editing, author_name: v })} />
                <FormField label="Cover Image URL" value={editing.cover_image_url || ""} onChange={(v) => setEditing({ ...editing, cover_image_url: v })} />
              </div>

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

            {saveError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>}

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

function FaqEditor({ value, onChange }: { value: FaqItem[]; onChange: (v: FaqItem[]) => void }) {
  const set = (i: number, patch: Partial<FaqItem>) => onChange(value.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1">FAQ</label>
      <div className="space-y-2">
        {value.map((f, i) => (
          <div key={i} className="rounded-lg border border-border p-2 space-y-1">
            <input value={f.q} onChange={(e) => set(i, { q: e.target.value })} placeholder="Câu hỏi" className="w-full h-9 rounded-md border border-border px-2 text-sm" />
            <textarea value={f.a} onChange={(e) => set(i, { a: e.target.value })} placeholder="Trả lời" rows={2} className="w-full rounded-md border border-border px-2 py-1 text-sm" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-xs text-red-600">Xóa</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...value, { q: "", a: "" }])} className="mt-2 text-sm text-primary font-medium">+ Thêm câu hỏi</button>
    </div>
  );
}
