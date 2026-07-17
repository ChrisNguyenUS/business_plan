'use server'

// Mock-test server actions. The data layer for /n400ready/mock-test:
//   - startMockAttempt    replays the client's seed through the SAME
//                         deterministic builders (selectMockTestQuestions +
//                         buildOptions) and persists the answer key as the
//                         slide_manifest. The client builds its slides locally
//                         from that seed for an instant start (same approach
//                         as the full interview) and registers the attempt
//                         here in the background — grading still happens
//                         server-side against this manifest.
//   - finalizeMockAttempt replays the user's picks through the server-side
//                         checker in ONE round trip (`finalize_mock_attempt_batch`
//                         RPC, which derives was_correct from the manifest,
//                         stamps score/passed/streak, and returns the manifest).
//
// Public types live in ./types.ts. Next.js requires `'use server'` modules
// to export only async functions — so type/interface exports must live in
// a separate module.

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { after } from 'next/server'
import { createHash } from 'node:crypto'

import {
  buildOptions,
  selectMockTestQuestions,
  MOCK_TEST_QUESTION_COUNT,
  type QuizOption,
} from '@/lib/n400/quiz-engine'
import type { StateCode } from '@/lib/n400/state-data'
import { evaluateAfterAttempt, evaluateAfterStreak } from '@/lib/n400/badges/actions'
import { sendCapiEvent } from '@/lib/analytics/meta-capi'
import type {
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

export async function startMockAttempt(input: {
  seed: string
  stateCode: StateCode
  districtNumber: number | null
}): Promise<StartMockAttemptResult> {
  const supabase = await getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')

  // The client generated these and built its slides from them; replaying the
  // same inputs here yields an identical option set, so the stored manifest
  // matches what the user actually saw. Guard against garbage input.
  const { seed, stateCode, districtNumber } = input
  if (typeof seed !== 'string' || seed.length === 0 || seed.length > 64) {
    throw new Error('invalid seed')
  }
  if (districtNumber !== null && !Number.isInteger(districtNumber)) {
    throw new Error('invalid district')
  }

  // Skip Q29 (your U.S. Representative) when district is unresolved — without
  // it the question has no buildable answer for this user.
  const questions = selectMockTestQuestions(seed).filter(
    (q) => q.id !== 29 || districtNumber !== null,
  )

  // Replay the option build server-side. The manifest stores ONLY the answer key.
  const manifest: { qid: number; correct: QuizOption['id'] }[] = []
  for (const q of questions) {
    const options = buildOptions(q, stateCode, `mock-${seed}-${q.id}`, districtNumber)
    const correct = options.find((o) => o.isCorrect)
    if (!correct) {
      // Should never happen — buildOptions always shuffles in the correct one.
      throw new Error(`quiz-engine: no correct option built for q${q.id}`)
    }
    manifest.push({ qid: q.id, correct: correct.id })
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

  return { attemptId: attempt.id, startedAt }
}

export async function finalizeMockAttempt(
  attemptId: string,
  picks: MockPick[],
): Promise<FinalizeMockAttemptResult> {
  const supabase = await getSupabase()

  // One RPC does it all: replays every pick against the server-built
  // manifest, stamps score/passed/streak, and returns the manifest for
  // the result screen. The v1 flow (20 sequential submit_mock_answer
  // calls + finalize + manifest re-read) cost ~22 round trips and left
  // the user staring at "Đang chấm bài..." for seconds.
  const { data, error } = await supabase.rpc('finalize_mock_attempt_batch', {
    p_attempt_id: attemptId,
    p_picks: picks.map((p) => ({ qid: p.questionId, selected: p.selectedOption })),
  })
  if (error) {
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(error, { tags: { feature: 'n400-finalize', step: 'finalize_batch_rpc' } })
    } catch {}
    throw new Error(`finalize_mock_attempt_batch failed: ${error.message}`)
  }
  const r = data as {
    score?: number
    total?: number
    passed?: boolean
    current_streak?: number
    longest_streak?: number
    milestone?: number | null
    manifest?: { qid: number; correct: QuizOption['id'] }[]
  }
  const manifest = r?.manifest ?? []

  return {
    score: Number(r?.score ?? 0),
    total: Number(r?.total ?? MOCK_TEST_QUESTION_COUNT),
    passed: Boolean(r?.passed),
    manifest,
    currentStreak: Number(r?.current_streak ?? 0),
    longestStreak: Number(r?.longest_streak ?? 0),
    milestone: r?.milestone ?? null,
    unlockedBadges: await evaluateMockUnlocks(attemptId, r?.milestone ?? null, Number(r?.current_streak ?? 0), Boolean(r?.passed), Number(r?.score ?? 0), Number(r?.total ?? MOCK_TEST_QUESTION_COUNT)),
  }
}

// Run the badge dispatcher for both triggers fired by a finished mock
// attempt: session_complete (mode=mock_test) plus streak_change when
// the RPC reported a milestone crossing. The two triggers are
// independent, so they run concurrently. Errors are swallowed inside
// the action wrappers, so this can never block finalize.
//
// The n400_mock_test_pass Meta CAPI event (fired on pass) is scheduled
// via after() — it's pure analytics with no bearing on the response, so
// it must not add its external HTTP latency to the result screen.
// Deterministic event_id = sha256("n400-pass:" + attemptId) so a
// retried finalize (e.g. network blip on the client retry) hashes to
// the same id and Meta dedupes. Non-blocking: CAPI errors don't
// surface here.
async function evaluateMockUnlocks(
  attemptId: string,
  milestone: number | null,
  currentStreak: number,
  passed: boolean,
  score: number,
  total: number,
): Promise<string[]> {
  const [sessionUnlocks, streakUnlocks] = await Promise.all([
    evaluateAfterAttempt('mock_test', attemptId),
    milestone === null ? Promise.resolve([]) : evaluateAfterStreak(currentStreak),
  ])

  if (passed) {
    after(async () => {
      try {
        const supabase = await getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const headerStore = await headers()
          const eventId = createHash('sha256').update(`n400-pass:${attemptId}`).digest('hex').slice(0, 32)
          await sendCapiEvent({
            eventName: 'n400_mock_test_pass',
            eventId,
            eventSourceUrl: headerStore.get('referer') ?? 'https://mannaos.com/n400ready/mock-test',
            user: {
              emails: user.email ? [user.email] : undefined,
              clientIp: headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
              clientUserAgent: headerStore.get('user-agent') ?? null,
            },
            customData: { score, total_questions: total },
          })
        }
      } catch {
        // CAPI errors already log inside sendCapiEvent.
      }
    })
  }

  return [...new Set([...sessionUnlocks, ...streakUnlocks])]
}

