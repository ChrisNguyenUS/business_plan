-- N400 Phase 2 — Audio Storage Bucket
-- Creates `n400-audio` Supabase Storage bucket and applies RLS:
--   - Public read for serving audio via CDN
--   - Admin write only (matches public.profiles.role = 'admin')
-- Idempotent: safe to re-run.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('n400-audio', 'n400-audio', true, 1048576, ARRAY['audio/mpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "n400-audio public read" ON storage.objects;
CREATE POLICY "n400-audio public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'n400-audio');

DROP POLICY IF EXISTS "n400-audio admin write" ON storage.objects;
CREATE POLICY "n400-audio admin write" ON storage.objects
  FOR ALL
  USING      (bucket_id = 'n400-audio' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (bucket_id = 'n400-audio' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
