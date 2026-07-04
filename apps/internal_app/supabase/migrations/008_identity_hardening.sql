-- ============================================================
-- 008_identity_hardening.sql
-- Address security advisor findings introduced by 006/007.
-- ============================================================

-- Public buckets serve /object/public/ URLs without RLS checks,
-- so a broad SELECT policy only adds the ability to LIST every
-- file in the bucket. Drop it; users keep own-folder SELECT
-- (required for upsert).
DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;

-- Trigger functions never need to be client-callable via RPC.
-- The auth.users trigger fires regardless of these grants.
REVOKE EXECUTE ON FUNCTION public.handle_new_user_v2() FROM anon, authenticated, public;

-- is_admin() must stay executable by authenticated — the profiles
-- RLS policies evaluate it as the invoking user. anon never hits
-- those policies (they are TO authenticated), so revoke anon.
-- Revoking PUBLIC drops the default blanket grant, so authenticated
-- needs its own explicit grant or policy evaluation fails.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
