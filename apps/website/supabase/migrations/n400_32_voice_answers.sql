-- N400 Civics oral answers — Slice 2 (practice).
-- Spec: docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §7 (rev 3.3).
-- Slice 3 adds n400_question_attempts.transcript + the voice mock RPC in n400_33.

ALTER TABLE public.n400_quiz_attempts
  ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT 'choice';

DO $$
BEGIN
  ALTER TABLE public.n400_quiz_attempts
    ADD CONSTRAINT n400_quiz_attempts_answer_mode_check
    CHECK (answer_mode IN ('choice', 'voice', 'typed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.n400_feature_flags (flag_key, enabled, rollout_pct, note) VALUES
  ('voice_practice', FALSE, 100, 'Civics oral answers in practice (mic + in-app typed fallback). Kill switch.'),
  ('voice_android',  FALSE, 100, 'Mic on Android (not device-tested at Gate 0). Needs voice_practice too.')
ON CONFLICT (flag_key) DO NOTHING;
