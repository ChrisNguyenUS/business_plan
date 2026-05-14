# N400 App — Phase 5: Other Modes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Daily Practice, Flashcards, and View All 128 modes, reusing `QuestionCard` and `AudioButton` from Phase 4.

**Architecture:** Daily Practice reuses the full quiz engine with no stop conditions. Flashcards use a flip-card UI with `AudioButton`. View All 128 is a server-rendered accordion with search. All three modes save attempts to DB for streak tracking (Phase 6).

**Tech Stack:** Next.js 16, React 19, Supabase, Tailwind CSS, Radix UI Accordion (already in package.json).

**Prerequisite:** Phase 4 complete (`QuestionCard`, `AudioButton`, quiz engine, server actions pattern established).

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/app/[locale]/n400app/practice/page.tsx` | Create | Practice mode: slider + quiz |
| `src/app/[locale]/n400app/practice/actions.ts` | Create | Start practice attempt, finalize |
| `src/app/[locale]/n400app/flashcards/page.tsx` | Create | Flashcard mode UI |
| `src/app/[locale]/n400app/flashcards/actions.ts` | Create | Save flashcard session attempt |
| `src/app/[locale]/n400app/all-questions/page.tsx` | Create | Server-rendered accordion + search |
| `src/components/n400/FlashCard.tsx` | Create | Flip card component |

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
import { buildQuizSlide, selectRandomQuestions } from '@/lib/n400/quiz-engine'
import type { QuizSlide } from '@/lib/n400/quiz-types'

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

  if (!questions) throw new Error('No questions found')

  const selected = selectRandomQuestions(questions, safeCount)
  const questionIds = selected.map(q => q.id)

  const { data: allAnswers } = await supabase
    .from('n400_answers')
    .select('id, question_id, answer_en, answer_vi, answer_audio_url, is_correct')
    .in('question_id', questionIds)

  // Location answers (same logic as mock test)
  const locationQuestionIds = selected.filter(q => q.is_location_based).map(q => q.id)
  const locationAnswers: Record<number, { answer_en: string; answer_vi: string; answer_audio_url: string | null }> = {}

  if (locationQuestionIds.length > 0 && profile?.state_code) {
    const { data: locData } = await supabase
      .from('n400_location_answers')
      .select('question_id, answer_en, answer_vi, answer_audio_url')
      .in('question_id', locationQuestionIds)
      .eq('state_code', profile.state_code)

    if (profile.district_number) {
      const { data: repData } = await supabase
        .from('n400_representatives')
        .select('rep_name, rep_audio_url')
        .eq('state_code', profile.state_code)
        .eq('district_number', profile.district_number)
        .single()
      if (repData) locationAnswers[29] = { answer_en: repData.rep_name, answer_vi: repData.rep_name, answer_audio_url: repData.rep_audio_url }
    }

    for (const loc of locData ?? []) locationAnswers[loc.question_id] = loc
  }

  const sessionCorrectTexts: string[] = []
  for (const q of selected) {
    const qAnswers = (allAnswers ?? []).filter(a => a.question_id === q.id && a.is_correct)
    sessionCorrectTexts.push(...qAnswers.map(a => a.answer_en))
    if (locationAnswers[q.id]) sessionCorrectTexts.push(locationAnswers[q.id].answer_en)
  }

  const slides: QuizSlide[] = selected.map(q => {
    let qAnswers = (allAnswers ?? []).filter(a => a.question_id === q.id)
    if (q.is_location_based && locationAnswers[q.id]) {
      const loc = locationAnswers[q.id]
      qAnswers = [
        { id: `loc-${q.id}`, question_id: q.id, answer_en: loc.answer_en, answer_vi: loc.answer_vi, answer_audio_url: loc.answer_audio_url, is_correct: true },
        ...qAnswers.filter(a => !a.is_correct),
      ]
    }
    const otherCorrectTexts = sessionCorrectTexts.filter(t =>
      !qAnswers.filter(a => a.is_correct).map(a => a.answer_en).includes(t)
    )
    return buildQuizSlide(q, qAnswers, otherCorrectTexts)
  })

  const { data: attempt } = await supabase
    .from('n400_quiz_attempts')
    .insert({ user_id: user.id, mode: 'practice', score: 0, total_questions: safeCount, started_at: new Date().toISOString() })
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
    .select('was_correct')
    .eq('attempt_id', attemptId)

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
import { submitAnswer } from '../mock-test/[attemptId]/actions'
import { startPractice, finalizePractice } from './actions'
import type { QuizSlide, QuizState } from '@/lib/n400/quiz-types'

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

  const handleAnswer = useCallback(async (selectedId: string, wasCorrect: boolean) => {
    if (!state) return
    const slide = state.slides[state.currentIndex]
    await submitAnswer({ attemptId: state.attemptId, questionId: slide.question.id, selectedAnswerId: selectedId, wasCorrect })
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

export async function saveFlaschardSession(params: {
  questionIds: number[]
  markedKnew: number[]
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
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select('id').single()

  if (!attempt) return

  const rows = params.questionIds.map(qId => ({
    attempt_id: attempt.id,
    question_id: qId,
    was_correct: params.markedKnew.includes(qId),
  }))

  await supabase.from('n400_question_attempts').insert(rows)
}
```

- [ ] **Step 3: Create flashcard page**

Create `apps/website/src/app/[locale]/n400app/flashcards/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { FlashCard } from '@/components/n400/FlashCard'
import { saveFlaschardSession } from './actions'
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
      await saveFlaschardSession({ questionIds: cards.map(c => c.question.id), markedKnew: newKnew })
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

## Task 3: View All 128 Questions

**Files:**
- Create: `apps/website/src/app/[locale]/n400app/all-questions/page.tsx`

- [ ] **Step 1: Create page**

Create `apps/website/src/app/[locale]/n400app/all-questions/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import * as Accordion from '@radix-ui/react-accordion'

export const revalidate = 3600

async function getAllQuestions() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: questions } = await supabase
    .from('n400_questions')
    .select('id, question_en, question_vi, category, question_audio_url')
    .order('id')

  const { data: answers } = await supabase
    .from('n400_answers')
    .select('question_id, answer_en, answer_vi, answer_audio_url')
    .eq('is_correct', true)

  return { questions: questions ?? [], answers: answers ?? [] }
}

export default async function AllQuestionsPage() {
  const { questions, answers } = await getAllQuestions()

  // Group by category
  const categories = [...new Set(questions.map(q => q.category))]

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">128 Câu Hỏi Thi Quốc Tịch</h1>
      <p className="text-gray-500 mb-6">128 U.S. Citizenship Test Questions</p>

      <Accordion.Root type="multiple" className="space-y-2">
        {questions.map(q => {
          const qAnswers = answers.filter(a => a.question_id === q.id)
          return (
            <Accordion.Item key={q.id} value={String(q.id)}
              className="border rounded-xl overflow-hidden">
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

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/app/[locale]/n400app/all-questions/page.tsx
git commit -m "feat(n400): add View All 128 Questions page with accordion"
```

---

## Phase 5 Complete ✅

Daily Practice, Flashcards, and View All 128 modes are live. All three save attempts to DB for streak tracking in Phase 6.

**Next:** Proceed to [Phase 6 — Streak System](2026-05-13-n400app-phase-6-streak.md).
