-- 005_bootstrap_missing_tables.sql
-- Creates tables that were never applied via migrations (DB was set up manually).
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT DO NOTHING).

BEGIN;

-- ============================================================
-- PROFILES (shared by both apps — role for all user types)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  email      TEXT,
  role       TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'staff', 'client')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Back-fill profiles for all existing auth.users as 'admin'
-- (only admins existed before this migration; roles can be adjusted afterward)
INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  u.id,
  u.raw_user_meta_data ->> 'full_name',
  u.email,
  'admin'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- USERS (internal staff accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'staff')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Back-fill staff entries for existing admins
INSERT INTO public.users (id, name, email, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  u.email,
  'admin'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  entity_id  UUID,
  read       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_notifications_staff ON public.notifications(staff_id, read);

-- ============================================================
-- JOBS (non-immigration services — also used by client portal)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID NOT NULL REFERENCES public.users(id),
  client_id    UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  service_type TEXT NOT NULL CHECK (service_type IN ('immigration','tax','insurance','ai')),
  description  TEXT NOT NULL DEFAULT '',
  fee          NUMERIC(10,2) NOT NULL DEFAULT 0,
  deadline     DATE,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','complete')),
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status    ON public.jobs(status);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  case_id         UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  job_id          UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  milestone_label TEXT,
  amount          NUMERIC(10,2) NOT NULL,
  payment_date    DATE NOT NULL,
  method          TEXT NOT NULL CHECK (method IN ('cash','check','card','zelle')),
  logged_by       UUID NOT NULL REFERENCES public.users(id)
);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  case_id      UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  job_id       UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  label        TEXT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  paid_by      TEXT NOT NULL CHECK (paid_by IN ('mos','client')),
  logged_by    UUID NOT NULL REFERENCES public.users(id)
);

-- ============================================================
-- FEE SCHEDULE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_schedule (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type TEXT NOT NULL,
  form_type    TEXT,
  uscis_fee    NUMERIC(10,2),
  mos_fee      NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID NOT NULL REFERENCES public.users(id)
);

-- ============================================================
-- CHECKLIST TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_type   TEXT NOT NULL UNIQUE,
  items       JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID NOT NULL REFERENCES public.users(id)
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID NOT NULL REFERENCES public.users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  old_value   JSONB,
  new_value   JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user   ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

-- ============================================================
-- RLS HELPER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_ultimate_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (for website client signups)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CLIENTS: add user_id for portal linkage (migration 004 content)
-- ============================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Client can read their own client record
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Client can read own record'
  ) THEN
    CREATE POLICY "Client can read own record" ON public.clients
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- Client can read their own cases
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cases' AND policyname = 'Client can read own cases'
  ) THEN
    CREATE POLICY "Client can read own cases" ON public.cases
      FOR SELECT USING (
        primary_client_id IN (
          SELECT id FROM public.clients WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Client can read jobs under their own client record
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Client can read own jobs'
  ) THEN
    CREATE POLICY "Client can read own jobs" ON public.jobs
      FOR SELECT USING (
        client_id IN (
          SELECT id FROM public.clients WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

COMMIT;
