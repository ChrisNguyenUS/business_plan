-- n400_41_consultation_updated_at_trigger.sql
-- Consultation inbox: updated_at is both the optimistic-concurrency token and
-- the follow-up age. It used to come from the app server clock; set it in the
-- database so every write (and the age comparison) uses one clock.
-- The app no longer sends updated_at in its UPDATE.

BEGIN;

CREATE OR REPLACE FUNCTION public.n400_consultation_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.n400_consultation_touch_updated_at() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS n400_consultation_touch_updated_at ON public.n400_consultation_requests;
CREATE TRIGGER n400_consultation_touch_updated_at
  BEFORE UPDATE ON public.n400_consultation_requests
  FOR EACH ROW EXECUTE FUNCTION public.n400_consultation_touch_updated_at();

COMMIT;
