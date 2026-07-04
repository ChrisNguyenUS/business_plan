-- Perf: collapse mock-test finalization into a single round trip.
--
-- The v1 flow replayed each of the 20 picks through submit_mock_answer
-- (20 sequential RPCs), then called finalize_mock_attempt, then re-read
-- slide_manifest — 22 network round trips that put ~7-9s between "Nộp
-- bài" and the result screen.
--
-- finalize_mock_attempt_batch does the same work in ONE call:
--   1. Validates ownership (auth.uid() must own the attempt).
--   2. Bulk-inserts n400_question_attempts rows, deriving was_correct
--      from the server-built slide_manifest exactly like
--      submit_mock_answer did. Picks whose qid is missing from the
--      manifest raise, same as v1.
--   3. Delegates scoring/streak/milestone to the existing
--      finalize_mock_attempt so that logic stays in one place.
--   4. Returns the finalize payload plus slide_manifest, saving the
--      result screen's extra SELECT.
--
-- Idempotent: re-calling on a finalized attempt skips the inserts and
-- returns the stored result (finalize_mock_attempt already handles
-- that), so a client retry after a network blip is safe.
--
-- Picks shape: [{ "qid": 7, "selected": "B" }, ...]

CREATE OR REPLACE FUNCTION public.finalize_mock_attempt_batch(
  p_attempt_id uuid,
  p_picks jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid;
  v_completed timestamptz;
  v_manifest  jsonb;
  v_bad_qid   int;
  v_result    jsonb;
BEGIN
  SELECT user_id, completed_at, slide_manifest
  INTO v_user_id, v_completed, v_manifest
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF v_completed IS NULL THEN
    -- Reject picks for questions the server never dealt this attempt.
    SELECT (pick->>'qid')::int INTO v_bad_qid
    FROM jsonb_array_elements(COALESCE(p_picks, '[]'::jsonb)) AS pick
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(v_manifest, '[]'::jsonb)) AS slide
      WHERE (slide->>'qid')::int = (pick->>'qid')::int
    )
    LIMIT 1;
    IF v_bad_qid IS NOT NULL THEN
      RAISE EXCEPTION 'question % not in attempt manifest', v_bad_qid;
    END IF;

    -- Replay every pick against the answer key in one statement.
    -- DISTINCT ON guards against duplicate qids inside the payload;
    -- NOT EXISTS skips rows already written by a partial v1 submit.
    INSERT INTO n400_question_attempts (attempt_id, question_id, was_correct)
    SELECT DISTINCT ON ((pick->>'qid')::int)
      p_attempt_id,
      (pick->>'qid')::int,
      (pick->>'selected') = (slide->>'correct')
    FROM jsonb_array_elements(COALESCE(p_picks, '[]'::jsonb)) AS pick
    JOIN jsonb_array_elements(v_manifest) AS slide
      ON (slide->>'qid')::int = (pick->>'qid')::int
    WHERE NOT EXISTS (
      SELECT 1 FROM n400_question_attempts qa
      WHERE qa.attempt_id = p_attempt_id
        AND qa.question_id = (pick->>'qid')::int
    )
    ORDER BY (pick->>'qid')::int;
  END IF;

  v_result := public.finalize_mock_attempt(p_attempt_id);
  RETURN v_result || jsonb_build_object('manifest', COALESCE(v_manifest, '[]'::jsonb));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_mock_attempt_batch(uuid, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.finalize_mock_attempt_batch(uuid, jsonb) TO authenticated;
