-- n400_43_sales_ready_notified.sql
-- Daily Sales-Ready digest (spec 2026-10-18-g4-followups §C): remember who
-- was already announced so each crossing is emailed once. Cleared by the
-- digest when the lead falls back below the threshold.
ALTER TABLE public.n400_lead_profiles
  ADD COLUMN IF NOT EXISTS sales_ready_notified_at timestamptz;
