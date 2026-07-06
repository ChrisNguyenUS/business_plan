# Flashcards ⊕ Bookmark Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the standalone Đánh dấu (bookmark) page into the Flashcards page as a "Danh sách" view mode, remove the bookmark navigation item, and add an "Đã thuộc" filter — per `docs/superpowers/specs/2026-07-05-flashcards-bookmark-merge-design.md`.

**Architecture:** Pure filter logic moves into `lib/n400/quiz-engine.ts` (testable, shared by both views). The Flashcards page gains a `view: 'cards' | 'list'` toggle; the list UI becomes a colocated `QuestionList` component. Navigation entries (Sidebar, AvatarMenu, Header) drop bookmark; the old route becomes a server redirect. Codebase test conventions: vitest unit tests for lib logic, file-content "contract" tests for layout/IA invariants (see `src/components/n400/mobile-layout.test.ts`).

**Tech Stack:** Next.js App Router (see `apps/website/AGENTS.md` — read `node_modules/next/dist/docs/` if unsure about an API), React 19 client components, Tailwind, lucide-react, vitest.

**Working directory for all commands:** `apps/website/` (run `pnpm test`, `pnpm type-check`, `pnpm lint` from there).

**Monorepo isolation:** touch ONLY files under `apps/website/`. Do not modify internal_app.

**Visual constraint (from spec):** NOT a visual redesign. Reuse existing Tailwind classes/patterns verbatim where shown. Do NOT add stats, charts, XP, badges, or progress widgets to the Flashcards page.

---

### Task 1: `filterFlashcards` helper in quiz-engine (TDD)

**Files:**
- Modify: `apps/website/src/lib/n400/quiz-engine.ts`
- Test: `apps/website/src/lib/n400/quiz-engine.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/website/src/lib/n400/quiz-engine.test.ts`. The file already imports `describe, it, expect` from vitest and several quiz-engine exports — add `filterFlashcards` to the existing quiz-engine import list, and add `N400_QUESTIONS` from questions-data if not already imported:

```ts
import { N400_QUESTIONS } from './questions-data';
```

Then append this describe block at the end of the file:

```ts
describe('filterFlashcards', () => {
  const qs = N400_QUESTIONS;

  it('returns all questions for the all filter', () => {
    expect(filterFlashcards(qs, 'all', [], [])).toHaveLength(qs.length);
  });

  it('unknown excludes known question ids', () => {
    const known = [qs[0].id, qs[1].id];
    const out = filterFlashcards(qs, 'unknown', [], known);
    expect(out).toHaveLength(qs.length - 2);
    expect(out.some((q) => known.includes(q.id))).toBe(false);
  });

  it('known returns only known question ids', () => {
    const known = [qs[0].id, qs[5].id];
    const out = filterFlashcards(qs, 'known', [], known);
    expect(out.map((q) => q.id).sort((a, b) => a - b)).toEqual(known.sort((a, b) => a - b));
  });

  it('bookmarks returns only bookmarked question ids', () => {
    const bookmarks = [qs[2].id];
    const out = filterFlashcards(qs, 'bookmarks', bookmarks, []);
    expect(out.map((q) => q.id)).toEqual(bookmarks);
  });

  it('category filter returns only that category', () => {
    const out = filterFlashcards(qs, 'history', [], []);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((q) => q.category === 'history')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/n400/quiz-engine.test.ts`
Expected: FAIL — `filterFlashcards` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `apps/website/src/lib/n400/quiz-engine.ts` (it already imports `N400Question` and `N400CategoryKey` from `./questions-data` on line 1 — no import changes needed), add near the other exported helpers:

```ts
// ── Flashcards filtering (shared by card view and list view) ─────────────────

export type FlashcardFilter = 'all' | 'unknown' | 'known' | 'bookmarks' | N400CategoryKey;

export function filterFlashcards(
  questions: N400Question[],
  filter: FlashcardFilter,
  bookmarks: number[],
  known: number[]
): N400Question[] {
  switch (filter) {
    case 'all':
      return questions;
    case 'unknown':
      return questions.filter((q) => !known.includes(q.id));
    case 'known':
      return questions.filter((q) => known.includes(q.id));
    case 'bookmarks':
      return questions.filter((q) => bookmarks.includes(q.id));
    default:
      return questions.filter((q) => q.category === filter);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/lib/n400/quiz-engine.test.ts`
Expected: PASS (all existing + 5 new tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/quiz-engine.ts src/lib/n400/quiz-engine.test.ts
git commit -m "feat(website): add filterFlashcards helper with known filter"
```

---

### Task 2: Wire the helper + "Đã thuộc" filter + per-filter empty states into the Flashcards page

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/flashcards/page.tsx`

- [ ] **Step 1: Update imports and filter definitions**

At the top of `flashcards/page.tsx`:

1. Add to the existing imports:

```ts
import Link from 'next/link';
import { useParams } from 'next/navigation';
```

2. Extend the existing `@/lib/n400/quiz-engine` import with `filterFlashcards` and `type FlashcardFilter`.

3. Delete the local type (currently line 38):

```ts
type FilterMode = 'all' | 'unknown' | 'bookmarks' | N400CategoryKey;
```

4. Replace `FILTER_OPTIONS` (currently lines 40–49) with:

```ts
const FILTER_OPTIONS: { id: FlashcardFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả 128 câu' },
  { id: 'unknown', label: 'Chưa thuộc' },
  { id: 'known', label: 'Đã thuộc' },
  { id: 'bookmarks', label: 'Đã đánh dấu' },
  { id: 'principles', label: N400_CATEGORY_LABELS.principles.vi },
  { id: 'system', label: N400_CATEGORY_LABELS.system.vi },
  { id: 'rights', label: N400_CATEGORY_LABELS.rights.vi },
  { id: 'history', label: N400_CATEGORY_LABELS.history.vi },
  { id: 'symbols', label: N400_CATEGORY_LABELS.symbols.vi },
];
```

- [ ] **Step 2: Update component state and question selection**

1. Change the filter state declaration to use the shared type, and add locale (needed by the empty state CTA):

```ts
const [filter, setFilter] = useState<FlashcardFilter>('all');
const params = useParams();
const locale = (params?.locale as string) || 'en';
```

2. Replace the `questions` useMemo body (currently lines 73–88) with:

```ts
const questions = useMemo(() => {
  const qs = filterFlashcards(N400_QUESTIONS, filter, state.bookmarks, state.flashcardKnown);
  return shuffle(
    qs.map((q) => q.id),
    `flash-${filter}-${seed}`
  )
    .map((id) => N400_QUESTIONS.find((q) => q.id === id)!)
    .filter(Boolean);
}, [filter, seed, state.bookmarks, state.flashcardKnown]);
```

3. In the `useEffect` that reads `?filter=` (currently lines 173–181), rename the local `params` variable to `p` (it would otherwise shadow the new `useParams()` result) and rename the cast type:

```ts
useEffect(() => {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search);
    const f = p.get('filter') as FlashcardFilter;
    if (f && FILTER_OPTIONS.some((o) => o.id === f)) {
      setFilter(f);
    }
  }
}, []);
```

- [ ] **Step 3: Replace the empty state with per-filter copy and CTAs**

Replace the `if (total === 0)` block (currently lines 97–113) with:

```tsx
if (total === 0) {
  return (
    <Card className="p-8 text-center max-w-md mx-auto">
      <h3 className="font-bold text-gray-800 mb-2">
        {filter === 'bookmarks'
          ? 'Bạn chưa đánh dấu câu hỏi nào'
          : filter === 'known'
            ? 'Chưa có câu nào "Đã thuộc"'
            : 'Không có câu nào trong bộ lọc này'}
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        {filter === 'bookmarks'
          ? 'Nhấn biểu tượng dấu trang trên thẻ hoặc trong Luyện tập để lưu câu cần ôn lại.'
          : filter === 'known'
            ? 'Hãy học vài thẻ trước — nhấn "Đã thuộc" khi bạn đã nhớ câu trả lời.'
            : 'Đổi sang bộ lọc khác hoặc luyện tập để đánh dấu các câu đã thuộc.'}
      </p>
      <div className="flex items-center justify-center gap-3">
        {filter === 'bookmarks' ? (
          <Link
            href={`/${locale}/n400app/practice`}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold"
          >
            Vào luyện tập
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl font-semibold ${
            filter === 'bookmarks'
              ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              : 'bg-teal-600 text-white'
          }`}
        >
          Xem tất cả 128 câu
        </button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm type-check && pnpm test`
Expected: PASS, no type errors.

Run: `pnpm dev`, open `http://localhost:3000/en/n400app/flashcards`
Expected: new "Đã thuộc" chip appears after "Chưa thuộc"; selecting it with no learned cards shows the new empty state; "Đã đánh dấu" with no bookmarks shows the CTA pair.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/n400app/flashcards/page.tsx"
git commit -m "feat(website): add Đã thuộc filter and per-filter empty states to flashcards"
```

---

### Task 3: `QuestionList` list-view component

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/flashcards/QuestionList.tsx`

Colocated with the page (same pattern as `mock-test/types.ts`): it is used only by the Flashcards page — Rule of Three says don't put it in shared components. UI is carried over from the old `bookmark/page.tsx` with two behavior changes: it renders whatever the active filter selected (not only bookmarks), and the trash icon becomes a bookmark toggle.

- [ ] **Step 1: Create the component**

Full file content:

```tsx
'use client';

/*
 * QuestionList — "Danh sách" view mode of the Flashcards page.
 * Renders the questions already selected by the page-level filter chips
 * as a searchable, scrollable reading list (question, answer, audio,
 * category chip, bookmark toggle).
 */

import { Bookmark, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import {
  N400_CATEGORY_LABELS,
  type N400CategoryKey,
  type N400Question,
} from '@/lib/n400/questions-data';
import { questionAudioUrl, correctAnswersFor } from '@/lib/n400/quiz-engine';
import type { StateCode } from '@/lib/n400/state-data';

const CATEGORY_TONE: Record<N400CategoryKey, { bg: string; text: string; chip: string; chipText: string }> = {
  principles: { bg: 'bg-teal-50', text: 'text-teal-600', chip: 'bg-teal-50', chipText: 'text-teal-700' },
  system: { bg: 'bg-orange-50', text: 'text-orange-500', chip: 'bg-orange-50', chipText: 'text-orange-600' },
  rights: { bg: 'bg-yellow-50', text: 'text-yellow-500', chip: 'bg-yellow-50', chipText: 'text-yellow-600' },
  history: { bg: 'bg-purple-50', text: 'text-purple-600', chip: 'bg-purple-50', chipText: 'text-purple-700' },
  symbols: { bg: 'bg-blue-50', text: 'text-blue-600', chip: 'bg-blue-50', chipText: 'text-blue-700' },
};

interface QuestionListProps {
  /** Already filtered by the page-level filter chips. */
  questions: N400Question[];
  bookmarks: number[];
  onToggleBookmark: (id: number) => void;
  stateCode: StateCode;
  districtNumber: number | null;
}

export function QuestionList({
  questions,
  bookmarks,
  onToggleBookmark,
  stateCode,
  districtNumber,
}: QuestionListProps) {
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const sorted = [...questions].sort((a, b) => a.id - b.id);
    if (!search.trim()) return sorted;
    const s = search.toLowerCase();
    return sorted.filter(
      (q) =>
        q.questionEn.toLowerCase().includes(s) ||
        q.questionVi.toLowerCase().includes(s) ||
        String(q.id) === s
    );
  }, [questions, search]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full animate-in fade-in duration-[var(--motion-fast)]">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm câu hỏi..."
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
        />
      </label>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <h4 className="font-bold text-gray-800">Không có kết quả phù hợp</h4>
          <p className="text-sm text-gray-500 mt-1">Thử từ khóa khác hoặc xóa ô tìm kiếm.</p>
        </Card>
      ) : (
        items.map((q) => {
          const tone = CATEGORY_TONE[q.category];
          const isBookmarked = bookmarks.includes(q.id);
          const correct = correctAnswersFor(q, stateCode, districtNumber);
          const answers = correct.length > 0
            ? correct
            : q.answersEn.slice(0, 1).map((en, i) => ({ en, vi: q.answersVi[i] ?? en }));
          return (
            <Card
              key={q.id}
              className="flex gap-4 items-start p-6 hover:border-gray-300 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold ${tone.bg} ${tone.text}`}>
                {q.id}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className={`font-bold mb-1 ${tone.text}`}>Q. {q.id}</h4>
                    <p className="text-gray-800 font-medium">{q.questionEn}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{q.questionVi}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <AudioButton src={questionAudioUrl(q.id)} size="sm" label="Nghe câu hỏi" />
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(q.id)}
                      aria-label={isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu'}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 ${
                        isBookmarked
                          ? 'bg-amber-100 text-amber-500 shadow-sm shadow-amber-500/20'
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-amber-500'
                      }`}
                    >
                      <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-700">
                  <span className="text-gray-500">Đáp án: </span>
                  {answers.map((a, i) => (
                    <span key={i}>
                      {i > 0 ? ', ' : ''}
                      <span className="font-medium">{a.en}</span>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className={`px-3 py-1 ${tone.chip} ${tone.chipText} text-xs font-bold rounded-md`}>
                    {N400_CATEGORY_LABELS[q.category].vi}
                  </span>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm type-check`
Expected: PASS (component not yet imported anywhere — that's Task 4).

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/n400app/flashcards/QuestionList.tsx"
git commit -m "feat(website): add QuestionList list view component for flashcards"
```

---

### Task 4: View toggle "Học thẻ / Danh sách" + `?view=` param + keyboard guard

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/flashcards/page.tsx`
- Test: `apps/website/src/components/n400/navigation-ia.test.ts` (create)

- [ ] **Step 1: Write the failing contract test**

Create `apps/website/src/components/n400/navigation-ia.test.ts` (same pattern as `mobile-layout.test.ts`):

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('N400 information architecture contracts', () => {
  test('flashcards page offers cards and list view modes', () => {
    const page = source('src/app/[locale]/n400app/flashcards/page.tsx');

    expect(page).toContain("'cards' | 'list'");
    expect(page).toContain('QuestionList');
    expect(page).toContain('Học thẻ');
    expect(page).toContain('Danh sách');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/n400/navigation-ia.test.ts`
Expected: FAIL — page has no view toggle yet.

- [ ] **Step 3: Implement the toggle in `flashcards/page.tsx`**

1. Add `List` to the lucide-react import (the `Layers` icon is NOT currently imported here — add both):

```ts
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, RotateCw, Filter, Layers, List } from 'lucide-react';
```

2. Import the list component:

```ts
import { QuestionList } from './QuestionList';
```

3. Add view state next to the filter state:

```ts
const [view, setView] = useState<'cards' | 'list'>('cards');
```

4. Extend the URL-param effect (the one reading `?filter=`) with view handling:

```ts
useEffect(() => {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search);
    const f = p.get('filter') as FlashcardFilter;
    if (f && FILTER_OPTIONS.some((o) => o.id === f)) {
      setFilter(f);
    }
    if (p.get('view') === 'list') {
      setView('list');
    }
  }
}, []);
```

(Rename the inner variable from `params` to `p` — `params` is now taken by `useParams()` from Task 2.)

5. Guard keyboard shortcuts — first line of `handleKeyDown`, and add `view` to its useCallback dependency array:

```ts
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (view === 'list') return;
  // ...existing switch unchanged...
}, [view, goPrev, goNext, markKnown]);
```

6. Insert the view toggle row as the FIRST child inside the page's root `<div>` (before the Filters row). Large labeled buttons, existing chip styling language:

```tsx
{/* View toggle — shrink-0 */}
<div className="flex items-center gap-2 shrink-0">
  {(
    [
      { id: 'cards', label: 'Học thẻ', icon: Layers },
      { id: 'list', label: 'Danh sách', icon: List },
    ] as const
  ).map(({ id, label, icon: Icon }) => (
    <button
      key={id}
      type="button"
      onClick={() => setView(id)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
        view === id
          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
          : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-slate-50'
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  ))}
</div>
```

7. Wrap the card-mode-only sections in a conditional. Everything from the `{/* Progress — shrink-0 */}` block through the closing of the `{/* Study Controls — shrink-0 */}` div (including the `PersonalizedAnswerNotice` block and the `<Flashcard …/>`) goes inside the `view === 'cards'` branch:

```tsx
{view === 'cards' ? (
  <>
    {/* Progress — shrink-0 */}
    ...existing progress block unchanged...

    ...existing PersonalizedAnswerNotice block unchanged...

    ...existing <Flashcard …/> unchanged...

    {/* Study Controls — shrink-0 */}
    ...existing controls block unchanged...
  </>
) : (
  <div className="flex-1 min-h-0 overflow-y-auto pr-1">
    <QuestionList
      questions={questions}
      bookmarks={state.bookmarks}
      onToggleBookmark={(id) => void toggleBookmark(id)}
      stateCode={stateCode}
      districtNumber={districtNumber}
    />
  </div>
)}
```

The filter chips row stays OUTSIDE the conditional — filters are shared between views and persist when switching (core spec requirement). The `MilestoneBanner`/`BadgeUnlockToast` blocks also stay outside (they relate to actions, not view). The list container's `flex-1 min-h-0 overflow-y-auto` keeps the immersive `flashcards/layout.tsx` contract: the page shell never scrolls; only the list area does.

- [ ] **Step 4: Run tests and type-check**

Run: `pnpm test -- src/components/n400/navigation-ia.test.ts && pnpm type-check`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Run: `pnpm dev`, open `http://localhost:3000/en/n400app/flashcards`:
- Toggle to "Danh sách": searchable list appears, sorted by question number; filter chips still visible and functional.
- Pick filter "Đã đánh dấu", toggle between views: filter persists.
- In list view press Space / R / M: nothing happens (keyboard guard).
- Toggle bookmark on a row while filter = "Đã đánh dấu": row disappears.
- Open `http://localhost:3000/en/n400app/flashcards?view=list&filter=bookmarks` directly: opens in list view with bookmark filter.
- Narrow the window to mobile width: list scrolls, bottom nav unobstructed.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/n400app/flashcards/page.tsx" src/components/n400/navigation-ia.test.ts
git commit -m "feat(website): add cards/list view toggle to flashcards page"
```

---

### Task 5: Remove bookmark from navigation (Sidebar, AvatarMenu, Header)

**Files:**
- Modify: `apps/website/src/components/n400/Sidebar.tsx:50-53` (SECONDARY_MENU)
- Modify: `apps/website/src/components/n400/AvatarMenu.tsx:161-171` (mobile secondary links)
- Modify: `apps/website/src/components/n400/Header.tsx:43,55` (TITLES, PARENT_MAP)
- Test: `apps/website/src/components/n400/navigation-ia.test.ts`

- [ ] **Step 1: Add the failing contract test**

Append inside the existing `describe` block in `navigation-ia.test.ts`:

```ts
  test('bookmark is no longer a navigation destination', () => {
    expect(source('src/components/n400/Sidebar.tsx')).not.toContain("'bookmark'");
    expect(source('src/components/n400/AvatarMenu.tsx')).not.toContain('/bookmark');
    expect(source('src/components/n400/Header.tsx')).not.toContain('bookmark:');
  });
```

Run: `pnpm test -- src/components/n400/navigation-ia.test.ts`
Expected: FAIL (3 assertions).

- [ ] **Step 2: Edit `Sidebar.tsx`**

1. Remove the bookmark entry from `SECONDARY_MENU` so it reads:

```ts
const SECONDARY_MENU: MenuItem[] = [
  { id: 'statistic', label: 'Tiến độ học tập', href: 'statistic', icon: BarChart2 },
];
```

2. Remove `Bookmark,` from the lucide-react import list (now unused).
3. Update the IA doc comment at the top of the file: change `Secondary: Bookmarks, Learning Progress` to `Secondary: Learning Progress` and add a line `Bookmarks: merged into Flashcards (list view + filter).`

- [ ] **Step 3: Edit `AvatarMenu.tsx`**

Delete the bookmark `<Link>` block (the one with `href={`${base}/bookmark`}` and label `Đánh dấu`, lines 162–171). Remove `Bookmark` from the lucide-react import if no longer used elsewhere in the file.

- [ ] **Step 4: Edit `Header.tsx`**

1. Remove line 43 from `TITLES`:

```ts
  bookmark: { title: 'Đánh dấu', subtitle: 'Câu hỏi bạn đã lưu để ôn lại' },
```

2. Remove line 55 from `PARENT_MAP`:

```ts
  bookmark: '',
```

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: ALL PASS — including `mobile-layout.test.ts` and `entrypoint-branding.test.ts` (they don't assert bookmark, but run the full suite to be sure).

- [ ] **Step 6: Commit**

```bash
git add src/components/n400/Sidebar.tsx src/components/n400/AvatarMenu.tsx src/components/n400/Header.tsx src/components/n400/navigation-ia.test.ts
git commit -m "refactor(website): remove bookmark from n400app navigation"
```

---

### Task 6: Redirect `/n400app/bookmark` into the flashcards list view

**Files:**
- Modify (full replace): `apps/website/src/app/[locale]/n400app/bookmark/page.tsx`

- [ ] **Step 1: Add the failing contract test**

Append inside the existing `describe` block in `navigation-ia.test.ts`:

```ts
  test('old bookmark route redirects into flashcards list view', () => {
    const page = source('src/app/[locale]/n400app/bookmark/page.tsx');

    expect(page).toContain('redirect(');
    expect(page).toContain('view=list&filter=bookmarks');
  });
```

Run: `pnpm test -- src/components/n400/navigation-ia.test.ts`
Expected: FAIL.

- [ ] **Step 2: Replace the page with a server redirect**

Replace the ENTIRE content of `apps/website/src/app/[locale]/n400app/bookmark/page.tsx` (the old 194-line client list page — its UI now lives in `QuestionList.tsx`) with:

```tsx
import { redirect } from 'next/navigation';

/**
 * The standalone bookmark page was merged into Flashcards
 * (list view + "Đã đánh dấu" filter). Old links keep working.
 * Spec: docs/superpowers/specs/2026-07-05-flashcards-bookmark-merge-design.md
 */
export default async function BookmarkRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/n400app/flashcards?view=list&filter=bookmarks`);
}
```

Note: `params` is a Promise in this Next.js version (matches the pattern in `src/app/[locale]/page.tsx`). If type-check complains, read `node_modules/next/dist/docs/` for the current dynamic-params convention.

- [ ] **Step 3: Verify**

Run: `pnpm test && pnpm type-check`
Expected: PASS.

Run: `pnpm dev`, open `http://localhost:3000/en/n400app/bookmark`
Expected: lands on `/en/n400app/flashcards?view=list&filter=bookmarks` — list view, bookmark filter active.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/n400app/bookmark/page.tsx"
git commit -m "feat(website): redirect /n400app/bookmark to flashcards list view"
```

---

### Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Static checks**

Run from `apps/website/`:

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all PASS, zero warnings introduced by this change.

- [ ] **Step 2: Manual end-to-end checklist (`pnpm dev`)**

Desktop (`http://localhost:3000/en/n400app/flashcards`):
- [ ] Sidebar shows 5 items; "Đánh dấu" gone; "Tiến độ học tập" still present under the divider.
- [ ] Card mode unchanged: flip (Space), R/M keys, arrows, streak badge, bookmark icon on card.
- [ ] All 9 filter chips render; "Đã thuộc" works; switching filters resets to card 1.
- [ ] List mode: search by text and by question number; audio plays; bookmark toggles with fill animation; category chips correct.
- [ ] Empty states: "Đã đánh dấu" with 0 bookmarks → CTA "Vào luyện tập" + "Xem tất cả 128 câu"; "Đã thuộc" with 0 known → hint + reset CTA.
- [ ] `/en/n400app/bookmark` redirects correctly.
- [ ] Bookmark a question in Luyện tập → appears under Flashcards → Danh sách → "Đã đánh dấu".

Mobile viewport:
- [ ] Bottom nav unchanged (4 items). AvatarMenu no longer lists "Đánh dấu".
- [ ] List view scrolls without the page shell scrolling; toggle buttons comfortably tappable.

- [ ] **Step 3: Roadmap check**

Per project CLAUDE.md directive 7: check `docs/ROADMAP.md`. This work refines the already-completed "Website Phase 3B — N400 Civics Test App" item (checked); no unchecked roadmap box corresponds to it, so no roadmap edit is expected — confirm and move on.

- [ ] **Step 4: Done**

Use superpowers:verification-before-completion, then superpowers:finishing-a-development-branch if working on a branch.
