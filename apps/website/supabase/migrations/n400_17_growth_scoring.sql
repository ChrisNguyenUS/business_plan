-- Growth Engine G1: config-driven lead scoring (spec §1.7 + §2).
-- Score is recomputed server-side from the event log + profile answers, reading
-- points/thresholds from n400_growth_rules (NO hardcoded numbers here).
-- Inactivity decay depends on now() → computed at READ time in n400_leads_view.

-- ── rule lookup helpers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.n400_rule_points(p_key text)
RETURNS int LANGUAGE sql STABLE SET search_path = public AS
$$ SELECT COALESCE((SELECT points FROM n400_growth_rules WHERE rule_key = p_key AND enabled), 0) $$;

CREATE OR REPLACE FUNCTION public.n400_rule_param(p_key text, p_param text, p_default int)
RETURNS int LANGUAGE sql STABLE SET search_path = public AS
$$ SELECT COALESCE((SELECT (params->>p_param)::int FROM n400_growth_rules WHERE rule_key = p_key AND enabled), p_default) $$;

-- ── recompute ────────────────────────────────────────────────────────────────
-- TODO(scale): full recompute per event is O(events-per-user) and fine at
-- current volume. If event sources multiply (email, website, messenger,
-- insurance, tax), switch to incremental scoring or a background queue
-- before this becomes the hot path.
CREATE OR REPLACE FUNCTION public.recompute_n400_lead_score(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score int := 0;
  v_lp    n400_lead_profiles%ROWTYPE;
  v_n int; v_days int; v_avg numeric;
BEGIN
  INSERT INTO n400_lead_profiles (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_lp FROM n400_lead_profiles WHERE user_id = p_user_id;

  -- one-shot events
  IF EXISTS (SELECT 1 FROM n400_growth_events WHERE user_id = p_user_id AND event_type = 'account_created') THEN
    v_score := v_score + n400_rule_points('account_created'); END IF;
  IF EXISTS (SELECT 1 FROM n400_growth_events WHERE user_id = p_user_id AND event_type = 'onboarding_completed') THEN
    v_score := v_score + n400_rule_points('onboarding_completed'); END IF;
  IF EXISTS (SELECT 1 FROM n400_growth_events WHERE user_id = p_user_id AND event_type = 'address_entered') THEN
    v_score := v_score + n400_rule_points('address_entered'); END IF;

  -- practice / mock milestones (from the event log)
  SELECT count(*) INTO v_n FROM n400_growth_events
   WHERE user_id = p_user_id AND event_type = 'practice_completed';
  IF v_n >= 1 THEN v_score := v_score + n400_rule_points('first_practice_completed'); END IF;
  IF v_n >= n400_rule_param('practice_sessions_5','min_count',5) THEN
    v_score := v_score + n400_rule_points('practice_sessions_5'); END IF;

  SELECT count(DISTINCT created_at::date) INTO v_days FROM n400_growth_events
   WHERE user_id = p_user_id AND event_type IN ('practice_completed','mock_completed');
  IF v_days >= n400_rule_param('practice_days_5','min_days',5) THEN
    v_score := v_score + n400_rule_points('practice_days_5'); END IF;

  SELECT count(*) INTO v_n FROM n400_growth_events
   WHERE user_id = p_user_id AND event_type = 'mock_completed';
  IF v_n >= 1 THEN v_score := v_score + n400_rule_points('first_mock_completed'); END IF;
  IF v_n >= n400_rule_param('mock_tests_5','min_count',5) THEN
    v_score := v_score + n400_rule_points('mock_tests_5'); END IF;

  -- mock average: authoritative source is n400_quiz_attempts, not payloads
  SELECT avg(score::numeric / NULLIF(total_questions,0)) * 100 INTO v_avg
  FROM n400_quiz_attempts
  WHERE user_id = p_user_id AND mode = 'mock_test' AND completed_at IS NOT NULL;
  IF v_avg IS NOT NULL
     AND v_n >= n400_rule_param('mock_avg_above_90','min_mocks',1)
     AND v_avg > n400_rule_param('mock_avg_above_90','min_avg_pct',90) THEN
    v_score := v_score + n400_rule_points('mock_avg_above_90'); END IF;

  -- profiling answers (intent inputs — see spec §1.2 "two independent axes")
  IF v_lp.interview_scheduled IS TRUE THEN
    v_score := v_score + n400_rule_points('interview_scheduled'); END IF;
  IF v_lp.filing_timeline = '30d' THEN
    v_score := v_score + n400_rule_points('files_within_30d'); END IF;

  -- consultation pipeline (read from the requests table)
  IF EXISTS (SELECT 1 FROM n400_consultation_requests WHERE user_id = p_user_id) THEN
    v_score := v_score + n400_rule_points('consultation_requested'); END IF;
  IF EXISTS (SELECT 1 FROM n400_consultation_requests WHERE user_id = p_user_id AND status IN ('booked','done')) THEN
    v_score := v_score + n400_rule_points('consultation_booked'); END IF;
  IF EXISTS (SELECT 1 FROM n400_consultation_requests WHERE user_id = p_user_id AND status = 'done') THEN
    v_score := v_score + n400_rule_points('consultation_done'); END IF;

  -- CTA dismissal penalty (client events, consultation group only)
  SELECT count(*) INTO v_n FROM n400_growth_events
   WHERE user_id = p_user_id AND event_type = 'cta_dismissed'
     AND payload->>'group' = 'consultation';
  IF v_n >= n400_rule_param('dismissed_consultation_cta_3','min_count',3) THEN
    v_score := v_score + n400_rule_points('dismissed_consultation_cta_3'); END IF;

  v_score := GREATEST(0, LEAST(300, v_score));

  UPDATE n400_lead_profiles
  SET lead_score = v_score,
      lead_status = CASE
        WHEN v_score <= 50  THEN 'cold'
        WHEN v_score <= 120 THEN 'warm'
        WHEN v_score <= 200 THEN 'hot'
        ELSE 'sales_ready' END,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- ── recompute triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.n400_trg_recompute_on_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM recompute_n400_lead_score(NEW.user_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_n400_growth_recompute
AFTER INSERT ON public.n400_growth_events
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_recompute_on_event();

CREATE OR REPLACE FUNCTION public.n400_trg_recompute_on_consultation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Stamp the denormalized timestamps the spec keeps on lead_profiles.
  UPDATE n400_lead_profiles
  SET consultation_requested_at = COALESCE(consultation_requested_at, NEW.created_at),
      consultation_booked_at = CASE WHEN NEW.status IN ('booked','done')
        THEN COALESCE(consultation_booked_at, now()) ELSE consultation_booked_at END,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  PERFORM recompute_n400_lead_score(NEW.user_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_n400_consultation_recompute
AFTER INSERT OR UPDATE ON public.n400_consultation_requests
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_recompute_on_consultation();

-- ── leads view (read-time decay; security_invoker so RLS of base tables applies) ──
CREATE OR REPLACE VIEW public.n400_leads_view
WITH (security_invoker = true) AS
SELECT
  lp.*,
  up.last_activity_date,
  up.current_streak,
  GREATEST(0, LEAST(300, lp.lead_score + CASE
    WHEN up.last_activity_date IS NULL THEN 0
    WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
      THEN n400_rule_points('inactive_30d')
    WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
      THEN n400_rule_points('inactive_14d')
    ELSE 0 END)) AS effective_score,
  CASE
    WHEN GREATEST(0, LEAST(300, lp.lead_score + CASE
      WHEN up.last_activity_date IS NULL THEN 0
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
        THEN n400_rule_points('inactive_30d')
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
        THEN n400_rule_points('inactive_14d')
      ELSE 0 END)) <= 50  THEN 'cold'
    WHEN GREATEST(0, LEAST(300, lp.lead_score + CASE
      WHEN up.last_activity_date IS NULL THEN 0
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
        THEN n400_rule_points('inactive_30d')
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
        THEN n400_rule_points('inactive_14d')
      ELSE 0 END)) <= 120 THEN 'warm'
    WHEN GREATEST(0, LEAST(300, lp.lead_score + CASE
      WHEN up.last_activity_date IS NULL THEN 0
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
        THEN n400_rule_points('inactive_30d')
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
        THEN n400_rule_points('inactive_14d')
      ELSE 0 END)) <= 200 THEN 'hot'
    ELSE 'sales_ready'
  END AS effective_status
FROM n400_lead_profiles lp
LEFT JOIN n400_user_profile up ON up.user_id = lp.user_id;

-- ── attribution write (called from auth callback; touch data from first-party cookie) ──
CREATE OR REPLACE FUNCTION public.n400_set_attribution(p_first jsonb, p_last jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  INSERT INTO n400_lead_profiles (user_id, first_touch, last_touch)
  VALUES (auth.uid(), p_first, p_last)
  ON CONFLICT (user_id) DO UPDATE
  SET first_touch = COALESCE(n400_lead_profiles.first_touch, EXCLUDED.first_touch),
      last_touch  = COALESCE(EXCLUDED.last_touch, n400_lead_profiles.last_touch),
      updated_at  = now();
END; $$;

REVOKE EXECUTE ON FUNCTION public.recompute_n400_lead_score(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_set_attribution(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.n400_set_attribution(jsonb, jsonb) TO authenticated;
