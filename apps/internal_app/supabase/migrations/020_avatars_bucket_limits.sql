-- 020_avatars_bucket_limits.sql
--
-- The public `avatars` bucket (007) had no file_size_limit and no
-- allowed_mime_types. A signed-in user could store a file of any type and
-- any size in their own folder of a public bucket: free file hosting under
-- the project's supabase.co domain, and a way to feed arbitrary files to
-- next/image, whose remotePatterns allow /storage/v1/object/public/**
-- (found 2026-11-04 by the full review).
--
-- The limits match what the apps already accept: the website upload
-- (lib/profile.ts EXT_BY_MIME, input accept=) and the OAuth avatar bootstrap
-- in api/auth/callback (same four types, MAX_AVATAR_BYTES = 5 MB). The 7
-- avatars stored on 2026-11-05 all fit (png/jpeg, largest 1.5 MB). Storage
-- enforces the limits on upload; files already stored are not touched.

BEGIN;

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';

COMMIT;
