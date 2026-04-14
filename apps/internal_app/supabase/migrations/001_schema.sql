-- MOS Internal Staff App — Database Migration 001
-- Phase 1: Core schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS (Staff Accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('ultimate_admin', 'staff')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_name        TEXT NOT NULL,
  middle_name       TEXT,
  last_name         TEXT NOT NULL,
  other_names       TEXT[],
  date_of_birth     DATE NOT NULL,
  country_of_birth  TEXT,
  a_number          TEXT CHECK (a_number ~ '^A\d{9}$' OR a_number IS NULL),
  ssn               TEXT,   -- stored encrypted via Supabase vault in production
  address           JSONB,  -- {street, city, state, zip}
  mailing_address   JSONB,
  phone             TEXT,
  email             TEXT,
  marital_status    TEXT CHECK (marital_status IN ('single','married','divorced','widowed','separated') OR marital_status IS NULL),
  spouse_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  children          JSONB,  -- [{name, dob, citizenship_status}]
  immigration_history JSONB,
  travel_history    JSONB,
  employment_history JSONB,
  services_used     TEXT[], -- ['immigration','tax','insurance','ai']
  notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_clients_last_name ON clients(last_name);
CREATE INDEX IF NOT EXISTS idx_clients_a_number ON clients(a_number);

-- ============================================================
-- CASES
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  case_type            TEXT NOT NULL CHECK (case_type IN ('simple','package')),
  package_type         TEXT CHECK (package_type IN ('marriage_greencard','parent_greencard') OR package_type IS NULL),
  primary_client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  secondary_client_id  UUID REFERENCES clients(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'documents_pending' CHECK (status IN (
    'documents_pending','ready_to_file','submitted','receipt_received',
    'in_progress','rfe_issued','approved','denied'
  )),
  notes                TEXT,
  assigned_to          UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_primary_client ON cases(primary_client_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

-- ============================================================
-- CASE FORMS
-- ============================================================
CREATE TABLE IF NOT EXISTS case_forms (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id              UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  form_type            TEXT NOT NULL CHECK (form_type IN ('n400','i485','i130','i765','i131','i864','i693')),
  filing_mode          TEXT NOT NULL DEFAULT 'online' CHECK (filing_mode IN ('online','mail')),
  receipt_number       TEXT,
  current_uscis_status TEXT,
  last_checked_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_forms_case_id ON case_forms(case_id);
CREATE INDEX IF NOT EXISTS idx_case_forms_receipt ON case_forms(receipt_number);

-- ============================================================
-- DOCUMENTS (Checklist)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  case_id      UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  case_form_id UUID REFERENCES case_forms(id) ON DELETE SET NULL,
  label        TEXT NOT NULL,
  required     BOOLEAN NOT NULL DEFAULT TRUE,
  received     BOOLEAN NOT NULL DEFAULT FALSE,
  file_path    TEXT,   -- Supabase storage path
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);

-- ============================================================
-- STATUS HISTORY (USCIS)
-- ============================================================
CREATE TABLE IF NOT EXISTS status_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_form_id  UUID NOT NULL REFERENCES case_forms(id) ON DELETE CASCADE,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT NOT NULL,
  description   TEXT,
  source        TEXT NOT NULL DEFAULT 'uscis_api' CHECK (source IN ('uscis_api','manual'))
);

CREATE INDEX IF NOT EXISTS idx_status_history_form_id ON status_history(case_form_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id     UUID REFERENCES cases(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_notifications_staff ON notifications(staff_id, read);

-- ============================================================
-- JOBS (Non-immigration services)
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID NOT NULL REFERENCES users(id),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_type TEXT NOT NULL CHECK (service_type IN ('immigration','tax','insurance','ai')),
  description  TEXT NOT NULL,
  fee          NUMERIC(10,2) NOT NULL DEFAULT 0,
  deadline     DATE,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','complete')),
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  case_id         UUID REFERENCES cases(id) ON DELETE SET NULL,
  job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
  milestone_label TEXT,
  amount          NUMERIC(10,2) NOT NULL,
  payment_date    DATE NOT NULL,
  method          TEXT NOT NULL CHECK (method IN ('cash','check','card','zelle')),
  logged_by       UUID NOT NULL REFERENCES users(id)
);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  case_id      UUID REFERENCES cases(id) ON DELETE SET NULL,
  job_id       UUID REFERENCES jobs(id) ON DELETE SET NULL,
  label        TEXT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  paid_by      TEXT NOT NULL CHECK (paid_by IN ('mos','client')),
  logged_by    UUID NOT NULL REFERENCES users(id)
);

-- ============================================================
-- FEE SCHEDULE
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_schedule (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type TEXT NOT NULL,
  form_type    TEXT,
  uscis_fee    NUMERIC(10,2),
  mos_fee      NUMERIC(10,2) NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID NOT NULL REFERENCES users(id)
);

-- ============================================================
-- CHECKLIST TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS checklist_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_type   TEXT NOT NULL UNIQUE,
  items       JSONB NOT NULL DEFAULT '[]',  -- [{label, required, order}]
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID NOT NULL REFERENCES users(id)
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,     -- 'create', 'update', 'delete', 'view_ssn'
  entity_type TEXT NOT NULL,     -- 'client', 'case', 'document', etc.
  entity_id   UUID NOT NULL,
  old_value   JSONB,
  new_value   JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
