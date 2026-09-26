-- N400 Speaking oral answers — Slice S2 (practice).
-- Spec: docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md §6.
-- Adds answer_mode to the Speaking tables (practice attempts + mock results) and
-- seeds the voice_speaking kill switch OFF. Backward compatible: both columns
-- default to 'choice', so existing inserts do not change.

ALTER TABLE public.n400_section_attempts
  ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT 'choice';

ALTER TABLE public.n400_section_mock_results
  ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT 'choice';

DO $$
BEGIN
  ALTER TABLE public.n400_section_attempts
    ADD CONSTRAINT n400_section_attempts_answer_mode_check
    CHECK (answer_mode IN ('choice', 'voice', 'typed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.n400_section_mock_results
    ADD CONSTRAINT n400_section_mock_results_answer_mode_check
    CHECK (answer_mode IN ('choice', 'voice', 'typed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.n400_feature_flags (flag_key, enabled, rollout_pct, note) VALUES
  ('voice_speaking', FALSE, 100, 'Speaking (What-mean, Yes/No) + Full interview voice answers. Kill switch; Android also needs voice_android.')
ON CONFLICT (flag_key) DO NOTHING;
