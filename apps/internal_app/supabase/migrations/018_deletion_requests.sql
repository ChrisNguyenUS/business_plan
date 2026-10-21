-- 018_deletion_requests.sql
--
-- Staff cannot delete. They ask: delete a case, delete a client, or hide a
-- lead, with a reason. An admin approves (the same code as the admin's own
-- Delete/Hide button runs) or rejects. Spec:
-- docs/superpowers/specs/2026-10-21-internal-app-deletion-requests-design.md
--
--   admin          SELECT all; UPDATE only the decision columns
--   staff          INSERT own pending request (request columns only);
--                  SELECT own requests
--   anyone else    nothing; nobody can DELETE (the table is the history)
--
-- entity_id has no FK on purpose: it points at cases, clients or profiles,
-- and the row must outlive the thing it deleted. entity_label keeps the name.

BEGIN;

CREATE TABLE public.deletion_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   text NOT NULL CHECK (entity_type IN ('case', 'client', 'lead')),
  entity_id     uuid NOT NULL,
  entity_label  text NOT NULL CHECK (char_length(entity_label) BETWEEN 1 AND 200),
  reason        text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 500),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by  uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at    timestamptz,
  decision_note text CHECK (decision_note IS NULL OR char_length(decision_note) <= 500),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One pending request per item: two staff pressing at once → one gets 23505.
CREATE UNIQUE INDEX deletion_requests_one_pending
  ON public.deletion_requests (entity_type, entity_id) WHERE status = 'pending';
CREATE INDEX deletion_requests_requested_by_idx ON public.deletion_requests (requested_by);
CREATE INDEX deletion_requests_decided_by_idx  ON public.deletion_requests (decided_by);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.deletion_requests FROM anon, PUBLIC, authenticated;
GRANT SELECT ON TABLE public.deletion_requests TO authenticated;
GRANT INSERT (entity_type, entity_id, entity_label, reason) ON TABLE public.deletion_requests TO authenticated;
GRANT UPDATE (status, decided_by, decided_at, decision_note) ON TABLE public.deletion_requests TO authenticated;

CREATE POLICY "deletion_requests read" ON public.deletion_requests
  FOR SELECT TO authenticated
  USING (
    (select public.is_admin())
    OR ((select public.is_staff_or_admin()) AND requested_by = (select auth.uid()))
  );
CREATE POLICY "deletion_requests staff insert" ON public.deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.is_staff_or_admin())
    AND requested_by = (select auth.uid())
    AND status = 'pending'
  );
CREATE POLICY "deletion_requests admin decide" ON public.deletion_requests
  FOR UPDATE TO authenticated
  USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));

COMMIT;
