# N400 Civics Oral Answers — Slice 3 (Mock) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learners can take the Civics mock test by voice (typed in in-app browsers, or once the mic is lost mid-test). The server grades every answer and the result counts toward readiness, badges and CAPI immediately.

**Architecture:**
- **Migration `n400_33`:** adds `n400_question_attempts.transcript` and moves the body of `finalize_mock_attempt` unchanged into an internal `n400_finalize_mock_core`. It also adds a service-role-only RPC `finalize_mock_attempt_voice_batch` that takes the owner explicitly, and seeds the `voice_mock` flag.
- **Grading:** a pure, node-tested module `grade-voice-mock.ts` validates untrusted client answers against the attempt's manifest and grades them with the Slice 1 engine. A second tested module, `finalize-voice-mock.ts` (dependencies injected), runs the ownership checks and the RPC call.
- **Server action:** `finalizeVoiceMockAttempt` wires the real Supabase clients.
- **Mock page:** gains a mode choice and per-item mic/typed/MC answering, and shows the transcript on the result screen.

**Tech Stack:** Next.js 16 server actions + client components, Supabase (Postgres plpgsql, service-role client), TypeScript, vitest 2 (node).

**Spec:** `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` rev 3.4. Read D4, D5, D9, D12, D14, §6 (incl. "Rev 3.4 additions"), §7, §8, §11, §12 first. Slice 2 plan (for the existing oral modules): `docs/superpowers/plans/2026-09-24-n400-oral-answers-slice-2-practice.md`.

## Global Constraints

- All app code lives in `apps/website/`; run every command from `apps/website/`.
- vitest runs in **node** (no DOM). Full gate: `npm run type-check && npm run test && npm run build`. `src/components/n400/mobile-layout.test.ts` already fails on `main` (a known stale test). That one failure is pre-existing; any other is yours.
- **The client never sends a verdict** (§6 invariant). `was_correct` is computed only on the server in `grade-voice-mock.ts`. The mock page must not import `gradeOralAnswer`.
- In mock, `near` is **wrong** (§6 step 3). No verdict is shown mid-test. Retry ("Nói lại") is allowed **once** per mic item. Errors never consume it (§8).
- The server accepts `selected` **only** for questions with no oral config for the learner's location. Every other item needs a transcript (rev 3.4).
- Location on the server: `n400_user_profile.state_code ?? 'TX'` + `district_number` (rev 3.4).
- Transcripts are trimmed and capped at **500** characters on the server (rev 3.4).
- Attempt `answer_mode`: `'voice'` if any item was answered by mic, else `'typed'` (rev 3.4).
- The voice RPC is `SECURITY DEFINER`: `REVOKE … FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE … TO service_role` only. It is called only through `createServerSupabaseClient()` (`@/lib/supabase`).
- `finalize_mock_attempt` behavior for MC callers must stay **byte-for-byte the same in effect** (the body moves unchanged into the core).
- `voice_mock` is seeded `enabled = FALSE`. Applying the migration to the shared Supabase project and changing flags are outward actions: **ask the owner first**.
- Slice 4 owns analytics (`n400_oral_answer`, `trackMockTestStart(answer_mode)`) and the Privacy Policy. Don't add them here.
- Storage access is always wrapped in try/catch.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. The client sends a `selected` option for a question that has an oral config, trying to bypass speaking. That item must grade wrong (Task 2 test `a choice for a gradable question is wrong`).
2. The client omits items or sends qids outside the attempt. The score must never rise and the total must stay the manifest length (Task 2 tests `missing manifest items are graded wrong` and `ignores qids outside the manifest`).
3. The mic dies mid-test (not-allowed / stalled / unavailable). The learner must be able to finish by typing instead of losing the attempt (Task 7 test `mic lost switches the rest to typed`).
4. A finalize is retried after a network blip. It must not double-insert, and it must return the same score (RPC idempotence, Task 1 step 4 check `second call returns the stored result`).
5. A profile with no `state_code`. The server must grade location questions with `'TX'`, like the client (Task 3 test `uses TX when the profile has no state`).

---

### Task 1: Migration `n400_33_voice_mock.sql`

**Files:**
- Create: `apps/website/supabase/migrations/n400_33_voice_mock.sql`

**Interfaces:**
- Consumes: `n400_quiz_attempts` (with `answer_mode`, n400_32), `n400_question_attempts`, `n400_user_profile`, `finalize_mock_attempt` (n400_09), `n400_feature_flags`.
- Produces:
  - column `n400_question_attempts.transcript TEXT NULL`;
  - internal `n400_finalize_mock_core(p_attempt_id uuid) RETURNS jsonb` (no grants);
  - `finalize_mock_attempt(p_attempt_id uuid)` = owner check + core (same behavior);
  - `finalize_mock_attempt_voice_batch(p_attempt_id uuid, p_user_id uuid, p_answer_mode text, p_results jsonb) RETURNS jsonb`, where `p_results = [{qid, was_correct, transcript}]`; returns `{score, total, passed, current_streak, longest_streak, milestone, manifest}`; `service_role` only;
  - flag row `voice_mock` (disabled).

- [ ] **Step 1: Write the migration**

Create `apps/website/supabase/migrations/n400_33_voice_mock.sql`:

```sql
-- N400 Civics oral answers — Slice 3 (mock).
-- Spec: docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §6–§7 (rev 3.4).

ALTER TABLE public.n400_question_attempts
  ADD COLUMN IF NOT EXISTS transcript TEXT NULL;

-- Body of finalize_mock_attempt (n400_09) moved here unchanged, minus the
-- auth.uid() owner check: the voice RPC runs as service_role, where auth.uid()
-- is NULL. Callers are responsible for the owner check. No grants.
CREATE OR REPLACE FUNCTION public.n400_finalize_mock_core(p_attempt_id uuid)
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
  v_done    timestamptz;
  v_today   date := (now() AT TIME ZONE 'UTC')::date;
  v_last    date;
  v_curr    int;
  v_long    int;
  v_new_curr int;
  v_new_long int;
  v_milestone int;
BEGIN
  SELECT user_id, completed_at INTO v_user_id, v_done
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'attempt not found';
  END IF;

  IF v_done IS NOT NULL THEN
    SELECT score, total_questions, passed
    INTO v_score, v_total, v_passed
    FROM n400_quiz_attempts WHERE id = p_attempt_id;
    SELECT current_streak, longest_streak
    INTO v_new_curr, v_new_long
    FROM n400_user_profile WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'score', v_score, 'total', v_total, 'passed', v_passed,
      'current_streak', COALESCE(v_new_curr, 0),
      'longest_streak', COALESCE(v_new_long, 0),
      'milestone', NULL
    );
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

  SELECT current_streak, longest_streak, last_activity_date
  INTO v_curr, v_long, v_last
  FROM n400_user_profile WHERE user_id = v_user_id;
  v_curr := COALESCE(v_curr, 0);
  v_long := COALESCE(v_long, 0);

  IF v_last = v_today THEN
    v_new_curr := v_curr;
  ELSIF v_last = v_today - INTERVAL '1 day' THEN
    v_new_curr := v_curr + 1;
  ELSE
    v_new_curr := 1;
  END IF;
  v_new_long := GREATEST(v_long, v_new_curr);

  -- Milestone: only fire when this update CROSSES the threshold (so a user
  -- who drops streak then climbs back up still gets the celebration).
  v_milestone := CASE
    WHEN v_new_curr > v_curr AND v_new_curr IN (3, 7, 14, 30, 60, 100) THEN v_new_curr
    ELSE NULL
  END;

  INSERT INTO n400_user_profile (user_id, current_streak, longest_streak, last_activity_date, updated_at)
  VALUES (v_user_id, v_new_curr, v_new_long, v_today, now())
  ON CONFLICT (user_id) DO UPDATE
  SET current_streak = EXCLUDED.current_streak,
      longest_streak = EXCLUDED.longest_streak,
      last_activity_date = EXCLUDED.last_activity_date,
      updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'score', v_score, 'total', v_total, 'passed', v_passed,
    'current_streak', v_new_curr,
    'longest_streak', v_new_long,
    'milestone', v_milestone
  );
END;
$$;

REVOKE ALL ON FUNCTION public.n400_finalize_mock_core(uuid) FROM PUBLIC, anon, authenticated;

-- Same behavior as before for MC callers: owner check, then the core.
CREATE OR REPLACE FUNCTION public.finalize_mock_attempt(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM n400_quiz_attempts WHERE id = p_attempt_id;
  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN public.n400_finalize_mock_core(p_attempt_id);
END;
$$;

-- Voice mock finalize. Trusts caller-supplied was_correct, so service_role only;
-- the server action grades (grade-voice-mock.ts) and passes the owner explicitly.
-- Idempotent like finalize_mock_attempt_batch: a finalized attempt skips the
-- inserts and returns the stored result.
CREATE OR REPLACE FUNCTION public.finalize_mock_attempt_voice_batch(
  p_attempt_id uuid,
  p_user_id uuid,
  p_answer_mode text,
  p_results jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid;
  v_mode      text;
  v_completed timestamptz;
  v_manifest  jsonb;
  v_bad_qid   int;
  v_result    jsonb;
BEGIN
  IF p_answer_mode IS NULL OR p_answer_mode NOT IN ('voice', 'typed') THEN
    RAISE EXCEPTION 'invalid answer_mode';
  END IF;

  SELECT user_id, mode, completed_at, slide_manifest
  INTO v_user_id, v_mode, v_completed, v_manifest
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS NULL OR v_user_id IS DISTINCT FROM p_user_id OR v_mode IS DISTINCT FROM 'mock_test' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF v_completed IS NULL THEN
    SELECT (r->>'qid')::int INTO v_bad_qid
    FROM jsonb_array_elements(COALESCE(p_results, '[]'::jsonb)) AS r
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(v_manifest, '[]'::jsonb)) AS slide
      WHERE (slide->>'qid')::int = (r->>'qid')::int
    )
    LIMIT 1;
    IF v_bad_qid IS NOT NULL THEN
      RAISE EXCEPTION 'question % not in attempt manifest', v_bad_qid;
    END IF;

    INSERT INTO n400_question_attempts (attempt_id, question_id, was_correct, transcript)
    SELECT DISTINCT ON ((r->>'qid')::int)
      p_attempt_id,
      (r->>'qid')::int,
      COALESCE((r->>'was_correct')::boolean, false),
      left(r->>'transcript', 500)
    FROM jsonb_array_elements(COALESCE(p_results, '[]'::jsonb)) AS r
    WHERE NOT EXISTS (
      SELECT 1 FROM n400_question_attempts qa
      WHERE qa.attempt_id = p_attempt_id
        AND qa.question_id = (r->>'qid')::int
    )
    ORDER BY (r->>'qid')::int;

    UPDATE n400_quiz_attempts SET answer_mode = p_answer_mode WHERE id = p_attempt_id;
  END IF;

  v_result := public.n400_finalize_mock_core(p_attempt_id);
  RETURN v_result || jsonb_build_object('manifest', COALESCE(v_manifest, '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_mock_attempt_voice_batch(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_mock_attempt_voice_batch(uuid, uuid, text, jsonb) TO service_role;

INSERT INTO public.n400_feature_flags (flag_key, enabled, rollout_pct, note) VALUES
  ('voice_mock', FALSE, 100, 'Civics mock test by voice (mic + typed). Counts toward readiness/badges/CAPI. Kill switch.')
ON CONFLICT (flag_key) DO NOTHING;
```

- [ ] **Step 2: Commit the file**

```bash
git add supabase/migrations/n400_33_voice_mock.sql
git commit -m "$(cat <<'EOF'
feat(n400app): migration n400_33 — voice mock RPC, shared finalize core

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Apply — ask the owner first**

After the owner confirms, apply with MCP `apply_migration` (name `n400_33_voice_mock`, the file body as `query`).

- [ ] **Step 4: Verify privileges and behavior (rolled back)**

Run with MCP `execute_sql`, one statement per call:

```sql
SELECT
  has_function_privilege('authenticated', 'public.finalize_mock_attempt_voice_batch(uuid,uuid,text,jsonb)', 'EXECUTE') AS auth_voice,
  has_function_privilege('anon', 'public.finalize_mock_attempt_voice_batch(uuid,uuid,text,jsonb)', 'EXECUTE') AS anon_voice,
  has_function_privilege('service_role', 'public.finalize_mock_attempt_voice_batch(uuid,uuid,text,jsonb)', 'EXECUTE') AS svc_voice,
  has_function_privilege('authenticated', 'public.n400_finalize_mock_core(uuid)', 'EXECUTE') AS auth_core,
  has_function_privilege('authenticated', 'public.finalize_mock_attempt(uuid)', 'EXECUTE') AS auth_mc;
```

Expected: `auth_voice=false, anon_voice=false, svc_voice=true, auth_core=false, auth_mc=true`.

Then run a behavior check that rolls itself back by raising at the end. It uses the admin test account `fb1d074c-d74a-4d78-ba0e-f0c6e0c61c66`; nothing persists:

```sql
DO $$
DECLARE
  v_uid uuid := 'fb1d074c-d74a-4d78-ba0e-f0c6e0c61c66';
  v_mc uuid; v_voice uuid; r_mc jsonb; r_voice jsonb; r_again jsonb; v_other text := 'ok';
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  INSERT INTO n400_quiz_attempts (user_id, mode, total_questions, slide_manifest, started_at)
  VALUES (v_uid, 'mock_test', 2, '[{"qid":2,"correct":"A"},{"qid":7,"correct":"B"}]', now()) RETURNING id INTO v_mc;
  r_mc := public.finalize_mock_attempt_batch(v_mc, '[{"qid":2,"selected":"A"},{"qid":7,"selected":"C"}]');

  INSERT INTO n400_quiz_attempts (user_id, mode, total_questions, slide_manifest, started_at)
  VALUES (v_uid, 'mock_test', 2, '[{"qid":2,"correct":"A"},{"qid":7,"correct":"B"}]', now()) RETURNING id INTO v_voice;
  BEGIN
    PERFORM public.finalize_mock_attempt_voice_batch(v_voice, gen_random_uuid(), 'voice', '[]');
    v_other := 'NOT REJECTED';
  EXCEPTION WHEN OTHERS THEN v_other := 'rejected: ' || SQLERRM;
  END;
  r_voice := public.finalize_mock_attempt_voice_batch(v_voice, v_uid, 'voice',
    '[{"qid":2,"was_correct":true,"transcript":"the constitution"},{"qid":7,"was_correct":false,"transcript":"26"}]');
  r_again := public.finalize_mock_attempt_voice_batch(v_voice, v_uid, 'voice', '[]');

  RAISE EXCEPTION 'CHECK mc=% | other_user=% | voice=% | again_score=% | mode=% | rows=% | transcript=%',
    r_mc->>'score', v_other, r_voice->>'score', r_again->>'score',
    (SELECT answer_mode FROM n400_quiz_attempts WHERE id = v_voice),
    (SELECT count(*) FROM n400_question_attempts WHERE attempt_id = v_voice),
    (SELECT transcript FROM n400_question_attempts WHERE attempt_id = v_voice AND question_id = 2);
END $$;
```

Expected: an error whose message reads `CHECK mc=1 | other_user=rejected: unauthorized | voice=1 | again_score=1 | mode=voice | rows=2 | transcript=the constitution`. MC scoring is unchanged. Another user's id is rejected. A second call returns the stored result without double-inserting (`rows=2`). The raise rolls everything back.

---

### Task 2: Server-side grading of voice mock answers — `grade-voice-mock.ts`

**Files:**
- Create: `apps/website/src/lib/n400/oral/grade-voice-mock.ts`
- Test: `apps/website/src/lib/n400/oral/grade-voice-mock.test.ts`

**Interfaces:**
- Consumes: `getOralAnswerConfig`, `OralLocation` (`./get-oral-config`); `gradeOralAnswer` (`./grade-oral`); `QuizOption` (`../quiz-engine`).
- Produces:
  - `type SpokenMockAnswer = { qid: number; transcript: string; retried: boolean; input: 'mic' | 'typed' }`
  - `type ChoiceMockAnswer = { qid: number; selected: QuizOption['id'] }`
  - `type VoiceMockAnswer = SpokenMockAnswer | ChoiceMockAnswer`
  - `interface MockManifestItem { qid: number; correct: QuizOption['id'] }`
  - `interface GradedMockItem { qid: number; was_correct: boolean; transcript: string | null }`
  - `MAX_TRANSCRIPT = 500`
  - `gradeVoiceMock(answers: unknown, manifest: readonly MockManifestItem[], location: OralLocation): { results: GradedMockItem[]; answerMode: 'voice' | 'typed' }`

- [ ] **Step 1: Write the failing tests**

Create `apps/website/src/lib/n400/oral/grade-voice-mock.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gradeVoiceMock, MAX_TRANSCRIPT, type VoiceMockAnswer } from './grade-voice-mock';

const TX = { stateCode: 'TX' as const, districtNumber: null };
const DC = { stateCode: 'DC' as const, districtNumber: null };
const manifest = [
  { qid: 2, correct: 'A' as const },
  { qid: 7, correct: 'B' as const },
];
const spoken = (qid: number, transcript: string, input: 'mic' | 'typed' = 'mic'): VoiceMockAnswer => ({
  qid,
  transcript,
  retried: false,
  input,
});

describe('gradeVoiceMock (spec §6, rev 3.4)', () => {
  it('grades transcripts on the server; near counts as wrong', () => {
    const { results } = gradeVoiceMock([spoken(2, 'the constitution'), spoken(7, 'twenty six')], manifest, TX);
    expect(results).toEqual([
      { qid: 2, was_correct: true, transcript: 'the constitution' },
      { qid: 7, was_correct: false, transcript: 'twenty six' },
    ]);
    expect(gradeVoiceMock([spoken(2, 'the institution')], manifest, TX).results[0].was_correct).toBe(false);
  });

  it('a choice for a gradable question is wrong', () => {
    const { results } = gradeVoiceMock([{ qid: 2, selected: 'A' }], manifest, TX);
    expect(results[0]).toEqual({ qid: 2, was_correct: false, transcript: null });
  });

  it('questions with no oral config are answered by choice against the manifest', () => {
    const dcManifest = [{ qid: 62, correct: 'C' as const }, { qid: 23, correct: 'A' as const }];
    const { results } = gradeVoiceMock(
      [{ qid: 62, selected: 'C' }, spoken(23, 'none')],
      dcManifest,
      DC,
    );
    expect(results).toEqual([
      { qid: 62, was_correct: true, transcript: null },
      { qid: 23, was_correct: false, transcript: null },
    ]);
  });

  it('missing manifest items are graded wrong', () => {
    const { results } = gradeVoiceMock([spoken(2, 'the constitution')], manifest, TX);
    expect(results).toHaveLength(2);
    expect(results[1]).toEqual({ qid: 7, was_correct: false, transcript: null });
  });

  it('ignores qids outside the manifest and keeps the first duplicate', () => {
    const { results } = gradeVoiceMock(
      [spoken(99, 'x'), spoken(2, 'the institution'), spoken(2, 'the constitution')],
      manifest,
      TX,
    );
    expect(results.map((r) => r.qid)).toEqual([2, 7]);
    expect(results[0].was_correct).toBe(false);
  });

  it('never throws on garbage input', () => {
    expect(gradeVoiceMock(null, manifest, TX).results.every((r) => !r.was_correct)).toBe(true);
    expect(gradeVoiceMock([null, 5, { qid: '2' }, { qid: 2, transcript: 42 }], manifest, TX).results).toEqual([
      { qid: 2, was_correct: false, transcript: null },
      { qid: 7, was_correct: false, transcript: null },
    ]);
  });

  it('trims and caps transcripts', () => {
    const long = `  the constitution ${'x'.repeat(MAX_TRANSCRIPT)}`;
    const t = gradeVoiceMock([spoken(2, long)], manifest, TX).results[0].transcript!;
    expect(t.length).toBe(MAX_TRANSCRIPT);
    expect(t.startsWith('the constitution')).toBe(true);
  });

  it('answer mode is voice if any mic item, else typed', () => {
    expect(gradeVoiceMock([spoken(2, 'a', 'typed'), spoken(7, 'b', 'mic')], manifest, TX).answerMode).toBe('voice');
    expect(gradeVoiceMock([spoken(2, 'a', 'typed')], manifest, TX).answerMode).toBe('typed');
  });

  it('the answer type carries no verdict (spec §6 invariant)', () => {
    // @ts-expect-error — VoiceMockAnswer must never accept a client verdict.
    const bad: VoiceMockAnswer = { qid: 2, transcript: 'x', retried: false, input: 'mic', was_correct: true };
    expect(bad).toBeDefined();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/n400/oral/grade-voice-mock.test.ts`
Expected: FAIL: `Failed to load url ./grade-voice-mock`.

- [ ] **Step 3: Implement**

Create `apps/website/src/lib/n400/oral/grade-voice-mock.ts`:

```ts
// Server-side grading of a voice mock (spec §6, rev 3.4). The client never sends
// a verdict: it sends transcripts (or, only for questions with no oral config,
// a multiple-choice pick) and this module decides was_correct. Input is
// untrusted, so every field is validated and nothing throws.

import type { QuizOption } from '../quiz-engine';
import { getOralAnswerConfig, type OralLocation } from './get-oral-config';
import { gradeOralAnswer } from './grade-oral';

export type SpokenMockAnswer = { qid: number; transcript: string; retried: boolean; input: 'mic' | 'typed' };
export type ChoiceMockAnswer = { qid: number; selected: QuizOption['id'] };
export type VoiceMockAnswer = SpokenMockAnswer | ChoiceMockAnswer;

export interface MockManifestItem {
  qid: number;
  correct: QuizOption['id'];
}

export interface GradedMockItem {
  qid: number;
  was_correct: boolean;
  transcript: string | null;
}

export const MAX_TRANSCRIPT = 500;

const OPTION_IDS: ReadonlySet<string> = new Set(['A', 'B', 'C', 'D']);

function firstAnswers(answers: unknown): Map<number, Record<string, unknown>> {
  const byQid = new Map<number, Record<string, unknown>>();
  if (!Array.isArray(answers)) return byQid;
  for (const a of answers) {
    if (typeof a !== 'object' || a === null) continue;
    const rec = a as Record<string, unknown>;
    if (typeof rec.qid !== 'number' || !Number.isInteger(rec.qid)) continue;
    if (!byQid.has(rec.qid)) byQid.set(rec.qid, rec);
  }
  return byQid;
}

export function gradeVoiceMock(
  answers: unknown,
  manifest: readonly MockManifestItem[],
  location: OralLocation,
): { results: GradedMockItem[]; answerMode: 'voice' | 'typed' } {
  const byQid = firstAnswers(answers);
  let anyMic = false;

  const results = manifest.map(({ qid, correct }): GradedMockItem => {
    const a = byQid.get(qid);
    const config = getOralAnswerConfig(qid, location);
    if (config === null) {
      const selected = a?.selected;
      const ok = typeof selected === 'string' && OPTION_IDS.has(selected) && selected === correct;
      return { qid, was_correct: ok, transcript: null };
    }
    if (typeof a?.transcript !== 'string') return { qid, was_correct: false, transcript: null };
    const transcript = a.transcript.trim().slice(0, MAX_TRANSCRIPT);
    if (a.input === 'mic') anyMic = true;
    return { qid, was_correct: gradeOralAnswer(transcript, config).verdict === 'correct', transcript };
  });

  return { results, answerMode: anyMic ? 'voice' : 'typed' };
}
```

- [ ] **Step 4: Run them to verify they pass, then type-check**

Run: `npx vitest run src/lib/n400/oral/grade-voice-mock.test.ts && npm run type-check`
Expected: PASS (9 tests); type-check 0. The `@ts-expect-error` line proves `was_correct` is rejected by the type.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/grade-voice-mock.ts src/lib/n400/oral/grade-voice-mock.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): server-side grading for voice mock answers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Finalize orchestration with injected dependencies — `finalize-voice-mock.ts`

**Files:**
- Create: `apps/website/src/lib/n400/oral/finalize-voice-mock.ts`
- Test: `apps/website/src/lib/n400/oral/finalize-voice-mock.test.ts`

**Interfaces:**
- Consumes: `gradeVoiceMock`, `GradedMockItem`, `MockManifestItem` (Task 2); `StateCode` (`../state-data`).
- Produces:
  - `interface VoiceFinalizeDeps { userId: string | null; loadAttempt(id: string): Promise<{ user_id: string; mode: string; slide_manifest: MockManifestItem[] | null } | null>; loadLocation(userId: string): Promise<{ state_code: string | null; district_number: number | null } | null>; finalizeRpc(args: VoiceFinalizeRpcArgs): Promise<Record<string, unknown>> }`
  - `interface VoiceFinalizeRpcArgs { p_attempt_id: string; p_user_id: string; p_answer_mode: 'voice' | 'typed'; p_results: GradedMockItem[] }`
  - `runVoiceFinalize(deps: VoiceFinalizeDeps, attemptId: unknown, answers: unknown): Promise<{ rpc: Record<string, unknown>; results: GradedMockItem[] }>`, which throws `Error('unauthorized')` on any ownership failure.

- [ ] **Step 1: Write the failing tests**

Create `apps/website/src/lib/n400/oral/finalize-voice-mock.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { runVoiceFinalize, type VoiceFinalizeDeps, type VoiceFinalizeRpcArgs } from './finalize-voice-mock';

const ATTEMPT = '00000000-0000-4000-8000-000000000001';
const manifest = [
  { qid: 2, correct: 'A' as const },
  { qid: 23, correct: 'B' as const },
];

function deps(over: Partial<VoiceFinalizeDeps> = {}) {
  const calls: VoiceFinalizeRpcArgs[] = [];
  const d: VoiceFinalizeDeps = {
    userId: 'u1',
    loadAttempt: async () => ({ user_id: 'u1', mode: 'mock_test', slide_manifest: manifest }),
    loadLocation: async () => ({ state_code: 'TX', district_number: null }),
    finalizeRpc: async (args) => {
      calls.push(args);
      return { score: 1, total: 2 };
    },
    ...over,
  };
  return { d, calls };
}

const answers = [
  { qid: 2, transcript: 'the constitution', retried: false, input: 'mic' },
  { qid: 23, transcript: 'Cruz', retried: true, input: 'mic' },
];

describe('runVoiceFinalize (spec §6 steps 1–4)', () => {
  it('rejects a signed-out caller', async () => {
    const { d, calls } = deps({ userId: null });
    await expect(runVoiceFinalize(d, ATTEMPT, answers)).rejects.toThrow('unauthorized');
    expect(calls).toHaveLength(0);
  });

  it("rejects another user's attempt and never calls the RPC", async () => {
    const { d, calls } = deps({ loadAttempt: async () => ({ user_id: 'u2', mode: 'mock_test', slide_manifest: manifest }) });
    await expect(runVoiceFinalize(d, ATTEMPT, answers)).rejects.toThrow('unauthorized');
    expect(calls).toHaveLength(0);
  });

  it('rejects a missing or non-mock attempt and a malformed id', async () => {
    await expect(runVoiceFinalize(deps({ loadAttempt: async () => null }).d, ATTEMPT, answers)).rejects.toThrow('unauthorized');
    await expect(
      runVoiceFinalize(deps({ loadAttempt: async () => ({ user_id: 'u1', mode: 'practice', slide_manifest: manifest }) }).d, ATTEMPT, answers),
    ).rejects.toThrow('unauthorized');
    await expect(runVoiceFinalize(deps().d, 'not-a-uuid', answers)).rejects.toThrow('unauthorized');
  });

  it('passes server-graded results, the owner and the answer mode to the RPC', async () => {
    const { d, calls } = deps();
    const out = await runVoiceFinalize(d, ATTEMPT, answers);
    expect(calls).toEqual([
      {
        p_attempt_id: ATTEMPT,
        p_user_id: 'u1',
        p_answer_mode: 'voice',
        p_results: [
          { qid: 2, was_correct: true, transcript: 'the constitution' },
          { qid: 23, was_correct: true, transcript: 'Cruz' },
        ],
      },
    ]);
    expect(out.rpc).toEqual({ score: 1, total: 2 });
  });

  it('uses TX when the profile has no state', async () => {
    const { d, calls } = deps({ loadLocation: async () => ({ state_code: null, district_number: null }) });
    await runVoiceFinalize(d, ATTEMPT, answers);
    expect(calls[0].p_results[1].was_correct).toBe(true);
    const none = deps({ loadLocation: async () => null });
    await runVoiceFinalize(none.d, ATTEMPT, answers);
    expect(none.calls[0].p_results[1].was_correct).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/n400/oral/finalize-voice-mock.test.ts`
Expected: FAIL: `Failed to load url ./finalize-voice-mock`.

- [ ] **Step 3: Implement**

Create `apps/website/src/lib/n400/oral/finalize-voice-mock.ts`:

```ts
// Voice-mock finalize orchestration (spec §6 steps 1–4, rev 3.4). The server
// action injects real Supabase calls; tests inject fakes. The RPC runs as
// service_role, so the owner check here (and again inside the RPC) is the
// only thing standing between a caller and someone else's attempt.

import type { StateCode } from '../state-data';
import { gradeVoiceMock, type GradedMockItem, type MockManifestItem } from './grade-voice-mock';

export interface VoiceFinalizeRpcArgs {
  p_attempt_id: string;
  p_user_id: string;
  p_answer_mode: 'voice' | 'typed';
  p_results: GradedMockItem[];
}

export interface VoiceFinalizeDeps {
  userId: string | null;
  loadAttempt(
    id: string,
  ): Promise<{ user_id: string; mode: string; slide_manifest: MockManifestItem[] | null } | null>;
  loadLocation(userId: string): Promise<{ state_code: string | null; district_number: number | null } | null>;
  finalizeRpc(args: VoiceFinalizeRpcArgs): Promise<Record<string, unknown>>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function runVoiceFinalize(
  deps: VoiceFinalizeDeps,
  attemptId: unknown,
  answers: unknown,
): Promise<{ rpc: Record<string, unknown>; results: GradedMockItem[] }> {
  const userId = deps.userId;
  if (!userId || typeof attemptId !== 'string' || !UUID_RE.test(attemptId)) throw new Error('unauthorized');

  const attempt = await deps.loadAttempt(attemptId);
  if (!attempt || attempt.user_id !== userId || attempt.mode !== 'mock_test') throw new Error('unauthorized');

  const profile = await deps.loadLocation(userId);
  // Same fallback the client uses for settings.stateCode (user-state.tsx).
  const stateCode = ((profile?.state_code?.trim() || 'TX') as StateCode);
  const location = { stateCode, districtNumber: profile?.district_number ?? null };

  const { results, answerMode } = gradeVoiceMock(answers, attempt.slide_manifest ?? [], location);
  const rpc = await deps.finalizeRpc({
    p_attempt_id: attemptId,
    p_user_id: userId,
    p_answer_mode: answerMode,
    p_results: results,
  });
  return { rpc, results };
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/lib/n400/oral/finalize-voice-mock.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/finalize-voice-mock.ts src/lib/n400/oral/finalize-voice-mock.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): voice mock finalize orchestration with owner checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Server action `finalizeVoiceMockAttempt`

**Files:**
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/civics/types.ts`
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/civics/actions.ts`

**Interfaces:**
- Consumes: `runVoiceFinalize` (Task 3); `VoiceMockAnswer` (Task 2); `createServerSupabaseClient` (`@/lib/supabase`); the existing private `getSupabase()` and `evaluateMockUnlocks()` in `actions.ts`.
- Produces:
  - `types.ts`: `export type { VoiceMockAnswer } from '@/lib/n400/oral/grade-voice-mock'`; `interface VoiceMockAnswerResult { qid: number; wasCorrect: boolean; transcript: string | null }`; `interface FinalizeVoiceMockAttemptResult extends FinalizeMockAttemptResult { answers: VoiceMockAnswerResult[] }`.
  - `actions.ts`: `finalizeVoiceMockAttempt(attemptId: string, answers: VoiceMockAnswer[]): Promise<FinalizeVoiceMockAttemptResult>`.

- [ ] **Step 1: Add the types**

Append to `types.ts`:

```ts
export type { VoiceMockAnswer } from '@/lib/n400/oral/grade-voice-mock'

// Voice mock (spec §6): per-item server verdicts for the result screen.
export interface VoiceMockAnswerResult {
  qid: number
  wasCorrect: boolean
  transcript: string | null
}

export interface FinalizeVoiceMockAttemptResult extends FinalizeMockAttemptResult {
  answers: VoiceMockAnswerResult[]
}
```

- [ ] **Step 2: Add the action**

In `actions.ts`, extend the imports:

```ts
import { createServerSupabaseClient } from '@/lib/supabase'
import { runVoiceFinalize } from '@/lib/n400/oral/finalize-voice-mock'
```

and add to the `./types` import list `FinalizeVoiceMockAttemptResult, VoiceMockAnswer`. Then add after `finalizeMockAttempt`:

```ts
// Voice mock finalize (spec §6). The client sends transcripts only; grading
// happens here (grade-voice-mock.ts), and the RPC runs as service_role because
// it trusts the computed was_correct. Owner checks run in runVoiceFinalize and
// again inside the RPC.
export async function finalizeVoiceMockAttempt(
  attemptId: string,
  answers: VoiceMockAnswer[],
): Promise<FinalizeVoiceMockAttemptResult> {
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
    ),
    answers: run.results.map((x) => ({ qid: x.qid, wasCorrect: x.was_correct, transcript: x.transcript })),
  }
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check && npx eslint "src/app/n400ready/(app)/mock-test/civics/actions.ts" "src/app/n400ready/(app)/mock-test/civics/types.ts"`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/n400ready/(app)/mock-test/civics/actions.ts" "src/app/n400ready/(app)/mock-test/civics/types.ts"
git commit -m "$(cat <<'EOF'
feat(n400app): finalizeVoiceMockAttempt server action (service-role RPC)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Flags for mock — `useVoiceFlags` + `voiceInputFor(enabled)`

**Files:**
- Modify: `apps/website/src/lib/n400/oral/use-voice-flags.ts`
- Modify: `apps/website/src/lib/n400/oral/voice-support.ts` (rename param `practiceOn` → `enabled`)
- Modify: `apps/website/src/lib/n400/oral/voice-support.test.ts`
- Modify: `apps/website/src/app/n400ready/(app)/practice/page.tsx` (call site)

**Interfaces:**
- Produces: `VoiceFlags { practiceOn; androidOn; mockOn: boolean; loaded: boolean }`; `voiceInputFor({ ua, apiPresent, enabled, androidOn })`.

- [ ] **Step 1: Update the tests to the new parameter name (RED)**

In `voice-support.test.ts`, replace every `practiceOn` with `enabled` (the `on` fixture and the `practiceOn: false` case). Rename the test `nothing without the practice flag or, outside in-app, without the API` to `nothing without the flag or, outside in-app, without the API`.

Run: `npx vitest run src/lib/n400/oral/voice-support.test.ts && npm run type-check`
Expected: type-check FAILS in `voice-support.test.ts` (`'enabled' does not exist`). Vitest may also fail on the flag case.

- [ ] **Step 2: Rename in the implementation and call site**

In `voice-support.ts`, rename the parameter field `practiceOn` → `enabled` (the type and `if (!o.enabled) return 'none';`). In the practice page, change `practiceOn: voiceFlags.practiceOn,` to `enabled: voiceFlags.practiceOn,`.

- [ ] **Step 3: Extend the flags hook**

Replace the body of `use-voice-flags.ts` with:

```ts
'use client';

// voice_practice, voice_mock (kill switches) + voice_android (D14). All OFF
// until loaded; `loaded` lets callers wait instead of acting on the defaults.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { isFeatureOn, loadFeatureFlags } from '@/lib/n400/growth/flags';

export interface VoiceFlags {
  practiceOn: boolean;
  androidOn: boolean;
  mockOn: boolean;
  loaded: boolean;
}

const OFF: VoiceFlags = { practiceOn: false, androidOn: false, mockOn: false, loaded: false };

export function useVoiceFlags(): VoiceFlags {
  const { user } = useAuth();
  const [flags, setFlags] = useState<VoiceFlags>(OFF);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadFeatureFlags(supabase, ['voice_practice', 'voice_android', 'voice_mock']).then((byKey) => {
      if (cancelled) return;
      setFlags({
        practiceOn: isFeatureOn(byKey.get('voice_practice'), user.id),
        androidOn: isFeatureOn(byKey.get('voice_android'), user.id),
        mockOn: isFeatureOn(byKey.get('voice_mock'), user.id),
        loaded: true,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return user ? flags : OFF;
}
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/lib/n400/oral && npm run type-check`
Expected: all oral tests pass; type-check 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/use-voice-flags.ts src/lib/n400/oral/voice-support.ts src/lib/n400/oral/voice-support.test.ts "src/app/n400ready/(app)/practice/page.tsx"
git commit -m "$(cat <<'EOF'
feat(n400app): voice_mock flag and generic voiceInputFor(enabled)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Copy + `MicAnswerPanel` mock variant

**Files:**
- Modify: `apps/website/src/lib/n400/i18n/vi.ts`, `apps/website/src/lib/n400/i18n/en.ts` (inside `oral`)
- Modify: `apps/website/src/components/n400/oral/MicAnswerPanel.tsx`

**Interfaces:**
- Produces:
  - new `dict.oral` keys: `mockModeLabel, mockModeVoice, appHeard, confirm, mockUnsupported, copyLink, linkCopied, micLostTyped`;
  - `MicAnswerPanelProps` gains optional `variant?: 'practice' | 'mock'` (default `'practice'`), `canRetry?: boolean` (default `true`), `onRetry?: () => void`, `notice?: string` (overrides the typed-mode notice).

- [ ] **Step 1: Add the keys to `vi.ts` (RED on parity)**

Inside `oral: { … }` in `vi.ts`, after `typedPlaceholder`:

```ts
    mockModeLabel: 'Cách trả lời',
    mockModeVoice: 'Trả lời bằng giọng',
    appHeard: 'App nghe được:',
    confirm: 'Xác nhận',
    mockUnsupported: 'Mở bằng Safari hoặc Chrome để thi bằng giọng.',
    copyLink: 'Sao chép liên kết',
    linkCopied: 'Đã sao chép',
    micLostTyped: 'Micro không dùng được lúc này. Các câu còn lại bạn trả lời bằng cách gõ (hoặc bấm 🎤 trên bàn phím).',
```

Run: `npx vitest run src/lib/n400/i18n/i18n.test.ts`
Expected: FAIL (en is missing the new keys).

- [ ] **Step 2: Add the keys to `en.ts`**

```ts
    mockModeLabel: 'How to answer',
    mockModeVoice: 'Answer by voice',
    appHeard: 'The app heard:',
    confirm: 'Confirm',
    mockUnsupported: 'Open in Safari or Chrome to take the test by voice.',
    copyLink: 'Copy link',
    linkCopied: 'Copied',
    micLostTyped: 'The microphone isn’t available right now. Answer the remaining questions by typing (or tap 🎤 on your keyboard).',
```

Run: `npx vitest run src/lib/n400/i18n/i18n.test.ts`
Expected: PASS.

- [ ] **Step 3: Add the mock variant to the panel**

In `MicAnswerPanel.tsx`:

1. Extend the props interface:

```ts
  /** 'mock': echo "App nghe được", confirm instead of grade, retry limited by the caller (spec §4.2, §6). */
  variant?: 'practice' | 'mock';
  canRetry?: boolean;
  onRetry?: () => void;
  /** Overrides the typed-mode notice (e.g. "mic lost mid-test"). */
  notice?: string;
```

and the destructuring:

```ts
export function MicAnswerPanel({
  input,
  mic,
  locked,
  nearAnswer,
  onSubmit,
  onNearAnswer,
  variant = 'practice',
  canRetry = true,
  onRetry,
  notice,
}: MicAnswerPanelProps) {
```

2. Add below `const t = dict.oral;`:

```ts
  const mock = variant === 'mock';
  const submitLabel = mock ? (input === 'typed' ? t.confirm : t.yes) : t.grade;
```

3. In the typed branch, replace `{t.inAppNotice}` with `{notice ?? t.inAppNotice}`, and the submit button text `{t.grade}` with `{submitLabel}`.

4. In the mic branch, render the echo label directly above the transcript box. Replace the `{mic.transcript ? ( <div …aria-live="polite"> … ) : null}` block with:

```tsx
      {mic.transcript ? (
        <div className="w-full">
          {mock && mic.state === 'transcript' ? (
            <p className="mb-1 text-sm font-semibold text-gray-600">{t.appHeard}</p>
          ) : null}
          <div
            className="w-full rounded-2xl border-2 border-gray-200 bg-white p-3 font-medium text-gray-800"
            aria-live="polite"
          >
            {mic.transcript}
          </div>
        </div>
      ) : null}
```

5. Replace the transcript action row (`{!locked && mic.state === 'transcript' ? ( <div className="grid w-full grid-cols-2 gap-3"> … ) : null}`) with:

```tsx
      {!locked && mic.state === 'transcript' ? (
        <div className={`grid w-full gap-3 ${canRetry ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {canRetry ? (
            <button
              type="button"
              onClick={() => {
                onRetry?.();
                mic.reset();
                mic.start();
              }}
              className={secondaryBtn}
            >
              <RotateCcw size={16} />
              {t.retry}
            </button>
          ) : null}
          <button type="button" onClick={() => onSubmit(mic.transcript)} className={primaryBtn}>
            {submitLabel}
          </button>
        </div>
      ) : null}
```

- [ ] **Step 4: Verify**

Run: `npm run type-check && npx eslint src/components/n400/oral/MicAnswerPanel.tsx && npx vitest run src/lib/n400/i18n src/components/n400/oral`
Expected: type-check 0, eslint clean, tests pass (practice behavior unchanged: defaults keep `grade`, retry on).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/i18n/vi.ts src/lib/n400/i18n/en.ts src/components/n400/oral/MicAnswerPanel.tsx
git commit -m "$(cat <<'EOF'
feat(n400app): MicAnswerPanel mock variant (echo, confirm, one retry)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Mock item logic — `mock-voice-items.ts`

**Files:**
- Create: `apps/website/src/lib/n400/oral/mock-voice-items.ts`
- Test: `apps/website/src/lib/n400/oral/mock-voice-items.test.ts`

**Interfaces:**
- Consumes: `VoiceMockAnswer` (Task 2); `MicError` (`./speech-controller`); `VoiceInput` (`./voice-support`); `QuizOption` (`../quiz-engine`).
- Produces:
  - `interface VoiceItem { transcript: string; retried: boolean; input: 'mic' | 'typed'; confirmed: boolean }`
  - `micLostFrom(error: MicError | null, supported: boolean): boolean`
  - `mockItemInput(voiceInput: VoiceInput, micLost: boolean): 'mic' | 'typed'`
  - `canAdvance(isVoiceItem: boolean, item: VoiceItem | null, picked: QuizOption['id'] | null): boolean`
  - `toVoiceMockAnswers(qids: readonly number[], items: readonly (VoiceItem | null)[], picks: readonly (QuizOption['id'] | null)[]): VoiceMockAnswer[]`

- [ ] **Step 1: Write the failing tests**

Create `apps/website/src/lib/n400/oral/mock-voice-items.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canAdvance, micLostFrom, mockItemInput, toVoiceMockAnswers, type VoiceItem } from './mock-voice-items';

const item = (over: Partial<VoiceItem> = {}): VoiceItem => ({
  transcript: 'the constitution',
  retried: false,
  input: 'mic',
  confirmed: true,
  ...over,
});

describe('mock voice items (spec §6, §8, rev 3.4)', () => {
  it('mic lost switches the rest to typed', () => {
    expect(micLostFrom('not-allowed', true)).toBe(true);
    expect(micLostFrom('stalled', true)).toBe(true);
    expect(micLostFrom(null, false)).toBe(true);
    expect(micLostFrom('no-speech', true)).toBe(false);
    expect(micLostFrom('network', true)).toBe(false);
    expect(mockItemInput('mic', true)).toBe('typed');
    expect(mockItemInput('mic', false)).toBe('mic');
    expect(mockItemInput('typed', false)).toBe('typed');
  });

  it('advances only after a confirmed answer (voice) or a pick (choice)', () => {
    expect(canAdvance(true, item(), null)).toBe(true);
    expect(canAdvance(true, item({ confirmed: false }), null)).toBe(false);
    expect(canAdvance(true, null, 'A')).toBe(false);
    expect(canAdvance(false, null, 'A')).toBe(true);
    expect(canAdvance(false, null, null)).toBe(false);
  });

  it('builds answers without any verdict: transcripts for voice items, picks otherwise', () => {
    expect(
      toVoiceMockAnswers(
        [2, 62, 7],
        [item({ retried: true }), null, item({ confirmed: false })],
        [null, 'C', null],
      ),
    ).toEqual([
      { qid: 2, transcript: 'the constitution', retried: true, input: 'mic' },
      { qid: 62, selected: 'C' },
    ]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/n400/oral/mock-voice-items.test.ts`
Expected: FAIL: `Failed to load url ./mock-voice-items`.

- [ ] **Step 3: Implement**

Create `apps/website/src/lib/n400/oral/mock-voice-items.ts`:

```ts
// Per-item state rules for the voice mock (spec §6, §8, rev 3.4). Pure, so the
// mock page stays thin and these rules stay tested.

import type { QuizOption } from '../quiz-engine';
import type { VoiceMockAnswer } from './grade-voice-mock';
import type { MicError } from './speech-controller';
import type { VoiceInput } from './voice-support';

export interface VoiceItem {
  transcript: string;
  retried: boolean;
  input: 'mic' | 'typed';
  confirmed: boolean;
}

/** Mic unusable for the rest of the test; reloading would lose the attempt. */
export function micLostFrom(error: MicError | null, supported: boolean): boolean {
  return !supported || error === 'not-allowed' || error === 'unavailable' || error === 'stalled';
}

export function mockItemInput(voiceInput: VoiceInput, micLost: boolean): 'mic' | 'typed' {
  return voiceInput === 'mic' && !micLost ? 'mic' : 'typed';
}

export function canAdvance(isVoiceItem: boolean, item: VoiceItem | null, picked: QuizOption['id'] | null): boolean {
  return isVoiceItem ? item?.confirmed === true : picked !== null;
}

export function toVoiceMockAnswers(
  qids: readonly number[],
  items: readonly (VoiceItem | null)[],
  picks: readonly (QuizOption['id'] | null)[],
): VoiceMockAnswer[] {
  const out: VoiceMockAnswer[] = [];
  qids.forEach((qid, i) => {
    const it = items[i];
    const picked = picks[i];
    if (it?.confirmed) out.push({ qid, transcript: it.transcript, retried: it.retried, input: it.input });
    else if (picked) out.push({ qid, selected: picked });
  });
  return out;
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/lib/n400/oral/mock-voice-items.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/mock-voice-items.ts src/lib/n400/oral/mock-voice-items.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): voice mock item rules (mic-lost fallback, advance, answers)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Mock page integration

**Files:**
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx`
- Test: `apps/website/src/components/n400/oral/mock-voice-wiring.test.ts`

**Interfaces:**
- Consumes: Tasks 4–7; `AnswerModeToggle`, `MicAnswerPanel`, `useSpeechRecognition`, `getOralAnswerConfig`, `correctAnswersFor` (`@/lib/n400/quiz-engine`).
- Produces: the shipped mock behavior of spec §6 (rev 3.4).

- [ ] **Step 1: Write the failing wiring test**

Create `apps/website/src/components/n400/oral/mock-voice-wiring.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the mock page's security-relevant wiring by source.
const page = readFileSync(join(process.cwd(), 'src/app/n400ready/(app)/mock-test/civics/page.tsx'), 'utf8');

describe('voice mock page wiring (spec §6 invariant)', () => {
  it('finalizes voice runs through the server action', () => {
    expect(page).toContain('finalizeVoiceMockAttempt(');
  });

  it('never grades or sends a verdict on the client', () => {
    expect(page).not.toContain('gradeOralAnswer');
    expect(page).not.toContain('was_correct');
    expect(page).not.toContain('wasCorrect:');
  });

  it('remounts the answer panel per question', () => {
    expect(page).toMatch(/<MicAnswerPanel\s+key=\{slide\.questionId\}/);
  });
});
```

Run: `npx vitest run src/components/n400/oral/mock-voice-wiring.test.ts`
Expected: FAIL (`finalizeVoiceMockAttempt(` and the key are not in the page yet).

- [ ] **Step 2: Imports and storage helper**

Add to the imports:

```ts
import { AnswerModeToggle, type PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import { MicAnswerPanel } from '@/components/n400/oral/MicAnswerPanel';
import { getOralAnswerConfig } from '@/lib/n400/oral/get-oral-config';
import { canAdvance, micLostFrom, mockItemInput, toVoiceMockAnswers, type VoiceItem } from '@/lib/n400/oral/mock-voice-items';
import { useSpeechRecognition } from '@/lib/n400/oral/use-speech-recognition';
import { useVoiceFlags } from '@/lib/n400/oral/use-voice-flags';
import { voiceInputFor } from '@/lib/n400/oral/voice-support';
```

Add `finalizeVoiceMockAttempt` to the `./actions` import, and `FinalizeVoiceMockAttemptResult` to the `./types` import. Add `correctAnswersFor` to the existing `@/lib/n400/quiz-engine` import.

After `const LEGACY_STORAGE_KEY = 'n400.mock.inflight';` add:

```ts
const MOCK_MODE_KEY = 'n400.mock.answerMode';

function readStoredMockMode(): PracticeAnswerMode {
  if (typeof window === 'undefined') return 'choice';
  try {
    return window.localStorage.getItem(MOCK_MODE_KEY) === 'voice' ? 'voice' : 'choice';
  } catch {
    return 'choice';
  }
}
```

- [ ] **Step 3: State (in `MockTestPageInner`, after `const [error, setError] = …`)**

```ts
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>(() => readStoredMockMode());
  // The mode of the attempt in progress, latched at start (flags can't flip it mid-test).
  const [runMode, setRunMode] = useState<PracticeAnswerMode>('choice');
  const [voiceItems, setVoiceItems] = useState<(VoiceItem | null)[]>([]);
  const [micLost, setMicLost] = useState(false);
  const [voiceAnswers, setVoiceAnswers] = useState<FinalizeVoiceMockAttemptResult['answers'] | null>(null);
  const mic = useSpeechRecognition();
  const voiceFlags = useVoiceFlags();
  const { reset: resetMic } = mic;
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const voiceInput = voiceInputFor({
    ua,
    apiPresent: mic.supported,
    enabled: voiceFlags.mockOn,
    androidOn: voiceFlags.androidOn,
  });
  const voiceState: 'off' | 'unsupported' | 'available' = !voiceFlags.mockOn
    ? 'off'
    : voiceInput === 'none'
      ? 'unsupported'
      : 'available';
  const location = { stateCode: state.settings.stateCode, districtNumber: state.address.districtNumber };

  // Latch "mic lost" for the rest of the attempt (render-phase update, same
  // pattern as the practice page's index reset).
  if (stage === 'taking' && runMode === 'voice' && !micLost && micLostFrom(mic.error, mic.supported) && voiceInput !== 'typed') {
    setMicLost(true);
  }

  // A new item never inherits the previous item's mic session.
  useEffect(() => {
    resetMic();
  }, [index, resetMic]);
```

- [ ] **Step 4: Auto-start waits for flags; start latches the mode**

Change the auto-start effect to wait for flags:

```ts
  useEffect(() => {
    if (!hydrated || !autoStart || !voiceFlags.loaded) return;
    startNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, autoStart, voiceFlags.loaded]);
```

In `startNew`, after `setStage('taking');` add:

```ts
    setRunMode(answerMode === 'voice' && voiceState === 'available' ? 'voice' : 'choice');
    setVoiceItems(built.map(() => null));
    setMicLost(false);
    setVoiceAnswers(null);
    resetMic();
```

- [ ] **Step 5: Finish through the voice action for voice runs**

Change `finish` to take the items and branch. The signature becomes `const finish = async (finalPicks: PickState[], finalItems: (VoiceItem | null)[]) => {`. Replace the `const r = await finalizeMockAttempt(…);` statement with:

```ts
      let r: FinalizeMockAttemptResult;
      if (runMode === 'voice') {
        const v = await finalizeVoiceMockAttempt(
          id,
          toVoiceMockAnswers(
            slides.map((s) => s.questionId),
            finalItems,
            finalPicks.map((p) => p.pickedId),
          ),
        );
        setVoiceAnswers(v.answers);
        r = v;
      } else {
        r = await finalizeMockAttempt(
          id,
          finalPicks
            .filter((p): p is PickState & { pickedId: QuizOption['id'] } => p.pickedId !== null)
            .map((p) => ({ questionId: p.questionId, selectedOption: p.pickedId })),
        );
      }
```

In `onNext`, change `void finish(prev);` to `void finish(prev, voiceItems);`.

Add the item handlers after `onPick`:

```ts
  const onVoiceConfirm = (text: string, input: 'mic' | 'typed') => {
    setVoiceItems((prev) => {
      const next = [...prev];
      next[index] = { transcript: text, retried: prev[index]?.retried ?? false, input, confirmed: true };
      return next;
    });
  };

  const onVoiceRetry = (input: 'mic' | 'typed') => {
    setVoiceItems((prev) => {
      const next = [...prev];
      next[index] = { transcript: '', retried: true, input, confirmed: false };
      return next;
    });
  };

  const onMockModeChange = (m: PracticeAnswerMode) => {
    setAnswerMode(m);
    try {
      window.localStorage.setItem(MOCK_MODE_KEY, m);
    } catch {
      // Private mode — the choice lasts for this page only.
    }
  };
```

- [ ] **Step 6: Intro — pass the mode controls**

Pass three new props to `<Intro …>`: `mode={answerMode}`, `onModeChange={onMockModeChange}`, `voiceState={voiceState}`. In `Intro`'s props type and destructuring, add `mode: PracticeAnswerMode; onModeChange: (m: PracticeAnswerMode) => void; voiceState: 'off' | 'unsupported' | 'available';`. Directly before the primary `<button type="button" onClick={onStart} …>`, insert:

```tsx
            {voiceState !== 'off' ? (
              <div className="mt-7">
                <p className="mb-2 text-sm font-semibold text-gray-700">{dict.oral.mockModeLabel}</p>
                <AnswerModeToggle
                  mode={voiceState === 'available' ? mode : 'choice'}
                  onChange={onModeChange}
                  labels={{ choice: dict.oral.modeChoice, voice: dict.oral.mockModeVoice }}
                  disabled={voiceState === 'unsupported'}
                />
                {voiceState === 'unsupported' ? <VoiceUnsupportedNote /> : null}
              </div>
            ) : null}
```

and add this component next to `ExamFact`:

```tsx
function VoiceUnsupportedNote() {
  const { dict } = useN400Lang();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard blocked (in-app browsers) — the learner can copy from the address bar.
    }
  };
  return (
    <p className="mt-2 text-sm text-gray-500">
      {dict.oral.mockUnsupported}{' '}
      <button type="button" onClick={copy} className="font-semibold text-teal-700">
        {copied ? dict.oral.linkCopied : dict.oral.copyLink}
      </button>
    </p>
  );
}
```

- [ ] **Step 7: Taking stage — per-item answer surface**

After `const isLast = index === slides.length - 1;` add:

```ts
  const itemConfig = runMode === 'voice' ? getOralAnswerConfig(slide.questionId, location) : null;
  const isVoiceItem = itemConfig !== null;
  const itemInput = mockItemInput(voiceInput, micLost);
  const item = voiceItems[index] ?? null;
  const ready = canAdvance(isVoiceItem, item, pick.pickedId);
```

Wrap the answer-options grid (`<div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]"> … </div>`) so voice items render the panel instead:

```tsx
            {isVoiceItem ? (
              <MicAnswerPanel
                key={slide.questionId}
                variant="mock"
                input={itemInput}
                mic={mic}
                locked={item?.confirmed === true}
                nearAnswer={null}
                canRetry={!item?.retried}
                onRetry={() => onVoiceRetry(itemInput)}
                onSubmit={(text) => onVoiceConfirm(text, itemInput)}
                onNearAnswer={() => {}}
                notice={micLost ? dict.oral.micLostTyped : undefined}
              />
            ) : (
              /* …existing options grid, unchanged… */
            )}
```

In the pinned Next button, replace both `pick.pickedId === null` checks with `!ready`.

- [ ] **Step 8: Result — transcripts for voice rows**

Pass `voiceAnswers={runMode === 'voice' ? voiceAnswers : null}` and `location={location}` to `<Result …>`. In `Result`'s props add `voiceAnswers: FinalizeVoiceMockAttemptResult['answers'] | null; location: { stateCode: StateCode; districtNumber: number | null };`. Add `import type { StateCode } from '@/lib/n400/state-data';` if it's not imported yet. At the top of `Result` add:

```ts
  const voiceById = new Map((voiceAnswers ?? []).map((a) => [a.qid, a] as const));
```

and in the row builder, before `return [ { … } ]`, add:

```ts
    const spoken = voiceById.get(q.id);
    if (spoken && spoken.transcript !== null) {
      const taught = correctAnswersFor(q, location.stateCode, location.districtNumber)[0];
      return [
        {
          key: String(q.id),
          badge: tFormat(dict.mockTest.civicsMock.badge, { index: i + 1, id: q.id }),
          prompt: q.questionEn,
          promptVi: q.questionVi,
          userAnswer: spoken.transcript,
          correctAnswer: taught?.en ?? '—',
          correctAnswerVi: taught?.vi,
          ok: spoken.wasCorrect,
          audioSrc: questionAudioUrl(q.id),
          bookmarkId: q.id,
        },
      ];
    }
```

For MC items inside a voice run, the existing picks-based row is correct as is. Its `ok` is the manifest comparison, the same rule the server used.

- [ ] **Step 9: Verify**

Run: `npx vitest run src/components/n400/oral src/lib/n400 && npm run type-check && npx eslint "src/app/n400ready/(app)/mock-test/civics/page.tsx" && npm run build`
Expected: the wiring test passes; all `src/lib/n400` tests pass; type-check 0; eslint clean; build 0.

- [ ] **Step 10: Commit**

```bash
git add "src/app/n400ready/(app)/mock-test/civics/page.tsx" src/components/n400/oral/mock-voice-wiring.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): Civics mock test by voice (spec §6, rev 3.4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Gate 3 — full gate, security recheck, device checklist

**Files:**
- Create: `docs/superpowers/spikes/2026-09-24-n400-oral-mock-gate3.md`

- [ ] **Step 1: Full gate**

Run: `npm run type-check && npm run test && npm run build`
Expected: type-check 0; tests pass except the pre-existing `mobile-layout.test.ts`; build 0.

- [ ] **Step 2: Re-run the Task 1 step 4 privilege query**

Expected: unchanged (`auth_voice=false, anon_voice=false, svc_voice=true, auth_core=false, auth_mc=true`).

- [ ] **Step 3: Write the checklist**

Create `docs/superpowers/spikes/2026-09-24-n400-oral-mock-gate3.md`:

```markdown
# N400 Oral Mock — Gate 3 device + security pass

**Spec:** docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §12 (Slice 3, rev 3.4)
**Prereqs:** migration n400_33 applied; this slice deployed; `voice_mock` enabled for the tester.

## Security (automated / SQL)

| Check | Result |
|---|---|
| `finalize_mock_attempt_voice_batch` not executable by anon/authenticated; executable by service_role | |
| `n400_finalize_mock_core` not executable by authenticated | |
| Another user's attempt rejected (RPC + `runVoiceFinalize` tests) | |
| MC mock finalize unchanged (Task 1 step 4 `mc=1`) | |
| Page never grades (wiring test) | |

## Devices

| # | Environment | Check | Result |
|---|---|---|---|
| 1 | iPhone Safari | Intro shows "Cách trả lời"; choose "Trả lời bằng giọng"; 20 items by voice; "App nghe được" on each; one Nói lại per item | |
| 2 | iPhone Safari | Mid-test app switch: stay on item, can speak again | |
| 3 | iPhone Safari | Deny mic mid-test → notice + remaining items typed; test finishes | |
| 4 | Desktop Chrome (Incognito) | Full voice mock; result rows show transcript + correct answer | |
| 5 | Facebook in-app iOS | Voice option → typed items; attempt answer_mode='typed' | |
| 6 | Any | Score counts: readiness/progress show the voice attempt; badge/streak update | |
| 7 | Any | DB: question rows carry transcript; attempt answer_mode='voice' | |
| 8 | Any (DC address, if available) | Q23/Q62 appear as multiple choice inside the voice mock | |

## Decision (owner)

- Gate 3 pass? <yes/no>
```

- [ ] **Step 4: Commit and hand off**

```bash
git add docs/superpowers/spikes/2026-09-24-n400-oral-mock-gate3.md
git commit -m "$(cat <<'EOF'
docs(n400app): oral mock Gate 3 checklist

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

**GATE 3 — stop.** Deploying and enabling `voice_mock` are owner decisions. Slice 4 (analytics, privacy policy, rollout) waits for "Gate 3 pass: yes".
