-- 019_documents_storage_staff_only.sql
--
-- Storage bucket `documents` (private; meant for client immigration papers)
-- had a single policy that was made in the Dashboard, never in a migration:
--
--   "Staff can manage documents" ON storage.objects FOR ALL TO public
--   USING (bucket_id = 'documents' AND auth.role() = 'authenticated')
--
-- auth.role() = 'authenticated' is true for every signed-in account,
-- including every N400Ready sign-up, so any of them could list, download,
-- upload, overwrite and remove files in this bucket (found 2026-11-04 by the
-- full review; the bucket held 0 objects and no code used it yet). Same
-- mistake 009_staff_rls_lockdown fixed for the CRM tables: authenticated is
-- not staff.
--
-- New rules mirror the public.documents table:
--   staff + admin   read, upload, update (Storage upsert needs all three)
--   admin           remove
--   client, anon    nothing
--
-- Checked on prod with a rolled-back access matrix (anon / client / staff /
-- admin). Before: a client could read, upload, update and remove.

BEGIN;

DROP POLICY IF EXISTS "Staff can manage documents" ON storage.objects;

CREATE POLICY "documents bucket staff read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (select public.is_staff_or_admin()));

CREATE POLICY "documents bucket staff upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (select public.is_staff_or_admin()));

CREATE POLICY "documents bucket staff update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (select public.is_staff_or_admin()))
  WITH CHECK (bucket_id = 'documents' AND (select public.is_staff_or_admin()));

CREATE POLICY "documents bucket admin remove" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (select public.is_admin()));

COMMIT;
