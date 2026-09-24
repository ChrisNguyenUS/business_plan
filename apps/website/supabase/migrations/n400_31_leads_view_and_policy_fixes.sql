-- G4 final-review fix wave. Three independent, unrelated defects found in a
-- whole-branch read before the Leads feature (n400_29, n400_30) ships:
--
-- (1) n400_leads_view exposed lp.created_at (n400_lead_profiles.created_at) as
--     the lead's "joined" date. That is the row-creation time of the LEAD
--     PROFILE, not the account signup date. G1 backfilled n400_lead_profiles
--     in bulk, so 4 of the 5 current production leads carry the identical
--     timestamp 2026-07-20 04:13:31 in that column, even though their real
--     signup dates span 2026-04-22 to 2026-07-19. A staff member reading that
--     value on a call would be quoting a fabricated date. Fix: append the
--     real signup timestamp, profiles.created_at, as a 25th column,
--     account_created_at. CREATE OR REPLACE VIEW permits appending columns
--     at the end as long as the existing 24 keep identical name/type/order,
--     which this does — the body below is copied verbatim from n400_29 with
--     one line added. lp.created_at stays in the view (now unambiguously a
--     "lead record" timestamp, not a signup date) because removing a column
--     is not permitted by CREATE OR REPLACE VIEW and nothing here depends on
--     it going away.
--
-- (2) The six growth-table SELECT policies added in n400_29
--     (n400_growth_events, n400_lead_profiles, n400_profile_prompts,
--     n400_consultation_requests, n400_cta_decision_log, n400_user_profile)
--     were created without a TO clause, so Postgres applied them to role
--     `public` — which includes anon. is_staff_or_admin() has EXECUTE
--     revoked from anon (n400_29), so any anon evaluation of one of these
--     policies raises `42501 permission denied for function
--     is_staff_or_admin`, not an empty result. Concretely:
--       SET ROLE anon; SELECT count(*) FROM n400_user_profile;
--     currently errors. The inline EXISTS-subquery policies these replaced
--     had the same problem implicitly but returned an empty set instead of
--     erroring, because they queried `profiles`, which anon may read zero
--     rows of without an EXECUTE grant in the way. n400_user_profile is read
--     by website middleware on every N400 page, so one logged-out or
--     pre-hydration read on this table would turn into a 500 instead of a
--     silent empty read. Nothing calls these tables as anon today — every
--     site is behind a signed-in check — so this is a latent landmine, not a
--     live bug. Fix: recreate all six with `TO authenticated`, matching
--     staff_read_all_profiles (n400_29), which already scoped itself
--     correctly. Policy names and the USING predicate are unchanged.
--
-- (3) n400_weak_section_for (n400_30) was declared with no volatility
--     marker, so plpgsql defaults it to VOLATILE. It only reads
--     n400_section_attempts and returns a value with no side effects, so it
--     qualifies as STABLE — which lets the planner treat repeated calls
--     within one statement/query as cacheable. Fix: mark it STABLE.

-- ── (1) n400_leads_view: append account_created_at ──────────────────────────
-- Verbatim body from n400_29_growth_staff_read.sql, plus one appended column.
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
  p.role,
  p.created_at AS account_created_at
FROM n400_lead_profiles lp
LEFT JOIN n400_user_profile up ON up.user_id = lp.user_id
LEFT JOIN public.profiles     p  ON p.id      = lp.user_id;

-- ── (2) growth tables: scope the six staff-read policies to authenticated ───
DROP POLICY IF EXISTS "n400 growth events staff read" ON public.n400_growth_events;
CREATE POLICY "n400 growth events staff read" ON public.n400_growth_events
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 lead profiles staff read" ON public.n400_lead_profiles;
CREATE POLICY "n400 lead profiles staff read" ON public.n400_lead_profiles
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 profile prompts staff read" ON public.n400_profile_prompts;
CREATE POLICY "n400 profile prompts staff read" ON public.n400_profile_prompts
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 consultation staff read" ON public.n400_consultation_requests;
CREATE POLICY "n400 consultation staff read" ON public.n400_consultation_requests
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 cta decision log staff read" ON public.n400_cta_decision_log;
CREATE POLICY "n400 cta decision log staff read" ON public.n400_cta_decision_log
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "n400 user profile staff read" ON public.n400_user_profile;
CREATE POLICY "n400 user profile staff read" ON public.n400_user_profile
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());

-- ── (3) n400_weak_section_for: mark STABLE ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.n400_weak_section_for(p_user_id uuid)
RETURNS TABLE (section text, graded_total int, correct_pct numeric)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  WITH tally AS (
    SELECT
      sa.section                                        AS sec,
      count(*)::int                                     AS total,
      count(*) FILTER (WHERE sa.was_correct)::int       AS correct
    FROM n400_section_attempts sa
    WHERE sa.user_id = p_user_id
      AND sa.mode <> 'flashcard'
      AND sa.section IN ('whatmean', 'yesno', 'writing')
    GROUP BY sa.section
  )
  SELECT
    t.sec,
    t.total,
    round(100.0 * t.correct / t.total, 1)
  FROM tally t
  ORDER BY
    (t.correct::numeric / t.total) ASC,
    array_position(ARRAY['whatmean', 'yesno', 'writing'], t.sec) ASC
  LIMIT 1;
END; $$;

REVOKE EXECUTE ON FUNCTION public.n400_weak_section_for(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.n400_weak_section_for(uuid) TO authenticated;
