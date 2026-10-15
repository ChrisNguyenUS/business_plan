-- 009_staff_rls_lockdown.sql
--
-- The internal CRM tables were open to every signed-in account. Their only
-- policy was `staff_all` = `auth.role() = 'authenticated'`, and the website
-- portal and N400Ready sign end-users in against this same project, so any
-- end-user could read and change `clients` (including ssn and a_number),
-- `cases`, `case_forms`, `documents` and `status_history`. Probed on prod
-- 2026-10-15: a plain `client` profile saw every row and UPDATEd all of
-- `clients`.
--
-- Who can do what after this migration:
--   staff + admin  SELECT / INSERT / UPDATE   public.is_staff_or_admin()
--   admin only     DELETE                     PRD: records are archived, never
--                                             deleted; no app code deletes from
--                                             these tables
--   a client       SELECT their own `clients` row and the `cases` where they
--                  are the primary client (the two rules the old "Client can
--                  read own ..." policies gave them); nothing else, and
--                  nothing writable
--   anon           nothing: table privileges are revoked as well as RLS
--
-- Shape follows n400_38: one policy per (table, action), one auth evaluation
-- per query via (select ...), and every policy is TO authenticated. The
-- helpers are not executable by anon, so a policy that reached anon would
-- answer 42501 instead of an empty result. The "Client can read own ..."
-- policies are merged into the SELECT policy, leaving one permissive SELECT
-- policy per table.
--
-- Out of scope here (separate migrations): `jobs`, `notifications`,
-- `checklist_templates` and the finance tables still have no staff policy, and
-- their created_by / logged_by / updated_by foreign keys still point at the
-- empty legacy `users` table.

-- clients: staff and admin see everything; a client sees only their own row.
DROP POLICY IF EXISTS "staff_all" ON public.clients;
DROP POLICY IF EXISTS "Client can read own record" ON public.clients;
CREATE POLICY "clients read" ON public.clients
  FOR SELECT TO authenticated
  USING ((select public.is_staff_or_admin()) OR user_id = (select auth.uid()));
CREATE POLICY "clients staff insert" ON public.clients
  FOR INSERT TO authenticated WITH CHECK ((select public.is_staff_or_admin()));
CREATE POLICY "clients staff update" ON public.clients
  FOR UPDATE TO authenticated
  USING ((select public.is_staff_or_admin())) WITH CHECK ((select public.is_staff_or_admin()));
CREATE POLICY "clients admin delete" ON public.clients
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- cases: a client sees the cases where they are the primary client. The inner
-- SELECT runs under the clients policy above, which lets them see their own row.
DROP POLICY IF EXISTS "staff_all" ON public.cases;
DROP POLICY IF EXISTS "Client can read own cases" ON public.cases;
CREATE POLICY "cases read" ON public.cases
  FOR SELECT TO authenticated
  USING (
    (select public.is_staff_or_admin())
    OR primary_client_id IN (SELECT id FROM public.clients WHERE user_id = (select auth.uid()))
  );
CREATE POLICY "cases staff insert" ON public.cases
  FOR INSERT TO authenticated WITH CHECK ((select public.is_staff_or_admin()));
CREATE POLICY "cases staff update" ON public.cases
  FOR UPDATE TO authenticated
  USING ((select public.is_staff_or_admin())) WITH CHECK ((select public.is_staff_or_admin()));
CREATE POLICY "cases admin delete" ON public.cases
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- case_forms: staff and admin only.
DROP POLICY IF EXISTS "staff_all" ON public.case_forms;
CREATE POLICY "case_forms staff read" ON public.case_forms
  FOR SELECT TO authenticated USING ((select public.is_staff_or_admin()));
CREATE POLICY "case_forms staff insert" ON public.case_forms
  FOR INSERT TO authenticated WITH CHECK ((select public.is_staff_or_admin()));
CREATE POLICY "case_forms staff update" ON public.case_forms
  FOR UPDATE TO authenticated
  USING ((select public.is_staff_or_admin())) WITH CHECK ((select public.is_staff_or_admin()));
CREATE POLICY "case_forms admin delete" ON public.case_forms
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- documents: staff and admin only.
DROP POLICY IF EXISTS "staff_all" ON public.documents;
CREATE POLICY "documents staff read" ON public.documents
  FOR SELECT TO authenticated USING ((select public.is_staff_or_admin()));
CREATE POLICY "documents staff insert" ON public.documents
  FOR INSERT TO authenticated WITH CHECK ((select public.is_staff_or_admin()));
CREATE POLICY "documents staff update" ON public.documents
  FOR UPDATE TO authenticated
  USING ((select public.is_staff_or_admin())) WITH CHECK ((select public.is_staff_or_admin()));
CREATE POLICY "documents admin delete" ON public.documents
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- status_history: staff and admin only.
DROP POLICY IF EXISTS "staff_all" ON public.status_history;
CREATE POLICY "status_history staff read" ON public.status_history
  FOR SELECT TO authenticated USING ((select public.is_staff_or_admin()));
CREATE POLICY "status_history staff insert" ON public.status_history
  FOR INSERT TO authenticated WITH CHECK ((select public.is_staff_or_admin()));
CREATE POLICY "status_history staff update" ON public.status_history
  FOR UPDATE TO authenticated
  USING ((select public.is_staff_or_admin())) WITH CHECK ((select public.is_staff_or_admin()));
CREATE POLICY "status_history admin delete" ON public.status_history
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- Defence in depth: Supabase grants anon every privilege on new public tables
-- through default privileges, so RLS was the only gate. Nothing anonymous
-- reads these tables, so close the door as well.
REVOKE ALL ON TABLE public.clients, public.cases, public.case_forms,
  public.documents, public.status_history FROM anon, PUBLIC;
