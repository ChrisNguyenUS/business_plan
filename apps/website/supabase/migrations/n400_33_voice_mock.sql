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
