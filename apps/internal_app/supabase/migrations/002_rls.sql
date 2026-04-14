-- MOS Internal Staff App — RLS Policies Migration 002
-- Row Level Security — staff can read their own data, admins see everything

-- Enable RLS on all tables
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_forms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_schedule    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an active staff member?
CREATE OR REPLACE FUNCTION is_active_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper: is the current user the ultimate admin?
CREATE OR REPLACE FUNCTION is_ultimate_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'ultimate_admin' AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- USERS — staff can view all, only admin can insert/update/delete
-- ============================================================
CREATE POLICY "Staff can view all users" ON users
  FOR SELECT USING (is_active_staff());

CREATE POLICY "Admin can manage users" ON users
  FOR ALL USING (is_ultimate_admin());

-- ============================================================
-- CLIENTS — all staff read/write
-- ============================================================
CREATE POLICY "Staff can read clients" ON clients
  FOR SELECT USING (is_active_staff());

CREATE POLICY "Staff can insert clients" ON clients
  FOR INSERT WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update clients" ON clients
  FOR UPDATE USING (is_active_staff());

CREATE POLICY "Admin can delete clients" ON clients
  FOR DELETE USING (is_ultimate_admin());

-- ============================================================
-- CASES — all staff read/write
-- ============================================================
CREATE POLICY "Staff can read cases" ON cases
  FOR SELECT USING (is_active_staff());

CREATE POLICY "Staff can insert cases" ON cases
  FOR INSERT WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update cases" ON cases
  FOR UPDATE USING (is_active_staff());

CREATE POLICY "Admin can delete cases" ON cases
  FOR DELETE USING (is_ultimate_admin());

-- ============================================================
-- CASE FORMS — all staff read/write
-- ============================================================
CREATE POLICY "Staff can manage case_forms" ON case_forms
  FOR ALL USING (is_active_staff());

-- ============================================================
-- DOCUMENTS — all staff read/write
-- ============================================================
CREATE POLICY "Staff can manage documents" ON documents
  FOR ALL USING (is_active_staff());

-- ============================================================
-- STATUS HISTORY — all staff read, system/admin write
-- ============================================================
CREATE POLICY "Staff can read status_history" ON status_history
  FOR SELECT USING (is_active_staff());

CREATE POLICY "Admin can write status_history" ON status_history
  FOR INSERT WITH CHECK (is_ultimate_admin());

-- ============================================================
-- NOTIFICATIONS — staff see their own
-- ============================================================
CREATE POLICY "Staff see own notifications" ON notifications
  FOR SELECT USING (staff_id = auth.uid() AND is_active_staff());

CREATE POLICY "Admin can create notifications" ON notifications
  FOR INSERT WITH CHECK (is_active_staff());

CREATE POLICY "Staff can mark own read" ON notifications
  FOR UPDATE USING (staff_id = auth.uid());

-- ============================================================
-- JOBS — all staff read/write
-- ============================================================
CREATE POLICY "Staff can manage jobs" ON jobs
  FOR ALL USING (is_active_staff());

-- ============================================================
-- PAYMENTS — all staff read, admin+staff write
-- ============================================================
CREATE POLICY "Staff can manage payments" ON payments
  FOR ALL USING (is_active_staff());

-- ============================================================
-- EXPENSES — all staff read/write
-- ============================================================
CREATE POLICY "Staff can manage expenses" ON expenses
  FOR ALL USING (is_active_staff());

-- ============================================================
-- FEE SCHEDULE — staff read, admin write
-- ============================================================
CREATE POLICY "Staff can read fee_schedule" ON fee_schedule
  FOR SELECT USING (is_active_staff());

CREATE POLICY "Admin can write fee_schedule" ON fee_schedule
  FOR ALL USING (is_ultimate_admin());

-- ============================================================
-- CHECKLIST TEMPLATES — staff read, admin write
-- ============================================================
CREATE POLICY "Staff can read checklist_templates" ON checklist_templates
  FOR SELECT USING (is_active_staff());

CREATE POLICY "Admin can write checklist_templates" ON checklist_templates
  FOR ALL USING (is_ultimate_admin());

-- ============================================================
-- AUDIT LOG — admin read only
-- ============================================================
CREATE POLICY "Admin can read audit_log" ON audit_log
  FOR SELECT USING (is_ultimate_admin());

CREATE POLICY "System can insert audit_log" ON audit_log
  FOR INSERT WITH CHECK (is_active_staff());
