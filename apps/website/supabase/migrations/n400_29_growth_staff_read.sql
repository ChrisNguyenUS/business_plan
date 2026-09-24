-- G4 (spec §3): the Leads page is staff-visible, but every growth read policy
-- was written as role = 'admin', and profiles is readable only by its owner or
-- an admin. A staff user would therefore open /leads and see an empty list —
-- filtered away by RLS, with no error to explain it.
--
-- Widens SELECT only. Every UPDATE policy stays at admin: G4 v1 is read-only.
-- is_admin() is left untouched — it still gates protect_profile_role and the
-- admin update policies.

-- ── helper ───────────────────────────────────────────────────────────────────
-- Mirrors is_admin() (006_profiles_identity.sql) including its grant posture
-- (008_identity_hardening.sql): SECURITY DEFINER so the policy's own lookup on
-- profiles does not recurse through RLS.
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;

-- ── growth tables: admin read → staff-or-admin read ──────────────────────────
DROP POLICY IF EXISTS "n400 growth events admin read" ON public.n400_growth_events;
CREATE POLICY "n400 growth events staff read" ON public.n400_growth_events
  FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 lead profiles admin read" ON public.n400_lead_profiles;
CREATE POLICY "n400 lead profiles staff read" ON public.n400_lead_profiles
  FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 profile prompts admin read" ON public.n400_profile_prompts;
CREATE POLICY "n400 profile prompts staff read" ON public.n400_profile_prompts
  FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 consultation admin read" ON public.n400_consultation_requests;
CREATE POLICY "n400 consultation staff read" ON public.n400_consultation_requests
  FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 cta decision log admin read" ON public.n400_cta_decision_log;
CREATE POLICY "n400 cta decision log staff read" ON public.n400_cta_decision_log
  FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 user profile admin read" ON public.n400_user_profile;
CREATE POLICY "n400 user profile staff read" ON public.n400_user_profile
  FOR SELECT USING (public.is_staff_or_admin());

-- ── profiles: staff need the lead's name and email ───────────────────────────
-- Additive. users_read_own_profile and admins_read_all_profiles stay as they
-- are; RLS SELECT policies are OR-ed.
DROP POLICY IF EXISTS "staff_read_all_profiles" ON public.profiles;
CREATE POLICY "staff_read_all_profiles" ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_staff_or_admin());

-- ── n400_leads_view: carry name, email and role ──────────────────────────────
-- The view is security_invoker, so the join reads profiles under the caller's
-- own policies — which is exactly why the policy above is required.
--
-- role travels with the row so the Leads page can filter to role = 'client'.
-- Without that filter every staff and admin account shows up as a cold lead:
-- the account_created trigger fires on every profiles INSERT, and the scoring
-- trigger creates an n400_lead_profiles row for everyone.
--
-- Body below is unchanged from n400_17 except for the added LEFT JOIN and the
-- three appended columns.
CREATE OR REPLACE VIEW public.n400_leads_view
WITH (security_invoker = true) AS
SELECT
  lp.user_id,
  lp.journey_stage,
  lp.n400_filed,
  lp.filing_timeline,
  lp.interview_scheduled,
  lp.interview_date,
  lp.wants_guidance,
  lp.service_interest,
  lp.lead_score,
  lp.lead_status,
  lp.consultation_requested_at,
  lp.consultation_booked_at,
  lp.last_growth_prompt_at,
  lp.first_touch,
  lp.last_touch,
  lp.created_at,
  lp.updated_at,
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
  END AS effective_status,
  p.full_name,
  p.email,
  p.role
FROM n400_lead_profiles lp
LEFT JOIN n400_user_profile up ON up.user_id = lp.user_id
LEFT JOIN public.profiles     p  ON p.id      = lp.user_id;
