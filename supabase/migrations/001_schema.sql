-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clients
create table clients (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  first_name text not null,
  middle_name text,
  last_name text not null,
  other_names text[] default '{}',
  date_of_birth date not null,
  country_of_birth text,
  a_number text,
  ssn text,
  address jsonb default '{}',
  mailing_address jsonb default '{}',
  phone text,
  email text,
  marital_status text,
  spouse_id uuid references clients(id),
  children jsonb default '[]',
  immigration_history jsonb default '[]',
  travel_history jsonb default '[]',
  employment_history jsonb default '[]',
  services_used text[] default '{}',
  notes text
);

-- Cases
create table cases (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  case_type text not null check (case_type in ('simple', 'package')),
  package_type text check (package_type in ('marriage_greencard', 'parent_greencard')),
  primary_client_id uuid not null references clients(id),
  secondary_client_id uuid references clients(id),
  status text not null default 'documents_pending'
    check (status in (
      'documents_pending','ready_to_file','submitted',
      'receipt_received','in_progress','rfe_issued','approved','denied'
    )),
  notes text
);

-- Forms within a case
create table case_forms (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid not null references cases(id) on delete cascade,
  form_type text not null,
  filing_mode text not null check (filing_mode in ('online', 'mail')),
  receipt_number text,
  current_uscis_status text,
  last_checked_at timestamptz
);

-- Documents
create table documents (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  case_id uuid not null references cases(id) on delete cascade,
  case_form_id uuid references case_forms(id),
  label text not null,
  required boolean default true,
  received boolean default false,
  file_path text,
  notes text
);

-- USCIS status history
create table status_history (
  id uuid primary key default uuid_generate_v4(),
  checked_at timestamptz default now(),
  case_form_id uuid not null references case_forms(id) on delete cascade,
  status text not null,
  description text,
  source text default 'uscis_api'
);
