# N400 Expansion — Plan 2b: Navigation + What Mean Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the SPEAKING nav group and ship the **Câu hỏi What Mean** section end-to-end: a landing page with a date-seeded Daily 5 flashcard habit, a full-deck flashcard mode with cards|list views and thuộc/chưa thuộc marking, and a 4-option multiple-choice Luyện tập using the authored distractors — all on the app's existing practice/flashcard visual theme.

**Architecture:** One route `speaking/what-mean` with an internal mode machine (`landing → flashcards → practice`), mirroring how the civics practice/flashcards pages are built but reading the section data (`WHATMEAN_QUESTIONS`) and the section state (`sectionKnown.whatmean`, `recordSectionAnswer`, `setSectionKnown`) added in Plan 2a. A new reusable `SectionFlashcard` component renders term↔definition cards (civics' `Flashcard` stays untouched); a new `buildWhatMeanOptions` helper produces shuffled MC options from the authored distractors; a new `sectionDailyFive` helper wires `dailyFiveSelection` to section state.

**Tech Stack:** Next.js (App Router) at `apps/website/`, React client components, Tailwind, lucide-react, vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-06-n400-study-sections-expansion-design.md` (SPEAKING / What Mean). Depends on Plan 2a (merged): `whatmean-data.ts`, `section-progress.ts`, `daily-five.ts`, `section-presets.ts`, `AudioButton` slow variant, `recordSectionAnswer`/`setSectionKnown`. Plan 2c will add Yes No + keyword highlighting + Tổng quan cards, reusing this plan's `SectionFlashcard` and section-page skeleton.

**Working directory for all commands:** `apps/website/`.

---

## Context an engineer needs

- **Data** (`src/lib/n400/whatmean-data.ts`): `WHATMEAN_QUESTIONS: WhatMeanQuestion[]`, 62 items, each `{ id: 'wm-<n>', num, termEn, termVi, questionEn, questionVi, definitionEn, definitionVi, distractorsEn: string[3] }`. `WHATMEAN_QUESTIONS_BY_ID` also exported.
- **Audio helpers** (`src/lib/n400/quiz-engine.ts`): `whatMeanQuestionAudioUrl(num)`, `whatMeanAnswerAudioUrl(num)`.
- **Section state** (`src/lib/n400/user-state.tsx`, via `useN400UserState()`): `state.sectionKnown.whatmean: string[]`, `state.sectionAttempts: SectionAttempt[]`; methods `recordSectionAnswer(section, itemId, wasCorrect, mode)` and `setSectionKnown(section, itemId, known)` (both async, return `{ milestone }`). `state` also has `.streak`; `hydrated` boolean is returned by the hook.
- **Selection** (`src/lib/n400/daily-five.ts`): `dailyFiveSelection(allIds, known:Set, seen:Set, seedKey, count?)`. **Seen** derives from `deriveSectionSeen(state.sectionAttempts).whatmean` (from `section-progress.ts`).
- **Presets** (`src/lib/n400/section-presets.ts`): `WHATMEAN_PRESETS: PracticePreset[]` (ids quick/standard/deep/full, counts 5/15/30/null).
- **Reusable picker** (`src/components/n400/PracticeSessionPicker.tsx`): renders `presets` + `totalCount`, `onSelect(preset)`, optional resume/recommendation (pass `resume={null}`, `recommendation={null}`, and no-op handlers if unused). Uses `PracticePreset` from quiz-engine.
- **Audio button** (`src/components/n400/AudioButton.tsx`): `<AudioButton src={url} label rate variant />`; `variant="slow" rate={0.7}` shows the turtle.
- **Existing patterns to mirror (read before building UI):**
  - Immersive flashcard layout: `src/app/[locale]/n400app/flashcards/layout.tsx` + `flashcards/page.tsx` (non-scrolling page, flex-1 card, anchored bottom controls, status chips "Chưa thuộc"/"Đã thuộc", cards|list toggle, `QuestionList.tsx`).
  - Civics flip card: `src/components/n400/flashcard/Flashcard.tsx` (FLIP_MS/easing/visibility-swap mechanics — replicate exactly in `SectionFlashcard`).
  - Practice quiz loop + MC option rendering + `PracticeSessionSummary`: `src/app/[locale]/n400app/practice/page.tsx`, `src/components/n400/PracticeSessionSummary.tsx`.
  - `Card`, `ProgressBar`: `src/components/n400/ui.tsx`.
- **Route locale**: pages read `const locale = (useParams()?.locale as string) || 'en'`; links are `\`/${locale}/n400app/...\``.
- **Design tokens**: teal accents (`teal-600`/`teal-50`), `rounded-2xl`/`rounded-[24px]` cards, `shadow-sm`. Match the existing files; do not invent a new palette. All user-facing copy is Vietnamese.
- vitest: `npx vitest run <file>`; gate: `npm run type-check && npm run test`.

## File structure this plan creates

```
apps/website/src/
├── lib/n400/
│   ├── whatmean-options.ts       + .test.ts        (Task 1: MC option builder)
│   └── section-daily.ts          + .test.ts        (Task 2: Daily 5 wiring helper)
├── components/n400/
│   ├── flashcard/SectionFlashcard.tsx              (Task 3: generic term↔def flip card)
│   └── speaking/
│       ├── SectionFlashcardDeck.tsx                (Task 4: deck runner: nav, known controls, list)
│       └── WhatMeanPractice.tsx                    (Task 5: MC quiz loop)
└── app/[locale]/n400app/speaking/what-mean/
    ├── layout.tsx                                  (Task 6: immersive layout)
    └── page.tsx                                    (Task 6: landing + mode machine)
```

Sidebar nav (`components/n400/Sidebar.tsx`) is modified in Task 7.

---

### Task 1: `whatmean-options.ts` — shuffled MC option builder

**Files:**
- Create: `src/lib/n400/whatmean-options.ts`
- Test: `src/lib/n400/whatmean-options.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/n400/whatmean-options.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildWhatMeanOptions } from './whatmean-options';
import { WHATMEAN_QUESTIONS_BY_ID } from './whatmean-data';

const q = WHATMEAN_QUESTIONS_BY_ID['wm-2']; // Register to vote

describe('buildWhatMeanOptions', () => {
  it('returns 4 options: the definition + its 3 distractors', () => {
    const opts = buildWhatMeanOptions(q, 'seed-1');
    expect(opts).toHaveLength(4);
    const texts = opts.map((o) => o.text).sort();
    expect(texts).toEqual([q.definitionEn, ...q.distractorsEn].sort());
    expect(opts.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(opts.find((o) => o.isCorrect)!.text).toBe(q.definitionEn);
  });

  it('is deterministic for a given (id, seed)', () => {
    expect(buildWhatMeanOptions(q, 's')).toEqual(buildWhatMeanOptions(q, 's'));
  });

  it('varies the correct answer position across seeds (not always first)', () => {
    const positions = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const opts = buildWhatMeanOptions(q, `seed-${i}`);
      positions.add(opts.findIndex((o) => o.isCorrect));
    }
    expect(positions.size).toBeGreaterThan(1); // shuffled, not fixed at index 0
  });

  it('assigns A–D ids in render order', () => {
    const opts = buildWhatMeanOptions(q, 'seed-1');
    expect(opts.map((o) => o.id)).toEqual(['A', 'B', 'C', 'D']);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (`npx vitest run src/lib/n400/whatmean-options.test.ts`, cannot resolve module).

- [ ] **Step 3: Implement** `src/lib/n400/whatmean-options.ts`:

```ts
// Builds 4 multiple-choice options for a What Mean question from its authored
// distractors (whatmean-data.ts already carries 1 definition + 3 distractors).
// Positions are shuffled deterministically per (id, seed) so the correct answer
// is never fixed in place. Reuses the app's seeded shuffle for consistency.

import { shuffle } from './quiz-engine';
import type { WhatMeanQuestion } from './whatmean-data';

export interface WhatMeanOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  isCorrect: boolean;
}

const OPTION_IDS: WhatMeanOption['id'][] = ['A', 'B', 'C', 'D'];

export function buildWhatMeanOptions(q: WhatMeanQuestion, seed: string | number): WhatMeanOption[] {
  const pool = [
    { text: q.definitionEn, isCorrect: true },
    ...q.distractorsEn.map((text) => ({ text, isCorrect: false })),
  ];
  const ordered = shuffle(pool, `${q.id}-mc-${seed}`);
  return ordered.map((o, i) => ({ id: OPTION_IDS[i], text: o.text, isCorrect: o.isCorrect }));
}
```

- [ ] **Step 4: Run test — expect PASS (4 tests).**

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/whatmean-options.ts src/lib/n400/whatmean-options.test.ts
git commit -m "feat(n400app): What Mean multiple-choice option builder with shuffled positions

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `section-daily.ts` — Daily 5 selection + progress helper

Wraps `dailyFiveSelection` with a stable local-date seed and computes the day's completion (how many of the 5 are now known), so the landing hero can show "x/5".

**Files:**
- Create: `src/lib/n400/section-daily.ts`
- Test: `src/lib/n400/section-daily.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/n400/section-daily.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sectionDailyFive, dailyFiveDoneCount } from './section-daily';

const ids = Array.from({ length: 20 }, (_, i) => `wm-${i + 1}`);

describe('sectionDailyFive', () => {
  it('is stable for the same section + date, differs by date', () => {
    const a = sectionDailyFive('whatmean', ids, new Set(), new Set(), '2026-07-06');
    const b = sectionDailyFive('whatmean', ids, new Set(), new Set(), '2026-07-06');
    const c = sectionDailyFive('whatmean', ids, new Set(), new Set(), '2026-07-07');
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(5);
  });
});

describe('dailyFiveDoneCount', () => {
  it('counts how many of the selection are known', () => {
    const pick = ['wm-1', 'wm-2', 'wm-3', 'wm-4', 'wm-5'];
    expect(dailyFiveDoneCount(pick, new Set(['wm-1', 'wm-3']))).toBe(2);
    expect(dailyFiveDoneCount(pick, new Set())).toBe(0);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL.**

- [ ] **Step 3: Implement** `src/lib/n400/section-daily.ts`:

```ts
// Thin wrapper tying dailyFiveSelection to a section + local date, plus the
// "x of 5 done today" count the landing hero shows. Seed is `${section}:${date}`
// so the set is stable all day and unique per section/day.

import { dailyFiveSelection } from './daily-five';
import type { SectionKey } from './section-progress';

export function sectionDailyFive(
  section: SectionKey,
  allIds: readonly string[],
  known: ReadonlySet<string>,
  seen: ReadonlySet<string>,
  localDate: string,
  count = 5,
): string[] {
  return dailyFiveSelection(allIds, known, seen, `${section}:${localDate}`, count);
}

export function dailyFiveDoneCount(selection: readonly string[], known: ReadonlySet<string>): number {
  return selection.filter((id) => known.has(id)).length;
}
```

- [ ] **Step 4: Run test — expect PASS (2 tests).**

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/section-daily.ts src/lib/n400/section-daily.test.ts
git commit -m "feat(n400app): section Daily 5 selection + done-count helper

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `SectionFlashcard` — generic term↔definition flip card

A presentation-only flip card reused by both Speaking sections. Same flip mechanics as civics `Flashcard` (do NOT modify that file). Takes ReactNode faces so callers control content.

**Files:**
- Create: `src/components/n400/flashcard/SectionFlashcard.tsx`

No unit test (visual component); gate = type-check + Task 8 manual run.

- [ ] **Step 1: Read the reference** `src/components/n400/flashcard/Flashcard.tsx` fully — copy its `FLIP_MS`, `FLIP_EASING`, `faceClass`, `faceTransition`, and the exact 3D-flip wrapper markup (perspective, rotateY, backface-visibility, visibility swap). Preserve every comment about the symmetric-easing constraint.

- [ ] **Step 2: Implement** `src/components/n400/flashcard/SectionFlashcard.tsx`:

```tsx
'use client';

// Generic flip card for the Speaking/Writing sections. Same flip mechanics as
// the civics Flashcard (see that file's comments on symmetric easing), but the
// two faces are caller-provided ReactNodes so What Mean (term↔definition) and
// Yes No (question↔meaning) can render their own content on one shared card.

import type { ReactNode } from 'react';

const FLIP_MS = 500;
const FLIP_EASING = 'cubic-bezier(0.4, 0, 0.6, 1)'; // symmetric ease-in-out; keep swap at FLIP_MS/2
const faceClass =
  'absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] motion-reduce:transition-none';
const faceTransition = { transition: `visibility 0s ${FLIP_MS / 2}ms` };

export function SectionFlashcard({
  flipped,
  onFlip,
  front,
  back,
}: {
  flipped: boolean;
  onFlip: () => void;
  front: ReactNode;
  back: ReactNode;
}) {
  return (
    <div className="relative h-full w-full [perspective:1600px]">
      <button
        type="button"
        onClick={onFlip}
        aria-label={flipped ? 'Lật lại mặt trước' : 'Lật xem đáp án'}
        className="relative h-full w-full cursor-pointer text-left [transform-style:preserve-3d] motion-reduce:transition-none"
        style={{
          transition: `transform ${FLIP_MS}ms ${FLIP_EASING}`,
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          className={faceClass}
          style={{ ...faceTransition, visibility: flipped ? 'hidden' : 'visible' }}
        >
          {front}
        </div>
        <div
          className={faceClass}
          style={{
            ...faceTransition,
            transform: 'rotateY(180deg)',
            visibility: flipped ? 'visible' : 'hidden',
          }}
        >
          {back}
        </div>
      </button>
    </div>
  );
}
```

(If the civics reference differs from the wrapper above — e.g. it uses a non-button clickable or different perspective value — prefer the reference's exact mechanics. The requirement is: symmetric easing, visibility swap at FLIP_MS/2, both faces absolutely positioned.)

- [ ] **Step 3: Verify** `npm run type-check` — clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/n400/flashcard/SectionFlashcard.tsx
git commit -m "feat(n400app): SectionFlashcard generic flip card for Speaking sections

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `SectionFlashcardDeck` — deck runner (cards + list + known controls)

Runs a list of item ids through `SectionFlashcard`: prev/next, progress, "Đã thuộc"/"Chưa thuộc" bottom buttons that call `setSectionKnown`, and a cards|list toggle. Content is What-Mean-specific here but the component is written to accept a render function so Plan 2c reuses it for Yes No.

**Files:**
- Create: `src/components/n400/speaking/SectionFlashcardDeck.tsx`

- [ ] **Step 1: Implement** `src/components/n400/speaking/SectionFlashcardDeck.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, List, Layers } from 'lucide-react';
import { SectionFlashcard } from '@/components/n400/flashcard/SectionFlashcard';
import { ProgressBar } from '@/components/n400/ui';

export interface DeckCard {
  id: string;               // 'wm-<n>'
  front: React.ReactNode;   // term + question + audio
  back: React.ReactNode;    // definition + audio
  listPrimary: string;      // term (list view left)
  listSecondary: string;    // definition (list view right)
}

export function SectionFlashcardDeck({
  cards,
  known,
  onSetKnown,
  onExit,
  title,
}: {
  cards: DeckCard[];
  known: ReadonlySet<string>;
  onSetKnown: (id: string, known: boolean) => void;
  onExit: () => void;
  title: string;
}) {
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-gray-500">Không có thẻ nào.</p>
        <button type="button" onClick={onExit} className="text-teal-700 font-semibold">Quay lại</button>
      </div>
    );
  }

  const card = cards[Math.min(index, cards.length - 1)];
  const isKnown = known.has(card.id);

  const go = (delta: number) => {
    setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta)));
    setFlipped(false);
  };

  const mark = (v: boolean) => {
    onSetKnown(card.id, v);
    if (index < cards.length - 1) go(1);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      {/* Header row: back + title + view toggle */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={onExit} className="text-sm font-semibold text-gray-500 hover:text-gray-800">
          ← {title}
        </button>
        <div className="flex gap-1 rounded-full bg-gray-100 p-1">
          <button type="button" onClick={() => setView('cards')} aria-label="Thẻ"
            className={`rounded-full p-1.5 ${view === 'cards' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-400'}`}>
            <Layers size={16} />
          </button>
          <button type="button" onClick={() => setView('list')} aria-label="Danh sách"
            className={`rounded-full p-1.5 ${view === 'list' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-400'}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-4">
          {cards.map((c) => (
            <div key={c.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-gray-800">{c.listPrimary}</div>
                {known.has(c.id) ? <span className="text-xs font-bold text-teal-600">Đã thuộc</span> : null}
              </div>
              <div className="mt-1 text-sm text-gray-600">{c.listSecondary}</div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">{index + 1}/{cards.length}</span>
            <div className="flex-1"><ProgressBar progress={((index + 1) / cards.length) * 100} /></div>
          </div>

          <div className="relative flex-1 min-h-0">{/* card fills remaining space */}
            <SectionFlashcard flipped={flipped} onFlip={() => setFlipped((f) => !f)} front={card.front} back={card.back} />
          </div>

          {/* Bottom controls: prev/next + known/unknown */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button type="button" onClick={() => go(-1)} disabled={index === 0}
              className="rounded-xl border border-gray-200 p-3 disabled:opacity-40">
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-1 gap-2">
              <button type="button" onClick={() => mark(false)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold ${isKnown ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}>
                <ThumbsDown size={16} /> Chưa thuộc
              </button>
              <button type="button" onClick={() => mark(true)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold ${isKnown ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700'}`}>
                <ThumbsUp size={16} /> Đã thuộc
              </button>
            </div>
            <button type="button" onClick={() => go(1)} disabled={index === cards.length - 1}
              className="rounded-xl border border-gray-200 p-3 disabled:opacity-40">
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify** `npm run type-check` — clean. (`ProgressBar` takes `progress` (0–100), `colorClass`, `heightClass` — confirmed against `src/components/n400/ui.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/n400/speaking/SectionFlashcardDeck.tsx
git commit -m "feat(n400app): SectionFlashcardDeck runner with cards/list views and mastery controls

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `WhatMeanPractice` — MC quiz loop

**Files:**
- Create: `src/components/n400/speaking/WhatMeanPractice.tsx`

- [ ] **Step 1: Read** `src/app/[locale]/n400app/practice/page.tsx` (the answer→reveal→next loop and option button states) and `src/components/n400/PracticeSessionSummary.tsx` (final screen) so this matches their interaction and look.

- [ ] **Step 2: Implement** `src/components/n400/speaking/WhatMeanPractice.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { AudioButton } from '@/components/n400/AudioButton';
import { buildWhatMeanOptions } from '@/lib/n400/whatmean-options';
import { whatMeanQuestionAudioUrl } from '@/lib/n400/quiz-engine';
import { WHATMEAN_QUESTIONS_BY_ID } from '@/lib/n400/whatmean-data';

export function WhatMeanPractice({
  itemIds,
  seed,
  onAnswer,
  onExit,
  title,
}: {
  itemIds: string[];
  seed: string;
  onAnswer: (itemId: string, wasCorrect: boolean) => void;
  onExit: () => void;
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const q = WHATMEAN_QUESTIONS_BY_ID[itemIds[index]];
  const options = useMemo(() => buildWhatMeanOptions(q, `${seed}-${index}`), [q, seed, index]);
  const answered = selected !== null;

  if (index >= itemIds.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <div className="text-5xl">🎉</div>
        <div>
          <div className="text-2xl font-extrabold text-gray-800">{correctCount}/{itemIds.length}</div>
          <div className="text-gray-500">câu đúng</div>
        </div>
        <button type="button" onClick={onExit} className="rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white">
          Hoàn thành
        </button>
      </div>
    );
  }

  const pick = (optText: string, isCorrect: boolean) => {
    if (answered) return;
    setSelected(optText);
    if (isCorrect) setCorrectCount((c) => c + 1);
    onAnswer(q.id, isCorrect);
  };

  const next = () => {
    setSelected(null);
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onExit} className="text-sm font-semibold text-gray-500 hover:text-gray-800">← {title}</button>
        <span className="text-xs font-semibold text-gray-500">{index + 1}/{itemIds.length}</span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-gray-900">{q.termEn}</div>
            <div className="text-sm text-gray-500 mt-0.5">{q.questionEn}</div>
          </div>
          <AudioButton src={whatMeanQuestionAudioUrl(q.num)} label="Nghe câu hỏi" size="sm" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const isChosen = selected === o.text;
          const showCorrect = answered && o.isCorrect;
          const showWrong = answered && isChosen && !o.isCorrect;
          return (
            <button key={o.id} type="button" disabled={answered} onClick={() => pick(o.text, o.isCorrect)}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                showCorrect ? 'border-teal-500 bg-teal-50 text-teal-800'
                : showWrong ? 'border-red-400 bg-red-50 text-red-700'
                : 'border-gray-200 bg-white hover:border-teal-300'}`}>
              <span>{o.text}</span>
              {showCorrect ? <Check size={18} className="text-teal-600 shrink-0" /> : null}
              {showWrong ? <X size={18} className="text-red-500 shrink-0" /> : null}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="mt-auto rounded-2xl bg-gray-50 p-4">
          <div className="text-sm font-semibold text-gray-700">{q.termVi} — {q.definitionVi}</div>
          <button type="button" onClick={next} className="mt-3 w-full rounded-xl bg-teal-600 py-3 font-semibold text-white">
            {index + 1 < itemIds.length ? 'Câu tiếp theo' : 'Xem kết quả'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Verify** `npm run type-check` — clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/n400/speaking/WhatMeanPractice.tsx
git commit -m "feat(n400app): What Mean multiple-choice practice loop

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: What Mean route — immersive layout + landing/mode machine

**Files:**
- Create: `src/app/[locale]/n400app/speaking/what-mean/layout.tsx`
- Create: `src/app/[locale]/n400app/speaking/what-mean/page.tsx`

- [ ] **Step 1: Layout** — copy `src/app/[locale]/n400app/flashcards/layout.tsx` verbatim into `speaking/what-mean/layout.tsx` (same immersive non-scrolling wrapper). If that layout file is trivial (just a flex wrapper), replicate it exactly so the deck/practice fill the viewport.

- [ ] **Step 2: Page** — create `speaking/what-mean/page.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Zap, Layers, ArrowRight } from 'lucide-react';
import { useN400UserState } from '@/lib/n400/user-state';
import { WHATMEAN_QUESTIONS, WHATMEAN_QUESTIONS_BY_ID } from '@/lib/n400/whatmean-data';
import { WHATMEAN_PRESETS } from '@/lib/n400/section-presets';
import { deriveSectionSeen } from '@/lib/n400/section-progress';
import { sectionDailyFive, dailyFiveDoneCount } from '@/lib/n400/section-daily';
import { selectPracticeQuestionIds } from '@/lib/n400/quiz-engine'; // reuse? see note
import { shuffle, whatMeanQuestionAudioUrl, whatMeanAnswerAudioUrl } from '@/lib/n400/quiz-engine';
import { AudioButton } from '@/components/n400/AudioButton';
import { PracticeSessionPicker } from '@/components/n400/PracticeSessionPicker';
import { SectionFlashcardDeck, type DeckCard } from '@/components/n400/speaking/SectionFlashcardDeck';
import { WhatMeanPractice } from '@/components/n400/speaking/WhatMeanPractice';
import type { PracticePreset } from '@/lib/n400/quiz-engine';

const ALL_IDS = WHATMEAN_QUESTIONS.map((q) => q.id);
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type Mode =
  | { kind: 'landing' }
  | { kind: 'deck'; ids: string[] }
  | { kind: 'practice'; ids: string[]; seed: string };

function toCard(id: string): DeckCard {
  const q = WHATMEAN_QUESTIONS_BY_ID[id];
  return {
    id,
    listPrimary: q.termEn,
    listSecondary: q.definitionEn,
    front: (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-sm">
        <AudioButton src={whatMeanQuestionAudioUrl(q.num)} label="Nghe" />
        <div className="mt-4 text-2xl font-extrabold text-gray-900">{q.termEn}</div>
        <div className="mt-2 text-gray-500">{q.questionEn}</div>
        <div className="mt-6 text-xs text-gray-400">Chạm để xem nghĩa</div>
      </div>
    ),
    back: (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[24px] border border-teal-100 bg-teal-50/40 p-6 text-center shadow-sm">
        <AudioButton src={whatMeanAnswerAudioUrl(q.num)} label="Nghe nghĩa" size="sm" />
        <div className="mt-4 text-xl font-bold text-gray-900">{q.definitionEn}</div>
        <div className="mt-3 text-teal-800">{q.termVi} — {q.definitionVi}</div>
      </div>
    ),
  };
}

export default function WhatMeanPage() {
  const { state, hydrated, recordSectionAnswer, setSectionKnown } = useN400UserState();
  const [mode, setMode] = useState<Mode>({ kind: 'landing' });

  const known = useMemo(() => new Set(state.sectionKnown.whatmean), [state.sectionKnown.whatmean]);
  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts).whatmean, [state.sectionAttempts]);
  const daily = useMemo(() => sectionDailyFive('whatmean', ALL_IDS, known, seen, todayLocal()), [known, seen]);
  const dailyDone = dailyFiveDoneCount(daily, known);

  if (!hydrated) return <div className="flex flex-1 items-center justify-center text-gray-400">Đang tải…</div>;

  if (mode.kind === 'deck') {
    return (
      <SectionFlashcardDeck
        cards={mode.ids.map(toCard)}
        known={known}
        onSetKnown={(id, v) => void setSectionKnown('whatmean', id, v)}
        onExit={() => setMode({ kind: 'landing' })}
        title="Câu hỏi What Mean"
      />
    );
  }

  if (mode.kind === 'practice') {
    return (
      <WhatMeanPractice
        itemIds={mode.ids}
        seed={mode.seed}
        onAnswer={(id, ok) => void recordSectionAnswer('whatmean', id, ok, 'practice')}
        onExit={() => setMode({ kind: 'landing' })}
        title="Câu hỏi What Mean"
      />
    );
  }

  // landing
  const startPractice = (preset: PracticePreset) => {
    const seed = `${Date.now()}`;
    const count = preset.count ?? ALL_IDS.length;
    const ids = shuffle([...ALL_IDS], `wm-practice-${seed}`).slice(0, count);
    setMode({ kind: 'practice', ids, seed });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-8">
        {/* Daily 5 hero */}
        <section className="rounded-[24px] border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-teal-600">Daily 5 hôm nay</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">Học 5 từ vựng — {dailyDone}/5</div>
          <button type="button" onClick={() => setMode({ kind: 'deck', ids: daily })}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white shadow-md">
            {dailyDone >= 5 ? 'Ôn lại' : 'Bắt đầu'} <ArrowRight size={16} />
          </button>
        </section>

        {/* Học tất cả */}
        <button type="button" onClick={() => setMode({ kind: 'deck', ids: [...ALL_IDS] })}
          className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm hover:shadow-md">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Layers size={22} /></div>
          <div className="flex-1">
            <div className="font-bold text-gray-800">Học tất cả</div>
            <div className="text-sm text-gray-500">Lật thẻ toàn bộ {ALL_IDS.length} từ vựng</div>
          </div>
        </button>

        {/* Luyện tập MC */}
        <div>
          <h2 className="mb-3 text-base font-bold text-gray-800">Luyện tập trắc nghiệm</h2>
          <PracticeSessionPicker
            presets={WHATMEAN_PRESETS}
            totalCount={ALL_IDS.length}
            resume={null}
            recommendation={null}
            onSelect={startPractice}
            onResume={() => {}}
            onPracticeRecommendation={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
```

**Note on `selectPracticeQuestionIds` import:** remove it — the page shuffles `ALL_IDS` directly (that helper is civics-specific). Keep only `shuffle`, `whatMeanQuestionAudioUrl`, `whatMeanAnswerAudioUrl`, and the `PracticePreset` type import from quiz-engine.

- [ ] **Step 3: Verify build** `npm run type-check` — clean. Fix any prop mismatches revealed (e.g. `PracticeSessionPicker` required props, `ProgressBar` prop name).

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/n400app/speaking/what-mean/layout.tsx" "src/app/[locale]/n400app/speaking/what-mean/page.tsx"
git commit -m "feat(n400app): What Mean section page (Daily 5, full deck, MC practice)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Sidebar — CIVICS / SPEAKING groups

**Files:**
- Modify: `src/components/n400/Sidebar.tsx`

- [ ] **Step 1: Read** `Sidebar.tsx` fully. It currently renders `PRIMARY_MENU` (flat) + `SECONDARY_MENU`. Introduce grouped rendering on desktop.

- [ ] **Step 2: Add a group header type + the SPEAKING entry.** Add to imports: `MessageCircleQuestion` (or another lucide icon present in the package — verify import resolves). Define desktop groups:

```ts
type NavGroup = { heading: string | null; items: MenuItem[] };

const DESKTOP_GROUPS: NavGroup[] = [
  { heading: null, items: [{ id: 'dashboard', label: 'Tổng quan', href: '', icon: Home }] },
  {
    heading: 'CIVICS (128 câu)',
    items: [
      { id: 'practice', label: 'Luyện tập', href: 'practice', icon: CheckCircle },
      { id: 'flashcards', label: 'Flashcards', href: 'flashcards', icon: Layers },
    ],
  },
  {
    heading: 'SPEAKING',
    items: [
      { id: 'whatmean', label: 'Câu hỏi What Mean', href: 'speaking/what-mean', icon: MessageCircleQuestion },
    ],
  },
  { heading: null, items: [{ id: 'mock-test', label: 'Thi thử', href: 'mock-test', icon: ClipboardCheck }] },
];
```

- [ ] **Step 3: Render groups** in the desktop `<nav>`: replace the `PRIMARY_MENU.map(...)` block with a map over `DESKTOP_GROUPS`, rendering an uppercase `text-[11px] font-bold tracking-wide text-gray-400 px-4 pt-4 pb-1` heading when `group.heading` is non-null, then its `NavItem`s. Keep `SECONDARY_MENU` (Tiến độ) and the divider as-is. **Do NOT change `MOBILE_MENU`** — mobile bottom nav stays at the 4 civics items (spec: Speaking reached from Tổng quan on mobile; those entry cards land in Plan 2c).

- [ ] **Step 4: Verify** `npm run type-check && npm run build` (or `npm run type-check` + a dev smoke) — clean. Confirm the `speaking/what-mean` href resolves (matches the route folder created in Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/Sidebar.tsx
git commit -m "feat(n400app): group sidebar into CIVICS and SPEAKING sections

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Verification (build + drive the section)

- [ ] **Step 1:** `npm run type-check` — exits 0.
- [ ] **Step 2:** `npm run test` — all suites pass (2 new test files from Tasks 1–2).
- [ ] **Step 3:** `npx eslint` on all created/modified files — no new errors.
- [ ] **Step 4: Drive it.** `npm run dev`, log in, open `/vi/n400app/speaking/what-mean`. Verify by observing:
  - Daily 5 hero shows `x/5`; "Bắt đầu" opens a 5-card deck.
  - Flashcard flips (term/question → definition + VI); question and answer audio buttons play.
  - "Đã thuộc"/"Chưa thuộc" advance the card; reopening the section shows the done count increased (state persisted to Supabase).
  - "Học tất cả" opens all 62; list toggle shows the term/definition list with "Đã thuộc" tags.
  - A Luyện tập preset (e.g. Luyện nhanh 5) runs the MC quiz: correct/wrong highlight, VI explanation shows, summary tallies score.
  - Sidebar shows CIVICS and SPEAKING group headings; the What Mean link is active on this route.
  Capture a screenshot of the landing + one flashcard + one MC question. Report what you observed. If the immersive layout doesn't fill height or the card overflows, note it — polish fixes are in scope for this task.
- [ ] **Step 5:** `git status --porcelain` — clean (commit any layout polish first).

---

## Follow-up plans (not in this plan)

- **Plan 2c — Yes No section + finish Speaking:** `speaking/yes-no` route reusing `SectionFlashcardDeck` + a `YesNoPractice` (Yes/No buttons, audio); keyword highlighting component + definition popover over question text (using Plan 2a's `findKeywordSpans`); 🐢 slow-playback on Yes No audio; Tổng quan Daily Goals entry cards for both Speaking sections (mobile entry point); add `whatmean`/`yesno` to the mobile reach.
- **Plan 3 — Writing + Thi thử**, **Plan 4 — Gamification.**
