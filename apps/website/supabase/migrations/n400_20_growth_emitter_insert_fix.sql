-- Growth Engine G2 prep (spec §3 depends on live practice_completed events).
--
-- G1's emitter (n400_18) fires only AFTER UPDATE when completed_at goes
-- NULL → NOT NULL — the finalize-RPC path used by the civics mock test.
-- The practice path (user-state.tsx recordAnswer / recordMockResult) INSERTs
-- one already-completed envelope row per graded answer, which never UPDATEs,
-- so no live practice_completed event was ever emitted (the n400_19 backfill
-- counted these same envelope rows, masking the gap). Cover the INSERT path.
--
-- No double-emit is possible: the finalize path inserts with completed_at
-- NULL (this trigger no-ops) and later updates (n400_18 trigger fires); the
-- direct path inserts completed (this trigger fires) and never updates.

CREATE OR REPLACE FUNCTION public.n400_trg_attempt_inserted_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.mode IN ('practice','mock_test') THEN
    PERFORM n400_emit_growth_event(
      NEW.user_id,
      CASE NEW.mode WHEN 'mock_test' THEN 'mock_completed' ELSE 'practice_completed' END,
      jsonb_build_object('attempt_id', NEW.id, 'score', NEW.score,
                         'total', NEW.total_questions, 'passed', NEW.passed));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_n400_growth_attempt_inserted ON public.n400_quiz_attempts;
CREATE TRIGGER trg_n400_growth_attempt_inserted
AFTER INSERT ON public.n400_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_attempt_inserted_completed();

-- Reseed wants_guidance trigger: practice_completed = one event per graded
-- ANSWER (envelope row), so "after 5 study sessions" as min_count 5 would trip
-- inside the first sitting. A "session/buổi" is an active day everywhere else
-- in this app (pace engine), so use 5 distinct practice days instead.
UPDATE public.n400_prompt_definitions
SET trigger = '{"distinct_practice_days": 5}'::jsonb, updated_at = now()
WHERE question_key = 'wants_guidance' AND variant = 'a';
