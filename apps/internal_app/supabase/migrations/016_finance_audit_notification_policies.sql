-- 016_finance_audit_notification_policies.sql
-- Seven tables had RLS on and no policy (spec 2026-10-18-g4-followups §B),
-- and their author FKs pointed at the empty legacy public.users table, so
-- every insert would fail even with policies. All seven are empty.
-- Rights follow the PRD (2026-04-09): staff log payments/expenses and read
-- templates/fees; only the admin edits templates/fees and reads the audit
-- trail; the audit trail is append-only; staff see only their notifications.

BEGIN;

-- ── author FKs → profiles ─────────────────────────────────────────────────
ALTER TABLE public.audit_log
  DROP CONSTRAINT audit_log_user_id_fkey,
  ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.checklist_templates
  DROP CONSTRAINT checklist_templates_updated_by_fkey,
  ADD CONSTRAINT checklist_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.expenses
  DROP CONSTRAINT expenses_logged_by_fkey,
  ADD CONSTRAINT expenses_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.fee_schedule
  DROP CONSTRAINT fee_schedule_updated_by_fkey,
  ADD CONSTRAINT fee_schedule_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_staff_id_fkey,
  ADD CONSTRAINT notifications_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.payments
  DROP CONSTRAINT payments_logged_by_fkey,
  ADD CONSTRAINT payments_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- ── authors default to the caller; templates/fees seedable by migration ───
ALTER TABLE public.audit_log ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.expenses ALTER COLUMN logged_by SET DEFAULT auth.uid();
ALTER TABLE public.payments ALTER COLUMN logged_by SET DEFAULT auth.uid();
ALTER TABLE public.fee_schedule
  ALTER COLUMN updated_by SET DEFAULT auth.uid(), ALTER COLUMN updated_by DROP NOT NULL;
ALTER TABLE public.checklist_templates
  ALTER COLUMN updated_by SET DEFAULT auth.uid(), ALTER COLUMN updated_by DROP NOT NULL;

-- ── table privileges (RLS below decides rows) ─────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_templates, public.fee_schedule,
  public.payments, public.expenses TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated;
GRANT SELECT ON public.notifications TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM authenticated;
GRANT UPDATE (read) ON public.notifications TO authenticated;

-- ── checklist_templates / fee_schedule: staff read, admin write ───────────
CREATE POLICY "checklist templates staff read" ON public.checklist_templates
  FOR SELECT TO authenticated USING ((SELECT public.is_staff_or_admin()));
CREATE POLICY "checklist templates admin insert" ON public.checklist_templates
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "checklist templates admin update" ON public.checklist_templates
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "checklist templates admin delete" ON public.checklist_templates
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

CREATE POLICY "fee schedule staff read" ON public.fee_schedule
  FOR SELECT TO authenticated USING ((SELECT public.is_staff_or_admin()));
CREATE POLICY "fee schedule admin insert" ON public.fee_schedule
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "fee schedule admin update" ON public.fee_schedule
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "fee schedule admin delete" ON public.fee_schedule
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ── payments / expenses: staff read + log as themselves, admin corrects ───
CREATE POLICY "payments staff read" ON public.payments
  FOR SELECT TO authenticated USING ((SELECT public.is_staff_or_admin()));
CREATE POLICY "payments staff insert" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_staff_or_admin()) AND logged_by = (SELECT auth.uid()));
CREATE POLICY "payments admin update" ON public.payments
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "payments admin delete" ON public.payments
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

CREATE POLICY "expenses staff read" ON public.expenses
  FOR SELECT TO authenticated USING ((SELECT public.is_staff_or_admin()));
CREATE POLICY "expenses staff insert" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_staff_or_admin()) AND logged_by = (SELECT auth.uid()));
CREATE POLICY "expenses admin update" ON public.expenses
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "expenses admin delete" ON public.expenses
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- ── audit_log: append-only, admin reads ───────────────────────────────────
CREATE POLICY "audit log admin read" ON public.audit_log
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "audit log staff append" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_staff_or_admin()) AND user_id = (SELECT auth.uid()));

-- ── notifications: own rows, may only flip `read` ─────────────────────────
CREATE POLICY "notifications own read" ON public.notifications
  FOR SELECT TO authenticated
  USING (staff_id = (SELECT auth.uid()) AND (SELECT public.is_staff_or_admin()));
CREATE POLICY "notifications own mark read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (staff_id = (SELECT auth.uid()) AND (SELECT public.is_staff_or_admin()))
  WITH CHECK (staff_id = (SELECT auth.uid()));

COMMIT;
