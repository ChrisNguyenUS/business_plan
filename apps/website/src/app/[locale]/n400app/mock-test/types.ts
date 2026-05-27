// Public types shared between the mock-test client component and server
// actions. Lives in its own file because Next.js requires `'use server'`
// modules to export only async functions — types must come from elsewhere.

import type { QuizOption } from '@/lib/n400/quiz-engine'

export interface PublicQuizOption {
  id: QuizOption['id']
  en: string
  vi: string
}

export interface PublicSlide {
  questionId: number
  options: PublicQuizOption[]
}

export interface StartMockAttemptResult {
  attemptId: string
  startedAt: string
  slides: PublicSlide[]
}

export interface MockPick {
  questionId: number
  selectedOption: QuizOption['id']
}

export interface FinalizeMockAttemptResult {
  score: number
  total: number
  passed: boolean
  manifest: { qid: number; correct: QuizOption['id'] }[]
}
