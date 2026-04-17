-- 004_client_user_link.sql
-- Add user_id to clients table so website portal can join client records
-- to auth accounts, and add RLS policies for client self-access.
--
-- NOTE: This migration must be manually executed in the Supabase SQL Editor.
-- After running, manually link existing clients to their auth accounts by
-- setting clients.user_id = the matching auth.users.id in the Supabase Table Editor.

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Client can read their own client record
CREATE POLICY "Client can read own record" ON public.clients
  FOR SELECT USING (user_id = auth.uid());

-- Client can read their own cases (via their linked client record)
CREATE POLICY "Client can read own cases" ON public.cases
  FOR SELECT USING (
    primary_client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- Client can read jobs under their own client record
CREATE POLICY "Client can read own jobs" ON public.jobs
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

COMMIT;
