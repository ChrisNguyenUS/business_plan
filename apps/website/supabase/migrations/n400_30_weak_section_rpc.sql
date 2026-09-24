-- G4 (spec §5): the weakest study section for one lead, for the Leads detail
-- page.
--
-- SECURITY DEFINER because computing it requires n400_section_attempts, which
-- staff cannot read and should not be able to read — exposing one aggregate is
-- the point. A definer function bypasses RLS entirely, so it guards itself.
--
-- The rule must match deriveSectionGradedTally + the weakest-section loop in
-- apps/website/src/lib/n400/growth/learning-signals.ts:
--   * graded only — mode 'flashcard' never counts
--   * lowest correct/total among sections that have at least one graded attempt
--   * ties break in SECTION_KEYS order (whatmean, yesno, writing), because the
--     TypeScript loop uses a strict < and walks that array in order
--
-- KNOWN DRIFT RISK: this is a second implementation of that rule. It could not
-- reuse the first — n400_learning_rollup and n400_graded_day_rollup (n400_25)
-- filter on auth.uid(), so they cannot answer for another user. If you change
-- the rule in either place, change it in both.
CREATE OR REPLACE FUNCTION public.n400_weak_section_for(p_user_id uuid)
RETURNS TABLE (section text, graded_total int, correct_pct numeric)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Supabase grants EXECUTE to anon/authenticated directly on function creation
-- (ALTER DEFAULT PRIVILEGES), not merely via PUBLIC — REVOKE ... FROM PUBLIC
-- alone does not strip anon's grant. Revoke both explicitly, matching
-- is_staff_or_admin's own grant posture (n400_29).
REVOKE EXECUTE ON FUNCTION public.n400_weak_section_for(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.n400_weak_section_for(uuid) TO authenticated;
