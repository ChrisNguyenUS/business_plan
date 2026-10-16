-- 011: business-setup jobs are tagged "Business", not "Tax".
--
-- The owner wants LLC formation, business bank account and business website
-- jobs shown as Business. This widens both service_type CHECKs to allow
-- 'business', moves the three templates and their existing jobs over, and
-- renames the English template title "Texas LLC formation" to "LLC formation".
-- The applied 010 stays untouched. Constraint names are the ones on prod.

ALTER TABLE public.jobs DROP CONSTRAINT jobs_service_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_service_type_check
  CHECK (service_type IN ('immigration','tax','insurance','ai','business'));
ALTER TABLE public.job_templates DROP CONSTRAINT job_templates_service_type_check;
ALTER TABLE public.job_templates ADD CONSTRAINT job_templates_service_type_check
  CHECK (service_type IN ('immigration','tax','insurance','ai','business'));

UPDATE public.job_templates SET service_type = 'business'
 WHERE key IN ('tx_llc', 'business_bank_account', 'business_website');
UPDATE public.job_templates SET title_en = 'LLC formation' WHERE key = 'tx_llc';
UPDATE public.jobs SET service_type = 'business'
 WHERE template_key IN ('tx_llc', 'business_bank_account', 'business_website');
UPDATE public.jobs SET description = 'LLC formation'
 WHERE template_key = 'tx_llc' AND description = 'Texas LLC formation';
