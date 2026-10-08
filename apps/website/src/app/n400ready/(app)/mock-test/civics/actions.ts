'use server'

// Mock-test server actions. The data layer for /n400ready/mock-test:
//   - startMockAttempt    replays the client's seed through the shared builder
//                         (civics-mock-slides.ts, kind 'civics' or 'full') and
//                         stores the answer key as the slide_manifest, inserting
//                         with the service role: the owner cannot insert
//                         mock_test rows (n400_37). The client builds its slides
//                         from the same seed for an instant start and registers
//                         the attempt here in the background.
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
  MOCK_TEST_QUESTION_COUNT,
  type QuizOption,
} from '@/lib/n400/quiz-engine'
import { civicsMockAnswerKey, civicsMockSlides, type CivicsMockKind } from '@/lib/n400/civics-mock-slides'
import { parseMockKind, parseStartMockInput } from '@/lib/n400/civics-mock-input'
import type { StateCode } from '@/lib/n400/state-data'
import { evaluateAfterAttempt, evaluateAfterStreak } from '@/lib/n400/badges/actions'
import { sendCapiEvent } from '@/lib/analytics/meta-capi'
import { createServerSupabaseClient } from '@/lib/supabase'
import { runVoiceFinalize } from '@/lib/n400/oral/finalize-voice-mock'
import type {
  StartMockAttemptResult,
  MockPick,
  FinalizeMockAttemptResult,
  FinalizeVoiceMockAttemptResult,
  VoiceMockAnswer,
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
  kind: CivicsMockKind
  seed: string
  stateCode: StateCode
  districtNumber: number | null
}): Promise<StartMockAttemptResult> {
  const supabase = await getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')

  // The client built its slides from these inputs; the shared builder gives the
  // answer key it was dealt (spec §2.1). Untrusted input, so parse it first.
  const { kind, seed, stateCode, districtNumber } = parseStartMockInput(input)
  const manifest = civicsMockAnswerKey(civicsMockSlides(kind, seed, stateCode, districtNumber))

  // Service role: since n400_37 the owner cannot insert mock_test rows, so an
  // answer key can only come from this builder (spec §2.2).
  const startedAt = new Date().toISOString()
  const { data: attempt, error } = await createServerSupabaseClient()
    .from('n400_quiz_attempts')
    .insert({
      user_id: user.id,
      mode: 'mock_test',
      total_questions: manifest.length,
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
  kind: CivicsMockKind = 'civics',
): Promise<FinalizeMockAttemptResult> {
  const capi = parseMockKind(kind) === 'civics'
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
    unlockedBadges: await evaluateMockUnlocks(attemptId, r?.milestone ?? null, Number(r?.current_streak ?? 0), Boolean(r?.passed), Number(r?.score ?? 0), Number(r?.total ?? MOCK_TEST_QUESTION_COUNT), capi),
  }
}

// Voice mock finalize (spec §6). The client sends transcripts only; grading
// happens here (grade-voice-mock.ts), and the RPC runs as service_role because
// it trusts the computed was_correct. Owner checks run in runVoiceFinalize and
// again inside the RPC.
export async function finalizeVoiceMockAttempt(
  attemptId: string,
  answers: VoiceMockAnswer[],
  kind: CivicsMockKind = 'civics',
): Promise<FinalizeVoiceMockAttemptResult> {
  const capi = parseMockKind(kind) === 'civics'
  const supabase = await getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const admin = createServerSupabaseClient()

  let run: Awaited<ReturnType<typeof runVoiceFinalize>>
  try {
    run = await runVoiceFinalize(
      {
        userId: user?.id ?? null,
        loadAttempt: async (id) => {
          const { data } = await admin
            .from('n400_quiz_attempts')
            .select('user_id, mode, slide_manifest')
            .eq('id', id)
            .maybeSingle()
          return data
        },
        loadLocation: async (uid) => {
          const { data } = await admin
            .from('n400_user_profile')
            .select('state_code, district_number')
            .eq('user_id', uid)
            .maybeSingle()
          return data
        },
        finalizeRpc: async (args) => {
          const { data, error } = await admin.rpc('finalize_mock_attempt_voice_batch', args)
          if (error) throw new Error(error.message)
          return (data ?? {}) as Record<string, unknown>
        },
      },
      attemptId,
      answers,
    )
  } catch (error) {
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(error, { tags: { feature: 'n400-finalize', step: 'finalize_voice_batch' } })
    } catch {}
    throw new Error(`finalize_mock_attempt_voice_batch failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }

  const r = run.rpc as {
    score?: number
    total?: number
    passed?: boolean
    current_streak?: number
    longest_streak?: number
    milestone?: number | null
    manifest?: { qid: number; correct: QuizOption['id'] }[]
  }
  return {
    score: Number(r.score ?? 0),
    total: Number(r.total ?? MOCK_TEST_QUESTION_COUNT),
    passed: Boolean(r.passed),
    manifest: r.manifest ?? [],
    currentStreak: Number(r.current_streak ?? 0),
    longestStreak: Number(r.longest_streak ?? 0),
    milestone: r.milestone ?? null,
    unlockedBadges: await evaluateMockUnlocks(
      attemptId,
      r.milestone ?? null,
      Number(r.current_streak ?? 0),
      Boolean(r.passed),
      Number(r.score ?? 0),
      Number(r.total ?? MOCK_TEST_QUESTION_COUNT),
      capi,
    ),
    answers: run.results.map((x) => ({ qid: x.qid, wasCorrect: x.was_correct, transcript: x.transcript })),
  }
}

// Run the badge dispatcher for both triggers fired by a finished mock
// attempt: session_complete (mode=mock_test) plus streak_change when
// the RPC reported a milestone crossing. The two triggers are
// independent, so they run concurrently. Errors are swallowed inside
// the action wrappers, so this can never block finalize.
//
// The n400_mock_test_pass Meta CAPI event (fired on a standalone pass only — the Full interview's Civics part sends kind 'full', spec §0) is scheduled
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
  capi: boolean,
): Promise<string[]> {
  const [sessionUnlocks, streakUnlocks] = await Promise.all([
    evaluateAfterAttempt('mock_test', attemptId),
    milestone === null ? Promise.resolve([]) : evaluateAfterStreak(currentStreak),
  ])

  if (passed && capi) {
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

