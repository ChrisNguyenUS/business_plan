-- Growth Engine G2: progressive-profiling RPCs (spec §3).
-- n400_lead_profiles / n400_profile_prompts have NO user write policies (G1
-- design) — all writes go through these SECURITY DEFINER functions.
--
-- Ordering inside n400_answer_profile_prompt is deliberate: profile columns
-- update BEFORE the prompt_answered event is inserted, so the AFTER INSERT
-- recompute trigger (trg_n400_growth_recompute) reads the fresh answers
-- (interview_scheduled +60 / filing_timeline '30d' +40) in the same
-- transaction.

CREATE OR REPLACE FUNCTION public.n400_answer_profile_prompt(
  p_question_key text,
  p_answer       text,
  p_variant      text DEFAULT 'a',
  p_surface      text DEFAULT NULL   -- 'results' (L2) | 'dashboard' (L1); in every
                                     -- event payload so per-level conversion is one query
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_def  n400_prompt_definitions%ROWTYPE;
  v_date date;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;

  SELECT * INTO v_def FROM n400_prompt_definitions
  WHERE question_key = p_question_key AND variant = p_variant AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown prompt %/%', p_question_key, p_variant;
  END IF;

  -- Validate the answer against the definition (interview_date is the one
  -- free-form question: a date, not an option value).
  IF p_question_key = 'interview_date' THEN
    v_date := p_answer::date;  -- raises on garbage
  ELSIF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_def.options) AS o
    WHERE o->>'value' = p_answer
  ) THEN
    RAISE EXCEPTION 'invalid answer % for %', p_answer, p_question_key;
  END IF;

  INSERT INTO n400_lead_profiles (user_id) VALUES (v_user)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE n400_lead_profiles SET
    n400_filed          = CASE WHEN p_question_key = 'filed'
                               THEN (p_answer = 'yes') ELSE n400_filed END,
    filing_timeline     = CASE WHEN p_question_key = 'filing_timeline'
                               THEN p_answer ELSE filing_timeline END,
    interview_scheduled = CASE WHEN p_question_key = 'interview_notice'
                               THEN (p_answer = 'yes') ELSE interview_scheduled END,
    interview_date      = CASE WHEN p_question_key = 'interview_date'
                               THEN v_date ELSE interview_date END,
    wants_guidance      = CASE WHEN p_question_key = 'wants_guidance'
                               THEN p_answer ELSE wants_guidance END,
    updated_at = now()
  WHERE user_id = v_user;

  -- journey_stage is a pure function of the profiling answers and ONLY of
  -- them (spec §1.2: journey axis never derives from lead_status/score).
  UPDATE n400_lead_profiles SET journey_stage = CASE
      WHEN interview_scheduled IS TRUE  THEN 'interview_scheduled'
      WHEN n400_filed IS TRUE AND interview_scheduled IS FALSE THEN 'waiting_interview'
      WHEN n400_filed IS TRUE  THEN 'filed'
      WHEN n400_filed IS FALSE THEN 'preparing'
      ELSE 'exploring' END
  WHERE user_id = v_user;

  INSERT INTO n400_profile_prompts (user_id, question_key, answered_at, snooze_until)
  VALUES (v_user, p_question_key, now(), NULL)
  ON CONFLICT (user_id, question_key) DO UPDATE
  SET answered_at = now(), snooze_until = NULL;

  -- Last on purpose — fires the score recompute, which must see the columns
  -- written above.
  PERFORM n400_emit_growth_event(v_user, 'prompt_answered',
    jsonb_build_object('question_key', p_question_key, 'answer', p_answer,
                       'variant', p_variant, 'surface', p_surface));
END; $$;

CREATE OR REPLACE FUNCTION public.n400_skip_profile_prompt(
  p_question_key text,
  p_variant      text DEFAULT 'a',
  p_surface      text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_days int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;

  SELECT snooze_days INTO v_days FROM n400_prompt_definitions
  WHERE question_key = p_question_key AND variant = p_variant AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown prompt %/%', p_question_key, p_variant;
  END IF;

  INSERT INTO n400_profile_prompts (user_id, question_key, skipped_at, snooze_until)
  VALUES (v_user, p_question_key, now(), now() + make_interval(days => v_days))
  ON CONFLICT (user_id, question_key) DO UPDATE
  SET skipped_at = now(), snooze_until = now() + make_interval(days => v_days);

  PERFORM n400_emit_growth_event(v_user, 'prompt_skipped',
    jsonb_build_object('question_key', p_question_key, 'variant', p_variant,
                       'surface', p_surface));
END; $$;

CREATE OR REPLACE FUNCTION public.n400_mark_prompt_shown(
  p_question_key text,
  p_variant      text DEFAULT 'a',
  p_surface      text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;
  INSERT INTO n400_profile_prompts (user_id, question_key, shown_count, last_shown_at)
  VALUES (v_user, p_question_key, 1, now())
  ON CONFLICT (user_id, question_key) DO UPDATE
  SET shown_count = n400_profile_prompts.shown_count + 1, last_shown_at = now();

  -- Impression event: the funnel shown → answered / skipped reads from ONE
  -- table, per question × variant × surface (spec §7 wants answer rate per
  -- variant — shown_count alone carries neither variant nor surface).
  -- shown_count stays as cheap per-question resume state.
  PERFORM n400_emit_growth_event(v_user, 'prompt_shown',
    jsonb_build_object('question_key', p_question_key, 'variant', p_variant,
                       'surface', p_surface));
END; $$;

REVOKE EXECUTE ON FUNCTION public.n400_answer_profile_prompt(text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_skip_profile_prompt(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_mark_prompt_shown(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.n400_answer_profile_prompt(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_skip_profile_prompt(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_mark_prompt_shown(text, text, text) TO authenticated;
