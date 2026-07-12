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
  // Streak fields stamped server-side inside finalize_mock_attempt.
  // `milestone` fires once when current_streak crosses 3/7/14/30/60/100.
  currentStreak: number
  longestStreak: number
  milestone: number | null
  // Slugs newly inserted by the badge dispatcher (Phase 6B). Empty
  // array when the user earned no new badges this attempt. Drives the
  // BadgeUnlockToast on the result screen.
  unlockedBadges: string[]
}
