# Practice Session Length Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick a practice session length (Quick 5 / Standard 15 / Deep 40 / Full Review) on the Luyện tập page instead of being forced into an endless 128-question loop, with a completion summary at the end.

**Architecture:** The practice page (`practice/page.tsx`) gains a 3-stage flow — *picker → running → summary* — driven by a `presetId` persisted in `sessionStorage` (sibling of the existing `n400.practice.seed` key). Question selection becomes a pure, unit-tested helper in `quiz-engine.ts` (mirroring `selectMockTestQuestions`). Picker and summary are presentational components in `src/components/n400/`.

**Tech Stack:** Next.js (App Router, client component), TypeScript, Tailwind, Vitest, lucide-react.

---

## Current-State Analysis (read before coding)

File: `apps/website/src/app/[locale]/n400app/practice/page.tsx` (484 lines, fully client-side)

1. **Question order** — built inline in a `useMemo` (lines 96–101): all `N400_QUESTIONS` ids shuffled with `shuffle(ids, `practice-${seed}`)` from `@/lib/n400/quiz-engine`. Today Q29 is dropped when `districtNumber === null`; **product decision (2026-07-04): stop filtering Q29 — the pool is always 128.** The engine already supports district-less Q29: `correctAnswersFor` falls back to "any current rep of the user's state" (quiz-engine.ts:98–105), static distractors exist in `distractors-data.ts`, and `AudioButton` accepts a `null` src (`representativeAudioUrl(stateCode, null)` returns null).
2. **Infinite loop** — `onNext` does `setIndex((i) => (i + 1) % order.length)` (line 136). There is no completion state today.
3. **Seed persistence** — `n400.practice.seed` in `sessionStorage` (lines 46–53); "Trộn lại" removes the key and does `window.location.reload()` (lines 156–161).
4. **Progress header** — hardcoded `TOTAL = N400_QUESTIONS.length` (line 33), shown as `Câu hỏi {index + 1} / {TOTAL}` and fed to `<ProgressBar>`.
5. **Analytics** — `trackPracticeComplete(score, total)` exists in `src/lib/n400/analytics.ts:44` but is **never called anywhere**. This feature finally gives it a call site.
6. **Per-question UI reset** — the `index !== prevIndex` block (lines 68–76) resets selection/phase; it is untouched by this plan.
7. **Not in scope** — index/answers are NOT persisted across refresh today (only the seed is). We keep that behavior: refreshing mid-session keeps the preset + question order but restarts at question 1. Do not build resume logic (YAGNI).

## Design Decisions

- **Presets** (per product spec): Quick 5 câu ≈ 3 phút · Standard 15 câu ≈ 8 phút · Deep 40 câu ≈ 20 phút · Full Review = **all 128** questions (no time estimate shown, matching the spec).
- **Q29 always included** (product decision): drop the `districtNumber === null` filter — in **both practice and flashcards**. Without a district, the correct answer is any current rep of the user's state (existing `correctAnswersFor` fallback); answer audio is simply absent (`AudioButton` handles `null`).
- **Non-blocking nudge** (product decision): when Q29 is shown to a user with no district, render a compact inline amber notice — "⚠ Đáp án cá nhân hóa chưa có / Personalized answer unavailable. Bạn chưa thêm địa chỉ — mọi Dân biểu đương nhiệm của tiểu bang đều được chấp nhận khi luyện tập." — with a link to `/${locale}/n400app/setup` (same locale-aware `Link` idiom as `profile/page.tsx:128`). Inline banner, no modal, no Continue button: the user keeps answering without interruption but knows to update their address.
- **Selection** = take the first N of the same seeded shuffle the page already uses (same `practice-${seed}` key → Full Review behaves byte-identical to today's order for users who had a district set).
- **Session storage** — new key `n400.practice.preset` storing the preset id (`quick|standard|deep|full`). Missing/invalid → show picker.
- **"Trộn lại"** keeps its meaning (reshuffle, same preset). A new "Đổi chế độ" header button clears both keys and returns to the picker.
- **Completion** — answering the last question and pressing Next shows a summary (correct/total) with "Luyện lại" (same preset, new seed) and "Đổi chế độ" actions, and fires `trackPracticeComplete(correct, total)` exactly once.
- Correct-count rule: an answer counts as correct only via `onPick` with `isCorrect`; using "Xem đáp án" counts as incorrect (consistent with the existing `recordAnswer(question.id, false, 'practice')` call).

## File Structure

- **Modify** `apps/website/src/lib/n400/quiz-engine.ts` — add `PracticePreset`, `PRACTICE_PRESETS`, `selectPracticeQuestionIds()`, `isPersonalizedAnswerUnavailable()`.
- **Modify** `apps/website/src/lib/n400/quiz-engine.test.ts` — tests for the new helpers.
- **Create** `apps/website/src/components/n400/PracticeSessionPicker.tsx` — presentational preset chooser.
- **Create** `apps/website/src/components/n400/PracticeSessionSummary.tsx` — presentational end-of-session card.
- **Create** `apps/website/src/components/n400/PersonalizedAnswerNotice.tsx` — shared inline nudge for personalized questions (used by practice + flashcards).
- **Modify** `apps/website/src/app/[locale]/n400app/practice/page.tsx` — stage flow, storage, progress, analytics, Q29 nudge.
- **Modify** `apps/website/src/app/[locale]/n400app/flashcards/page.tsx` — remove the Q29 filter (lines 80–84), render the nudge.

All work stays inside `apps/website/` (monorepo isolation). No DB/server changes; `recordAnswer` already handles per-answer persistence.

---

### Task 1: Session presets + selection helper in quiz-engine (TDD)

**Files:**
- Modify: `apps/website/src/lib/n400/quiz-engine.ts` (append after the mock-test section, ~line 296)
- Test: `apps/website/src/lib/n400/quiz-engine.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/website/src/lib/n400/quiz-engine.test.ts` (extend the existing import from `./quiz-engine` with `selectPracticeQuestionIds, PRACTICE_PRESETS`):

```ts
describe('selectPracticeQuestionIds', () => {
  it('returns exactly the requested count with no duplicate ids', () => {
    for (const count of [5, 15, 40]) {
      const ids = selectPracticeQuestionIds('seed-1', count);
      expect(ids.length).toBe(count);
      expect(new Set(ids).size).toBe(count);
    }
  });

  it('returns the full 128-question pool when count is null, including Q29', () => {
    const ids = selectPracticeQuestionIds('seed-1', null);
    expect(ids.length).toBe(N400_QUESTIONS.length);
    expect(ids).toContain(29);
  });

  it('is deterministic for a given seed and differs across seeds', () => {
    const a = selectPracticeQuestionIds('seed-1', 15);
    const b = selectPracticeQuestionIds('seed-1', 15);
    const c = selectPracticeQuestionIds('seed-2', 15);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('clamps count to the available pool', () => {
    const ids = selectPracticeQuestionIds('seed-1', 999);
    expect(ids.length).toBe(N400_QUESTIONS.length);
  });

  it('exposes the four product presets in display order', () => {
    expect(PRACTICE_PRESETS.map((p) => p.id)).toEqual(['quick', 'standard', 'deep', 'full']);
    expect(PRACTICE_PRESETS.map((p) => p.count)).toEqual([5, 15, 40, null]);
  });
});

describe('isPersonalizedAnswerUnavailable', () => {
  it('is true only for Q29 without a resolved district', () => {
    const q29 = N400_QUESTIONS_BY_ID.get(29)!;
    const q23 = N400_QUESTIONS_BY_ID.get(23)!;
    expect(isPersonalizedAnswerUnavailable(q29, null)).toBe(true);
    expect(isPersonalizedAnswerUnavailable(q29, 12)).toBe(false);
    expect(isPersonalizedAnswerUnavailable(q23, null)).toBe(false);
  });
});
```

(Also add `isPersonalizedAnswerUnavailable` to the import list.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/website && npx vitest run src/lib/n400/quiz-engine.test.ts`
Expected: FAIL — `selectPracticeQuestionIds` / `PRACTICE_PRESETS` are not exported.

- [ ] **Step 3: Implement the helper**

Append to `apps/website/src/lib/n400/quiz-engine.ts` (after `isPass`):

```ts
// ── Practice session selection ───────────────────────────────────────────────

export interface PracticePreset {
  id: 'quick' | 'standard' | 'deep' | 'full';
  titleVi: string;
  titleEn: string;
  count: number | null;   // null = all available questions
  minutes: number | null; // null = no time estimate shown
}

export const PRACTICE_PRESETS: PracticePreset[] = [
  { id: 'quick', titleVi: 'Luyện nhanh', titleEn: 'Quick Practice', count: 5, minutes: 3 },
  { id: 'standard', titleVi: 'Tiêu chuẩn', titleEn: 'Standard Practice', count: 15, minutes: 8 },
  { id: 'deep', titleVi: 'Chuyên sâu', titleEn: 'Deep Practice', count: 40, minutes: 20 },
  { id: 'full', titleVi: 'Ôn toàn bộ', titleEn: 'Full Review', count: null, minutes: null },
];

export function selectPracticeQuestionIds(
  seed: string | number,
  count: number | null
): number[] {
  // Same shuffle key the practice page has always used, so "full" keeps
  // producing the identical order for an existing seed. Q29 is always
  // included: without a district, correctAnswersFor falls back to any
  // current representative of the user's state.
  const ids = N400_QUESTIONS.map((q) => q.id);
  const shuffled = shuffle(ids, `practice-${seed}`);
  return count === null ? shuffled : shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * True when a question's correct answer is personal to the user but the app
 * cannot resolve it yet (Q29 needs the resolved congressional district).
 * Q23/Q61/Q62 only need stateCode, which always has a value.
 */
export function isPersonalizedAnswerUnavailable(
  question: N400Question,
  districtNumber: number | null
): boolean {
  return question.id === 29 && districtNumber === null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/website && npx vitest run src/lib/n400/quiz-engine.test.ts`
Expected: PASS (all existing + 6 new tests).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/quiz-engine.ts apps/website/src/lib/n400/quiz-engine.test.ts
git commit -m "feat(website): practice session presets, selection helper, personalized-answer predicate"
```

---

### Task 2: PracticeSessionPicker component

**Files:**
- Create: `apps/website/src/components/n400/PracticeSessionPicker.tsx`

Presentational only — no storage, no analytics. Card styling follows the existing white-card idiom (`bg-white rounded-2xl/3xl border border-gray-100 shadow-sm`, teal CTA) used by `TipCard` and the question card.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { Zap, ClipboardList, Layers, Library, Clock, ArrowRight } from 'lucide-react';
import type { PracticePreset } from '@/lib/n400/quiz-engine';

const PRESET_ICONS: Record<PracticePreset['id'], React.ReactNode> = {
  quick: <Zap size={22} />,
  standard: <ClipboardList size={22} />,
  deep: <Layers size={22} />,
  full: <Library size={22} />,
};

const PRESET_TONES: Record<PracticePreset['id'], string> = {
  quick: 'bg-teal-50 text-teal-600',
  standard: 'bg-blue-50 text-blue-600',
  deep: 'bg-orange-50 text-orange-500',
  full: 'bg-purple-50 text-purple-600',
};

export function PracticeSessionPicker({
  presets,
  totalCount,
  onSelect,
}: {
  presets: PracticePreset[];
  /** Size of the full question pool (128). */
  totalCount: number;
  onSelect: (preset: PracticePreset) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto animate-in fade-in duration-300">
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">
          Chọn chế độ luyện tập / Choose a practice mode
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Luyện ngắn mỗi ngày hoặc ôn toàn bộ — tùy bạn chọn!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {presets.map((preset) => {
          const count = preset.count ?? totalCount;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset)}
              className="group flex flex-col text-left bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${PRESET_TONES[preset.id]}`}>
                {PRESET_ICONS[preset.id]}
              </div>
              <div className="font-bold text-gray-800 leading-tight">{preset.titleVi}</div>
              <div className="text-xs text-gray-400 mb-2">{preset.titleEn}</div>
              <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                <span className="font-semibold">{count} câu</span>
                {preset.minutes !== null ? (
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock size={13} /> ≈ {preset.minutes} phút
                  </span>
                ) : null}
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 group-hover:text-teal-700">
                Bắt đầu / Start <ArrowRight size={15} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/website && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/n400/PracticeSessionPicker.tsx
git commit -m "feat(website): practice session picker component"
```

---

### Task 3: PracticeSessionSummary component

**Files:**
- Create: `apps/website/src/components/n400/PracticeSessionSummary.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { Trophy, RotateCw, SlidersHorizontal } from 'lucide-react';

export function PracticeSessionSummary({
  correct,
  total,
  onRetry,
  onChangeMode,
}: {
  correct: number;
  total: number;
  onRetry: () => void;
  onChangeMode: () => void;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 sm:p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
          <Trophy size={30} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Hoàn thành! / Session complete!</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">
          Bạn đã hoàn thành phiên luyện tập. Tiếp tục giữ vững phong độ nhé! 💪
        </p>

        <div className="rounded-2xl bg-gray-50 border border-gray-100 py-4 mb-6">
          <div className="text-3xl font-extrabold text-teal-600">
            {correct} / {total}
          </div>
          <div className="text-xs text-gray-500 mt-1">câu đúng · {pct}%</div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 font-semibold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors"
          >
            <RotateCw size={16} /> Luyện lại / Practice again
          </button>
          <button
            type="button"
            onClick={onChangeMode}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal size={16} /> Đổi chế độ / Change mode
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/website && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/n400/PracticeSessionSummary.tsx
git commit -m "feat(website): practice session summary component"
```

---

### Task 4: PersonalizedAnswerNotice component

**Files:**
- Create: `apps/website/src/components/n400/PersonalizedAnswerNotice.tsx`

Compact, non-blocking inline banner. No dismiss state, no modal — it renders only on Q29 for district-less users and disappears on the next question. Locale-aware setup link follows the `profile/page.tsx` idiom (`useParams` → `/${locale}/n400app/setup`).

- [ ] **Step 1: Write the component**

```tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';

export function PersonalizedAnswerNotice({ from }: { from: 'practice' | 'flashcards' }) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 animate-in fade-in duration-300 motion-reduce:animate-none"
    >
      <TriangleAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
      <p className="flex-1 min-w-0 leading-snug" style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.8125rem)' }}>
        <span className="font-semibold text-amber-800">
          Đáp án cá nhân hóa chưa có / Personalized answer unavailable.
        </span>{' '}
        <span className="text-amber-700">
          Bạn chưa thêm địa chỉ — mọi Dân biểu đương nhiệm của tiểu bang đều được chấp nhận khi luyện tập.
        </span>{' '}
        <Link
          href={{ pathname: `/${locale}/n400app/setup`, query: { from } }}
          className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 whitespace-nowrap"
        >
          Thêm địa chỉ →
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/website && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/n400/PersonalizedAnswerNotice.tsx
git commit -m "feat(website): personalized-answer nudge component"
```

---

### Task 5: Wire the stage flow into the practice page

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/practice/page.tsx`

All edits below reference the current line numbers listed in the analysis section.

- [ ] **Step 1: Update imports and remove the hardcoded TOTAL**

Replace the quiz-engine import block (lines 25–31) and the `TOTAL` constant (line 33):

```tsx
import {
  buildOptions,
  correctAnswersFor,
  selectPracticeQuestionIds,
  isPersonalizedAnswerUnavailable,
  PRACTICE_PRESETS,
  type PracticePreset,
  type QuizOption,
} from '@/lib/n400/quiz-engine';
import { questionAudioUrl, answerAudioUrlFor } from '@/lib/n400/quiz-engine';
import { PracticeSessionPicker } from '@/components/n400/PracticeSessionPicker';
import { PracticeSessionSummary } from '@/components/n400/PracticeSessionSummary';
import { PersonalizedAnswerNotice } from '@/components/n400/PersonalizedAnswerNotice';
```

Update the analytics import (line 23) to include the completion event:

```tsx
import { trackStreakMilestone, trackPracticeComplete } from '@/lib/n400/analytics';
```

Delete `const TOTAL = N400_QUESTIONS.length;` — keep the `N400_QUESTIONS` import (still used for the pool).

- [ ] **Step 2: Add preset/session state next to the existing seed state (after line 53)**

```tsx
const PRESET_STORAGE_KEY = 'n400.practice.preset';

function readStoredPreset(): PracticePreset | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(PRESET_STORAGE_KEY);
  return PRACTICE_PRESETS.find((p) => p.id === raw) ?? null;
}
```

(Place `PRESET_STORAGE_KEY` and `readStoredPreset` at module scope, above `PracticePage`.)

Inside the component, after the `seed` state:

```tsx
const [preset, setPreset] = useState<PracticePreset | null>(() => readStoredPreset());
const [completed, setCompleted] = useState(false);
const [correctCount, setCorrectCount] = useState(0);
```

- [ ] **Step 3: Derive the session order from the helper**

Replace the `order` useMemo (lines 96–101):

```tsx
const order = useMemo(
  () => selectPracticeQuestionIds(seed, preset?.count ?? null),
  [seed, preset]
);
```

This removes the old Q29 filter (the deliberate product change — see Design Decisions). `districtNumber` stays in scope: `buildOptions`/`answerAudioUrlFor` still receive it for per-user Q29/Q23/Q61/Q62 resolution.

- [ ] **Step 4: Session handlers — select, complete, retry, change mode**

Add alongside the existing handlers (`onPick`/`onNext`/`onReveal`/`onRestart`):

```tsx
const onSelectPreset = (p: PracticePreset) => {
  window.sessionStorage.setItem(PRESET_STORAGE_KEY, p.id);
  setPreset(p);
  setIndex(0);
  setCorrectCount(0);
  setCompleted(false);
};

const onChangeMode = () => {
  window.sessionStorage.removeItem(PRESET_STORAGE_KEY);
  window.sessionStorage.removeItem('n400.practice.seed');
  window.location.reload();
};
```

In `onPick`, increment the session score right after `const wasCorrect = !!opt?.isCorrect;`:

```tsx
if (wasCorrect) setCorrectCount((c) => c + 1);
```

Replace `onNext` (the modulo loop is the core behavior change):

```tsx
const onNext = () => {
  if (index + 1 >= order.length) {
    trackPracticeComplete(correctCount, order.length);
    setCompleted(true);
    return;
  }
  setIndex((i) => i + 1);
};
```

`onRestart` ("Trộn lại" and the summary's "Luyện lại") keeps clearing only the seed — the preset persists, so after reload the user lands directly in a fresh session of the same length. No change needed to its body.

- [ ] **Step 5: Render the three stages**

After the `if (!hydrated)` guard (line 163), branch before the main return. Both new stages reuse the page's outer flex column so the layout contract (page never scrolls) holds:

```tsx
if (preset === null) {
  return (
    <div className="flex flex-col h-full overflow-hidden max-w-[1100px] mx-auto w-full">
      <PracticeSessionPicker
        presets={PRACTICE_PRESETS}
        totalCount={N400_QUESTIONS.length}
        onSelect={onSelectPreset}
      />
    </div>
  );
}

if (completed) {
  return (
    <div className="flex flex-col h-full overflow-hidden max-w-[1100px] mx-auto w-full">
      <PracticeSessionSummary
        correct={correctCount}
        total={order.length}
        onRetry={onRestart}
        onChangeMode={onChangeMode}
      />
    </div>
  );
}
```

- [ ] **Step 6: Fix the progress header for session length + add "Đổi chế độ"**

In the progress block (lines 183–195):
- `Câu hỏi {index + 1} / {TOTAL}` → `Câu hỏi {index + 1} / {order.length}`
- `<ProgressBar progress={((index + 1) / TOTAL) * 100} …/>` → `progress={((index + 1) / order.length) * 100}`
- Add a mode button next to "Trộn lại" (import `SlidersHorizontal` from lucide-react):

```tsx
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={onChangeMode}
    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
  >
    <SlidersHorizontal size={14} /> Đổi chế độ
  </button>
  <button
    type="button"
    onClick={onRestart}
    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
  >
    <RotateCw size={14} /> Trộn lại
  </button>
</div>
```

- [ ] **Step 7: Render the Q29 nudge inside the Study Body**

Directly below the question-header block (the `div` ending at line 259, after "Question header — compact on mobile") and above "Answer Options + Inline Feedback":

```tsx
{isPersonalizedAnswerUnavailable(question, districtNumber) ? (
  <div className="mb-[clamp(0.5rem,1vw,1rem)]">
    <PersonalizedAnswerNotice from="practice" />
  </div>
) : null}
```

- [ ] **Step 8: Typecheck + full test run**

Run: `cd apps/website && npx tsc --noEmit && npx vitest run`
Expected: no type errors, all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add "apps/website/src/app/[locale]/n400app/practice/page.tsx"
git commit -m "feat(website): practice session length selection with completion summary"
```

---

### Task 6: Flashcards — include Q29 with the nudge

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/flashcards/page.tsx`

- [ ] **Step 1: Remove the Q29 filter**

Delete lines 80–84 in the `questions` useMemo:

```tsx
// Q29 (your U.S. Representative) needs the user's resolved district to
// produce a per-user correct answer. Hide it until /setup completes.
if (districtNumber === null) {
  qs = qs.filter((q) => q.id !== 29);
}
```

and drop `districtNumber` from that useMemo's dependency array (it remains in use elsewhere: `correctAnswersFor` and `answerAudioUrlFor` still receive it).

- [ ] **Step 2: Render the nudge above the Flashcard**

Add the imports:

```tsx
import { isPersonalizedAnswerUnavailable } from '@/lib/n400/quiz-engine';
import { PersonalizedAnswerNotice } from '@/components/n400/PersonalizedAnswerNotice';
```

(`isPersonalizedAnswerUnavailable` merges into the existing `@/lib/n400/quiz-engine` import block.)

Between the Progress block and the `<Flashcard …/>` element (the page is a fixed-height flex column — the banner is a `shrink-0` row, the card keeps `flex-1`):

```tsx
{isPersonalizedAnswerUnavailable(current, districtNumber) ? (
  <div className="shrink-0">
    <PersonalizedAnswerNotice from="flashcards" />
  </div>
) : null}
```

- [ ] **Step 3: Typecheck + test run**

Run: `cd apps/website && npx tsc --noEmit && npx vitest run`
Expected: no type errors, all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add "apps/website/src/app/[locale]/n400app/flashcards/page.tsx"
git commit -m "feat(website): include Q29 in flashcards with personalized-answer nudge"
```

---

### Task 7: End-to-end verification (manual)

- [ ] **Step 1: Run the dev server and walk the flow**

Run: `cd apps/website && npm run dev`, open `http://localhost:3000/vi/n400app/practice` (log in first).

Verify each:
1. Picker shows 4 cards; Full Review shows **128 câu** regardless of whether a district is set.
1b. **Q29 without a district** (profile with no address setup): the question appears in Full Review; the amber nudge shows below the question header with a working "Thêm địa chỉ →" link to `/vi/n400app/setup?from=practice`; the correct option is a representative from the user's state; the feedback panel lists state reps with "Xem tất cả N đáp án"; the answer-audio button is simply absent (null src) — no crash. With a district set, the nudge does not render.
1c. **Flashcards**: with no district, "Tất cả 128 câu" now really contains Q29; navigating to it shows the nudge above the card (card stays `flex-1`, page still doesn't scroll); the back lists the state's reps; with a district set, the nudge is gone and the back shows the user's exact rep with audio.
2. Quick Practice → header reads "Câu hỏi 1 / 5"; answer all 5 → summary shows correct/total; `n400_practice_complete` fires once (check the analytics debug/network tab).
3. "Luyện lại" starts a new 5-question session with a different order; "Đổi chế độ" returns to the picker.
4. Mid-session refresh keeps the same preset and question order (restarts at question 1 — expected, pre-existing behavior).
5. "Trộn lại" mid-session reshuffles within the same preset.
6. Bookmarks, audio, milestone banner, and badge toasts still work during a session.
7. Mobile viewport (~375px): picker cards stack in one column; no page-level scroll on the question screen.

- [ ] **Step 2: Run the existing Playwright smoke spec**

Run: `cd apps/website && npx playwright test e2e/n400/smoke.spec.ts`
Expected: PASS. If the spec navigates the practice page and now lands on the picker, update the spec to click the "Ôn toàn bộ" card first — include that edit in the same commit as the fix.

---

## Notes

- **No ROADMAP.md update needed** — this is a post-launch enhancement inside shipped Website Phase 3B, not a phase completion.
- **No server/DB changes** — `recordAnswer(questionId, wasCorrect, 'practice')` already persists per-answer stats; sessions are a purely client-side framing.
- Out of scope (YAGNI, revisit only if requested): resuming mid-session index across refresh, per-preset stats/history, "wrong answers only" mode, extending the nudge to other pages (bookmark/categories) — add only if Q29 shows up there with the same gap.
