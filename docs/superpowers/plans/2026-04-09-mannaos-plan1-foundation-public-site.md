# MannaOS.com — Plan 1: Foundation & Public Marketing Site

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the MannaOS.com Next.js project and build all public-facing pages (Home, Services, About, Contact, Blog) with bilingual support, SEO/GEO, and Vercel deployment.

**Architecture:** Next.js 14 App Router with Tailwind CSS. Bilingual system via a simple React context (localStorage-persisted, EN default). Public pages statically generated. Blog posts loaded from local Markdown files. No auth in this plan.

**Tech Stack:** Next.js 14, Tailwind CSS, TypeScript, gray-matter + remark (blog), Formspree (contact form), Calendly (booking embed), next-sitemap, Vercel.

> **Note:** This plan creates a new git repository separate from the business-planning notes repo. The website codebase lives at its own repo (e.g. `github.com/ChrisNguyenUS/mannaos-web`).

---

## File Map

```
mannaos-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  Root layout — fonts, i18n provider, metadata
│   │   ├── globals.css                 Tailwind base + custom CSS variables
│   │   ├── page.tsx                    Home page
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── services/
│   │   │   ├── page.tsx                Services overview
│   │   │   ├── tax/page.tsx
│   │   │   ├── insurance/page.tsx
│   │   │   ├── immigration/page.tsx
│   │   │   └── ai/page.tsx
│   │   └── blog/
│   │       ├── page.tsx                Blog list
│   │       └── [slug]/page.tsx         Blog post
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx              Logo, nav links, language toggle, Book Now, Sign In
│   │   │   └── Footer.tsx              Logo, links, contact info, copyright
│   │   ├── ui/
│   │   │   ├── Button.tsx              Teal primary, teal-outline secondary variants
│   │   │   ├── Card.tsx                White card with teal border + drop shadow
│   │   │   ├── Badge.tsx               Silver/teal pill badges
│   │   │   └── FloatingButtons.tsx     Fixed bottom-right: phone + Facebook
│   │   ├── seo/
│   │   │   ├── JsonLd.tsx              Injects <script type="application/ld+json">
│   │   │   ├── LocalBusinessSchema.tsx Manna One Solution local business JSON-LD
│   │   │   └── FaqSchema.tsx           FAQ section + JSON-LD schema combined
│   │   └── sections/
│   │       ├── Hero.tsx                Full-width hero, headline, 2 CTAs
│   │       ├── ServicesGrid.tsx        4-card service overview grid
│   │       ├── WhyManna.tsx            4 trust-point grid
│   │       ├── HowItWorks.tsx          3-step process
│   │       └── ContactStrip.tsx        Phone, Facebook, inline form
│   ├── lib/
│   │   ├── i18n/
│   │   │   ├── LanguageContext.tsx     React context — active language + toggle fn
│   │   │   ├── useT.ts                 Hook: useT() returns t(key) translation fn
│   │   │   ├── en.ts                   All English strings
│   │   │   └── vi.ts                   All Vietnamese strings (same keys)
│   │   ├── seo.ts                      buildMetadata(page) helper
│   │   └── blog.ts                     getAllPosts(), getPostBySlug() — reads /content/blog/
│   └── types/
│       └── index.ts                    BlogPost, ServiceType, Language types
├── content/
│   └── blog/
│       └── 2026-04-09-welcome.md       Seed post
├── public/
│   ├── logo.png                        Logo-Picsart-BackgroundRemover.PNG (rename on copy)
│   ├── logo-og.png                     Logo.PNG (rename on copy) — for OG images
│   ├── llms.txt                        GEO — AI crawler entity description
│   └── robots.txt
├── next.config.ts
├── tailwind.config.ts
├── next-sitemap.config.js
├── jest.config.ts
├── jest.setup.ts
└── .env.local.example
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `mannaos-web/` (new repo)
- Create: `next.config.ts`, `tailwind.config.ts`, `jest.config.ts`, `jest.setup.ts`, `.env.local.example`

- [ ] **Step 1: Create Next.js project**

```bash
npx create-next-app@latest mannaos-web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd mannaos-web
```

- [ ] **Step 2: Install dependencies**

```bash
npm install gray-matter remark remark-html
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @types/jest
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Create .env.local.example**

```bash
cat > .env.local.example << 'EOF'
# Supabase (needed in Plan 2 — leave empty for Plan 1)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Formspree form ID
NEXT_PUBLIC_FORMSPREE_ID=your_form_id

# Calendly URL
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/mannaonesolution/15min
EOF
cp .env.local.example .env.local
```

- [ ] **Step 5: Init git repo and commit scaffold**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project"
```

---

## Task 2: Design Tokens & Global Styles

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Write test for CSS variables existence**

Create `src/lib/__tests__/design-tokens.test.ts`:
```typescript
// Smoke test — verifies token file exports expected color keys
import tokens from '../design-tokens'

test('exports required color tokens', () => {
  expect(tokens.teal).toBe('#2A9090')
  expect(tokens.charcoal).toBe('#1A1A1A')
  expect(tokens.silver).toBe('#8A9BA8')
  expect(tokens.bgPrimary).toBe('#FFFFFF')
  expect(tokens.bgSecondary).toBe('#F0F7F7')
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/lib/__tests__/design-tokens.test.ts
```
Expected: FAIL — `Cannot find module '../design-tokens'`

- [ ] **Step 3: Create design tokens file**

Create `src/lib/design-tokens.ts`:
```typescript
const tokens = {
  teal:          '#2A9090',
  tealDark:      '#1A6060',
  charcoal:      '#1A1A1A',
  silver:        '#8A9BA8',
  bgPrimary:     '#FFFFFF',
  bgSecondary:   '#F0F7F7',
  bgSurface:     '#F8FAFA',
  textPrimary:   '#1A1A1A',
  textSecondary: '#4A6868',
  border:        '#D0E4E4',
} as const

export default tokens
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/lib/__tests__/design-tokens.test.ts
```
Expected: PASS

- [ ] **Step 5: Extend Tailwind config with brand tokens**

Replace content of `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#2A9090',
          dark:    '#1A6060',
        },
        charcoal: '#1A1A1A',
        silver:   '#8A9BA8',
        bg: {
          primary:   '#FFFFFF',
          secondary: '#F0F7F7',
          surface:   '#F8FAFA',
        },
        text: {
          primary:   '#1A1A1A',
          secondary: '#4A6868',
        },
        border: '#D0E4E4',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(42, 144, 144, 0.10)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 6: Update globals.css**

Replace content of `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@layer base {
  body {
    @apply bg-bg-primary text-text-primary font-sans;
  }
  h1, h2, h3, h4, h5, h6 {
    @apply font-bold text-charcoal;
  }
}

@layer components {
  .section-alt {
    @apply bg-bg-secondary;
  }
  .section-surface {
    @apply bg-bg-surface;
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add design system tokens and Tailwind config"
```

---

## Task 3: Type Definitions

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create types**

Create `src/types/index.ts`:
```typescript
export type Language = 'en' | 'vi'

export type ServiceType = 'tax' | 'insurance' | 'immigration' | 'ai'

export interface BlogPost {
  slug: string
  title: string
  titleVi: string
  date: string
  category: ServiceType | 'general'
  excerpt: string
  excerptVi: string
  content: string       // rendered HTML (English)
  contentVi: string     // rendered HTML (Vietnamese)
  coverImage?: string
}

export interface FaqItem {
  question: string
  answer: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 4: Bilingual System (i18n)

**Files:**
- Create: `src/lib/i18n/LanguageContext.tsx`
- Create: `src/lib/i18n/useT.ts`
- Create: `src/lib/i18n/en.ts`
- Create: `src/lib/i18n/vi.ts`

- [ ] **Step 1: Write tests for i18n context**

Create `src/lib/i18n/__tests__/i18n.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider, useLanguage } from '../LanguageContext'
import { useT } from '../useT'

// Test component
function TestComponent() {
  const { language, toggleLanguage } = useLanguage()
  const t = useT()
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="hello">{t('nav.home')}</span>
      <button onClick={toggleLanguage}>toggle</button>
    </div>
  )
}

describe('i18n', () => {
  beforeEach(() => localStorage.clear())

  test('defaults to English', () => {
    render(<LanguageProvider><TestComponent /></LanguageProvider>)
    expect(screen.getByTestId('lang').textContent).toBe('en')
  })

  test('toggle switches to Vietnamese', () => {
    render(<LanguageProvider><TestComponent /></LanguageProvider>)
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('lang').textContent).toBe('vi')
  })

  test('toggle switches back to English', () => {
    render(<LanguageProvider><TestComponent /></LanguageProvider>)
    fireEvent.click(screen.getByText('toggle'))
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('lang').textContent).toBe('en')
  })

  test('t() returns English string for nav.home', () => {
    render(<LanguageProvider><TestComponent /></LanguageProvider>)
    expect(screen.getByTestId('hello').textContent).toBe('Home')
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/lib/i18n/__tests__/i18n.test.tsx
```
Expected: FAIL — modules not found

- [ ] **Step 3: Create English translations**

Create `src/lib/i18n/en.ts`:
```typescript
const en = {
  nav: {
    home: 'Home',
    services: 'Services',
    about: 'About',
    contact: 'Contact',
    blog: 'Blog',
    bookNow: 'Book Now',
    signIn: 'Sign In',
    toggleLang: 'VI',
  },
  hero: {
    headline: 'One Stop, All Solutions',
    subheadline: 'Tax · Insurance · Immigration · AI Automation',
    cta1: 'Book Appointment',
    cta2: 'Our Services',
  },
  services: {
    title: 'Our Services',
    tax: { name: 'Tax & Business', desc: 'Individual & business tax prep, LLC setup, extensions.' },
    insurance: { name: 'Insurance & Finance', desc: 'Life insurance, annuity, retirement planning.' },
    immigration: { name: 'Immigration', desc: 'N-400, green card, visa renewal, consultations.' },
    ai: { name: 'AI & Automation', desc: 'Workflow automation and AI tools for small businesses.' },
    learnMore: 'Learn more',
  },
  why: {
    title: 'Why Manna One Solution',
    bilingual: { title: 'Bilingual Service', desc: 'Fluent in Vietnamese and English.' },
    efin: { title: 'EFIN Licensed', desc: 'Authorized IRS e-file provider.' },
    insurance: { title: 'Insurance Licensed', desc: 'Licensed life insurance agent.' },
    ai: { title: 'AI-Powered', desc: 'Modern tools for faster, smarter service.' },
  },
  howItWorks: {
    title: 'How It Works',
    step1: { title: 'Contact Us', desc: 'Reach out by phone, form, or Facebook.' },
    step2: { title: 'Free Consultation', desc: 'We review your situation at no charge.' },
    step3: { title: 'We Handle It', desc: 'You relax while we take care of the rest.' },
  },
  contact: {
    phone: '346-852-4454',
    formTitle: 'Send a Message',
    namePlaceholder: 'Full Name',
    phonePlaceholder: 'Phone Number',
    emailPlaceholder: 'Email Address',
    servicePlaceholder: 'Service Needed',
    messagePlaceholder: 'How can we help?',
    submit: 'Send Message',
    successMessage: 'Message sent! We\'ll be in touch shortly.',
    bookTitle: 'Book a Free Consultation',
    bookSub: '15-minute call, no obligation.',
    directTitle: 'Contact Directly',
  },
  footer: {
    tagline: 'One Stop, All Solutions',
    address: 'Houston, TX',
    copyright: '© 2026 Manna One Solution. All rights reserved.',
  },
  blog: {
    title: 'Blog',
    filterAll: 'All',
    readMore: 'Read More',
    categories: {
      tax: 'Tax',
      insurance: 'Insurance',
      immigration: 'Immigration',
      ai: 'AI & Automation',
      general: 'General',
    },
  },
} as const

export default en
export type TranslationKeys = typeof en
```

- [ ] **Step 4: Create Vietnamese translations**

Create `src/lib/i18n/vi.ts`:
```typescript
import type { TranslationKeys } from './en'

const vi: TranslationKeys = {
  nav: {
    home: 'Trang Chủ',
    services: 'Dịch Vụ',
    about: 'Về Chúng Tôi',
    contact: 'Liên Hệ',
    blog: 'Blog',
    bookNow: 'Đặt Lịch',
    signIn: 'Đăng Nhập',
    toggleLang: 'EN',
  },
  hero: {
    headline: 'Một Nơi, Tất Cả Giải Pháp',
    subheadline: 'Thuế · Bảo Hiểm · Di Trú · Tự Động Hóa AI',
    cta1: 'Đặt Lịch Ngay',
    cta2: 'Dịch Vụ Của Chúng Tôi',
  },
  services: {
    title: 'Dịch Vụ Của Chúng Tôi',
    tax: { name: 'Thuế & Kinh Doanh', desc: 'Khai thuế cá nhân & doanh nghiệp, thành lập LLC, gia hạn.' },
    insurance: { name: 'Bảo Hiểm & Tài Chính', desc: 'Bảo hiểm nhân thọ, niên kim, kế hoạch hưu trí.' },
    immigration: { name: 'Di Trú', desc: 'N-400, thẻ xanh, gia hạn visa, tư vấn.' },
    ai: { name: 'AI & Tự Động Hóa', desc: 'Tự động hóa quy trình và công cụ AI cho doanh nghiệp nhỏ.' },
    learnMore: 'Tìm hiểu thêm',
  },
  why: {
    title: 'Tại Sao Chọn Manna One Solution',
    bilingual: { title: 'Dịch Vụ Song Ngữ', desc: 'Thành thạo tiếng Việt và tiếng Anh.' },
    efin: { title: 'Có Giấy Phép EFIN', desc: 'Nhà cung cấp e-file IRS được ủy quyền.' },
    insurance: { title: 'Có Giấy Phép Bảo Hiểm', desc: 'Đại lý bảo hiểm nhân thọ được cấp phép.' },
    ai: { title: 'Ứng Dụng AI', desc: 'Công nghệ hiện đại cho dịch vụ nhanh hơn, thông minh hơn.' },
  },
  howItWorks: {
    title: 'Quy Trình Làm Việc',
    step1: { title: 'Liên Hệ Chúng Tôi', desc: 'Gọi điện, điền form, hoặc nhắn Facebook.' },
    step2: { title: 'Tư Vấn Miễn Phí', desc: 'Chúng tôi xem xét tình huống của bạn miễn phí.' },
    step3: { title: 'Chúng Tôi Lo Tất Cả', desc: 'Bạn yên tâm, chúng tôi xử lý mọi việc.' },
  },
  contact: {
    phone: '346-852-4454',
    formTitle: 'Gửi Tin Nhắn',
    namePlaceholder: 'Họ và Tên',
    phonePlaceholder: 'Số Điện Thoại',
    emailPlaceholder: 'Email',
    servicePlaceholder: 'Dịch Vụ Cần',
    messagePlaceholder: 'Chúng tôi có thể giúp gì cho bạn?',
    submit: 'Gửi Tin Nhắn',
    successMessage: 'Đã gửi! Chúng tôi sẽ liên hệ sớm.',
    bookTitle: 'Đặt Lịch Tư Vấn Miễn Phí',
    bookSub: 'Cuộc gọi 15 phút, không ràng buộc.',
    directTitle: 'Liên Hệ Trực Tiếp',
  },
  footer: {
    tagline: 'Một Nơi, Tất Cả Giải Pháp',
    address: 'Houston, TX',
    copyright: '© 2026 Manna One Solution. Bảo lưu mọi quyền.',
  },
  blog: {
    title: 'Blog',
    filterAll: 'Tất Cả',
    readMore: 'Đọc Thêm',
    categories: {
      tax: 'Thuế',
      insurance: 'Bảo Hiểm',
      immigration: 'Di Trú',
      ai: 'AI & Tự Động Hóa',
      general: 'Tổng Hợp',
    },
  },
}

export default vi
```

- [ ] **Step 5: Create LanguageContext**

Create `src/lib/i18n/LanguageContext.tsx`:
```typescript
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Language } from '@/types'

interface LanguageContextValue {
  language: Language
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  toggleLanguage: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Language | null
    if (stored === 'en' || stored === 'vi') setLanguage(stored)
  }, [])

  function toggleLanguage() {
    setLanguage(prev => {
      const next: Language = prev === 'en' ? 'vi' : 'en'
      localStorage.setItem('lang', next)
      return next
    })
  }

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
```

- [ ] **Step 6: Create useT hook**

Create `src/lib/i18n/useT.ts`:
```typescript
'use client'
import { useLanguage } from './LanguageContext'
import en from './en'
import vi from './vi'

const translations = { en, vi }

// Returns a typed translation function for the active language
export function useT() {
  const { language } = useLanguage()
  const t = translations[language]
  return t
}
```

- [ ] **Step 7: Run tests — confirm they pass**

```bash
npx jest src/lib/i18n/__tests__/i18n.test.tsx
```
Expected: 4 tests PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add bilingual i18n system (EN default, VI/EN toggle)"
```

---

## Task 5: Blog Utilities

**Files:**
- Create: `src/lib/blog.ts`
- Create: `content/blog/2026-04-09-welcome.md`

- [ ] **Step 1: Write tests for blog utilities**

Create `src/lib/__tests__/blog.test.ts`:
```typescript
import { getAllPosts, getPostBySlug } from '../blog'

describe('blog utilities', () => {
  test('getAllPosts returns array', async () => {
    const posts = await getAllPosts()
    expect(Array.isArray(posts)).toBe(true)
  })

  test('each post has required fields', async () => {
    const posts = await getAllPosts()
    for (const post of posts) {
      expect(post).toHaveProperty('slug')
      expect(post).toHaveProperty('title')
      expect(post).toHaveProperty('date')
      expect(post).toHaveProperty('category')
    }
  })

  test('getPostBySlug returns null for missing slug', async () => {
    const post = await getPostBySlug('nonexistent-slug')
    expect(post).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/lib/__tests__/blog.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create blog utility**

Create `src/lib/blog.ts`:
```typescript
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import type { BlogPost, ServiceType } from '@/types'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

function slugFromFilename(filename: string) {
  return filename.replace(/\.md$/, '')
}

async function renderMarkdown(content: string): Promise<string> {
  const result = await remark().use(html).process(content)
  return result.toString()
}

export async function getAllPosts(): Promise<BlogPost[]> {
  if (!fs.existsSync(BLOG_DIR)) return []
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))

  const posts = await Promise.all(
    files.map(async filename => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf8')
      const { data, content } = matter(raw)
      const contentHtml = await renderMarkdown(data.contentEn ?? content)
      const contentViHtml = await renderMarkdown(data.contentVi ?? content)
      return {
        slug: slugFromFilename(filename),
        title: data.title ?? '',
        titleVi: data.titleVi ?? data.title ?? '',
        date: data.date ?? '',
        category: (data.category ?? 'general') as ServiceType | 'general',
        excerpt: data.excerpt ?? '',
        excerptVi: data.excerptVi ?? data.excerpt ?? '',
        content: contentHtml,
        contentVi: contentViHtml,
        coverImage: data.coverImage,
      } satisfies BlogPost
    })
  )

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  return {
    slug,
    title: data.title ?? '',
    titleVi: data.titleVi ?? data.title ?? '',
    date: data.date ?? '',
    category: (data.category ?? 'general') as ServiceType | 'general',
    excerpt: data.excerpt ?? '',
    excerptVi: data.excerptVi ?? data.excerpt ?? '',
    content: await renderMarkdown(data.contentEn ?? content),
    contentVi: await renderMarkdown(data.contentVi ?? content),
    coverImage: data.coverImage,
  }
}
```

- [ ] **Step 4: Create seed blog post**

Create `content/blog/2026-04-09-welcome.md`:
```markdown
---
title: "Welcome to Manna One Solution"
titleVi: "Chào mừng đến với Manna One Solution"
date: "2026-04-09"
category: "general"
excerpt: "We're here to help Houston's Vietnamese community with tax, insurance, immigration, and AI automation."
excerptVi: "Chúng tôi ở đây để giúp cộng đồng người Việt tại Houston với thuế, bảo hiểm, di trú và tự động hóa AI."
---

## Welcome

Manna One Solution is a one-stop service company based in Houston, TX. We serve the Vietnamese community with bilingual support across Tax & Business, Insurance, Immigration, and AI Automation services.

Call us at **346-852-4454** or book a free 15-minute consultation online.
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
npx jest src/lib/__tests__/blog.test.ts
```
Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add blog utilities and seed post"
```

---

## Task 6: SEO Utilities & JSON-LD Components

**Files:**
- Create: `src/lib/seo.ts`
- Create: `src/components/seo/JsonLd.tsx`
- Create: `src/components/seo/LocalBusinessSchema.tsx`
- Create: `src/components/seo/FaqSchema.tsx`

- [ ] **Step 1: Write SEO utility tests**

Create `src/lib/__tests__/seo.test.ts`:
```typescript
import { buildMetadata } from '../seo'

describe('buildMetadata', () => {
  test('includes title and description', () => {
    const meta = buildMetadata({ title: 'Tax Services', description: 'Tax prep Houston' })
    expect(meta.title).toContain('Tax Services')
    expect(meta.description).toBe('Tax prep Houston')
  })

  test('appends site name to title', () => {
    const meta = buildMetadata({ title: 'About' })
    expect(meta.title).toContain('Manna One Solution')
  })

  test('includes openGraph with url', () => {
    const meta = buildMetadata({ title: 'Home', path: '/' })
    expect((meta.openGraph as any)?.url).toContain('mannaos.com')
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/lib/__tests__/seo.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create SEO utility**

Create `src/lib/seo.ts`:
```typescript
import type { Metadata } from 'next'

const SITE_NAME = 'Manna One Solution'
const SITE_URL = 'https://mannaos.com'
const DEFAULT_DESC = 'One-stop Vietnamese-bilingual service in Houston, TX — Tax, Insurance, Immigration, AI Automation. Call 346-852-4454.'

interface BuildMetadataOptions {
  title: string
  description?: string
  path?: string
  image?: string
}

export function buildMetadata({ title, description, path = '/', image }: BuildMetadataOptions): Metadata {
  const url = `${SITE_URL}${path}`
  const desc = description ?? DEFAULT_DESC

  return {
    title: `${title} | ${SITE_NAME}`,
    description: desc,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description: desc,
      url,
      siteName: SITE_NAME,
      images: [{ url: image ?? `${SITE_URL}/logo-og.png`, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description: desc,
    },
  }
}
```

- [ ] **Step 4: Create JsonLd component**

Create `src/components/seo/JsonLd.tsx`:
```typescript
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
```

- [ ] **Step 5: Create LocalBusinessSchema component**

Create `src/components/seo/LocalBusinessSchema.tsx`:
```typescript
import { JsonLd } from './JsonLd'

export function LocalBusinessSchema() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Manna One Solution',
    url: 'https://mannaos.com',
    telephone: '+1-346-852-4454',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Houston',
      addressRegion: 'TX',
      addressCountry: 'US',
    },
    areaServed: ['Houston TX', 'Dallas TX', 'Austin TX'],
    sameAs: ['https://www.facebook.com/mannaonesolution'],
    description: 'Bilingual Vietnamese-English one-stop service: Tax, Insurance, Immigration, AI Automation.',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tax Preparation' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'LLC Setup' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Life Insurance' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Immigration Consultation' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'AI Automation' } },
      ],
    },
  }
  return <JsonLd data={data} />
}
```

- [ ] **Step 6: Create FaqSchema component**

Create `src/components/seo/FaqSchema.tsx`:
```typescript
import { JsonLd } from './JsonLd'
import type { FaqItem } from '@/types'

interface FaqSchemaProps {
  faqs: FaqItem[]
  lang?: 'en' | 'vi'
}

export function FaqSection({ faqs, lang = 'en' }: FaqSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }

  return (
    <section className="py-16 px-4 max-w-3xl mx-auto">
      <JsonLd data={schema} />
      <h2 className="text-3xl font-bold text-charcoal mb-8">
        {lang === 'vi' ? 'Câu Hỏi Thường Gặp' : 'Frequently Asked Questions'}
      </h2>
      <div className="space-y-6">
        {faqs.map(({ question, answer }) => (
          <details key={question} className="border border-border rounded-lg p-5 group">
            <summary className="font-semibold text-charcoal cursor-pointer list-none flex justify-between items-center">
              {question}
              <span className="text-teal">+</span>
            </summary>
            <p className="mt-3 text-text-secondary leading-relaxed">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Run SEO tests — confirm they pass**

```bash
npx jest src/lib/__tests__/seo.test.ts
```
Expected: 3 tests PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add SEO utilities and JSON-LD schema components"
```

---

## Task 7: UI Primitives

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/FloatingButtons.tsx`

- [ ] **Step 1: Write Button tests**

Create `src/components/ui/__tests__/Button.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { Button } from '../Button'

test('renders primary button with teal styles', () => {
  render(<Button variant="primary">Book Now</Button>)
  const btn = screen.getByRole('button', { name: 'Book Now' })
  expect(btn).toBeInTheDocument()
  expect(btn.className).toContain('bg-teal')
})

test('renders outline button', () => {
  render(<Button variant="outline">Learn More</Button>)
  const btn = screen.getByRole('button', { name: 'Learn More' })
  expect(btn.className).toContain('border-teal')
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/components/ui/__tests__/Button.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create Button component**

Create `src/components/ui/Button.tsx`:
```typescript
import type { ButtonHTMLAttributes } from 'react'
import Link from 'next/link'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline'
  href?: string
}

export function Button({ variant = 'primary', href, className = '', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2'
  const styles = {
    primary: 'bg-teal text-white hover:bg-teal-dark',
    outline: 'border-2 border-teal text-teal hover:bg-teal hover:text-white',
  }
  const classes = `${base} ${styles[variant]} ${className}`

  if (href) {
    return <Link href={href} className={classes}>{children}</Link>
  }
  return <button className={classes} {...props}>{children}</button>
}
```

- [ ] **Step 4: Create Card component**

Create `src/components/ui/Card.tsx`:
```typescript
interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className = '', children }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-border shadow-card p-6 ${className}`}>
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Create Badge component**

Create `src/components/ui/Badge.tsx`:
```typescript
interface BadgeProps {
  children: React.ReactNode
  variant?: 'teal' | 'silver'
}

export function Badge({ children, variant = 'teal' }: BadgeProps) {
  const styles = {
    teal:   'bg-bg-secondary text-teal border border-teal/20',
    silver: 'bg-bg-surface text-silver border border-border',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 6: Create FloatingButtons component**

Create `src/components/ui/FloatingButtons.tsx`:
```typescript
'use client'

export function FloatingButtons() {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
      <a
        href="tel:3468524454"
        className="flex items-center justify-center w-12 h-12 rounded-full bg-teal text-white shadow-lg hover:bg-teal-dark transition-colors"
        aria-label="Call us"
      >
        {/* Phone icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </a>
      <a
        href="https://www.facebook.com/mannaonesolution"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1877F2] text-white shadow-lg hover:bg-[#1565C0] transition-colors"
        aria-label="Facebook Messenger"
      >
        {/* Facebook icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </a>
    </div>
  )
}
```

- [ ] **Step 7: Run Button tests — confirm they pass**

```bash
npx jest src/components/ui/__tests__/Button.test.tsx
```
Expected: 2 tests PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Button, Card, Badge, FloatingButtons UI primitives"
```

---

## Task 8: Navbar & Footer

**Files:**
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Write Navbar tests**

Create `src/components/layout/__tests__/Navbar.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Navbar } from '../Navbar'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

function renderWithi18n(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>)
}

test('renders logo', () => {
  renderWithi18n(<Navbar />)
  expect(screen.getByAltText(/manna one solution/i)).toBeInTheDocument()
})

test('renders language toggle button showing VI when in EN mode', () => {
  renderWithi18n(<Navbar />)
  expect(screen.getByRole('button', { name: /VI/i })).toBeInTheDocument()
})

test('language toggle switches to VI on click', () => {
  renderWithi18n(<Navbar />)
  fireEvent.click(screen.getByRole('button', { name: /VI/i }))
  expect(screen.getByRole('button', { name: /EN/i })).toBeInTheDocument()
})

test('renders Book Now link', () => {
  renderWithi18n(<Navbar />)
  expect(screen.getByRole('link', { name: /book now/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/components/layout/__tests__/Navbar.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create Navbar component**

Create `src/components/layout/Navbar.tsx`:
```typescript
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useT } from '@/lib/i18n/useT'
import { Button } from '@/components/ui/Button'

export function Navbar() {
  const { toggleLanguage } = useLanguage()
  const t = useT()

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Manna One Solution"
              width={120}
              height={48}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { href: '/services', label: t.nav.services },
              { href: '/about',    label: t.nav.about },
              { href: '/blog',     label: t.nav.blog },
              { href: '/contact',  label: t.nav.contact },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="text-text-secondary hover:text-teal font-medium transition-colors">
                {label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-full text-sm font-semibold border-2 border-teal text-teal hover:bg-teal hover:text-white transition-colors"
              aria-label="Toggle language"
            >
              {t.nav.toggleLang}
            </button>
            <Button href="/contact" variant="primary" className="hidden sm:inline-flex">
              {t.nav.bookNow}
            </Button>
            <Button href="/login" variant="outline">
              {t.nav.signIn}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Create Footer component**

Create `src/components/layout/Footer.tsx`:
```typescript
import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="bg-charcoal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Image src="/logo.png" alt="Manna One Solution" width={120} height={48} className="h-10 w-auto mb-4 brightness-0 invert" />
            <p className="text-gray-400 text-sm">One Stop, All Solutions</p>
            <p className="text-gray-400 text-sm mt-1">Houston, TX</p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-white mb-4">Services</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {[
                { href: '/services/tax',         label: 'Tax & Business' },
                { href: '/services/insurance',    label: 'Insurance & Finance' },
                { href: '/services/immigration',  label: 'Immigration' },
                { href: '/services/ai',           label: 'AI & Automation' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-teal transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="tel:3468524454" className="hover:text-teal transition-colors">346-852-4454</a></li>
              <li>
                <a href="https://www.facebook.com/mannaonesolution" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">
                  Facebook
                </a>
              </li>
              <li><Link href="/contact" className="hover:text-teal transition-colors">Book Appointment</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-10 pt-6 text-center text-sm text-gray-500">
          © 2026 Manna One Solution. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
npx jest src/components/layout/__tests__/Navbar.test.tsx
```
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Navbar and Footer components"
```

---

## Task 9: Root Layout & Public Static Files

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `public/llms.txt`
- Create: `public/robots.txt`
- Copy logos to `public/`

- [ ] **Step 1: Copy logo files to public/**

```bash
cp "../Logo/Logo-Picsart-BackgroundRemover.PNG" public/logo.png
cp "../Logo/Logo.PNG" public/logo-og.png
```
(Run from the `mannaos-web/` directory — adjust path to wherever your Logo folder lives)

- [ ] **Step 2: Update root layout**

Replace `src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { FloatingButtons } from '@/components/ui/FloatingButtons'
import { LocalBusinessSchema } from '@/components/seo/LocalBusinessSchema'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'Manna One Solution | Tax · Insurance · Immigration · AI — Houston TX',
  description: 'One-stop bilingual Vietnamese-English service in Houston, TX. Tax preparation, life insurance, immigration help, AI automation. Call 346-852-4454.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <LocalBusinessSchema />
          <Navbar />
          <main>{children}</main>
          <Footer />
          <FloatingButtons />
        </LanguageProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create llms.txt**

Create `public/llms.txt`:
```
# Manna One Solution — MannaOS.com
# This file helps AI language models accurately understand this business.

Business Name: Manna One Solution
Website: https://mannaos.com
Location: Houston, TX, USA
Phone: 346-852-4454
Facebook: https://www.facebook.com/mannaonesolution
Languages: Vietnamese, English

## What We Do
Manna One Solution is a bilingual (Vietnamese/English) one-stop service company
serving the Vietnamese community in Houston, TX and across Texas.

## Services
- Tax & Business: Individual and business tax preparation, LLC setup, IRS extension filing (EFIN licensed)
- Insurance & Finance: Life insurance, annuity, retirement planning (licensed agent)
- Immigration: N-400 citizenship, green card, visa renewal, immigration consultation
- AI & Automation: Workflow automation, AI tools for small businesses, business digitization

## Credentials
- EFIN (Electronic Filing Identification Number): IRS authorized e-file provider
- Licensed Life Insurance Agent

## Service Area
Houston TX, Dallas/Fort Worth TX, Austin TX, Vietnamese communities nationwide

## Pricing (Tax Services)
- Extension Filing (Form 4868): $50–$75
- Individual Tax (simple return): $150–$250
- Individual Tax (complex return): $250–$400
- Business Tax (LLC/S-Corp): $400–$800
- LLC Setup (full package): $300–$500 + state fee

## Insurance & Immigration
Commission-based and case-based pricing — contact for consultation.
```

- [ ] **Step 4: Create robots.txt**

Create `public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /portal/
Disallow: /admin/
Disallow: /api/
Disallow: /login
Disallow: /signup

Sitemap: https://mannaos.com/sitemap.xml
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add root layout, llms.txt, robots.txt, logo assets"
```

---

## Task 10: Home Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/sections/Hero.tsx`
- Create: `src/components/sections/ServicesGrid.tsx`
- Create: `src/components/sections/WhyManna.tsx`
- Create: `src/components/sections/HowItWorks.tsx`
- Create: `src/components/sections/ContactStrip.tsx`

- [ ] **Step 1: Create Hero section**

Create `src/components/sections/Hero.tsx`:
```typescript
'use client'
import { useT } from '@/lib/i18n/useT'
import { Button } from '@/components/ui/Button'

export function Hero() {
  const t = useT()
  return (
    <section className="bg-gradient-to-br from-teal/10 to-bg-secondary py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-charcoal mb-4 leading-tight">
          {t.hero.headline}
        </h1>
        <p className="text-xl text-text-secondary mb-10">
          {t.hero.subheadline}
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

- [ ] **Step 2: Create ServicesGrid section**

Create `src/components/sections/ServicesGrid.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { useT } from '@/lib/i18n/useT'
import { Card } from '@/components/ui/Card'

const services = [
  { key: 'tax' as const,         href: '/services/tax',         icon: '📋' },
  { key: 'insurance' as const,   href: '/services/insurance',   icon: '🛡️' },
  { key: 'immigration' as const, href: '/services/immigration', icon: '🌏' },
  { key: 'ai' as const,          href: '/services/ai',          icon: '🤖' },
]

export function ServicesGrid() {
  const t = useT()
  return (
    <section className="py-20 px-4 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-charcoal text-center mb-12">{t.services.title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map(({ key, href, icon }) => (
          <Card key={key} className="flex flex-col">
            <div className="text-4xl mb-4">{icon}</div>
            <h3 className="font-bold text-charcoal text-lg mb-2">{t.services[key].name}</h3>
            <p className="text-text-secondary text-sm flex-1">{t.services[key].desc}</p>
            <Link href={href} className="mt-4 text-teal font-semibold text-sm hover:text-teal-dark transition-colors">
              {t.services.learnMore} →
            </Link>
          </Card>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create WhyManna section**

Create `src/components/sections/WhyManna.tsx`:
```typescript
'use client'
import { useT } from '@/lib/i18n/useT'

const points = [
  { key: 'bilingual' as const, icon: '🗣️' },
  { key: 'efin' as const,      icon: '✅' },
  { key: 'insurance' as const, icon: '📜' },
  { key: 'ai' as const,        icon: '⚡' },
]

export function WhyManna() {
  const t = useT()
  return (
    <section className="section-alt py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-charcoal text-center mb-12">{t.why.title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {points.map(({ key, icon }) => (
            <div key={key} className="text-center">
              <div className="text-5xl mb-4">{icon}</div>
              <h3 className="font-bold text-charcoal mb-2">{t.why[key].title}</h3>
              <p className="text-text-secondary text-sm">{t.why[key].desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Create HowItWorks section**

Create `src/components/sections/HowItWorks.tsx`:
```typescript
'use client'
import { useT } from '@/lib/i18n/useT'

export function HowItWorks() {
  const t = useT()
  const steps = [
    { num: '01', ...t.howItWorks.step1 },
    { num: '02', ...t.howItWorks.step2 },
    { num: '03', ...t.howItWorks.step3 },
  ]
  return (
    <section className="py-20 px-4 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-charcoal text-center mb-12">{t.howItWorks.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map(({ num, title, desc }) => (
          <div key={num} className="relative text-center">
            <div className="w-14 h-14 rounded-full bg-teal text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
              {num}
            </div>
            <h3 className="font-bold text-charcoal mb-2">{title}</h3>
            <p className="text-text-secondary text-sm">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Create ContactStrip section**

Create `src/components/sections/ContactStrip.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useT } from '@/lib/i18n/useT'
import { Button } from '@/components/ui/Button'

export function ContactStrip() {
  const t = useT()
  const [submitted, setSubmitted] = useState(false)
  const formspreeId = process.env.NEXT_PUBLIC_FORMSPREE_ID

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formspreeId) return
    const form = e.currentTarget
    await fetch(`https://formspree.io/f/${formspreeId}`, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    })
    setSubmitted(true)
  }

  return (
    <section className="section-alt py-16 px-4">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start">
        {/* Direct contact */}
        <div className="flex-1">
          <h3 className="font-bold text-charcoal text-xl mb-4">{t.contact.directTitle}</h3>
          <a href="tel:3468524454" className="block text-teal font-semibold text-lg mb-2 hover:text-teal-dark">
            📞 {t.contact.phone}
          </a>
          <a href="https://www.facebook.com/mannaonesolution" target="_blank" rel="noopener noreferrer"
            className="block text-teal font-semibold hover:text-teal-dark">
            Facebook →
          </a>
        </div>

        {/* Quick form */}
        <div className="flex-1">
          {submitted ? (
            <p className="text-teal font-semibold">{t.contact.successMessage}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input name="name" required placeholder={t.contact.namePlaceholder}
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              <input name="email" type="email" required placeholder={t.contact.emailPlaceholder}
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              <Button type="submit" variant="primary" className="w-full">{t.contact.submit}</Button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Assemble Home page**

Replace `src/app/page.tsx`:
```typescript
import { Hero } from '@/components/sections/Hero'
import { ServicesGrid } from '@/components/sections/ServicesGrid'
import { WhyManna } from '@/components/sections/WhyManna'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { ContactStrip } from '@/components/sections/ContactStrip'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Home',
  description: 'Manna One Solution — bilingual Vietnamese-English tax, insurance, immigration, and AI automation services in Houston, TX. Call 346-852-4454.',
  path: '/',
})

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesGrid />
      <WhyManna />
      <HowItWorks />
      <ContactStrip />
    </>
  )
}
```

- [ ] **Step 7: Start dev server and visually verify**

```bash
npm run dev
```
Open http://localhost:3000. Verify:
- Navbar with logo, links, VI toggle button, Book Now, Sign In
- Hero with headline and two CTAs
- 4 service cards
- 4 trust points
- 3-step process
- Contact strip with phone and quick form
- Footer
- Floating phone and Facebook buttons

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build home page with all sections"
```

---

## Task 11: Services Pages

**Files:**
- Create: `src/app/services/page.tsx`
- Create: `src/app/services/tax/page.tsx`
- Create: `src/app/services/insurance/page.tsx`
- Create: `src/app/services/immigration/page.tsx`
- Create: `src/app/services/ai/page.tsx`

- [ ] **Step 1: Create Services overview page**

Create `src/app/services/page.tsx`:
```typescript
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Services',
  description: 'Tax preparation, life insurance, immigration, and AI automation services in Houston TX.',
  path: '/services',
})

const services = [
  {
    href: '/services/tax',
    name: 'Tax & Business',
    nameVi: 'Thuế & Kinh Doanh',
    desc: 'Individual & business tax prep, LLC setup, IRS extension filing.',
    pricing: 'Starting at $50',
    icon: '📋',
  },
  {
    href: '/services/insurance',
    name: 'Insurance & Finance',
    nameVi: 'Bảo Hiểm & Tài Chính',
    desc: 'Life insurance, annuity, and retirement planning.',
    pricing: 'Free consultation',
    icon: '🛡️',
  },
  {
    href: '/services/immigration',
    name: 'Immigration',
    nameVi: 'Di Trú',
    desc: 'N-400, green card, visa renewal, consultations.',
    pricing: 'Contact for pricing',
    icon: '🌏',
  },
  {
    href: '/services/ai',
    name: 'AI & Automation',
    nameVi: 'AI & Tự Động Hóa',
    desc: 'Workflow automation and AI tools for small businesses.',
    pricing: 'Free discovery call',
    icon: '🤖',
  },
]

export default function ServicesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold text-charcoal text-center mb-4">Our Services</h1>
      <p className="text-text-secondary text-center mb-12">Bilingual support in Vietnamese and English.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {services.map(({ href, name, nameVi, desc, pricing, icon }) => (
          <Card key={href} className="flex flex-col">
            <div className="text-5xl mb-4">{icon}</div>
            <h2 className="text-2xl font-bold text-charcoal mb-1">{name}</h2>
            <p className="text-teal text-sm font-medium mb-3">{nameVi}</p>
            <p className="text-text-secondary mb-4 flex-1">{desc}</p>
            <p className="font-semibold text-charcoal mb-4">{pricing}</p>
            <Button href={href} variant="primary">Learn More</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Tax service page**

Create `src/app/services/tax/page.tsx`:
```typescript
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FaqSection } from '@/components/seo/FaqSchema'
import { buildMetadata } from '@/lib/seo'
import type { FaqItem } from '@/types'

export const metadata = buildMetadata({
  title: 'Tax & Business Services',
  description: 'Professional tax preparation for individuals and businesses in Houston TX. LLC setup, IRS extensions. EFIN licensed.',
  path: '/services/tax',
})

const faqs: FaqItem[] = [
  { question: 'How much does individual tax preparation cost in Houston?', answer: 'Simple returns start at $150–$250. Complex returns (investments, rental income, self-employed) are $250–$400. Business tax for LLC/S-Corp is $400–$800.' },
  { question: 'How much does LLC setup cost in Texas?', answer: 'Our LLC setup package is $300–$500 plus the Texas state filing fee (currently $300). We handle all paperwork.' },
  { question: 'How do I file a tax extension?', answer: 'We file Form 4868 for $50–$75. This gives you until October to file, but does not extend the time to pay any taxes owed.' },
  { question: 'Do you prepare taxes in Vietnamese?', answer: 'Yes. We are fully bilingual in Vietnamese and English and serve the Houston Vietnamese community.' },
  { question: 'Are you an authorized IRS e-file provider?', answer: 'Yes. We hold an EFIN (Electronic Filing Identification Number) issued by the IRS.' },
]

export default function TaxPage() {
  return (
    <div>
      <div className="bg-bg-secondary py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Badge variant="teal">EFIN Licensed</Badge>
          <h1 className="text-4xl font-bold text-charcoal mt-4 mb-4">Tax & Business Services</h1>
          <p className="text-text-secondary text-lg">Professional tax preparation in English and Vietnamese. Houston TX.</p>
          <Button href="/contact" variant="primary" className="mt-6">Book Appointment</Button>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-charcoal mb-8">Pricing</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-bg-secondary">
                <th className="text-left p-4 font-semibold text-charcoal border border-border">Service</th>
                <th className="text-left p-4 font-semibold text-charcoal border border-border">Price</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Extension Filing (Form 4868)', '$50–$75'],
                ['Individual Tax (simple return)', '$150–$250'],
                ['Individual Tax (complex return)', '$250–$400'],
                ['Business Tax (LLC/S-Corp)', '$400–$800'],
                ['LLC Setup (full package)', '$300–$500 + state fee'],
              ].map(([service, price]) => (
                <tr key={service} className="hover:bg-bg-surface">
                  <td className="p-4 border border-border text-text-primary">{service}</td>
                  <td className="p-4 border border-border text-teal font-semibold">{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 text-center">
          <Button href="/contact" variant="primary">Book a Tax Appointment</Button>
        </div>
      </div>

      <FaqSection faqs={faqs} />
    </div>
  )
}
```

- [ ] **Step 3: Create Insurance page**

Create `src/app/services/insurance/page.tsx`:
```typescript
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FaqSection } from '@/components/seo/FaqSchema'
import { buildMetadata } from '@/lib/seo'
import type { FaqItem } from '@/types'

export const metadata = buildMetadata({
  title: 'Insurance & Finance Services',
  description: 'Life insurance, annuity, and retirement planning in Houston TX. Licensed agent. Bilingual Vietnamese-English.',
  path: '/services/insurance',
})

const faqs: FaqItem[] = [
  { question: 'What types of insurance do you offer?', answer: 'We offer life insurance (term and whole life), annuities, and retirement planning services.' },
  { question: 'How much does life insurance cost?', answer: 'Premiums vary based on age, health, and coverage amount. Contact us for a free personalized quote.' },
  { question: 'Are you a licensed insurance agent?', answer: 'Yes. We are a licensed life insurance agent in Texas.' },
  { question: 'Do you offer services in Vietnamese?', answer: 'Yes. We are fully bilingual in Vietnamese and English.' },
  { question: 'What is the difference between term and whole life insurance?', answer: 'Term insurance covers you for a fixed period (e.g. 20 years). Whole life covers you permanently and builds cash value over time.' },
]

export default function InsurancePage() {
  return (
    <div>
      <div className="bg-bg-secondary py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Badge variant="teal">Licensed Agent</Badge>
          <h1 className="text-4xl font-bold text-charcoal mt-4 mb-4">Insurance & Finance</h1>
          <p className="text-text-secondary text-lg">Life insurance, annuity, and retirement planning. Commission-based — consultations are free.</p>
          <Button href="/contact" variant="primary" className="mt-6">Free Consultation</Button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Life Insurance', desc: 'Term and whole life policies tailored to your family\'s needs.' },
            { title: 'Annuity', desc: 'Guaranteed income for retirement, structured to your timeline.' },
            { title: 'Retirement Planning', desc: 'Comprehensive planning to ensure financial security.' },
          ].map(({ title, desc }) => (
            <div key={title} className="bg-bg-secondary rounded-xl p-6 border border-border">
              <h3 className="font-bold text-charcoal mb-2">{title}</h3>
              <p className="text-text-secondary text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>
      <FaqSection faqs={faqs} />
    </div>
  )
}
```

- [ ] **Step 4: Create Immigration page**

Create `src/app/services/immigration/page.tsx`:
```typescript
import { Button } from '@/components/ui/Button'
import { FaqSection } from '@/components/seo/FaqSchema'
import { buildMetadata } from '@/lib/seo'
import type { FaqItem } from '@/types'

export const metadata = buildMetadata({
  title: 'Immigration Services',
  description: 'N-400 citizenship, green card, visa renewal, immigration consultation in Houston TX. Bilingual Vietnamese-English.',
  path: '/services/immigration',
})

const faqs: FaqItem[] = [
  { question: 'How long does N-400 citizenship take?', answer: 'Processing times vary, typically 8–14 months from filing. We help you prepare a complete, accurate application to avoid delays.' },
  { question: 'Can you help with green card applications?', answer: 'Yes. We assist with various green card categories. Contact us for a case evaluation.' },
  { question: 'How do I renew my visa?', answer: 'Visa renewal requirements depend on your visa type. Contact us for a free evaluation of your specific situation.' },
  { question: 'Do you offer services in Vietnamese?', answer: 'Yes. We are fully bilingual in Vietnamese and English and serve the Vietnamese community across Houston and Texas.' },
]

export default function ImmigrationPage() {
  return (
    <div>
      <div className="bg-bg-secondary py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-charcoal mb-4">Immigration Services</h1>
          <p className="text-text-secondary text-lg">N-400 citizenship, green card, visa renewal, and consultation. Serving Houston and Texas.</p>
          <Button href="/contact" variant="primary" className="mt-6">Free Case Evaluation</Button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'N-400 Citizenship', desc: 'Naturalization application preparation and support.' },
            { title: 'Green Card', desc: 'Assistance with various green card categories.' },
            { title: 'Visa Renewal', desc: 'Renewal preparation for multiple visa types.' },
            { title: 'Consultation', desc: 'One-on-one case evaluation and immigration guidance.' },
          ].map(({ title, desc }) => (
            <div key={title} className="bg-bg-secondary rounded-xl p-6 border border-border">
              <h3 className="font-bold text-charcoal mb-2">{title}</h3>
              <p className="text-text-secondary text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>
      <FaqSection faqs={faqs} />
    </div>
  )
}
```

- [ ] **Step 5: Create AI page**

Create `src/app/services/ai/page.tsx`:
```typescript
import { Button } from '@/components/ui/Button'
import { FaqSection } from '@/components/seo/FaqSchema'
import { buildMetadata } from '@/lib/seo'
import type { FaqItem } from '@/types'

export const metadata = buildMetadata({
  title: 'AI & Automation Services',
  description: 'Workflow automation and AI tools for small businesses in Houston TX. We understand your business and build the automation.',
  path: '/services/ai',
})

const faqs: FaqItem[] = [
  { question: 'What does AI automation mean for my small business?', answer: 'We analyze your current workflows and build automated systems — scheduling, document processing, client follow-ups — so you spend less time on repetitive tasks.' },
  { question: 'Do I need technical knowledge to use your AI tools?', answer: 'No. We build and configure everything for you and train you how to use the finished system.' },
  { question: 'How much does AI automation cost?', answer: 'We offer project-based pricing and monthly retainer options. Contact us for a free discovery call to scope your project.' },
  { question: 'What kinds of businesses benefit most?', answer: 'Small businesses in services, retail, and healthcare — especially those with repetitive administrative tasks, client communications, or document management needs.' },
]

export default function AiPage() {
  return (
    <div>
      <div className="bg-bg-secondary py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-charcoal mb-4">AI & Automation</h1>
          <p className="text-text-secondary text-lg">We understand your business — we build the automation.</p>
          <Button href="/contact" variant="primary" className="mt-6">Free Discovery Call</Button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'Workflow Automation', desc: 'Automate repetitive tasks: scheduling, emails, document processing.' },
            { title: 'AI Tools for SMBs', desc: 'Custom AI-powered tools tailored to your business operations.' },
            { title: 'Business Digitization', desc: 'Move paper-based processes to efficient digital systems.' },
            { title: 'Monthly Retainer', desc: 'Ongoing support, maintenance, and automation improvements.' },
          ].map(({ title, desc }) => (
            <div key={title} className="bg-bg-secondary rounded-xl p-6 border border-border">
              <h3 className="font-bold text-charcoal mb-2">{title}</h3>
              <p className="text-text-secondary text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>
      <FaqSection faqs={faqs} />
    </div>
  )
}
```

- [ ] **Step 6: Verify all service pages in browser**

```bash
npm run dev
```
Visit: http://localhost:3000/services, /services/tax, /services/insurance, /services/immigration, /services/ai
Confirm: FAQ sections render, pricing table on tax page, CTAs link to /contact.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: build all service pages with FAQ JSON-LD schema"
```

---

## Task 12: About & Contact Pages

**Files:**
- Create: `src/app/about/page.tsx`
- Create: `src/app/contact/page.tsx`

- [ ] **Step 1: Create About page**

Create `src/app/about/page.tsx`:
```typescript
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'About Us',
  description: 'Manna One Solution — bilingual Vietnamese-English one-stop service in Houston TX. EFIN licensed, life insurance licensed.',
  path: '/about',
})

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold text-charcoal mb-6">About Manna One Solution</h1>

      <div className="flex flex-wrap gap-3 mb-10">
        <Badge variant="teal">EFIN Licensed</Badge>
        <Badge variant="teal">Life Insurance Licensed</Badge>
        <Badge variant="silver">Bilingual VI / EN</Badge>
      </div>

      <div className="prose prose-lg max-w-none text-text-secondary">
        <p>
          Manna One Solution was founded to serve Houston's Vietnamese community with trustworthy,
          bilingual professional services — all under one roof.
        </p>
        <p>
          Too often, language barriers make it difficult to access quality tax, insurance, immigration,
          and business services. We bridge that gap with fluent Vietnamese and English support,
          deep expertise, and a genuine commitment to our clients' success.
        </p>

        <h2 className="text-2xl font-bold text-charcoal mt-10 mb-4">Our Mission</h2>
        <p className="text-xl font-semibold text-teal">"One Stop, All Solutions"</p>
        <p>
          We handle your tax preparation, insurance needs, immigration paperwork, and business
          automation — so you can focus on what matters most.
        </p>

        <h2 className="text-2xl font-bold text-charcoal mt-10 mb-4">Credentials</h2>
        <ul className="list-disc list-inside space-y-2">
          <li><strong>EFIN Licensed</strong> — IRS authorized e-file provider</li>
          <li><strong>Licensed Life Insurance Agent</strong> — Texas Department of Insurance</li>
          <li><strong>Bilingual</strong> — Fluent in Vietnamese and English</li>
        </ul>

        <h2 className="text-2xl font-bold text-charcoal mt-10 mb-4">Service Area</h2>
        <p>
          Based in Houston, TX — serving clients in DFW, Austin, and Vietnamese communities
          across the United States.
        </p>
      </div>

      <div className="mt-10">
        <Button href="/contact" variant="primary">Book a Free Consultation</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Contact page**

Create `src/app/contact/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

// Calendly script loader
function CalendlyEmbed({ url }: { url: string }) {
  return (
    <>
      <link rel="stylesheet" href="https://assets.calendly.com/assets/external/widget.css" />
      <div
        className="calendly-inline-widget"
        data-url={url}
        style={{ minWidth: '320px', height: '700px' }}
      />
      <script
        type="text/javascript"
        src="https://assets.calendly.com/assets/external/widget.js"
        async
      />
    </>
  )
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const formspreeId = process.env.NEXT_PUBLIC_FORMSPREE_ID
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/mannaonesolution/15min'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formspreeId) return
    await fetch(`https://formspree.io/f/${formspreeId}`, {
      method: 'POST',
      body: new FormData(e.currentTarget),
      headers: { Accept: 'application/json' },
    })
    setSubmitted(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-charcoal mb-4 text-center">Contact & Book</h1>
      <p className="text-text-secondary text-center mb-12">Reach out however works best for you.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Contact Form */}
        <div>
          <h2 className="text-xl font-bold text-charcoal mb-6">Send a Message</h2>
          {submitted ? (
            <p className="text-teal font-semibold">Message sent! We'll be in touch shortly.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input name="name" required placeholder="Full Name"
                className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              <input name="phone" placeholder="Phone Number"
                className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              <input name="email" type="email" required placeholder="Email Address"
                className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              <select name="service"
                className="w-full border border-border rounded-lg px-4 py-3 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-teal">
                <option value="">Service Needed</option>
                <option value="tax">Tax & Business</option>
                <option value="insurance">Insurance & Finance</option>
                <option value="immigration">Immigration</option>
                <option value="ai">AI & Automation</option>
              </select>
              <textarea name="message" rows={4} placeholder="How can we help?"
                className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              <Button type="submit" variant="primary" className="w-full">Send Message</Button>
            </form>
          )}

          {/* Direct contact */}
          <div className="mt-10 space-y-3">
            <h3 className="font-bold text-charcoal">Direct Contact</h3>
            <a href="tel:3468524454" className="flex items-center gap-2 text-teal font-semibold hover:text-teal-dark">
              📞 346-852-4454
            </a>
            <a href="https://www.facebook.com/mannaonesolution" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-teal font-semibold hover:text-teal-dark">
              Facebook →
            </a>
          </div>
        </div>

        {/* Calendly */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-charcoal mb-2">Book a Free 15-Min Consultation</h2>
          <p className="text-text-secondary text-sm mb-6">No obligation. Pick a time that works for you.</p>
          <CalendlyEmbed url={calendlyUrl} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add metadata export to contact page**

The contact page uses `'use client'` — export metadata from a separate server component wrapper. Update contact page:

Add at top of `src/app/contact/page.tsx` before the `'use client'` directive — move metadata to `layout.tsx` pattern or create `src/app/contact/layout.tsx`:

Create `src/app/contact/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Contact & Book',
  description: 'Contact Manna One Solution in Houston TX. Book a free 15-min consultation or call 346-852-4454.',
  path: '/contact',
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```
Visit http://localhost:3000/about and http://localhost:3000/contact.
Confirm: Calendly embed loads, contact form submits (use test Formspree ID), credential badges visible on About page.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add About and Contact pages with Calendly embed"
```

---

## Task 13: Blog Pages

**Files:**
- Create: `src/app/blog/page.tsx`
- Create: `src/app/blog/[slug]/page.tsx`

- [ ] **Step 1: Create Blog list page**

Create `src/app/blog/page.tsx`:
```typescript
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import { Badge } from '@/components/ui/Badge'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Blog',
  description: 'Tax tips, LLC guides, immigration news, and insurance basics. Bilingual Vietnamese-English blog from Manna One Solution, Houston TX.',
  path: '/blog',
})

const categories = ['all', 'tax', 'insurance', 'immigration', 'ai', 'general'] as const

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const posts = await getAllPosts()
  const activeCategory = searchParams.category ?? 'all'
  const filtered = activeCategory === 'all'
    ? posts
    : posts.filter(p => p.category === activeCategory)

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-charcoal mb-8">Blog</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-10">
        {categories.map(cat => (
          <Link
            key={cat}
            href={cat === 'all' ? '/blog' : `/blog?category=${cat}`}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              activeCategory === cat
                ? 'bg-teal text-white border-teal'
                : 'border-border text-text-secondary hover:border-teal hover:text-teal'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </Link>
        ))}
      </div>

      {/* Post grid */}
      {filtered.length === 0 ? (
        <p className="text-text-secondary">No posts in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
              <div className="bg-white border border-border rounded-xl overflow-hidden shadow-card hover:shadow-md transition-shadow">
                {post.coverImage && (
                  <img src={post.coverImage} alt={post.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-6">
                  <Badge variant="silver">{post.category}</Badge>
                  <h2 className="text-lg font-bold text-charcoal mt-3 mb-2 group-hover:text-teal transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-text-secondary text-sm mb-4">{post.excerpt}</p>
                  <p className="text-xs text-silver">{post.date}</p>
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

- [ ] **Step 2: Create Blog post page**

Create `src/app/blog/[slug]/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug } from '@/lib/blog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { buildMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)
  if (!post) return {}
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.coverImage,
  })
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)
  if (!post) notFound()

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.date,
    publisher: {
      '@type': 'Organization',
      name: 'Manna One Solution',
      url: 'https://mannaos.com',
    },
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-16">
      <JsonLd data={articleSchema} />
      {post.coverImage && (
        <img src={post.coverImage} alt={post.title} className="w-full h-64 object-cover rounded-xl mb-8" />
      )}
      <Badge variant="silver">{post.category}</Badge>
      <h1 className="text-4xl font-bold text-charcoal mt-4 mb-2">{post.title}</h1>
      <p className="text-silver text-sm mb-10">{post.date}</p>
      <div
        className="prose prose-lg max-w-none text-text-secondary"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      <div className="mt-12 border-t border-border pt-8 text-center">
        <p className="text-text-secondary mb-4">Need help? Book a free consultation.</p>
        <Button href="/contact" variant="primary">Book Now</Button>
      </div>
    </article>
  )
}
```

- [ ] **Step 3: Verify blog in browser**

```bash
npm run dev
```
Visit http://localhost:3000/blog. Confirm seed post card appears. Click through to the post. Confirm content renders, category filter works.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add blog list and post pages with Article JSON-LD"
```

---

## Task 14: Sitemap & next-sitemap

**Files:**
- Create: `next-sitemap.config.js`
- Modify: `package.json` (add postbuild script)

- [ ] **Step 1: Install next-sitemap**

```bash
npm install next-sitemap
```

- [ ] **Step 2: Create sitemap config**

Create `next-sitemap.config.js`:
```javascript
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://mannaos.com',
  generateRobotsTxt: false,  // we manage robots.txt manually
  exclude: ['/portal/*', '/admin/*', '/login', '/signup', '/forgot-password', '/api/*'],
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
}
```

- [ ] **Step 3: Add postbuild script**

In `package.json`, add to scripts:
```json
{
  "scripts": {
    "postbuild": "next-sitemap"
  }
}
```

- [ ] **Step 4: Test sitemap generation**

```bash
npm run build
```
Expected: Build succeeds, `public/sitemap.xml` and `public/sitemap-0.xml` are created.

Verify `public/sitemap.xml` includes /services/tax, /services/insurance, /services/immigration, /services/ai, /about, /contact, /blog.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add next-sitemap for SEO sitemap generation"
```

---

## Task 15: Vercel Deployment

- [ ] **Step 1: Create GitHub repository**

```bash
# On GitHub: create new repo "mannaos-web" (private or public)
git remote add origin https://github.com/ChrisNguyenUS/mannaos-web.git
git push -u origin main
```

- [ ] **Step 2: Connect to Vercel**

1. Go to vercel.com → Add New Project → Import from GitHub → select `mannaos-web`
2. Framework preset: Next.js (auto-detected)
3. Add environment variables:
   - `NEXT_PUBLIC_FORMSPREE_ID` — your Formspree form ID
   - `NEXT_PUBLIC_CALENDLY_URL` — your Calendly URL
4. Click Deploy

- [ ] **Step 3: Verify deployment**

Open the Vercel preview URL. Check:
- Home page loads
- Navbar logo renders
- Language toggle switches EN ↔ VI
- /services, /about, /contact, /blog all load
- Contact form submits (check Formspree dashboard)
- Calendly embed loads on /contact

- [ ] **Step 4: Connect MannaOS.com domain**

1. In Vercel project → Settings → Domains → Add `mannaos.com` and `www.mannaos.com`
2. Copy the A record and CNAME shown by Vercel
3. In your domain registrar DNS settings: add those records
4. Wait 24–48h for propagation
5. Vercel auto-provisions SSL

- [ ] **Step 5: Submit to search engines**

1. Go to Google Search Console → Add Property → `https://mannaos.com`
2. Verify ownership (Vercel meta tag method)
3. Submit sitemap: `https://mannaos.com/sitemap.xml`
4. Go to Bing Webmaster Tools → add site → submit sitemap

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: ready for Vercel deployment — Plan 1 complete"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by task |
|---|---|
| Tech Stack (Next.js, Vercel, Formspree, Calendly) | Tasks 1, 12, 15 |
| Design System (colors, typography, logo) | Tasks 2, 7 |
| Logo (transparent PNG primary) | Tasks 9 |
| Site structure (all public routes) | Tasks 10–13 |
| Home page (all sections) | Task 10 |
| Services pages (all 4 + overview) | Task 11 |
| FAQ JSON-LD on service pages | Task 6, 11 |
| About page | Task 12 |
| Contact + Calendly + Formspree | Task 12 |
| Blog with category filter | Task 13 |
| Bilingual system (EN default, VI/EN toggle) | Task 4 |
| Language toggle pill in navbar | Task 8 |
| Floating phone + Facebook buttons | Task 7 |
| SEO (meta, OG, JSON-LD, hreflang) | Tasks 6, 10–13 |
| GEO (llms.txt, FAQ schema, credentials) | Tasks 6, 9, 11 |
| Sitemap + robots.txt | Tasks 9, 14 |
| Vercel deployment + domain | Task 15 |

**Out of scope for Plan 1 (handled in Plans 2–3):**
- Auth, login, signup pages
- Client portal (/portal/*)
- Admin panel (/admin/*)
- Supabase connection
- USCIS auto-sync

**No placeholders found.** All steps include actual code or commands.
**Type consistency verified:** `BlogPost`, `FaqItem`, `ServiceType`, `Language` types used consistently across tasks.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-09-mannaos-plan1-foundation-public-site.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
