-- 013_revoke_unused_grants.sql
--
-- Defense in depth, no behavior change. Verified 2026-10-16 on prod:
--  * audit_log, checklist_templates, expenses, fee_schedule, notifications,
--    payments and users have RLS enabled and no policy (everything is already
--    denied). Only checklist_templates (actions/cases.ts) and notifications
--    (/notifications page) are read by app code, and both already got 0 rows;
--    nothing writes any of the seven. But anon and authenticated
--    still held full table privileges, including TRUNCATE, which RLS does not
--    govern. Take them away; policies and grants come back with the feature
--    that needs each table.
--  * is_ultimate_admin() is referenced by no policy on prod and by no app
--    code; rls_auto_enable() is a Supabase event-trigger function (event
--    triggers run without the caller's EXECUTE privilege). Neither should be
--    callable through /rest/v1/rpc.

REVOKE ALL ON TABLE
  public.audit_log, public.checklist_templates, public.expenses,
  public.fee_schedule, public.notifications, public.payments, public.users
  FROM anon, PUBLIC;

REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.audit_log, public.checklist_templates, public.expenses,
  public.fee_schedule, public.notifications, public.payments, public.users
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.is_ultimate_admin() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.is_ultimate_admin() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
