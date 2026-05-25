# N400 App — Phase 4: Mock Test

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core quiz engine and Mock Test mode — random question selection, distractor collision prevention, 4-option multiple choice UI, audio playback, server-side pass/fail scoring, server-side `was_correct` derivation (no client-trusted flags), and shareable certificate.

**UI source of truth:** v1 `/n400app/mock-test` page and `src/components/n400/*`. Replace the data layer (localStorage `recordMockResult` → server action) but preserve the question card layout, option styling, audio button placement, progress bar, and result modal. Do not redesign.

**Architecture:** Pure quiz engine in `src/lib/n400/quiz-engine.ts` (testable, no React). When the mock test starts, the server builds a **slide manifest** (`{ questionId → correctAnswerIdSet }`) and persists it to `n400_quiz_attempts.slide_manifest` (jsonb). `submitAnswer` looks up the manifest server-side and computes `was_correct` itself — the client only sends `selectedAnswerId`. `finalizeAttempt` then sums `n400_question_attempts` rows. Client component handles question rendering + audio. Certificate is a static page rendered from attempt data.

**Resume across tab close:** the slide payload AND in-progress state both go to **localStorage** (keyed by `attemptId`). `sessionStorage` was previously planned but is wrong — it dies with the tab.

**Tech Stack:** Next.js 16 Server Actions, React 19 client components, Supabase, Web Audio API (HTMLAudioElement), Tailwind CSS.

**Prerequisite:** Phase 1 (DB + seed) and Phase 2 (audio URLs in DB) complete.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/n400/quiz-engine.ts` | Create | Pure functions: build quiz, select distractors, check answer |
| `src/lib/n400/quiz-engine.test.ts` | Create | Unit tests for quiz engine |
| `src/lib/n400/quiz-types.ts` | Create | Shared TypeScript types for quiz |
| `src/app/[locale]/n400app/mock-test/page.tsx` | Create | Mock test start screen |
| `src/app/[locale]/n400app/mock-test/[attemptId]/page.tsx` | Create | Active quiz screen |
| `src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts` | Create | Server actions: start attempt, submit answer, finalize |
| `src/app/[locale]/n400app/mock-test/[attemptId]/result/page.tsx` | Create | Pass/fail result + certificate |
| `src/components/n400/QuestionCard.tsx` | Create | Reusable question + options UI (used by Practice too) |
| `src/components/n400/AudioButton.tsx` | Create | Play/repeat audio button |

---

## Task 1: Quiz types + engine unit tests

**Files:**
- Create: `apps/website/src/lib/n400/quiz-types.ts`
- Create: `apps/website/src/lib/n400/quiz-engine.test.ts`

- [ ] **Step 1: Create shared types**

Create `apps/website/src/lib/n400/quiz-types.ts`:

```typescript
export interface QuizQuestion {
  id: number
  question_en: string
  question_vi: string
  question_audio_url: string | null
  is_location_based: boolean
  category: string
}

export interface QuizAnswer {
  id: string
  answer_en: string
  answer_vi: string
  answer_audio_url: string | null
  is_correct: boolean
}

export interface QuizOption {
  id: string
  answer_en: string
  answer_vi: string
  answer_audio_url: string | null
  is_correct: boolean
}

export interface QuizSlide {
  question: QuizQuestion
  options: QuizOption[]  // always 4: 1 correct + 3 distractors, shuffled
  correctAnswerIds: string[]  // all acceptable correct answer IDs for this question
}

export interface QuizState {
  attemptId: string
  mode: 'practice' | 'mock_test' | 'flashcard'
  slides: QuizSlide[]
  currentIndex: number
  answers: Record<number, { selectedId: string; wasCorrect: boolean }>
  correctCount: number
  wrongCount: number
  startedAt: string  // ISO timestamp, preserved across refreshes
  completed: boolean
}
```

- [ ] **Step 2: Write failing tests**

Create `apps/website/src/lib/n400/quiz-engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildQuizSlide, checkMockTestStop, selectRandomQuestions } from './quiz-engine'
import type { QuizQuestion, QuizAnswer } from './quiz-types'

const makeQuestion = (id: number): QuizQuestion => ({
  id, question_en: `Q${id}`, question_vi: `Q${id}VI`,
  question_audio_url: null, is_location_based: false, category: 'Test',
})

const makeAnswer = (id: string, isCorrect: boolean, text = `Answer ${id}`): QuizAnswer => ({
  id, answer_en: text, answer_vi: text, answer_audio_url: null, is_correct: isCorrect,
})

describe('selectRandomQuestions', () => {
  it('returns requested count with no duplicates', () => {
    const questions = Array.from({ length: 128 }, (_, i) => makeQuestion(i + 1))
    const selected = selectRandomQuestions(questions, 20)
    expect(selected).toHaveLength(20)
    const ids = selected.map(q => q.id)
    expect(new Set(ids).size).toBe(20)
  })

  it('returns all questions when count >= pool size', () => {
    const questions = Array.from({ length: 5 }, (_, i) => makeQuestion(i + 1))
    expect(selectRandomQuestions(questions, 10)).toHaveLength(5)
  })
})

describe('buildQuizSlide', () => {
  it('returns 4 options: 1 correct + 3 distractors', () => {
    const q = makeQuestion(1)
    const allAnswers = [
      makeAnswer('c1', true, 'Correct'),
      makeAnswer('d1', false, 'Wrong 1'),
      makeAnswer('d2', false, 'Wrong 2'),
      makeAnswer('d3', false, 'Wrong 3'),
    ]
    const slide = buildQuizSlide(q, allAnswers, [])
    expect(slide.options).toHaveLength(4)
    expect(slide.options.filter(o => o.is_correct)).toHaveLength(1)
    expect(slide.options.filter(o => !o.is_correct)).toHaveLength(3)
  })

  it('does not include distractors that are correct answers to other session questions', () => {
    const q = makeQuestion(1)
    const allAnswers = [
      makeAnswer('c1', true, 'Republic'),
      makeAnswer('d1', false, 'Democracy'),  // also a correct answer to another question
      makeAnswer('d2', false, 'Monarchy'),
      makeAnswer('d3', false, 'Oligarchy'),
    ]
    // 'Democracy' is a correct answer to another question in this session
    const sessionCorrectAnswers = ['Democracy']
    const slide = buildQuizSlide(q, allAnswers, sessionCorrectAnswers)
    const optionTexts = slide.options.map(o => o.answer_en)
    expect(optionTexts).not.toContain('Democracy')
  })

  it('includes all correct answer IDs in correctAnswerIds', () => {
    const q = makeQuestion(1)
    const allAnswers = [
      makeAnswer('c1', true, 'Republic'),
      makeAnswer('c2', true, 'Democracy'),
      makeAnswer('d1', false, 'Monarchy'),
      makeAnswer('d2', false, 'Oligarchy'),
      makeAnswer('d3', false, 'Theocracy'),
    ]
    const slide = buildQuizSlide(q, allAnswers, [])
    expect(slide.correctAnswerIds).toContain('c1')
    expect(slide.correctAnswerIds).toContain('c2')
  })
})

describe('checkMockTestStop', () => {
  it('returns pass when correctCount reaches 12', () => {
    expect(checkMockTestStop(12, 0)).toBe('pass')
  })

  it('returns fail when wrongCount reaches 9', () => {
    expect(checkMockTestStop(3, 9)).toBe('fail')
  })

  it('returns null when neither threshold reached', () => {
    expect(checkMockTestStop(11, 8)).toBeNull()
  })

  it('pass takes priority when both thresholds hit simultaneously (impossible but safe)', () => {
    expect(checkMockTestStop(12, 9)).toBe('pass')
  })
})
```

- [ ] **Step 3: Run — expect FAIL**

```bash
cd apps/website && npm test -- src/lib/n400/quiz-engine.test.ts
```

Expected: `Cannot find module './quiz-engine'`

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/lib/n400/quiz-types.ts apps/website/src/lib/n400/quiz-engine.test.ts
git commit -m "test(n400): add failing unit tests for quiz engine"
```

---

## Task 2: Implement quiz engine (make tests pass)

**Files:**
- Create: `apps/website/src/lib/n400/quiz-engine.ts`

- [ ] **Step 1: Implement quiz engine**

Create `apps/website/src/lib/n400/quiz-engine.ts`:

```typescript
import type { QuizQuestion, QuizAnswer, QuizSlide } from './quiz-types'

export function pickRandomSubset<T>(items: T[], count: number): T[] {
  const pool = [...items]
  const out: T[] = []
  const take = Math.min(count, pool.length)
  for (let i = 0; i < take; i++) {
    const idx = Math.floor(Math.random() * (pool.length - i))
    out.push(pool[idx])
    pool[idx] = pool[pool.length - 1 - i]
  }
  return out
}

export function selectRandomQuestions(questions: QuizQuestion[], count: number): QuizQuestion[] {
  return pickRandomSubset(questions, count)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildQuizSlide(
  question: QuizQuestion,
  allAnswers: QuizAnswer[],
  sessionCorrectAnswerTexts: string[]  // correct answer texts from OTHER questions in this session
): QuizSlide {
  const correctAnswers = allAnswers.filter(a => a.is_correct)
  const ownCorrectTexts = new Set(correctAnswers.map(a => a.answer_en.trim().toLowerCase()))
  const sessionSet = new Set(sessionCorrectAnswerTexts.map(t => t.trim().toLowerCase()))

  const distractorsStrict = allAnswers.filter(a =>
    !a.is_correct &&
    !sessionSet.has(a.answer_en.trim().toLowerCase()) &&
    !ownCorrectTexts.has(a.answer_en.trim().toLowerCase())
  )

  // With ≥5 authored distractors per question (Phase 1), the strict pool should
  // almost always have ≥3. If not, log and fall back to non-strict (own-correct still excluded).
  let distractorPool = distractorsStrict
  if (distractorPool.length < 3) {
    console.warn(`[n400 quiz] Q${question.id}: strict distractor pool has only ${distractorPool.length}; falling back`)
    distractorPool = allAnswers.filter(a => !a.is_correct && !ownCorrectTexts.has(a.answer_en.trim().toLowerCase()))
  }

  const displayCorrect = correctAnswers[Math.floor(Math.random() * correctAnswers.length)]
  const selectedDistractors = pickRandomSubset(distractorPool, 3)
  const options = shuffle([displayCorrect, ...selectedDistractors])

  return {
    question,
    options: options.map(a => ({
      id: a.id,
      answer_en: a.answer_en,
      answer_vi: a.answer_vi,
      answer_audio_url: a.answer_audio_url,
      is_correct: a.is_correct,
    })),
    correctAnswerIds: correctAnswers.map(a => a.id),
  }
}

export function checkMockTestStop(correctCount: number, wrongCount: number): 'pass' | 'fail' | null {
  if (correctCount >= 12) return 'pass'
  if (wrongCount >= 9) return 'fail'
  return null
}
```

- [ ] **Step 2: Run tests — expect PASS**

```bash
cd apps/website && npm test -- src/lib/n400/quiz-engine.test.ts
```

Expected: `all tests passed`

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/n400/quiz-engine.ts
git commit -m "feat(n400): implement quiz engine with distractor collision prevention"
```

---

## Task 2.5: SECURITY DEFINER RPCs for attempt finalization

**Files:**
- Migration: `supabase/migrations/<timestamp>_n400_finalize_rpcs.sql`

These RPCs are the ONLY path that can write `score`, `passed`, and `completed_at` to `n400_quiz_attempts`. The table has no UPDATE RLS policy — all finalization goes through these functions.

- [ ] **Step 1: Create migration**

```sql
-- finalize_mock_attempt: sums n400_question_attempts rows, writes result.
-- SECURITY DEFINER so it can UPDATE n400_quiz_attempts without a client UPDATE policy.
CREATE OR REPLACE FUNCTION public.finalize_mock_attempt(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_score   int;
  v_total   int;
  v_passed  boolean;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_user_id
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Idempotency: already finalized → return stored result
  PERFORM 1 FROM n400_quiz_attempts
  WHERE id = p_attempt_id AND completed_at IS NOT NULL;
  IF FOUND THEN
    SELECT score, total_questions, passed
    INTO v_score, v_total, v_passed
    FROM n400_quiz_attempts WHERE id = p_attempt_id;
    RETURN jsonb_build_object('score', v_score, 'total', v_total, 'passed', v_passed);
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE was_correct = true),
    COUNT(*)
  INTO v_score, v_total
  FROM n400_question_attempts
  WHERE attempt_id = p_attempt_id;

  v_passed := v_score >= 12;

  UPDATE n400_quiz_attempts
  SET score = v_score,
      total_questions = v_total,
      passed = v_passed,
      completed_at = now()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'passed', v_passed);
END;
$$;

-- finalize_practice_attempt: same pattern, no pass/fail threshold.
CREATE OR REPLACE FUNCTION public.finalize_practice_attempt(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_score   int;
  v_total   int;
BEGIN
  SELECT user_id INTO v_user_id
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  PERFORM 1 FROM n400_quiz_attempts
  WHERE id = p_attempt_id AND completed_at IS NOT NULL;
  IF FOUND THEN
    SELECT score, total_questions INTO v_score, v_total
    FROM n400_quiz_attempts WHERE id = p_attempt_id;
    RETURN jsonb_build_object('score', v_score, 'total', v_total);
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE was_correct = true),
    COUNT(*)
  INTO v_score, v_total
  FROM n400_question_attempts
  WHERE attempt_id = p_attempt_id;

  UPDATE n400_quiz_attempts
  SET score = v_score,
      total_questions = v_total,
      completed_at = now()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object('score', v_score, 'total', v_total);
END;
$$;

-- Revoke direct execute from public; only authenticated users may call these.
REVOKE EXECUTE ON FUNCTION public.finalize_mock_attempt(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.finalize_mock_attempt(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_practice_attempt(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.finalize_practice_attempt(uuid) TO authenticated;
```

- [ ] **Step 2: Apply migration**

```bash
supabase migration new n400_finalize_rpcs
# paste SQL above into the generated file, then:
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(n400): add SECURITY DEFINER RPCs for attempt finalization (no client UPDATE policy)"
```

---

## Task 3: Server actions — start attempt, submit answer, finalize

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts`

- [ ] **Step 1: Create server actions**

Create `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts`:

```typescript
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { buildQuizSlide, pickRandomSubset } from '@/lib/n400/quiz-engine'
import type { QuizSlide, QuizQuestion } from '@/lib/n400/quiz-types'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

// Slide manifest: persisted to n400_quiz_attempts.slide_manifest. Source of truth for grading.
type SlideManifest = Record<string, { correctAnswerIds: string[] }>  // keyed by question_id (as string)

export async function startMockTest(): Promise<{ attemptId: string; slides: QuizSlide[] }> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user profile for location-based answers
  const { data: profile } = await supabase
    .from('n400_user_profile')
    .select('state_code, district_number')
    .eq('user_id', user.id)
    .single()

  // Fetch all questions (only non-deleted)
  const { data: questions } = await supabase
    .from('n400_questions')
    .select('id, question_en, question_vi, question_audio_url, is_location_based, category')
    .is('deleted_at', null)

  if (!questions) throw new Error('No questions found')

  // Select 20 random questions
  const selected = pickRandomSubset(questions as QuizQuestion[], 20)

  // Fetch answers for selected questions
  const questionIds = selected.map(q => q.id)
  const { data: allAnswers } = await supabase
    .from('n400_answers')
    .select('id, question_id, answer_en, answer_vi, answer_audio_url, is_correct')
    .in('question_id', questionIds)

  // For location-based questions, fetch location answers
  const locationQuestionIds = selected.filter(q => q.is_location_based).map(q => q.id)
  // Q23 has 2 senator rows per state — both are correct.
  const locationAnswers: Record<number, Array<{ id: string; answer_en: string; answer_vi: string; answer_audio_url: string | null }>> = {}

  if (locationQuestionIds.length > 0 && profile?.state_code) {
    const { data: locData } = await supabase
      .from('n400_location_answers')
      .select('id, question_id, answer_en, answer_vi, answer_audio_url')
      .in('question_id', locationQuestionIds)
      .eq('state_code', profile.state_code)

    for (const loc of locData ?? []) {
      if (!locationAnswers[loc.question_id]) locationAnswers[loc.question_id] = []
      locationAnswers[loc.question_id].push(loc)
    }

    // Q29: get rep by district. Synthetic id `loc-rep-29` so manifest can match.
    if (profile.district_number && selected.some(q => q.id === 29)) {
      const { data: repData } = await supabase
        .from('n400_representatives')
        .select('rep_name, rep_audio_url')
        .eq('state_code', profile.state_code)
        .eq('district_number', profile.district_number)
        .single()

      if (repData) {
        locationAnswers[29] = [{
          id: `loc-rep-29`,
          answer_en: repData.rep_name,
          answer_vi: repData.rep_name,
          answer_audio_url: repData.rep_audio_url,
        }]
      }
    }
  }

  // Collect all correct answer texts across session (for distractor collision check)
  const sessionCorrectTexts: string[] = []
  for (const q of selected) {
    if (q.is_location_based) {
      sessionCorrectTexts.push(...(locationAnswers[q.id] ?? []).map(l => l.answer_en))
    } else {
      const qAnswers = (allAnswers ?? []).filter(a => a.question_id === q.id && a.is_correct)
      sessionCorrectTexts.push(...qAnswers.map(a => a.answer_en))
    }
  }

  // Build slides + manifest in one pass
  const manifest: SlideManifest = {}
  const slides: QuizSlide[] = selected.map(q => {
    let qAnswers = (allAnswers ?? []).filter(a => a.question_id === q.id)

    // Location-based: replace correct rows with the per-state/per-district correct rows.
    // Distractors keep the seeded pool from n400_answers (Q29 has its curated pool, Q23/61/62 have generic distractors).
    if (q.is_location_based && (locationAnswers[q.id]?.length ?? 0) > 0) {
      const correctRows = (locationAnswers[q.id] ?? []).map(loc => ({
        id: loc.id,
        question_id: q.id,
        answer_en: loc.answer_en,
        answer_vi: loc.answer_vi,
        answer_audio_url: loc.answer_audio_url,
        is_correct: true as const,
      }))
      qAnswers = [...correctRows, ...qAnswers.filter(a => !a.is_correct)]
    }

    const otherCorrectTexts = sessionCorrectTexts.filter(t =>
      !qAnswers.filter(a => a.is_correct).map(a => a.answer_en).includes(t)
    )

    const slide = buildQuizSlide(q, qAnswers, otherCorrectTexts)
    manifest[String(q.id)] = { correctAnswerIds: slide.correctAnswerIds }
    return slide
  })

  // Create attempt record WITH manifest persisted server-side.
  // submitAnswer reads back this manifest to grade — client cannot influence.
  const { data: attempt } = await supabase
    .from('n400_quiz_attempts')
    .insert({
      user_id: user.id,
      mode: 'mock_test',
      score: 0,
      total_questions: 20,
      slide_manifest: manifest,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (!attempt) throw new Error('Failed to create attempt')

  return { attemptId: attempt.id, slides }
}

/**
 * Server-side wasCorrect derivation.
 * Client posts only (attemptId, questionId, selectedAnswerId). Server looks up the manifest and decides.
 * Returns the truth so the UI can render feedback consistently.
 */
export async function submitAnswer(params: {
  attemptId: string
  questionId: number
  selectedAnswerId: string
}): Promise<{ wasCorrect: boolean; correctAnswerIds: string[] }> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load manifest for this attempt — RLS guarantees ownership.
  const { data: attempt } = await supabase
    .from('n400_quiz_attempts')
    .select('slide_manifest, completed_at')
    .eq('id', params.attemptId)
    .eq('user_id', user.id)
    .single()

  if (!attempt) throw new Error('Attempt not found')
  if (attempt.completed_at) throw new Error('Attempt already finalized')

  const manifest = (attempt.slide_manifest ?? {}) as SlideManifest
  const slide = manifest[String(params.questionId)]
  if (!slide) throw new Error(`Question ${params.questionId} not part of this attempt`)

  // Idempotency: if a row already exists for this (attempt, question), return its stored truth.
  const { data: existing } = await supabase
    .from('n400_question_attempts')
    .select('was_correct')
    .eq('attempt_id', params.attemptId)
    .eq('question_id', params.questionId)
    .maybeSingle()
  if (existing) {
    return { wasCorrect: existing.was_correct, correctAnswerIds: slide.correctAnswerIds }
  }

  const wasCorrect = slide.correctAnswerIds.includes(params.selectedAnswerId)

  await supabase.from('n400_question_attempts').insert({
    attempt_id: params.attemptId,
    question_id: params.questionId,
    was_correct: wasCorrect,
  })

  return { wasCorrect, correctAnswerIds: slide.correctAnswerIds }
}

export async function finalizeAttempt(attemptId: string): Promise<{ passed: boolean; score: number; total: number }> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // SECURITY DEFINER RPC — the only path that can write score/passed/completed_at.
  // No UPDATE RLS policy exists on n400_quiz_attempts; direct .update() would fail.
  const { data, error } = await supabase.rpc('finalize_mock_attempt', { p_attempt_id: attemptId })
  if (error) throw new Error(`finalize_mock_attempt failed: ${error.message}`)

  return {
    passed: data.passed,
    score: data.score,
    total: data.total,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts
git commit -m "feat(n400): add mock test server actions with server-side pass/fail scoring"
```

---

## Task 4: AudioButton component

**Files:**
- Create: `apps/website/src/components/n400/AudioButton.tsx`

- [ ] **Step 1: Create component**

Create `apps/website/src/components/n400/AudioButton.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'

interface AudioButtonProps {
  src: string | null
  autoPlay?: boolean
  label?: string
}

export function AudioButton({ src, autoPlay = false, label = '🔊 Nghe lại' }: AudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!src) return
    const audio = new Audio(src)
    audioRef.current = audio
    audio.onended = () => setPlaying(false)
    audio.onerror = () => { setError(true); setPlaying(false) }

    if (autoPlay) {
      audio.play().catch(() => setError(true))
      setPlaying(true)
    }

    return () => { audio.pause(); audio.src = '' }
  }, [src, autoPlay])

  const handlePlay = () => {
    if (!audioRef.current || error) return
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(() => setError(true))
    setPlaying(true)
  }

  if (!src || error) {
    return (
      <button disabled className="text-gray-300 text-sm px-3 py-2 rounded-lg border border-gray-200" title="Audio không khả dụng">
        🔇 Audio
      </button>
    )
  }

  return (
    <button
      onClick={handlePlay}
      className="text-blue-600 text-sm px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 active:bg-blue-100 min-w-[48px] min-h-[48px]"
    >
      {playing ? '⏸ Đang phát...' : label}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/components/n400/AudioButton.tsx
git commit -m "feat(n400): add AudioButton component with autoplay and error handling"
```

---

## Task 5: QuestionCard component

**Files:**
- Create: `apps/website/src/components/n400/QuestionCard.tsx`

- [ ] **Step 1: Create component**

Create `apps/website/src/components/n400/QuestionCard.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { AudioButton } from './AudioButton'
import type { QuizSlide } from '@/lib/n400/quiz-types'

interface QuestionCardProps {
  slide: QuizSlide
  questionNumber: number
  totalQuestions: number
  correctCount: number
  wrongCount: number
  /**
   * Server is authoritative for grading. Caller submits selectedId to the server,
   * the server returns wasCorrect, and the parent component updates its counters.
   * QuestionCard only displays — it does NOT decide correctness.
   */
  onAnswer: (selectedId: string) => Promise<void> | void
}

export function QuestionCard({
  slide, questionNumber, totalQuestions, correctCount, wrongCount, onAnswer
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const revealed = selected !== null

  const handleSelect = (optionId: string) => {
    if (revealed) return
    setSelected(optionId)
    void onAnswer(optionId)
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Progress */}
      <div className="flex justify-between text-sm text-gray-500 mb-4">
        <span>Câu {questionNumber}/{totalQuestions}</span>
        <span>✅ {correctCount} &nbsp; ❌ {wrongCount}</span>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl border p-5 mb-4">
        <p className="text-xl font-semibold mb-1">{slide.question.question_en}</p>
        <p className="text-base text-gray-500 mb-3">{slide.question.question_vi}</p>
        <AudioButton src={slide.question.question_audio_url} autoPlay={!revealed} label="🔊 Nghe lại câu hỏi" />
      </div>

      {/* Options. Visual reveal uses slide.correctAnswerIds — same set the server will use. */}
      <div className="space-y-3">
        {slide.options.map((opt) => {
          const isSelected = selected === opt.id
          const isCorrect = slide.correctAnswerIds.includes(opt.id)
          let bg = 'bg-white border-gray-200 hover:bg-gray-50'
          if (revealed && isCorrect) bg = 'bg-green-50 border-green-400'
          else if (revealed && isSelected && !isCorrect) bg = 'bg-red-50 border-red-400'

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={revealed}
              className={`w-full text-left rounded-xl border-2 px-5 py-4 text-lg transition-colors min-h-[56px] ${bg}`}
            >
              <span className="font-medium">{opt.answer_en}</span>
              <span className="block text-sm text-gray-500">{opt.answer_vi}</span>
              {revealed && isCorrect && (
                <span className="block text-xs text-green-600 mt-1">✓ Đáp án đúng / Correct</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Post-answer: correct-answer audio */}
      {revealed && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600 mb-2">Đáp án đúng / Correct answer:</p>
          {slide.options.filter(o => slide.correctAnswerIds.includes(o.id)).map(o => (
            <div key={o.id} className="flex items-center gap-3">
              <span className="font-medium">{o.answer_en}</span>
              <AudioButton src={o.answer_audio_url} autoPlay={true} label="🔊 Nghe đáp án" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/components/n400/QuestionCard.tsx
git commit -m "feat(n400): add QuestionCard component with bilingual options and audio"
```

---

## Task 6: Mock test start page + active quiz page

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/mock-test/page.tsx`
- Create: `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/page.tsx`

- [ ] **Step 1: Create start page**

Create `apps/website/src/app/[locale]/n400app/mock-test/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startMockTest } from './[attemptId]/actions'

export default function MockTestStartPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    try {
      const { attemptId, slides } = await startMockTest()
      // Persist slides + startedAt to localStorage (NOT sessionStorage —
      // sessionStorage dies with the tab and breaks the resume-on-refresh promise in spec §5.5).
      localStorage.setItem(`quiz-slides-${attemptId}`, JSON.stringify({
        slides,
        startedAt: new Date().toISOString(),
      }))
      router.push(`/n400app/mock-test/${attemptId}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Thi Thử Quốc Tịch</h1>
      <p className="text-lg text-gray-600 mb-6">Mock Citizenship Test</p>

      <div className="bg-blue-50 rounded-xl p-5 mb-6 text-left space-y-2">
        <p>📋 <strong>20 câu hỏi</strong> ngẫu nhiên / 20 random questions</p>
        <p>✅ Cần đúng <strong>12 câu</strong> để pass / Need 12 correct to pass</p>
        <p>❌ Sai <strong>9 câu</strong> là fail / 9 wrong = fail</p>
        <p>🔊 Câu hỏi sẽ được đọc to / Questions read aloud</p>
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-xl px-6 py-4 text-xl font-semibold disabled:opacity-50"
      >
        {loading ? 'Đang chuẩn bị...' : 'Bắt đầu thi / Start Test'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create active quiz page**

Create `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { QuestionCard } from '@/components/n400/QuestionCard'
import { checkMockTestStop } from '@/lib/n400/quiz-engine'
import { submitAnswer, finalizeAttempt } from './actions'
import type { QuizSlide, QuizState } from '@/lib/n400/quiz-types'

export default function MockTestPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const router = useRouter()
  const [state, setState] = useState<QuizState | null>(null)
  const [showNext, setShowNext] = useState(false)

  useEffect(() => {
    // Slides live in localStorage so they survive tab close (spec §5.5).
    const stored = localStorage.getItem(`quiz-slides-${attemptId}`)
    if (!stored) { router.replace('/n400app/mock-test'); return }
    const { slides, startedAt } = JSON.parse(stored) as { slides: QuizSlide[]; startedAt: string }

    // Resume in-progress state if it exists.
    const savedState = localStorage.getItem(`quiz-state-${attemptId}`)
    if (savedState) {
      setState(JSON.parse(savedState))
    } else {
      setState({
        attemptId,
        mode: 'mock_test',
        slides,
        currentIndex: 0,
        answers: {},
        correctCount: 0,
        wrongCount: 0,
        startedAt,
        completed: false,
      })
    }

    // Warn before accidental navigation away mid-test.
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [attemptId, router])

  const handleAnswer = useCallback(async (selectedId: string) => {
    if (!state) return
    const slide = state.slides[state.currentIndex]

    // Server decides wasCorrect — we never trust the client guess.
    const { wasCorrect } = await submitAnswer({
      attemptId,
      questionId: slide.question.id,
      selectedAnswerId: selectedId,
    })

    const newCorrect = state.correctCount + (wasCorrect ? 1 : 0)
    const newWrong = state.wrongCount + (wasCorrect ? 0 : 1)
    const newState = {
      ...state,
      answers: { ...state.answers, [state.currentIndex]: { selectedId, wasCorrect } },
      correctCount: newCorrect,
      wrongCount: newWrong,
    }
    setState(newState)
    localStorage.setItem(`quiz-state-${attemptId}`, JSON.stringify(newState))
    setShowNext(true)

    const stop = checkMockTestStop(newCorrect, newWrong)
    if (stop) {
      await finalizeAttempt(attemptId)
      localStorage.removeItem(`quiz-state-${attemptId}`)
      localStorage.removeItem(`quiz-slides-${attemptId}`)
      router.push(`/n400app/mock-test/${attemptId}/result`)
    }
  }, [state, attemptId, router])

  const handleNext = useCallback(async () => {
    if (!state) return
    const nextIndex = state.currentIndex + 1

    if (nextIndex >= state.slides.length) {
      await finalizeAttempt(attemptId)
      localStorage.removeItem(`quiz-state-${attemptId}`)
      localStorage.removeItem(`quiz-slides-${attemptId}`)
      router.push(`/n400app/mock-test/${attemptId}/result`)
      return
    }

    const newState = { ...state, currentIndex: nextIndex }
    setState(newState)
    localStorage.setItem(`quiz-state-${attemptId}`, JSON.stringify(newState))
    setShowNext(false)
  }, [state, attemptId, router])

  if (!state) return <div className="p-8 text-center">Đang tải... / Loading...</div>

  const slide = state.slides[state.currentIndex]

  return (
    <div>
      <QuestionCard
        slide={slide}
        questionNumber={state.currentIndex + 1}
        totalQuestions={state.slides.length}
        correctCount={state.correctCount}
        wrongCount={state.wrongCount}
        onAnswer={handleAnswer}
      />
      {showNext && (
        <div className="max-w-2xl mx-auto px-4 pb-8">
          <button
            onClick={handleNext}
            className="w-full bg-blue-600 text-white rounded-xl px-6 py-4 text-lg font-semibold mt-4"
          >
            Câu tiếp theo / Next Question →
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/mock-test/page.tsx \
        apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/page.tsx
git commit -m "feat(n400): add mock test start page and active quiz UI"
```

---

## Task 7: Result page with pass/fail certificate

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/result/page.tsx`

- [ ] **Step 1: Create result page**

Create `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/result/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

async function getAttemptResult(attemptId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: attempt } = await supabase
    .from('n400_quiz_attempts')
    .select('score, total_questions, passed, completed_at')
    .eq('id', attemptId)
    .single()

  const { data: wrongAttempts } = await supabase
    .from('n400_question_attempts')
    .select('question_id, n400_questions(question_en, question_vi)')
    .eq('attempt_id', attemptId)
    .eq('was_correct', false)

  return { attempt, wrongAttempts }
}

export default async function ResultPage({ params }: { params: { attemptId: string } }) {
  const { attempt, wrongAttempts } = await getAttemptResult(params.attemptId)

  if (!attempt) return <div className="p-8 text-center">Không tìm thấy kết quả.</div>

  const passed = attempt.passed

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <div className={`rounded-2xl p-8 mb-6 ${passed ? 'bg-green-50 border-2 border-green-400' : 'bg-red-50 border-2 border-red-300'}`}>
        <p className="text-5xl mb-3">{passed ? '🎉' : '📚'}</p>
        <h1 className="text-2xl font-bold mb-1">
          {passed ? 'Bạn đã PASS!' : 'Cần luyện tập thêm'}
        </h1>
        <p className="text-lg text-gray-600 mb-3">
          {passed ? 'You PASSED the Mock Test!' : 'Keep practicing!'}
        </p>
        <p className="text-3xl font-bold">
          {attempt.score}/{attempt.total_questions}
        </p>
        <p className="text-sm text-gray-500 mt-1">câu đúng / correct</p>
      </div>

      {!passed && wrongAttempts && wrongAttempts.length > 0 && (
        <div className="text-left mb-6">
          <h2 className="font-semibold mb-3">Câu trả lời sai / Missed questions:</h2>
          <ul className="space-y-2">
            {wrongAttempts.map((wa) => (
              <li key={wa.question_id} className="bg-red-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{(wa.n400_questions as any)?.question_en}</p>
                <p className="text-gray-500">{(wa.n400_questions as any)?.question_vi}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <Link href="/n400app/mock-test" className="block w-full bg-blue-600 text-white rounded-xl px-6 py-4 text-lg font-semibold">
          Thi lại / Try Again
        </Link>
        <Link href="/n400app" className="block w-full border rounded-xl px-6 py-4 text-lg">
          Về trang chủ / Home
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/result/page.tsx
git commit -m "feat(n400): add mock test result page with pass/fail certificate and breakdown"
```

---

## Phase 4 Complete ✅

Quiz engine implemented and tested. Mock test flow: start → 20 questions → server-side pass/fail → result page. Components `QuestionCard` and `AudioButton` ready for reuse in Phase 5.

**Next:** Proceed to [Phase 5 — Other Modes](2026-05-13-n400app-phase-5-other-modes.md).
