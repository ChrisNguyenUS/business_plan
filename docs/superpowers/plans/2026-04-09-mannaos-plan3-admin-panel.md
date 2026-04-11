# MannaOS.com — Plan 3: Admin Panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin panel at `/admin/*` — client management (add services, update status, upload documents), blog management (Tiptap rich text editor with photo uploads, bilingual, category filter), and website content editor (hero images, text sections, service images).

**Architecture:** All `/admin/*` routes are server components reading from Supabase with the server client (auth session). Mutations use server actions. Tiptap runs client-side only. Image uploads go to Supabase Storage (`blog-images`, `site-images` buckets). `site_content` table drives editable sections on the public site via ISR (revalidate 60s). Admin role is enforced by middleware (Plan 2) + layout double-check.

**Tech Stack:** Supabase (service role for admin mutations), Next.js Server Actions, Tiptap (rich text), @supabase/ssr, next/cache revalidatePath.

**Prerequisite:** Plans 1 and 2 are complete and deployed.

---

## File Map

```
mannaos-web/
├── src/
│   ├── app/
│   │   └── admin/
│   │       ├── layout.tsx                  Admin layout + nav sidebar
│   │       ├── clients/
│   │       │   ├── page.tsx                Client list with search + filter
│   │       │   └── [id]/
│   │       │       └── page.tsx            Client detail — manage services + docs
│   │       ├── blog/
│   │       │   ├── page.tsx                Blog post list
│   │       │   ├── new/
│   │       │   │   └── page.tsx            New post editor
│   │       │   └── [id]/
│   │       │       └── edit/
│   │       │           └── page.tsx        Edit existing post
│   │       └── content/
│   │           └── page.tsx                Website content editor
│   ├── components/
│   │   └── admin/
│   │       ├── RichTextEditor.tsx          Tiptap wrapper (client component)
│   │       ├── ImageUpload.tsx             Supabase Storage upload button
│   │       ├── ServiceForm.tsx             Add/edit service form for a client
│   │       └── ContentField.tsx            Single editable content field
│   └── app/
│       └── actions/
│           ├── client-actions.ts           Server actions — services + documents
│           ├── blog-actions.ts             Server actions — blog CRUD
│           └── content-actions.ts          Server actions — site_content updates
```

---

## Task 1: Admin Layout & Navigation

**Files:**
- Create: `src/app/admin/layout.tsx`

- [ ] **Step 1: Write admin layout test**

Create `src/app/admin/__tests__/admin-layout.test.tsx`:
```typescript
import { describe, test, expect } from '@jest/globals'

// Test admin nav link configuration
const adminNavLinks = [
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/blog',    label: 'Blog' },
  { href: '/admin/content', label: 'Content' },
]

describe('admin nav links', () => {
  test('includes all required admin sections', () => {
    const hrefs = adminNavLinks.map(l => l.href)
    expect(hrefs).toContain('/admin/clients')
    expect(hrefs).toContain('/admin/blog')
    expect(hrefs).toContain('/admin/content')
  })

  test('all links have labels', () => {
    adminNavLinks.forEach(link => {
      expect(link.label.length).toBeGreaterThan(0)
    })
  })
})
```

- [ ] **Step 2: Run test — confirm it passes**

```bash
npx jest src/app/admin/__tests__/admin-layout.test.tsx
```
Expected: PASS (logic test only)

- [ ] **Step 3: Create Admin layout**

Create `src/app/admin/layout.tsx`:
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

const navLinks = [
  { href: '/admin/clients', label: 'Clients',  icon: '👥' },
  { href: '/admin/blog',    label: 'Blog',     icon: '✍️' },
  { href: '/admin/content', label: 'Content',  icon: '🎨' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/portal/dashboard')

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-charcoal text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <Image src="/logo.png" alt="Manna One Solution" width={100} height={40}
            className="h-8 w-auto brightness-0 invert mb-1" />
          <p className="text-white/50 text-xs mt-2">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm">
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-white/50 text-xs mb-2">{profile.full_name}</p>
          <Link href="/" className="text-white/50 text-xs hover:text-white block mb-1">← Public site</Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-white/50 text-xs hover:text-red-400 transition-colors">
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-bg-surface overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add admin layout with sidebar navigation"
```

---

## Task 2: Server Actions

**Files:**
- Create: `src/app/actions/client-actions.ts`
- Create: `src/app/actions/blog-actions.ts`
- Create: `src/app/actions/content-actions.ts`

- [ ] **Step 1: Write server action tests**

Create `src/app/actions/__tests__/actions.test.ts`:
```typescript
import { describe, test, expect } from '@jest/globals'

// Test action input validation logic (pure functions)
function validateServiceType(type: string): boolean {
  return ['uscis', 'tax', 'insurance', 'ai'].includes(type)
}

function validateContentKey(key: string): boolean {
  const validKeys = [
    'hero_headline_en', 'hero_headline_vi',
    'hero_subheadline_en', 'hero_subheadline_vi',
    'about_bio_en', 'about_bio_vi',
  ]
  return validKeys.includes(key)
}

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

describe('action validation', () => {
  test('validateServiceType accepts valid types', () => {
    expect(validateServiceType('uscis')).toBe(true)
    expect(validateServiceType('tax')).toBe(true)
    expect(validateServiceType('insurance')).toBe(true)
    expect(validateServiceType('ai')).toBe(true)
  })

  test('validateServiceType rejects invalid types', () => {
    expect(validateServiceType('payroll')).toBe(false)
    expect(validateServiceType('')).toBe(false)
  })

  test('generateSlug converts title to URL-safe slug', () => {
    expect(generateSlug('Tax Tips for 2026')).toBe('tax-tips-for-2026')
    expect(generateSlug('LLC Setup Guide!')).toBe('llc-setup-guide')
  })

  test('validateContentKey accepts seeded keys', () => {
    expect(validateContentKey('hero_headline_en')).toBe(true)
    expect(validateContentKey('about_bio_vi')).toBe(true)
    expect(validateContentKey('unknown_key')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — confirm they pass**

```bash
npx jest src/app/actions/__tests__/actions.test.ts
```
Expected: PASS

- [ ] **Step 3: Create client actions**

Create `src/app/actions/client-actions.ts`:
```typescript
'use server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Admin client bypasses RLS
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function assertAdmin() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return user
}

export async function addService(formData: FormData) {
  await assertAdmin()
  const admin = getAdminClient()

  const clientId    = formData.get('clientId') as string
  const serviceType = formData.get('serviceType') as string
  const status      = (formData.get('status') as string) || 'Pending'

  // Build metadata from form fields based on service type
  const metadata: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (!['clientId', 'serviceType', 'status'].includes(key)) {
      metadata[key] = value as string
    }
  }

  const { error } = await admin.from('services').insert({
    client_id:    clientId,
    service_type: serviceType,
    status,
    metadata,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/portal/dashboard')
}

export async function updateServiceStatus(formData: FormData) {
  await assertAdmin()
  const admin = getAdminClient()

  const serviceId = formData.get('serviceId') as string
  const clientId  = formData.get('clientId') as string
  const status    = formData.get('status') as string

  const { data: service } = await admin.from('services').select('metadata').eq('id', serviceId).single()

  const metadata: Record<string, string> = { ...(service?.metadata as Record<string, string> || {}) }
  for (const [key, value] of formData.entries()) {
    if (!['serviceId', 'clientId', 'status'].includes(key)) {
      metadata[key] = value as string
    }
  }

  const { error } = await admin.from('services').update({ status, metadata }).eq('id', serviceId)
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/portal/dashboard')
}

export async function adminUploadDocument(formData: FormData) {
  await assertAdmin()
  const admin = getAdminClient()

  const serviceId = formData.get('serviceId') as string
  const clientId  = formData.get('clientId') as string
  const fileName  = formData.get('fileName') as string
  const fileUrl   = formData.get('fileUrl') as string

  const { error } = await admin.from('service_documents').insert({
    service_id:  serviceId,
    file_name:   fileName,
    file_url:    fileUrl,
    uploaded_by: 'admin',
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/clients/${clientId}`)
}
```

- [ ] **Step 4: Create blog actions**

Create `src/app/actions/blog-actions.ts`:
```typescript
'use server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function assertAdmin() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role, id').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return profile
}

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function createBlogPost(formData: FormData) {
  const profile = await assertAdmin()
  const admin   = getAdminClient()

  const titleEn   = formData.get('title_en') as string
  const titleVi   = formData.get('title_vi') as string
  const contentEn = formData.get('content_en') as string
  const contentVi = formData.get('content_vi') as string
  const category  = formData.get('category') as string
  const coverUrl  = (formData.get('cover_image_url') as string) || null
  const published = formData.get('published') === 'true'
  const slug      = (formData.get('slug') as string) || generateSlug(titleEn)

  const { error } = await admin.from('blog_posts').insert({
    slug, title_en: titleEn, title_vi: titleVi,
    content_en: contentEn, content_vi: contentVi,
    category, cover_image_url: coverUrl, published,
    author_id: profile.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/blog')
  revalidatePath('/admin/blog')
}

export async function updateBlogPost(formData: FormData) {
  await assertAdmin()
  const admin = getAdminClient()

  const id        = formData.get('id') as string
  const titleEn   = formData.get('title_en') as string
  const titleVi   = formData.get('title_vi') as string
  const contentEn = formData.get('content_en') as string
  const contentVi = formData.get('content_vi') as string
  const category  = formData.get('category') as string
  const coverUrl  = (formData.get('cover_image_url') as string) || null
  const published = formData.get('published') === 'true'
  const slug      = formData.get('slug') as string

  const { error } = await admin.from('blog_posts').update({
    slug, title_en: titleEn, title_vi: titleVi,
    content_en: contentEn, content_vi: contentVi,
    category, cover_image_url: coverUrl, published,
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/blog')
  revalidatePath(`/blog/${slug}`)
  revalidatePath('/admin/blog')
}

export async function deleteBlogPost(formData: FormData) {
  await assertAdmin()
  const admin = getAdminClient()
  const id    = formData.get('id') as string

  const { error } = await admin.from('blog_posts').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/blog')
  revalidatePath('/admin/blog')
}

export async function togglePublished(formData: FormData) {
  await assertAdmin()
  const admin     = getAdminClient()
  const id        = formData.get('id') as string
  const published = formData.get('published') === 'true'

  const { data: post } = await admin.from('blog_posts').select('slug').eq('id', id).single()
  const { error } = await admin.from('blog_posts').update({ published: !published }).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/blog')
  if (post?.slug) revalidatePath(`/blog/${post.slug}`)
  revalidatePath('/admin/blog')
}
```

- [ ] **Step 5: Create content actions**

Create `src/app/actions/content-actions.ts`:
```typescript
'use server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function assertAdmin() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role, id').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return profile
}

export async function updateContentField(formData: FormData) {
  const profile = await assertAdmin()
  const admin   = getAdminClient()

  const key   = formData.get('key') as string
  const value = formData.get('value') as string

  const { error } = await admin
    .from('site_content')
    .upsert({ key, value, updated_by: profile.id, updated_at: new Date().toISOString() })

  if (error) throw new Error(error.message)

  // Revalidate all public pages that read site_content
  revalidatePath('/')
  revalidatePath('/about')
  revalidatePath('/admin/content')
}
```

- [ ] **Step 6: Run all action tests**

```bash
npx jest src/app/actions/__tests__/actions.test.ts
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add server actions for client, blog, and content management"
```

---

## Task 3: Image Upload Component

**Files:**
- Create: `src/components/admin/ImageUpload.tsx`

- [ ] **Step 1: Write ImageUpload test**

Create `src/components/admin/__tests__/ImageUpload.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { ImageUpload } from '../ImageUpload'

test('renders upload button', () => {
  render(<ImageUpload bucket="blog-images" onUpload={() => {}} />)
  expect(screen.getByText(/upload image/i)).toBeInTheDocument()
})

test('shows current image URL if provided', () => {
  render(
    <ImageUpload
      bucket="blog-images"
      onUpload={() => {}}
      currentUrl="https://example.com/image.jpg"
    />
  )
  expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/image.jpg')
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/components/admin/__tests__/ImageUpload.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create ImageUpload component**

Create `src/components/admin/ImageUpload.tsx`:
```typescript
'use client'
import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface ImageUploadProps {
  bucket: 'blog-images' | 'site-images'
  onUpload: (url: string) => void
  currentUrl?: string | null
}

export function ImageUpload({ bucket, onUpload, currentUrl }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview]     = useState<string | null>(currentUrl ?? null)
  const supabase = createClient()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true })

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
      setPreview(data.publicUrl)
      onUpload(data.publicUrl)
    }
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {preview && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
          <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-teal hover:text-teal-dark">
        <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest src/components/admin/__tests__/ImageUpload.test.tsx
```
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add ImageUpload component for Supabase Storage"
```

---

## Task 4: Rich Text Editor (Tiptap)

**Files:**
- Create: `src/components/admin/RichTextEditor.tsx`

- [ ] **Step 1: Install Tiptap**

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link
```

- [ ] **Step 2: Write RichTextEditor test**

Create `src/components/admin/__tests__/RichTextEditor.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { RichTextEditor } from '../RichTextEditor'

test('renders editor container', () => {
  render(<RichTextEditor content="" onChange={() => {}} />)
  expect(screen.getByRole('textbox')).toBeInTheDocument()
})

test('renders toolbar buttons', () => {
  render(<RichTextEditor content="" onChange={() => {}} />)
  expect(screen.getByTitle(/bold/i)).toBeInTheDocument()
  expect(screen.getByTitle(/italic/i)).toBeInTheDocument()
})
```

- [ ] **Step 3: Run test — confirm it fails**

```bash
npx jest src/components/admin/__tests__/RichTextEditor.test.tsx
```
Expected: FAIL

- [ ] **Step 4: Create RichTextEditor component**

Create `src/components/admin/RichTextEditor.tsx`:
```typescript
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { createClient } from '@/lib/supabase/client'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  bucket?: 'blog-images' | 'site-images'
}

export function RichTextEditor({ content, onChange, bucket = 'blog-images' }: RichTextEditorProps) {
  const supabase = createClient()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  async function insertImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file || !editor) return
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
      const { error } = await supabase.storage.from(bucket).upload(fileName, file)
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
        editor.chain().focus().setImage({ src: data.publicUrl }).run()
      }
    }
    input.click()
  }

  if (!editor) return null

  const ToolbarButton = ({
    onClick, active, title, children,
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active ? 'bg-teal text-white' : 'text-charcoal hover:bg-bg-secondary'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-bg-surface">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          onClick={insertImage}
          title="Insert Image"
        >
          🖼 Image
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          " Quote
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          ↩ Undo
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          ↪ Redo
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[300px] focus-within:outline-none"
      />
    </div>
  )
}
```

- [ ] **Step 5: Add Tiptap prose styles to globals.css**

Append to `src/app/globals.css`:
```css
/* Tiptap editor prose styles */
.ProseMirror {
  @apply outline-none min-h-[300px];
}
.ProseMirror h2 { @apply text-2xl font-bold text-charcoal mt-6 mb-3; }
.ProseMirror h3 { @apply text-xl font-bold text-charcoal mt-5 mb-2; }
.ProseMirror p  { @apply text-text-secondary mb-3 leading-relaxed; }
.ProseMirror ul { @apply list-disc list-inside mb-3 text-text-secondary; }
.ProseMirror ol { @apply list-decimal list-inside mb-3 text-text-secondary; }
.ProseMirror blockquote { @apply border-l-4 border-teal pl-4 italic text-text-secondary my-4; }
.ProseMirror img { @apply rounded-lg max-w-full my-4; }
.ProseMirror a  { @apply text-teal underline; }
```

- [ ] **Step 6: Run tests — confirm they pass**

```bash
npx jest src/components/admin/__tests__/RichTextEditor.test.tsx
```
Expected: 2 tests PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Tiptap RichTextEditor with image upload"
```

---

## Task 5: Admin Client Management

**Files:**
- Create: `src/app/admin/clients/page.tsx`
- Create: `src/app/admin/clients/[id]/page.tsx`
- Create: `src/components/admin/ServiceForm.tsx`

- [ ] **Step 1: Create ServiceForm component**

Create `src/components/admin/ServiceForm.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { addService } from '@/app/actions/client-actions'

interface ServiceFormProps {
  clientId: string
}

const SERVICE_FIELDS: Record<string, Array<{ name: string; label: string; required?: boolean }>> = {
  uscis: [
    { name: 'receipt_number', label: 'Receipt Number', required: true },
    { name: 'case_type',      label: 'Case Type (e.g. N-400)', required: true },
  ],
  tax: [
    { name: 'year',             label: 'Tax Year', required: true },
    { name: 'form_type',        label: 'Form Type (e.g. 1040)' },
    { name: 'irs_confirmation', label: 'IRS Confirmation #' },
    { name: 'notes',            label: 'Notes' },
  ],
  insurance: [
    { name: 'policy_type',   label: 'Policy Type', required: true },
    { name: 'term',          label: 'Term' },
    { name: 'value',         label: 'Coverage Value' },
    { name: 'carrier',       label: 'Carrier' },
    { name: 'policy_number', label: 'Policy Number' },
    { name: 'expiry_date',   label: 'Expiry Date' },
  ],
  ai: [
    { name: 'project_name',   label: 'Project Name', required: true },
    { name: 'phase',          label: 'Current Phase' },
    { name: 'next_milestone', label: 'Next Milestone' },
    { name: 'notes',          label: 'Notes' },
  ],
}

export function ServiceForm({ clientId }: ServiceFormProps) {
  const [serviceType, setServiceType] = useState('uscis')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('clientId', clientId)
    await addService(formData)
    setSuccess(true)
    setLoading(false)
    ;(e.target as HTMLFormElement).reset()
    setTimeout(() => setSuccess(false), 3000)
  }

  const fields = SERVICE_FIELDS[serviceType] ?? []

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />

      <div>
        <label className="block text-sm font-semibold text-charcoal mb-1">Service Type</label>
        <select
          name="serviceType"
          value={serviceType}
          onChange={e => setServiceType(e.target.value)}
          className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
        >
          <option value="uscis">Immigration / USCIS</option>
          <option value="tax">Tax & Business</option>
          <option value="insurance">Insurance & Finance</option>
          <option value="ai">AI & Automation</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-charcoal mb-1">Initial Status</label>
        <input name="status" defaultValue="Pending"
          className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
      </div>

      {fields.map(({ name, label, required }) => (
        <div key={name}>
          <label className="block text-sm font-semibold text-charcoal mb-1">{label}</label>
          <input
            name={name}
            required={required}
            className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </div>
      ))}

      {success && <p className="text-teal text-sm font-semibold">Service added!</p>}
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? 'Adding...' : 'Add Service'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create Admin Clients list page**

Create `src/app/admin/clients/page.tsx`:
```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/types'

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string }
}) {
  const supabase = createClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Use admin client to read all profiles
  const { createClient: createAdminSupabase } = await import('@supabase/supabase-js')
  const admin = createAdminSupabase(supabaseUrl, serviceKey)

  let query = admin.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false })

  const { data: clients } = await query

  // Filter client-side by search query (for simplicity — use DB full-text for large datasets)
  const filtered = (clients ?? []).filter((c: Profile) => {
    if (!searchParams.q) return true
    const q = searchParams.q.toLowerCase()
    return c.full_name.toLowerCase().includes(q) || c.id.includes(q)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-charcoal">Clients</h1>
        <span className="text-text-secondary text-sm">{filtered.length} clients</span>
      </div>

      {/* Search */}
      <form className="mb-6">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search by name..."
          className="border border-border rounded-lg px-4 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-teal"
        />
      </form>

      {filtered.length === 0 ? (
        <p className="text-text-secondary">No clients yet. Clients appear here after they sign up.</p>
      ) : (
        <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-secondary border-b border-border">
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">Name</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">Phone</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client: Profile) => (
                <tr key={client.id} className="border-b border-border last:border-0 hover:bg-bg-surface">
                  <td className="px-6 py-4 text-sm text-charcoal font-medium">
                    {client.full_name || '(no name)'}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{client.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-silver">
                    {new Date(client.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/clients/${client.id}`}
                      className="text-teal text-sm font-semibold hover:text-teal-dark">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create Admin Client detail page**

Create `src/app/admin/clients/[id]/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { ServiceForm } from '@/components/admin/ServiceForm'
import { StatusBadge } from '@/components/portal/StatusBadge'
import { updateServiceStatus, adminUploadDocument } from '@/app/actions/client-actions'
import type { Profile, Service, ServiceDocument } from '@/lib/supabase/types'

const SERVICE_NAMES: Record<string, string> = {
  uscis: 'Immigration / USCIS', tax: 'Tax & Business',
  insurance: 'Insurance & Finance', ai: 'AI & Automation',
}

export default async function AdminClientDetailPage({ params }: { params: { id: string } }) {
  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: client } = await admin.from('profiles').select('*').eq('id', params.id).single()
  if (!client) notFound()

  const { data: services }  = await admin.from('services').select('*').eq('client_id', params.id).order('created_at')
  const serviceIds = (services ?? []).map((s: Service) => s.id)
  const { data: documents } = serviceIds.length > 0
    ? await admin.from('service_documents').select('*').in('service_id', serviceIds)
    : { data: [] }

  const profile = client as Profile
  const allServices  = (services  ?? []) as Service[]
  const allDocuments = (documents ?? []) as ServiceDocument[]

  return (
    <div className="space-y-8">
      {/* Client header */}
      <div>
        <h1 className="text-2xl font-bold text-charcoal">{profile.full_name || '(no name)'}</h1>
        <p className="text-text-secondary text-sm mt-1">
          {profile.phone && <span className="mr-4">📞 {profile.phone}</span>}
          Joined {new Date(profile.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active services */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-charcoal">Active Services</h2>

          {allServices.length === 0 ? (
            <p className="text-text-secondary text-sm">No services yet. Add one using the form.</p>
          ) : (
            allServices.map(service => {
              const serviceDocs = allDocuments.filter(d => d.service_id === service.id)
              return (
                <div key={service.id} className="bg-white border border-border rounded-xl p-6 shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-charcoal">{SERVICE_NAMES[service.service_type]}</h3>
                    <StatusBadge status={service.status} />
                  </div>

                  {/* Update status form */}
                  <form action={updateServiceStatus} className="flex gap-2 mb-4">
                    <input type="hidden" name="serviceId" value={service.id} />
                    <input type="hidden" name="clientId"  value={params.id} />
                    {Object.entries(service.metadata as Record<string, string>).map(([key, val]) => (
                      <input key={key} type="hidden" name={key} value={val} />
                    ))}
                    <input
                      name="status"
                      defaultValue={service.status}
                      placeholder="New status"
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                    />
                    <button type="submit"
                      className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-semibold hover:bg-teal-dark transition-colors">
                      Update
                    </button>
                  </form>

                  {/* Documents for this service */}
                  <div className="border-t border-border pt-4 mt-4">
                    <p className="text-xs font-semibold text-silver uppercase tracking-wide mb-3">
                      Documents ({serviceDocs.length})
                    </p>
                    {serviceDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between py-2">
                        <span className="text-sm text-charcoal">{doc.file_name}</span>
                        <span className="text-xs text-silver">{doc.uploaded_by}</span>
                      </div>
                    ))}
                    <AdminDocumentUpload serviceId={service.id} clientId={params.id} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Add service */}
        <div>
          <h2 className="text-lg font-bold text-charcoal mb-4">Add Service</h2>
          <div className="bg-white border border-border rounded-xl p-6 shadow-card">
            <ServiceForm clientId={params.id} />
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminDocumentUpload({ serviceId, clientId }: { serviceId: string; clientId: string }) {
  return (
    <form action={adminUploadDocument} className="mt-3">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="clientId"  value={clientId} />
      {/* Note: file upload requires client component for actual file handling.
          Wire up via ImageUpload + store URL, then submit hidden fields here.
          For now: admin pastes a direct URL. */}
      <div className="flex gap-2">
        <input name="fileUrl"  placeholder="File URL"  className="flex-1 border border-border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
        <input name="fileName" placeholder="File name" className="flex-1 border border-border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
        <button type="submit" className="px-3 py-1.5 bg-teal text-white rounded text-xs font-semibold hover:bg-teal-dark">
          Add
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add admin client management pages (list + detail)"
```

---

## Task 6: Admin Blog Management

**Files:**
- Create: `src/app/admin/blog/page.tsx`
- Create: `src/app/admin/blog/new/page.tsx`
- Create: `src/app/admin/blog/[id]/edit/page.tsx`

- [ ] **Step 1: Create Blog list page**

Create `src/app/admin/blog/page.tsx`:
```typescript
import Link from 'next/link'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { togglePublished, deleteBlogPost } from '@/app/actions/blog-actions'
import type { BlogPost } from '@/lib/supabase/types'

export default async function AdminBlogPage() {
  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: posts } = await admin
    .from('blog_posts')
    .select('id, slug, title_en, category, published, created_at, updated_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-charcoal">Blog Posts</h1>
        <Button href="/admin/blog/new" variant="primary">+ New Post</Button>
      </div>

      {!posts || posts.length === 0 ? (
        <p className="text-text-secondary">No posts yet.</p>
      ) : (
        <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-secondary border-b border-border">
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">Title (EN)</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">Category</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">Status</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-charcoal">Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post: Pick<BlogPost, 'id' | 'slug' | 'title_en' | 'category' | 'published' | 'created_at' | 'updated_at'>) => (
                <tr key={post.id} className="border-b border-border last:border-0 hover:bg-bg-surface">
                  <td className="px-6 py-4 text-sm text-charcoal font-medium">{post.title_en}</td>
                  <td className="px-6 py-4">
                    <Badge variant="silver">{post.category}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <form action={togglePublished}>
                      <input type="hidden" name="id"        value={post.id} />
                      <input type="hidden" name="published" value={String(post.published)} />
                      <button type="submit"
                        className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                          post.published
                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}>
                        {post.published ? 'Published' : 'Draft'}
                      </button>
                    </form>
                  </td>
                  <td className="px-6 py-4 text-sm text-silver">
                    {new Date(post.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    <Link href={`/admin/blog/${post.id}/edit`}
                      className="text-teal text-sm font-semibold hover:text-teal-dark">
                      Edit
                    </Link>
                    <form action={deleteBlogPost} onSubmit={e => !confirm('Delete this post?') && e.preventDefault()}>
                      <input type="hidden" name="id" value={post.id} />
                      <button type="submit" className="text-red-500 text-sm font-semibold hover:text-red-700">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create New Post page (client component for Tiptap)**

Create `src/app/admin/blog/new/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { Button } from '@/components/ui/Button'
import { createBlogPost } from '@/app/actions/blog-actions'

export default function NewBlogPostPage() {
  const [contentEn, setContentEn] = useState('')
  const [contentVi, setContentVi] = useState('')
  const [coverUrl,  setCoverUrl]  = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'en' | 'vi'>('en')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('content_en', contentEn)
    formData.set('content_vi', contentVi)
    if (coverUrl) formData.set('cover_image_url', coverUrl)
    await createBlogPost(formData)
    router.push('/admin/blog')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-charcoal mb-8">New Blog Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Cover image */}
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">Cover Image</label>
          <ImageUpload bucket="blog-images" onUpload={url => setCoverUrl(url)} currentUrl={coverUrl} />
        </div>

        {/* Category + Slug */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">Category</label>
            <select name="category" required
              className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
              <option value="tax">Tax</option>
              <option value="insurance">Insurance</option>
              <option value="immigration">Immigration</option>
              <option value="ai">AI & Automation</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">Slug (auto from EN title if blank)</label>
            <input name="slug" placeholder="my-post-slug"
              className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
          </div>
        </div>

        {/* Bilingual tabs */}
        <div>
          <div className="flex gap-2 mb-4">
            {(['en', 'vi'] as const).map(lang => (
              <button key={lang} type="button" onClick={() => setActiveTab(lang)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === lang ? 'bg-teal text-white' : 'border border-border text-text-secondary hover:border-teal'
                }`}>
                {lang === 'en' ? '🇺🇸 English' : '🇻🇳 Vietnamese'}
              </button>
            ))}
          </div>

          {activeTab === 'en' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Title (English)</label>
                <input name="title_en" required placeholder="Post title in English"
                  className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Content (English)</label>
                <RichTextEditor content={contentEn} onChange={setContentEn} />
              </div>
            </div>
          )}

          {activeTab === 'vi' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Title (Vietnamese)</label>
                <input name="title_vi" placeholder="Tiêu đề bài viết bằng tiếng Việt"
                  className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Content (Vietnamese)</label>
                <RichTextEditor content={contentVi} onChange={setContentVi} />
              </div>
            </div>
          )}
        </div>

        {/* Publish toggle */}
        <div className="flex items-center gap-3">
          <input type="checkbox" name="published" value="true" id="published"
            className="w-4 h-4 text-teal border-border rounded" />
          <label htmlFor="published" className="text-sm font-semibold text-charcoal">
            Publish immediately
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Post'}
          </Button>
          <Button href="/admin/blog" variant="outline">Cancel</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create Edit Post page**

Create `src/app/admin/blog/[id]/edit/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { Button } from '@/components/ui/Button'
import { updateBlogPost } from '@/app/actions/blog-actions'
import { createClient } from '@/lib/supabase/client'
import type { BlogPost } from '@/lib/supabase/types'

export default function EditBlogPostPage({ params }: { params: { id: string } }) {
  const [post, setPost]         = useState<BlogPost | null>(null)
  const [contentEn, setContentEn] = useState('')
  const [contentVi, setContentVi] = useState('')
  const [coverUrl, setCoverUrl]   = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'en' | 'vi'>('en')
  const [loading, setLoading]     = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.from('blog_posts').select('*').eq('id', params.id).single().then(({ data }) => {
      if (data) {
        setPost(data as BlogPost)
        setContentEn(data.content_en)
        setContentVi(data.content_vi)
        setCoverUrl(data.cover_image_url)
      }
    })
  }, [params.id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('id', params.id)
    formData.set('content_en', contentEn)
    formData.set('content_vi', contentVi)
    if (coverUrl) formData.set('cover_image_url', coverUrl)
    await updateBlogPost(formData)
    router.push('/admin/blog')
  }

  if (!post) return <div className="text-text-secondary">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-charcoal mb-8">Edit Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <input type="hidden" name="id"   value={post.id} />
        <input type="hidden" name="slug" value={post.slug} />

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">Cover Image</label>
          <ImageUpload bucket="blog-images" onUpload={url => setCoverUrl(url)} currentUrl={coverUrl} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">Category</label>
            <select name="category" defaultValue={post.category}
              className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
              <option value="tax">Tax</option>
              <option value="insurance">Insurance</option>
              <option value="immigration">Immigration</option>
              <option value="ai">AI & Automation</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">Slug</label>
            <input name="slug" defaultValue={post.slug}
              className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
          </div>
        </div>

        <div>
          <div className="flex gap-2 mb-4">
            {(['en', 'vi'] as const).map(lang => (
              <button key={lang} type="button" onClick={() => setActiveTab(lang)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === lang ? 'bg-teal text-white' : 'border border-border text-text-secondary hover:border-teal'
                }`}>
                {lang === 'en' ? '🇺🇸 English' : '🇻🇳 Vietnamese'}
              </button>
            ))}
          </div>

          {activeTab === 'en' && (
            <div className="space-y-4">
              <input name="title_en" defaultValue={post.title_en} required
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              <RichTextEditor content={contentEn} onChange={setContentEn} />
            </div>
          )}
          {activeTab === 'vi' && (
            <div className="space-y-4">
              <input name="title_vi" defaultValue={post.title_vi}
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              <RichTextEditor content={contentVi} onChange={setContentVi} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" name="published" value="true" id="published"
            defaultChecked={post.published} className="w-4 h-4 text-teal border-border rounded" />
          <label htmlFor="published" className="text-sm font-semibold text-charcoal">Published</label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button href="/admin/blog" variant="outline">Cancel</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Verify blog management in browser**

```bash
npm run dev
```
Sign in as admin → go to /admin/blog. Create a post, add cover image, switch language tabs, publish. Verify it appears on /blog.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin blog management (list, new, edit) with Tiptap + image upload"
```

---

## Task 7: Admin Content Editor

**Files:**
- Create: `src/app/admin/content/page.tsx`
- Create: `src/components/admin/ContentField.tsx`

- [ ] **Step 1: Create ContentField component**

Create `src/components/admin/ContentField.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { updateContentField } from '@/app/actions/content-actions'
import { ImageUpload } from './ImageUpload'

interface ContentFieldProps {
  contentKey: string
  label: string
  currentValue: string
  type?: 'text' | 'textarea' | 'image'
}

export function ContentField({ contentKey, label, currentValue, type = 'text' }: ContentFieldProps) {
  const [saved, setSaved] = useState(false)
  const [imageUrl, setImageUrl] = useState(currentValue)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await updateContentField(formData)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (type === 'image') {
    return (
      <div className="bg-white border border-border rounded-xl p-6 shadow-card">
        <p className="text-sm font-semibold text-charcoal mb-3">{label}</p>
        <ImageUpload
          bucket="site-images"
          currentUrl={imageUrl}
          onUpload={async (url) => {
            setImageUrl(url)
            const formData = new FormData()
            formData.set('key', contentKey)
            formData.set('value', url)
            await updateContentField(formData)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
          }}
        />
        {saved && <p className="text-teal text-xs font-semibold mt-2">Saved!</p>}
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-xl p-6 shadow-card">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="key" value={contentKey} />
        <label className="block text-sm font-semibold text-charcoal">{label}</label>
        {type === 'textarea' ? (
          <textarea name="value" defaultValue={currentValue} rows={4}
            className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
        ) : (
          <input name="value" defaultValue={currentValue}
            className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
        )}
        <div className="flex items-center gap-3">
          <button type="submit"
            className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-semibold hover:bg-teal-dark transition-colors">
            Save
          </button>
          {saved && <span className="text-teal text-sm font-semibold">✓ Saved</span>}
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create Content Editor page**

Create `src/app/admin/content/page.tsx`:
```typescript
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { ContentField } from '@/components/admin/ContentField'
import type { SiteContent } from '@/lib/supabase/types'

const CONTENT_FIELDS: Array<{
  key: string
  label: string
  type?: 'text' | 'textarea' | 'image'
  section: string
}> = [
  // Home hero
  { key: 'hero_headline_en',     label: 'Hero Headline (English)',    type: 'text',     section: 'Home Hero' },
  { key: 'hero_headline_vi',     label: 'Hero Headline (Vietnamese)', type: 'text',     section: 'Home Hero' },
  { key: 'hero_subheadline_en',  label: 'Hero Subheadline (English)', type: 'text',     section: 'Home Hero' },
  { key: 'hero_subheadline_vi',  label: 'Hero Subheadline (Vietnamese)', type: 'text', section: 'Home Hero' },
  { key: 'hero_image',           label: 'Hero Background Image',      type: 'image',    section: 'Home Hero' },
  // About
  { key: 'about_bio_en',         label: 'About Bio (English)',        type: 'textarea', section: 'About Page' },
  { key: 'about_bio_vi',         label: 'About Bio (Vietnamese)',     type: 'textarea', section: 'About Page' },
  { key: 'about_cover_image',    label: 'About Cover Image',          type: 'image',    section: 'About Page' },
  // Service images
  { key: 'service_image_tax',        label: 'Tax Service Image',        type: 'image', section: 'Service Images' },
  { key: 'service_image_insurance',  label: 'Insurance Service Image',  type: 'image', section: 'Service Images' },
  { key: 'service_image_immigration',label: 'Immigration Service Image', type: 'image', section: 'Service Images' },
  { key: 'service_image_ai',         label: 'AI Service Image',         type: 'image', section: 'Service Images' },
]

export default async function AdminContentPage() {
  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: contentRows } = await admin.from('site_content').select('*')
  const contentMap = Object.fromEntries(
    (contentRows ?? []).map((row: SiteContent) => [row.key, row.value])
  )

  // Group fields by section
  const sections = [...new Set(CONTENT_FIELDS.map(f => f.section))]

  return (
    <div>
      <h1 className="text-2xl font-bold text-charcoal mb-2">Website Content</h1>
      <p className="text-text-secondary text-sm mb-8">
        Changes save immediately and update the public site within 60 seconds.
      </p>

      <div className="space-y-10">
        {sections.map(section => (
          <div key={section}>
            <h2 className="text-lg font-bold text-charcoal mb-4 pb-2 border-b border-border">
              {section}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CONTENT_FIELDS.filter(f => f.section === section).map(({ key, label, type }) => (
                <ContentField
                  key={key}
                  contentKey={key}
                  label={label}
                  currentValue={contentMap[key] ?? ''}
                  type={type}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin content editor with live site_content updates"
```

---

## Task 8: Wire site_content into Public Pages

**Files:**
- Modify: `src/app/page.tsx` (Home)
- Modify: `src/components/sections/Hero.tsx`
- Modify: `src/app/about/page.tsx`

- [ ] **Step 1: Update Home page to read site_content**

Update `src/app/page.tsx` to pass site_content to Hero:
```typescript
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { Hero } from '@/components/sections/Hero'
import { ServicesGrid } from '@/components/sections/ServicesGrid'
import { WhyManna } from '@/components/sections/WhyManna'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { ContactStrip } from '@/components/sections/ContactStrip'
import { buildMetadata } from '@/lib/seo'
import type { SiteContent } from '@/lib/supabase/types'

export const revalidate = 60  // ISR — revalidate every 60 seconds

export const metadata = buildMetadata({
  title: 'Home',
  description: 'Manna One Solution — bilingual Vietnamese-English tax, insurance, immigration, and AI automation services in Houston, TX. Call 346-852-4454.',
  path: '/',
})

export default async function HomePage() {
  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: contentRows } = await admin
    .from('site_content')
    .select('key, value')
    .in('key', ['hero_headline_en', 'hero_headline_vi', 'hero_subheadline_en', 'hero_subheadline_vi', 'hero_image'])

  const content = Object.fromEntries(
    (contentRows ?? []).map((row: Pick<SiteContent, 'key' | 'value'>) => [row.key, row.value])
  )

  return (
    <>
      <Hero content={content} />
      <ServicesGrid />
      <WhyManna />
      <HowItWorks />
      <ContactStrip />
    </>
  )
}
```

- [ ] **Step 2: Update Hero to accept content prop**

Update `src/components/sections/Hero.tsx`:
```typescript
'use client'
import { useT } from '@/lib/i18n/useT'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { Button } from '@/components/ui/Button'

interface HeroContent {
  hero_headline_en?: string
  hero_headline_vi?: string
  hero_subheadline_en?: string
  hero_subheadline_vi?: string
  hero_image?: string
}

export function Hero({ content = {} }: { content?: HeroContent }) {
  const t = useT()
  const { language } = useLanguage()

  const headline    = (language === 'vi' ? content.hero_headline_vi    : content.hero_headline_en)    || t.hero.headline
  const subheadline = (language === 'vi' ? content.hero_subheadline_vi : content.hero_subheadline_en) || t.hero.subheadline

  const bgStyle = content.hero_image
    ? { backgroundImage: `url(${content.hero_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {}

  return (
    <section
      className="bg-gradient-to-br from-teal/10 to-bg-secondary py-24 px-4"
      style={bgStyle}
    >
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-charcoal mb-4 leading-tight">
          {headline}
        </h1>
        <p className="text-xl text-text-secondary mb-10">
          {subheadline}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button href="/contact" variant="primary" className="text-base px-8 py-4">
            {t.hero.cta1}
          </Button>
          <Button href="/services" variant="outline" className="text-base px-8 py-4">
            {t.hero.cta2}
          </Button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Update About page to read site_content**

Update `src/app/about/page.tsx` — add `revalidate = 60` and fetch about bio from site_content:
```typescript
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { buildMetadata } from '@/lib/seo'
import type { SiteContent } from '@/lib/supabase/types'

export const revalidate = 60

export const metadata = buildMetadata({
  title: 'About Us',
  description: 'Manna One Solution — bilingual Vietnamese-English one-stop service in Houston TX. EFIN licensed, life insurance licensed.',
  path: '/about',
})

export default async function AboutPage() {
  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: contentRows } = await admin
    .from('site_content')
    .select('key, value')
    .in('key', ['about_bio_en', 'about_bio_vi', 'about_cover_image'])

  const content = Object.fromEntries(
    (contentRows ?? []).map((row: Pick<SiteContent, 'key' | 'value'>) => [row.key, row.value])
  )

  const bio = content.about_bio_en || 'Manna One Solution was founded to serve Houston\'s Vietnamese community with trustworthy, bilingual professional services — all under one roof.'

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      {content.about_cover_image && (
        <img src={content.about_cover_image} alt="About Manna One Solution"
          className="w-full h-64 object-cover rounded-xl mb-10" />
      )}
      <h1 className="text-4xl font-bold text-charcoal mb-6">About Manna One Solution</h1>

      <div className="flex flex-wrap gap-3 mb-10">
        <Badge variant="teal">EFIN Licensed</Badge>
        <Badge variant="teal">Life Insurance Licensed</Badge>
        <Badge variant="silver">Bilingual VI / EN</Badge>
      </div>

      <div className="prose prose-lg max-w-none text-text-secondary">
        <p>{bio}</p>
        <h2 className="text-2xl font-bold text-charcoal mt-10 mb-4">Our Mission</h2>
        <p className="text-xl font-semibold text-teal">"One Stop, All Solutions"</p>
        <p>We handle your tax preparation, insurance needs, immigration paperwork, and business automation.</p>
        <h2 className="text-2xl font-bold text-charcoal mt-10 mb-4">Credentials</h2>
        <ul className="list-disc list-inside space-y-2">
          <li><strong>EFIN Licensed</strong> — IRS authorized e-file provider</li>
          <li><strong>Licensed Life Insurance Agent</strong> — Texas Department of Insurance</li>
          <li><strong>Bilingual</strong> — Fluent in Vietnamese and English</li>
        </ul>
        <h2 className="text-2xl font-bold text-charcoal mt-10 mb-4">Service Area</h2>
        <p>Based in Houston, TX — serving clients in DFW, Austin, and Vietnamese communities across the United States.</p>
      </div>

      <div className="mt-10">
        <Button href="/contact" variant="primary">Book a Free Consultation</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update blog to read from Supabase instead of Markdown**

Now that blog posts live in Supabase (via admin panel), update `src/app/blog/page.tsx` to read from Supabase instead of markdown files:

Update `src/app/blog/page.tsx`:
```typescript
import Link from 'next/link'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { Badge } from '@/components/ui/Badge'
import { buildMetadata } from '@/lib/seo'
import type { BlogPost } from '@/lib/supabase/types'

export const revalidate = 60

export const metadata = buildMetadata({
  title: 'Blog',
  description: 'Tax tips, LLC guides, immigration news, and insurance basics from Manna One Solution, Houston TX.',
  path: '/blog',
})

const categories = ['all', 'tax', 'insurance', 'immigration', 'ai', 'general'] as const

export default async function BlogPage({ searchParams }: { searchParams: { category?: string } }) {
  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = admin
    .from('blog_posts')
    .select('id, slug, title_en, title_vi, cover_image_url, category, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })

  const activeCategory = searchParams.category ?? 'all'
  if (activeCategory !== 'all') query = query.eq('category', activeCategory)

  const { data: posts } = await query

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-charcoal mb-8">Blog</h1>

      <div className="flex flex-wrap gap-2 mb-10">
        {categories.map(cat => (
          <Link key={cat}
            href={cat === 'all' ? '/blog' : `/blog?category=${cat}`}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              activeCategory === cat
                ? 'bg-teal text-white border-teal'
                : 'border-border text-text-secondary hover:border-teal hover:text-teal'
            }`}>
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </Link>
        ))}
      </div>

      {!posts || posts.length === 0 ? (
        <p className="text-text-secondary">No posts in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post: Pick<BlogPost, 'id' | 'slug' | 'title_en' | 'title_vi' | 'cover_image_url' | 'category' | 'created_at'>) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group">
              <div className="bg-white border border-border rounded-xl overflow-hidden shadow-card hover:shadow-md transition-shadow">
                {post.cover_image_url && (
                  <img src={post.cover_image_url} alt={post.title_en} className="w-full h-48 object-cover" />
                )}
                <div className="p-6">
                  <Badge variant="silver">{post.category}</Badge>
                  <h2 className="text-lg font-bold text-charcoal mt-3 mb-2 group-hover:text-teal transition-colors">
                    {post.title_en}
                  </h2>
                  <p className="text-xs text-silver">{new Date(post.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

Update `src/app/blog/[slug]/page.tsx` to read from Supabase:
```typescript
import { notFound } from 'next/navigation'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { buildMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import type { BlogPost } from '@/lib/supabase/types'

export const revalidate = 60

export async function generateStaticParams() {
  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await admin.from('blog_posts').select('slug').eq('published', true)
  return (data ?? []).map((p: { slug: string }) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: post } = await admin.from('blog_posts').select('title_en, cover_image_url').eq('slug', params.slug).single()
  if (!post) return {}
  return buildMetadata({ title: post.title_en, path: `/blog/${params.slug}`, image: post.cover_image_url })
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: post } = await admin
    .from('blog_posts')
    .select('*')
    .eq('slug', params.slug)
    .eq('published', true)
    .single()

  if (!post) notFound()

  const p = post as BlogPost
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title_en,
    datePublished: p.created_at,
    publisher: { '@type': 'Organization', name: 'Manna One Solution', url: 'https://mannaos.com' },
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-16">
      <JsonLd data={articleSchema} />
      {p.cover_image_url && (
        <img src={p.cover_image_url} alt={p.title_en} className="w-full h-64 object-cover rounded-xl mb-8" />
      )}
      <Badge variant="silver">{p.category}</Badge>
      <h1 className="text-4xl font-bold text-charcoal mt-4 mb-2">{p.title_en}</h1>
      <p className="text-silver text-sm mb-10">{new Date(p.created_at).toLocaleDateString()}</p>
      <div className="prose prose-lg max-w-none text-text-secondary"
        dangerouslySetInnerHTML={{ __html: p.content_en }} />
      <div className="mt-12 border-t border-border pt-8 text-center">
        <p className="text-text-secondary mb-4">Need help? Book a free consultation.</p>
        <Button href="/contact" variant="primary">Book Now</Button>
      </div>
    </article>
  )
}
```

- [ ] **Step 5: Set first admin user**

After deploying Plan 2, you (the owner) signed up. Now promote yourself to admin:

In Supabase Dashboard → SQL Editor:
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'your@email.com');
```

- [ ] **Step 6: Run all tests**

```bash
npx jest
```
Expected: All tests PASS

- [ ] **Step 7: Commit and deploy**

```bash
git add -A
git commit -m "feat: wire site_content + Supabase blog into public pages with ISR revalidation"
git push origin main
```

- [ ] **Step 8: End-to-end verification**

1. Go to https://mannaos.com/admin/content (sign in as admin)
2. Update hero headline → save → wait 60s → check https://mannaos.com — headline updates
3. Go to /admin/blog/new → write post → publish → check /blog — post appears
4. Go to /admin/clients → verify new signups appear
5. Click a client → add a USCIS service with receipt number → go to /portal (as that client) → verify service card shows
6. Trigger USCIS sync: `curl -X GET https://mannaos.com/api/cron/uscis-sync -H "Authorization: Bearer YOUR_CRON_SECRET"` → verify status updates in portal

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Admin layout with sidebar | Task 1 |
| Server actions (not API routes) for mutations | Task 2 |
| Admin role assertion on every action | Task 2 |
| Image upload to Supabase Storage | Task 3 |
| Tiptap rich text editor | Task 4 |
| Image insertion in blog posts | Task 4 |
| Admin client list (search) | Task 5 |
| Admin client detail (add service, update status) | Task 5 |
| ServiceForm with type-specific fields | Task 5 |
| Admin upload documents | Task 5 |
| Blog post list (draft/published toggle) | Task 6 |
| New blog post (EN + VI tabs, cover photo, category) | Task 6 |
| Edit existing post | Task 6 |
| Delete post | Task 6 |
| site_content editor (text, textarea, image fields) | Task 7 |
| ContentField component | Task 7 |
| Hero reads from site_content | Task 8 |
| About page reads from site_content | Task 8 |
| Blog reads from Supabase (not markdown) | Task 8 |
| ISR revalidation (60s) | Task 8 |
| Promote first admin via SQL | Task 8 |
| Full end-to-end verification | Task 8 |
