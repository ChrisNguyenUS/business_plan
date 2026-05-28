'use server'

// Mock-test server actions. The data layer for /n400app/mock-test:
//   - startMockAttempt    builds the slide manifest server-side and persists it.
//                         The browser receives slides with NO `isCorrect` flag,
//                         so a tampered client cannot mark itself right.
//   - finalizeMockAttempt replays the user's picks through the server-side
//                         checker (`submit_mock_answer` RPC, which reads the
//                         manifest and derives was_correct itself), then calls
//                         `finalize_mock_attempt` to stamp score/passed.
//
// Why server-side build of options: buildOptions is deterministic given a
// seed, but the seed alone is not enough — the user's stateCode (for Q23/
// Q61/Q62) and the per-question correct-answer roll are inputs the client
// shouldn't be trusted to compute. So we run buildOptions here, store the
// answer key in slide_manifest, and only send the option labels + text to
// the client.
//
// Public types live in ./types.ts. Next.js requires `'use server'` modules
// to export only async functions — so type/interface exports must live in
// a separate module.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import {
  buildOptions,
  selectMockTestQuestions,
  MOCK_TEST_QUESTION_COUNT,
  type QuizOption,
} from '@/lib/n400/quiz-engine'
import type { StateCode } from '@/lib/n400/state-data'
import { evaluateAfterAttempt, evaluateAfterStreak } from '@/lib/n400/badges/actions'
import type {
  PublicSlide,
  StartMockAttemptResult,
  MockPick,
  FinalizeMockAttemptResult,
} from './types'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )
}

export async function startMockAttempt(): Promise<StartMockAttemptResult> {
  const supabase = await getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')

  // Pull the user's resolved state + district for location-based correct-answer lookup.
  const { data: profile } = await supabase
    .from('n400_user_profile')
    .select('state_code,district_number')
    .eq('user_id', user.id)
    .maybeSingle()
  const stateCode = ((profile?.state_code as StateCode | null) ?? 'TX') as StateCode
  const districtNumber = (profile?.district_number as number | null) ?? null

  const seed = `${Date.now()}-${user.id}`
  // Skip Q29 (your U.S. Representative) when district is unresolved — without
  // it the question has no buildable answer for this user.
  const questions = selectMockTestQuestions(seed).filter(
    (q) => q.id !== 29 || districtNumber !== null,
  )

  // Build the slides server-side. The manifest stores ONLY the answer key.
  const slides: PublicSlide[] = []
  const manifest: { qid: number; correct: QuizOption['id'] }[] = []
  for (const q of questions) {
    const options = buildOptions(q, stateCode, `mock-${seed}-${q.id}`, districtNumber)
    const correct = options.find((o) => o.isCorrect)
    if (!correct) {
      // Should never happen — buildOptions always shuffles in the correct one.
      throw new Error(`quiz-engine: no correct option built for q${q.id}`)
    }
    manifest.push({ qid: q.id, correct: correct.id })
    slides.push({
      questionId: q.id,
      options: options.map((o) => ({ id: o.id, en: o.en, vi: o.vi })),
    })
  }

  const startedAt = new Date().toISOString()
  const { data: attempt, error } = await supabase
    .from('n400_quiz_attempts')
    .insert({
      user_id: user.id,
      mode: 'mock_test',
      total_questions: MOCK_TEST_QUESTION_COUNT,
      slide_manifest: manifest,
      started_at: startedAt,
    })
    .select('id')
    .single()
  if (error || !attempt) {
    throw new Error(`failed to start attempt: ${error?.message ?? 'unknown error'}`)
  }

  return { attemptId: attempt.id, startedAt, slides }
}

export async function finalizeMockAttempt(
  attemptId: string,
  picks: MockPick[],
): Promise<FinalizeMockAttemptResult> {
  const supabase = await getSupabase()

  // Replay each pick through the server-side checker, then finalize.
  // The 20 RPCs run sequentially because submit_mock_answer inserts an
  // n400_question_attempts row each time and the finalize RPC needs to
  // see all of them. Concurrency would risk losing rows on retry.
  for (const pick of picks) {
    const { error } = await supabase.rpc('submit_mock_answer', {
      p_attempt_id: attemptId,
      p_question_id: pick.questionId,
      p_selected_option: pick.selectedOption,
    })
    if (error) throw new Error(`submit_mock_answer failed (q${pick.questionId}): ${error.message}`)
  }

  const { data, error } = await supabase.rpc('finalize_mock_attempt', {
    p_attempt_id: attemptId,
  })
  if (error) throw new Error(`finalize_mock_attempt failed: ${error.message}`)
  const r = data as {
    score?: number
    total?: number
    passed?: boolean
    current_streak?: number
    longest_streak?: number
    milestone?: number | null
  }

  // Round-trip the manifest so the result page can render "correct answer
  // was X" without an additional fetch. RLS already restricts SELECT to the
  // owning user, so this read is safe.
  const { data: row } = await supabase
    .from('n400_quiz_attempts')
    .select('slide_manifest')
    .eq('id', attemptId)
    .maybeSingle()
  const manifest = (row?.slide_manifest ?? []) as {
    qid: number
    correct: QuizOption['id']
  }[]

  return {
    score: Number(r?.score ?? 0),
    total: Number(r?.total ?? MOCK_TEST_QUESTION_COUNT),
    passed: Boolean(r?.passed),
    manifest,
    currentStreak: Number(r?.current_streak ?? 0),
    longestStreak: Number(r?.longest_streak ?? 0),
    milestone: r?.milestone ?? null,
    unlockedBadges: await evaluateMockUnlocks(attemptId, r?.milestone ?? null, Number(r?.current_streak ?? 0)),
  }
}

// Run the badge dispatcher for both triggers fired by a finished mock
// attempt: session_complete (mode=mock_test) plus streak_change when
// the RPC reported a milestone crossing. Errors are swallowed inside
// the action wrappers, so this can never block finalize.
async function evaluateMockUnlocks(
  attemptId: string,
  milestone: number | null,
  currentStreak: number,
): Promise<string[]> {
  const sessionUnlocks = await evaluateAfterAttempt('mock_test', attemptId)
  if (milestone === null) return sessionUnlocks
  const streakUnlocks = await evaluateAfterStreak(currentStreak)
  // Dedupe across triggers — streak-N can show up in either path.
  return [...new Set([...sessionUnlocks, ...streakUnlocks])]
}

