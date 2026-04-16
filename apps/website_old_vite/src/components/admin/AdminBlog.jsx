const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, BookOpen, Eye, EyeOff, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { value: 'tax', label: 'Tax & Business' },
  { value: 'insurance', label: 'Insurance & Finance' },
  { value: 'immigration', label: 'Immigration' },
  { value: 'ai', label: 'AI / Automation' },
  { value: 'general', label: 'General' },
];

const POST_TYPES = ['pillar', 'cluster', 'support', 'blog'];

const EMPTY_POST = {
  slug: '', title_en: '', title_vi: '', excerpt_en: '', excerpt_vi: '',
  content_en: '', content_vi: '', category: 'immigration',
  post_type: 'blog', published: false, cover_image_url: '',
};

function toSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function validatePost(post) {
  const errors = [];
  if (!post.slug) errors.push('Slug is required');
  if (!post.title_en && !post.title_vi) errors.push('At least one title (EN or VI) is required');
  if (!post.content_en && !post.content_vi) errors.push('At least one content version is required');
  if (!post.cover_image_url) errors.push('Cover image URL is required');
  if (!post.excerpt_en && !post.excerpt_vi) errors.push('At least one excerpt is required');
  return errors;
}

export default function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editPost, setEditPost] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishErrors, setPublishErrors] = useState([]);
  const [filterCat, setFilterCat] = useState('all');

  useEffect(() => {
    db.entities.BlogPost.list('-created_date', 200).then(data => { setPosts(data); setLoading(false); });
  }, []);

  async function save(tryPublish = false) {
    if (tryPublish) {
      const errors = validatePost(editPost);
      if (errors.length > 0) { setPublishErrors(errors); return; }
    }
    setSaving(true);
    setPublishErrors([]);
    if (isNew) {
      const created = await db.entities.BlogPost.create(editPost);
      setPosts(prev => [created, ...prev]);
    } else {
      await db.entities.BlogPost.update(editPost.id, editPost);
      setPosts(prev => prev.map(p => p.id === editPost.id ? editPost : p));
    }
    setSaving(false);
    setEditPost(null);
    setIsNew(false);
  }

  async function deletePost(id) {
    if (!confirm('Delete this post?')) return;
    await db.entities.BlogPost.delete(id);
    setPosts(prev => prev.filter(p => p.id !== id));
  }

  function openNew() {
    setEditPost({ ...EMPTY_POST });
    setIsNew(true);
    setPublishErrors([]);
  }

  const filtered = filterCat === 'all' ? posts : posts.filter(p => p.category === filterCat);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Blog Posts</h1>
          <p className="text-muted-foreground text-sm mt-1">{posts.filter(p => p.published).length} published · {posts.filter(p => !p.published).length} drafts</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-teal-dark text-white rounded-full gap-2">
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[{ value: 'all', label: 'All' }, ...CATEGORIES].map(c => (
          <button key={c.value} onClick={() => setFilterCat(c.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterCat === c.value ? 'bg-primary text-white' : 'bg-white border border-border text-muted-foreground hover:text-primary hover:border-primary'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No posts yet. Create your first blog post above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
              {p.cover_image_url && (
                <img src={p.cover_image_url} alt="" className="w-full sm:w-16 h-24 sm:h-12 object-cover rounded-lg shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-charcoal text-sm truncate">{p.title_en || p.title_vi || 'Untitled'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-light text-primary font-medium">{CATEGORIES.find(c => c.value === p.category)?.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${p.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {p.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">/{p.slug} · {new Date(p.created_date).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => { setEditPost({ ...p }); setIsNew(false); setPublishErrors([]); }} className="h-8 gap-1.5 text-xs">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deletePost(p.id)} className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editPost} onOpenChange={o => { if (!o) { setEditPost(null); setIsNew(false); setPublishErrors([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'New Blog Post' : 'Edit Blog Post'}</DialogTitle>
          </DialogHeader>
          {editPost && (
            <div className="space-y-4 py-2">
              {publishErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800 mb-1">Cannot publish — fix these first:</p>
                      <ul className="text-xs text-red-700 space-y-0.5">
                        {publishErrors.map((e, i) => <li key={i}>• {e}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Category</Label>
                  <Select value={editPost.category} onValueChange={v => setEditPost(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Post Type</Label>
                  <Select value={editPost.post_type} onValueChange={v => setEditPost(p => ({ ...p, post_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{POST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Slug (URL)</Label>
                <Input value={editPost.slug} onChange={e => setEditPost(p => ({ ...p, slug: e.target.value }))} placeholder="my-post-slug" className="font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Cover Image URL</Label>
                <Input value={editPost.cover_image_url || ''} onChange={e => setEditPost(p => ({ ...p, cover_image_url: e.target.value }))} placeholder="https://..." />
                {editPost.cover_image_url && <img src={editPost.cover_image_url} alt="" className="mt-2 h-20 rounded-lg object-cover w-full" />}
              </div>

              {/* Bilingual tabs */}
              <Tabs defaultValue="en">
                <TabsList className="mb-3">
                  <TabsTrigger value="en">English (EN)</TabsTrigger>
                  <TabsTrigger value="vi">Vietnamese (VI)</TabsTrigger>
                </TabsList>
                <TabsContent value="en" className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">Title (EN)</Label>
                    <Input value={editPost.title_en || ''} onChange={e => setEditPost(p => ({ ...p, title_en: e.target.value, slug: isNew ? toSlug(e.target.value) : p.slug }))} placeholder="English post title" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Excerpt (EN)</Label>
                    <Textarea rows={2} value={editPost.excerpt_en || ''} onChange={e => setEditPost(p => ({ ...p, excerpt_en: e.target.value }))} placeholder="Short description for blog list..." />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Content (EN) — HTML or Markdown</Label>
                    <Textarea rows={8} value={editPost.content_en || ''} onChange={e => setEditPost(p => ({ ...p, content_en: e.target.value }))} placeholder="Write English content here..." className="font-mono text-xs" />
                  </div>
                </TabsContent>
                <TabsContent value="vi" className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">Tiêu đề (VI)</Label>
                    <Input value={editPost.title_vi || ''} onChange={e => setEditPost(p => ({ ...p, title_vi: e.target.value }))} placeholder="Tiêu đề bài viết tiếng Việt" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Tóm tắt (VI)</Label>
                    <Textarea rows={2} value={editPost.excerpt_vi || ''} onChange={e => setEditPost(p => ({ ...p, excerpt_vi: e.target.value }))} placeholder="Mô tả ngắn gọn..." />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Nội dung (VI) — HTML hoặc Markdown</Label>
                    <Textarea rows={8} value={editPost.content_vi || ''} onChange={e => setEditPost(p => ({ ...p, content_vi: e.target.value }))} placeholder="Viết nội dung tiếng Việt tại đây..." className="font-mono text-xs" />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-center gap-3 pt-1">
                <Switch checked={editPost.published} onCheckedChange={v => setEditPost(p => ({ ...p, published: v }))} id="pub" />
                <Label htmlFor="pub" className="text-sm">Published (visible on blog)</Label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEditPost(null); setIsNew(false); setPublishErrors([]); }}>Cancel</Button>
            <Button variant="outline" onClick={() => save(false)} disabled={saving}>Save Draft</Button>
            <Button onClick={() => save(true)} disabled={saving} className="bg-primary hover:bg-teal-dark text-white">
              {saving ? 'Saving...' : 'Save & Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}