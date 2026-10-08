-- Take SECURITY DEFINER functions away from the roles that must not call them.
--
-- Supabase grants EXECUTE on every function created in `public` to anon and
-- authenticated directly, on top of PUBLIC. `REVOKE ... FROM PUBLIC` alone
-- therefore leaves a function callable over PostgREST (/rest/v1/rpc/<name>)
-- by both roles: n400_17 did only that for recompute_n400_lead_score, and
-- n400_18 revoked nothing on n400_emit_growth_event or the trigger functions.
--
-- The live hole: n400_emit_growth_event inserts any event type, at any
-- timestamp, for whatever user id it is handed, and checks nothing; it was
-- written for triggers. With the public anon key from the JS bundle anyone
-- could call it without signing in, and every insert fires
-- n400_trg_recompute_on_event, so a caller who knows a user id (every
-- signed-in user knows their own) could push that lead's score and status up
-- to sales_ready on the staff Leads page.
--
-- (1) Internal: called only by triggers and by other SECURITY DEFINER
--     functions, which run as the owner (postgres) and keep EXECUTE. No app
--     code calls them. Revoked from PUBLIC, anon and authenticated;
--     service_role keeps EXECUTE. Trigger functions are safe to revoke:
--     Postgres checks EXECUTE on a trigger function when the trigger is
--     created, not when it fires.
-- (2) Signed-in RPCs: the app calls them only with a signed-in session (each
--     server action returns early without a user; the auth callback calls
--     n400_set_attribution after exchanging the code). Revoked from PUBLIC and
--     anon; authenticated keeps EXECUTE.
--
-- Not N400-owned, left alone: is_ultimate_admin, rls_auto_enable.
-- Going forward, every SECURITY DEFINER function in this series revokes
-- EXECUTE FROM PUBLIC, anon (and authenticated unless the app calls it).

-- (1) Internal
REVOKE EXECUTE ON FUNCTION public.n400_emit_growth_event(uuid, text, jsonb, integer, timestamp with time zone, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_n400_lead_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.n400_trg_account_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.n400_trg_attempt_completed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.n400_trg_attempt_inserted_completed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.n400_trg_cta_decision_log_gc() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.n400_trg_recompute_on_consultation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.n400_trg_recompute_on_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.n400_trg_user_profile_events() FROM PUBLIC, anon, authenticated;

-- (2) Signed-in RPCs
REVOKE EXECUTE ON FUNCTION public.finalize_mock_attempt_batch(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.n400_answer_profile_prompt(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.n400_click_cta(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.n400_dismiss_cta(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.n400_log_cta_decision(text[], text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.n400_mark_cta_shown(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.n400_mark_prompt_shown(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.n400_set_attribution(jsonb, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.n400_skip_profile_prompt(text, text, text) FROM PUBLIC, anon;
