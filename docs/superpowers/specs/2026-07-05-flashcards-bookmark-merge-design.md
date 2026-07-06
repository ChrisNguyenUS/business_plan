# Flashcards ⊕ Đánh dấu Merge — Design Spec

**Date:** 2026-07-05
**Scope:** `apps/website` — n400app only
**Type:** Information architecture / navigation consolidation. NOT a visual redesign.

## Problem

The n400app sidebar has two navigation items that both serve "reviewing questions":

- **Flashcards** (`/n400app/flashcards`) — card-flip study mode. Already includes a
  "Đã đánh dấu" filter, so bookmarked questions can already be studied here.
- **Đánh dấu** (`/n400app/bookmark`) — a list of bookmarked questions with search,
  audio, answer preview, and bookmark removal.

This duplication raises cognitive load ("when do I use which?"). Additionally, the
Đánh dấu page is only reachable from the desktop sidebar — it is absent from the
mobile bottom nav, so mobile users cannot reach it at all today.

## Decision

Remove the standalone Đánh dấu page. Fold its list capability into the Flashcards
page as a second **view mode**. Bookmarks remain a **filter**, not a destination.

The list view is deliberately kept (rather than making bookmarks filter-only) because
it is the app's only "browse questions as text" surface: search and skim-reading are
genuinely valuable for older users reviewing before their interview. The duplication
being removed is the *navigation* duplication, not the list capability itself.

## Design

### 1. Navigation (`src/components/n400/Sidebar.tsx`)

- Remove `bookmark` from `SECONDARY_MENU`. Sidebar becomes: Tổng quan, Luyện tập,
  Flashcards, Thi thử │ Tiến độ học tập.
- Mobile bottom nav: unchanged (4 items, bookmark was never in it).

### 2. Route migration

- `/n400app/bookmark` becomes a server-side redirect to
  `/n400app/flashcards?view=list&filter=bookmarks` (locale-aware). Old links keep working.
- The bookmark page UI code is deleted; its list-item UI moves into the flashcards page
  (local component, not shared — Rule of Three).

### 3. Flashcards page (`src/app/[locale]/n400app/flashcards/page.tsx`)

**View toggle.** New state `view: 'cards' | 'list'`, default `cards`. Two large,
labeled segmented buttons near the top of the page: "🃏 Học thẻ" / "☰ Danh sách"
(icon + text, sized for older users). URL param `?view=list` is honored on load,
alongside the existing `?filter=` handling.

**Shared filters.** The existing filter chips apply to BOTH views and persist when
switching views. Filter set gains one option:

| id | Label |
|----|-------|
| all | Tất cả 128 câu |
| unknown | Chưa thuộc |
| **known (new)** | **Đã thuộc** |
| bookmarks | Đã đánh dấu |
| principles / system / rights / history / symbols | category labels (unchanged) |

**Card mode.** Unchanged. Same immersive no-scroll layout, flip/known/not-yet flow,
keyboard shortcuts, streak/badge hooks, bookmark icon on the card.

**List mode.** Reuses the card-list UI from the old bookmark page: question number,
EN/VI question text, answer(s), audio button, category chip. Changes from the old page:

- Shows whatever the active filter selects — not only bookmarks. (The old page is the
  special case filter = bookmarks.)
- The trash icon becomes a **bookmark toggle** (filled when saved), since the list can
  now contain non-bookmarked questions. Toggling off while filter = bookmarks removes
  the row.
- Search box appears in list mode only (searches EN/VI text and question number within
  the current filter).
- The list area scrolls internally; the page shell stays within the immersive layout
  rules of `flashcards/layout.tsx`.

### 4. Empty states (with CTA)

- **Đã đánh dấu, empty:** "Bạn chưa đánh dấu câu hỏi nào" + hint about the bookmark
  icon + primary CTA "Vào luyện tập" → `/n400app/practice`. (Carried over from old page.)
- **Đã thuộc, empty:** "Hãy học vài thẻ trước đã" + CTA switching filter to Tất cả.
- **Chưa thuộc, empty (all learned):** existing empty-state card retained.
- Search with no results (list mode): "Không có kết quả phù hợp".

### 5. Micro-interactions (subtle, no new libraries)

- Bookmark toggle: small scale/fill transition on press.
- Filter chip change: existing transition classes retained; list re-render fades in
  (`animate-in fade-in`, already used in the codebase).
- Card flip animation: unchanged.

### 6. Constraints (DO NOT ADD)

To the Flashcards page: no statistics, progress widgets, charts, XP, badges display,
levels, or achievements beyond what exists today. Flashcards stays focused on
memorization. No visual-language changes: colors, typography, spacing, component
library, rounded corners, and navigation style all stay as-is.

### Out of scope / unchanged

Luyện tập, Thi thử, Tổng quan, Tiến độ học tập, streak/badge logic, bookmark data
model in `lib/n400/user-state` (bookmarking from Practice/Mock Test keeps working and
feeds the "Đã đánh dấu" filter automatically), internal_app.

## Success criteria

- Sidebar has one fewer item; no second navigation level added anywhere.
- Bookmarked questions are both studyable (cards) and browsable/searchable (list)
  from a single place, on desktop AND mobile.
- `/n400app/bookmark` redirects cleanly; no dead links.
- A first-time user can answer "where do I review saved questions?" with one word:
  Flashcards.

## Testing

- Unit: filter logic including new `known` filter; redirect route.
- Existing tests touching navigation (`mobile-layout.test.ts`, `entrypoint-branding.test.ts`)
  updated if they assert the bookmark nav item.
- Manual pass: view toggle persistence of filter, search, bookmark toggle from list,
  empty states, mobile layout, `?view=list&filter=bookmarks` deep link.
