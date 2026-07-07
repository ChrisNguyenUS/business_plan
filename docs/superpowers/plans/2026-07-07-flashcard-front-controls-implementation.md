# Flashcard Study Controls & Flip Hint Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Always show "Chưa thuộc" and "Đã thuộc" buttons at the bottom of the card on both faces, removing the "Flip Card" button, and make the click-to-flip instructions larger and clearer with a pointer icon.

**Architecture:** Modify `page.tsx` of the flashcards app to bypass the `flipped` check for study controls, and modify `FlashcardFront.tsx` and `FlashcardBack.tsx` to display an enlarged instruction containing the Lucide `Pointer` icon.

**Tech Stack:** Next.js, Tailwind CSS, Lucide React

---

### Task 1: Update Flashcards Page study controls

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/flashcards/page.tsx`

- [ ] **Step 1: Modify imports to remove RotateCw**

Replace the import of `RotateCw` with nothing, as it is no longer used:
```typescript
import {
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Landmark,
  Building2,
  Scale,
  ScrollText,
  Flag,
  type LucideIcon,
} from 'lucide-react';
```

- [ ] **Step 2: Update the bottom study controls to always render Chưa thuộc and Đã thuộc buttons**

Replace the conditionally rendered controls (lines 350-423 in the original file) with the simplified version that always displays the two study state buttons:
```tsx
      {/* Study Controls — shrink-0, always show Chưa thuộc and Đã thuộc buttons */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
          aria-label="Trước"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          type="button"
          onClick={() => markKnown(false)}
          className={`flex-1 sm:flex-none flex flex-col items-center justify-center px-4 py-3 sm:px-8 sm:py-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${
            !known
              ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-orange-500/10'
              : 'bg-white border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base whitespace-nowrap"><ThumbsDown size={18} className="hidden sm:block" /> Chưa thuộc</div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 hidden sm:block">R</span>
        </button>

        <button
          type="button"
          onClick={() => markKnown(true)}
          className={`flex-1 sm:flex-none flex flex-col items-center justify-center px-4 py-3 sm:px-8 sm:py-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${
            known
              ? 'bg-teal-600 text-white border-teal-600 shadow-teal-600/30'
              : 'bg-teal-600 text-white border-teal-600 shadow-teal-600/30 hover:bg-teal-700'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base whitespace-nowrap"><ThumbsUp size={18} className="hidden sm:block" /> Đã thuộc</div>
          <span className="text-[10px] text-white/60 font-medium mt-0.5 hidden sm:block">M</span>
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={index === total - 1}
          className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
          aria-label="Tiếp"
        >
          <ChevronRight size={22} />
        </button>
      </div>
```

---

### Task 2: Enhance Flashcard Front face hint text and icon

**Files:**
- Modify: `apps/website/src/components/n400/flashcard/FlashcardFront.tsx`

- [ ] **Step 1: Add Pointer to lucide-react imports**

```typescript
import { Bookmark, Pointer } from 'lucide-react';
```

- [ ] **Step 2: Update the hint container and text**

Replace the existing hint block (lines 94-100 in the original file) with:
```tsx
      {/* Hint — always visible, never scrolls */}
      <div className="shrink-0 mt-auto pt-[clamp(0.5rem,1vw,1rem)] flex items-center justify-center">
        <div className="uppercase tracking-widest text-slate-400 font-bold text-center flex items-center gap-1.5" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)' }}>
          <Pointer size={16} className="text-slate-400 animate-bounce" />
          Nhấn vào thẻ để xem đáp án
        </div>
      </div>
```

---

### Task 3: Enhance Flashcard Back face hint text and icon

**Files:**
- Modify: `apps/website/src/components/n400/flashcard/FlashcardBack.tsx`

- [ ] **Step 1: Import Pointer from lucide-react**

Add the import at the top of the file:
```typescript
import { AudioButton } from '@/components/n400/AudioButton';
import { Pointer } from 'lucide-react';
```

- [ ] **Step 2: Update the hint container and text**

Replace the existing hint block (lines 55-61 in the original file) with:
```tsx
      {/* Hint — always visible, never scrolls */}
      <div className="shrink-0 mt-auto pt-[clamp(0.5rem,1vw,1rem)] flex items-center justify-center">
        <div className="uppercase tracking-widest text-teal-500 font-bold text-center flex items-center gap-1.5" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)' }}>
          <Pointer size={16} className="text-teal-500 animate-bounce" />
          Nhấn lại để quay về câu hỏi
        </div>
      </div>
```

---

### Task 4: Compilation and Verification

**Files:**
- None

- [ ] **Step 1: Run type checking on the website application**

Run:
```bash
pnpm run type-check
```
Expected: No TypeScript compilation errors.

- [ ] **Step 2: Run lint check on the website application**

Run:
```bash
pnpm run lint
```
Expected: No ESLint errors.
