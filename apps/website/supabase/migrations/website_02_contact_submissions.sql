-- website_02_contact_submissions.sql
--
-- The contact form (POST /api/contact) and the admin Submissions page read and
-- write public.contact_submissions, but the table was never created on prod
-- (it only existed in phase_b_website_tables.sql, which was not applied), so
-- leads were not being stored.
--
-- /api/contact inserts with the service-role key, which bypasses RLS, so there
-- is no insert policy. Admin only for read and status updates; the table holds
-- leads' phone numbers and emails. The old "read own submissions" policy from
-- phase_b is not recreated: it queried auth.users, which signed-in users
-- cannot read, and no one but staff needs these rows.

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text NOT NULL,
  phone        text,
  email        text,
  service_type text,
  message      text,
  locale       text DEFAULT 'en',
  status       text NOT NULL DEFAULT 'new',
  utm_source   text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  fbclid       text, gclid text, user_agent text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
  ON public.contact_submissions (created_at DESC);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_submissions admin read" ON public.contact_submissions
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "contact_submissions admin update" ON public.contact_submissions
  FOR UPDATE TO authenticated
  USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));

REVOKE ALL ON TABLE public.contact_submissions FROM anon, PUBLIC;
