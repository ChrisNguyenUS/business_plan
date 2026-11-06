-- 014_advisor_cleanup.sql
--
-- Performance advisor cleanup, no behavior change (verified 2026-10-16 with a
-- rolled-back access matrix on prod: anon / client / staff / admin).
--  * Index the foreign keys of tables the app really queries. The FKs of the
--    unused tables (expenses, payments, fee_schedule, checklist_templates)
--    are left alone: they will be re-pointed when those features are built.
--  * site_content: the two admin policies re-ran auth.uid() per row and were
--    granted to public. Same rule, now TO authenticated with
--    (select public.is_admin()). Public read policy untouched.
--  * profiles: three SELECT policies and two UPDATE policies collapse into one
--    each (same OR logic). Role changes stay guarded by the existing
--    profiles_protect_role trigger.
--
-- Written 2026-10-16, applied 2026-11-05 (after 020; nothing in 015-020
-- touches these policies or indexes). Re-checked that day with the same
-- rolled-back matrix, before and after: profiles read / update own / update
-- other / self-promote to admin, site_content read / insert / update, for
-- anon, client, staff and admin. Identical results.

BEGIN;

CREATE INDEX IF NOT EXISTS case_forms_case_id_idx          ON public.case_forms (case_id);
CREATE INDEX IF NOT EXISTS cases_primary_client_id_idx     ON public.cases (primary_client_id);
CREATE INDEX IF NOT EXISTS cases_secondary_client_id_idx   ON public.cases (secondary_client_id);
CREATE INDEX IF NOT EXISTS clients_spouse_id_idx           ON public.clients (spouse_id);
CREATE INDEX IF NOT EXISTS documents_case_form_id_idx      ON public.documents (case_form_id);
CREATE INDEX IF NOT EXISTS documents_case_id_idx           ON public.documents (case_id);
CREATE INDEX IF NOT EXISTS status_history_case_form_id_idx ON public.status_history (case_form_id);

DROP POLICY "Allow admins to insert site_content" ON public.site_content;
DROP POLICY "Allow admins to update site_content" ON public.site_content;
CREATE POLICY "site_content admin insert" ON public.site_content
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "site_content admin update" ON public.site_content
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));

DROP POLICY admins_read_all_profiles ON public.profiles;
DROP POLICY staff_read_all_profiles ON public.profiles;
DROP POLICY users_read_own_profile ON public.profiles;
CREATE POLICY "profiles read" ON public.profiles
  FOR SELECT TO authenticated
  USING ((select public.is_staff_or_admin()) OR (select auth.uid()) = id);

DROP POLICY admins_update_all_profiles ON public.profiles;
DROP POLICY users_update_own_profile ON public.profiles;
CREATE POLICY "profiles update" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select public.is_admin()) OR (select auth.uid()) = id)
  WITH CHECK ((select public.is_admin()) OR (select auth.uid()) = id);

COMMIT;
