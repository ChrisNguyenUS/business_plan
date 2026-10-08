-- Wipe the caller's own study progress in one server-side call (RLS hardening
-- spec §3.1). The Reset button on Tài khoản deleted table by table from the
-- browser, but n400_quiz_attempts has no owner DELETE policy, so the Civics
-- history silently survived every reset. An owner DELETE policy would let a
-- learner drop single failed mocks (lead score, "latest mock" readiness); this
-- function only ever deletes everything at once.
--
-- Kept on purpose: earned badges (trigger_attempt_id goes NULL by FK), growth
-- events (staff history), the lead profile (recomputed below), consultation
-- requests, profiling prompts, and the rest of n400_user_profile (address,
-- settings).

CREATE OR REPLACE FUNCTION public.n400_reset_my_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  DELETE FROM n400_quiz_attempts        WHERE user_id = v_user;  -- question rows cascade
  DELETE FROM n400_section_attempts     WHERE user_id = v_user;
  DELETE FROM n400_section_mock_results WHERE user_id = v_user;
  DELETE FROM n400_bookmarks            WHERE user_id = v_user;
  UPDATE n400_user_profile
     SET current_streak = 0, longest_streak = 0, last_activity_date = NULL, updated_at = now()
   WHERE user_id = v_user;
  PERFORM recompute_n400_lead_score(v_user);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.n400_reset_my_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.n400_reset_my_progress() TO authenticated;
