-- 015_clients_source_lead.sql
-- G4 v2 Convert to Client: remember which N400Ready lead a client came from.
--
-- source_lead_id is a LABEL, not an access grant. It deliberately is NOT
-- clients.user_id: the "clients read" policy lets user_id = auth.uid() read
-- the whole row (ssn included), and portal access is only ever granted via
-- invite token (business progress tracker slice 3). No policy changes here.

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_lead_id uuid
  REFERENCES public.profiles(id) ON DELETE SET NULL;

-- One client per lead, enforced in the database so two staff converting the
-- same lead at once cannot both succeed. Also serves the FK lookup.
-- The name is matched by actions/clients.ts — do not rename.
CREATE UNIQUE INDEX IF NOT EXISTS clients_source_lead_id_key
  ON public.clients (source_lead_id)
  WHERE source_lead_id IS NOT NULL;

COMMIT;
