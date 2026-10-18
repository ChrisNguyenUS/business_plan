-- n400_40_consultation_staff_update.sql
-- G4 v2 Consultation inbox (spec 2026-10-17-g4-consultation-inbox-design.md):
-- staff work the pipeline, not just admins. n400_29 kept every UPDATE at
-- admin because G4 v1 was read-only; this is the first staff write.
--
-- Column grant: staff move status/outcome and write notes. They never
-- rewrite what the customer submitted (name, phone, topic, time, attribution).
-- The grant applies to admins too — anything else goes through the SQL editor.
-- The website never UPDATEs this table (booking-actions.ts only INSERTs), so
-- the narrower grant costs it nothing.

BEGIN;

DROP POLICY IF EXISTS "n400 consultation admin update" ON public.n400_consultation_requests;
CREATE POLICY "n400 consultation staff update" ON public.n400_consultation_requests
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_staff_or_admin()))
  WITH CHECK ((SELECT public.is_staff_or_admin()));

REVOKE UPDATE ON public.n400_consultation_requests FROM anon, authenticated;
GRANT UPDATE (status, outcome, outcome_note, note, updated_at)
  ON public.n400_consultation_requests TO authenticated;

COMMIT;
