-- Phase 4: server-side scoring for quiz attempts.
--
-- The client must NOT be trusted to compute was_correct/score/passed.
-- Pattern:
--   1. Server action builds the slide manifest with the quiz engine
--      (TS) and INSERTs the attempt row including slide_manifest (jsonb).
--      RLS already restricts INSERTs to the row's own user_id.
--   2. submit_mock_answer(attempt, qid, selected) reads back the manifest,
--      looks up the correct option for qid, derives was_correct itself,
--      and inserts the n400_question_attempts row. The client's only
--      input is the option label they tapped.
--   3. finalize_mock_attempt / finalize_practice_attempt sum the
--      n400_question_attempts rows and stamp score/passed/completed_at.
--      n400_quiz_attempts has no UPDATE policy, so finalization can ONLY
--      happen via these SECURITY DEFINER RPCs.
--
-- Manifest shape (one entry per slide):
--   [{ "qid": 7, "correct": "B" }, ...]

-- ── submit_mock_answer ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_mock_answer(
  p_attempt_id uuid,
  p_question_id int,
  p_selected_option text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid;
  v_completed timestamptz;
  v_correct   text;
  v_was_ok    boolean;
BEGIN
  SELECT user_id, completed_at INTO v_user_id, v_completed
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF v_completed IS NOT NULL THEN
    RAISE EXCEPTION 'attempt already finalized';
  END IF;

  -- Pull the correct option label for this slide from the server-built manifest.
  SELECT (slide->>'correct') INTO v_correct
  FROM n400_quiz_attempts qa,
       LATERAL jsonb_array_elements(qa.slide_manifest) AS slide
  WHERE qa.id = p_attempt_id
    AND (slide->>'qid')::int = p_question_id
  LIMIT 1;

  IF v_correct IS NULL THEN
    RAISE EXCEPTION 'question % not in attempt manifest', p_question_id;
  END IF;

  v_was_ok := (p_selected_option = v_correct);

  -- One answer per (attempt, question). If the slide UI ever lets a user re-answer,
  -- we'd want a unique index + ON CONFLICT update; for v1 the UI moves forward only.
  INSERT INTO n400_question_attempts (attempt_id, question_id, was_correct)
  VALUES (p_attempt_id, p_question_id, v_was_ok);

  RETURN jsonb_build_object('was_correct', v_was_ok);
END;
$$;

-- ── finalize_mock_attempt ────────────────────────────────────────────────────
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
  v_done    timestamptz;
BEGIN
  SELECT user_id, completed_at INTO v_user_id, v_done
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Idempotent: a re-call returns the stored result instead of recounting.
  IF v_done IS NOT NULL THEN
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

-- ── finalize_practice_attempt ────────────────────────────────────────────────
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
  v_done    timestamptz;
BEGIN
  SELECT user_id, completed_at INTO v_user_id, v_done
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF v_done IS NOT NULL THEN
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

-- Lock direct execute to authenticated users; public/anon cannot call.
REVOKE EXECUTE ON FUNCTION public.submit_mock_answer(uuid, int, text)        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_mock_attempt(uuid)                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_practice_attempt(uuid)            FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.submit_mock_answer(uuid, int, text)        TO authenticated;
GRANT  EXECUTE ON FUNCTION public.finalize_mock_attempt(uuid)                TO authenticated;
GRANT  EXECUTE ON FUNCTION public.finalize_practice_attempt(uuid)            TO authenticated;
