-- Every Civics mock result comes from the server (RLS hardening spec §3.2).
--
-- Before this migration a learner could write a "passed" Civics mock with
-- their own session over PostgREST: (a) insert a passed mock_test row,
-- (b) start a real mock and insert was_correct = true answers before
-- finalizing (the batch keeps rows it finds), (c) insert an attempt with a
-- self-made slide_manifest, (d) finalize a practice attempt as a mock (no
-- mode check). (b)–(d) also fired the Meta CAPI pass event.
--
-- After it: mock_test rows are created only by startMockAttempt with the
-- service role (this ships after that code is live), answers under a mock
-- attempt are written only by the finalize RPCs, and both owner-callable
-- finalize paths require mode = 'mock_test'. Practice, Speaking and Writing
-- stay self-reported. Practice answers carry no words (Privacy Policy §8).

-- (1) n400_quiz_attempts: the owner writes practice envelopes only.
DROP POLICY IF EXISTS "n400 attempts own insert" ON public.n400_quiz_attempts;
CREATE POLICY "n400 attempts own practice insert" ON public.n400_quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid())
              AND mode IN ('practice', 'flashcard')
              AND slide_manifest IS NULL);

-- (2) n400_question_attempts: read your own; write only under your own practice
--     attempts, never words. Replaces the owner policy that allowed everything.
DROP POLICY IF EXISTS "n400 question attempts own" ON public.n400_question_attempts;
CREATE POLICY "n400 question attempts own select" ON public.n400_question_attempts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.n400_quiz_attempts a
                 WHERE a.id = n400_question_attempts.attempt_id
                   AND a.user_id = (select auth.uid())));
CREATE POLICY "n400 question attempts own practice insert" ON public.n400_question_attempts
  FOR INSERT TO authenticated
  WITH CHECK (transcript IS NULL
              AND EXISTS (SELECT 1 FROM public.n400_quiz_attempts a
                          WHERE a.id = n400_question_attempts.attempt_id
                            AND a.user_id = (select auth.uid())
                            AND a.mode IN ('practice', 'flashcard')));

-- (3) Both owner-callable finalize paths require a mock_test attempt. Bodies
--     are the live ones (pg_get_functiondef, 2026-10-08) plus the mode check.
CREATE OR REPLACE FUNCTION public.finalize_mock_attempt(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_mode    text;
BEGIN
  SELECT user_id, mode INTO v_user_id, v_mode FROM n400_quiz_attempts WHERE id = p_attempt_id;
  IF v_user_id IS DISTINCT FROM auth.uid() OR v_mode IS DISTINCT FROM 'mock_test' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN public.n400_finalize_mock_core(p_attempt_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_mock_attempt_batch(p_attempt_id uuid, p_picks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   uuid;
  v_mode      text;
  v_completed timestamptz;
  v_manifest  jsonb;
  v_bad_qid   int;
  v_result    jsonb;
BEGIN
  SELECT user_id, mode, completed_at, slide_manifest
  INTO v_user_id, v_mode, v_completed, v_manifest
  FROM n400_quiz_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS DISTINCT FROM auth.uid() OR v_mode IS DISTINCT FROM 'mock_test' THEN
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
$function$;

-- (4) RPCs the app no longer calls directly. finalize_mock_attempt is still
--     called inside finalize_mock_attempt_batch, which runs as the owner.
REVOKE EXECUTE ON FUNCTION public.finalize_mock_attempt(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_mock_answer(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_practice_attempt(uuid) FROM PUBLIC, anon, authenticated;
