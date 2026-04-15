-- Drop old policies
drop policy if exists "staff_all" on clients;
drop policy if exists "staff_all" on cases;
drop policy if exists "staff_all" on case_forms;
drop policy if exists "staff_all" on documents;
drop policy if exists "staff_all" on status_history;

-- Helper function to check role (to reduce query verbosity in policies)
-- Note: Using a function is more efficient as PostgreSQL caches it.
create or replace function public.has_role(target_role public.user_role)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = target_role
  );
end;
$$ language plpgsql security definer;

-- New Policies

-- Clients: Both staff and admins have full access
create policy "allow_staff_and_admin_on_clients" on clients for all
  using (public.has_role('staff') or public.has_role('ultimate_admin'));

-- Cases: Both staff and admins have full access
create policy "allow_staff_and_admin_on_cases" on cases for all
  using (public.has_role('staff') or public.has_role('ultimate_admin'));

-- Case Forms: Both staff and admins have full access
create policy "allow_staff_and_admin_on_case_forms" on case_forms for all
  using (public.has_role('staff') or public.has_role('ultimate_admin'));

-- Documents: Both staff and admins have full access
create policy "allow_staff_and_admin_on_documents" on documents for all
  using (public.has_role('staff') or public.has_role('ultimate_admin'));

-- Status History: Both staff and admins have full access
create policy "allow_staff_and_admin_on_status_history" on status_history for all
  using (public.has_role('staff') or public.has_role('ultimate_admin'));
