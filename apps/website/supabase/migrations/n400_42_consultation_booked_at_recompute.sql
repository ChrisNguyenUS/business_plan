-- n400_42_consultation_booked_at_recompute.sql
-- consultation_booked_at used to be stamped once and never cleared, and
-- cta.ts retires the consultation CTA forever once it is set. A staff
-- mis-click (Booked → Cancelled) therefore hid the CTA for good.
-- Now: the stamp exists only while the lead still has a booked or done
-- request. Score already derives from the requests table (n400_17).

BEGIN;

CREATE OR REPLACE FUNCTION public.n400_trg_recompute_on_consultation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE n400_lead_profiles
  SET consultation_requested_at = COALESCE(consultation_requested_at, NEW.created_at),
      consultation_booked_at = CASE
        WHEN EXISTS (SELECT 1 FROM n400_consultation_requests r
                     WHERE r.user_id = NEW.user_id AND r.status IN ('booked','done'))
        THEN COALESCE(consultation_booked_at, now())
        ELSE NULL END,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  PERFORM recompute_n400_lead_score(NEW.user_id);
  RETURN NEW;
END; $$;

-- Same posture as n400_35: trigger-only, never callable.
REVOKE EXECUTE ON FUNCTION public.n400_trg_recompute_on_consultation() FROM PUBLIC, anon, authenticated;

COMMIT;
