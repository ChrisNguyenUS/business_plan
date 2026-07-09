# N400 IA Redesign — Plan 3: Phỏng vấn đầy đủ (Full Interview mock)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4th mock test, **Phỏng vấn đầy đủ** at `/mock-test/full`, that chains the three existing test formats in one sitting — Civics (20 câu trắc nghiệm, đạt ≥12) → Speaking (10 câu trắc nghiệm: 5 What Mean + 5 Yes/No, đạt ≥8) → Writing (3 câu dictation, đạt ≥1) — with transition screens and a per-part + overall summary. **No speech-to-text anywhere.**

**Architecture:** A pure client orchestration page. Question building lives in `src/lib/n400/full-interview.ts` (unit-tested); the page runs a phase state machine and renders the EXISTING quiz screens: `SectionMCQuiz` for the Civics and Speaking parts (it gains additive `skipSummary`/`onComplete` props, mirroring `DictationQuiz`'s existing `skipSummary`), and `DictationQuiz` for Writing. Recording reuses existing user-state methods: `recordMockResult` (civics, client path) and `recordSectionMockResult('speaking'|'writing', …)` — same tables the standalone mocks feed, so badges and stats keep working.

**Tech Stack:** Next.js (App Router) at `apps/website/`, React client components, Tailwind, lucide-react, vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-09-n400app-ia-redesign-design.md` (§6). **Independent of Plan 2**; only needs Plan 1 merged (nav shell — not strictly required, but keeps mock-test picker copy consistent). Can run in parallel with Plan 2.

**Working directory for all commands:** `apps/website/`.

---

## Context an engineer needs

- **Existing mock split** (`src/app/[locale]/n400app/mock-test/page.tsx`): a `TESTS: TestCard[]` array (slugs `'civics' | 'viet' | 'speaking'`) rendered as cards in `grid ... lg:grid-cols-3`.
- **Quiz engine** (`src/lib/n400/quiz-engine.ts`): `selectMockTestQuestions(seed)` → 20 random `N400Question`s; `buildOptions(question, stateCode, seed, districtNumber)` → `QuizOption[]` (`{ id: 'A'|'B'|'C'|'D', en, vi, isCorrect }` — same shape as `SectionMCQuiz`'s `MCOption`); `correctAnswersFor(question, stateCode, districtNumber)`; `shuffle(arr, seed)`; audio helpers `questionAudioUrl(id)`, `whatMeanQuestionAudioUrl(num)`, `whatMeanAnswerAudioUrl(num)`, `yesNoAudioUrl(num)`.
- **`SectionMCQuiz`** (`src/components/n400/speaking/SectionMCQuiz.tsx`): props `{ questions: MCQuestion[], onAnswer(itemId, wasCorrect), onExit, onRestart, title }`; `MCQuestion = { itemId, badge, headerEn, headerVi, questionAudioSrc, answerAudioSrc, options: MCOption[], accepted: {en,vi}[] }`. When `index >= questions.length` it renders `PracticeSessionSummary`. It tracks `correctCount`/`wrongCount` internally.
- **`DictationQuiz`** (`src/components/n400/speaking/DictationQuiz.tsx`): props `{ questions: WritingSentence[], onSessionEnd({correct,total}), skipSummary? }` — with `skipSummary` it fires `onSessionEnd` in an effect and renders nothing (see `mock-test/viet/page.tsx` for the exact usage pattern, including `key={seed}` remounts).
- **What Mean MC options**: `buildWhatMeanOptions(q, seed)` (`src/lib/n400/whatmean-options.ts`) → options with `{ id, text, isCorrect }`; the what-mean page maps them to `{ id, en: o.text, vi: '', isCorrect }`.
- **Data**: `WHATMEAN_QUESTIONS` (`{ id:'wm-n', num, termEn, termVi, definitionEn, definitionVi, questionVi }`), `YESNO_QUESTIONS` (`{ id:'yn-n', num, questionEn, questionVi, answer:'yes'|'no' }`; Yes/No spoken answers render as `Yes, officer` / `No, officer`), `WRITING_SENTENCES`.
- **Recording** (`src/lib/n400/user-state.tsx`): `recordMockResult(result: MockResult)` where `MockResult = { id, startedAt, completedAt, score, total, passed, questionResults: {questionId, wasCorrect}[] }` (client-side insert, mode `mock_test`); `recordSectionMockResult('writing'|'speaking', passed, score, total)`. State also exposes `state.settings.stateCode`, `state.address.districtNumber`.
- **Immersive layout pattern**: `mock-test/viet/layout.tsx` is `<div className="flex flex-col h-full overflow-hidden">{children}</div>` — copy this for `/mock-test/full`.
- **Pass rules** (match the standalone tests): Civics 12/20 · Speaking 8/10 · Writing 1/3. Overall pass = all three parts pass.
- Contract tests: `src/components/n400/navigation-ia.test.ts` (readFileSync pattern). Gate: `npm run type-check && npm run test`.

## File structure this plan creates

```
apps/website/src/
├── lib/n400/
│   ├── full-interview.ts                    (Task 2: phase builders + pass rules)
│   └── full-interview.test.ts               (Task 2)
├── components/n400/speaking/
│   └── SectionMCQuiz.tsx                    (Task 1: additive skipSummary/onComplete)
└── app/[locale]/n400app/mock-test/
    ├── page.tsx                             (Task 4: add 4th featured card)
    └── full/
        ├── layout.tsx                       (Task 3: immersive shell)
        └── page.tsx                         (Task 3: phase machine + summary)
```

---

### Task 1: `SectionMCQuiz` — additive `skipSummary` / `onComplete`

**Files:**
- Modify: `src/components/n400/speaking/SectionMCQuiz.tsx`
- Test: `src/components/n400/navigation-ia.test.ts`

- [ ] **Step 1: Failing contract test** (append inside the existing describe block):

```ts
  test('SectionMCQuiz supports orchestrated (summary-less) runs', () => {
    const quiz = source('src/components/n400/speaking/SectionMCQuiz.tsx');

    expect(quiz).toContain('skipSummary');
    expect(quiz).toContain('onComplete');
  });
```

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run src/components/n400/navigation-ia.test.ts`).

- [ ] **Step 3: Implement.** Mirror `DictationQuiz`'s existing pattern exactly:

a) Add `useEffect` to the react import (`import { useEffect, useMemo, useState } from 'react';`).

b) Extend the props (defaults keep every existing caller unchanged):

```tsx
export function SectionMCQuiz({
  questions,
  onAnswer,
  onExit,
  onRestart,
  title,
  skipSummary = false,
  onComplete,
}: {
  questions: MCQuestion[];
  onAnswer: (itemId: string, wasCorrect: boolean) => void;
  onExit: () => void;
  onRestart: () => void;
  title: string;
  /** When true, never render the end-of-session summary; fire onComplete instead. */
  skipSummary?: boolean;
  onComplete?: (result: { correct: number; wrong: number }) => void;
}) {
```

c) After the `done` / `q` derivations, add:

```tsx
  useEffect(() => {
    if (done && skipSummary) {
      onComplete?.({ correct: correctCount, wrong: wrongCount });
    }
    // Only fire when a session actually finishes — counts are frozen then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, skipSummary]);
```

d) At the top of the `if (done || !q)` branch, before the summary render, add:

```tsx
    if (skipSummary) return null;
```

- [ ] **Step 4: Run tests + type-check — expect PASS** (existing what-mean/yes-no callers compile untouched).
- [ ] **Step 5: Commit** — `git add src/components/n400/speaking/SectionMCQuiz.tsx src/components/n400/navigation-ia.test.ts && git commit -m "feat(n400app): SectionMCQuiz skipSummary/onComplete for orchestrated runs"`

---

### Task 2: `full-interview.ts` — phase builders + pass rules

**Files:**
- Create: `src/lib/n400/full-interview.ts`
- Test: `src/lib/n400/full-interview.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  FULL_CIVICS_COUNT,
  FULL_CIVICS_PASS,
  FULL_SPEAKING_COUNT,
  FULL_SPEAKING_PASS,
  FULL_WRITING_COUNT,
  FULL_WRITING_PASS,
  buildCivicsPhase,
  buildSpeakingPhase,
  buildWritingPhase,
} from './full-interview';

describe('full interview builders', () => {
  it('pass rules mirror the standalone mocks', () => {
    expect([FULL_CIVICS_COUNT, FULL_CIVICS_PASS]).toEqual([20, 12]);
    expect([FULL_SPEAKING_COUNT, FULL_SPEAKING_PASS]).toEqual([10, 8]);
    expect([FULL_WRITING_COUNT, FULL_WRITING_PASS]).toEqual([3, 1]);
  });

  it('civics phase: 20 unique questions, 4 options each, exactly one correct, civ- item ids', () => {
    const qs = buildCivicsPhase('seed-1', 'TX', null);
    expect(qs).toHaveLength(20);
    expect(new Set(qs.map((q) => q.itemId)).size).toBe(20);
    for (const q of qs) {
      expect(q.itemId).toMatch(/^civ-\d+$/);
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
    }
  });

  it('civics phase is deterministic per seed', () => {
    const a = buildCivicsPhase('seed-1', 'TX', null).map((q) => q.itemId);
    const b = buildCivicsPhase('seed-1', 'TX', null).map((q) => q.itemId);
    expect(a).toEqual(b);
  });

  it('speaking phase: 5 what-mean then 5 yes-no, yes/no graded correctly', () => {
    const qs = buildSpeakingPhase('seed-1');
    expect(qs).toHaveLength(10);
    expect(qs.slice(0, 5).every((q) => q.itemId.startsWith('wm-'))).toBe(true);
    const yn = qs.slice(5);
    expect(yn.every((q) => q.itemId.startsWith('yn-'))).toBe(true);
    for (const q of yn) {
      expect(q.options).toHaveLength(2);
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
      const correct = q.options.find((o) => o.isCorrect)!;
      expect(['Yes, officer', 'No, officer']).toContain(correct.en);
    }
  });

  it('writing phase: 3 sentences, deterministic per seed', () => {
    const a = buildWritingPhase('seed-1');
    expect(a).toHaveLength(3);
    expect(buildWritingPhase('seed-1').map((s) => s.id)).toEqual(a.map((s) => s.id));
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run src/lib/n400/full-interview.test.ts`).

- [ ] **Step 3: Implement `src/lib/n400/full-interview.ts`**

```ts
// Question builders + pass rules for Phỏng vấn đầy đủ (/mock-test/full):
// the three standalone mock formats chained into one sitting. Speaking stays
// multiple-choice — no speech-to-text. Type-only import from SectionMCQuiz
// keeps the runtime dependency direction lib → data.

import { WHATMEAN_QUESTIONS } from './whatmean-data';
import { YESNO_QUESTIONS } from './yesno-data';
import { WRITING_SENTENCES, type WritingSentence } from './writing-data';
import { buildWhatMeanOptions } from './whatmean-options';
import {
  buildOptions,
  correctAnswersFor,
  selectMockTestQuestions,
  shuffle,
  questionAudioUrl,
  whatMeanQuestionAudioUrl,
  whatMeanAnswerAudioUrl,
  yesNoAudioUrl,
} from './quiz-engine';
import type { StateCode } from './state-data';
import type { MCQuestion } from '@/components/n400/speaking/SectionMCQuiz';

export const FULL_CIVICS_COUNT = 20;
export const FULL_CIVICS_PASS = 12; // 12/20 USCIS rule
export const FULL_SPEAKING_COUNT = 10; // 5 What Mean + 5 Yes/No
export const FULL_SPEAKING_PASS = 8;
export const FULL_WRITING_COUNT = 3;
export const FULL_WRITING_PASS = 1; // write 1 of 3 correctly

export function buildCivicsPhase(
  seed: string,
  stateCode: StateCode,
  districtNumber: number | null,
): MCQuestion[] {
  return selectMockTestQuestions(seed).map((q, i) => {
    const located = correctAnswersFor(q, stateCode, districtNumber);
    const accepted =
      located.length > 0 ? located : q.answersEn.map((en, j) => ({ en, vi: q.answersVi[j] ?? en }));
    return {
      itemId: `civ-${q.id}`,
      badge: `Civics · Câu hỏi #${q.id}`,
      headerEn: q.questionEn,
      headerVi: q.questionVi,
      questionAudioSrc: questionAudioUrl(q.id),
      answerAudioSrc: null,
      options: buildOptions(q, stateCode, `full-${seed}-${i}`, districtNumber),
      accepted,
    };
  });
}

export function buildSpeakingPhase(seed: string): MCQuestion[] {
  const whatMean = shuffle([...WHATMEAN_QUESTIONS], `full-sp-wm-${seed}`)
    .slice(0, 5)
    .map((q, i): MCQuestion => ({
      itemId: q.id,
      badge: `Speaking · What Mean #${q.num}`,
      headerEn: q.termEn,
      headerVi: q.questionVi,
      questionAudioSrc: whatMeanQuestionAudioUrl(q.num),
      answerAudioSrc: whatMeanAnswerAudioUrl(q.num),
      options: buildWhatMeanOptions(q, `full-${seed}-${i}`).map((o) => ({
        id: o.id,
        en: o.text,
        vi: '',
        isCorrect: o.isCorrect,
      })),
      accepted: [{ en: q.definitionEn, vi: q.definitionVi }],
    }));

  const yesNo = shuffle([...YESNO_QUESTIONS], `full-sp-yn-${seed}`)
    .slice(0, 5)
    .map((q): MCQuestion => {
      const audio = yesNoAudioUrl(q.num);
      return {
        itemId: q.id,
        badge: `Speaking · Yes/No #${q.num}`,
        headerEn: q.questionEn,
        headerVi: q.questionVi,
        questionAudioSrc: audio,
        answerAudioSrc: audio,
        options: [
          { id: 'A', en: 'Yes, officer', vi: 'Có', isCorrect: q.answer === 'yes' },
          { id: 'B', en: 'No, officer', vi: 'Không', isCorrect: q.answer === 'no' },
        ],
        accepted: [{ en: q.answer === 'yes' ? 'Yes, officer' : 'No, officer', vi: q.questionVi }],
      };
    });

  return [...whatMean, ...yesNo];
}

export function buildWritingPhase(seed: string): WritingSentence[] {
  return shuffle([...WRITING_SENTENCES], `full-wr-${seed}`).slice(0, FULL_WRITING_COUNT);
}
```

(If `buildWhatMeanOptions`'s option `id` type is not the `'A'|'B'|'C'|'D'` union, cast per the what-mean page's existing mapping. If TypeScript complains about the yes/no option ids, annotate the array `as MCQuestion['options']`.)

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git add src/lib/n400/full-interview.ts src/lib/n400/full-interview.test.ts && git commit -m "feat(n400app): full-interview phase builders + pass rules"`

---

### Task 3: `/mock-test/full` — orchestration page + summary

**Files:**
- Create: `src/app/[locale]/n400app/mock-test/full/layout.tsx`
- Create: `src/app/[locale]/n400app/mock-test/full/page.tsx`
- Test: `src/components/n400/navigation-ia.test.ts`

- [ ] **Step 1: Failing contract test** (append):

```ts
  test('full interview chains the three parts and records results', () => {
    const page = source('src/app/[locale]/n400app/mock-test/full/page.tsx');

    expect(page).toContain('buildCivicsPhase');
    expect(page).toContain('buildSpeakingPhase');
    expect(page).toContain('buildWritingPhase');
    expect(page).toContain('recordMockResult');
    expect(page).toContain("recordSectionMockResult('speaking'");
    expect(page).toContain("recordSectionMockResult('writing'");
  });
```

- [ ] **Step 2: Create `layout.tsx`** (copy of the viet pattern):

```tsx
import type { ReactNode } from 'react';

/**
 * Immersive layout for Phỏng vấn đầy đủ: content never scrolls the page;
 * each embedded quiz screen manages its own scroll area.
 */
export default function FullInterviewLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col h-full overflow-hidden">{children}</div>;
}
```

- [ ] **Step 3: Create `page.tsx`**

```tsx
'use client';

// Phỏng vấn đầy đủ — chains the three standalone mock formats in one sitting:
// Civics (20 câu, đạt >=12) → Speaking (10 câu MC, đạt >=8) → Writing (3 câu
// dictation, đạt >=1). Reuses SectionMCQuiz + DictationQuiz; each part records
// through the same user-state paths as its standalone mock.

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Trophy, RotateCcw, ArrowLeft, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { useN400UserState } from '@/lib/n400/user-state';
import {
  FULL_CIVICS_COUNT,
  FULL_CIVICS_PASS,
  FULL_SPEAKING_COUNT,
  FULL_SPEAKING_PASS,
  FULL_WRITING_COUNT,
  FULL_WRITING_PASS,
  buildCivicsPhase,
  buildSpeakingPhase,
  buildWritingPhase,
} from '@/lib/n400/full-interview';
import { SectionMCQuiz } from '@/components/n400/speaking/SectionMCQuiz';
import { DictationQuiz } from '@/components/n400/speaking/DictationQuiz';

interface PartResult {
  correct: number;
  total: number;
  passed: boolean;
}

type Phase =
  | { kind: 'intro' }
  | { kind: 'civics' }
  | { kind: 'interlude'; next: 'speaking' | 'writing' }
  | { kind: 'speaking' }
  | { kind: 'writing' }
  | { kind: 'summary' };

const PARTS_COPY = [
  { label: 'Phần 1 · Civics', desc: `${FULL_CIVICS_COUNT} câu trắc nghiệm — đúng ≥ ${FULL_CIVICS_PASS} là đạt` },
  { label: 'Phần 2 · Speaking', desc: `${FULL_SPEAKING_COUNT} câu trắc nghiệm (What Mean + Yes/No) — đúng ≥ ${FULL_SPEAKING_PASS} là đạt` },
  { label: 'Phần 3 · Viết', desc: `${FULL_WRITING_COUNT} câu nghe-gõ lại — đúng ≥ ${FULL_WRITING_PASS} là đạt` },
];

export default function FullInterviewPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;
  const { state, hydrated, recordMockResult, recordSectionMockResult } = useN400UserState();

  const [seed, setSeed] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [civics, setCivics] = useState<PartResult | null>(null);
  const [speaking, setSpeaking] = useState<PartResult | null>(null);
  const [writing, setWriting] = useState<PartResult | null>(null);
  const civicsAnswers = useRef<{ questionId: number; wasCorrect: boolean }[]>([]);
  const startedAt = useRef<string>('');

  const stateCode = state.settings.stateCode;
  const districtNumber = state.address.districtNumber;

  const civicsQuestions = useMemo(
    () => buildCivicsPhase(`full-${seed}`, stateCode, districtNumber),
    [seed, stateCode, districtNumber],
  );
  const speakingQuestions = useMemo(() => buildSpeakingPhase(`full-${seed}`), [seed]);
  const writingQuestions = useMemo(() => buildWritingPhase(`full-${seed}`), [seed]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const begin = () => {
    civicsAnswers.current = [];
    startedAt.current = new Date().toISOString();
    setCivics(null);
    setSpeaking(null);
    setWriting(null);
    setPhase({ kind: 'civics' });
  };

  const retake = () => {
    setSeed((s) => s + 1);
    setPhase({ kind: 'intro' });
  };

  if (phase.kind === 'civics') {
    return (
      <SectionMCQuiz
        key={`civ-${seed}`}
        questions={civicsQuestions}
        title="Phỏng vấn đầy đủ — Civics"
        skipSummary
        onAnswer={(itemId, ok) =>
          civicsAnswers.current.push({ questionId: Number(itemId.slice(4)), wasCorrect: ok })
        }
        onComplete={({ correct }) => {
          const passed = correct >= FULL_CIVICS_PASS;
          setCivics({ correct, total: FULL_CIVICS_COUNT, passed });
          void recordMockResult({
            id: crypto.randomUUID(),
            startedAt: startedAt.current,
            completedAt: new Date().toISOString(),
            score: correct,
            total: FULL_CIVICS_COUNT,
            passed,
            questionResults: civicsAnswers.current,
          });
          setPhase({ kind: 'interlude', next: 'speaking' });
        }}
        onExit={() => setPhase({ kind: 'intro' })}
        onRestart={begin}
      />
    );
  }

  if (phase.kind === 'speaking') {
    return (
      <SectionMCQuiz
        key={`sp-${seed}`}
        questions={speakingQuestions}
        title="Phỏng vấn đầy đủ — Speaking"
        skipSummary
        onAnswer={() => {}}
        onComplete={({ correct }) => {
          const passed = correct >= FULL_SPEAKING_PASS;
          setSpeaking({ correct, total: FULL_SPEAKING_COUNT, passed });
          void recordSectionMockResult('speaking', passed, correct, FULL_SPEAKING_COUNT);
          setPhase({ kind: 'interlude', next: 'writing' });
        }}
        onExit={() => setPhase({ kind: 'intro' })}
        onRestart={begin}
      />
    );
  }

  if (phase.kind === 'writing') {
    return (
      <DictationQuiz
        key={`wr-${seed}`}
        questions={writingQuestions}
        skipSummary
        onSessionEnd={({ correct, total }) => {
          const passed = correct >= FULL_WRITING_PASS;
          setWriting({ correct, total, passed });
          void recordSectionMockResult('writing', passed, correct, total);
          setPhase({ kind: 'summary' });
        }}
      />
    );
  }

  if (phase.kind === 'interlude') {
    const isSpeaking = phase.next === 'speaking';
    const donePart = isSpeaking ? civics : speaking;
    return (
      <CenterCard>
        <div className="text-xs font-bold uppercase tracking-wide text-teal-600">
          {isSpeaking ? 'Phần 1 hoàn thành' : 'Phần 2 hoàn thành'}
        </div>
        {donePart ? (
          <div className="mt-2 text-3xl font-extrabold text-gray-900">
            {donePart.correct}
            <span className="text-lg text-gray-500">/{donePart.total}</span>{' '}
            <span className={donePart.passed ? 'text-teal-600' : 'text-orange-500'}>
              {donePart.passed ? 'Đạt' : 'Chưa đạt'}
            </span>
          </div>
        ) : null}
        <h2 className="mt-4 text-xl font-extrabold text-gray-800">
          {isSpeaking ? PARTS_COPY[1].label : PARTS_COPY[2].label}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{isSpeaking ? PARTS_COPY[1].desc : PARTS_COPY[2].desc}</p>
        <button
          type="button"
          onClick={() => setPhase({ kind: phase.next })}
          className="group mx-auto mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-teal-700"
        >
          Bắt đầu phần tiếp theo
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </CenterCard>
    );
  }

  if (phase.kind === 'summary') {
    const parts: { label: string; result: PartResult | null }[] = [
      { label: 'Civics', result: civics },
      { label: 'Speaking', result: speaking },
      { label: 'Viết', result: writing },
    ];
    const overall = parts.every((p) => p.result?.passed);
    return (
      <CenterCard tone={overall ? 'pass' : 'fail'}>
        <div className="mb-4 flex flex-col items-center gap-3">
          <Trophy className={overall ? 'text-teal-600' : 'text-orange-500'} size={40} />
          <h2 className="text-2xl font-extrabold text-gray-800">
            {overall ? 'Chúc mừng! Bạn đã vượt qua buổi phỏng vấn!' : 'Chưa đạt — luyện thêm rồi thử lại nhé!'}
          </h2>
        </div>
        <div className="space-y-2 text-left">
          {parts.map(({ label, result }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3"
            >
              <span className="font-semibold text-gray-700">{label}</span>
              <span className="flex items-center gap-2 text-sm font-bold">
                {result ? `${result.correct}/${result.total}` : '—'}
                {result?.passed ? (
                  <CheckCircle size={18} className="text-teal-600" />
                ) : (
                  <XCircle size={18} className="text-orange-500" />
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={retake}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-teal-700"
          >
            <RotateCcw size={16} /> Thi lại
          </button>
          <Link
            href={`${base}/mock-test`}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} /> Chọn bài khác
          </Link>
        </div>
      </CenterCard>
    );
  }

  // intro
  return (
    <CenterCard>
      <div className="text-4xl" aria-hidden>
        🎤
      </div>
      <h1 className="mt-3 text-2xl font-extrabold text-gray-900">Phỏng vấn đầy đủ</h1>
      <p className="mt-1 text-sm text-gray-600">
        Mô phỏng buổi phỏng vấn N-400: ba phần thi liên tục, không dừng giữa chừng. Đạt cả 3 phần là đậu.
      </p>
      <div className="mt-5 space-y-2 text-left">
        {PARTS_COPY.map((p) => (
          <div key={p.label} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
            <div className="text-sm font-bold text-gray-800">{p.label}</div>
            <div className="text-sm text-gray-500">{p.desc}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={begin}
        className="group mx-auto mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-8 py-3 font-semibold text-white shadow-md hover:bg-teal-700"
      >
        Bắt đầu thi
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </CenterCard>
  );
}

function CenterCard({ children, tone }: { children: React.ReactNode; tone?: 'pass' | 'fail' }) {
  const toneClass =
    tone === 'pass'
      ? 'border-teal-200 bg-teal-50'
      : tone === 'fail'
        ? 'border-orange-200 bg-orange-50'
        : 'border-slate-100 bg-white';
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center overflow-y-auto animate-in fade-in duration-300">
      <div className={`w-full max-w-lg rounded-[24px] border p-6 text-center shadow-sm sm:p-8 ${toneClass}`}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run contract test + type-check — expect PASS.**
- [ ] **Step 5: Commit** — `git add "src/app/[locale]/n400app/mock-test/full" src/components/n400/navigation-ia.test.ts && git commit -m "feat(n400app): Phỏng vấn đầy đủ — chained 3-part mock with summary"`

---

### Task 4: Mock-test picker — featured 4th card

**Files:**
- Modify: `src/app/[locale]/n400app/mock-test/page.tsx`
- Test: `src/components/n400/navigation-ia.test.ts`

- [ ] **Step 1: Failing contract test** (append):

```ts
  test('mock test picker offers the full interview', () => {
    const page = source('src/app/[locale]/n400app/mock-test/page.tsx');

    expect(page).toContain("'full'");
    expect(page).toContain('Phỏng vấn đầy đủ');
  });
```

- [ ] **Step 2: Edit the picker.**

a) Widen the slug union and add the entry FIRST in `TESTS` (featured):

```ts
interface TestCard {
  slug: 'full' | 'civics' | 'viet' | 'speaking';
  emoji: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  accent: string;
  featured?: boolean;
}

const TESTS: TestCard[] = [
  {
    slug: 'full',
    emoji: '🎤',
    icon: Award,
    title: 'Phỏng vấn đầy đủ',
    desc: 'Cả 3 phần liên tục: Civics (20 câu) → Speaking (10 câu) → Viết (3 câu) — giống buổi phỏng vấn thật.',
    accent: 'bg-teal-50 text-teal-600',
    featured: true,
  },
  // ...three existing cards unchanged...
];
```

Add `Award` to the lucide import.

b) Grid: change `lg:grid-cols-3` → `sm:grid-cols-2 lg:grid-cols-4` (drop the duplicate `grid-cols-1` breakpoint spec if present; keep `grid grid-cols-1`).

c) In the card render, add a featured ring + badge — on the `Link` className, append conditionally:

```tsx
className={`group flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
  t.featured ? 'border-teal-300 ring-2 ring-teal-100' : 'border-slate-100 hover:border-teal-200'
}`}
```

and inside the card, right above the icon tile:

```tsx
{t.featured ? (
  <span className="mb-3 inline-flex w-max rounded-full bg-teal-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
    Đề xuất
  </span>
) : null}
```

- [ ] **Step 3: Run tests + type-check — expect PASS.**
- [ ] **Step 4: Commit** — `git add "src/app/[locale]/n400app/mock-test/page.tsx" src/components/n400/navigation-ia.test.ts && git commit -m "feat(n400app): mock-test picker gains featured Phỏng vấn đầy đủ card"`

---

### Task 5: Final verification + roadmap

- [ ] **Step 1: Full gate** — `npm run type-check && npm run test`. Expected: all pass.
- [ ] **Step 2: Manual smoke** — run the full interview end to end (desktop + narrow viewport): intro → 20 civics → interlude with part score → 10 speaking (5 What Mean MC, 5 Yes/No two-option) → interlude → 3 dictation sentences → summary with 3 part rows + overall verdict; "Thi lại" produces a different question set; results appear in Tiến độ (mock count increments).
- [ ] **Step 3: Update `docs/ROADMAP.md`** — in the Website Phase 3B N400 entry, extend the description's mock-test sentence to read "…a 4-way Thi thử split (Phỏng vấn đầy đủ / Civics / Viết / Speaking mock tests)…" and add a line under current-phase notes: `- [x] N400 IA redesign — 4-tab navigation (Home / Học tập / Thi thử / Tiến độ), skill hubs with practice-modes bottom sheet, merged Tiến độ, Phỏng vấn đầy đủ full-interview mock (specs/2026-07-09-n400app-ia-redesign-design.md)`.
- [ ] **Step 4: Commit** — `git add docs/ROADMAP.md && git commit -m "docs: roadmap — N400 IA redesign + full interview mock shipped"`
