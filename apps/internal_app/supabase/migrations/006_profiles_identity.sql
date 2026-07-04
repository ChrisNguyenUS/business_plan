-- ============================================================
-- 006_profiles_identity.sql
-- Add structured legal name fields + constrained metadata
-- to the shared profiles table. Fully additive.
--
-- IMPORTANT: No backfill name splitting. Existing users keep
-- first_name/last_name as NULL until they edit their profile.
--
-- Role model per 003_role_unification.sql: ('admin','staff','client').
-- ============================================================

-- Structured legal name fields (all nullable)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS middle_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name_suffix text;

-- Avatar: relative storage path, NOT a full URL
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_path text;

-- Constrained metadata
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text
  DEFAULT 'en' NOT NULL
  CONSTRAINT profiles_preferred_language_check
  CHECK (preferred_language IN ('en', 'vi'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Audit metadata
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_source text
  CONSTRAINT profiles_source_check
  CHECK (profile_source IN ('email', 'google', 'facebook', 'apple', 'system', 'migration'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_initialized_at timestamptz;

-- Backfill: set profile_source for existing users (no name splitting)
UPDATE profiles
SET
  profile_source = 'email',
  profile_initialized_at = created_at
WHERE profile_source IS NULL;

-- ============================================================
-- TRIGGER: Safe replacement strategy
-- 1. Create new function with a different name
-- 2. Swap the trigger to use the new function
-- 3. Drop the old function
-- ============================================================

-- Step 1: Create new trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS trigger AS $$
DECLARE
  raw_name text;
  given text;
  family text;
  provider text;
BEGIN
  -- Determine provider source
  provider := COALESCE(
    NEW.raw_app_meta_data ->> 'provider',
    'email'
  );

  -- Extract name components
  -- OAuth providers (Google, Facebook) expose given_name / family_name
  -- when available — use these directly instead of splitting full_name
  given := NEW.raw_user_meta_data ->> 'given_name';
  family := NEW.raw_user_meta_data ->> 'family_name';

  -- Legacy: capture full_name for backward compatibility
  raw_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    ''
  );

  -- If provider didn't expose structured names, first_name/last_name
  -- stay NULL — these are LEGAL name fields; never derive them from
  -- the email prefix. UI fallback is handled by getDisplayName().

  INSERT INTO public.profiles (
    id, full_name, email, role,
    first_name, last_name,
    preferred_language, profile_source, profile_initialized_at
  )
  VALUES (
    NEW.id,
    NULLIF(raw_name, ''),
    NEW.email,
    'client',
    given,
    family,
    'en',
    provider,
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 2: Swap the trigger to use the new function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v2();

-- Step 3: Drop old function (safe — trigger no longer references it)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================
-- RLS: Complete replacement policy set
--
-- CAUTION: Policies on profiles must NOT subquery profiles —
-- that causes infinite recursion (42P17) and breaks ALL reads.
-- Admin checks go through the SECURITY DEFINER helper below.
-- ============================================================

-- Helper: SECURITY DEFINER bypasses RLS, so no recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Drop all existing profile policies
DROP POLICY IF EXISTS "authenticated_can_read_profiles" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- SELECT: Users read own profile
CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- SELECT: Admins read all profiles
CREATE POLICY "admins_read_all_profiles" ON profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- UPDATE: Users update own profile
-- NOTE: WITH CHECK here does NOT prevent role self-escalation —
-- the profiles_protect_role trigger below handles that.
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- UPDATE: Admins update all profiles
CREATE POLICY "admins_update_all_profiles" ON profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No INSERT policy — rows created by SECURITY DEFINER trigger only.

-- ============================================================
-- Role protection: block role self-escalation
-- RLS WITH CHECK cannot compare NEW vs OLD — a trigger can.
-- service_role requests have auth.uid() = NULL and pass through.
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL       -- end-user request (not service_role)
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'changing role requires admin privileges';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS profiles_protect_role ON profiles;
CREATE TRIGGER profiles_protect_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ============================================================
-- Auto-update updated_at via trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();
