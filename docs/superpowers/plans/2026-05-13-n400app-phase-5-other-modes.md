# N400 App — Phase 5: Other Modes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Daily Practice, Flashcards, and View All 128 modes, reusing `QuestionCard` and `AudioButton` from Phase 4.

**Architecture:**
- Daily Practice reuses the full quiz engine with no early-stop. It also persists a slide manifest in `n400_quiz_attempts.slide_manifest` and uses the **shared `submitAnswer`** (extracted to `src/lib/n400/quiz-actions.ts` to avoid Phase 5 importing from Phase 4's mock-test route).
- Flashcards use a flip-card UI with `AudioButton`. No quiz engine needed.
- View All 128 is server-rendered with **client-side search** + a **"Câu yếu của tôi" (My weakest)** filter chip computed from `n400_question_attempts`.
- All three modes save attempts to DB for streak tracking (Phase 6).

**Tech Stack:** Next.js 16, React 19, Supabase, Tailwind CSS, Radix UI Accordion (already in package.json).

**Prerequisite:** Phase 4 complete (`QuestionCard`, `AudioButton`, quiz engine). Phase 4 server actions in `mock-test/[attemptId]/actions.ts` will be **partially refactored** in Task 0 below to extract `submitAnswer` to a shared module.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/n400/quiz-actions.ts` | Create | Shared `submitAnswer` server action used by Phase 4 mock-test AND Phase 5 practice |
| `src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts` | Modify | Re-export `submitAnswer` from shared module |
| `src/app/[locale]/n400app/practice/page.tsx` | Create | Practice mode: slider + quiz |
| `src/app/[locale]/n400app/practice/actions.ts` | Create | Start practice attempt, finalize |
| `src/app/[locale]/n400app/flashcards/page.tsx` | Create | Flashcard mode UI |
| `src/app/[locale]/n400app/flashcards/actions.ts` | Create | Save flashcard session attempt |
| `src/app/[locale]/n400app/all-questions/page.tsx` | Create | Server-rendered accordion + search + weakest filter |
| `src/app/[locale]/n400app/all-questions/AllQuestionsClient.tsx` | Create | Client component: search input + filter chip |
| `src/components/n400/FlashCard.tsx` | Create | Flip card component |

---

## Task 0: Extract shared submitAnswer

**Files:**
- Create: `apps/website/src/lib/n400/quiz-actions.ts`
- Modify: `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts`

- [ ] **Step 1: Move submitAnswer to shared module**

Create `apps/website/src/lib/n400/quiz-actions.ts`:

```typescript
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

type SlideManifest = Record<string, { correctAnswerIds: string[] }>

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

/**
 * Server-side wasCorrect derivation. Used by mock_test AND practice modes.
 * Client posts only (attemptId, questionId, selectedAnswerId).
 * Server reads slide_manifest and computes correctness — client guesses are ignored.
 */
export async function submitAnswer(params: {
  attemptId: string
  questionId: number
  selectedAnswerId: string
}): Promise<{ wasCorrect: boolean; correctAnswerIds: string[] }> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  // Idempotency: if a row already exists, return its truth (no double-insert).
  const { data: existing } = await supabase
    .from('n400_question_attempts')
    .select('was_correct')
    .eq('attempt_id', params.attemptId)
    .eq('question_id', params.questionId)
    .maybeSingle()
  if (existing) return { wasCorrect: existing.was_correct, correctAnswerIds: slide.correctAnswerIds }

  const wasCorrect = slide.correctAnswerIds.includes(params.selectedAnswerId)

  await supabase.from('n400_question_attempts').insert({
    attempt_id: params.attemptId,
    question_id: params.questionId,
    was_correct: wasCorrect,
  })

  return { wasCorrect, correctAnswerIds: slide.correctAnswerIds }
}
```

- [ ] **Step 2: Re-export from mock-test/actions.ts**

In `apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts`:
- DELETE the local `submitAnswer` function.
- Add at top of the file:

```typescript
export { submitAnswer } from '@/lib/n400/quiz-actions'
```

(`startMockTest` and `finalizeAttempt` stay where they are — they're route-specific.)

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/n400/quiz-actions.ts \
        apps/website/src/app/[locale]/n400app/mock-test/[attemptId]/actions.ts
git commit -m "refactor(n400): extract submitAnswer to shared lib for practice mode reuse"
```

---

## Task 1: Daily Practice mode

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/practice/actions.ts`
- Create: `apps/website/src/app/[locale]/n400app/practice/page.tsx`

- [ ] **Step 1: Create practice server actions**

Create `apps/website/src/app/[locale]/n400app/practice/actions.ts`:

```typescript
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { buildQuizSlide, pickRandomSubset } from '@/lib/n400/quiz-engine'
import type { QuizSlide, QuizQuestion } from '@/lib/n400/quiz-types'

type SlideManifest = Record<string, { correctAnswerIds: string[] }>

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

export async function startPractice(count: number): Promise<{ attemptId: string; slides: QuizSlide[] }> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const safeCount = Math.min(Math.max(1, count), 20)

  const { data: profile } = await supabase
    .from('n400_user_profile')
    .select('state_code, district_number')
    .eq('user_id', user.id)
    .single()

  const { data: questions } = await supabase
    .from('n400_questions')
    .select('id, question_en, question_vi, question_audio_url, is_location_based, category')
    .is('deleted_at', null)

  if (!questions) throw new Error('No questions found')

  const selected = pickRandomSubset(questions as QuizQuestion[], safeCount)
  const questionIds = selected.map(q => q.id)

  const { data: allAnswers } = await supabase
    .from('n400_answers')
    .select('id, question_id, answer_en, answer_vi, answer_audio_url, is_correct')
    .in('question_id', questionIds)

  // Same location-answer expansion as Phase 4 startMockTest. Q23 returns 2 senator rows.
  const locationQuestionIds = selected.filter(q => q.is_location_based).map(q => q.id)
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

    if (profile.district_number && selected.some(q => q.id === 29)) {
      const { data: repData } = await supabase
        .from('n400_representatives')
        .select('rep_name, rep_audio_url')
        .eq('state_code', profile.state_code)
        .eq('district_number', profile.district_number)
        .single()
      if (repData) {
        locationAnswers[29] = [{
          id: 'loc-rep-29',
          answer_en: repData.rep_name,
          answer_vi: repData.rep_name,
          answer_audio_url: repData.rep_audio_url,
        }]
      }
    }
  }

  const sessionCorrectTexts: string[] = []
  for (const q of selected) {
    if (q.is_location_based) {
      sessionCorrectTexts.push(...(locationAnswers[q.id] ?? []).map(l => l.answer_en))
    } else {
      const qAnswers = (allAnswers ?? []).filter(a => a.question_id === q.id && a.is_correct)
      sessionCorrectTexts.push(...qAnswers.map(a => a.answer_en))
    }
  }

  const manifest: SlideManifest = {}
  const slides: QuizSlide[] = selected.map(q => {
    let qAnswers = (allAnswers ?? []).filter(a => a.question_id === q.id)
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

  // Persist manifest so the shared submitAnswer can grade server-side.
  const { data: attempt } = await supabase
    .from('n400_quiz_attempts')
    .insert({
      user_id: user.id,
      mode: 'practice',
      score: 0,
      total_questions: safeCount,
      slide_manifest: manifest,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (!attempt) throw new Error('Failed to create attempt')
  return { attemptId: attempt.id, slides }
}

export async function finalizePractice(attemptId: string): Promise<{ score: number; total: number }> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: questionAttempts } = await supabase
    .from('n400_question_attempts')
    .select('was_correct, attempt_id, n400_quiz_attempts!inner(user_id)')
    .eq('attempt_id', attemptId)
    .eq('n400_quiz_attempts.user_id', user.id)

  const score = (questionAttempts ?? []).filter(a => a.was_correct).length
  const total = (questionAttempts ?? []).length

  await supabase.from('n400_quiz_attempts').update({
    score, total_questions: total, completed_at: new Date().toISOString(),
  }).eq('id', attemptId).eq('user_id', user.id)

  return { score, total }
}
```

- [ ] **Step 2: Create practice page**

Create `apps/website/src/app/[locale]/n400app/practice/page.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { QuestionCard } from '@/components/n400/QuestionCard'
import { submitAnswer } from '@/lib/n400/quiz-actions'
import { startPractice, finalizePractice } from './actions'
import type { QuizState } from '@/lib/n400/quiz-types'

type Phase = 'setup' | 'quiz' | 'result'

export default function PracticePage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [count, setCount] = useState(10)
  const [state, setState] = useState<QuizState | null>(null)
  const [showNext, setShowNext] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number } | null>(null)

  const handleStart = async () => {
    const { attemptId, slides } = await startPractice(count)
    setState({
      attemptId, mode: 'practice', slides, currentIndex: 0,
      answers: {}, correctCount: 0, wrongCount: 0,
      startedAt: new Date().toISOString(), completed: false,
    })
    setPhase('quiz')
  }

  const handleAnswer = useCallback(async (selectedId: string) => {
    if (!state) return
    const slide = state.slides[state.currentIndex]
    const { wasCorrect } = await submitAnswer({
      attemptId: state.attemptId,
      questionId: slide.question.id,
      selectedAnswerId: selectedId,
    })
    setState(s => s ? { ...s, correctCount: s.correctCount + (wasCorrect ? 1 : 0), wrongCount: s.wrongCount + (wasCorrect ? 0 : 1) } : s)
    setShowNext(true)
  }, [state])

  const handleNext = useCallback(async () => {
    if (!state) return
    const nextIndex = state.currentIndex + 1
    if (nextIndex >= state.slides.length) {
      const r = await finalizePractice(state.attemptId)
      setResult(r)
      setPhase('result')
      return
    }
    setState(s => s ? { ...s, currentIndex: nextIndex } : s)
    setShowNext(false)
  }, [state])

  if (phase === 'setup') return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Luyện Tập</h1>
      <p className="text-gray-600 mb-6">Daily Practice</p>
      <div className="mb-6">
        <label className="block text-lg font-medium mb-3">Số câu hỏi / Number of questions: <strong>{count}</strong></label>
        <input type="range" min={1} max={20} value={count} onChange={e => setCount(Number(e.target.value))}
          className="w-full" />
        <div className="flex justify-between text-sm text-gray-400 mt-1"><span>1</span><span>20</span></div>
      </div>
      <button onClick={handleStart} className="w-full bg-blue-600 text-white rounded-xl px-6 py-4 text-xl font-semibold">
        Bắt đầu / Start
      </button>
    </div>
  )

  if (phase === 'result' && result) return (
    <div className="max-w-md mx-auto p-6 text-center">
      <p className="text-5xl mb-4">📝</p>
      <h1 className="text-2xl font-bold mb-2">Kết quả / Result</h1>
      <p className="text-4xl font-bold my-4">{result.score}/{result.total}</p>
      <p className="text-gray-500 mb-6">câu đúng / correct</p>
      <button onClick={() => { setPhase('setup'); setShowNext(false); setState(null) }}
        className="w-full bg-blue-600 text-white rounded-xl px-6 py-4 text-lg font-semibold">
        Luyện tập lại / Practice Again
      </button>
    </div>
  )

  if (!state) return null

  return (
    <div>
      <QuestionCard
        slide={state.slides[state.currentIndex]}
        questionNumber={state.currentIndex + 1}
        totalQuestions={state.slides.length}
        correctCount={state.correctCount}
        wrongCount={state.wrongCount}
        onAnswer={handleAnswer}
      />
      {showNext && (
        <div className="max-w-2xl mx-auto px-4 pb-8">
          <button onClick={handleNext}
            className="w-full bg-blue-600 text-white rounded-xl px-6 py-4 text-lg font-semibold mt-4">
            Câu tiếp theo / Next →
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/practice/
git commit -m "feat(n400): add Daily Practice mode"
```

---

## Task 2: Flashcard component + mode

**Files:**
- Create: `apps/website/src/components/n400/FlashCard.tsx`
- Create: `apps/website/src/app/[locale]/n400app/flashcards/actions.ts`
- Create: `apps/website/src/app/[locale]/n400app/flashcards/page.tsx`

- [ ] **Step 1: Create FlashCard component**

Create `apps/website/src/components/n400/FlashCard.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { AudioButton } from './AudioButton'
import type { QuizQuestion, QuizAnswer } from '@/lib/n400/quiz-types'

interface FlashCardProps {
  question: QuizQuestion
  correctAnswers: QuizAnswer[]
  cardNumber: number
  total: number
  onMark: (knew: boolean) => void
}

export function FlashCard({ question, correctAnswers, cardNumber, total, onMark }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex justify-between text-sm text-gray-500 mb-4">
        <span>Thẻ {cardNumber}/{total}</span>
      </div>

      <div className="border-2 rounded-2xl p-6 min-h-[200px] bg-white mb-4">
        {!flipped ? (
          <div>
            <p className="text-xl font-semibold mb-2">{question.question_en}</p>
            <p className="text-base text-gray-500 mb-4">{question.question_vi}</p>
            <AudioButton src={question.question_audio_url} autoPlay={true} label="🔊 Nghe câu hỏi" />
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-3">Đáp án đúng / Correct answers:</p>
            <ul className="space-y-3">
              {correctAnswers.map(a => (
                <li key={a.id} className="flex items-start gap-3">
                  <div>
                    <p className="font-semibold">{a.answer_en}</p>
                    <p className="text-sm text-gray-500">{a.answer_vi}</p>
                  </div>
                  <AudioButton src={a.answer_audio_url} label="🔊" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!flipped ? (
        <button onClick={() => setFlipped(true)}
          className="w-full border-2 border-blue-400 text-blue-600 rounded-xl px-6 py-4 text-lg font-semibold">
          Lật thẻ / Flip Card 🔄
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setFlipped(false); onMark(false) }}
            className="border-2 border-red-300 text-red-600 rounded-xl px-4 py-4 text-base font-semibold">
            ✗ Chưa thuộc
          </button>
          <button onClick={() => { setFlipped(false); onMark(true) }}
            className="border-2 border-green-400 text-green-700 rounded-xl px-4 py-4 text-base font-semibold">
            ✓ Đã thuộc
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create flashcard server action**

Create `apps/website/src/app/[locale]/n400app/flashcards/actions.ts`:

```typescript
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function saveFlashcardSession(params: {
  questionIds: number[]
  markedKnew: number[]
  startedAt: string
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: attempt } = await supabase
    .from('n400_quiz_attempts')
    .insert({
      user_id: user.id, mode: 'flashcard',
      score: params.markedKnew.length,
      total_questions: params.questionIds.length,
      started_at: params.startedAt,
      completed_at: new Date().toISOString(),
    })
    .select('id').single()

  if (!attempt) return

  const knewSet = new Set(params.markedKnew)
  const rows = params.questionIds.map(qId => ({
    attempt_id: attempt.id,
    question_id: qId,
    was_correct: knewSet.has(qId),
  }))

  await supabase.from('n400_question_attempts').insert(rows)
  return { attemptId: attempt.id }
}
```

- [ ] **Step 3: Create flashcard page**

Create `apps/website/src/app/[locale]/n400app/flashcards/page.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { FlashCard } from '@/components/n400/FlashCard'
import { saveFlashcardSession } from './actions'
import type { QuizQuestion, QuizAnswer } from '@/lib/n400/quiz-types'
import Link from 'next/link'

interface CardData {
  question: QuizQuestion
  correctAnswers: QuizAnswer[]
}

export default function FlashcardsPage() {
  const [cards, setCards] = useState<CardData[]>([])
  const [index, setIndex] = useState(0)
  const [knew, setKnew] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const startedAt = useRef(new Date().toISOString())

  useEffect(() => {
    fetch('/api/n400/questions-with-answers')
      .then(r => r.json())
      .then(data => { setCards(data); setLoading(false) })
  }, [])

  const handleMark = async (didKnow: boolean) => {
    const card = cards[index]
    const newKnew = didKnow ? [...knew, card.question.id] : knew
    setKnew(newKnew)

    if (index + 1 >= cards.length) {
      await saveFlashcardSession({ questionIds: cards.map(c => c.question.id), markedKnew: newKnew, startedAt: startedAt.current })
      setDone(true)
      return
    }
    setIndex(i => i + 1)
  }

  if (loading) return <div className="p-8 text-center">Đang tải... / Loading...</div>

  if (done) return (
    <div className="max-w-md mx-auto p-6 text-center">
      <p className="text-5xl mb-4">🃏</p>
      <h1 className="text-2xl font-bold mb-2">Hoàn thành! / Done!</h1>
      <p className="text-xl my-4">Đã thuộc: <strong>{knew.length}/{cards.length}</strong></p>
      <Link href="/n400app" className="block w-full bg-blue-600 text-white rounded-xl px-6 py-4 text-lg font-semibold">
        Về trang chủ / Home
      </Link>
    </div>
  )

  if (!cards[index]) return null

  return (
    <FlashCard
      question={cards[index].question}
      correctAnswers={cards[index].correctAnswers}
      cardNumber={index + 1}
      total={cards.length}
      onMark={handleMark}
    />
  )
}
```

- [ ] **Step 4: Create API route for flashcard data**

Create `apps/website/src/app/api/n400/questions-with-answers/route.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: questions } = await supabase
    .from('n400_questions')
    .select('id, question_en, question_vi, question_audio_url, is_location_based, category')
    .order('id')

  const { data: answers } = await supabase
    .from('n400_answers')
    .select('id, question_id, answer_en, answer_vi, answer_audio_url, is_correct')
    .eq('is_correct', true)

  const cards = (questions ?? []).map(q => ({
    question: q,
    correctAnswers: (answers ?? []).filter(a => a.question_id === q.id),
  }))

  return NextResponse.json(cards)
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/components/n400/FlashCard.tsx \
        apps/website/src/app/[locale]/n400app/flashcards/ \
        apps/website/src/app/api/n400/questions-with-answers/
git commit -m "feat(n400): add Flashcard mode with flip UI and session tracking"
```

---

## Task 3: View All 128 Questions (with search + weakest filter)

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/all-questions/page.tsx`
- Create: `apps/website/src/app/[locale]/n400app/all-questions/AllQuestionsClient.tsx`

Spec §4.6 requires both a debounced search box AND a "Câu yếu của tôi" filter chip — both shipped in v1.

- [ ] **Step 1: Create server page (loads data, computes weakest set)**

Create `apps/website/src/app/[locale]/n400app/all-questions/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AllQuestionsClient } from './AllQuestionsClient'

export const revalidate = 3600

async function getData() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: questions } = await supabase
    .from('n400_questions')
    .select('id, question_en, question_vi, category, question_audio_url')
    .is('deleted_at', null)
    .order('id')

  const { data: answers } = await supabase
    .from('n400_answers')
    .select('question_id, answer_en, answer_vi, answer_audio_url')
    .eq('is_correct', true)
    .is('deleted_at', null)

  // Per-user weakest 20: only available to authenticated users with attempts.
  let weakestIds: number[] = []
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // Aggregate `wrong` count per question for this user. We keep the SQL simple by
    // reading per-question rows (small N — 128 questions max) and counting in JS.
    const { data: wrongRows } = await supabase
      .from('n400_question_attempts')
      .select('question_id, attempt_id, n400_quiz_attempts!inner(user_id)')
      .eq('was_correct', false)
      .eq('n400_quiz_attempts.user_id', user.id)
      .limit(5000)

    const counts = new Map<number, number>()
    for (const r of wrongRows ?? []) counts.set(r.question_id, (counts.get(r.question_id) ?? 0) + 1)
    weakestIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id]) => id)
  }

  return { questions: questions ?? [], answers: answers ?? [], weakestIds, hasUser: !!user }
}

export default async function AllQuestionsPage() {
  const { questions, answers, weakestIds, hasUser } = await getData()
  return (
    <AllQuestionsClient
      questions={questions}
      answers={answers}
      weakestIds={weakestIds}
      hasUser={hasUser}
    />
  )
}
```

- [ ] **Step 2: Create client component**

Create `apps/website/src/app/[locale]/n400app/all-questions/AllQuestionsClient.tsx`:

```typescript
'use client'

import { useMemo, useState, useDeferredValue } from 'react'
import * as Accordion from '@radix-ui/react-accordion'

interface Question {
  id: number
  question_en: string
  question_vi: string
  category: string
  question_audio_url: string | null
}
interface Answer {
  question_id: number
  answer_en: string
  answer_vi: string
  answer_audio_url: string | null
}

interface Props {
  questions: Question[]
  answers: Answer[]
  weakestIds: number[]
  hasUser: boolean
}

export function AllQuestionsClient({ questions, answers, weakestIds, hasUser }: Props) {
  const [search, setSearch] = useState('')
  const [showWeakest, setShowWeakest] = useState(false)
  const deferred = useDeferredValue(search)

  const answersByQ = useMemo(() => {
    const map = new Map<number, Answer[]>()
    for (const a of answers) {
      if (!map.has(a.question_id)) map.set(a.question_id, [])
      map.get(a.question_id)!.push(a)
    }
    return map
  }, [answers])

  const filtered = useMemo(() => {
    let pool = questions
    if (showWeakest && weakestIds.length > 0) {
      const wid = new Set(weakestIds)
      pool = pool.filter(q => wid.has(q.id))
    }
    const q = deferred.trim().toLowerCase()
    if (!q) return pool
    return pool.filter(qq => {
      if (qq.question_en.toLowerCase().includes(q) || qq.question_vi.toLowerCase().includes(q)) return true
      const ans = answersByQ.get(qq.id) ?? []
      return ans.some(a => a.answer_en.toLowerCase().includes(q) || a.answer_vi.toLowerCase().includes(q))
    })
  }, [questions, deferred, showWeakest, weakestIds, answersByQ])

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">128 Câu Hỏi Thi Quốc Tịch</h1>
      <p className="text-gray-500 mb-4">128 U.S. Citizenship Test Questions</p>

      <div className="flex flex-col gap-2 mb-4">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm câu hỏi hoặc đáp án... / Search questions or answers..."
          aria-label="Search"
          className="w-full border rounded-lg px-4 py-3 text-base"
        />

        {hasUser && weakestIds.length > 0 && (
          <button
            type="button"
            onClick={() => setShowWeakest(s => !s)}
            aria-pressed={showWeakest}
            className={`self-start text-sm rounded-full px-4 py-2 border ${showWeakest ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-white border-gray-300 text-gray-700'}`}
          >
            {showWeakest ? '✓ ' : ''}Câu yếu của tôi / My weakest ({weakestIds.length})
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Hiển thị {filtered.length}/{questions.length} câu
      </p>

      <Accordion.Root type="multiple" className="space-y-2">
        {filtered.map(q => {
          const qAnswers = answersByQ.get(q.id) ?? []
          return (
            <Accordion.Item key={q.id} value={String(q.id)} className="border rounded-xl overflow-hidden">
              <Accordion.Trigger className="w-full text-left px-4 py-4 hover:bg-gray-50 flex justify-between items-start gap-2">
                <div>
                  <span className="text-xs text-gray-400 font-mono">#{q.id}</span>
                  <p className="font-medium text-base">{q.question_en}</p>
                  <p className="text-sm text-gray-500">{q.question_vi}</p>
                </div>
                <span className="text-gray-400 mt-1 shrink-0">▼</span>
              </Accordion.Trigger>
              <Accordion.Content className="px-4 pb-4 bg-gray-50">
                <p className="text-xs text-gray-400 mb-2">Đáp án đúng / Correct answers:</p>
                <ul className="space-y-1">
                  {qAnswers.map((a, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{a.answer_en}</span>
                      <span className="text-gray-400"> / {a.answer_vi}</span>
                    </li>
                  ))}
                </ul>
              </Accordion.Content>
            </Accordion.Item>
          )
        })}
      </Accordion.Root>

      <p className="text-xs text-center text-gray-400 mt-8">
        Tài liệu học liệu. Nội dung từ USCIS.gov. / Study material. Content from USCIS.gov.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/all-questions/
git commit -m "feat(n400): add View All 128 with debounced search and 'my weakest' filter"
```

---

## Phase 5 Complete ✅

Daily Practice, Flashcards, and View All 128 modes are live. All three save attempts to DB for streak tracking in Phase 6.

**Next:** Proceed to [Phase 6 — Streak System](2026-05-13-n400app-phase-6-streak.md).
