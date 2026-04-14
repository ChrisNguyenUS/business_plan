-- Enable RLS
alter table clients enable row level security;
alter table cases enable row level security;
alter table case_forms enable row level security;
alter table documents enable row level security;
alter table status_history enable row level security;

-- Allow authenticated users (staff) full access to all tables
create policy "staff_all" on clients for all using (auth.role() = 'authenticated');
create policy "staff_all" on cases for all using (auth.role() = 'authenticated');
create policy "staff_all" on case_forms for all using (auth.role() = 'authenticated');
create policy "staff_all" on documents for all using (auth.role() = 'authenticated');
create policy "staff_all" on status_history for all using (auth.role() = 'authenticated');
