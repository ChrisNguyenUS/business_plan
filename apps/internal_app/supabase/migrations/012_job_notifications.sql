-- 012_job_notifications.sql
--
-- Business progress tracker, slice 2: the log of progress emails sent to a
-- client about a job step. One row per attempt, sent or failed.
--
-- Admin only, like the rest of the tracker (see 010): the log holds the
-- client's email address. It is append-only for the app: there is a read
-- policy and an insert policy and no update or delete policy, so RLS refuses
-- both. Rows leave only when their job is deleted (cascade).
--
-- Shape follows 010: every policy TO authenticated, auth checks wrapped in
-- (select ...), every foreign key indexed, nothing for anon.

CREATE TABLE public.job_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  step_id    uuid REFERENCES public.job_steps(id) ON DELETE SET NULL,
  kind       text NOT NULL CHECK (kind IN ('step_done', 'step_waiting_client')),
  to_email   text NOT NULL,
  status     text NOT NULL CHECK (status IN ('sent', 'failed')),
  error      text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_notifications_job_id_idx     ON public.job_notifications (job_id, created_at DESC);
CREATE INDEX job_notifications_step_id_idx    ON public.job_notifications (step_id);
CREATE INDEX job_notifications_created_by_idx ON public.job_notifications (created_by);

ALTER TABLE public.job_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_notifications admin read" ON public.job_notifications
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "job_notifications admin insert" ON public.job_notifications
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));

REVOKE ALL ON TABLE public.job_notifications FROM anon, PUBLIC;
