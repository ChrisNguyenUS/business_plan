-- Growth Engine G1: server-authoritative event emitters.
-- Triggers (not RPC-body edits) so single AND batch finalize paths are covered
-- atomically without restating finalize logic (already replaced 3x: 07→08→09).
-- flashcard mode never emits — graded-only philosophy.

CREATE OR REPLACE FUNCTION public.n400_emit_growth_event(
  p_user uuid, p_type text, p_payload jsonb DEFAULT '{}'::jsonb,
  p_version int DEFAULT 1, p_at timestamptz DEFAULT now(),
  p_once boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO n400_growth_events (user_id, event_type, event_version, payload, created_at)
  VALUES (p_user, p_type, p_version, p_payload, p_at);
EXCEPTION WHEN unique_violation THEN
  -- One-shot types (uniq_n400_growth_events_once) dedupe silently when the
  -- caller declares the intent; anything else re-raises — a surprise
  -- collision must be heard, not swallowed.
  IF NOT p_once THEN RAISE; END IF;
END;
$$;

-- account_created: any new identity in the shared profiles table.
-- Deliberately on profiles, NOT auth.users: profiles is created 1-1 in the
-- same transaction (on_auth_user_created → handle_new_user_v2), so semantics
-- and timestamp are identical, while a second app trigger directly on the
-- Supabase-managed auth schema would add a failure point to the signup path.
-- Duplicates from any future profiles re-create/sync are blocked by
-- uniq_n400_growth_events_once. REVISIT only if profiles ever stops being
-- trigger-created 1-1 (e.g. batch import/sync) — then move this to auth.users.
CREATE OR REPLACE FUNCTION public.n400_trg_account_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM n400_emit_growth_event(NEW.id, 'account_created', p_once => true);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_n400_growth_account_created
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_account_created();

-- onboarding_completed (+ address_entered if address present): n400_user_profile
-- row creation IS onboarding completion (middleware gates on the row existing).
CREATE OR REPLACE FUNCTION public.n400_trg_user_profile_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM n400_emit_growth_event(NEW.user_id, 'onboarding_completed', p_once => true);
    IF NEW.state_code IS NOT NULL THEN
      PERFORM n400_emit_growth_event(NEW.user_id, 'address_entered',
        jsonb_build_object('state', NEW.state_code, 'city', NEW.city), p_once => true);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.state_code IS NULL AND NEW.state_code IS NOT NULL THEN
    PERFORM n400_emit_growth_event(NEW.user_id, 'address_entered',
      jsonb_build_object('state', NEW.state_code, 'city', NEW.city), p_once => true);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_n400_growth_user_profile
AFTER INSERT OR UPDATE ON public.n400_user_profile
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_user_profile_events();

-- practice_completed / mock_completed: fires when a graded attempt finalizes
-- (completed_at transitions NULL → NOT NULL via the finalize RPCs).
CREATE OR REPLACE FUNCTION public.n400_trg_attempt_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL
     AND NEW.mode IN ('practice','mock_test') THEN
    PERFORM n400_emit_growth_event(
      NEW.user_id,
      CASE NEW.mode WHEN 'mock_test' THEN 'mock_completed' ELSE 'practice_completed' END,
      jsonb_build_object('attempt_id', NEW.id, 'score', NEW.score,
                         'total', NEW.total_questions, 'passed', NEW.passed));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_n400_growth_attempt_completed
AFTER UPDATE ON public.n400_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_attempt_completed();
