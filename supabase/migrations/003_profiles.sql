-- Create User Roles Enum
create type user_role as enum ('staff', 'ultimate_admin');

-- Profiles table
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  name text,
  role user_role not null default 'staff'
);

-- Enable RLS
alter table profiles enable row level security;

-- Policies
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'ultimate_admin'
    )
  );

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);
