-- Extend finalize RPCs to update streak inside the same transaction.
-- Streak math is duplicated from src/lib/n400/storage.ts (nextStreak):
--   same day  → no change
--   yesterday → +1
--   else      → reset to 1
-- last_activity_date is stored as DATE (no TZ); we use date_trunc('day', now())
-- in UTC. UTC is fine for v1 — Phase 6 may switch to a per-user timezone.

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
  v_today   date := (now() AT TIME ZONE 'UTC')::date;
  v_last    date;
  v_curr    int;
  v_long    int;
  v_new_curr int;
  v_new_long int;
BEGIN
  SELECT user_id, completed_at INTO v_user_id, v_done
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

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

  -- Streak update (mirrors nextStreak in storage.ts)
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

  INSERT INTO n400_user_profile (user_id, current_streak, longest_streak, last_activity_date, updated_at)
  VALUES (v_user_id, v_new_curr, v_new_long, v_today, now())
  ON CONFLICT (user_id) DO UPDATE
  SET current_streak = EXCLUDED.current_streak,
      longest_streak = EXCLUDED.longest_streak,
      last_activity_date = EXCLUDED.last_activity_date,
      updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'passed', v_passed);
END;
$$;

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
  v_today   date := (now() AT TIME ZONE 'UTC')::date;
  v_last    date;
  v_curr    int;
  v_long    int;
  v_new_curr int;
  v_new_long int;
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

  INSERT INTO n400_user_profile (user_id, current_streak, longest_streak, last_activity_date, updated_at)
  VALUES (v_user_id, v_new_curr, v_new_long, v_today, now())
  ON CONFLICT (user_id) DO UPDATE
  SET current_streak = EXCLUDED.current_streak,
      longest_streak = EXCLUDED.longest_streak,
      last_activity_date = EXCLUDED.last_activity_date,
      updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object('score', v_score, 'total', v_total);
END;
$$;
