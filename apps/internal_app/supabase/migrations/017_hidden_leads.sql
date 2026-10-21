-- 017_hidden_leads.sql
--
-- Admin can hide an N400Ready lead from the Leads list and the daily
-- Sales-Ready email. Hiding is reversible and touches nothing else: the
-- N400Ready account, its progress and any client converted from it stay as
-- they are. A lead IS an end-user account, so a real delete would lock that
-- person out of N400Ready (owner decision 2026-10-20: hide, never delete).
--
-- Kept in its own table instead of a column on n400_lead_profiles so the
-- website-owned n400_* tables and n400_leads_view stay unchanged.
--
--   staff + admin  SELECT        (staff lists must skip hidden leads too)
--   admin only     INSERT/DELETE (hide / unhide)
--   anon           nothing

BEGIN;

CREATE TABLE public.hidden_leads (
  user_id   uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  hidden_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  hidden_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hidden_leads_hidden_by_idx ON public.hidden_leads (hidden_by);

ALTER TABLE public.hidden_leads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.hidden_leads FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.hidden_leads FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.hidden_leads TO authenticated;

CREATE POLICY "hidden_leads staff read" ON public.hidden_leads
  FOR SELECT TO authenticated USING ((select public.is_staff_or_admin()));
CREATE POLICY "hidden_leads admin insert" ON public.hidden_leads
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "hidden_leads admin delete" ON public.hidden_leads
  FOR DELETE TO authenticated USING ((select public.is_admin()));

COMMIT;
