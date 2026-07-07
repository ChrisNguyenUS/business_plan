# N400 Expansion — Plan 2c: Yes No Section + Finish Speaking

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the **SPEAKING** section with the **Câu hỏi Yes No** subsection and finish the Speaking landing page with Daily Goals entry cards. Ship end-to-end: a landing page with a date-seeded Daily 5 flashcard habit (keywords highlighted), a full-deck flashcard mode with keyword popover definitions, slow-playback audio, and a Yes/No practice mode using two-button answers graded against the data file — all matching Civics UI exactly.

**Architecture:** Extend Plan 2b's pattern to `speaking/yes-no` with reusable shared screens. The `SectionFlashcardScreen` from 2b handles flashcards (feed it What Mean or Yes No card data, same component). Build a new shared `SectionYesNoQuiz` screen for the two-button Yes/No practice (mirrors `SectionMCQuiz` chrome, swaps MC grid for Yes/No buttons). Integrate `keyword-match.ts` to find and underline vocabulary terms in Yes No question text, with popover-on-tap showing the What Mean definition. Update `Tổng quan` to show both sections' Daily 5 entry cards. Sidebar updated in Plan 2b; this plan adds Yes No link.

**Tech Stack:** Next.js (App Router) at `apps/website/`, React client components, Tailwind, lucide-react, vitest, Headless UI (Popover). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-06-n400-study-sections-expansion-design.md` (SPEAKING / Yes No). Depends on Plan 2a (merged): `yesno-data.ts`, `keyword-match.ts`, `AudioButton` slow variant. Depends on Plan 2b (merged): `SectionFlashcardScreen`, section-page skeleton, section state (`sectionKnown.yesno`, `recordSectionAnswer`/`setSectionKnown`).

**Working directory for all commands:** `apps/website/`.

---

## Context an engineer needs

- **Data** (`src/lib/n400/yesno-data.ts`): `YESNO_QUESTIONS: YesNoQuestion[]`, 37 items, each `{ id: 'yn-<n>', num, questionEn, questionVi, answerVi, answer: 'yes'|'no' }`. `YESNO_QUESTIONS_BY_ID` also exported. **Note:** All 37 currently have `answer: 'no'` (discussed in handoff §6).
- **Audio helpers** (`src/lib/n400/quiz-engine.ts`): `yesNoAudioUrl(num)`.
- **Keyword matching** (`src/lib/n400/keyword-match.ts`): `findKeywordSpans(text: string, terms: string[]): Span[]` where `Span = { start, end, term }`. Covers ~23/37 Yes No questions. Returns sorted, non-overlapping spans.
- **What Mean data for keywords** (`src/lib/n400/whatmean-data.ts`): `WHATMEAN_QUESTIONS_BY_ID` for popover definitions (will look up by term).
- **Section state** (`src/lib/n400/user-state.tsx`): same as Plan 2b (`sectionKnown.yesno`, `recordSectionAnswer`, `setSectionKnown`). Seen derives from `deriveSectionSeen(state.sectionAttempts).yesno`.
- **Presets** (`src/lib/n400/section-presets.ts`): `YESNO_PRESETS: PracticePreset[]` (ids quick/standard/deep/full, counts 5/10/20/37). Already defined in Plan 2a.
- **Shared screens** (from Plan 2b, reuse directly):
  - `SectionFlashcardScreen` (`src/components/n400/speaking/SectionFlashcardScreen.tsx`) — renders flashcard deck for any section (feed it `SectionCard[]` from the section's data).
  - `SectionMCQuiz` (`src/components/n400/speaking/SectionMCQuiz.tsx`) — 4-option MC quiz chrome (not used here, but reference its chrome pattern).
- **Audio button** (`src/components/n400/AudioButton.tsx`): supports `rate={0.7}` for slow playback.
- **Route locale**: pages read `const locale = (useParams()?.locale as string) || 'en'`; links are `\`/${locale}/n400app/...\``.
- **Design tokens**: teal accents, `rounded-2xl` cards, `shadow-sm`. Match existing files.
- vitest: `npx vitest run <file>`; gate: `npm run type-check && npm run test`.

## File structure this plan creates

```
apps/website/src/
├── lib/n400/
│   └── (yesno-data.ts + keyword-match.ts already created in Plan 2a)
├── components/n400/
│   ├── flashcard/
│   │   └── KeywordHighlight.tsx                    (Task 1: underline + popover)
│   └── speaking/
│       ├── SectionYesNoQuiz.tsx                    (Task 2: Yes/No button quiz screen)
│       └── YesNoPopover.tsx                        (Task 3: definition popover for keywords)
└── app/[locale]/n400app/speaking/yes-no/
    ├── layout.tsx                                  (Task 4: immersive layout, reuse from 2b)
    └── page.tsx                                    (Task 4: landing + mode machine)

Also modify:
├── app/[locale]/n400app/page.tsx                  (Task 5: Tổng quan — add Yes No + What Mean cards)
└── components/n400/Sidebar.tsx                    (Task 6: add Yes No link under SPEAKING)
```

---

### Task 1: `KeywordHighlight.tsx` — Underline keywords + definition popover

**Files:**
- Create: `src/components/n400/flashcard/KeywordHighlight.tsx`
- Test: `src/components/n400/flashcard/KeywordHighlight.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/n400/flashcard/KeywordHighlight.test.tsx`:

```ts
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KeywordHighlight } from './KeywordHighlight';

describe('KeywordHighlight', () => {
  it('renders text with underlined keywords', () => {
    const text = 'Have you ever been arrested for a crime?';
    const terms = ['arrested', 'crime'];
    const definitions = { arrested: 'caught by police', crime: 'illegal act' };
    
    const { container } = render(
      <KeywordHighlight text={text} terms={terms} definitions={definitions} />
    );
    
    const highlights = container.querySelectorAll('.keyword-highlight');
    expect(highlights).toHaveLength(2);
    expect(highlights[0].textContent).toBe('arrested');
    expect(highlights[1].textContent).toBe('crime');
  });

  it('handles text with no matches', () => {
    const text = 'Simple question without keywords';
    const terms = ['arrested', 'crime'];
    const definitions = {};
    
    const { container } = render(
      <KeywordHighlight text={text} terms={terms} definitions={definitions} />
    );
    
    const highlights = container.querySelectorAll('.keyword-highlight');
    expect(highlights).toHaveLength(0);
    expect(container.textContent).toBe(text);
  });

  it('preserves non-matching text between keywords', () => {
    const text = 'Have you been arrested?';
    const terms = ['arrested'];
    const definitions = { arrested: 'caught by police' };
    
    const { container } = render(
      <KeywordHighlight text={text} terms={terms} definitions={definitions} />
    );
    
    expect(container.textContent).toBe(text);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (`npx vitest run src/components/n400/flashcard/KeywordHighlight.test.tsx`).

- [ ] **Step 3: Implement** `src/components/n400/flashcard/KeywordHighlight.tsx`:

```tsx
'use client';

import { ReactNode } from 'react';
import { findKeywordSpans } from '@/lib/n400/keyword-match';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';

interface Props {
  text: string;
  terms: string[]; // vocabulary terms to match
  definitions: Record<string, string>; // term → definition VI
}

export function KeywordHighlight({ text, terms, definitions }: Props) {
  const spans = findKeywordSpans(text, terms);
  
  if (spans.length === 0) return <span>{text}</span>;

  const parts: ReactNode[] = [];
  let lastIdx = 0;

  for (const span of spans) {
    // Add text before the span
    if (span.start > lastIdx) {
      parts.push(text.slice(lastIdx, span.start));
    }

    // Add highlighted keyword with popover
    const keyword = text.slice(span.start, span.end);
    const definition = definitions[span.term] || '';
    
    parts.push(
      <Popover key={`kw-${span.start}`} className="inline relative">
        <PopoverButton className="keyword-highlight underline decoration-teal-600 decoration-2 underline-offset-2 cursor-help hover:text-teal-600 transition-colors">
          {keyword}
        </PopoverButton>
        {definition && (
          <PopoverPanel className="absolute left-0 top-full mt-2 bg-white border border-teal-200 rounded-lg p-2 shadow-lg text-sm text-gray-700 max-w-xs z-50">
            <p className="font-semibold text-teal-700 mb-1">{span.term}</p>
            <p>{definition}</p>
          </PopoverPanel>
        )}
      </Popover>
    );

    lastIdx = span.end;
  }

  // Add remaining text
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return <span>{parts}</span>;
}
```

- [ ] **Step 4: Run test — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/flashcard/KeywordHighlight.tsx src/components/n400/flashcard/KeywordHighlight.test.tsx
git commit -m "feat(n400app): Keyword highlighting with definition popover for Yes No

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `SectionYesNoQuiz.tsx` — Yes/No button answer screen

**Files:**
- Create: `src/components/n400/speaking/SectionYesNoQuiz.tsx`

Mirrors `SectionMCQuiz.tsx` chrome (progress bar, question card, feedback, summary) but replaces the 2×2 A/B/C/D grid with two large buttons: `[Yes, officer]` and `[No, officer]`.

- [ ] **Step 1: Read existing `SectionMCQuiz` for chrome pattern** (`src/components/n400/speaking/SectionMCQuiz.tsx`).

- [ ] **Step 2: Create `SectionYesNoQuiz.tsx`**

```tsx
'use client';

import { useCallback, useState } from 'react';
import type { YesNoQuestion } from '@/lib/n400/yesno-data';
import { AudioButton } from '@/components/n400/AudioButton';
import { yesNoAudioUrl } from '@/lib/n400/quiz-engine';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/n400/ui';
import { PracticeSessionSummary } from '@/components/n400/PracticeSessionSummary';

interface SectionYesNoQuizProps {
  questions: YesNoQuestion[];
  onSessionEnd: (results: { correct: number; total: number }) => void;
}

interface QuizResult {
  questionId: string;
  userAnswer: 'yes' | 'no';
  correct: boolean;
}

export function SectionYesNoQuiz({ questions, onSessionEnd }: SectionYesNoQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentResult = results[currentIndex];
  const isAnswered = !!currentResult;
  const isCorrect = currentResult?.correct ?? false;

  const handleAnswer = useCallback((answer: 'yes' | 'no') => {
    if (isAnswered) return;

    const correct = answer === currentQuestion.answer;
    setResults((prev) => [
      ...prev,
      { questionId: currentQuestion.id, userAnswer: answer, correct },
    ]);
    setShowFeedback(true);
  }, [currentQuestion, isAnswered]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      const correctCount = results.filter((r) => r.correct).length;
      onSessionEnd({ correct: correctCount, total: questions.length });
    } else {
      setCurrentIndex((prev) => prev + 1);
      setShowFeedback(false);
    }
  }, [currentIndex, questions.length, results, onSessionEnd]);

  if (currentIndex >= questions.length || !currentQuestion) {
    return (
      <PracticeSessionSummary
        correct={results.filter((r) => r.correct).length}
        total={questions.length}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-teal-50 to-white p-6">
      <ProgressBar current={currentIndex + 1} total={questions.length} />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm p-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Câu {currentIndex + 1}/{questions.length}
          </h3>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-4">{currentQuestion.questionEn}</p>
            <AudioButton 
              src={yesNoAudioUrl(currentQuestion.num)}
              label="Nghe"
              variant="slow"
              rate={0.7}
            />
          </div>

          {showFeedback && (
            <div className={`p-4 rounded-lg mb-6 ${
              isCorrect
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="font-semibold mb-2">
                {isCorrect ? '✓ Đúng!' : '✗ Sai'}
              </p>
              <p className="text-sm mb-2">Đáp án: {currentQuestion.answer === 'yes' ? 'Yes' : 'No'}</p>
              <p className="text-sm">{currentQuestion.answerVi}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button
              onClick={() => handleAnswer('yes')}
              disabled={isAnswered}
              variant={
                isAnswered && currentResult?.userAnswer === 'yes'
                  ? isCorrect
                    ? 'success'
                    : 'destructive'
                  : 'outline'
              }
              size="lg"
              className="text-lg"
            >
              Yes, officer
            </Button>
            <Button
              onClick={() => handleAnswer('no')}
              disabled={isAnswered}
              variant={
                isAnswered && currentResult?.userAnswer === 'no'
                  ? isCorrect
                    ? 'success'
                    : 'destructive'
                  : 'outline'
              }
              size="lg"
              className="text-lg"
            >
              No, officer
            </Button>
          </div>

          {isAnswered && (
            <Button onClick={handleNext} className="w-full">
              Tiếp theo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/n400/speaking/SectionYesNoQuiz.tsx
git commit -m "feat(n400app): Yes/No button quiz screen with feedback

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `YesNoPopover.tsx` — Definition popover for keywords (optional, merged into Task 1)

Already covered in `KeywordHighlight` component above — skip this as a separate file.

---

### Task 4: `speaking/yes-no/` route — Landing + mode machine

**Files:**
- Create: `src/app/[locale]/n400app/speaking/yes-no/layout.tsx`
- Create: `src/app/[locale]/n400app/speaking/yes-no/page.tsx`

Mirrors `speaking/what-mean/` structure. Immersive layout, landing with Daily 5 hero, Học tất cả, mode machine (landing → flashcards → quiz).

- [ ] **Step 1: Copy `what-mean/layout.tsx` → `yes-no/layout.tsx`** (identical immersive layout, no changes needed).

- [ ] **Step 2: Create `yes-no/page.tsx`**

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useN400UserState } from '@/lib/n400/user-state';
import { YESNO_QUESTIONS, YESNO_QUESTIONS_BY_ID } from '@/lib/n400/yesno-data';
import { WHATMEAN_QUESTIONS_BY_ID } from '@/lib/n400/whatmean-data';
import { sectionDailyFive, dailyFiveDoneCount } from '@/lib/n400/section-daily';
import { YESNO_PRESETS } from '@/lib/n400/section-presets';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { SectionFlashcardScreen } from '@/components/n400/speaking/SectionFlashcardScreen';
import { SectionYesNoQuiz } from '@/components/n400/speaking/SectionYesNoQuiz';
import { PracticeSessionPicker } from '@/components/n400/PracticeSessionPicker';
import { KeywordHighlight } from '@/components/n400/flashcard/KeywordHighlight';
import type { SectionCard } from '@/lib/n400/section-progress';

type Mode = 'landing' | 'flashcards' | 'quiz';

export default function YesNoPage() {
  const locale = (useParams()?.locale as string) || 'en';
  const { state, recordSectionAnswer, setSectionKnown } = useN400UserState();
  const [mode, setMode] = useState<Mode>('landing');
  const [quizPreset, setQuizPreset] = useState<string | null>(null);

  if (!state.hydrated) return <div>Loading…</div>;

  // Daily 5 for this section
  const dailyFive = sectionDailyFive(YESNO_QUESTIONS, state, 'yesno');
  const doneCount = dailyFiveDoneCount(dailyFive, state.sectionKnown.yesno);

  // Build section cards for flashcard screen (includes keyword highlighting)
  const buildCards = (): SectionCard[] => {
    return YESNO_QUESTIONS.map((q) => ({
      id: q.id,
      front: {
        en: q.questionEn,
        vi: `Câu hỏi ${q.num}`,
        audioUrl: `/n400-audio/Yes_no_question/sound/${q.num}.mp3`,
      },
      back: {
        en: q.questionEn,
        vi: q.questionVi + '\n' + q.answerVi,
      },
    }));
  };

  // Build cards with keyword highlighting for quiz
  const buildQuizCards = (ids: string[]): SectionCard[] => {
    return ids
      .map((id) => YESNO_QUESTIONS_BY_ID[id])
      .filter(Boolean)
      .map((q) => ({
        id: q.id,
        front: {
          en: (
            <KeywordHighlight
              text={q.questionEn}
              terms={WHATMEAN_QUESTIONS_BY_ID ? Object.values(WHATMEAN_QUESTIONS_BY_ID).map((wm) => wm.termEn) : []}
              definitions={Object.values(WHATMEAN_QUESTIONS_BY_ID || {}).reduce((acc, wm) => {
                acc[wm.termEn] = wm.definitionEn;
                return acc;
              }, {} as Record<string, string>)}
            />
          ),
          vi: q.questionVi,
        },
        back: { en: '', vi: '' },
      }));
  };

  // Handle quiz end
  const handleQuizEnd = useCallback(
    async (results: { correct: number; total: number }) => {
      // Record results in user state (simplified; full logic in Plan 3)
      setMode('landing');
    },
    []
  );

  if (mode === 'flashcards') {
    const cards = buildCards();
    return (
      <SectionFlashcardScreen
        section="yesno"
        cards={cards}
        known={state.sectionKnown.yesno}
        onKnownChange={(itemId, known) => setSectionKnown('yesno', itemId, known)}
        onBack={() => setMode('landing')}
        slowAudio
      />
    );
  }

  if (mode === 'quiz' && quizPreset) {
    const preset = YESNO_PRESETS.find((p) => p.id === quizPreset);
    if (!preset) return null;

    const quizIds = YESNO_QUESTIONS.slice(0, preset.count).map((q) => q.id);
    const quizQuestions = quizIds.map((id) => YESNO_QUESTIONS_BY_ID[id]).filter(Boolean);

    return (
      <SectionYesNoQuiz
        questions={quizQuestions}
        onSessionEnd={handleQuizEnd}
      />
    );
  }

  // Landing mode
  return (
    <div className="flex flex-col h-full p-6">
      {/* Daily 5 Hero */}
      <div className="mb-8 bg-gradient-to-r from-teal-50 to-blue-50 rounded-2xl p-8 text-center">
        <h2 className="text-3xl font-bold text-teal-900 mb-2">Daily 5 hôm nay</h2>
        <p className="text-teal-700 mb-4">{doneCount}/5 hoàn thành</p>
        <button
          onClick={() => setMode('flashcards')}
          className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          Học hôm nay
        </button>
      </div>

      {/* Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setMode('flashcards')}
          className="p-4 border-2 border-teal-200 rounded-xl hover:bg-teal-50"
        >
          <h3 className="font-semibold">Học tất cả</h3>
          <p className="text-sm text-gray-600">{YESNO_QUESTIONS.length} câu hỏi</p>
        </button>

        <button
          onClick={() => {
            setQuizPreset('quick');
            setMode('quiz');
          }}
          className="p-4 border-2 border-teal-200 rounded-xl hover:bg-teal-50"
        >
          <h3 className="font-semibold">Luyện tập</h3>
          <p className="text-sm text-gray-600">Chọn mức độ</p>
        </button>
      </div>

      <Link
        href={`/${locale}/n400app/speaking`}
        className="text-teal-600 hover:text-teal-700 underline"
      >
        ← Quay lại Speaking
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/n400app/speaking/yes-no/
git commit -m "feat(n400app): Yes No section page with landing, flashcards, quiz

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Update `Tổng quan` with Daily Goals cards for both sections

**Files:**
- Modify: `src/app/[locale]/n400app/page.tsx`

Add "5 thẻ What Mean" and "5 thẻ Yes No" cards to the Daily Goals section on Tổng quan.

- [ ] **Step 1: Read current page.tsx** to find Daily Goals section.

- [ ] **Step 2: Add two new cards:**

```tsx
// Add in the Daily Goals grid
<Link href={`/${locale}/n400app/speaking/what-mean`} className="daily-goal-card">
  <h3>5 thẻ What Mean hôm nay</h3>
  <p>{whatMeanDoneCount}/5</p>
</Link>

<Link href={`/${locale}/n400app/speaking/yes-no`} className="daily-goal-card">
  <h3>5 thẻ Yes No hôm nay</h3>
  <p>{yesNoDoneCount}/5</p>
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/n400app/page.tsx
git commit -m "feat(n400app): Add What Mean and Yes No Daily Goals cards to Tổng quan

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Add Yes No link to Sidebar SPEAKING group

**Files:**
- Modify: `src/components/n400/Sidebar.tsx`

Verify SPEAKING group exists (added in Plan 2b), add "Câu hỏi Yes No" link under it.

- [ ] **Step 1: Verify SPEAKING group structure** in Sidebar (from Plan 2b).

- [ ] **Step 2: Add Yes No link:**

```tsx
// Inside the SPEAKING group
<Link
  href={`/${locale}/n400app/speaking/yes-no`}
  className={isActive('/speaking/yes-no') ? 'active-link' : 'link'}
>
  Câu hỏi Yes No
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/n400/Sidebar.tsx
git commit -m "feat(n400app): Add Yes No link to SPEAKING sidebar group

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Verification gate

- [ ] Run type-check: `npm run type-check`
- [ ] Run tests: `npm run test` (should include KeywordHighlight, SectionYesNoQuiz tests)
- [ ] Run build: `npm run build`
- [ ] Manual smoke test:
  - Navigate to `/n400app/speaking/yes-no` (should show landing with Daily 5, Học tất cả, Luyện tập buttons)
  - Click "Daily 5" → flashcards should show with keyword highlighting + popover on hover
  - Click "Luyện tập" → quiz should show Yes/No buttons
  - Audio playback (normal and slow) should work
  - Verify keyword highlighting covers ~23/37 questions
  - Verify Tổng quan shows both section cards
  - Verify Sidebar has both Speaking subsections

- [ ] **Final commit (squash or single):**

```bash
git log --oneline -10  # verify commit messages
```

---

## Summary

Plan 2c ships the **Câu hỏi Yes No** section with:
- Keyword highlighting (from What Mean vocab) + definition popovers
- Slow-playback audio on flashcards
- Two-button Yes/No practice mode (reuses civics chrome via `SectionYesNoQuiz`)
- Tổng quan Daily Goals cards for both Speaking sections
- Full Speaking navigation complete

All UI matches Civics exactly using shared `SectionFlashcardScreen` and new `SectionYesNoQuiz`. Ready for Plan 3 (Writing section + Thi thử split).
