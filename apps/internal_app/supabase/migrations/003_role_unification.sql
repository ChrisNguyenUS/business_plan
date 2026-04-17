-- 003_role_unification.sql
-- Unify role values across shared profiles table and internal users table
--
-- NOTE: This migration must be manually executed in the Supabase SQL Editor.
-- Do NOT run this via automated migrations if using Supabase CLI without review.

BEGIN;
-- Review the changes carefully before execution in production.

-- ============================================================
-- PROFILES TABLE (shared by both apps)
-- ============================================================

-- Rename stale role values
UPDATE public.profiles SET role = 'admin'  WHERE role = 'ultimate_admin';
UPDATE public.profiles SET role = 'client' WHERE role = 'user';

-- Replace CHECK constraint (drop first to be idempotent)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'staff', 'client'));

-- Default role for new website signups
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'client';

-- ============================================================
-- USERS TABLE (internal app staff accounts)
-- ============================================================

UPDATE public.users SET role = 'admin' WHERE role = 'ultimate_admin';

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff'));

-- ============================================================
-- RLS HELPERS — body updated to check 'admin' (name kept to avoid
-- breaking existing policy references)
-- ============================================================

CREATE OR REPLACE FUNCTION is_ultimate_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Ensures website signups get a profiles row with role = 'client'
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

COMMIT;
