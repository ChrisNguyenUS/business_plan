# N400 IA Redesign — Plan 1: Navigation Shell (4-tab IA + Study picker + Progress merge)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize N400app navigation into 4 top-level areas — Home, Study (Học tập), Mock Exam (Thi thử), Progress (Tiến độ) — on both desktop sidebar and mobile bottom nav; add the `/study` skill-picker page and an interim `/study/civics` page; merge the two progress pages under one nav item with a shared tab bar.

**Architecture:** Pure navigation-layer change. No study/quiz screen is touched. `Sidebar.tsx` gets a HỌC TẬP group (4 skills) replacing the CIVICS/SPEAKING/WRITING groups; `MobileNav` becomes Home/Học tập/Thi thử/Tiến độ (this restores mobile access to Speaking, Writing, and Progress — currently unreachable on mobile). `Header.tsx` metadata is updated for the new hierarchy. `/statistic` and `/progress` keep their URLs and content but both render a shared `ProgressTabs` switcher.

**Tech Stack:** Next.js (App Router) at `apps/website/`, React client components, Tailwind, lucide-react, vitest source-contract tests.

**Spec:** `docs/superpowers/specs/2026-07-09-n400app-ia-redesign-design.md` (§3, §7). No dependency on other plans. Plans 2 and 3 depend on this plan being merged.

**Working directory for all commands:** `apps/website/`.

---

## Context an engineer needs

- **Sidebar + MobileNav** live in `src/components/n400/Sidebar.tsx`. Nav items are `{ id, label, href, icon }`; `href` is relative to `/${locale}/n400app` (empty string = dashboard). Active state: `href === base ? pathname === base : pathname?.startsWith(href)`.
- **Header** (`src/components/n400/Header.tsx`) derives the page title from the first path segment after `/n400app` via `TITLES`, decides back-button visibility via `PRIMARY_SECTIONS`, and back-target via `PARENT_MAP`.
- **User state** (`src/lib/n400/user-state.tsx`): `useN400UserState()` → `{ state, hydrated, stats }`. `stats.distinctAnswered` = civics questions attempted (the "đã học" number). Section seen-counts come from `deriveSectionSeen(state.sectionAttempts)` (`src/lib/n400/section-progress.ts`) → `{ whatmean, yesno, writing }` Sets of item ids.
- **Data pools**: `WHATMEAN_QUESTIONS` (62, `src/lib/n400/whatmean-data.ts`), `YESNO_QUESTIONS` (37, `src/lib/n400/yesno-data.ts`), `WRITING_SENTENCES` (45, `src/lib/n400/writing-data.ts`), civics = 128.
- **UI primitives**: `ProgressBar` from `@/components/n400/ui` — usage `<ProgressBar progress={0-100} />` (optional `heightClass`).
- **Contract-test convention**: `src/components/n400/navigation-ia.test.ts` reads source files with `readFileSync` and asserts on strings. Follow this pattern; don't render components.
- Existing tests that must KEEP passing unchanged: `mobile-layout.test.ts` (expects Sidebar to contain `hidden lg:flex`), the flashcards + bookmark contracts in `navigation-ia.test.ts`.
- Gate: `npm run type-check && npm run test`. Single test file: `npx vitest run <path>`.

## File structure this plan creates

```
apps/website/src/
├── components/n400/
│   ├── Sidebar.tsx                          (Task 2: modify — new groups + 4-tab mobile)
│   ├── Header.tsx                           (Task 3: modify — titles/primary/parent maps)
│   ├── navigation-ia.test.ts                (Tasks 1–4: extend/rewrite contracts)
│   └── progress/ProgressTabs.tsx            (Task 4: create)
└── app/[locale]/n400app/
    ├── study/page.tsx                       (Task 1: create — skill picker)
    ├── study/civics/page.tsx                (Task 1: create — interim hub, replaced in Plan 2)
    ├── statistic/page.tsx                   (Task 4: modify — add <ProgressTabs />)
    └── progress/page.tsx                    (Task 4: modify — add <ProgressTabs />)
```

---

### Task 1: `/study` skill picker + interim `/study/civics` page

**Files:**
- Create: `src/app/[locale]/n400app/study/page.tsx`
- Create: `src/app/[locale]/n400app/study/civics/page.tsx`
- Test: `src/components/n400/navigation-ia.test.ts`

- [ ] **Step 1: Write the failing contract test**

Append inside the existing `describe('N400 information architecture contracts', ...)` block in `src/components/n400/navigation-ia.test.ts`:

```ts
  test('study picker links to all four skills', () => {
    const page = source('src/app/[locale]/n400app/study/page.tsx');

    expect(page).toContain('study/civics');
    expect(page).toContain('speaking/what-mean');
    expect(page).toContain('speaking/yes-no');
    expect(page).toContain('/writing');
  });

  test('civics hub links to the existing flashcards and practice screens', () => {
    const page = source('src/app/[locale]/n400app/study/civics/page.tsx');

    expect(page).toContain('flashcards');
    expect(page).toContain('practice');
  });
```

- [ ] **Step 2: Run test — expect FAIL** (`npx vitest run src/components/n400/navigation-ia.test.ts` — the two new tests fail with ENOENT).

- [ ] **Step 3: Create `src/app/[locale]/n400app/study/page.tsx`**

```tsx
'use client';

// /study — the Học tập hub (skill picker). The mobile "Học tập" tab lands
// here; each card opens one skill's hub. Card chrome mirrors the mock-test
// picker cards.

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  Landmark,
  MessageCircleQuestion,
  MessagesSquare,
  PenLine,
  type LucideIcon,
} from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';
import { useN400UserState } from '@/lib/n400/user-state';
import { deriveSectionSeen } from '@/lib/n400/section-progress';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { WRITING_SENTENCES } from '@/lib/n400/writing-data';

const CIVICS_TOTAL = 128;

interface SkillCard {
  id: string;
  href: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  desc: string;
  done: number;
  total: number;
  unit: string;
}

export default function StudyPage() {
  const { state, hydrated, stats } = useN400UserState();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts), [state.sectionAttempts]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const skills: SkillCard[] = [
    {
      id: 'civics',
      href: `${base}/study/civics`,
      icon: Landmark,
      tone: 'bg-teal-50 text-teal-600',
      title: 'Civics',
      desc: 'Học và ôn tập 128 câu hỏi Civics chính thức của kỳ thi quốc tịch Mỹ (N-400).',
      done: stats.distinctAnswered,
      total: CIVICS_TOTAL,
      unit: 'câu',
    },
    {
      id: 'whatmean',
      href: `${base}/speaking/what-mean`,
      icon: MessageCircleQuestion,
      tone: 'bg-purple-50 text-purple-600',
      title: 'What Mean',
      desc: 'Luyện các câu hỏi “What mean” thường gặp trong phần phỏng vấn N-400.',
      done: seen.whatmean.size,
      total: WHATMEAN_QUESTIONS.length,
      unit: 'từ',
    },
    {
      id: 'yesno',
      href: `${base}/speaking/yes-no`,
      icon: MessagesSquare,
      tone: 'bg-blue-50 text-blue-600',
      title: 'Yes / No',
      desc: 'Trả lời các câu hỏi Yes/No về bản thân, tiền án, thuế,… trong phần phỏng vấn.',
      done: seen.yesno.size,
      total: YESNO_QUESTIONS.length,
      unit: 'câu',
    },
    {
      id: 'writing',
      href: `${base}/writing`,
      icon: PenLine,
      tone: 'bg-orange-50 text-orange-500',
      title: 'Writing',
      desc: 'Luyện phần thi viết N-400: nghe và gõ lại câu đúng chính tả.',
      done: seen.writing.size,
      total: WRITING_SENTENCES.length,
      unit: 'bài',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl animate-in fade-in duration-300">
      <h1 className="mb-4 text-lg font-bold text-gray-800 sm:text-xl">Chọn kỹ năng bạn muốn học</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {skills.map((s) => {
          const Icon = s.icon;
          const percent = s.total === 0 ? 0 : Math.round((s.done / s.total) * 100);
          return (
            <Link
              key={s.id}
              href={s.href}
              className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.tone}`}>
                <Icon size={24} />
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-gray-800">{s.title}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-500">{s.desc}</p>
              <div className="mt-4 text-sm text-gray-600">
                Đã học: <span className="font-bold text-gray-900">{s.done}</span> / {s.total} {s.unit}
              </div>
              <div className="mt-2">
                <ProgressBar progress={percent} />
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 transition-colors group-hover:text-teal-700">
                Bắt đầu học
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/[locale]/n400app/study/civics/page.tsx`** (interim — Plan 2 replaces this with the full hub):

```tsx
'use client';

// Interim Civics hub. Plan 2 (skill hubs) replaces this page with the full
// hub module (Continue / Thẻ học / Luyện tập / Điểm yếu). Until then it only
// routes to the two existing Civics screens so the new navigation works.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle, Layers, ArrowRight } from 'lucide-react';

export default function CivicsHubPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const items = [
    { href: `${base}/flashcards`, icon: Layers, title: 'Flashcards', desc: 'Lật thẻ — học theo từng câu.' },
    { href: `${base}/practice`, icon: CheckCircle, title: 'Luyện tập', desc: 'Trắc nghiệm và xem ngay đáp án.' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 animate-in fade-in duration-300">
      <h1 className="text-2xl font-extrabold text-gray-900">🇺🇸 Civics — 128 câu</h1>
      {items.map(({ href, icon: Icon, title, desc }) => (
        <Link
          key={href}
          href={href}
          className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Icon size={22} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-800">{title}</div>
            <div className="text-sm text-gray-500">{desc}</div>
          </div>
          <ArrowRight size={18} className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600" />
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run test — expect PASS** (`npx vitest run src/components/n400/navigation-ia.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/n400app/study src/components/n400/navigation-ia.test.ts
git commit -m "feat(n400app): add /study skill picker and interim civics hub"
```

---

### Task 2: Sidebar HỌC TẬP group + 4-tab mobile nav

**Files:**
- Modify: `src/components/n400/Sidebar.tsx`
- Test: `src/components/n400/navigation-ia.test.ts`

- [ ] **Step 1: Write the failing contract test** (append to the same describe block):

```ts
  test('sidebar groups skills under HỌC TẬP and keeps four top-level areas', () => {
    const sidebar = source('src/components/n400/Sidebar.tsx');

    expect(sidebar).toContain('HỌC TẬP');
    expect(sidebar).toContain("href: 'study/civics'");
    expect(sidebar).toContain("href: 'speaking/what-mean'");
    expect(sidebar).toContain("href: 'speaking/yes-no'");
    expect(sidebar).toContain("href: 'writing'");
    // Learning methods are no longer nav destinations:
    expect(sidebar).not.toContain("href: 'practice'");
    expect(sidebar).not.toContain("href: 'flashcards'");
    // One merged progress entry, pointing at statistic:
    expect(sidebar).not.toContain("href: 'progress'");
    expect(sidebar).not.toContain('CIVICS (128 câu)');
  });

  test('mobile nav is Home / Học tập / Thi thử / Tiến độ', () => {
    const sidebar = source('src/components/n400/Sidebar.tsx');
    const mobile = sidebar.slice(sidebar.indexOf('MOBILE_MENU'));

    expect(mobile).toContain("href: 'study'");
    expect(mobile).toContain("href: 'mock-test'");
    expect(mobile).toContain("href: 'statistic'");
  });
```

- [ ] **Step 2: Run test — expect FAIL.**

- [ ] **Step 3: Rework the nav data in `Sidebar.tsx`.**

Replace the lucide import list (drop `CheckCircle`, `Layers`, `Award` if now unused; add `Landmark`, `PenLine`, `GraduationCap`):

```ts
import {
  Home,
  BarChart2,
  Settings,
  LogOut,
  Moon,
  ClipboardCheck,
  Landmark,
  MessageCircleQuestion,
  PenLine,
  GraduationCap,
} from 'lucide-react';
```

Extend `MenuItem` with an optional extra-match list (so Tiến độ highlights on `/progress`, Civics on `/practice` + `/flashcards`, and the mobile Học tập tab on the section routes):

```ts
type MenuItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
  /** Extra n400app-relative path prefixes that also count as active. */
  alsoMatch?: string[];
};
```

Replace `DESKTOP_GROUPS`, `SECONDARY_MENU`, and `MOBILE_MENU` with:

```ts
const DESKTOP_GROUPS: NavGroup[] = [
  { heading: null, items: [{ id: 'dashboard', label: 'Tổng quan', href: '', icon: Home }] },
  {
    heading: 'HỌC TẬP',
    items: [
      { id: 'civics', label: 'Civics', href: 'study/civics', icon: Landmark, alsoMatch: ['practice', 'flashcards'] },
      { id: 'whatmean', label: 'What Mean', href: 'speaking/what-mean', icon: MessageCircleQuestion },
      { id: 'yesno', label: 'Yes / No', href: 'speaking/yes-no', icon: MessageCircleQuestion },
      { id: 'writing', label: 'Writing', href: 'writing', icon: PenLine },
    ],
  },
  { heading: null, items: [{ id: 'mock-test', label: 'Thi thử', href: 'mock-test', icon: ClipboardCheck }] },
];

const SECONDARY_MENU: MenuItem[] = [
  { id: 'tiendo', label: 'Tiến độ', href: 'statistic', icon: BarChart2, alsoMatch: ['progress'] },
];

/** Mobile bottom nav — the same four top-level areas as desktop. */
const MOBILE_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Tổng quan', href: '', icon: Home },
  { id: 'study', label: 'Học tập', href: 'study', icon: GraduationCap, alsoMatch: ['speaking', 'writing', 'practice', 'flashcards'] },
  { id: 'mock-test', label: 'Thi thử', href: 'mock-test', icon: ClipboardCheck },
  { id: 'tiendo', label: 'Tiến độ', href: 'statistic', icon: BarChart2, alsoMatch: ['progress'] },
];
```

- [ ] **Step 4: Teach both nav renderers about `alsoMatch`.**

In `NavItem`, replace the `isActive` line with:

```ts
  const extraActive = (item.alsoMatch ?? []).some((m) => pathname?.startsWith(`${base}/${m}`));
  const isActive = (href === base ? pathname === base : pathname?.startsWith(href)) || extraActive;
```

In `MobileNav`'s map body, replace the `isActive` assignment with the same two lines (it already has `base`, `pathname`, and `href` in scope).

- [ ] **Step 5: Run tests — expect PASS** (`npx vitest run src/components/n400/navigation-ia.test.ts src/components/n400/mobile-layout.test.ts`). Also run `npm run type-check` — unused-import errors surface here.

- [ ] **Step 6: Commit**

```bash
git add src/components/n400/Sidebar.tsx src/components/n400/navigation-ia.test.ts
git commit -m "feat(n400app): 4-area navigation — HỌC TẬP group on desktop, Học tập/Tiến độ tabs on mobile"
```

---

### Task 3: Header metadata for the new hierarchy

**Files:**
- Modify: `src/components/n400/Header.tsx`
- Test: `src/components/n400/navigation-ia.test.ts`

- [ ] **Step 1: Write the failing contract test** (append):

```ts
  test('header knows the new sections and parents', () => {
    const header = source('src/components/n400/Header.tsx');

    expect(header).toContain("study:");
    expect(header).toContain("speaking:");
    expect(header).toContain("writing:");
    expect(header).toContain("practice: 'study/civics'");
    expect(header).toContain("flashcards: 'study/civics'");
  });
```

- [ ] **Step 2: Run test — expect FAIL.**

- [ ] **Step 3: Update the three maps in `Header.tsx`.**

Add to `TITLES` (keep existing entries):

```ts
  study: { title: 'Học tập', subtitle: 'Chọn kỹ năng bạn muốn học hôm nay.' },
  speaking: { title: 'Speaking' },
  writing: { title: 'Writing', subtitle: 'Nghe và gõ lại câu — luyện phần thi viết N-400.' },
  progress: { title: 'Tiến độ', subtitle: 'Huy hiệu và thành tích của bạn.' },
```

Replace `PRIMARY_SECTIONS`:

```ts
/** Primary sections use lateral navigation (no Back button). */
const PRIMARY_SECTIONS = ['', 'study', 'mock-test', 'statistic', 'progress'];
```

Replace `PARENT_MAP`:

```ts
const PARENT_MAP: Record<string, string> = {
  profile: '',
  categories: '',
  help: '',
  setup: '',
  practice: 'study/civics',
  flashcards: 'study/civics',
  speaking: 'study',
  writing: 'study',
};
```

Note: `/study/civics` itself detects section `study` → primary, no back button — intended (it's a hub). `practice`/`flashcards` become secondary pages whose back button returns to the Civics hub.

- [ ] **Step 4: Run tests — expect PASS**, plus `npm run type-check`.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/Header.tsx src/components/n400/navigation-ia.test.ts
git commit -m "feat(n400app): header titles + back-targets for study hierarchy"
```

---

### Task 4: Merge Progress — shared tab bar over /statistic and /progress

**Files:**
- Create: `src/components/n400/progress/ProgressTabs.tsx`
- Modify: `src/app/[locale]/n400app/statistic/page.tsx`
- Modify: `src/app/[locale]/n400app/progress/page.tsx`
- Test: `src/components/n400/navigation-ia.test.ts`

- [ ] **Step 1: Write the failing contract test** (append):

```ts
  test('both progress pages render the shared tab bar', () => {
    expect(source('src/app/[locale]/n400app/statistic/page.tsx')).toContain('ProgressTabs');
    expect(source('src/app/[locale]/n400app/progress/page.tsx')).toContain('ProgressTabs');
  });
```

- [ ] **Step 2: Run test — expect FAIL.**

- [ ] **Step 3: Create `src/components/n400/progress/ProgressTabs.tsx`**

```tsx
'use client';

// Segmented switcher shown on both Tiến độ pages. The two pages keep their
// URLs (/statistic, /progress); the sidebar has a single "Tiến độ" entry.

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

export function ProgressTabs() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const tabs = [
    { href: `${base}/statistic`, label: 'Thống kê' },
    { href: `${base}/progress`, label: 'Thành tích' },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1">
      {tabs.map((t) => {
        const active = pathname?.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              active ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Mount it on both pages.**

`statistic/page.tsx` — add the import, then in the main return (line ~182, the `<div className="space-y-6 animate-in fade-in duration-300 max-w-[1400px] mx-auto">`) insert `<ProgressTabs />` as the FIRST child, above the KPI grid:

```tsx
import { ProgressTabs } from '@/components/n400/progress/ProgressTabs';
...
  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-[1400px] mx-auto">
      <ProgressTabs />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
```

Also add `<ProgressTabs />` above the empty-state `<Card>` in the no-data branch (line ~117) wrapped the same way:

```tsx
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <ProgressTabs />
        <Card className="mx-auto max-w-xl p-6 text-center sm:p-12">
          ...existing empty-state content unchanged...
        </Card>
      </div>
    );
```

`progress/page.tsx` — add the import and insert `<ProgressTabs />` as the first child of the outer `<div className="space-y-8 animate-in fade-in duration-300 max-w-[1100px] mx-auto">`, above the `Huy hiệu & Thành tích` heading block.

- [ ] **Step 5: Run the full gate — expect PASS**

```bash
npm run type-check && npm run test
```

`mobile-layout.test.ts` asserts on statistic grid classes — those sections are untouched, so it must still pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/n400/progress/ProgressTabs.tsx "src/app/[locale]/n400app/statistic/page.tsx" "src/app/[locale]/n400app/progress/page.tsx" src/components/n400/navigation-ia.test.ts
git commit -m "feat(n400app): merge Tiến độ — shared tab bar over statistic + achievements"
```

---

### Task 5: Final verification

- [ ] **Step 1: Full gate** — `npm run type-check && npm run test` from `apps/website/`. Expected: all pass.
- [ ] **Step 2: Manual smoke (dev server)** — `npm run dev`, then check:
  - Desktop sidebar shows: Tổng quan · HỌC TẬP (Civics, What Mean, Yes/No, Writing) · Thi thử · Tiến độ.
  - Mobile (narrow viewport) bottom nav shows 4 tabs; Học tập tab opens the skill picker; every skill reachable.
  - `/statistic` ↔ `/progress` switch via tabs; sidebar "Tiến độ" stays highlighted on both.
  - `/practice` and `/flashcards` still work via the interim Civics hub, with back-chevron returning to the hub.
- [ ] **Step 3: Commit any fixups** (atomic, one concern per commit).
