# N400 Expansion — Plan 3: Writing Section + Thi thử Split

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the **Writing (Viết)** section — pure dictation practice where the user hears a sentence (audio-only, no text) and types it back, with grading following USCIS rules (punctuation/capitalization ignored, minor spelling passes, no abbreviations). Plus split **Thi thử** into three separate mock tests: Civics (unchanged), Viết (3 sentences, pass ≥1/3), Speaking (10 items = 5 What Mean MC + 5 Yes No audio-only).

**Architecture:** Writing section at `writing` route with session picker (presets 3/10/20/45), dictation UI (audio plays, no text, user types, per-word diff on feedback), and the shared grading engine. Build `DictationQuiz` screen (analogous to `SectionMCQuiz` but with text input + word-by-word diff rendering). Thi thử becomes a picker (`thi-thu/page.tsx`) with 3 cards (Civics / Viết / Speaking) each launching their respective tests. Build `MockTestResult` screen (summary with stats). Grading rules: normalize → compare word-by-word → edit distance per word → annotate capitalization/spelling slips as yellow warnings (no fail). Guidance box always visible.

**Tech Stack:** Next.js (App Router) at `apps/website/`, React client components, Tailwind, lucide-react, vitest, `edit-distance` (npm). No other new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-06-n400-study-sections-expansion-design.md` (Writing / Thi thử). Depends on Plan 2a: `writing-data.ts`, `section-progress.ts`. Depends on Plan 2b/2c: shared screens.

**Working directory for all commands:** `apps/website/`.

---

## Context an engineer needs

- **Data** (`src/lib/n400/writing-data.ts`): `WRITING_SENTENCES: WritingSentence[]`, 45 items, each `{ id: 'wr-<n>', num, sentenceEn, sentenceVi }`. Canonical form (how to grade against). `WRITING_SENTENCES_BY_ID` also exported.
- **Audio helpers** (`src/lib/n400/quiz-engine.ts`): `writingAudioUrl(num)`.
- **USCIS grading rules:**
  1. **Normalize both user input + canonical:** trim, collapse whitespace, remove all punctuation, lowercase.
  2. **Word-by-word comparison:** split normalized strings into words.
  3. **Edit distance per word:** user word matches canonical word if edit distance ≤ (1 for short words, 2 for words ≥8 chars).
  4. **Feedback annotations:** Show capitalization slips (yellow hint "Nhớ viết hoa: ...") and spelling slips (yellow hint "Kiểm tra chính tả: ...") without failing the answer.
  5. **Abbreviations fail:** "NYC" vs "New York City" fails (different word shapes).
- **Section state** (`src/lib/n400/user-state.tsx`): `sectionKnown.writing`, `recordSectionAnswer`, `setSectionKnown`. Seen derives from `deriveSectionSeen(state.sectionAttempts).writing`.
- **Presets** (`src/lib/n400/section-presets.ts`): `WRITING_PRESETS: PracticePreset[]` (ids quick/standard/deep/full, counts 3/10/20/45). Already defined in Plan 2a.
- **Shared screens** (from Plan 2b, reuse):
  - `PracticeSessionSummary` — end-of-session results screen.
  - `ProgressBar` — progress indicator.
- **Design tokens:** teal accents, `rounded-2xl` cards, `shadow-sm`.
- vitest: `npm run type-check && npm run test` gate.

## File structure this plan creates

```
apps/website/src/
├── lib/n400/
│   ├── writing-grader.ts              + .test.ts       (Task 1: USCIS grading engine)
│   └── writing-feedback.ts                             (Task 2: annotation builder)
├── components/n400/
│   ├── speaking/
│   │   └── DictationQuiz.tsx                           (Task 3: writing practice screen)
│   ├── thi-thu/
│   │   ├── MockTestPicker.tsx                          (Task 4: 3-card picker)
│   │   └── MockTestResult.tsx                          (Task 5: results summary)
│   └── ui/
│       └── WordDiff.tsx                                (Task 6: per-word diff display)
├── app/[locale]/n400app/writing/
│   ├── layout.tsx                                      (Task 7: immersive layout)
│   └── page.tsx                                        (Task 7: landing + quiz machine)
├── app/[locale]/n400app/thi-thu/
│   ├── layout.tsx                                      (Task 8: thi-thu layout)
│   ├── page.tsx                                        (Task 8: picker or test)
│   └── civics/page.tsx                                 (Task 9: existing test, moved)
│   └── viet/page.tsx                                   (Task 9: writing mock test)
│   └── speaking/page.tsx                               (Task 10: speaking mock test)
└── app/[locale]/n400app/page.tsx                       (Task 11: update nav + add Writing Daily Goal)
```

---

### Task 1: `writing-grader.ts` — USCIS grading engine

**Files:**
- Create: `src/lib/n400/writing-grader.ts`
- Test: `src/lib/n400/writing-grader.test.ts`

Core logic: normalize, compare, edit distance, annotate.

- [ ] **Step 1: Install edit-distance package**

```bash
npm install edit-distance
```

- [ ] **Step 2: Write failing tests**

Create `src/lib/n400/writing-grader.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  normalizeForGrading,
  compareWords,
  gradeWritingSentence,
  AnnotationType,
} from './writing-grader';

describe('Writing Grader', () => {
  describe('normalizeForGrading', () => {
    it('removes punctuation and normalizes case', () => {
      const input = 'Hello, World! I\'m here.';
      expect(normalizeForGrading(input)).toBe('hello world im here');
    });

    it('collapses whitespace', () => {
      const input = 'hello   world   test';
      expect(normalizeForGrading(input)).toBe('hello world test');
    });

    it('trims edges', () => {
      const input = '  hello world  ';
      expect(normalizeForGrading(input)).toBe('hello world');
    });
  });

  describe('compareWords', () => {
    it('returns exact match', () => {
      const result = compareWords('hello', 'hello');
      expect(result).toEqual({ isCorrect: true, annotation: null });
    });

    it('allows edit distance 1 for short words', () => {
      const result = compareWords('helo', 'hello'); // 1 insertion
      expect(result.isCorrect).toBe(true);
    });

    it('allows edit distance 2 for words ≥8 chars', () => {
      const result = compareWords('intersted', 'interested'); // 2 errors
      expect(result.isCorrect).toBe(true);
    });

    it('rejects larger edit distance', () => {
      const result = compareWords('xyz', 'hello'); // > 1 for short
      expect(result.isCorrect).toBe(false);
    });

    it('detects capitalization slip', () => {
      const result = compareWords('hello', 'Hello');
      expect(result.annotation?.type).toBe('capitalization');
      expect(result.isCorrect).toBe(true); // still passes
    });

    it('detects spelling slip', () => {
      const result = compareWords('recieve', 'receive'); // off-by-one
      expect(result.annotation?.type).toBe('spelling');
      expect(result.isCorrect).toBe(true);
    });

    it('rejects abbreviations', () => {
      const result = compareWords('NYC', 'New York City');
      expect(result.isCorrect).toBe(false);
    });
  });

  describe('gradeWritingSentence', () => {
    const canonical = 'I live in New York City.';

    it('grades a perfect match', () => {
      const result = gradeWritingSentence('I live in New York City.', canonical);
      expect(result.isCorrect).toBe(true);
      expect(result.wordResults).toHaveLength(6);
    });

    it('ignores punctuation and capitalization', () => {
      const result = gradeWritingSentence('i live in new york city', canonical);
      expect(result.isCorrect).toBe(true);
    });

    it('detects missing words', () => {
      const result = gradeWritingSentence('I live in New York', canonical);
      expect(result.isCorrect).toBe(false);
    });

    it('detects extra words', () => {
      const result = gradeWritingSentence('I live in the New York City', canonical);
      expect(result.isCorrect).toBe(false);
    });

    it('allows minor spelling errors', () => {
      const result = gradeWritingSentence('I live in New Yourk City.', canonical);
      expect(result.isCorrect).toBe(true);
    });

    it('collects annotations for feedback', () => {
      const result = gradeWritingSentence('i live in new york city.', canonical);
      expect(result.annotations.length).toBeGreaterThan(0); // capitalization hints
    });
  });
});
```

- [ ] **Step 3: Run test — expect FAIL** (`npx vitest run src/lib/n400/writing-grader.test.ts`).

- [ ] **Step 4: Implement** `src/lib/n400/writing-grader.ts`:

```ts
import { levenshteinDistance } from 'edit-distance';

export type AnnotationType = 'capitalization' | 'spelling';

export interface WordAnnotation {
  wordIndex: number;
  type: AnnotationType;
  userWord: string;
  canonicalWord: string;
  hint: string;
}

export interface WordResult {
  userWord: string;
  canonicalWord: string;
  isCorrect: boolean;
  annotation: WordAnnotation | null;
}

export interface GradeResult {
  isCorrect: boolean;
  wordResults: WordResult[];
  annotations: WordAnnotation[];
  feedback: string;
}

export function normalizeForGrading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

function editDistance(a: string, b: string): number {
  return levenshteinDistance(a, b);
}

export function compareWords(
  userWord: string,
  canonicalWord: string
): { isCorrect: boolean; annotation: WordAnnotation | null } {
  // Exact match
  if (userWord === canonicalWord) {
    return { isCorrect: true, annotation: null };
  }

  // Capitalization slip detection
  if (userWord.toLowerCase() === canonicalWord.toLowerCase()) {
    return {
      isCorrect: true,
      annotation: {
        wordIndex: -1, // set later
        type: 'capitalization',
        userWord,
        canonicalWord,
        hint: `Nhớ viết hoa: ${canonicalWord}`,
      },
    };
  }

  // Abbreviation detection (different length, user word much shorter)
  if (userWord.length < canonicalWord.length * 0.6) {
    return { isCorrect: false, annotation: null };
  }

  // Edit distance tolerance
  const maxDistance = canonicalWord.length >= 8 ? 2 : 1;
  const distance = editDistance(userWord, canonicalWord);

  if (distance <= maxDistance) {
    // Minor spelling error
    return {
      isCorrect: true,
      annotation: {
        wordIndex: -1,
        type: 'spelling',
        userWord,
        canonicalWord,
        hint: `Kiểm tra chính tả: ${canonicalWord}`,
      },
    };
  }

  return { isCorrect: false, annotation: null };
}

export function gradeWritingSentence(userInput: string, canonical: string): GradeResult {
  const userNorm = normalizeForGrading(userInput);
  const cannonicalNorm = normalizeForGrading(canonical);

  const userWords = userNorm.split(' ');
  const canonicalWords = cannonicalNorm.split(' ');

  const wordResults: WordResult[] = [];
  const annotations: WordAnnotation[] = [];
  let allCorrect = true;

  // Word-by-word comparison
  for (let i = 0; i < Math.max(userWords.length, canonicalWords.length); i++) {
    const userWord = userWords[i] || '';
    const canonicalWord = canonicalWords[i] || '';

    if (!userWord || !canonicalWord) {
      // Mismatch in word count
      allCorrect = false;
      wordResults.push({
        userWord,
        canonicalWord,
        isCorrect: false,
        annotation: null,
      });
      continue;
    }

    const { isCorrect, annotation } = compareWords(userWord, canonicalWord);

    if (!isCorrect) {
      allCorrect = false;
    }

    if (annotation) {
      annotation.wordIndex = i;
      annotations.push(annotation);
    }

    wordResults.push({
      userWord,
      canonicalWord,
      isCorrect,
      annotation: annotation ? { ...annotation, wordIndex: i } : null,
    });
  }

  return {
    isCorrect: allCorrect,
    wordResults,
    annotations,
    feedback: allCorrect
      ? '✓ Đúng!'
      : '✗ Sai — hãy thử lại hoặc xem đáp án.',
  };
}
```

- [ ] **Step 5: Run test — expect PASS.**

- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/writing-grader.ts src/lib/n400/writing-grader.test.ts
git commit -m "feat(n400app): USCIS writing grading engine with edit distance + annotations

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `writing-feedback.ts` — Annotation display builder

**Files:**
- Create: `src/lib/n400/writing-feedback.ts`

Formats annotations into UI-friendly hints and yellow warning boxes.

- [ ] **Step 1: Implement** `src/lib/n400/writing-feedback.ts`:

```ts
import type { WordAnnotation } from './writing-grader';

export interface FeedbackBlock {
  type: 'guidance' | 'annotation' | 'hint';
  title?: string;
  content: string;
  severity?: 'info' | 'warning' | 'error';
}

export function buildFeedbackBlocks(annotations: WordAnnotation[]): FeedbackBlock[] {
  const blocks: FeedbackBlock[] = [
    {
      type: 'guidance',
      title: '✍️ Quy tắc viết:',
      content:
        '**viết hoa** tên người và tên địa danh (Washington, New York City). ' +
        '**Không viết tắt** — viết "New York City" chứ không "NYC", ' +
        '"United States" chứ không "U.S.".',
      severity: 'info',
    },
  ];

  for (const ann of annotations) {
    blocks.push({
      type: 'annotation',
      content: ann.hint,
      severity: 'warning',
    });
  }

  return blocks;
}

export function formatAnnotationHint(annotation: WordAnnotation): string {
  switch (annotation.type) {
    case 'capitalization':
      return `Nhớ viết hoa: ${annotation.canonicalWord}`;
    case 'spelling':
      return `Kiểm tra chính tả: ${annotation.canonicalWord}`;
    default:
      return '';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/n400/writing-feedback.ts
git commit -m "feat(n400app): Writing feedback block builder for guidance + annotations

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `WordDiff.tsx` — Per-word diff display

**Files:**
- Create: `src/components/n400/ui/WordDiff.tsx`

Renders word-by-word comparison with color coding (green = correct, red = wrong, yellow = slip).

- [ ] **Step 1: Implement** `src/components/n400/ui/WordDiff.tsx`:

```tsx
'use client';

import type { WordResult } from '@/lib/n400/writing-grader';

interface WordDiffProps {
  wordResults: WordResult[];
  showAnnotations?: boolean;
}

export function WordDiff({ wordResults, showAnnotations = true }: WordDiffProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {wordResults.map((result, idx) => {
          let bgColor = '';
          let textColor = '';

          if (!result.userWord || !result.canonicalWord) {
            bgColor = 'bg-red-100';
            textColor = 'text-red-800';
          } else if (!result.isCorrect) {
            bgColor = 'bg-red-100';
            textColor = 'text-red-800';
          } else if (result.annotation) {
            bgColor = 'bg-yellow-100';
            textColor = 'text-yellow-800';
          } else {
            bgColor = 'bg-green-100';
            textColor = 'text-green-800';
          }

          return (
            <div
              key={idx}
              className={`px-3 py-2 rounded-lg ${bgColor} ${textColor} text-sm`}
            >
              <div className="font-semibold">{result.userWord || '(missing)'}</div>
              {result.userWord !== result.canonicalWord && (
                <div className="text-xs opacity-75">
                  vs. {result.canonicalWord}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAnnotations && (
        <div className="mt-4 space-y-2">
          {/* Annotations rendered as yellow boxes above diff */}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/n400/ui/WordDiff.tsx
git commit -m "feat(n400app): Word-by-word diff component for writing feedback

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `DictationQuiz.tsx` — Writing practice screen

**Files:**
- Create: `src/components/n400/speaking/DictationQuiz.tsx`

Dictation UI: audio autoplays, no text, user types, per-word diff on feedback, retype-on-wrong.

- [ ] **Step 1: Implement** `src/components/n400/speaking/DictationQuiz.tsx`:

```tsx
'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import type { WritingSentence } from '@/lib/n400/writing-data';
import { AudioButton } from '@/components/n400/AudioButton';
import { writingAudioUrl } from '@/lib/n400/quiz-engine';
import { gradeWritingSentence } from '@/lib/n400/writing-grader';
import { buildFeedbackBlocks } from '@/lib/n400/writing-feedback';
import { WordDiff } from '@/components/n400/ui/WordDiff';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/n400/ui';
import { PracticeSessionSummary } from '@/components/n400/PracticeSessionSummary';

interface DictationQuizProps {
  sentences: WritingSentence[];
  onSessionEnd: (results: { correct: number; total: number }) => void;
}

interface QuizResult {
  sentenceId: string;
  userInput: string;
  correct: boolean;
  retryCount: number;
}

export function DictationQuiz({ sentences, onSessionEnd }: DictationQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState<QuizResult[]>([]);
  const [gradeResult, setGradeResult] = useState<ReturnType<typeof gradeWritingSentence> | null>(null);
  const [showCaption, setShowCaption] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentSentence = sentences[currentIndex];
  const isAnswered = !!gradeResult;
  const isCorrect = gradeResult?.isCorrect ?? false;

  // Auto-play audio on mount or when advancing
  useEffect(() => {
    if (audioRef.current && currentIndex < sentences.length) {
      audioRef.current.play().catch(() => {
        // User may have disabled autoplay
      });
    }
  }, [currentIndex, sentences.length]);

  const handleCheck = useCallback(() => {
    const grade = gradeWritingSentence(userInput, currentSentence.sentenceEn);
    setGradeResult(grade);

    if (!grade.isCorrect && retryCount === 0) {
      setRetryCount(1);
      setUserInput(''); // Reset for retype
    }
  }, [userInput, currentSentence.sentenceEn, retryCount]);

  const handleNext = useCallback(() => {
    if (!isAnswered) return;

    // Record result if correct or max retries reached
    if (isCorrect || retryCount >= 1) {
      setResults((prev) => [
        ...prev,
        {
          sentenceId: currentSentence.id,
          userInput,
          correct: isCorrect,
          retryCount,
        },
      ]);

      if (currentIndex + 1 >= sentences.length) {
        const correctCount = results.filter((r) => r.correct).length;
        onSessionEnd({ correct: correctCount, total: sentences.length });
      } else {
        setCurrentIndex((prev) => prev + 1);
        setUserInput('');
        setGradeResult(null);
        setShowCaption(false);
        setRetryCount(0);
      }
    }
  }, [isAnswered, isCorrect, retryCount, currentIndex, sentences.length, results, currentSentence.id, userInput, onSessionEnd]);

  const handleGiveUp = useCallback(() => {
    setShowCaption(true);
  }, []);

  if (currentIndex >= sentences.length) {
    return (
      <PracticeSessionSummary
        correct={results.filter((r) => r.correct).length}
        total={sentences.length}
      />
    );
  }

  const feedbackBlocks = gradeResult ? buildFeedbackBlocks(gradeResult.annotations) : [];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-teal-50 to-white p-6">
      <ProgressBar current={currentIndex + 1} total={sentences.length} />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm p-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Câu {currentIndex + 1}/{sentences.length}
          </h3>

          {/* Audio Section */}
          <div className="mb-6 p-4 bg-teal-50 rounded-lg">
            <audio
              ref={audioRef}
              src={writingAudioUrl(currentSentence.num)}
              className="hidden"
            />
            <div className="flex gap-4">
              <AudioButton
                src={writingAudioUrl(currentSentence.num)}
                label="Nghe lại"
              />
              <AudioButton
                src={writingAudioUrl(currentSentence.num)}
                label="🐢 Đọc chậm"
                rate={0.7}
                variant="slow"
              />
            </div>
          </div>

          {/* Input Section */}
          <div className="mb-6">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Gõ câu bạn nghe..."
              className="w-full px-4 py-3 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              disabled={isAnswered && !showCaption}
            />
          </div>

          {/* Caption Section */}
          {showCaption && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-900 font-semibold mb-2">Câu đúng:</p>
              <p className="text-blue-800">{currentSentence.sentenceEn}</p>
            </div>
          )}

          {/* Feedback Section */}
          {isAnswered && (
            <div className="mb-6">
              <div className={`p-4 rounded-lg mb-4 ${
                isCorrect
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="font-semibold mb-2">
                  {isCorrect ? '✓ Đúng!' : '✗ Sai — vui lòng thử lại.'}
                </p>
              </div>

              <WordDiff wordResults={gradeResult!.wordResults} />

              {/* Guidance box */}
              {feedbackBlocks.map((block, idx) => (
                <div key={idx} className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  {block.title && (
                    <p className="font-semibold text-yellow-900 mb-2">{block.title}</p>
                  )}
                  <p className="text-yellow-800 text-sm">{block.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!isAnswered ? (
              <>
                <Button onClick={handleCheck} className="flex-1">
                  Kiểm tra
                </Button>
                <Button
                  onClick={handleGiveUp}
                  variant="outline"
                  className="flex-1"
                >
                  Không nghe được / Không thuộc
                </Button>
              </>
            ) : (
              <>
                {!isCorrect && retryCount === 0 && (
                  <Button onClick={() => setUserInput('')} variant="outline" className="flex-1">
                    Thử lại
                  </Button>
                )}
                <Button onClick={handleNext} className="flex-1">
                  {currentIndex + 1 === sentences.length ? 'Hoàn thành' : 'Tiếp theo'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/n400/speaking/DictationQuiz.tsx
git commit -m "feat(n400app): Dictation practice screen with USCIS grading

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Writing section route

**Files:**
- Create: `src/app/[locale]/n400app/writing/layout.tsx`
- Create: `src/app/[locale]/n400app/writing/page.tsx`

Immersive layout + landing with session picker + dictation quiz.

- [ ] **Step 1: Create layout** (copy from what-mean or yes-no, identical).

- [ ] **Step 2: Create page** with session picker and DictationQuiz integration.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/n400app/writing/
git commit -m "feat(n400app): Writing section with dictation practice

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Thi thử split — picker + three tests

**Files:**
- Move: `thi-thu/page.tsx` → `thi-thu/civics/page.tsx`
- Create: `src/app/[locale]/n400app/thi-thu/page.tsx` (picker with 3 cards)
- Create: `src/app/[locale]/n400app/thi-thu/viet/page.tsx` (writing mock test)
- Create: `src/app/[locale]/n400app/thi-thu/speaking/page.tsx` (speaking mock test)

Picker shows 3 cards (Thi thử Civics, Thi thử Viết, Thi thử Speaking). Each card has icon, name, description.

- [ ] **Step 1: Create picker page** at `thi-thu/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useN400UserState } from '@/lib/n400/user-state';

export default function MockTestPickerPage() {
  const locale = (useParams()?.locale as string) || 'en';
  const { state } = useN400UserState();

  if (!state.hydrated) return <div>Loading…</div>;

  return (
    <div className="flex flex-col h-full p-6 bg-gradient-to-b from-teal-50 to-white">
      <h1 className="text-3xl font-bold text-teal-900 mb-8">Chọn bài thi thử</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Civics */}
        <Link
          href={`/${locale}/n400app/thi-thu/civics`}
          className="p-6 bg-white rounded-2xl shadow-sm hover:shadow-md border-2 border-teal-200 hover:border-teal-400 transition-all"
        >
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2 text-teal-900">
            Thi thử Civics
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            128 câu hỏi — 20 câu hỏi ngẫu nhiên, vượt qua 12 câu là đạt
          </p>
        </Link>

        {/* Writing */}
        <Link
          href={`/${locale}/n400app/thi-thu/viet`}
          className="p-6 bg-white rounded-2xl shadow-sm hover:shadow-md border-2 border-teal-200 hover:border-teal-400 transition-all"
        >
          <div className="text-4xl mb-4">✍️</div>
          <h3 className="text-xl font-semibold mb-2 text-teal-900">
            Thi thử Viết
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            3 câu viết — viết đúng ít nhất 1 câu là đạt
          </p>
        </Link>

        {/* Speaking */}
        <Link
          href={`/${locale}/n400app/thi-thu/speaking`}
          className="p-6 bg-white rounded-2xl shadow-sm hover:shadow-md border-2 border-teal-200 hover:border-teal-400 transition-all"
        >
          <div className="text-4xl mb-4">🎤</div>
          <h3 className="text-xl font-semibold mb-2 text-teal-900">
            Thi thử Speaking
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            10 câu (5 What Mean + 5 Yes No) — trả lời đúng ít nhất 8 câu là đạt
          </p>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Writing mock test** at `thi-thu/viet/page.tsx`:

Renders DictationQuiz with 3 sentences selected deterministically (first 3). On session end, shows result (✓ hoặc ✗, pass ≥1/3).

- [ ] **Step 3: Create Speaking mock test** at `thi-thu/speaking/page.tsx`:

Renders a combined 10-item quiz: 5 What Mean MC questions + 5 Yes No Yes/No questions, shuffled. Combines SectionMCQuiz + SectionYesNoQuiz results. Pass ≥8/10.

- [ ] **Step 4: Move existing civics test**

The existing `thi-thu/page.tsx` becomes `thi-thu/civics/page.tsx` (no logic changes, just moved).

- [ ] **Step 5: Commit all Thi thử changes**

```bash
git add src/app/[locale]/n400app/thi-thu/
git commit -m "feat(n400app): Thi thử split into 3 mock tests: Civics / Viết / Speaking

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Update nav + add Writing Daily Goal

**Files:**
- Modify: `src/app/[locale]/n400app/page.tsx`
- Modify: `src/components/n400/Sidebar.tsx`

Add Writing section link to sidebar and "Viết hôm nay" Daily Goal card to Tổng quan.

- [ ] **Step 1: Add Writing link** to Sidebar (top-level, not nested).

- [ ] **Step 2: Add Writing Daily Goal card** to Tổng quan (show writing daily progress if applicable).

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/n400app/page.tsx src/components/n400/Sidebar.tsx
git commit -m "feat(n400app): Add Writing section nav and Daily Goal card

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Verification gate

- [ ] Run type-check: `npm run type-check`
- [ ] Run tests: `npm run test` (should include writing-grader tests)
- [ ] Run build: `npm run build`
- [ ] Manual smoke test:
  - Navigate to `/n400app/writing` → landing with session picker
  - Start "Luyện nhanh" (3 sentences) → dictation UI should show (audio, input field, check button)
  - Audio autoplays (may be silenced depending on browser autoplay policy)
  - Type a sentence and click "Kiểm tra"
  - Verify grading: correct answer shows green, wrong shows red, minor spelling slips show yellow hints
  - Click "Không nghe được" → caption appears, user can retype
  - Verify per-word diff displays correctly
  - Complete session → summary screen
  - Navigate to `/n400app/thi-thu` → 3 mock test picker cards
  - Click "Thi thử Viết" → dictation quiz with 3 sentences, result screen shows pass/fail
  - Click "Thi thử Speaking" → 10-item quiz (5 MC + 5 Yes/No), result screen shows score
  - Verify Tổng quan shows Writing card in Daily Goals
  - Verify Sidebar has Writing link

- [ ] **Final commit (squash or summary):**

```bash
git log --oneline -10  # verify commit messages
```

---

## Summary

Plan 3 ships:
- **Writing section** with dictation practice (audio → type sentence → USCIS grading with annotations)
- **USCIS grading engine** (punctuation/capitalization ignored, minor spelling passes, no abbreviations)
- **Thi thử split** into 3 separate mock tests (Civics, Viết 3 sentences ≥1/3, Speaking 10 items ≥8/10)
- **Daily Goals** updated with Writing entry card
- Full **Thi thử picker** with 3 cards

All UI matches existing theme. Ready for Plan 4 (Gamification: badges + stats).
