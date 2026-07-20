-- Fix: n400_mark_prompt_shown was missing the question_key/variant
-- validation its sibling RPCs (n400_answer_profile_prompt,
-- n400_skip_profile_prompt) perform. n400_profile_prompts.question_key has
-- no FK to n400_prompt_definitions, so without this guard any authenticated
-- caller could pass a typo'd/nonexistent question_key or variant and
-- silently create a permanent impression-counter row with no error. This
-- mirrors n400_skip_profile_prompt's lookup+guard pattern exactly.

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

  IF NOT EXISTS (
    SELECT 1 FROM n400_prompt_definitions
    WHERE question_key = p_question_key AND variant = p_variant AND enabled
  ) THEN
    RAISE EXCEPTION 'unknown prompt %/%', p_question_key, p_variant;
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
